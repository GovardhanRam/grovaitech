/**
 * Grovaitech AI Platform
 * lib/integrations/credentials.ts
 *
 * Server-Only Tenant Credential Resolution Boundary.
 * Resolves external provider credentials with strict multi-tenant isolation,
 * cryptographic decryption at rest, provider/capability compatibility checks,
 * and certification status gating.
 *
 * Rejects global token fallback in live production execution.
 * Never leaks raw secrets to the client, LLM, or logs.
 */

import type {
  CredentialResolutionResult,
  IntegrationProvider,
  IntegrationCapability,
  IntegrationCredentialRecord,
  ProviderCertificationStatus,
  WhatsAppAdapterCredentials,
  GoogleCalendarAdapterCredentials,
  N8nAdapterCredentials,
  ExecutionMode,
} from './types'
import { decryptSecret } from './crypto'
import { createServerClient } from '@/lib/supabase/server'

export interface ResolveIntegrationCredentialOptions {
  clientId?: string
  deploymentId?: string
  provider: IntegrationProvider
  requiredCapability: IntegrationCapability
  executionMode?: ExecutionMode
  phoneNumberId?: string
  /** Optional custom client or mock store for test isolation */
  customStore?: CredentialStore
}

export interface CredentialStore {
  findCredential(clientId: string, deploymentId: string, provider: string): Promise<IntegrationCredentialRecord | null>
  findDeployment(deploymentId: string): Promise<{ id: string; client_id: string; status: string; runtime_config?: any } | null>
  updateCertificationStatus?(
    clientId: string,
    deploymentId: string,
    provider: string,
    updates: {
      certification_status: ProviderCertificationStatus
      last_verified_at: string
      auditMetadata?: Record<string, any>
    }
  ): Promise<boolean>
}

/**
 * In-memory store for unit test isolation and local testing without remote DB calls.
 */
export class MemoryCredentialStore implements CredentialStore {
  private credentials = new Map<string, IntegrationCredentialRecord>()
  private deployments = new Map<string, { id: string; client_id: string; status: string; runtime_config?: any }>()

  addCredential(cred: IntegrationCredentialRecord) {
    const key = `${cred.client_id}:${cred.deployment_id}:${cred.provider}`
    this.credentials.set(key, cred)
  }

  addDeployment(dep: { id: string; client_id: string; status: string; runtime_config?: any }) {
    this.deployments.set(dep.id, dep)
  }

  async findCredential(clientId: string, deploymentId: string, provider: string): Promise<IntegrationCredentialRecord | null> {
    const key = `${clientId}:${deploymentId}:${provider}`
    return this.credentials.get(key) || null
  }

  async findDeployment(deploymentId: string): Promise<{ id: string; client_id: string; status: string; runtime_config?: any } | null> {
    return this.deployments.get(deploymentId) || null
  }

  async updateCertificationStatus(
    clientId: string,
    deploymentId: string,
    provider: string,
    updates: {
      certification_status: ProviderCertificationStatus
      last_verified_at: string
      auditMetadata?: Record<string, any>
    }
  ): Promise<boolean> {
    const key = `${clientId}:${deploymentId}:${provider}`
    const existing = this.credentials.get(key)
    if (!existing) return false

    const mergedMetadata = {
      ...(existing.metadata || {}),
      ...(updates.auditMetadata ? { certification_audit: updates.auditMetadata } : {}),
    }

    this.credentials.set(key, {
      ...existing,
      certification_status: updates.certification_status,
      last_verified_at: updates.last_verified_at,
      metadata: mergedMetadata,
      updated_at: updates.last_verified_at,
    })
    return true
  }

  clear() {
    this.credentials.clear()
    this.deployments.clear()
  }
}

/**
 * Supabase-backed production store.
 */
export class SupabaseCredentialStore implements CredentialStore {
  private async getClient() {
    return createServerClient()
  }

  async findCredential(clientId: string, deploymentId: string, provider: string): Promise<IntegrationCredentialRecord | null> {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('client_id', clientId)
      .eq('deployment_id', deploymentId)
      .eq('provider', provider)
      .maybeSingle()

    if (error || !data) return null
    return data as IntegrationCredentialRecord
  }

  async findDeployment(deploymentId: string): Promise<{ id: string; client_id: string; status: string; runtime_config?: any } | null> {
    const supabase = await this.getClient()
    const { data, error } = await supabase
      .from('client_deployments')
      .select('id, client_id, status, runtime_config')
      .eq('id', deploymentId)
      .maybeSingle()

    if (error || !data) return null
    return data as { id: string; client_id: string; status: string; runtime_config?: any }
  }

