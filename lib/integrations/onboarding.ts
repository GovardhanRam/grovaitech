/**
 * Grovaitech AI Platform
 * lib/integrations/onboarding.ts
 *
 * Server-Only Provider Credential Onboarding Engine.
 * Handles credential ingestion, validation, immediate encryption, rotation,
 * revocation, and status reporting with strict multi-tenant scoping.
 *
 * CRITICAL ARCHITECTURAL PRINCIPLES:
 * 1. Authenticated Operator -> Server Authorization -> Exact ClientDeployment ->
 *    Provider Validation -> Immediate AES-256-GCM Encryption ->
 *    integration_credentials (status: 'active', certification_status: 'CONFIGURED') ->
 *    Separate Certification (C3) -> Future Activation.
 * 2. Credential existence != configured != certified != activated != permitted to execute.
 * 3. Never return raw secrets, decrypted secrets, encrypted envelopes, or masked token fragments.
 */

import crypto from 'crypto'
import type {
  IntegrationProvider,
  IntegrationCapability,
  IntegrationCredentialRecord,
  ProviderCertificationStatus,
  CredentialLifecycleStatus,
} from './types'
import {
  type CredentialStore,
  getCredentialStore,
} from './credentials'
import { encryptSecret } from './crypto'

export interface BaseOnboardOptions {
  clientId: string
  deploymentId: string
  provider: IntegrationProvider
  customStore?: CredentialStore
}

export interface OnboardCredentialOptions extends BaseOnboardOptions {
  credentials: Record<string, any>
  metadata?: Record<string, any>
}

export interface RotateCredentialOptions extends BaseOnboardOptions {
  credentials: Record<string, any>
  metadata?: Record<string, any>
}

export type RevokeCredentialOptions = BaseOnboardOptions

export type SafeCredentialStatusOptions = BaseOnboardOptions

export interface SafeCredentialStatus {
  provider: IntegrationProvider
  clientId: string
  deploymentId: string
  status: CredentialLifecycleStatus | 'not_configured'
  certificationStatus: ProviderCertificationStatus
  credentialConfigured: boolean
  metadata: Record<string, any>
  lastVerifiedAt: string | null
  updatedAt: string | null
}

export interface OnboardOperationResult {
  success: boolean
  data?: SafeCredentialStatus
  error?: string
  errorCode?:
    | 'UNAUTHENTICATED'
    | 'UNAUTHORIZED'
    | 'DEPLOYMENT_NOT_FOUND'
    | 'DEPLOYMENT_INACTIVE'
    | 'INVALID_PROVIDER'
    | 'VALIDATION_FAILED'
    | 'CREDENTIAL_CONFLICT'
    | 'CREDENTIAL_NOT_FOUND'
    | 'STORE_ERROR'
}

const SUPPORTED_PROVIDERS: IntegrationProvider[] = ['meta_whatsapp', 'google_calendar', 'n8n']

const ALLOWED_LIFECYCLE_STATUSES = ['provisioned', 'configured', 'active']

/**
 * Strips any sensitive fields or secret-like substrings from metadata.
 * Only allows safe, non-secret identifiers like phone_number_id, waba_id, calendar_id, webhook_url.
 */
export function sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
  if (!metadata || typeof metadata !== 'object') return {}
  const safe: Record<string, any> = {}
  const forbiddenPatterns = [/token/i, /secret/i, /key/i, /password/i, /auth/i, /bearer/i, /credential/i]

  for (const [key, value] of Object.entries(metadata)) {
    const isForbidden = forbiddenPatterns.some((pattern) => pattern.test(key))
    if (!isForbidden && typeof value !== 'object') {
      safe[key] = value
    }
  }
  return safe
}

/**
 * Validates provider-specific payload and binding against deployment operating parameters.
 */
