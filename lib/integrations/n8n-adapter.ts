/**
 * Grovaitech AI Platform
 * lib/integrations/n8n-adapter.ts
 *
 * Tenant-Safe n8n Webhook Outbound Execution Adapter.
 * Bridges automation workflows into the E1 safety plane:
 * - Server-controlled tenant and deployment boundary
 * - Tenant credential resolution & certification verification
 * - Deterministic, durable idempotency with atomic claiming
 * - Strict E1 Live Execution Gate enforcement
 * - E1 Safe Egress through safeFetch (HTTPS-only, SSRF-guarded, bounded timeout)
 * - Normalized ProviderExecutionResult mapping
 * - Complete audit status transitions (claimed -> processing -> succeeded/failed/unknown)
 * - Zero secret leakage in error messages or logs
 */

import crypto from 'crypto'
import type {
  ExternalAdapterContext,
  ExecutionMode,
  ProviderExecutionResult,
} from './types'
import {
  validateLiveAdapterContext,
  assertLiveExternalExecutionAllowed,
  generateOperationIdempotencyKey,
} from './types'
import {
  type CredentialStore,
  getCredentialStore,
  resolveIntegrationCredential,
} from './credentials'
import {
  type IdempotencyStore,
  getIdempotencyStore,
  setIdempotencyStore,
  claimExternalOperation,
  transitionToProcessing,
  completeExternalOperation,
  failExternalOperation,
  markExternalOperationUnknown,
} from './idempotency'
import { safeFetch, validateEgressUrl } from './egress'
import { sanitizeResultPayload, scrubSensitiveString } from './fingerprint'
import { createAdminClient } from '@/lib/supabase/server'

export interface DispatchTenantN8nWebhookOptions {
  clientId: string
  deploymentId: string
  payload: Record<string, any>
  event?: string
  businessOperationId?: string
  workflowStepId?: string
  deployment?: any
  executionMode?: ExecutionMode
  customStore?: CredentialStore
  customIdempStore?: IdempotencyStore
  lookupFn?: (hostname: string) => Promise<string[]>
  fetchFn?: typeof fetch
}

/**
 * Dispatches a tenant-safe n8n webhook request through the E1 safety plane.
 */