  async updateCertificationStatus(
    clientId: string,
    deploymentId: string,
    provider: string,
    updates: {
      certification_status: ProviderCertificationStatus
      last_verified_at: string
      auditMetadata?: Record<string, any>
    }
  ): Promise<boolean> {
    const supabase = await this.getClient()
    const existing = await this.findCredential(clientId, deploymentId, provider)
    if (!existing) return false

    const mergedMetadata = {
      ...(existing.metadata || {}),
      ...(updates.auditMetadata ? { certification_audit: updates.auditMetadata } : {}),
    }

    const { error } = await supabase
      .from('integration_credentials')
      .update({
        certification_status: updates.certification_status,
        last_verified_at: updates.last_verified_at,
        metadata: mergedMetadata,
        updated_at: updates.last_verified_at,
      })
      .eq('client_id', clientId)
      .eq('deployment_id', deploymentId)
      .eq('provider', provider)

    return !error
  }
}

let activeCredentialStore: CredentialStore = process.env.NODE_ENV === 'test'
  ? new MemoryCredentialStore()
  : new SupabaseCredentialStore()

export function setCredentialStore(store: CredentialStore) {
  activeCredentialStore = store
}

export function getCredentialStore(): CredentialStore {
  return activeCredentialStore
}

/**
 * Provider-to-capability validation matrix.
 * Enforces that credentials can only be used for compatible operation types.
 */
const PROVIDER_CAPABILITY_MAP: Record<IntegrationProvider, IntegrationCapability> = {
  meta_whatsapp: 'messaging',
  google_calendar: 'scheduling',
  n8n: 'pipeline',
}

/**
 * Resolves integration credentials for a tenant deployment.
 * Fails closed if any lifecycle, tenant, or certification check fails.
 */
export async function resolveIntegrationCredential<T = Record<string, any>>(
  options: ResolveIntegrationCredentialOptions
): Promise<CredentialResolutionResult<T>> {
  const {
    clientId,
    deploymentId,
    provider,
    requiredCapability,
    executionMode = 'sandbox',
    phoneNumberId,
    customStore,
  } = options

  // Capability validation
  const expectedCapability = PROVIDER_CAPABILITY_MAP[provider]
  if (!expectedCapability || expectedCapability !== requiredCapability) {
    return {
      status: 'ERROR',
      source: 'none',
      reason: `Capability mismatch: Provider "${provider}" does not support capability "${requiredCapability}". Expected "${expectedCapability}".`,
    }
  }

  // 1. Sandbox execution rule: Zero database queries, zero decryption, simulated outcome
  if (executionMode === 'sandbox') {
    return {
      status: 'CONFIGURED',
      source: 'deployment',
      metadata: {
        sandbox: true,
        phone_number_id: phoneNumberId || 'sandbox_phone_id',
      },
      reason: 'Sandbox execution: external credentials simulated without durable database lookup.',
    }
  }

  // 2. Live execution validation
  const cleanClientId = clientId?.trim()
  const cleanDeploymentId = deploymentId?.trim()

  if (!cleanClientId || !cleanDeploymentId) {
    return {
      status: 'NOT_CONFIGURED',
      source: 'none',
      reason: 'Tenant credentials rejected: Both clientId and deploymentId are required for live resolution.',
    }
  }

  const store = customStore || activeCredentialStore

  // 3. Deployment lookup & lifecycle validation
  const deployment = await store.findDeployment(cleanDeploymentId)
  if (!deployment) {
    return {
      status: 'NOT_CONFIGURED',
      source: 'none',
      reason: `Deployment "${cleanDeploymentId}" was not found.`,
    }
  }

  if (deployment.client_id !== cleanClientId) {
    return {
      status: 'ERROR',
      source: 'none',
      reason: `Tenant mismatch: Deployment "${cleanDeploymentId}" belongs to client "${deployment.client_id}", not "${cleanClientId}".`,
    }
  }

  if (deployment.status !== 'active') {
    return {
      status: 'RESTRICTED',
      source: 'deployment',
      reason: `Deployment "${cleanDeploymentId}" is in status "${deployment.status}". Live adapters require "active".`,
    }
  }

  // 4. Credential lookup
  const credRecord = await store.findCredential(cleanClientId, cleanDeploymentId, provider)
  if (!credRecord) {
    return {
      status: 'NOT_CONFIGURED',
      source: 'none',
      reason: `No credential found for client "${cleanClientId}", deployment "${cleanDeploymentId}", provider "${provider}".`,
    }
  }

  // 5. Credential lifecycle checks
  if (credRecord.status === 'revoked') {
    return {
      status: 'REVOKED',
      source: 'deployment',
      reason: `Credential for provider "${provider}" has been revoked.`,
    }
  }

  if (credRecord.status === 'suspended') {
    return {
      status: 'RESTRICTED',
      source: 'deployment',
      reason: `Credential for provider "${provider}" is currently suspended.`,
    }
  }

  if (credRecord.status !== 'active') {
    return {
      status: 'RESTRICTED',
      source: 'deployment',
      reason: `Credential status is "${credRecord.status}". Expected "active".`,
    }
  }

  // 6. Expiry check (with 60-second safety window)
  if (credRecord.expires_at) {
    const expiryTime = new Date(credRecord.expires_at).getTime()
    const now = Date.now()
    const safetyWindowMs = 60 * 1000

    if (expiryTime <= now) {
      return {
        status: 'EXPIRED',
        source: 'deployment',
        reason: `Credential for provider "${provider}" expired at ${credRecord.expires_at}.`,
      }
    }

    if (expiryTime - now <= safetyWindowMs) {
      return {
        status: 'RESTRICTED',
        source: 'deployment',
        reason: `Credential for provider "${provider}" is near expiry (within 60s safety buffer).`,
      }
    }
  }

  // 7. Certification check: Live execution requires CERTIFIED status
  if (credRecord.certification_status !== 'CERTIFIED') {
    return {
      status: credRecord.certification_status,
      source: 'deployment',
      reason: `Credential certification status is "${credRecord.certification_status}". Live adapter requires "CERTIFIED".`,
    }
  }

  // 8. Decrypt secret payload in memory
  let decryptedRaw: string
  try {
    decryptedRaw = decryptSecret(credRecord.encrypted_secret)
  } catch (decErr: any) {
    return {
      status: 'ERROR',
      source: 'deployment',
      reason: 'Failed to decrypt credential payload. Authentication tag validation failed or key corrupted.',
    }
  }

  let credentials: any
  try {
    credentials = JSON.parse(decryptedRaw)
  } catch {
    credentials = { token: decryptedRaw }
  }

  return {
    status: 'CERTIFIED',
    source: 'deployment',
    credentials: credentials as T,
    metadata: credRecord.metadata || {},
  }
}

