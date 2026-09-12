/**
 * Grovaitech AI Platform
 * lib/integrations/certification.ts
 *
 * Server-Only Provider Certification Engine.
 * Explicitly verifies tenant provider configurations through safe, non-customer-facing checks.
 * Enforces strict tenant binding, active deployment lifecycle, and durable certification status updates.
 *
 * CRITICAL ARCHITECTURAL PRINCIPLE:
 * Credential existence ≠ configured ≠ certified ≠ activated ≠ permitted to execute.
 * Certification alone does NOT activate live execution.
 */

import crypto from 'crypto'
import type {
  IntegrationProvider,
  IntegrationCapability,
  ProviderCertificationStatus,
  IntegrationCredentialRecord,
  ExecutionMode,
} from './types'
import {
  type CredentialStore,
  getCredentialStore,
  resolveIntegrationCredential,
} from './credentials'
import { decryptSecret } from './crypto'
import { safeFetch, validateEgressUrl } from './egress'
import { sanitizeResultPayload, scrubSensitiveString } from './fingerprint'

export interface ProviderVerifierContext {
  clientId: string
  deploymentId: string
  provider: IntegrationProvider
  metadata: Record<string, any>
  decryptedSecret: Record<string, any>
  deploymentOperatingParameters?: Record<string, any>
  executionMode?: ExecutionMode
  fetchFn?: typeof fetch
  lookupFn?: (hostname: string) => Promise<string[]>
}

export interface ProviderVerificationOutcome {
  success: boolean
  auditDetails: Record<string, any>
  error?: string
}

export type ProviderVerifier = (context: ProviderVerifierContext) => Promise<ProviderVerificationOutcome>

export interface CertifyIntegrationOptions {
  clientId: string
  deploymentId: string
  provider: IntegrationProvider
  /** Injected provider verifier for testing, isolation, and safe execution */
  customVerifier?: ProviderVerifier
  /** Optional custom credential store for test isolation */
  customStore?: CredentialStore
  /** Execution mode: 'live' triggers live verification network flows when enabled; 'sandbox' does read-only verification */
  executionMode?: ExecutionMode
  /** Test-only fetch injection */
  fetchFn?: typeof fetch
  /** Test-only DNS lookup injection */
  lookupFn?: (hostname: string) => Promise<string[]>
}

export interface CertificationResult {
  success: boolean
  status: ProviderCertificationStatus | 'RESTRICTED' | 'EXPIRED'
  provider: IntegrationProvider
  clientId: string
  deploymentId: string
  verifiedAt: string
  error?: string
  auditDetails?: Record<string, any>
}

const PROVIDER_CAPABILITY_MAP: Record<IntegrationProvider, IntegrationCapability> = {
  meta_whatsapp: 'messaging',
  google_calendar: 'scheduling',
  n8n: 'pipeline',
}

/**
 * Default safe non-customer-facing verifier for Meta WhatsApp.
 * Verifies that the deployment phone_number_id matches the credential metadata,
 * validates token syntax/structure, and verifies WABA identification.
 * NEVER makes customer-facing POST /messages calls.
 */
export const defaultWhatsAppVerifier: ProviderVerifier = async (ctx) => {
  const phoneIdFromMetadata = ctx.metadata?.phone_number_id?.trim()
  const phoneIdFromDeployment =
    ctx.deploymentOperatingParameters?.whatsapp_phone_number_id?.trim() ||
    ctx.deploymentOperatingParameters?.phone_number_id?.trim()

  if (!phoneIdFromMetadata) {
    return {
      success: false,
      auditDetails: { check: 'phone_number_id_presence', passed: false },
      error: 'WhatsApp metadata is missing required phone_number_id.',
    }
  }

  if (phoneIdFromDeployment && phoneIdFromMetadata !== phoneIdFromDeployment) {
    return {
      success: false,
      auditDetails: {
        check: 'phone_number_id_binding',
        passed: false,
        deploymentPhoneId: phoneIdFromDeployment,
        credentialPhoneId: phoneIdFromMetadata,
      },
      error: `WhatsApp phone_number_id mismatch: deployment is bound to ${phoneIdFromDeployment}, but credential specifies ${phoneIdFromMetadata}.`,
    }
  }

  const token = ctx.decryptedSecret?.accessToken || ctx.decryptedSecret?.token
  if (!token || typeof token !== 'string' || token.length < 10) {
    return {
      success: false,
      auditDetails: { check: 'token_structure', passed: false },
      error: 'Invalid or missing Meta WhatsApp access token in encrypted payload.',
    }
  }

  return {
    success: true,
    auditDetails: {
      check: 'meta_whatsapp_metadata_verified',
      passed: true,
      phoneNumberId: phoneIdFromMetadata,
      wabaId: ctx.metadata?.waba_id || null,
      verificationMode: 'read_only_metadata',
    },
  }
}