export function validateProviderPayload(
  provider: IntegrationProvider,
  credentials: Record<string, any>,
  deploymentParameters?: Record<string, any>
): { valid: boolean; error?: string; credentialType: string; safeMetadata: Record<string, any> } {
  if (!credentials || typeof credentials !== 'object') {
    return { valid: false, error: 'Credentials payload must be an object', credentialType: '', safeMetadata: {} }
  }

  if (provider === 'meta_whatsapp') {
    const accessToken = credentials.accessToken || credentials.access_token
    const phoneNumberId = (credentials.phoneNumberId || credentials.phone_number_id || '').toString().trim()
    const wabaId = (credentials.wabaId || credentials.waba_id || '').toString().trim()

    if (!accessToken || typeof accessToken !== 'string' || !accessToken.trim()) {
      return { valid: false, error: 'WhatsApp requires a valid non-empty access token', credentialType: '', safeMetadata: {} }
    }
    if (!phoneNumberId) {
      return { valid: false, error: 'WhatsApp requires a valid phone_number_id', credentialType: '', safeMetadata: {} }
    }

    // Validate phone number ID binding against deployment operating parameters if present
    const boundPhoneId =
      deploymentParameters?.whatsapp_phone_number_id?.trim() ||
      deploymentParameters?.phone_number_id?.trim()

    if (boundPhoneId && boundPhoneId !== phoneNumberId) {
      return {
        valid: false,
        error: `WhatsApp phone_number_id mismatch: deployment is configured for ${boundPhoneId}, but provided payload contains ${phoneNumberId}`,
        credentialType: '',
        safeMetadata: {},
      }
    }

    return {
      valid: true,
      credentialType: 'system_user_token',
      safeMetadata: {
        phone_number_id: phoneNumberId,
        ...(wabaId ? { waba_id: wabaId } : {}),
      },
    }
  }

  if (provider === 'google_calendar') {
    const calendarId = (credentials.calendarId || credentials.calendar_id || '').toString().trim()
    const token = credentials.accessToken || credentials.refreshToken || credentials.token || credentials.serviceAccountKey

    if (!calendarId) {
      return { valid: false, error: 'Google Calendar requires a valid calendarId', credentialType: '', safeMetadata: {} }
    }
    if (!token) {
      return { valid: false, error: 'Google Calendar requires an OAuth token or service account credentials', credentialType: '', safeMetadata: {} }
    }

    return {
      valid: true,
      credentialType: 'oauth2_token',
      safeMetadata: {
        calendar_id: calendarId,
      },
    }
  }

  if (provider === 'n8n') {
    const webhookUrl = (credentials.webhookUrl || credentials.webhook_url || '').toString().trim()
    const signingSecret = credentials.signingSecret || credentials.signing_secret || credentials.apiKey || credentials.api_key

    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      return { valid: false, error: 'n8n requires a valid HTTPS webhookUrl', credentialType: '', safeMetadata: {} }
    }
    if (!signingSecret || typeof signingSecret !== 'string' || signingSecret.trim().length < 8) {
      return { valid: false, error: 'n8n requires a signingSecret or apiKey of at least 8 characters', credentialType: '', safeMetadata: {} }
    }

    return {
      valid: true,
      credentialType: 'api_key',
      safeMetadata: {
        webhook_url: webhookUrl,
      },
    }
  }

  return { valid: false, error: `Unsupported integration provider: ${provider}`, credentialType: '', safeMetadata: {} }
}

/**
 * Onboards a new provider credential for a deployment.
 * Fails closed if an active credential already exists (must use rotateCredential).
 */
