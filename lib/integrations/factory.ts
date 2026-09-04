/**
 * Grovaitech AI Platform
 * lib/integrations/factory.ts
 *
 * Central External Adapter Resolution Factory.
 * Enforces lifecycle and sandbox boundaries:
 * 1. Sandbox execution ALWAYS resolves to simulated adapters.
 * 2. Inactive / paused / suspended deployments NEVER resolve real adapters.
 * 3. Unconfigured adapters ALWAYS remain simulated.
 * 4. Passes authoritative ExternalAdapterContext with deterministic idempotency keys.
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
} from './credentials'

export interface ResolveAdaptersOptions {
  clientId?: string
  deploymentId?: string
  deploymentStatus?: DeploymentStatus
  executionMode?: ExecutionMode
  phoneNumberId?: string
}

/**
 * Resolves external adapters strictly enforcing lifecycle, tenant context, and sandbox rules.
 * Does NOT activate real external providers in Phase 5T-A.
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

  // Boundary 4: Credential check for live execution
  const waCreds = resolveWhatsAppCredentials({ clientId, deploymentId, phoneNumberId })
  const calCreds = resolveGoogleCalendarCredentials({ clientId, deploymentId })
  const n8nCreds = resolveN8nCredentials({ clientId, deploymentId })

  // In Phase 5T-A Foundation, real external providers remain unverified and disabled
  // Real adapters will be plugged into this factory in future certification phases
  return {
    dispatchWhatsAppTemplate: async (payload: any, ctx: ExternalAdapterContext) => {
      const validation = validateLiveAdapterContext(ctx)
      if (!validation.valid) {
        return {
          status: 'simulated',
          detail: `[SIMULATED:invalid_context] ${validation.reason || 'Context invalid for live execution.'}`,
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