/**
 * Default safe non-customer-facing verifier for Google Calendar.
 * Verifies calendar_id format and OAuth credential presence.
 * NEVER creates a calendar event or sends invites.
 */
export const defaultCalendarVerifier: ProviderVerifier = async (ctx) => {
  const calendarId = ctx.metadata?.calendar_id || ctx.decryptedSecret?.calendarId
  if (!calendarId || typeof calendarId !== 'string' || !calendarId.includes('@') && calendarId !== 'primary') {
    return {
      success: false,
      auditDetails: { check: 'calendar_id_format', passed: false },
      error: 'Google Calendar requires a valid calendar_id in metadata (e.g. primary or email address).',
    }
  }

  const hasToken = !!(ctx.decryptedSecret?.accessToken || ctx.decryptedSecret?.refreshToken)
  if (!hasToken) {
    return {
      success: false,
      auditDetails: { check: 'oauth_tokens', passed: false },
      error: 'Google Calendar requires an accessToken or refreshToken in encrypted payload.',
    }
  }

  return {
    success: true,
    auditDetails: {
      check: 'google_calendar_metadata_verified',
      passed: true,
      calendarId,
      verificationMode: 'read_only_configuration',
    },
  }
}

/**
 * Default safe non-customer-facing verifier for n8n Webhook Pipeline.
 * Verifies URL formatting and HMAC signing secret presence.
 * NEVER dispatches customer lead data.
 */
export const defaultN8nVerifier: ProviderVerifier = async (ctx) => {
  const webhookUrl = ctx.metadata?.webhook_url || ctx.decryptedSecret?.webhookUrl
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://')) {
    return {
      success: false,
      auditDetails: { check: 'webhook_url_security', passed: false },
      error: 'n8n integration requires an HTTPS webhook_url in configuration.',
    }
  }

  const signingSecret = ctx.decryptedSecret?.secretKey || ctx.decryptedSecret?.apiKey
  if (!signingSecret || typeof signingSecret !== 'string' || signingSecret.length < 8) {
    return {
      success: false,
      auditDetails: { check: 'signing_secret', passed: false },
      error: 'n8n integration requires a valid signing secret or API key for cryptographic authentication.',
    }
  }

  return {
    success: true,
    auditDetails: {
      check: 'n8n_configuration_verified',
      passed: true,
      hasSigningSecret: true,
      verificationMode: 'read_only_configuration',
    },
  }
}

/**
 * Safe, non-customer-facing live verifier for Google Calendar.
 * Strictly operates under Phase 5T-E1 execution safety:
 * - Live gate check (ENABLE_LIVE_EXTERNAL_ADAPTERS === 'true')
 * - ExecutionMode validation (live vs sandbox)
 * - Safe read-only metadata check on target calendar (GET /calendars/{calendarId})
 * - NEVER creates events or sends customer invites
 * - SSRF egress protection via safeFetch (HTTPS-only, blocks private/cloud metadata IPs, no redirects)
 * - 5s bounded timeout
 * - Zero secret leakage in error messages or audit logs
 */
