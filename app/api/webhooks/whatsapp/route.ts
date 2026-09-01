import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runAgentTurn } from '@/lib/ai/runtime'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow, getSiteVisitCustomerMessage } from '@/lib/workflows/executor'
import { createLead } from '@/app/actions/leads'
import { verifyMetaSignature, parseWhatsAppWebhookPayload } from '@/lib/whatsapp/security'
import { sendWhatsAppTextMessage } from '@/lib/whatsapp/client'

export const dynamic = 'force-dynamic'

/**
 * Meta WhatsApp Webhook Verification Handshake (GET)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN ||
    process.env.META_VERIFY_TOKEN ||
    'grovaitech_whatsapp_verify_token_2026'

  console.log('[WhatsApp Webhook Handshake]', { mode, hasToken: !!token, hasChallenge: !!challenge })

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

    // 4. Process each actionable customer message through the Unified Agent Runtime
    for (const inbound of messages) {
      const { from: customerPhone, name: customerName, text: messageText, messageId } = inbound
      const chatId = `whatsapp_${customerPhone}`

      console.log(
        `[WhatsApp Webhook] Processing message from ${customerPhone} (${customerName || 'Unknown'}): "${messageText.slice(0, 50)}"`
      )

      // A. Log user message to Supabase
      try {
        await supabase.from('messages').insert({
          chat_id: chatId,
          role: 'user',
          content: messageText,
        })
      } catch (logErr) {
        console.warn('[WhatsApp Webhook] Message log notice:', logErr)
      }

      // B. Fetch conversation history for context
      let history: { role: string; content: string }[] = []
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

      // C. Delegate reasoning and tool execution to Unified Agent Runtime
      const turnResult = await runAgentTurn({
        employeeSlug: 'real-estate-lead-receptionist',
        message: messageText,
        history: history as any,
        channel: 'whatsapp',
        customerContext: {
          phone: customerPhone,
          name: customerName,
        },
      })

      let aiResponse = turnResult.replyText
      let capturedLeadResult = turnResult.leadResult
      let capturedWorkflowResult = turnResult.workflowResult

      // D. Vertical Safety Net: Passive Extractor Fallback (ONLY if NO tool was executed on qualified lead)
      if (turnResult.executedTools.length === 0) {
        try {
          const turnHistory = [
            ...history,
            { role: 'user', content: messageText },
            { role: 'assistant', content: aiResponse },
          ]
          const extractedLead = await extractRealEstateLead(turnHistory)
          if (extractedLead.qualification_status === 'qualified' || extractedLead.site_visit_requested) {
            const leadRecord = {
              name: extractedLead.name || customerName || 'WhatsApp Customer',
              phone: customerPhone,
              email: extractedLead.email || undefined,
              property_type: extractedLead.property_type || 'villa',
              location: extractedLead.location || 'Tirupati',
              budget: extractedLead.budget || '1.2 Cr',
              timeline: extractedLead.timeline || 'Immediate',
              site_visit_requested: extractedLead.site_visit_requested,
              site_visit_date: extractedLead.site_visit_date || undefined,
              site_visit_time: extractedLead.site_visit_time || undefined,
              lead_score: (extractedLead.site_visit_requested ? 'hot' : 'warm') as any,
              lead_status: (extractedLead.site_visit_requested ? 'site_visit' : 'qualified') as any,
              notes: `Inbound WhatsApp lead qualified by AI Receptionist. Message ID: ${messageId}. Score: ${extractedLead.qualification_score}/100.`,
              source: 'whatsapp' as const,
            }
            const saveRes = await createLead(leadRecord)
            if (saveRes.success && saveRes.data) {
              capturedLeadResult = saveRes.data
              const wfRes = await executeRealEstateWorkflow({
                leadId: saveRes.data.id,
                conversationId: chatId,
                lead: extractedLead,
              })
              capturedWorkflowResult = wfRes
              if (!wfRes.customerConfirmationAllowed) {
                aiResponse = getSiteVisitCustomerMessage(wfRes)
              }
            }
          }
        } catch (fallbackErr) {
          console.warn('[WhatsApp Webhook] Passive extraction fallback notice:', fallbackErr)
        }
      }

      // E. Log assistant response to database
      try {
        await supabase.from('messages').insert({
          chat_id: chatId,
          role: 'assistant',
          content: aiResponse,
        })
      } catch (aiLogErr) {
        console.warn('[WhatsApp Webhook] Assistant log notice:', aiLogErr)
      }

      // F. Dispatch Outbound WhatsApp Reply
      const outboundResult = await sendWhatsAppTextMessage({
        to: customerPhone,
        text: aiResponse,
        replyToMessageId: messageId,
      })

      results.push({
        messageId,
        from: customerPhone,
        lead: capturedLeadResult,
        leadSaved: !!capturedLeadResult,
        workflow: capturedWorkflowResult?.workflowId || capturedWorkflowResult?.executionId || null,
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
