/**
 * Grovaitech AI Platform
 * app/api/chats/route.ts
 *
 * Web Chat Ingress Route Handler.
 * Authenticates user session, manages conversation persistence in Supabase,
 * and delegates agent execution to the unified headless runtime (lib/ai/runtime.ts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { runAgentTurn, resolveAuthorizedTools } from '@/lib/ai/runtime'
import { getCanonicalEmployeeBySlug } from '@/lib/employees/registry'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow, getSiteVisitCustomerMessage } from '@/lib/workflows/executor'
import { createLead } from '@/app/actions/leads'
import type { ClientDeployment } from '@/lib/deployment/types'

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
    const rawDeploymentId = typeof body.deploymentId === 'string' ? body.deploymentId.trim() : null

    // 2. Resolve deployment securely if deploymentId is provided
    let deploymentRecord: ClientDeployment | null = null
    let effectiveEmployeeSlug = body.employeeSlug || body.slug || 'real-estate-lead-receptionist'
    let systemInstruction: string | undefined = undefined
    let authorizedTools: any[] | undefined = undefined
    let executionMode: 'sandbox' | 'live' = 'sandbox'

    if (rawDeploymentId) {
      const adminSupabase = await createAdminClient()
      const { data: depData, error: depError } = await adminSupabase
        .from('client_deployments')
        .select('*')
        .eq('id', rawDeploymentId)
        .single()

      if (depError || !depData) {
        return NextResponse.json(
          { error: `Deployment with ID "${rawDeploymentId}" was not found.` },
          { status: 404 }
        )
      }

      const foundDeployment = depData as ClientDeployment
      if (foundDeployment.status !== 'active') {
        return NextResponse.json(
          {
            error: `Authorization Error: Deployment "${rawDeploymentId}" is in status "${foundDeployment.status}" and cannot execute live turns. Must be "active".`,
          },
          { status: 403 }
        )
      }

      deploymentRecord = foundDeployment
      effectiveEmployeeSlug = deploymentRecord.assigned_employee_slug
      executionMode = 'live'

      // Compose persona: Canonical master prompt + client-specific runtime instructions
      const canonicalEmployee = getCanonicalEmployeeBySlug(effectiveEmployeeSlug)
      const clientInstruction = deploymentRecord.runtime_config?.system_context_instruction || ''
      if (canonicalEmployee) {
        systemInstruction = clientInstruction
          ? `${canonicalEmployee.system_prompt}\n\n${clientInstruction}`
          : canonicalEmployee.system_prompt
      }

      // Restrict live tools to safe allowlist: create_lead, search_knowledge_base
      const canonicalTools = resolveAuthorizedTools(effectiveEmployeeSlug)
      const LIVE_EXECUTION_TOOL_ALLOWLIST = new Set(['create_lead', 'search_knowledge_base'])
      authorizedTools = canonicalTools.filter((t) => LIVE_EXECUTION_TOOL_ALLOWLIST.has(t.name))
    }

    // 3. Resolve or create chat conversation session
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

    // 4. Persist incoming user message to database
    try {
      await supabase.from('messages').insert({
        chat_id: currentChatId,
        role: 'user',
        content: message,
      })
    } catch (msgErr) {
      console.warn('[Chat API] User message log notice:', msgErr)
    }

    // 5. Delegate to Unified Headless Agent Runtime with authoritative server context
    const customerContext: any = {
      userId: user?.id || null,
    }
    if (deploymentRecord) {
      customerContext.clientId = deploymentRecord.client_id
      customerContext.deploymentId = deploymentRecord.id
    }

    const turnResult = await runAgentTurn({
      employeeSlug: effectiveEmployeeSlug,
      message,
      history,
      channel: 'web_chat',
      customerContext,
      systemInstruction,
      tools: authorizedTools,
      executionMode,
    })

    let finalText = turnResult.replyText
    let capturedLead = turnResult.leadResult
    let capturedWorkflow = turnResult.workflowResult

    // 6. Vertical Safety Net: Real Estate Passive Extraction Fallback (when 0 tools executed)
    if (effectiveEmployeeSlug === 'real-estate-lead-receptionist' && turnResult.executedTools.length === 0) {
      try {
        const turnHistory = [
          ...(history || []),
          { role: 'user', content: message },
          { role: 'assistant', content: finalText },
        ]

        const extractedLead = await extractRealEstateLead(turnHistory)
        if (
          extractedLead &&
          (extractedLead.qualification_status === 'qualified' ||
            extractedLead.phone ||
            extractedLead.site_visit_requested)
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
            client_id: deploymentRecord?.client_id || undefined,
            deployment_id: deploymentRecord?.id || undefined,
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

    // 7. Persist assistant message to database
    try {
      await supabase.from('messages').insert({
        chat_id: currentChatId,
        role: 'assistant',
        content: finalText,
      })
    } catch (aiMsgErr) {
      console.warn('[Chat API] Assistant message log notice:', aiMsgErr)
    }

    // 8. Return structured response to frontend
    return NextResponse.json({
      message: finalText,
      chatId: currentChatId,
      deploymentId: deploymentRecord?.id || undefined,
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
