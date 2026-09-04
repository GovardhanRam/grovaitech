/**
 * Grovaitech AI Platform
 * lib/integrations/factory.ts
 *
 * Central External Adapter Resolution Factory.
 * Enforces lifecycle, certification, and sandbox boundaries:
 * 1. Sandbox execution ALWAYS resolves to simulated adapters.
 * 2. Inactive / paused / suspended deployments NEVER resolve real adapters.
 * 3. Uncertified adapters ALWAYS remain simulated.
 * 4. Durable idempotency claim guards against duplicate execution across workers.
 * 5. Passes authoritative ExternalAdapterContext with deterministic idempotency keys.
 */

import type { DeploymentStatus } from '@/lib/deployment/types'
import {
  type ExecutionMode,
  type ExternalAdapterContext,
  type ResolvedExternalAdapters,
  validateLiveAdapterContext,
} from './types'
import {
  resolveWhatsAppCredentials,
  resolveGoogleCalendarCredentials,
  resolveN8nCredentials,
  resolveIntegrationCredential,
} from './credentials'
import { claimExternalOperation } from './idempotency'

export interface ResolveAdaptersOptions {
  clientId?: string
  deploymentId?: string
  deploymentStatus?: DeploymentStatus
  executionMode?: ExecutionMode
  phoneNumberId?: string
}

/**
 * Resolves external adapters strictly enforcing lifecycle, tenant context, and sandbox rules.
 * Does NOT activate real external providers in Phase 5T-C2 foundation.
 */