export async function dispatchTenantN8nWebhook(
  options: DispatchTenantN8nWebhookOptions
): Promise<ProviderExecutionResult> {
  const {
    clientId,
    deploymentId,
    payload,
    event = 'workflow.triggered',
    businessOperationId: providedBusinessOpId,
    workflowStepId = 'n8n_dispatch_webhook',
    deployment: providedDeployment,
    executionMode = 'live',
    customStore,
    customIdempStore,
    lookupFn,
    fetchFn,
  } = options

  const credStore = customStore || getCredentialStore()
  const prevIdempStore = customIdempStore ? getIdempotencyStore() : null
  if (customIdempStore) {
    setIdempotencyStore(customIdempStore)
  }

  const nowIso = new Date().toISOString()

  try {
    // 1. Validate caller identity parameters
    const cleanClientId = clientId?.trim()
    const cleanDeploymentId = deploymentId?.trim()

    if (!cleanClientId || !cleanDeploymentId) {
      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: 'TENANT_IDENTITY_MISSING',
        safeMessage: 'Tenant identity rejected: Both clientId and deploymentId are required for n8n dispatch.',
        retryable: false,
        completedAt: nowIso,
      }
    }

    // 2. Lookup deployment and verify active status
    let deployment = providedDeployment || (await credStore.findDeployment(cleanDeploymentId))
    if (!deployment) {
      try {
        const supabase = await createAdminClient()
        const { data } = await supabase
          .from('client_deployments')
          .select('*')
          .eq('id', cleanDeploymentId)
          .maybeSingle()
        if (data) {
          deployment = data
        }
      } catch {}
    }

    if (!deployment) {
      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: 'DEPLOYMENT_NOT_FOUND',
        safeMessage: `Deployment "${cleanDeploymentId}" was not found.`,
        retryable: false,
        completedAt: nowIso,
      }
    }

    if (deployment.client_id !== cleanClientId) {
      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: 'TENANT_MISMATCH',
        safeMessage: `Tenant mismatch: Deployment "${cleanDeploymentId}" belongs to client "${deployment.client_id}", not "${cleanClientId}".`,
        retryable: false,
        completedAt: nowIso,
      }
    }

    if (deployment.status !== 'active') {
      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: 'DEPLOYMENT_INACTIVE',
        safeMessage: `Deployment "${cleanDeploymentId}" is in status "${deployment.status}". Live dispatch requires "active".`,
        retryable: false,
        completedAt: nowIso,
      }
    }

    // 3. Resolve tenant credential
    const credResult = await resolveIntegrationCredential<{
      webhookUrl?: string
      apiKey?: string
      secretKey?: string
    }>({
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      provider: 'n8n',
      requiredCapability: 'pipeline',
      executionMode,
      customStore: credStore,
    })

    // 4. Construct deterministic businessOperationId and idempotency key
    const businessOperationId =
      providedBusinessOpId?.trim() ||
      `n8n_event_${cleanDeploymentId}_${event}_${Date.now()}`
    const operationName = 'n8n_webhook_dispatch'
    const discriminator = event

    const idempotencyKey = generateOperationIdempotencyKey({
      businessOperationId,
      workflowStepId,
      operationName,
      discriminator,
    })

    // 5. Construct ExternalAdapterContext
    const context: ExternalAdapterContext = {
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      businessOperationId,
      workflowExecutionId: `wf_exec_${businessOperationId}`,
      workflowStepId,
      idempotencyKey,
      executionMode,
      channel: 'api',
      timestamp: nowIso,
    }

    // 6. Validate context for live execution
    const contextValidation = validateLiveAdapterContext(context)
    if (!contextValidation.valid) {
      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: 'INVALID_ADAPTER_CONTEXT',
        safeMessage: contextValidation.reason || 'Adapter context invalid for live execution.',
        retryable: false,
        completedAt: nowIso,
      }
    }

    // 7. Atomically claim external operation
    const payloadToFingerprint = {
      event,
      data: payload || {},
    }

    const claim = await claimExternalOperation({
      context,
      payload: payloadToFingerprint,
      provider: 'n8n',
      operationName,
    })

    // 8. Handle duplicate claim scenarios
    if (!claim.hasExecutionPermission) {
      if (claim.cached && claim.status === 'succeeded') {
        return {
          status: 'succeeded',
          provider: 'n8n',
          providerOperationId: claim.providerOperationId || undefined,
          safeMessage: 'Replaying previously succeeded n8n dispatch (cached).',
          completedAt: nowIso,
        }
      }

      if (claim.cached && claim.status === 'failed') {
        return {
          status: 'failed',
          provider: 'n8n',
          errorCode: claim.errorCode || 'PRIOR_FAILURE',
          safeMessage: claim.errorMessage || 'Operation previously failed terminally (cached).',
          retryable: false,
          completedAt: nowIso,
        }
      }

      if (claim.inFlight) {
        return {
          status: 'simulated',
          provider: 'n8n',
          safeMessage: `n8n operation is currently in-flight by another execution attempt (Idempotency: ${context.idempotencyKey}).`,
          retryable: false,
          completedAt: nowIso,
        }
      }

      if (claim.reconciliationRequired) {
        return {
          status: 'unknown',
          provider: 'n8n',
          errorCode: 'RECONCILIATION_REQUIRED',
          safeMessage: 'n8n operation is in an unknown state from a prior attempt; automatic retry is blocked.',
          retryable: false,
          completedAt: nowIso,
        }
      }
    }

    // 9. Evaluate strict Live Execution Gate
    const gateCheck = assertLiveExternalExecutionAllowed({
      context,
      deploymentStatus: deployment.status,
      credentialStatus: credResult.metadata?.status || 'active',
      credentialExpiresAt: credResult.metadata?.expires_at,
      certificationStatus: credResult.status,
      hasExecutionPermission: claim.hasExecutionPermission,
      claimStatus: claim.status,
    })

    // 10. Handle gate rejection
    if (!gateCheck.allowed) {
      if (context.executionMode === 'sandbox') {
        if (claim.operationId && claim.status === 'claimed') {
          await transitionToProcessing(claim.operationId, context)
          await completeExternalOperation(
            claim.operationId,
            {
              providerOperationId: `sim-n8n-${claim.operationId.substring(0, 16)}`,
              resultPayload: sanitizeResultPayload({
                event,
                simulated: true,
              }),
            },
            context
          )
        }

        return {
          status: 'simulated',
          provider: 'n8n',
          providerOperationId: `sim-n8n-${claim.operationId ? claim.operationId.substring(0, 16) : Date.now()}`,
          safeMessage: `[SIMULATED] n8n dispatch "${event}" simulated in sandbox mode.`,
          retryable: false,
          completedAt: nowIso,
        }
      }

      if (claim.operationId && claim.status === 'claimed') {
        await failExternalOperation(
          claim.operationId,
          {
            code: 'LIVE_EXECUTION_BLOCKED',
            message: gateCheck.reason || 'Live external execution blocked by safety gate.',
          },
          context
        )
      }

      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: 'LIVE_EXECUTION_BLOCKED',
        safeMessage: gateCheck.reason || 'Live external execution blocked by safety gate.',
        retryable: false,
        completedAt: nowIso,
      }
    }

    // 11. Transition operation status: claimed -> processing
    await transitionToProcessing(claim.operationId, context)

    const webhookUrl = credResult.metadata?.webhook_url || credResult.credentials?.webhookUrl
    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://')) {
      const err = {
        code: 'INVALID_WEBHOOK_URL',
        message: 'n8n integration requires an HTTPS webhook_url in configuration.',
      }
      await failExternalOperation(claim.operationId, err, context)
      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: err.code,
        safeMessage: err.message,
        retryable: false,
        completedAt: nowIso,
      }
    }

    // Pre-flight SSRF check
    const egressCheck = await validateEgressUrl(webhookUrl, lookupFn)
    if (!egressCheck.valid) {
      const err = {
        code: 'EGRESS_BLOCKED',
        message: `Egress blocked: ${egressCheck.reason}`,
      }
      await failExternalOperation(claim.operationId, err, context)
      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: err.code,
        safeMessage: err.message,
        retryable: false,
        completedAt: nowIso,
      }
    }

    const signingSecret = credResult.credentials?.secretKey || credResult.credentials?.apiKey
    const apiKey = credResult.credentials?.apiKey

    const secretsToScrub = [
      signingSecret,
      apiKey,
    ].filter(Boolean) as string[]

    const outboundPayload = {
      event,
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      timestamp: nowIso,
      data: sanitizeResultPayload(payload || {}),
    }
    const payloadJson = JSON.stringify(outboundPayload)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Grovaitech-Event': event,
    }

    if (signingSecret && typeof signingSecret === 'string') {
      const hmac = crypto.createHmac('sha256', signingSecret).update(payloadJson).digest('hex')
      headers['X-Grovaitech-Signature'] = `sha256=${hmac}`
    }

    if (apiKey && typeof apiKey === 'string') {
      headers['X-API-Key'] = apiKey
    }

    // 12. Dispatch via safeFetch
    try {
      const res = await safeFetch(webhookUrl, {
        method: 'POST',
        headers,
        body: payloadJson,
        timeoutMs: 5000,
        lookupFn,
        fetchFn,
      })

      if (res.ok) {
        const providerOpId = `n8n_${context.idempotencyKey.substring(0, 20)}`

        await completeExternalOperation(
          claim.operationId,
          {
            providerOperationId: providerOpId,
            resultPayload: sanitizeResultPayload({
              event,
              statusCode: res.status,
            }),
          },
          context
        )

        return {
          status: 'succeeded',
          provider: 'n8n',
          providerOperationId: providerOpId,
          safeMessage: `n8n webhook dispatched successfully for event "${event}".`,
          completedAt: new Date().toISOString(),
        }
      }

      // HTTP Error handling
      let errorMsg = `n8n webhook returned HTTP ${res.status}.`
      let errorCode = 'PROVIDER_ERROR'

      if (res.status === 401 || res.status === 403) {
        errorCode = 'AUTH_FAILED'
        errorMsg = `n8n webhook rejected authentication (HTTP ${res.status}). Valid signing secret or API key required.`
      } else if (res.status === 404) {
        errorCode = 'ENDPOINT_NOT_FOUND'
        errorMsg = 'n8n webhook endpoint not found (HTTP 404). Verify webhook URL path.'
      }

      await failExternalOperation(
        claim.operationId,
        { code: errorCode, message: errorMsg },
        context
      )

      return {
        status: 'failed',
        provider: 'n8n',
        errorCode,
        safeMessage: errorMsg,
        retryable: res.status >= 500,
        completedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      const rawMsg = err?.message || 'Network error during n8n webhook dispatch.'
      const isTimeout = rawMsg.includes('timed out') || err?.name === 'AbortError'

      if (isTimeout) {
        const safeMsg = 'n8n webhook request timed out; outcome unknown. Automatic retry blocked.'
        await markExternalOperationUnknown(claim.operationId, safeMsg, context)
        return {
          status: 'unknown',
          provider: 'n8n',
          errorCode: 'TIMEOUT',
          safeMessage: safeMsg,
          retryable: false,
          completedAt: new Date().toISOString(),
        }
      }

      const cleanMsg = scrubSensitiveString(rawMsg, secretsToScrub)
      await failExternalOperation(
        claim.operationId,
        { code: 'NETWORK_ERROR', message: cleanMsg },
        context
      )

      return {
        status: 'failed',
        provider: 'n8n',
        errorCode: 'NETWORK_ERROR',
        safeMessage: cleanMsg,
        retryable: false,
        completedAt: new Date().toISOString(),
      }
    }
  } finally {
    if (prevIdempStore) {
      setIdempotencyStore(prevIdempStore)
    }
  }
}