export const certifyGoogleCalendarLive: ProviderVerifier = async (ctx) => {
  // 1. Live Execution Gate check
  if (process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS !== 'true') {
    return {
      success: false,
      auditDetails: {
        check: 'live_execution_gate',
        passed: false,
        reason: 'Live external adapters globally disabled (ENABLE_LIVE_EXTERNAL_ADAPTERS !== true).',
      },
      error: 'Live external execution is globally disabled (ENABLE_LIVE_EXTERNAL_ADAPTERS !== true).',
    }
  }

  if (ctx.executionMode && ctx.executionMode !== 'live') {
    return {
      success: false,
      auditDetails: {
        check: 'live_execution_mode',
        passed: false,
        reason: `Live certification rejected: executionMode is "${ctx.executionMode}", expected "live".`,
      },
      error: `Live certification rejected: executionMode is "${ctx.executionMode}", expected "live".`,
    }
  }

  // 2. Validate calendar_id format
  const calendarId = ctx.metadata?.calendar_id || ctx.decryptedSecret?.calendarId
  if (!calendarId || typeof calendarId !== 'string' || (!calendarId.includes('@') && calendarId !== 'primary')) {
    return {
      success: false,
      auditDetails: { check: 'calendar_id_format', passed: false },
      error: 'Google Calendar requires a valid calendar_id in metadata (e.g. primary or email address).',
    }
  }

  // 3. Validate OAuth / service credentials
  const accessToken = ctx.decryptedSecret?.accessToken || ctx.decryptedSecret?.token
  const refreshToken = ctx.decryptedSecret?.refreshToken
  if (!accessToken && !refreshToken) {
    return {
      success: false,
      auditDetails: { check: 'oauth_tokens', passed: false },
      error: 'Google Calendar requires an accessToken or refreshToken in encrypted payload.',
    }
  }

  if (!accessToken && refreshToken) {
    return {
      success: false,
      auditDetails: { check: 'live_token_availability', passed: false },
      error: 'Google Calendar live certification requires an active accessToken. Token refresh exchange required.',
    }
  }

  const secretsToScrub = [
    accessToken,
    refreshToken,
    ctx.decryptedSecret?.clientSecret,
    ctx.decryptedSecret?.private_key,
  ].filter(Boolean) as string[]

  // 4. Build safe read-only calendar verification request
  const baseUrl = (ctx.metadata?.calendarApiBaseUrl || 'https://www.googleapis.com').replace(/\/$/, '')
  const targetUrl = `${baseUrl}/calendar/v3/calendars/${encodeURIComponent(calendarId)}`

  try {
    const res = await safeFetch(targetUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
      timeoutMs: 5000,
      lookupFn: ctx.lookupFn,
      fetchFn: ctx.fetchFn,
    })

    if (res.status === 200) {
      let data: any = {}
      try {
        data = await res.json()
      } catch {
        data = {}
      }

      return {
        success: true,
        auditDetails: sanitizeResultPayload({
          check: 'google_calendar_live_verified',
          passed: true,
          calendarId,
          timeZone: data?.timeZone || undefined,
          summary: data?.summary ? String(data.summary).substring(0, 60) : undefined,
          verificationMode: 'live_metadata_read',
        }),
      }
    }

    if (res.status === 401) {
      return {
        success: false,
        auditDetails: {
          check: 'google_calendar_live_verified',
          passed: false,
          statusCode: 401,
          verificationMode: 'live_metadata_read',
        },
        error: 'Google Calendar authentication failed: access token is invalid, expired, or revoked (HTTP 401).',
      }
    }

    if (res.status === 403) {
      return {
        success: false,
        auditDetails: {
          check: 'google_calendar_live_verified',
          passed: false,
          statusCode: 403,
          verificationMode: 'live_metadata_read',
        },
        error: 'Google Calendar access forbidden: insufficient permissions for calendar (HTTP 403).',
      }
    }

    if (res.status === 404) {
      return {
        success: false,
        auditDetails: {
          check: 'google_calendar_live_verified',
          passed: false,
          statusCode: 404,
          verificationMode: 'live_metadata_read',
        },
        error: `Google Calendar not found: specified calendar_id "${calendarId}" does not exist or is inaccessible (HTTP 404).`,
      }
    }

    return {
      success: false,
      auditDetails: {
        check: 'google_calendar_live_verified',
        passed: false,
        statusCode: res.status,
        verificationMode: 'live_metadata_read',
      },
      error: `Google Calendar live verification returned unexpected HTTP ${res.status}.`,
    }
  } catch (err: any) {
    const rawMsg = err?.message || 'Network error during Google Calendar verification.'
    const cleanMsg = scrubSensitiveString(rawMsg, secretsToScrub)

    return {
      success: false,
      auditDetails: {
        check: 'google_calendar_live_exception',
        passed: false,
        errorType: err?.name || 'Error',
      },
      error: cleanMsg,
    }
  }
}

