/**
 * Grovaitech AI Platform
 * lib/whatsapp/client.ts
 *
 * Hardened Meta WhatsApp Cloud API Client & Sandboxed Dispatcher.
 * Server-only module. Never exposes access tokens to client components, logs, or LLM contexts.
 *
 * Hardened in Phase 5T-E2:
 * - Requires explicit tenant-scoped credentials (never reads global env tokens in live mode)
 * - Strict safeFetch egress boundary with SSRF, redirect, and timeout protections
 * - Normalized ProviderExecutionResult mapping
 * - Digits-only recipient normalization
 * - Safe non-secret Graph API version resolution
 */

import { safeFetch, EgressSecurityError } from '@/lib/integrations/egress'
import type {
  ProviderExecutionResult,
  ExternalAdapterContext,
} from '@/lib/integrations/types'

/**
 * Meta Graph API version configuration.
 * Default: 'v20.0'.
 * Configurable via META_GRAPH_API_VERSION for non-breaking API lifecycle management.
 * NOTE: Version deprecation is an ongoing provider maintenance concern.
 */
export const DEFAULT_META_GRAPH_API_VERSION = 'v20.0'

export function getMetaGraphApiVersion(): string {
  const envVersion = process.env.META_GRAPH_API_VERSION?.trim()
  if (envVersion && /^v\d+\.\d+$/.test(envVersion)) {
    return envVersion
  }
  return DEFAULT_META_GRAPH_API_VERSION
}

export interface MetaWhatsAppCredentials {
  accessToken: string
  fromPhoneNumberId: string
  wabaId?: string
}

export interface WhatsAppSendResult extends ProviderExecutionResult {
  success: boolean
  recipient: string
  durationMs: number
  messageId?: string
  error?: string
  payload?: any
}

/**
 * Checks whether Meta WhatsApp Cloud API is configured with valid explicit credentials.
 * NEVER checks or relies on global WHATSAPP_ACCESS_TOKEN or META_WHATSAPP_TOKEN.
 */
export function isWhatsAppConfigured(credentials?: MetaWhatsAppCredentials): boolean {
  if (!credentials) return false
  const token = credentials.accessToken?.trim()
  const phoneId = credentials.fromPhoneNumberId?.trim()

  const hasValidToken = !!token && !token.includes('placeholder') && token.length > 10
  const hasValidPhoneId = !!phoneId && !phoneId.includes('placeholder') && phoneId.length > 5

  return hasValidToken && hasValidPhoneId
}

/**
 * Gets configured WhatsApp status string for Integrations UI
 */
export function getWhatsAppIntegrationStatus(credentials?: MetaWhatsAppCredentials): 'connected' | 'needs_setup' | 'demo' {
  if (isWhatsAppConfigured(credentials)) {
    return 'connected'
  }
  return credentials?.fromPhoneNumberId ? 'needs_setup' : 'demo'
}

/**
 * Normalizes raw Meta Graph API error structures into safe internal error codes.
 * Strips all internal tracing IDs, raw payloads, and secrets.
 */
export function normalizeMetaError(errorData: any, httpStatus: number): {
  errorCode: string
  safeMessage: string
  retryable: boolean
} {
  const code = errorData?.error?.code
  const subcode = errorData?.error?.error_subcode

  // Authentication errors: OAuth token invalid, expired, or malformed
  if (httpStatus === 401 || code === 190 || code === 102) {
    return {
      errorCode: 'AUTH_INVALID_TOKEN',
      safeMessage: 'Meta WhatsApp authentication failed: invalid or expired access token.',
      retryable: false,
    }
  }

  // Permission / Authorization errors: WABA or phone_number_id permission denied
  if (httpStatus === 403 || (code >= 200 && code <= 299) || code === 10) {
    return {
      errorCode: 'PERMISSION_DENIED',
      safeMessage: 'Meta WhatsApp permission denied: access to phone number or account forbidden.',
      retryable: false,
    }
  }

  // Customer 24-hour service window expired
  if (code === 131047 || subcode === 2494010) {
    return {
      errorCode: 'CUSTOMER_WINDOW_EXPIRED',
      safeMessage: 'Outbound free-form text rejected: 24-hour customer service window has expired.',
      retryable: false,
    }
  }

  // Invalid recipient: phone number not registered on WhatsApp or invalid format
  if (code === 131026 || code === 131009) {
    return {
      errorCode: 'INVALID_RECIPIENT',
      safeMessage: 'Recipient phone number is invalid or not registered on WhatsApp.',
      retryable: false,
    }
  }

  // Invalid parameter: bad request, malformed payload
  if (httpStatus === 400 || code === 100) {
    return {
      errorCode: 'INVALID_PARAMETER',
      safeMessage: 'Meta WhatsApp request rejected due to invalid parameters.',
      retryable: false,
    }
  }

  // Rate limiting
  if (httpStatus === 429 || code === 4 || code === 17 || code === 32 || code === 613 || code === 80007) {
    return {
      errorCode: 'RATE_LIMIT_EXCEEDED',
      safeMessage: 'Meta WhatsApp API rate limit exceeded.',
      retryable: true,
    }
  }

  // Provider 5xx: temporary Meta outage / service unavailable
  if (httpStatus >= 500 && httpStatus <= 599) {
    return {
      errorCode: 'META_SERVICE_UNAVAILABLE',
      safeMessage: 'Meta WhatsApp service is temporarily unavailable.',
      retryable: true,
    }
  }

  return {
    errorCode: 'META_API_ERROR',
    safeMessage: 'Meta WhatsApp API request failed.',
    retryable: false,
  }
}

