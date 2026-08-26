/**
 * Grovaitech AI Platform
 * lib/whatsapp/security.ts
 *
 * Meta WhatsApp Webhook Security, Signature Verification & Payload Parser.
 */

import crypto from 'crypto'

// In-memory LRU-style cache for deduplicating incoming Meta message IDs
const processedMessageIds = new Map<string, number>()
const DEDUP_CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour

function cleanOldMessageIds() {
  const now = Date.now()
  for (const [id, timestamp] of processedMessageIds.entries()) {
    if (now - timestamp > DEDUP_CACHE_TTL_MS) {
      processedMessageIds.delete(id)
    }
  }
}

export function isDuplicateMessage(messageId: string): boolean {
  cleanOldMessageIds()
  if (processedMessageIds.has(messageId)) {
    return true
  }
  processedMessageIds.set(messageId, Date.now())
  return false
}

// Clear cache (useful for testing)
export function resetDuplicateCache() {
  processedMessageIds.clear()
}

/**
 * Validates Meta X-Hub-Signature-256 HMAC-SHA256 signature
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret?: string
): { isValid: boolean; reason?: string } {
  const secret = appSecret || process.env.META_APP_SECRET

  // If no secret configured in the environment, we log notice and pass in non-strict mode
  if (!secret || secret.includes('placeholder')) {
    return { isValid: true, reason: 'META_APP_SECRET not configured, signature check skipped' }
  }

  if (!signatureHeader) {
    return { isValid: false, reason: 'Missing X-Hub-Signature-256 header' }
  }

  const parts = signatureHeader.split('=')
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    return { isValid: false, reason: 'Invalid signature header format' }
  }

  const expectedSignature = parts[1]
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody, 'utf8')
  const calculatedSignature = hmac.digest('hex')

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
    return { isValid, reason: isValid ? 'Signature valid' : 'Signature mismatch' }
  } catch {
    return { isValid: false, reason: 'Signature comparison error' }
  }
}

export interface InboundWhatsAppMessage {
  messageId: string
  from: string
  name: string | null
  timestamp: string
  text: string
  phoneNumberId: string
  raw: any
}

/**
 * Parses incoming Meta Webhook body and returns actionable messages
 * Automatically filters out delivery receipts, status updates, and duplicate messages.
 */
export function parseWhatsAppWebhookPayload(body: any): {
  type: 'message' | 'status' | 'empty' | 'invalid'
  messages: InboundWhatsAppMessage[]
  skippedDuplicates: number
} {
  if (!body || typeof body !== 'object') {
    return { type: 'invalid', messages: [], skippedDuplicates: 0 }
  }

  // Meta Webhook root should be whatsapp_business_account
  if (body.object !== 'whatsapp_business_account') {
    return { type: 'invalid', messages: [], skippedDuplicates: 0 }
  }

  const entries = body.entry
  if (!Array.isArray(entries) || entries.length === 0) {
    return { type: 'empty', messages: [], skippedDuplicates: 0 }
  }

  const actionableMessages: InboundWhatsAppMessage[] = []
  let skippedDuplicates = 0
  let isStatusEvent = false

  for (const entry of entries) {
    const changes = entry.changes
    if (!Array.isArray(changes)) continue

    for (const change of changes) {
      const value = change.value
      if (!value || typeof value !== 'object') continue

      // Check if this is a delivery status update (sent, delivered, read)
      if (Array.isArray(value.statuses) && value.statuses.length > 0 && (!value.messages || value.messages.length === 0)) {
        isStatusEvent = true
        continue
      }

      const phoneNumberId = value.metadata?.phone_number_id || ''
      const contacts = value.contacts || []
      const contactMap = new Map<string, string>()

      for (const contact of contacts) {
        if (contact.wa_id && contact.profile?.name) {
          contactMap.set(contact.wa_id, contact.profile.name)
        }
      }

      const rawMessages = value.messages
      if (Array.isArray(rawMessages)) {
        for (const msg of rawMessages) {
          const messageId = msg.id
          if (!messageId) continue

          if (isDuplicateMessage(messageId)) {
            skippedDuplicates++
            continue
          }

          let textContent = ''
          if (msg.type === 'text' && msg.text?.body) {
            textContent = msg.text.body
          } else if (msg.type === 'button' && msg.button?.text) {
            textContent = msg.button.text
          } else if (msg.type === 'interactive') {
            textContent = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || 'Interactive response'
          }

          if (textContent) {
            actionableMessages.push({
              messageId,
              from: msg.from,
              name: contactMap.get(msg.from) || null,
              timestamp: msg.timestamp,
              text: textContent,
              phoneNumberId,
              raw: msg,
            })
          }
        }
      }
    }
  }

  if (actionableMessages.length > 0) {
    return { type: 'message', messages: actionableMessages, skippedDuplicates }
  }

  if (isStatusEvent) {
    return { type: 'status', messages: [], skippedDuplicates }
  }

  return { type: 'empty', messages: [], skippedDuplicates }
}