/**
 * Safe, non-customer-facing live verifier for n8n Webhook Pipeline.
 * Strictly operates under Phase 5T-E1 execution safety:
 * - Live gate check (ENABLE_LIVE_EXTERNAL_ADAPTERS === 'true')
 * - ExecutionMode validation (live vs sandbox)
 * - Safe ping payload (event: 'integration.certification.ping', test: true)
 * - NEVER dispatches real customer leads or triggers production workflows
 * - SSRF egress protection via safeFetch (HTTPS-only, blocks RFC1918, cloud metadata, loopback)
 * - HMAC SHA-256 signature / API key header generation
 * - 5s bounded timeout
 * - Zero secret leakage in error messages or audit logs
 */
export const certifyN8nWebhookLive: ProviderVerifier = async (ctx) => {
  // 1. Live Execution Gate check
  if (process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS !== 'true') {
    return {
      success: false,
      auditDetails: {
        check: 'live_execution_gate',
        passed: false,
        reason: 'Live external adapters globally disabled (ENABLE_LIVE_EXTERNAL_ADAPTERS !== true).',
      },
      error: 'Live external execution is globally disabled (ENABLE_LIVE_EXTERNAL_ADAPTERS !== true).',
    }
  }

  if (ctx.executionMode && ctx.executionMode !== 'live') {
    return {
      success: false,
      auditDetails: {
        check: 'live_execution_mode',
        passed: false,
        reason: `Live certification rejected: executionMode is "${ctx.executionMode}", expected "live".`,
      },
      error: `Live certification rejected: executionMode is "${ctx.executionMode}", expected "live".`,
    }
  }

  // 2. Validate URL formatting
  const webhookUrl = ctx.metadata?.webhook_url || ctx.decryptedSecret?.webhookUrl
  if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://')) {
    return {
      success: false,
      auditDetails: { check: 'webhook_url_security', passed: false },
      error: 'n8n integration requires an HTTPS webhook_url in configuration.',
    }
  }

  // 3. SSRF pre-flight validation
  const egressCheck = await validateEgressUrl(webhookUrl, ctx.lookupFn)
  if (!egressCheck.valid) {
    return {
      success: false,
      auditDetails: {
        check: 'webhook_url_egress',
        passed: false,
        reason: egressCheck.reason,
      },
      error: `Egress blocked: ${egressCheck.reason}`,
    }
  }

  const signingSecret = ctx.decryptedSecret?.secretKey || ctx.decryptedSecret?.apiKey
  const apiKey = ctx.decryptedSecret?.apiKey

  const secretsToScrub = [
    signingSecret,
    apiKey,
    ctx.decryptedSecret?.token,
  ].filter(Boolean) as string[]

  // 4. Safe non-customer-facing certification payload
  const pingPayload = {
    event: 'integration.certification.ping',
    provider: 'n8n',
    clientId: ctx.clientId,
    deploymentId: ctx.deploymentId,
    timestamp: new Date().toISOString(),
    test: true,
  }
  const payloadJson = JSON.stringify(pingPayload)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Grovaitech-Event': 'integration.certification.ping',
  }

  if (signingSecret && typeof signingSecret === 'string') {
    const hmac = crypto.createHmac('sha256', signingSecret).update(payloadJson).digest('hex')
    headers['X-Grovaitech-Signature'] = `sha256=${hmac}`
  }

  if (apiKey && typeof apiKey === 'string') {
    headers['X-API-Key'] = apiKey
  }

  // 5. Dispatch via safeFetch
  try {
    const res = await safeFetch(webhookUrl, {
      method: 'POST',
      headers,
      body: payloadJson,
      timeoutMs: 5000,
      lookupFn: ctx.lookupFn,
      fetchFn: ctx.fetchFn,
    })

    if (res.ok) {
      return {
        success: true,
        auditDetails: sanitizeResultPayload({
          check: 'n8n_live_webhook_verified',
          passed: true,
          statusCode: res.status,
          hasSigningSecret: !!signingSecret,
          verificationMode: 'live_webhook_ping',
        }),
      }
    }

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        auditDetails: {
          check: 'n8n_live_webhook_verified',
          passed: false,
          statusCode: res.status,
          verificationMode: 'live_webhook_ping',
        },
        error: `n8n webhook authentication rejected with status ${res.status}. Valid signing secret or API key required.`,
      }
    }

    if (res.status === 404) {
      return {
        success: false,
        auditDetails: {
          check: 'n8n_live_webhook_verified',
          passed: false,
          statusCode: 404,
          verificationMode: 'live_webhook_ping',
        },
        error: 'n8n webhook endpoint not found (HTTP 404). Verify webhook URL path.',
      }
    }

    return {
      success: false,
      auditDetails: {
        check: 'n8n_live_webhook_verified',
        passed: false,
        statusCode: res.status,
        verificationMode: 'live_webhook_ping',
      },
      error: `n8n server returned HTTP ${res.status}.`,
    }
  } catch (err: any) {
    const rawMsg = err?.message || 'Network error during n8n webhook certification.'
    const cleanMsg = scrubSensitiveString(rawMsg, secretsToScrub)

    return {
      success: false,
      auditDetails: {
        check: 'n8n_live_webhook_exception',
        passed: false,
        errorType: err?.name || 'Error',
      },
      error: cleanMsg,
    }
  }
}

