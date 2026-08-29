import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'
import { REAL_ESTATE_TOOLS } from '@/lib/ai/tools'
import { dispatchToolCall, type ToolExecutionResult } from '@/lib/ai/dispatcher'
import { getEmployeeBySlug } from '@/lib/employees'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow } from '@/lib/workflows/executor'
import { createLead } from '@/app/actions/leads'
import { verifyMetaSignature, parseWhatsAppWebhookPayload } from '@/lib/whatsapp/security'
import { sendWhatsAppTextMessage } from '@/lib/whatsapp/client'

export const dynamic = 'force-dynamic'

const MAX_TOOL_ITERATIONS = 3

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

      // C. Build Real Estate Lead Receptionist System Prompt
      const employee = await getEmployeeBySlug('real-estate-lead-receptionist')
      const systemInstruction = employee?.system_prompt || `You are GrovAI, an elite AI Real Estate Lead Receptionist for Grovaitech Real Estate.
Your goal is to warmly assist prospective property buyers, answer questions intelligently, and qualify them for a site visit.

**Core Objectives:**
1. Understand buyer preferences (Property Type, Location, BHK, Budget, Timeline).
2. If any critical info is missing, ask naturally and concisely in 1-2 sentences.
3. When the user wants to see properties or requests a visit (e.g. this weekend / Saturday / Sunday), ask for their name and phone number and use the 'schedule_site_visit' or 'create_lead' tool.
4. Keep answers friendly, highly professional, and helpful.`

      // D. Construct conversation contents for Gemini
      const contents: any[] = []
      for (const turn of history) {
        if (turn.role && turn.content) {
          contents.push({
            role: turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user',
            parts: [{ text: turn.content }],
          })
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: messageText }],
      })

      // E. Autonomous Agent Execution Loop with Tool Calling
      const gemini = new Gemini()
      let iteration = 0
      let aiResponse = ''
      const executedToolResults: ToolExecutionResult[] = []
      let capturedLeadResult: any = null
      let capturedWorkflowResult: any = null

      while (iteration < MAX_TOOL_ITERATIONS) {
        iteration++
        const geminiRes = await gemini.generateContentWithTools({
          contents,
          tools: REAL_ESTATE_TOOLS,
          systemInstruction,
        })

        if (geminiRes.functionCalls && geminiRes.functionCalls.length > 0) {
          for (const fnCall of geminiRes.functionCalls) {
            // Inject verified customer contact info if omitted by the model
            const callArgs = { ...fnCall.args }
            if (!callArgs.phone && !callArgs.patient_phone && customerPhone) {
              callArgs.phone = customerPhone
              callArgs.patient_phone = customerPhone
            }
            if (!callArgs.name && !callArgs.customer_name && !callArgs.patient_name && customerName) {
              callArgs.name = customerName
              callArgs.customer_name = customerName
              callArgs.patient_name = customerName
            }

            const toolResult = await dispatchToolCall(fnCall.name, callArgs)
            executedToolResults.push(toolResult)

            if (toolResult.toolName === 'schedule_site_visit' && toolResult.result) {
              capturedWorkflowResult = toolResult.result.workflowId ? {
                executionId: toolResult.result.workflowId,
                workflowId: 'wf-001',
                workflowName: 'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
                overallStatus: toolResult.result.workflowStatus || 'success',
                steps: toolResult.result.steps || [],
              } : null
              capturedLeadResult = toolResult.result.lead || null
            } else if (toolResult.toolName === 'create_lead' && toolResult.result) {
              capturedLeadResult = toolResult.result.lead || null
            }

            contents.push({
              role: 'model',
              parts: [{ functionCall: fnCall }],
            })
            contents.push({
              role: 'function',
              parts: [
                {
                  functionResponse: {
                    name: fnCall.name,
                    response: toolResult.success ? toolResult.result : { error: toolResult.error },
                  },
                },
              ],
            })
          }
        } else {
          aiResponse = geminiRes.text || ''
          break
        }
      }

      // If loop finished after tool calls without raw text, summarize actions for WhatsApp
      if (!aiResponse && executedToolResults.length > 0) {
        const summaryRes = await gemini.generateText({
          prompt: `You have completed the following actions: ${JSON.stringify(executedToolResults)}. Please provide a polite, natural WhatsApp confirmation response to the customer.`,
          systemInstruction,
        })
        aiResponse = summaryRes.text
      } else if (!aiResponse) {
        aiResponse = "Thank you for reaching out to Grovaitech! How else may I assist you today?"
      }

      // F. Narrow Passive Extractor Fallback (ONLY if NO tool was executed AND lead is genuinely qualified)
      if (executedToolResults.length === 0) {
        try {
          const turnHistory = [
            ...history,
            { role: 'user', content: messageText },
            { role: 'assistant', content: aiResponse },
          ]
          const extractedLead = await extractRealEstateLead(turnHistory)
          // NOTE: Do NOT use customerPhone alone. Only create lead if genuinely qualified or site visit requested.
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
              capturedWorkflowResult = await executeRealEstateWorkflow({
                leadId: saveRes.data.id,
                conversationId: chatId,
                lead: extractedLead,
              })
            }
          }
        } catch (fallbackErr) {
          console.warn('[WhatsApp Webhook] Passive extraction fallback notice:', fallbackErr)
        }
      }

      // G. Log assistant response to database
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

      // H. Dispatch Outbound WhatsApp Reply
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
        toolResults: executedToolResults.length > 0 ? executedToolResults : undefined,
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
