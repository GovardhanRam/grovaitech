/**
 * Grovaitech AI Platform
 * lib/integrations/types.ts
 *
 * Domain contracts for external adapters, execution context,
 * deterministic operation identity, and credential resolution.
 * Server-only module.
 */

import crypto from 'crypto'
import type { WorkflowStepResult } from '@/lib/workflows/executor'

export type ExecutionMode = 'sandbox' | 'live'

export type IntegrationProvider = 'meta_whatsapp' | 'google_calendar' | 'n8n'
export type IntegrationCapability = 'messaging' | 'scheduling' | 'pipeline'

export type CredentialLifecycleStatus = 'active' | 'revoked' | 'expired' | 'suspended'
export type ProviderCertificationStatus =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'CERTIFIED'
  | 'REVOKED'
  | 'ERROR'

export interface IntegrationCredentialRecord {
  id: string
  client_id: string
  deployment_id: string
  provider: IntegrationProvider
  credential_type: string
  encrypted_secret: string
  key_version: number
  metadata: Record<string, any>
  status: CredentialLifecycleStatus
  certification_status: ProviderCertificationStatus
  created_at: string
  updated_at: string
  expires_at?: string | null
  last_verified_at?: string | null
}

/**
 * Reusable server-controlled Adapter Context for external side-effect operations.
 * Strictly guarantees that tenant identity is server-derived, never model-derived.
 */
export interface ExternalAdapterContext {
  clientId?: string
  deploymentId?: string
  /** Stable business operation identity across retries */
  businessOperationId: string
  /** Execution attempt identifier */
  workflowExecutionId: string
  workflowStepId: string
  idempotencyKey: string
  executionMode: ExecutionMode
  channel?: 'web_chat' | 'whatsapp' | 'api'
  timestamp: string
}

export interface OperationIdentityParams {
  /**
   * Stable business operation identity.
   * Retrying the same business operation with the same businessOperationId
   * produces the exact same idempotency key across different execution attempts.
   */
  businessOperationId?: string
  /** Execution attempt ID used as fallback if businessOperationId is omitted */
  workflowExecutionId?: string
  workflowStepId: string
  operationName: string
  entityId?: string
  discriminator?: string
}

/**
 * Generates a deterministic, retry-stable idempotency key for external side effects.
 * Composed of:
 *   stableOperationId (businessOperationId || workflowExecutionId)
 *   + workflowStepId + operationName + (entityId / discriminator)
 */
export function generateOperationIdempotencyKey(params: OperationIdentityParams): string {
  const {
    businessOperationId,
    workflowExecutionId,
    workflowStepId,
    operationName,
    entityId = '',
    discriminator = '',
  } = params

  const stableOpId = (businessOperationId || workflowExecutionId || '').trim()
  if (!stableOpId) {
    throw new Error('generateOperationIdempotencyKey requires either businessOperationId or workflowExecutionId')
  }

  const raw = [
    stableOpId,
    workflowStepId.trim(),
    operationName.trim().toLowerCase(),
    entityId.trim(),
    discriminator.trim(),
  ].join(':')

  const hash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex').substring(0, 32)
  return `idemp_${operationName.trim().toLowerCase()}_${hash}`
}

export interface ValidateLiveContextResult {
  valid: boolean
  missingFields?: string[]
  reason?: string
}

/**
 * Validates that an ExternalAdapterContext meets strict tenant safety requirements for live execution.
 * Live external side effects MUST have verified tenant coordinates (clientId, deploymentId).
 */
export function validateLiveAdapterContext(context: ExternalAdapterContext): ValidateLiveContextResult {
  if (context.executionMode !== 'live') {
    return { valid: true }
  }

  const missing: string[] = []
  if (!context.clientId?.trim()) missing.push('clientId')
  if (!context.deploymentId?.trim()) missing.push('deploymentId')
  if (!context.workflowExecutionId?.trim()) missing.push('workflowExecutionId')
  if (!context.businessOperationId?.trim()) missing.push('businessOperationId')
  if (!context.workflowStepId?.trim()) missing.push('workflowStepId')
  if (!context.idempotencyKey?.trim()) missing.push('idempotencyKey')

  if (missing.length > 0) {
    return {
      valid: false,
      missingFields: missing,
      reason: `Live external adapter execution rejected: missing required context fields [${missing.join(', ')}].`,
    }
  }

  return { valid: true }
}

export interface CredentialResolutionResult<T = Record<string, any>> {
  status: ProviderCertificationStatus | 'RESTRICTED' | 'EXPIRED'
  source: 'deployment' | 'global' | 'none'
  credentials?: T
  metadata?: Record<string, any>
  reason?: string
}

export interface WhatsAppAdapterCredentials {
  accessToken: string
  fromPhoneNumberId: string
  wabaId?: string
}

export interface GoogleCalendarAdapterCredentials {
  serviceAccountEmail?: string
  accessToken?: string
  refreshToken?: string
  calendarId: string
}

export interface N8nAdapterCredentials {
  webhookUrl: string
  apiKey?: string
  secretKey?: string
}

export interface ResolvedExternalAdapters {
  dispatchWhatsAppTemplate?: (
    payload: any,
    context: ExternalAdapterContext
  ) => Promise<Omit<WorkflowStepResult, 'stepId' | 'stepName' | 'type' | 'target' | 'durationMs'>>
  createCalendarEvent?: (
    payload: any,
    context: ExternalAdapterContext
  ) => Promise<Omit<WorkflowStepResult, 'stepId' | 'stepName' | 'type' | 'target' | 'durationMs'>>
  dispatchN8nWebhook?: (
    payload: any,
    context: ExternalAdapterContext
  ) => Promise<Omit<WorkflowStepResult, 'stepId' | 'stepName' | 'type' | 'target' | 'durationMs'>>
}
