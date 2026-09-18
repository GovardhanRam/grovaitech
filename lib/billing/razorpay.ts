/**
 * Grovaitech AI Workforce OS
 * lib/billing/razorpay.ts
 *
 * Dedicated Server-Only Razorpay Payment Gateway Adapter.
 *
 * Security Invariants:
 *   1. Gateway secrets (RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) are server-only.
 *      They must never be returned to client components or browsers.
 *   2. Webhook verification uses raw body HMAC-SHA256 with timingSafeEqual to prevent timing attacks.
 *   3. All amounts sent to Razorpay are in paise (INR sub-units: 1 INR = 100 paise).
 *   4. Zero external runtime dependencies: uses native Node crypto and Fetch API.
 */

import crypto from 'crypto'

export interface RazorpayOrderPayload {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: string
  attempts: number
  notes: Record<string, string>
  created_at: number
}

export interface RazorpayPaymentPayload {
  id: string
  entity: string
  amount: number
  currency: string
  status: string
  order_id: string
  method: string
  description?: string
  error_code?: string | null
  error_description?: string | null
  created_at: number
}

export interface RazorpayConfig {
  keyId: string
  keySecret: string
  webhookSecret?: string
}

/**
 * Resolves Razorpay credentials from the server environment.
 */
export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '').trim()
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()

  if (!keyId || !keySecret) {
    return null
  }

  return {
    keyId,
    keySecret,
    webhookSecret: webhookSecret || undefined,
  }
}

/**
 * Creates an authorized Basic Auth header for Razorpay API.
 */
function getAuthHeader(config: RazorpayConfig): string {
  const token = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')
  return `Basic ${token}`
}

/**
 * Creates an order on Razorpay.
 */
export async function createRazorpayOrder(params: {
  amount_paise: number
  currency?: string
  receipt: string
  notes?: Record<string, string>
}): Promise<{ success: boolean; data?: RazorpayOrderPayload; error?: string }> {
  const config = getRazorpayConfig()
  if (!config) {
    return {
      success: false,
      error: 'Razorpay credentials not configured (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET required).',
    }
  }

  const endpoint = 'https://api.razorpay.com/v1/orders'
  const body = {
    amount: Math.round(params.amount_paise),
    currency: params.currency || 'INR',
    receipt: params.receipt.slice(0, 40),
    notes: params.notes || {},
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthHeader(config),
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      const errorDetail = data.error?.description || data.error?.message || `HTTP ${res.status}`
      return { success: false, error: `Razorpay order creation failed: ${errorDetail}` }
    }

    return { success: true, data: data as RazorpayOrderPayload }
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to Razorpay: ${err.message || 'Unknown error'}`,
    }
  }
}

/**
 * Fetches an order from Razorpay by Order ID.
 */
export async function getRazorpayOrder(
  orderId: string
): Promise<{ success: boolean; data?: RazorpayOrderPayload; error?: string }> {
  const config = getRazorpayConfig()
  if (!config) {
    return {
      success: false,
      error: 'Razorpay credentials not configured.',
    }
  }

  const endpoint = `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(config),
      },
    })

    const data = await res.json()

    if (!res.ok) {
      const errorDetail = data.error?.description || `HTTP ${res.status}`
      return { success: false, error: `Failed to fetch Razorpay order: ${errorDetail}` }
    }

    return { success: true, data: data as RazorpayOrderPayload }
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to Razorpay: ${err.message || 'Unknown error'}`,
    }
  }
}

/**
 * Fetches all payment transactions associated with a Razorpay order.
 */
export async function getRazorpayOrderPayments(
  orderId: string
): Promise<{ success: boolean; data?: RazorpayPaymentPayload[]; error?: string }> {
  const config = getRazorpayConfig()
  if (!config) {
    return {
      success: false,
      error: 'Razorpay credentials not configured.',
    }
  }

  const endpoint = `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}/payments`

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(config),
      },
    })

    const data = await res.json()

    if (!res.ok) {
      const errorDetail = data.error?.description || `HTTP ${res.status}`
      return { success: false, error: `Failed to fetch payments: ${errorDetail}` }
    }

    const items = Array.isArray(data.items) ? data.items : []
    return { success: true, data: items as RazorpayPaymentPayload[] }
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to Razorpay: ${err.message || 'Unknown error'}`,
    }
  }
}

/**
 * Validates a Razorpay Webhook HMAC-SHA256 signature using constant-time comparison.
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  receivedSignature: string | null,
  overrideSecret?: string
): { isValid: boolean; reason?: string } {
  const secret = overrideSecret || process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret) {
    return {
      isValid: false,
      reason: 'RAZORPAY_WEBHOOK_SECRET is not configured on the server.',
    }
  }

  if (!receivedSignature) {
    return {
      isValid: false,
      reason: 'Missing x-razorpay-signature header.',
    }
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8')
    const receivedBuffer = Buffer.from(receivedSignature, 'utf-8')

    if (expectedBuffer.length !== receivedBuffer.length) {
      return { isValid: false, reason: 'Signature length mismatch.' }
    }

    const isMatch = crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    if (!isMatch) {
      return { isValid: false, reason: 'Signature mismatch.' }
    }

    return { isValid: true }
  } catch (err: any) {
    return { isValid: false, reason: `Signature verification error: ${err.message}` }
  }
}

/**
 * Validates a Razorpay Checkout payment HMAC-SHA256 signature (order_id|payment_id).
 */
export function verifyRazorpayPaymentSignature(params: {
  orderId: string
  paymentId: string
  signature: string
  overrideSecret?: string
}): { isValid: boolean; reason?: string } {
  const secret = params.overrideSecret || process.env.RAZORPAY_KEY_SECRET

  if (!secret) {
    return {
      isValid: false,
      reason: 'RAZORPAY_KEY_SECRET is not configured on the server.',
    }
  }

  if (!params.signature || !params.orderId || !params.paymentId) {
    return {
      isValid: false,
      reason: 'Missing payment signature verification parameters.',
    }
  }

  try {
    const payload = `${params.orderId}|${params.paymentId}`
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8')
    const receivedBuffer = Buffer.from(params.signature, 'utf-8')

    if (expectedBuffer.length !== receivedBuffer.length) {
      return { isValid: false, reason: 'Signature length mismatch.' }
    }

    const isMatch = crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    if (!isMatch) {
      return { isValid: false, reason: 'Signature mismatch.' }
    }

    return { isValid: true }
  } catch (err: any) {
    return { isValid: false, reason: `Payment signature verification error: ${err.message}` }
  }
}