export interface SendWhatsAppTextMessageOptions {
  to: string
  text: string
  credentials?: MetaWhatsAppCredentials
  fromPhoneNumberId?: string
  replyToMessageId?: string
  context?: ExternalAdapterContext
}

/**
 * Dispatches an outbound text message to a WhatsApp recipient via Meta Cloud API.
 * Uses safeFetch to enforce egress security (HTTPS, SSRF prevention, no redirects).
 * In non-production without credentials, simulates output safely.
 * In production without credentials, fails closed.
 */
export async function sendWhatsAppTextMessage(
  options: SendWhatsAppTextMessageOptions
): Promise<WhatsAppSendResult> {
  const startTime = Date.now()
  const { to, text, credentials, fromPhoneNumberId, replyToMessageId } = options

  // 1. Strict recipient normalization: digits-only (strips +, spaces, dashes)
  const cleanRecipient = to.replace(/\D/g, '')

  if (!cleanRecipient) {
    return {
      success: false,
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'INVALID_RECIPIENT',
      safeMessage: 'Recipient phone number is empty or invalid after digit normalization.',
      error: 'Recipient phone number is empty or invalid after digit normalization.',
      retryable: false,
      recipient: '',
      durationMs: Date.now() - startTime,
    }
  }

  // 2. Resolve credentials: must be explicitly provided
  const effectiveCredentials = credentials || (fromPhoneNumberId ? {
    accessToken: '',
    fromPhoneNumberId: fromPhoneNumberId.trim(),
  } : undefined)

  const payload: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanRecipient,
    type: 'text',
    text: {
      preview_url: false,
      body: text,
    },
  }

  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId }
  }

  // In sandbox execution mode: return simulated result without performing live safeFetch egress
  if (options.context?.executionMode === 'sandbox') {
    const durationMs = Date.now() - startTime + 5
    const simMessageId = `sim-wa-${options.context.idempotencyKey ? options.context.idempotencyKey.substring(0, 16) : Date.now()}`

    return {
      success: true,
      status: 'simulated',
      provider: 'meta_whatsapp',
      providerOperationId: simMessageId,
      messageId: simMessageId,
      safeMessage: `[SIMULATED] Outbound WhatsApp message simulated for ${cleanRecipient} in sandbox mode.`,
      recipient: cleanRecipient,
      payload,
      durationMs,
      completedAt: new Date().toISOString(),
    }
  }

  if (!isWhatsAppConfigured(effectiveCredentials)) {
    if (process.env.NODE_ENV === 'production') {
      const durationMs = Date.now() - startTime
      console.error('[WhatsApp Production Error] Outbound message aborted: Meta WhatsApp credentials not configured.')
      return {
        success: false,
        status: 'failed',
        provider: 'meta_whatsapp',
        errorCode: 'CREDENTIALS_MISSING',
        safeMessage: 'Meta WhatsApp API credentials not configured in production environment.',
        error: 'Meta WhatsApp API credentials not configured in production environment.',
        retryable: false,
        recipient: cleanRecipient,
        payload,
        durationMs,
      }
    }

    const durationMs = Date.now() - startTime + 10
    const simMessageId = `sim-wamid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    return {
      success: true,
      status: 'simulated',
      provider: 'meta_whatsapp',
      providerOperationId: simMessageId,
      messageId: simMessageId,
      safeMessage: 'Simulated WhatsApp text message dispatched.',
      recipient: cleanRecipient,
      payload,
      durationMs,
      completedAt: new Date().toISOString(),
    }
  }

  const phoneId = effectiveCredentials!.fromPhoneNumberId.trim()
  const token = effectiveCredentials!.accessToken.trim()
  const apiVersion = getMetaGraphApiVersion()
  const apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`

  try {
    const res = await safeFetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeoutMs: 8000,
    })

    const durationMs = Date.now() - startTime
    let data: any = null
    try {
      data = await res.json()
    } catch {
      data = null
    }

    if (!res.ok) {
      const normalized = normalizeMetaError(data, res.status)
      return {
        success: false,
        status: 'failed',
        provider: 'meta_whatsapp',
        errorCode: normalized.errorCode,
        safeMessage: normalized.safeMessage,
        error: normalized.safeMessage,
        retryable: normalized.retryable,
        recipient: cleanRecipient,
        payload,
        durationMs,
        completedAt: new Date().toISOString(),
      }
    }

    const messageId = data?.messages?.[0]?.id || `wamid.${Date.now()}`

    return {
      success: true,
      status: 'succeeded',
      provider: 'meta_whatsapp',
      providerOperationId: messageId,
      messageId,
      safeMessage: 'WhatsApp text message successfully delivered to provider.',
      recipient: cleanRecipient,
      payload,
      durationMs,
      completedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime

    if (err instanceof EgressSecurityError) {
      return {
        success: false,
        status: 'failed',
        provider: 'meta_whatsapp',
        errorCode: 'EGRESS_SECURITY_VIOLATION',
        safeMessage: `Egress security violation: ${err.message}`,
        error: `Egress security violation: ${err.message}`,
        retryable: false,
        recipient: cleanRecipient,
        payload,
        durationMs,
        completedAt: new Date().toISOString(),
      }
    }

    const isTimeoutOrAbort =
      err.name === 'AbortError' ||
      err.message?.includes('timeout') ||
      err.message?.includes('timed out') ||
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT'

    if (isTimeoutOrAbort) {
      return {
        success: false,
        status: 'unknown',
        provider: 'meta_whatsapp',
        errorCode: 'PROVIDER_TIMEOUT_OR_DISCONNECT',
        safeMessage: 'Ambiguous provider network outcome: request timed out or disconnected. Status unknown.',
        error: 'Ambiguous provider network outcome: request timed out or disconnected. Status unknown.',
        retryable: false,
        recipient: cleanRecipient,
        payload,
        durationMs,
        completedAt: new Date().toISOString(),
      }
    }

    return {
      success: false,
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'NETWORK_ERROR',
      safeMessage: `Network error: ${err.message || 'Failed to dispatch to Meta Cloud API'}`,
      error: `Network error: ${err.message || 'Failed to dispatch to Meta Cloud API'}`,
      retryable: true,
      recipient: cleanRecipient,
      payload,
      durationMs,
      completedAt: new Date().toISOString(),
    }
  }
}

