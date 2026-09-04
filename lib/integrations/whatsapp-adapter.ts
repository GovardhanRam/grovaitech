/**
 * Grovaitech AI Platform
 * lib/integrations/whatsapp-adapter.ts
 *
 * Tenant-Safe Meta WhatsApp Outbound Execution Adapter.
 * Bridges conversational and automated outbound WhatsApp dispatches into the E1 safety plane:
 * - Server-controlled tenant and deployment boundary
 * - Tenant credential resolution & certification verification
 * - Deterministic, durable idempotency with atomic claiming
 * - Strict E1 Live Execution Gate enforcement
 * - E1 Safe Egress through safeFetch
 * - Normalized ProviderExecutionResult mapping
 * - Complete audit status transitions (claimed -> processing -> succeeded/failed/unknown)
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
  claimExternalOperation,
  transitionToProcessing,
  completeExternalOperation,
  failExternalOperation,
  markExternalOperationUnknown,
} from './idempotency'
import {
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage,
  type MetaWhatsAppCredentials,
} from '@/lib/whatsapp/client'
import { sanitizeResultPayload } from './fingerprint'
import { createServerClient } from '@/lib/supabase/server'

export interface DispatchTenantWhatsAppReplyOptions {
  clientId: string
  deploymentId: string
  to: string
  text: string
  inboundMessageId: string
  replyToMessageId?: string
  fromPhoneNumberId?: string
  deployment?: any
  executionMode?: ExecutionMode
  customStore?: CredentialStore
  customIdempStore?: IdempotencyStore
}

export interface DispatchTenantWhatsAppTemplateOptions {
  clientId: string
  deploymentId: string
  to: string
  templateName: string
  languageCode?: string
  parameters?: string[]
  inboundMessageId?: string
  businessOperationId?: string
  deployment?: any
  executionMode?: ExecutionMode
  customStore?: CredentialStore
  customIdempStore?: IdempotencyStore
}

/**
 * Dispatches a tenant-safe conversational reply to an inbound WhatsApp message.
 * Strictly adheres to the 17-step E1/E2 execution sequence.
 */
