import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { executeLiveDeploymentTurn, resolveDeploymentByPhoneNumberId } from '@/lib/deployment/live-executor'
import { verifyMetaSignature, parseWhatsAppWebhookPayload } from '@/lib/whatsapp/security'
import { dispatchTenantWhatsAppTextMessage } from '@/lib/integrations/whatsapp-adapter'

export const dynamic = 'force-dynamic'

/**
 * Meta WhatsApp Webhook Verification Handshake (GET)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken = (process.env.WHATSAPP_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || '').trim()

  console.log('[WhatsApp Webhook Handshake]', { mode, hasToken: !!token, hasChallenge: !!challenge })

  // Fail closed if server has no verify token configured
  if (!expectedToken) {
    console.error('[WhatsApp Webhook] Verification rejected: No WHATSAPP_VERIFY_TOKEN or META_VERIFY_TOKEN configured in server environment.')
    return new Response('Forbidden', { status: 403 })
  }

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] Verification successful. Returning challenge.')
    return new Response(challenge || '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    })
  }

  console.warn('[WhatsApp Webhook] Verification failed. Token mismatch or invalid mode.')
  return new Response('Forbidden', { status: 403 })
}

/**
 * Inbound WhatsApp Message Ingestion (POST)
 * Verifies HMAC-SHA256 signature, resolves Meta phoneNumberId to active ClientDeployment,
 * routes message to executeLiveDeploymentTurn(), and returns outbound reply.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signatureHeader = request.headers.get('x-hub-signature-256')

    // 1. Validate Meta HMAC-SHA256 Signature (if META_APP_SECRET configured)
    const sigCheck = verifyMetaSignature(rawBody, signatureHeader)
    if (!sigCheck.isValid) {
      console.error('[WhatsApp Webhook] Signature verification failed:', sigCheck.reason)
      return NextResponse.json({ error: 'Invalid signature', reason: sigCheck.reason }, { status: 401 })
    }

    // 2. Parse JSON payload
    let body: any = null
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // 3. Extract actionable messages and filter out delivery receipts / duplicates
    const { type, messages, skippedDuplicates } = parseWhatsAppWebhookPayload(body)

    if (type === 'status') {
      return NextResponse.json({ status: 'STATUS_ACKNOWLEDGED' }, { status: 200 })
    }

    if (type === 'empty' || messages.length === 0) {
      return NextResponse.json({ status: 'NO_ACTIONABLE_MESSAGES', skippedDuplicates }, { status: 200 })
    }

    const supabase = await createServerClient()
    const results = []

    // 4. Process each actionable customer message through the Live Deployment Runtime
    for (const inbound of messages) {
      const { from: customerPhone, name: customerName, text: messageText, messageId, phoneNumberId } = inbound

      // A. Exact Channel Binding Resolution: Resolve Meta phone_number_id to active ClientDeployment
      const deployment = await resolveDeploymentByPhoneNumberId(phoneNumberId)

      if (!deployment) {
        console.warn(
          `[WhatsApp Webhook] Unbound or inactive channel: phoneNumberId "${phoneNumberId}" has no active deployment. Skipping execution.`
        )
        results.push({
          messageId,
          phoneNumberId,
          status: 'UNBOUND_CHANNEL_ACKNOWLEDGED',
        })
        continue
      }

      // B. Tenant-Scoped Conversation Identity: Isolates chat history by deployment + customer phone
      const chatId = `whatsapp_${deployment.id}_${customerPhone}`

      console.log(
        `[WhatsApp Webhook] Processing message for Deployment ${deployment.id} (${deployment.company_name}) from ${customerPhone}: "${messageText.slice(0, 50)}"`
      )

      // C. Log incoming user message to Supabase (tenant-scoped)
      try {
        await supabase.from('messages').insert({
          chat_id: chatId,
          role: 'user',
          content: messageText,
        })
      } catch (logErr) {
        console.warn('[WhatsApp Webhook] Message log notice:', logErr)
      }

      // D. Fetch tenant-isolated conversation history
      let history: { role: 'user' | 'assistant' | 'system'; content: string }[] = []
      try {
        const { data: pastMessages } = await supabase
          .from('messages')
          .select('role, content')
          .eq('chat_id', chatId)
          .order('created_at', { ascending: true })
          .limit(8)

        if (pastMessages && pastMessages.length > 0) {
          history = pastMessages.map((m: any) => ({
            role: m.role,
            content: m.content,
          }))
        }
      } catch {
        history = []
      }

      // E. Delegate to Live Deployment Runtime Runner (Server-Controlled Security Boundary)
      const turnResult = await executeLiveDeploymentTurn({
        deploymentId: deployment.id,
        message: messageText,
        history,
        customerContext: {
          phone: customerPhone,
          name: customerName || undefined,
        },
        channel: 'whatsapp',
      })

      if (!turnResult.success && turnResult.error) {
        throw new Error(turnResult.error)
      }

      const aiResponse = turnResult.replyText

      // F. Log assistant response to database (tenant-scoped)
      if (aiResponse) {
        try {
          await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'assistant',
            content: aiResponse,
          })
        } catch (aiLogErr) {
          console.warn('[WhatsApp Webhook] Assistant log notice:', aiLogErr)
        }
      }

      // G. Dispatch Tenant-Safe Outbound WhatsApp Reply (E1/E2 safety plane)
      const executionMode = process.env.ENABLE_LIVE_EXTERNAL_ADAPTERS === 'true' ? 'live' : 'sandbox'
      const outboundResult = await dispatchTenantWhatsAppTextMessage({
        clientId: deployment.client_id,
        deploymentId: deployment.id,
        to: customerPhone,
        text: aiResponse || 'Thank you for reaching out. We have received your message.',
        inboundMessageId: messageId,
        replyToMessageId: messageId,
        fromPhoneNumberId: phoneNumberId,
        deployment,
        executionMode,
      })

      results.push({
        messageId,
        deploymentId: deployment.id,
        clientId: deployment.client_id,
        from: customerPhone,
        lead: turnResult.leadResult || null,
        leadSaved: !!turnResult.leadResult,
        workflow: turnResult.workflowResult?.workflowId || null,
        toolResults: turnResult.executedTools.length > 0 ? turnResult.executedTools : undefined,
        outbound: outboundResult.status,
      })
    }

    return NextResponse.json({
      status: 'EVENT_PROCESSED',
      processedCount: results.length,
      results,
    })
  } catch (err: any) {
    console.error('[WhatsApp Webhook Error]', err)
    return NextResponse.json(
      { status: 'ERROR_HANDLED', message: err.message || String(err) },
      { status: 200 }
    )
  }
}
