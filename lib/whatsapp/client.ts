/**
 * Grovaitech AI Platform
 * lib/whatsapp/client.ts
 *
 * Meta WhatsApp Cloud API Client & Sandboxed Dispatcher.
 * Server-only module. Never exposes access tokens to client components.
 */

export interface WhatsAppSendResult {
  success: boolean
  status: 'sent' | 'simulated' | 'failed'
  messageId?: string
  recipient: string
  payload?: any
  error?: string
  durationMs: number
}

/**
 * Checks whether Meta WhatsApp Cloud API is configured with real credentials
 */
export function isWhatsAppConfigured(explicitPhoneId?: string): boolean {
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN
  const phoneId = explicitPhoneId?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID

  const hasValidToken = !!token && !token.includes('placeholder') && token.trim().length > 10
  const hasValidPhoneId = !!phoneId && !phoneId.includes('placeholder') && phoneId.trim().length > 5

  return hasValidToken && hasValidPhoneId
}

/**
 * Gets configured WhatsApp status string for Integrations UI
 */
export function getWhatsAppIntegrationStatus(): 'connected' | 'needs_setup' | 'demo' {
  if (isWhatsAppConfigured()) {
    return 'connected'
  }
  const hasPartial = !!(
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.META_WHATSAPP_TOKEN ||
    process.env.WHATSAPP_PHONE_NUMBER_ID
  )
  return hasPartial ? 'needs_setup' : 'demo'
}

/**
 * Dispatches an outbound text message to a WhatsApp recipient
 * If credentials are not configured, runs safely in Sandboxed Simulation mode.
 */
export async function sendWhatsAppTextMessage({
  to,
  text,
  fromPhoneNumberId,
  replyToMessageId,
}: {
  to: string
  text: string
  fromPhoneNumberId?: string
  replyToMessageId?: string
}): Promise<WhatsAppSendResult> {
  const startTime = Date.now()
  const cleanRecipient = to.replace(/[^0-9+]/g, '')

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

  const effectivePhoneId = fromPhoneNumberId?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID

  // 1. Check if real Meta Cloud API credentials are configured
  if (!isWhatsAppConfigured(effectivePhoneId)) {
    if (process.env.NODE_ENV === 'production') {
      const durationMs = Date.now() - startTime
      console.error('[WhatsApp Production Error] Outbound message aborted: Meta WhatsApp credentials not configured.')
      return {
        success: false,
        status: 'failed',
        recipient: cleanRecipient,
        error: 'Meta WhatsApp API credentials not configured in production environment.',
        durationMs,
      }
    }

    const durationMs = Date.now() - startTime + 25
    console.log(`[WhatsApp Sandbox] Simulated text dispatched to ${cleanRecipient}: "${text.slice(0, 60)}..."`)

    return {
      success: true,
      status: 'simulated',
      messageId: `sim-wamid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      recipient: cleanRecipient,
      payload,
      durationMs,
    }
  }

  // 2. Live Meta Cloud API Dispatch
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN)!.trim()
  const phoneId = effectivePhoneId!.trim()
  const apiUrl = `https://graph.facebook.com/v20.0/${phoneId}/messages`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const data = await res.json()
    const durationMs = Date.now() - startTime

    if (!res.ok) {
      console.error('[WhatsApp API Error]', data)
      return {
        success: false,
        status: 'failed',
        recipient: cleanRecipient,
        error: data.error?.message || `HTTP ${res.status} Error`,
        payload,
        durationMs,
      }
    }

    const messageId = data.messages?.[0]?.id || `wamid.${Date.now()}`
    console.log(`[WhatsApp Live] Successfully delivered to ${cleanRecipient} (ID: ${messageId})`)

    return {
      success: true,
      status: 'sent',
      messageId,
      recipient: cleanRecipient,
      payload,
      durationMs,
    }
  } catch (err: any) {
    const durationMs = Date.now() - startTime
    console.error('[WhatsApp Network Error]', err.message)
    return {
      success: false,
      status: 'failed',
      recipient: cleanRecipient,
      error: err.message,
      payload,
      durationMs,
    }
  }
}

/**
 * Dispatches an outbound template message to a WhatsApp recipient
 */
export async function sendWhatsAppTemplateMessage({
  to,
  templateName,
  languageCode = 'en_US',
  parameters = [],
  fromPhoneNumberId,
}: {
  to: string
  templateName: string
  languageCode?: string
  parameters?: string[]
  fromPhoneNumberId?: string
}): Promise<WhatsAppSendResult> {
  const startTime = Date.now()
  const cleanRecipient = to.replace(/[^0-9+]/g, '')

  const payload = {
    messaging_product: 'whatsapp',
    to: cleanRecipient,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: parameters.length > 0 ? [
        {
          type: 'body',
          parameters: parameters.map(p => ({ type: 'text', text: p }))
        }
      ] : undefined
    }
  }

  const effectivePhoneId = fromPhoneNumberId?.trim() || process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_PHONE_NUMBER_ID

  if (!isWhatsAppConfigured(effectivePhoneId)) {
    return {
      success: true,
      status: 'simulated',
      messageId: `sim-template-${Date.now()}`,
      recipient: cleanRecipient,
      payload,
      durationMs: Date.now() - startTime + 20,
    }
  }

  const token = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WHATSAPP_TOKEN)!.trim()
  const phoneId = effectivePhoneId!.trim()
  const apiUrl = `https://graph.facebook.com/v20.0/${phoneId}/messages`

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    return {
      success: res.ok,
      status: res.ok ? 'sent' : 'failed',
      messageId: data.messages?.[0]?.id,
      recipient: cleanRecipient,
      payload,
      durationMs: Date.now() - startTime,
    }
  } catch (err: any) {
    return {
      success: false,
      status: 'failed',
      recipient: cleanRecipient,
      error: err.message,
      payload,
      durationMs: Date.now() - startTime,
    }
  }
}