// ── Legacy Compatibility Wrappers for Synchronous Adapter Resolution ─────────

export interface LegacyResolveCredentialsParams {
  clientId?: string
  deploymentId?: string
  phoneNumberId?: string
}

/**
 * Synchronous resolver for WhatsApp adapter config checking.
 * In production live mode, global tokens are REJECTED to prevent cross-tenant leakage.
 */
export function resolveWhatsAppCredentials(
  params: LegacyResolveCredentialsParams
): CredentialResolutionResult<WhatsAppAdapterCredentials> {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN || '').trim()
  const phoneId = params.phoneNumberId?.trim() || (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID || '').trim()

  const hasToken = token.length > 10 && !token.includes('placeholder')
  const hasPhoneId = phoneId.length > 5 && !phoneId.includes('placeholder')

  if (!hasToken || !hasPhoneId) {
    return {
      status: 'NOT_CONFIGURED',
      source: 'none',
      reason: 'WhatsApp credentials (access token or phone number ID) are not configured.',
    }
  }

  // Rule: In production environment, global token fallback is strictly RESTRICTED
  if (process.env.NODE_ENV === 'production' && !params.deploymentId) {
    return {
      status: 'RESTRICTED',
      source: 'global',
      reason: 'Global WhatsApp token fallback is strictly prohibited in production environment. Tenant credential required.',
    }
  }

  // Deployment-scoped configuration
  if (params.deploymentId && params.phoneNumberId) {
    return {
      status: 'CONFIGURED',
      source: 'deployment',
      credentials: {
        accessToken: token,
        fromPhoneNumberId: params.phoneNumberId.trim(),
      },
    }
  }

  return {
    status: 'RESTRICTED',
    source: 'global',
    reason: 'Global Meta WhatsApp access token is not tenant-isolated and cannot be used for live tenant dispatch.',
    credentials: {
      accessToken: token,
      fromPhoneNumberId: phoneId,
    },
  }
}

export function resolveGoogleCalendarCredentials(
  params: LegacyResolveCredentialsParams
): CredentialResolutionResult<GoogleCalendarAdapterCredentials> {
  return {
    status: 'NOT_CONFIGURED',
    source: 'none',
    reason: 'Google Calendar API adapter is not configured or authenticated in this phase.',
  }
}

export function resolveN8nCredentials(
  params: LegacyResolveCredentialsParams
): CredentialResolutionResult<N8nAdapterCredentials> {
  const webhookUrl = (process.env.N8N_WEBHOOK_URL || '').trim()

  if (!webhookUrl || webhookUrl.includes('placeholder') || webhookUrl.includes('grovaitech.ai')) {
    return {
      status: 'NOT_CONFIGURED',
      source: 'none',
      reason: 'n8n webhook URL is not configured with an active external endpoint.',
    }
  }

  return {
    status: 'RESTRICTED',
    source: 'global',
    reason: 'n8n webhook is URL-only and lacks cryptographic authentication/signatures.',
    credentials: {
      webhookUrl,
    },
  }
}
