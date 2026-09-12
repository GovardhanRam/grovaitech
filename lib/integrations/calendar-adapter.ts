/**
 * Grovaitech AI Platform
 * lib/integrations/calendar-adapter.ts
 *
 * Tenant-Safe Google Calendar Execution Adapter.
 * Bridges calendar scheduling and event creation into the E1 safety plane:
 * - Server-controlled tenant and deployment boundary
 * - Tenant credential resolution & certification verification
 * - Deterministic, durable idempotency with atomic claiming
 * - Strict E1 Live Execution Gate enforcement
 * - E1 Safe Egress through safeFetch (HTTPS-only, SSRF-guarded, bounded timeout)
 * - Normalized ProviderExecutionResult mapping
 * - Complete audit status transitions (claimed -> processing -> succeeded/failed/unknown)
 * - Zero secret leakage in error messages or logs
 */

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
import { safeFetch } from './egress'
import { sanitizeResultPayload, scrubSensitiveString } from './fingerprint'
import { createAdminClient } from '@/lib/supabase/server'

export interface DispatchTenantCalendarEventOptions {
  clientId: string
  deploymentId: string
  summary: string
  startTime: string
  endTime: string
  attendeeEmail?: string
  description?: string
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
 * Dispatches a tenant-safe calendar event creation request.
 * Strictly adheres to the E1 execution sequence and safety plane.
 */
export async function dispatchTenantCalendarEvent(
  options: DispatchTenantCalendarEventOptions
): Promise<ProviderExecutionResult> {
  const {
    clientId,
    deploymentId,
    summary,
    startTime,
    endTime,
    attendeeEmail,
    description,
    businessOperationId: providedBusinessOpId,
    workflowStepId = 'calendar_create_event',
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
    const cleanSummary = summary?.trim()

    if (!cleanClientId || !cleanDeploymentId) {
      return {
        status: 'failed',
        provider: 'google_calendar',
        errorCode: 'TENANT_IDENTITY_MISSING',
        safeMessage: 'Tenant identity rejected: Both clientId and deploymentId are required for Calendar dispatch.',
        retryable: false,
        completedAt: nowIso,
      }
    }

    if (!cleanSummary || !startTime || !endTime) {
      return {
        status: 'failed',
        provider: 'google_calendar',
        errorCode: 'INVALID_EVENT_PARAMS',
        safeMessage: 'Calendar event creation requires summary, startTime, and endTime.',
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
        provider: 'google_calendar',
        errorCode: 'DEPLOYMENT_NOT_FOUND',
        safeMessage: `Deployment "${cleanDeploymentId}" was not found.`,
        retryable: false,
        completedAt: nowIso,
      }
    }

    if (deployment.client_id !== cleanClientId) {
      return {
        status: 'failed',
        provider: 'google_calendar',
        errorCode: 'TENANT_MISMATCH',
        safeMessage: `Tenant mismatch: Deployment "${cleanDeploymentId}" belongs to client "${deployment.client_id}", not "${cleanClientId}".`,
        retryable: false,
        completedAt: nowIso,
      }
    }

    if (deployment.status !== 'active') {
      return {
        status: 'failed',
        provider: 'google_calendar',
        errorCode: 'DEPLOYMENT_INACTIVE',
        safeMessage: `Deployment "${cleanDeploymentId}" is in status "${deployment.status}". Live dispatch requires "active".`,
        retryable: false,
        completedAt: nowIso,
      }
    }

    // 3. Resolve tenant credential
    const credResult = await resolveIntegrationCredential<{
      accessToken?: string
      refreshToken?: string
      token?: string
      calendarId?: string
      clientSecret?: string
    }>({
      clientId: cleanClientId,
      deploymentId: cleanDeploymentId,
      provider: 'google_calendar',
      requiredCapability: 'scheduling',
      executionMode,
      customStore: credStore,
    })

    // 4. Construct deterministic businessOperationId and idempotency key
    const businessOperationId =
      providedBusinessOpId?.trim() ||
      `cal_event_${cleanDeploymentId}_${new Date(startTime).getTime()}`
    const operationName = 'google_calendar_create_event'
    const discriminator = `${startTime}_${endTime}`

    const idempotencyKey = generateOperationIdempotencyKey({
      businessOperationId,
      workflowStepId,
      operationName,
      entityId: attendeeEmail?.trim() || cleanSummary,
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
        provider: 'google_calendar',
        errorCode: 'INVALID_ADAPTER_CONTEXT',
        safeMessage: contextValidation.reason || 'Adapter context invalid for live execution.',
        retryable: false,
        completedAt: nowIso,
      }
    }

    // 7. Atomically claim external operation
    const payloadToFingerprint = {
      summary: cleanSummary,
      startTime,
      endTime,
      attendeeEmail: attendeeEmail?.trim(),
      description,
    }

    const claim = await claimExternalOperation({
      context,
      payload: payloadToFingerprint,
      provider: 'google_calendar',
      operationName,
    })

    // 8. Handle duplicate claim scenarios
    if (!claim.hasExecutionPermission) {
      if (claim.cached && claim.status === 'succeeded') {
        return {
          status: 'succeeded',
          provider: 'google_calendar',
          providerOperationId: claim.providerOperationId || undefined,
          safeMessage: 'Replaying previously succeeded Google Calendar operation (cached).',
          completedAt: nowIso,
        }
      }

      if (claim.cached && claim.status === 'failed') {
        return {
          status: 'failed',
          provider: 'google_calendar',
          errorCode: claim.errorCode || 'PRIOR_FAILURE',
          safeMessage: claim.errorMessage || 'Operation previously failed terminally (cached).',
          retryable: false,
          completedAt: nowIso,
        }
      }

      if (claim.inFlight) {
        return {
          status: 'simulated',
          provider: 'google_calendar',
          safeMessage: `Calendar operation is currently in-flight by another execution attempt (Idempotency: ${context.idempotencyKey}).`,
          retryable: false,
          completedAt: nowIso,
        }
      }

      if (claim.reconciliationRequired) {
        return {
          status: 'unknown',
          provider: 'google_calendar',
          errorCode: 'RECONCILIATION_REQUIRED',
          safeMessage: 'Calendar operation is in an unknown state from a prior attempt; automatic retry is blocked.',
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
              providerOperationId: `sim-cal-${claim.operationId.substring(0, 16)}`,
              resultPayload: sanitizeResultPayload({
                summary: cleanSummary,
                startTime,
                endTime,
                simulated: true,
              }),
            },
            context
          )
        }

        return {
          status: 'simulated',
          provider: 'google_calendar',
          providerOperationId: `sim-cal-${claim.operationId ? claim.operationId.substring(0, 16) : Date.now()}`,
          safeMessage: `[SIMULATED] Google Calendar event "${cleanSummary}" simulated in sandbox mode.`,
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
        provider: 'google_calendar',
        errorCode: 'LIVE_EXECUTION_BLOCKED',
        safeMessage: gateCheck.reason || 'Live external execution blocked by safety gate.',
        retryable: false,
        completedAt: nowIso,
      }
    }

    // 11. Transition operation status: claimed -> processing
    await transitionToProcessing(claim.operationId, context)

    const calendarId = credResult.metadata?.calendar_id || credResult.credentials?.calendarId || 'primary'
    const accessToken = credResult.credentials?.accessToken || credResult.credentials?.token || ''

    const secretsToScrub = [
      accessToken,
      credResult.credentials?.refreshToken,
      credResult.credentials?.clientSecret,
    ].filter(Boolean) as string[]

    const baseUrl = (credResult.metadata?.calendarApiBaseUrl || 'https://www.googleapis.com').replace(/\/$/, '')
    const targetUrl = `${baseUrl}/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`

    const eventBody = {
      summary: cleanSummary,
      description: description || undefined,
      start: { dateTime: startTime },
      end: { dateTime: endTime },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : undefined,
    }

    // 12. Dispatch via safeFetch
    try {
      const res = await safeFetch(targetUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(eventBody),
        timeoutMs: 5000,
        lookupFn,
        fetchFn,
      })

      if (res.status === 200 || res.status === 201) {
        let data: any = {}
        try {
          data = await res.json()
        } catch {
          data = {}
        }

        const eventId = data?.id || `cal_evt_${Date.now()}`

        await completeExternalOperation(
          claim.operationId,
          {
            providerOperationId: eventId,
            resultPayload: sanitizeResultPayload({
              eventId,
              summary: cleanSummary,
              htmlLink: data?.htmlLink,
              status: data?.status || 'confirmed',
            }),
          },
          context
        )

        return {
          status: 'succeeded',
          provider: 'google_calendar',
          providerOperationId: eventId,
          safeMessage: `Calendar event "${cleanSummary}" created successfully.`,
          completedAt: new Date().toISOString(),
        }
      }

      // HTTP Error handling
      let errorMsg = `Google Calendar returned HTTP ${res.status}.`
      let errorCode = 'PROVIDER_ERROR'

      if (res.status === 401) {
        errorCode = 'AUTH_FAILED'
        errorMsg = 'Google Calendar authentication failed (HTTP 401). Access token is invalid or expired.'
      } else if (res.status === 403) {
        errorCode = 'PERMISSION_DENIED'
        errorMsg = 'Google Calendar permission denied (HTTP 403). Insufficient scopes or calendar quota exceeded.'
      } else if (res.status === 404) {
        errorCode = 'CALENDAR_NOT_FOUND'
        errorMsg = `Google Calendar "${calendarId}" not found (HTTP 404).`
      }

      await failExternalOperation(
        claim.operationId,
        { code: errorCode, message: errorMsg },
        context
      )

      return {
        status: 'failed',
        provider: 'google_calendar',
        errorCode,
        safeMessage: errorMsg,
        retryable: res.status >= 500,
        completedAt: new Date().toISOString(),
      }
    } catch (err: any) {
      const rawMsg = err?.message || 'Network error during Google Calendar dispatch.'
      const isTimeout = rawMsg.includes('timed out') || err?.name === 'AbortError'

      if (isTimeout) {
        const safeMsg = 'Google Calendar request timed out; outcome unknown. Automatic retry blocked.'
        await markExternalOperationUnknown(claim.operationId, safeMsg, context)
        return {
          status: 'unknown',
          provider: 'google_calendar',
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
        provider: 'google_calendar',
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