export async function onboardCredential(options: OnboardCredentialOptions): Promise<OnboardOperationResult> {
  const { clientId, deploymentId, provider, credentials, metadata, customStore } = options
  const store = customStore || getCredentialStore()

  // 1. Validate inputs
  const cleanClientId = clientId?.trim()
  const cleanDeploymentId = deploymentId?.trim()

  if (!cleanClientId || !cleanDeploymentId) {
    return {
      success: false,
      error: 'Missing required tenant identifiers: clientId and deploymentId are required.',
      errorCode: 'UNAUTHORIZED',
    }
  }

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return {
      success: false,
      error: `Unsupported provider "${provider}". Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}.`,
      errorCode: 'INVALID_PROVIDER',
    }
  }

  // 2. Verify deployment exists and belongs to client
  const deployment = await store.findDeployment(cleanDeploymentId)
  if (!deployment) {
    return {
      success: false,
      error: `Deployment "${cleanDeploymentId}" not found.`,
      errorCode: 'DEPLOYMENT_NOT_FOUND',
    }
  }

  if (deployment.client_id !== cleanClientId) {
    return {
      success: false,
      error: `Deployment "${cleanDeploymentId}" does not belong to client "${cleanClientId}". Cross-tenant access forbidden.`,
      errorCode: 'UNAUTHORIZED',
    }
  }

  // Check deployment lifecycle status
  if (!ALLOWED_LIFECYCLE_STATUSES.includes(deployment.status?.toLowerCase())) {
    return {
      success: false,
      error: `Deployment "${cleanDeploymentId}" is in state "${deployment.status}". Credentials can only be onboarded for provisioned, configured, or active deployments.`,
      errorCode: 'DEPLOYMENT_INACTIVE',
    }
  }

  // 3. Verify that active credential does NOT already exist
  const existing = await store.findCredential(cleanClientId, cleanDeploymentId, provider)
  if (existing && existing.status === 'active') {
    return {
      success: false,
      error: `Active credential already exists for provider "${provider}". Explicit credential rotation is required to replace active credentials.`,
      errorCode: 'CREDENTIAL_CONFLICT',
    }
  }

  // 4. Validate provider payload
  const operatingParams = deployment.runtime_config?.operating_parameters
  const validation = validateProviderPayload(provider, credentials, operatingParams)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Provider payload validation failed.',
      errorCode: 'VALIDATION_FAILED',
    }
  }

  // 5. Immediate AES-256-GCM encryption
  let encryptedSecret: string
  try {
    encryptedSecret = encryptSecret(JSON.stringify(credentials))
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to encrypt credentials: ${err.message}`,
      errorCode: 'STORE_ERROR',
    }
  }

  // 6. Merge safe metadata
  const userMetadata = sanitizeMetadata(metadata)
  const finalMetadata = {
    ...userMetadata,
    ...validation.safeMetadata,
  }

  const now = new Date().toISOString()
  const record: IntegrationCredentialRecord = {
    id: existing?.id || `cred-${crypto.randomUUID()}`,
    client_id: cleanClientId,
    deployment_id: cleanDeploymentId,
    provider,
    credential_type: validation.credentialType,
    encrypted_secret: encryptedSecret,
    key_version: 1,
    metadata: finalMetadata,
    status: 'active',
    certification_status: 'CONFIGURED',
    created_at: existing?.created_at || now,
    updated_at: now,
    expires_at: null,
    last_verified_at: null,
  }

  if (typeof store.saveCredential !== 'function') {
    return {
      success: false,
      error: 'Credential store does not support saveCredential.',
      errorCode: 'STORE_ERROR',
    }
  }

  const saved = await store.saveCredential(record)
  if (!saved) {
    return {
      success: false,
      error: 'Failed to persist credential record to store.',
      errorCode: 'STORE_ERROR',
    }
  }

  return {
    success: true,
    data: {
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      status: 'active',
      certificationStatus: 'CONFIGURED',
      credentialConfigured: true,
      metadata: finalMetadata,
      lastVerifiedAt: null,
      updatedAt: now,
    },
  }
}

/**
 * Rotates an existing credential.
 * Resets certification_status to 'CONFIGURED' and clears last_verified_at.
 */
export async function rotateCredential(options: RotateCredentialOptions): Promise<OnboardOperationResult> {
  const { clientId, deploymentId, provider, credentials, metadata, customStore } = options
  const store = customStore || getCredentialStore()

  const cleanClientId = clientId?.trim()
  const cleanDeploymentId = deploymentId?.trim()

  if (!cleanClientId || !cleanDeploymentId) {
    return {
      success: false,
      error: 'Missing required tenant identifiers: clientId and deploymentId are required.',
      errorCode: 'UNAUTHORIZED',
    }
  }

  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    return {
      success: false,
      error: `Unsupported provider "${provider}". Supported providers: ${SUPPORTED_PROVIDERS.join(', ')}.`,
      errorCode: 'INVALID_PROVIDER',
    }
  }

  const deployment = await store.findDeployment(cleanDeploymentId)
  if (!deployment) {
    return {
      success: false,
      error: `Deployment "${cleanDeploymentId}" not found.`,
      errorCode: 'DEPLOYMENT_NOT_FOUND',
    }
  }

  if (deployment.client_id !== cleanClientId) {
    return {
      success: false,
      error: `Deployment "${cleanDeploymentId}" does not belong to client "${cleanClientId}". Cross-tenant access forbidden.`,
      errorCode: 'UNAUTHORIZED',
    }
  }

  if (!ALLOWED_LIFECYCLE_STATUSES.includes(deployment.status?.toLowerCase())) {
    return {
      success: false,
      error: `Deployment "${cleanDeploymentId}" is in state "${deployment.status}". Credentials can only be rotated for provisioned, configured, or active deployments.`,
      errorCode: 'DEPLOYMENT_INACTIVE',
    }
  }

  const existing = await store.findCredential(cleanClientId, cleanDeploymentId, provider)
  if (!existing) {
    return {
      success: false,
      error: `No existing credential found for provider "${provider}" to rotate. Use onboarding to configure new credentials.`,
      errorCode: 'CREDENTIAL_NOT_FOUND',
    }
  }

  const operatingParams = deployment.runtime_config?.operating_parameters
  const validation = validateProviderPayload(provider, credentials, operatingParams)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Provider payload validation failed.',
      errorCode: 'VALIDATION_FAILED',
    }
  }

  let encryptedSecret: string
  try {
    encryptedSecret = encryptSecret(JSON.stringify(credentials))
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to encrypt credentials: ${err.message}`,
      errorCode: 'STORE_ERROR',
    }
  }

  const userMetadata = sanitizeMetadata(metadata)
  const finalMetadata = {
    ...(existing.metadata || {}),
    ...userMetadata,
    ...validation.safeMetadata,
  }

  const now = new Date().toISOString()
  const updatedRecord: IntegrationCredentialRecord = {
    ...existing,
    credential_type: validation.credentialType,
    encrypted_secret: encryptedSecret,
    key_version: 1,
    metadata: finalMetadata,
    status: 'active',
    certification_status: 'CONFIGURED', // Must reset to CONFIGURED upon rotation
    last_verified_at: null,             // Cleared upon rotation
    updated_at: now,
  }

  if (typeof store.saveCredential !== 'function') {
    return {
      success: false,
      error: 'Credential store does not support saveCredential.',
      errorCode: 'STORE_ERROR',
    }
  }

  const saved = await store.saveCredential(updatedRecord)
  if (!saved) {
    return {
      success: false,
      error: 'Failed to persist rotated credential record to store.',
      errorCode: 'STORE_ERROR',
    }
  }

  return {
    success: true,
    data: {
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      status: 'active',
      certificationStatus: 'CONFIGURED',
      credentialConfigured: true,
      metadata: finalMetadata,
      lastVerifiedAt: null,
      updatedAt: now,
    },
  }
}