export interface SendWhatsAppTemplateMessageOptions {
  to: string
  templateName: string
  languageCode?: string
  parameters?: string[]
  credentials?: MetaWhatsAppCredentials
  fromPhoneNumberId?: string
  context?: ExternalAdapterContext
}

/**
 * Dispatches an outbound template message to a WhatsApp recipient via Meta Cloud API.
 * Uses safeFetch to enforce egress security.
 */
export async function sendWhatsAppTemplateMessage(
  options: SendWhatsAppTemplateMessageOptions
): Promise<WhatsAppSendResult> {
  const startTime = Date.now()
  const {
    to,
    templateName,
    languageCode = 'en_US',
    parameters = [],
    credentials,
    fromPhoneNumberId,
  } = options

  const cleanRecipient = to.replace(/\D/g, '')

  if (!cleanRecipient) {
    return {
      success: false,
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'INVALID_RECIPIENT',
      safeMessage: 'Recipient phone number is empty or invalid after digit normalization.',
      error: 'Recipient phone number is empty or invalid after digit normalization.',
      retryable: false,
      recipient: '',
      durationMs: Date.now() - startTime,
    }
  }

  const effectiveCredentials = credentials || (fromPhoneNumberId ? {
    accessToken: '',
    fromPhoneNumberId: fromPhoneNumberId.trim(),
  } : undefined)

  const payload: any = {
    messaging_product: 'whatsapp',
    to: cleanRecipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: parameters.length > 0 ? [
        {
          type: 'body',
          parameters: parameters.map((p) => ({ type: 'text', text: p })),
        },
      ] : undefined,
    },
  }

  // In sandbox execution mode: return simulated result without performing live safeFetch egress
  if (options.context?.executionMode === 'sandbox') {
    const durationMs = Date.now() - startTime + 5
    const simMessageId = `sim-wa-${options.context.idempotencyKey ? options.context.idempotencyKey.substring(0, 16) : Date.now()}`

    return {
      success: true,
      status: 'simulated',
      provider: 'meta_whatsapp',
      providerOperationId: simMessageId,
      messageId: simMessageId,
      safeMessage: `[SIMULATED] Outbound WhatsApp template "${templateName}" simulated for ${cleanRecipient} in sandbox mode.`,
      recipient: cleanRecipient,
      payload,
      durationMs,
      completedAt: new Date().toISOString(),
    }
  }

  if (!isWhatsAppConfigured(effectiveCredentials)) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        status: 'failed',
        provider: 'meta_whatsapp',
        errorCode: 'CREDENTIALS_MISSING',
        safeMessage: 'Meta WhatsApp API credentials not configured in production environment.',
        error: 'Meta WhatsApp API credentials not configured in production environment.',
        retryable: false,
        recipient: cleanRecipient,
        payload,
        durationMs: Date.now() - startTime,
      }
    }

    const simMessageId = `sim-template-${Date.now()}`
    return {
      success: true,
      status: 'simulated',
      provider: 'meta_whatsapp',
      providerOperationId: simMessageId,
      messageId: simMessageId,
      safeMessage: 'Simulated WhatsApp template message dispatched.',
      recipient: cleanRecipient,
      payload,
      durationMs: Date.now() - startTime + 10,
      completedAt: new Date().toISOString(),
    }
  }

  const phoneId = effectiveCredentials!.fromPhoneNumberId.trim()
  const token = effectiveCredentials!.accessToken.trim()
  const apiVersion = getMetaGraphApiVersion()
  const apiUrl = `https://graph.facebook.com/${apiVersion}/${phoneId}/messages`

  try {
    const res = await safeFetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeoutMs: 8000,
    })

    const durationMs = Date.now() - startTime
    let data: any = null
    try {
      data = await res.json()
    } catch {
      data = null
    }

    if (!res.ok) {
      const normalized = normalizeMetaError(data, res.status)
      return {
        success: false,
        status: 'failed',
        provider: 'meta_whatsapp',
        errorCode: normalized.errorCode,
        safeMessage: normalized.safeMessage,
        error: normalized.safeMessage,
        retryable: normalized.retryable,
        recipient: cleanRecipient,
        payload,
        durationMs,
        completedAt: new Date().toISOString(),
      }
    }

    const messageId = data?.messages?.[0]?.id || `wamid.${Date.now()}`
    return {
      success: true,
      status: 'succeeded',
      provider: 'meta_whatsapp',
      providerOperationId: messageId,
      messageId,
      safeMessage: 'WhatsApp template message successfully delivered to provider.',
      recipient: cleanRecipient,
      payload,
      durationMs,
      completedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime

    if (err instanceof EgressSecurityError) {
      return {
        success: false,
        status: 'failed',
        provider: 'meta_whatsapp',
        errorCode: 'EGRESS_SECURITY_VIOLATION',
        safeMessage: `Egress security violation: ${err.message}`,
        error: `Egress security violation: ${err.message}`,
        retryable: false,
        recipient: cleanRecipient,
        payload,
        durationMs,
        completedAt: new Date().toISOString(),
      }
    }

    const isTimeoutOrAbort =
      err.name === 'AbortError' ||
      err.message?.includes('timeout') ||
      err.message?.includes('timed out') ||
      err.code === 'ECONNRESET' ||
      err.code === 'ETIMEDOUT'

    if (isTimeoutOrAbort) {
      return {
        success: false,
        status: 'unknown',
        provider: 'meta_whatsapp',
        errorCode: 'PROVIDER_TIMEOUT_OR_DISCONNECT',
        safeMessage: 'Ambiguous provider network outcome: template request timed out or disconnected. Status unknown.',
        error: 'Ambiguous provider network outcome: template request timed out or disconnected. Status unknown.',
        retryable: false,
        recipient: cleanRecipient,
        payload,
        durationMs,
        completedAt: new Date().toISOString(),
      }
    }

    return {
      success: false,
      status: 'failed',
      provider: 'meta_whatsapp',
      errorCode: 'NETWORK_ERROR',
      safeMessage: `Network error: ${err.message || 'Failed to dispatch template to Meta Cloud API'}`,
      error: `Network error: ${err.message || 'Failed to dispatch template to Meta Cloud API'}`,
      retryable: true,
      recipient: cleanRecipient,
      payload,
      durationMs,
      completedAt: new Date().toISOString(),
    }
  }
}