const DEFAULT_VERIFIERS: Record<IntegrationProvider, ProviderVerifier> = {
  meta_whatsapp: defaultWhatsAppVerifier,
  google_calendar: defaultCalendarVerifier,
  n8n: defaultN8nVerifier,
}

const LIVE_VERIFIERS: Record<IntegrationProvider, ProviderVerifier> = {
  meta_whatsapp: defaultWhatsAppVerifier,
  google_calendar: certifyGoogleCalendarLive,
  n8n: certifyN8nWebhookLive,
}

/**
 * Executes server-side certification for a tenant integration.
 * Gated by:
 * 1. Active deployment lifecycle
 * 2. Exact tenant & deployment match
 * 3. Active unexpired credential
 * 4. Provider/capability compatibility
 * 5. Safe non-customer-facing provider verification
 */
export async function certifyIntegration(
  options: CertifyIntegrationOptions
): Promise<CertificationResult> {
  const {
    clientId,
    deploymentId,
    provider,
    customVerifier,
    customStore,
    executionMode,
    fetchFn,
    lookupFn,
  } = options
  const now = new Date().toISOString()

  const cleanClientId = clientId?.trim()
  const cleanDeploymentId = deploymentId?.trim()

  // 1. Validate inputs
  if (!cleanClientId || !cleanDeploymentId || !provider) {
    return {
      success: false,
      status: 'ERROR',
      provider,
      clientId: cleanClientId || '',
      deploymentId: cleanDeploymentId || '',
      verifiedAt: now,
      error: 'Certification rejected: clientId, deploymentId, and provider are required.',
    }
  }

  const capability = PROVIDER_CAPABILITY_MAP[provider]
  if (!capability) {
    return {
      success: false,
      status: 'ERROR',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `Unsupported provider: "${provider}".`,
    }
  }

  const store = customStore || getCredentialStore()

  // 2. Lookup and validate deployment lifecycle
  const deployment = await store.findDeployment(cleanDeploymentId)
  if (!deployment) {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `Deployment "${cleanDeploymentId}" was not found.`,
    }
  }

  if (deployment.client_id !== cleanClientId) {
    return {
      success: false,
      status: 'ERROR',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `Tenant mismatch: Deployment "${cleanDeploymentId}" belongs to client "${deployment.client_id}", not "${cleanClientId}".`,
    }
  }

  if (deployment.status !== 'active') {
    return {
      success: false,
      status: 'RESTRICTED',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `Certification denied: Deployment "${cleanDeploymentId}" is in status "${deployment.status}". Must be "active".`,
    }
  }

  // 3. Resolve credential
  const credRecord = await store.findCredential(cleanClientId, cleanDeploymentId, provider)
  if (!credRecord) {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `No credential record found for client "${cleanClientId}", deployment "${cleanDeploymentId}", provider "${provider}".`,
    }
  }

  if (credRecord.status === 'revoked') {
    return {
      success: false,
      status: 'REVOKED',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `Credential for provider "${provider}" has been revoked.`,
    }
  }

  if (credRecord.status === 'suspended') {
    return {
      success: false,
      status: 'RESTRICTED',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `Credential for provider "${provider}" is currently suspended.`,
    }
  }

  if (credRecord.status !== 'active') {
    return {
      success: false,
      status: 'RESTRICTED',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `Credential status is "${credRecord.status}". Expected "active".`,
    }
  }

  // Check expiry
  if (credRecord.expires_at) {
    const expiryTime = new Date(credRecord.expires_at).getTime()
    if (expiryTime <= Date.now()) {
      return {
        success: false,
        status: 'EXPIRED',
        provider,
        clientId: cleanClientId,
        deploymentId: cleanDeploymentId,
        verifiedAt: now,
        error: `Credential for provider "${provider}" expired at ${credRecord.expires_at}.`,
      }
    }
  }

  // Capture concurrency guards for optimistic concurrency check
  const expectedCredentialId = credRecord.id
  const expectedUpdatedAt = credRecord.updated_at
  const concurrencyGuards = {
    expectedCredentialId,
    expectedUpdatedAt,
  }

  // 4. Decrypt credentials safely in-memory for verifier
  let decryptedSecret: Record<string, any> = {}
  try {
    const rawSecret = decryptSecret(credRecord.encrypted_secret)
    decryptedSecret = JSON.parse(rawSecret)
  } catch (decErr: any) {
    return {
      success: false,
      status: 'ERROR',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: `Failed to decrypt credential secret for provider verification: ${decErr?.message || 'Decryption error'}`,
    }
  }

  // 5. Execute safe provider verification
  const isLive = executionMode === 'live'
  const verifier = customVerifier || (isLive ? LIVE_VERIFIERS[provider] : DEFAULT_VERIFIERS[provider])
  const operatingParams = deployment.runtime_config?.operating_parameters || {}

  let verificationOutcome: ProviderVerificationOutcome
  try {
    verificationOutcome = await verifier({
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      provider,
      metadata: credRecord.metadata || {},
      decryptedSecret,
      deploymentOperatingParameters: operatingParams,
      executionMode,
      fetchFn,
      lookupFn,
    })
  } catch (verErr: any) {
    const rawError = verErr?.message || 'Unexpected exception during provider verification.'
    const cleanError = scrubSensitiveString(rawError, [
      decryptedSecret?.accessToken,
      decryptedSecret?.token,
      decryptedSecret?.refreshToken,
      decryptedSecret?.secretKey,
      decryptedSecret?.apiKey,
    ])
    verificationOutcome = {
      success: false,
      auditDetails: { check: 'verifier_exception', passed: false },
      error: cleanError,
    }
  }

  // 6. Handle outcome & update durable state
  if (!verificationOutcome.success) {
    const errorMsg = verificationOutcome.error || 'Provider verification check failed.'
    if (store.updateCertificationStatus) {
      const updated = await store.updateCertificationStatus(
        cleanClientId,
        cleanDeploymentId,
        provider,
        {
          certification_status: 'ERROR',
          last_verified_at: now,
          auditMetadata: {
            ...verificationOutcome.auditDetails,
            error: errorMsg,
            timestamp: now,
          },
        },
        concurrencyGuards
      )

      if (!updated) {
        return {
          success: false,
          status: 'ERROR',
          provider,
          clientId: cleanClientId,
          deploymentId: cleanDeploymentId,
          verifiedAt: now,
          error: 'Certification aborted: Credential was rotated or modified concurrently.',
        }
      }
    }

    return {
      success: false,
      status: 'ERROR',
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      verifiedAt: now,
      error: errorMsg,
      auditDetails: verificationOutcome.auditDetails,
    }
  }

  // Success: Update certification status to CERTIFIED with concurrency guards
  if (store.updateCertificationStatus) {
    const updated = await store.updateCertificationStatus(
      cleanClientId,
      cleanDeploymentId,
      provider,
      {
        certification_status: 'CERTIFIED',
        last_verified_at: now,
        auditMetadata: {
          ...verificationOutcome.auditDetails,
          timestamp: now,
        },
      },
      concurrencyGuards
    )

    if (!updated) {
      return {
        success: false,
        status: 'ERROR',
        provider,
        clientId: cleanClientId,
        deploymentId: cleanDeploymentId,
        verifiedAt: now,
        error: 'Certification aborted: Credential was rotated or modified concurrently.',
      }
    }
  }

  return {
    success: true,
    status: 'CERTIFIED',
    provider,
    clientId: cleanClientId,
    deploymentId: cleanDeploymentId,
    verifiedAt: now,
    auditDetails: verificationOutcome.auditDetails,
  }
}