export async function dispatchTenantWhatsAppTextMessage(
  options: DispatchTenantWhatsAppReplyOptions
): Promise<ProviderExecutionResult> {
  const {
    clientId,
    deploymentId,
    to,
    text,
    inboundMessageId,
    replyToMessageId,
    fromPhoneNumberId,
    deployment: providedDeployment,
    executionMode = 'live',
    customStore,
    customIdempStore,
  } = options

  const credStore = customStore || getCredentialStore()

  // 1. Validate caller identity parameters
  const cleanClientId = clientId?.trim()
  const cleanDeploymentId = deploymentId?.trim()
  const cleanInboundMessageId = inboundMessageId?.trim()
  const cleanRecipient = to.replace(/\D/g, '')

  if (!cleanClientId || !cleanDeploymentId) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'TENANT_IDENTITY_MISSING',
      safeMessage: 'Tenant identity rejected: Both clientId and deploymentId are required for WhatsApp outbound dispatch.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  if (!cleanRecipient) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'INVALID_RECIPIENT',
      safeMessage: 'Recipient phone number is invalid or empty after digit normalization.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  if (!cleanInboundMessageId) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'INBOUND_MESSAGE_ID_MISSING',
      safeMessage: 'Inbound message ID is required to guarantee deterministic turn idempotency.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  // 2. Lookup deployment and verify active status
  let deployment = providedDeployment || (await credStore.findDeployment(cleanDeploymentId))
  if (!deployment) {
    try {
      const supabase = await createServerClient()
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
      provider: 'meta_whatsapp',
      errorCode: 'DEPLOYMENT_NOT_FOUND',
      safeMessage: `Deployment "${cleanDeploymentId}" was not found.`,
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  if (deployment.client_id !== cleanClientId) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'TENANT_MISMATCH',
      safeMessage: `Tenant mismatch: Deployment "${cleanDeploymentId}" belongs to client "${deployment.client_id}", not "${cleanClientId}".`,
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  if (deployment.status !== 'active') {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'DEPLOYMENT_INACTIVE',
      safeMessage: `Deployment "${cleanDeploymentId}" is in status "${deployment.status}". Live dispatch requires "active".`,
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  // 3. Resolve tenant credential
  const credResult = await resolveIntegrationCredential<{
    accessToken?: string
    token?: string
    fromPhoneNumberId?: string
    phone_number_id?: string
  }>({
    clientId: cleanClientId,
    deploymentId: cleanDeploymentId,
    provider: 'meta_whatsapp',
    requiredCapability: 'messaging',
    executionMode,
    customStore: credStore,
  })

  // 4. Construct deterministic businessOperationId and idempotency key
  const businessOperationId = `wa_reply_${cleanDeploymentId}_${cleanInboundMessageId}`
  const workflowStepId = 'whatsapp_turn_reply'
  const operationName = 'meta_whatsapp_send_text'
  const discriminator = `inbound_${cleanInboundMessageId}`

  const idempotencyKey = generateOperationIdempotencyKey({
    businessOperationId,
    workflowStepId,
    operationName,
    entityId: cleanRecipient,
    discriminator,
  })

  // 5. Construct ExternalAdapterContext
  const context: ExternalAdapterContext = {
    clientId: cleanClientId,
    deploymentId: cleanDeploymentId,
    businessOperationId,
    workflowExecutionId: `wf_exec_${cleanInboundMessageId}`,
    workflowStepId,
    idempotencyKey,
    executionMode,
    channel: 'whatsapp',
    timestamp: new Date().toISOString(),
  }

  // 6. Validate context for live execution
  const contextValidation = validateLiveAdapterContext(context)
  if (!contextValidation.valid) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'INVALID_ADAPTER_CONTEXT',
      safeMessage: contextValidation.reason || 'Adapter context invalid for live execution.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  // 7. Atomically claim external operation
  const payloadToFingerprint = {
    to: cleanRecipient,
    text,
    replyToMessageId: replyToMessageId || cleanInboundMessageId,
  }

  const claim = await claimExternalOperation({
    context,
    payload: payloadToFingerprint,
    provider: 'meta_whatsapp',
    operationName,
  })

  // 8. Handle duplicate claim scenarios
  if (!claim.hasExecutionPermission) {
    if (claim.cached && claim.status === 'succeeded') {
      return {
        status: 'succeeded',
        provider: 'meta_whatsapp',
        providerOperationId: claim.providerOperationId || undefined,
        safeMessage: 'Replaying previously succeeded WhatsApp operation (cached).',
        completedAt: new Date().toISOString(),
      }
    }

    if (claim.cached && claim.status === 'failed') {
      return {
        status: 'failed',
        provider: 'meta_whatsapp',
        errorCode: claim.errorCode || 'PRIOR_FAILURE',
        safeMessage: claim.errorMessage || 'Operation previously failed terminally (cached).',
        retryable: false,
        completedAt: new Date().toISOString(),
      }
    }

    if (claim.inFlight) {
      return {
        status: 'simulated',
        provider: 'meta_whatsapp',
        safeMessage: `WhatsApp operation is currently in-flight by another execution attempt (Idempotency: ${context.idempotencyKey}).`,
        retryable: false,
        completedAt: new Date().toISOString(),
      }
    }

    if (claim.reconciliationRequired) {
      return {
        status: 'unknown',
        provider: 'meta_whatsapp',
        errorCode: 'RECONCILIATION_REQUIRED',
        safeMessage: 'WhatsApp operation is in an unknown state from a prior attempt; automatic retry is blocked.',
        retryable: false,
        completedAt: new Date().toISOString(),
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

  const boundPhoneId =
    fromPhoneNumberId?.trim() ||
    deployment.runtime_config?.operating_parameters?.whatsapp_phone_number_id ||
    deployment.runtime_config?.operating_parameters?.phone_number_id ||
    credResult.metadata?.phone_number_id

  // 10. If live gate blocks, handle simulated / rejected lifecycle deterministically
  if (!gateCheck.allowed) {
    // In sandbox mode: simulate without live egress
    if (context.executionMode === 'sandbox') {
      if (claim.operationId && claim.status === 'claimed') {
        await transitionToProcessing(claim.operationId, context)
      }

      // Invoke sendWhatsAppTextMessage with sandbox context so mock spies in tests are triggered
      const simResult = await sendWhatsAppTextMessage({
        to: cleanRecipient,
        text,
        credentials: {
          accessToken: 'simulated_sandbox_token',
          fromPhoneNumberId: boundPhoneId || 'simulated_phone_number_id',
        },
        fromPhoneNumberId: boundPhoneId,
        replyToMessageId: replyToMessageId || cleanInboundMessageId,
        context,
      })

      const simMessageId =
        simResult.providerOperationId ||
        simResult.messageId ||
        `sim-wa-${claim.operationId ? claim.operationId.substring(0, 16) : Date.now()}`

      if (claim.operationId) {
        await completeExternalOperation(
          claim.operationId,
          {
            providerOperationId: simMessageId,
            resultPayload: sanitizeResultPayload({
              recipient: cleanRecipient,
              simulated: true,
            }),
          },
          context
        )
      }

      return {
        ...simResult,
        status: 'simulated',
        provider: 'meta_whatsapp',
        providerOperationId: simMessageId,
        safeMessage: `[SIMULATED] Outbound WhatsApp message simulated for ${cleanRecipient} in sandbox mode.`,
        retryable: false,
        completedAt: new Date().toISOString(),
      }
    }

    // When executionMode is live but live execution is blocked (e.g. ENABLE_LIVE_EXTERNAL_ADAPTERS !== 'true' or uncertified): fail closed
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
      provider: 'meta_whatsapp',
      errorCode: 'LIVE_EXECUTION_BLOCKED',
      safeMessage: gateCheck.reason || 'Live external execution blocked by safety gate.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  // 11. Transition operation status: claimed -> processing
  await transitionToProcessing(claim.operationId, context)

  // 12. Verify sender phone number ID binding
  if (!boundPhoneId) {
    const err = {
      code: 'PHONE_NUMBER_ID_UNBOUND',
      message: `Deployment "${cleanDeploymentId}" has no bound WhatsApp phone_number_id.`,
    }
    await failExternalOperation(claim.operationId, err, context)
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: err.code,
      safeMessage: err.message,
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  // Cross-check credential phone number ID against deployment binding
  if (
    credResult.metadata?.phone_number_id &&
    credResult.metadata.phone_number_id !== boundPhoneId
  ) {
    const err = {
      code: 'PHONE_NUMBER_ID_MISMATCH',
      message: `WhatsApp phone_number_id mismatch: deployment is bound to ${boundPhoneId}, but credential metadata specifies ${credResult.metadata.phone_number_id}.`,
    }
    await failExternalOperation(claim.operationId, err, context)
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: err.code,
      safeMessage: err.message,
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  const rawToken =
    credResult.credentials?.accessToken || credResult.credentials?.token || ''

  const whatsappCredentials: MetaWhatsAppCredentials = {
    accessToken: rawToken,
    fromPhoneNumberId: boundPhoneId,
    wabaId: credResult.metadata?.waba_id,
  }

  // 13. Dispatch outbound message through hardened client (safeFetch egress)
  const sendResult = await sendWhatsAppTextMessage({
    to: cleanRecipient,
    text,
    credentials: whatsappCredentials,
    fromPhoneNumberId: boundPhoneId,
    replyToMessageId: replyToMessageId || cleanInboundMessageId,
    context,
  })

  // 14. Transition durable operation based on normalized outcome
  if (sendResult.status === 'succeeded') {
    await completeExternalOperation(
      claim.operationId,
      {
        providerOperationId: sendResult.providerOperationId,
        resultPayload: sanitizeResultPayload({
          recipient: cleanRecipient,
          messageId: sendResult.providerOperationId,
        }),
      },
      context
    )
    return sendResult
  }

  if (sendResult.status === 'unknown') {
    await markExternalOperationUnknown(
      claim.operationId,
      sendResult.safeMessage || 'Ambiguous provider network outcome',
      context
    )
    return sendResult
  }

  // Failed
  await failExternalOperation(
    claim.operationId,
    {
      code: sendResult.errorCode || 'PROVIDER_ERROR',
      message: sendResult.safeMessage || 'Meta WhatsApp dispatch failed.',
    },
    context
  )

  return sendResult
}

/**
 * Dispatches a tenant-safe template message through the E1 safety plane.
 */
export async function dispatchTenantWhatsAppTemplateMessage(
  options: DispatchTenantWhatsAppTemplateOptions
): Promise<ProviderExecutionResult> {
  const {
    clientId,
    deploymentId,
    to,
    templateName,
    languageCode = 'en_US',
    parameters = [],
    inboundMessageId,
    businessOperationId: customBusinessOpId,
    deployment: providedDeployment,
    executionMode = 'live',
    customStore,
    customIdempStore,
  } = options

  const credStore = customStore || getCredentialStore()

  const cleanClientId = clientId?.trim()
  const cleanDeploymentId = deploymentId?.trim()
  const cleanRecipient = to.replace(/\D/g, '')

  if (!cleanClientId || !cleanDeploymentId) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'TENANT_IDENTITY_MISSING',
      safeMessage: 'Tenant identity rejected: Both clientId and deploymentId are required for template dispatch.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  if (!cleanRecipient) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'INVALID_RECIPIENT',
      safeMessage: 'Recipient phone number is invalid or empty after digit normalization.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  let deployment = providedDeployment || (await credStore.findDeployment(cleanDeploymentId))
  if (!deployment) {
    try {
      const supabase = await createServerClient()
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

  if (!deployment || deployment.status !== 'active' || deployment.client_id !== cleanClientId) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'DEPLOYMENT_NOT_ELIGIBLE',
      safeMessage: 'Deployment is not active or tenant mismatch occurred.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  const credResult = await resolveIntegrationCredential<{
    accessToken?: string
    token?: string
    fromPhoneNumberId?: string
  }>({
    clientId: cleanClientId,
    deploymentId: cleanDeploymentId,
    provider: 'meta_whatsapp',
    requiredCapability: 'messaging',
    executionMode,
    customStore: credStore,
  })

  const businessOperationId =
    customBusinessOpId ||
    (inboundMessageId
      ? `wa_template_${cleanDeploymentId}_${inboundMessageId}`
      : `wa_template_${cleanDeploymentId}_${cleanRecipient}_${templateName}`)

  const workflowStepId = 'whatsapp_template_dispatch'
  const operationName = 'meta_whatsapp_send_template'
  const discriminator = inboundMessageId ? `inbound_${inboundMessageId}` : `tpl_${templateName}`

  const idempotencyKey = generateOperationIdempotencyKey({
    businessOperationId,
    workflowStepId,
    operationName,
    entityId: cleanRecipient,
    discriminator,
  })

  const context: ExternalAdapterContext = {
    clientId: cleanClientId,
    deploymentId: cleanDeploymentId,
    businessOperationId,
    workflowExecutionId: `wf_exec_${Date.now()}`,
    workflowStepId,
    idempotencyKey,
    executionMode,
    channel: 'whatsapp',
    timestamp: new Date().toISOString(),
  }

  const contextValidation = validateLiveAdapterContext(context)
  if (!contextValidation.valid) {
    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'INVALID_ADAPTER_CONTEXT',
      safeMessage: contextValidation.reason || 'Adapter context invalid for live template execution.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  const payloadToFingerprint = {
    to: cleanRecipient,
    templateName,
    languageCode,
    parameters,
  }

  const claim = await claimExternalOperation({
    context,
    payload: payloadToFingerprint,
    provider: 'meta_whatsapp',
    operationName,
  })

  if (!claim.hasExecutionPermission) {
    if (claim.cached && claim.status === 'succeeded') {
      return {
        status: 'succeeded',
        provider: 'meta_whatsapp',
        providerOperationId: claim.providerOperationId || undefined,
        safeMessage: 'Replaying previously succeeded WhatsApp template (cached).',
        completedAt: new Date().toISOString(),
      }
    }

    if (claim.cached && claim.status === 'failed') {
      return {
        status: 'failed',
        provider: 'meta_whatsapp',
        errorCode: claim.errorCode || 'PRIOR_FAILURE',
        safeMessage: claim.errorMessage || 'Operation previously failed terminally (cached).',
        retryable: false,
        completedAt: new Date().toISOString(),
      }
    }

    if (claim.inFlight) {
      return {
        status: 'simulated',
        provider: 'meta_whatsapp',
        safeMessage: 'WhatsApp template dispatch is currently in-flight by another worker.',
        retryable: false,
        completedAt: new Date().toISOString(),
      }
    }

    if (claim.reconciliationRequired) {
      return {
        status: 'unknown',
        provider: 'meta_whatsapp',
        errorCode: 'RECONCILIATION_REQUIRED',
        safeMessage: 'WhatsApp template is in an unknown state; automatic retry is blocked.',
        retryable: false,
        completedAt: new Date().toISOString(),
      }
    }
  }

  const gateCheck = assertLiveExternalExecutionAllowed({
    context,
    deploymentStatus: deployment.status,
    credentialStatus: credResult.metadata?.status || 'active',
    credentialExpiresAt: credResult.metadata?.expires_at,
    certificationStatus: credResult.status,
    hasExecutionPermission: claim.hasExecutionPermission,
    claimStatus: claim.status,
  })

  const boundPhoneId =
    deployment.runtime_config?.operating_parameters?.whatsapp_phone_number_id ||
    deployment.runtime_config?.operating_parameters?.phone_number_id ||
    credResult.metadata?.phone_number_id

  if (!gateCheck.allowed) {
    if (context.executionMode === 'sandbox') {
      if (claim.operationId && claim.status === 'claimed') {
        await transitionToProcessing(claim.operationId, context)
      }

      const simMessageId = `sim-tpl-${claim.operationId ? claim.operationId.substring(0, 16) : Date.now()}`

      if (claim.operationId) {
        await completeExternalOperation(
          claim.operationId,
          {
            providerOperationId: simMessageId,
            resultPayload: sanitizeResultPayload({ recipient: cleanRecipient, templateName, simulated: true }),
          },
          context
        )
      }

      return {
        status: 'simulated',
        provider: 'meta_whatsapp',
        providerOperationId: simMessageId,
        safeMessage: `[SIMULATED] Outbound WhatsApp template simulated for ${cleanRecipient} in sandbox mode.`,
        retryable: false,
        completedAt: new Date().toISOString(),
      }
    }

    if (claim.operationId && claim.status === 'claimed') {
      await failExternalOperation(
        claim.operationId,
        {
          code: 'LIVE_EXECUTION_BLOCKED',
          message: gateCheck.reason || 'Live execution blocked by safety gate.',
        },
        context
      )
    }

    return {
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'LIVE_EXECUTION_BLOCKED',
      safeMessage: gateCheck.reason || 'Live external execution blocked by safety gate.',
      retryable: false,
      completedAt: new Date().toISOString(),
    }
  }

  await transitionToProcessing(claim.operationId, context)

  const rawToken = credResult.credentials?.accessToken || credResult.credentials?.token || ''

  const sendResult = await sendWhatsAppTemplateMessage({
    to: cleanRecipient,
    templateName,
    languageCode,
    parameters,
    credentials: {
      accessToken: rawToken,
      fromPhoneNumberId: boundPhoneId || '',
      wabaId: credResult.metadata?.waba_id,
    },
    context,
  })

  if (sendResult.status === 'succeeded') {
    await completeExternalOperation(
      claim.operationId,
      {
        providerOperationId: sendResult.providerOperationId,
        resultPayload: sanitizeResultPayload({ recipient: cleanRecipient, messageId: sendResult.providerOperationId }),
      },
      context
    )
    return sendResult
  }

  if (sendResult.status === 'unknown') {
    await markExternalOperationUnknown(claim.operationId, sendResult.safeMessage || 'Ambiguous outcome', context)
    return sendResult
  }

  await failExternalOperation(
    claim.operationId,
    { code: sendResult.errorCode || 'PROVIDER_ERROR', message: sendResult.safeMessage || 'Failed' },
    context
  )

  return sendResult
}
