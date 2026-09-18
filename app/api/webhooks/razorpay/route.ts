import { NextRequest, NextResponse } from 'next/server'
import { processRazorpayWebhookEvent } from '@/lib/billing/service'

export const dynamic = 'force-dynamic'

/**
 * Grovaitech AI Workforce OS
 * app/api/webhooks/razorpay/route.ts
 *
 * Inbound Razorpay Payment Gateway Webhook Endpoint.
 *
 * Security Invariants:
 *   1. Rejects any non-POST methods.
 *   2. Reads the raw unparsed request body for HMAC-SHA256 signature verification.
 *   3. Rejects invalid signatures with HTTP 401 before any database access or business logic.
 *   4. Resolves invoice/order strictly through database-stored gateway_order_id (never trusts payload claims).
 *   5. Idempotent: duplicate webhook events do not duplicate invoice payments or subscriptions.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header.' },
        { status: 400 }
      )
    }

    const result = await processRazorpayWebhookEvent(rawBody, signature)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 400 }
      )
    }

    return NextResponse.json(
      { success: true, received: true, data: result.data },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal webhook processing error.' },
      { status: 500 }
    )
  }
}
