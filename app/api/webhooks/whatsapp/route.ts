import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { generateResponse } from '@/lib/gemini/client'
import { getEmployeeBySlug } from '@/lib/employees'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow } from '@/lib/workflows/executor'
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
      // Delivery status update (sent, delivered, read) — acknowledge cleanly
      return NextResponse.json({ status: 'STATUS_ACKNOWLEDGED' }, { status: 200 })
    }

    if (type === 'empty' || messages.length === 0) {
      return NextResponse.json({ status: 'NO_ACTIONABLE_MESSAGES', skippedDuplicates }, { status: 200 })
    }

    const supabase = await createServerClient()
    const results = []

    // 4. Process each actionable customer message through the Grovaitech AI pipeline
    for (const inbound of messages) {
      const { from: customerPhone, name: customerName, text: messageText, messageId } = inbound
      const chatId = `whatsapp_${customerPhone}`

      console.log(`[WhatsApp Webhook] Processing message from ${customerPhone} (${customerName || 'Unknown'}): "${messageText.slice(0, 50)}"`)

      // A. Log user message to Supabase
      try {
        await supabase
          .from('messages')
          .insert({
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

      const historyContext = history.length > 0
        ? history.map((h) => `${h.role === 'user' ? 'Customer' : 'AI Receptionist'}: ${h.content}`).join('\n')
        : ''

      // C. Build Real Estate Lead Receptionist System Prompt
      const employee = await getEmployeeBySlug('real-estate-lead-receptionist')
      const personaInstructions = employee?.system_prompt || `You are GrovAI, an elite AI Real Estate Lead Receptionist for Grovaitech Real Estate.
Your goal is to warmly assist prospective property buyers, answer questions intelligently, and qualify them for a site visit.`

      const systemPrompt = `
${personaInstructions}

${historyContext}
Customer: ${messageText}
AI Receptionist:`

      // D. Generate Conversational AI Response (Gemini 3.7 Flash with fallback)
      const aiResponse = await generateResponse(systemPrompt)

      // E. Log assistant response to database
      try {
        await supabase
          .from('messages')
          .insert({
            chat_id: chatId,
            role: 'assistant',
            content: aiResponse,
          })
      } catch (aiLogErr) {
        console.warn('[WhatsApp Webhook] Assistant log notice:', aiLogErr)
      }

      // F. Structured Lead Extraction
      const turnHistory = [
        ...history,
        { role: 'user', content: messageText },
        { role: 'assistant', content: aiResponse },
      ]

      const extractedLead = await extractRealEstateLead(turnHistory)

      // G. Persist lead to Supabase & Trigger wf-001 if qualified
      let savedLead = null
      let workflowExec = null

      if (extractedLead.qualification_status === 'qualified' || extractedLead.site_visit_requested || customerPhone) {
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
          savedLead = saveRes.data
          workflowExec = await executeRealEstateWorkflow({
            leadId: savedLead.id,
            conversationId: chatId,
            lead: extractedLead,
          })
        }
      }

      // H. Dispatch Outbound WhatsApp Reply
      const outboundResult = await sendWhatsAppTextMessage({
        to: customerPhone,
        text: aiResponse,
        replyToMessageId: messageId,
      })

      results.push({
        messageId,
        from: customerPhone,
        lead: extractedLead,
        leadSaved: !!savedLead,
        workflow: workflowExec?.workflowId || null,
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
    // Always return 200 to Meta to prevent retry loops on internal handling errors
    return NextResponse.json(
      { status: 'ERROR_HANDLED', message: err.message || String(err) },
      { status: 200 }
    )
  }
}