export function resolveExternalAdapters(
  options: ResolveAdaptersOptions
): ResolvedExternalAdapters {
  const {
    clientId,
    deploymentId,
    deploymentStatus,
    executionMode = 'sandbox',
    phoneNumberId,
  } = options

  // Boundary 1: Sandbox mode ALWAYS resolves to purely simulated adapters
  if (executionMode === 'sandbox') {
    return createSimulatedAdapters('sandbox')
  }

  // Boundary 2: Fail-closed lifecycle check - missing or non-active deployment status NEVER resolves real adapters
  if (!deploymentStatus || deploymentStatus !== 'active') {
    return createSimulatedAdapters(deploymentStatus ? `lifecycle_${deploymentStatus}` : 'lifecycle_status_missing')
  }

  // Boundary 3: Strict Live Tenant Context - live execution MUST have valid tenant coordinates
  if (!clientId?.trim() || !deploymentId?.trim()) {
    return createSimulatedAdapters('missing_tenant_context')
  }

  // Boundary 4: Credential & Certification check for live execution
  const waCreds = resolveWhatsAppCredentials({ clientId, deploymentId, phoneNumberId })
  const calCreds = resolveGoogleCalendarCredentials({ clientId, deploymentId })
  const n8nCreds = resolveN8nCredentials({ clientId, deploymentId })

  // Real external adapters remain unverified and disabled in foundation phases.
  // Adapters require certification checks and durable idempotency claims before live execution.
  return {
    dispatchWhatsAppTemplate: async (payload: any, ctx: ExternalAdapterContext) => {
      const validation = validateLiveAdapterContext(ctx)
      if (!validation.valid) {
        return {
          status: 'simulated',
          detail: `[SIMULATED:invalid_context] ${validation.reason || 'Context invalid for live execution.'}`,
        }
      }

      // Check tenant credential authorization & certification status
      const authResult = await resolveIntegrationCredential({
        clientId: ctx.clientId,
        deploymentId: ctx.deploymentId,
        provider: 'meta_whatsapp',
        requiredCapability: 'messaging',
        executionMode: ctx.executionMode,
        phoneNumberId,
      })

      if (authResult.status !== 'CERTIFIED' && authResult.status !== 'CONFIGURED') {
        return {
          status: 'simulated',
          detail: `[SIMULATED:uncertified] WhatsApp adapter not certified (Status: ${authResult.status}). Reason: ${authResult.reason || 'Certification required'}.`,
        }
      }

      const claim = await claimExternalOperation({
        context: ctx,
        payload,
        provider: 'meta_whatsapp',
        operationName: 'whatsapp_template',
      })

      if (!claim.hasExecutionPermission) {
        if (claim.cached && claim.status === 'succeeded') {
          return {
            status: 'simulated',
            detail: `[DURABLE_REPLAY:succeeded] Replaying previously succeeded WhatsApp operation (Idempotency: ${ctx.idempotencyKey}).`,
          }
        }
        if (claim.cached && claim.status === 'failed') {
          return {
            status: 'failed',
            detail: `[DURABLE_REPLAY:failed] Replaying previously failed WhatsApp operation: ${claim.errorMessage || 'prior failure'}`,
          }
        }
        if (claim.inFlight) {
          return {
            status: 'simulated',
            detail: `[DURABLE_IN_FLIGHT] WhatsApp operation is already in-flight by another worker (Idempotency: ${ctx.idempotencyKey}).`,
          }
        }
        if (claim.reconciliationRequired) {
          return {
            status: 'failed',
            detail: `[DURABLE_UNKNOWN] WhatsApp operation is in an unverified state; automatic retry is blocked.`,
          }
        }
      }

      const recipient = payload?.recipient || 'customer'
      return {
        status: 'simulated',
        detail: `[SIMULATED] Outbound WhatsApp template prepared for ${recipient} (Idempotency: ${ctx.idempotencyKey}). No verified live adapter is active.`,
      }
    },
    createCalendarEvent: async (payload: any, ctx: ExternalAdapterContext) => {
      const validation = validateLiveAdapterContext(ctx)
      if (!validation.valid) {
        return {
          status: 'simulated',
          detail: `[SIMULATED:invalid_context] ${validation.reason || 'Context invalid for live execution.'}`,
        }
      }

      const authResult = await resolveIntegrationCredential({
        clientId: ctx.clientId,
        deploymentId: ctx.deploymentId,
        provider: 'google_calendar',
        requiredCapability: 'scheduling',
        executionMode: ctx.executionMode,
      })

      if (authResult.status !== 'CERTIFIED') {
        return {
          status: 'simulated',
          detail: `[SIMULATED:uncertified] Calendar adapter not certified (Status: ${authResult.status}). Reason: ${authResult.reason || 'Certification required'}.`,
        }
      }

      const claim = await claimExternalOperation({
        context: ctx,
        payload,
        provider: 'google_calendar',
        operationName: 'calendar_event',
      })

      if (!claim.hasExecutionPermission) {
        if (claim.cached && claim.status === 'succeeded') {
          return {
            status: 'simulated',
            detail: `[DURABLE_REPLAY:succeeded] Replaying previously succeeded Calendar event (Idempotency: ${ctx.idempotencyKey}).`,
          }
        }
        if (claim.cached && claim.status === 'failed') {
          return {
            status: 'failed',
            detail: `[DURABLE_REPLAY:failed] Replaying previously failed Calendar event: ${claim.errorMessage || 'prior failure'}`,
          }
        }
        if (claim.inFlight) {
          return {
            status: 'simulated',
            detail: `[DURABLE_IN_FLIGHT] Calendar event is already in-flight by another worker (Idempotency: ${ctx.idempotencyKey}).`,
          }
        }
        if (claim.reconciliationRequired) {
          return {
            status: 'failed',
            detail: `[DURABLE_UNKNOWN] Calendar operation is in an unverified state; automatic retry is blocked.`,
          }
        }
      }

      const date = payload?.date || 'requested slot'
      return {
        status: 'simulated',
        detail: `[SIMULATED] Calendar event prepared for ${date} (Idempotency: ${ctx.idempotencyKey}). No verified Google Calendar adapter is configured.`,
      }
    },
    dispatchN8nWebhook: async (payload: any, ctx: ExternalAdapterContext) => {
      const validation = validateLiveAdapterContext(ctx)
      if (!validation.valid) {
        return {
          status: 'simulated',
          detail: `[SIMULATED:invalid_context] ${validation.reason || 'Context invalid for live execution.'}`,
        }
      }

      const authResult = await resolveIntegrationCredential({
        clientId: ctx.clientId,
        deploymentId: ctx.deploymentId,
        provider: 'n8n',
        requiredCapability: 'pipeline',
        executionMode: ctx.executionMode,
      })

      if (authResult.status !== 'CERTIFIED') {
        return {
          status: 'simulated',
          detail: `[SIMULATED:uncertified] n8n pipeline not certified (Status: ${authResult.status}). Reason: ${authResult.reason || 'Certification required'}.`,
        }
      }

      const claim = await claimExternalOperation({
        context: ctx,
        payload,
        provider: 'n8n',
        operationName: 'n8n_webhook',
      })

      if (!claim.hasExecutionPermission) {
        if (claim.cached && claim.status === 'succeeded') {
          return {
            status: 'simulated',
            detail: `[DURABLE_REPLAY:succeeded] Replaying previously succeeded n8n dispatch (Idempotency: ${ctx.idempotencyKey}).`,
          }
        }
        if (claim.inFlight) {
          return {
            status: 'simulated',
            detail: `[DURABLE_IN_FLIGHT] n8n dispatch is already in-flight (Idempotency: ${ctx.idempotencyKey}).`,
          }
        }
      }

      return {
        status: 'simulated',
        detail: `[SIMULATED] n8n pipeline dispatch prepared (Idempotency: ${ctx.idempotencyKey}). No active webhook is configured.`,
      }
    },
  }
}

function createSimulatedAdapters(reason: string): ResolvedExternalAdapters {
  return {
    dispatchWhatsAppTemplate: async (payload: any, ctx: ExternalAdapterContext) => ({
      status: 'simulated',
      detail: `[SIMULATED:${reason}] Outbound WhatsApp template prepared for ${payload?.recipient || 'customer'} (Idempotency: ${ctx.idempotencyKey}).`,
    }),
    createCalendarEvent: async (payload: any, ctx: ExternalAdapterContext) => ({
      status: 'simulated',
      detail: `[SIMULATED:${reason}] Calendar event prepared for ${payload?.date || 'requested slot'} (Idempotency: ${ctx.idempotencyKey}).`,
    }),
    dispatchN8nWebhook: async (payload: any, ctx: ExternalAdapterContext) => ({
      status: 'simulated',
      detail: `[SIMULATED:${reason}] n8n pipeline dispatch prepared (Idempotency: ${ctx.idempotencyKey}).`,
    }),
  }
}
