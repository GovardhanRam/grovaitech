/**
 * Grovaitech AI Platform
 * app/api/chats/route.ts
 *
 * Web Chat Ingress Route Handler.
 * Authenticates user session, manages conversation persistence in Supabase,
 * and delegates agent execution to the unified headless runtime (lib/ai/runtime.ts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { runAgentTurn } from '@/lib/ai/runtime'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow, getSiteVisitCustomerMessage } from '@/lib/workflows/executor'
import { createLead } from '@/app/actions/leads'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // 1. Authenticate user or fallback to guest session
    let user: any = null
    try {
      const { data: authData } = await supabase.auth.getUser()
      user = authData?.user || null
    } catch {
      user = null
    }

    const body = await request.json()
    const { message, chatId, history } = body
    const employeeSlug = body.employeeSlug || body.slug || 'real-estate-lead-receptionist'

    // 2. Resolve or create chat conversation session
    let currentChatId = chatId
    if (!currentChatId) {
      const chatPayload: any = {
        title: message ? message.slice(0, 50) : 'Customer Inquiry',
      }
      if (user?.id) {
        chatPayload.user_id = user.id
      }

      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert(chatPayload)
        .select()
        .single()

      if (chatError) {
        console.warn('[Chat API] Chat creation notice:', chatError.message)
        currentChatId = `chat-session-${Date.now()}`
      } else {
        currentChatId = chat.id
      }
    }

    // 3. Persist incoming user message to database
    try {
      await supabase.from('messages').insert({
        chat_id: currentChatId,
        role: 'user',
        content: message,
      })
    } catch (msgErr) {
      console.warn('[Chat API] User message log notice:', msgErr)
    }

    // 4. Delegate to Unified Headless Agent Runtime
    const turnResult = await runAgentTurn({
      employeeSlug,
      message,
      history,
      channel: 'web_chat',
      customerContext: {
        userId: user?.id,
      },
    })

    let finalText = turnResult.replyText
    let capturedLead = turnResult.leadResult
    let capturedWorkflow = turnResult.workflowResult

    // 5. Vertical Safety Net: Real Estate Passive Extraction Fallback (when 0 tools executed)
    if (employeeSlug === 'real-estate-lead-receptionist' && turnResult.executedTools.length === 0) {
      try {
        const turnHistory = [
          ...(history || []),
          { role: 'user', content: message },
          { role: 'assistant', content: finalText },
        ]

        const extractedLead = await extractRealEstateLead(turnHistory)
        if (
          extractedLead.qualification_status === 'qualified' ||
          extractedLead.phone ||
          extractedLead.site_visit_requested
        ) {
          const leadRecord = {
            name: extractedLead.name || 'Interested Buyer',
            phone: extractedLead.phone || '+91 Unverified',
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
            notes: `Extracted by Real Estate Lead Receptionist. Score: ${extractedLead.qualification_score}/100.`,
            source: 'ai_demo' as const,
            user_id: user?.id || null,
          }

          const saveRes = await createLead(leadRecord)
          if (saveRes.success && saveRes.data) {
            capturedLead = saveRes.data
            const wfRes = await executeRealEstateWorkflow({
              leadId: saveRes.data.id,
              conversationId: currentChatId,
              lead: extractedLead,
            })
            capturedWorkflow = wfRes
            if (!wfRes.customerConfirmationAllowed) {
              finalText = getSiteVisitCustomerMessage(wfRes)
            }
          }
        }
      } catch (fallbackErr) {
        console.warn('[Chat API] Passive extraction fallback notice:', fallbackErr)
      }
    }

    // 6. Persist assistant message to database
    try {
      await supabase.from('messages').insert({
        chat_id: currentChatId,
        role: 'assistant',
        content: finalText,
      })
    } catch (aiMsgErr) {
      console.warn('[Chat API] Assistant message log notice:', aiMsgErr)
    }

    // 7. Return structured response to frontend
    return NextResponse.json({
      message: finalText,
      chatId: currentChatId,
      toolResults: turnResult.executedTools.length > 0 ? turnResult.executedTools : undefined,
      lead: capturedLead,
      workflow: capturedWorkflow,
    })
  } catch (error: any) {
    console.error('[API Chat Exception]', error)
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    )
  }
}