/**
 * Revokes a credential.
 * Sets status: 'revoked' and certification_status: 'REVOKED'.
 */
export async function revokeCredential(options: RevokeCredentialOptions): Promise<OnboardOperationResult> {
  const { clientId, deploymentId, provider, customStore } = options
  const store = customStore || getCredentialStore()

  const cleanClientId = clientId?.trim()
  const cleanDeploymentId = deploymentId?.trim()

  if (!cleanClientId || !cleanDeploymentId) {
    return {
      success: false,
      error: 'Missing required tenant identifiers: clientId and deploymentId are required.',
      errorCode: 'UNAUTHORIZED',
    }
  }

  const deployment = await store.findDeployment(cleanDeploymentId)
  if (!deployment) {
    return {
      success: false,
      error: `Deployment "${cleanDeploymentId}" not found.`,
      errorCode: 'DEPLOYMENT_NOT_FOUND',
    }
  }

  if (deployment.client_id !== cleanClientId) {
    return {
      success: false,
      error: `Deployment "${cleanDeploymentId}" does not belong to client "${cleanClientId}". Cross-tenant access forbidden.`,
      errorCode: 'UNAUTHORIZED',
    }
  }

  const existing = await store.findCredential(cleanClientId, cleanDeploymentId, provider)
  if (!existing) {
    return {
      success: false,
      error: `No credential found for provider "${provider}" to revoke.`,
      errorCode: 'CREDENTIAL_NOT_FOUND',
    }
  }

  if (typeof store.revokeCredential !== 'function') {
    return {
      success: false,
      error: 'Credential store does not support revokeCredential.',
      errorCode: 'STORE_ERROR',
    }
  }

  const revoked = await store.revokeCredential(cleanClientId, cleanDeploymentId, provider)
  if (!revoked) {
    return {
      success: false,
      error: 'Failed to revoke credential in store.',
      errorCode: 'STORE_ERROR',
    }
  }

  const now = new Date().toISOString()
  return {
    success: true,
    data: {
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      status: 'revoked',
      certificationStatus: 'REVOKED',
      credentialConfigured: false,
      metadata: existing.metadata || {},
      lastVerifiedAt: existing.last_verified_at || null,
      updatedAt: now,
    },
  }
}

/**
 * Returns safe credential status without leaking raw or decrypted secrets.
 */
export async function getSafeCredentialStatus(options: SafeCredentialStatusOptions): Promise<SafeCredentialStatus> {
  const { clientId, deploymentId, provider, customStore } = options
  const store = customStore || getCredentialStore()

  const cleanClientId = clientId?.trim() || ''
  const cleanDeploymentId = deploymentId?.trim() || ''

  if (!cleanClientId || !cleanDeploymentId) {
    return {
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      status: 'not_configured',
      certificationStatus: 'NOT_CONFIGURED',
      credentialConfigured: false,
      metadata: {},
      lastVerifiedAt: null,
      updatedAt: null,
    }
  }

  const existing = await store.findCredential(cleanClientId, cleanDeploymentId, provider)
  if (!existing) {
    return {
      provider,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      status: 'not_configured',
      certificationStatus: 'NOT_CONFIGURED',
      credentialConfigured: false,
      metadata: {},
      lastVerifiedAt: null,
      updatedAt: null,
    }
  }

  return {
    provider,
    clientId: cleanClientId,
    deploymentId: cleanDeploymentId,
    status: existing.status,
    certificationStatus: existing.certification_status,
    credentialConfigured: existing.status === 'active',
    metadata: sanitizeMetadata(existing.metadata),
    lastVerifiedAt: existing.last_verified_at || null,
    updatedAt: existing.updated_at,
  }
}
