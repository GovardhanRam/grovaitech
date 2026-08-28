import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'
import { getEmployeeBySlug } from '@/lib/employees'
import {
  REAL_ESTATE_TOOLS,
  CLINIC_TOOLS,
  ALL_GROVAITECH_TOOLS,
  type GeminiFunctionDeclaration,
} from '@/lib/ai/tools'
import { dispatchToolCall, type ToolExecutionResult } from '@/lib/ai/dispatcher'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow } from '@/lib/workflows/executor'
import { createLead } from '@/app/actions/leads'

const MAX_TOOL_ITERATIONS = 3

export async function POST(request: NextRequest) {
  console.log('=== API CHAT CALLED (Phase 3A Runtime) ===')

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

    console.log('[Chat API] Inbound Message:', message, '| Employee Slug:', employeeSlug, '| User:', user?.email || 'Guest Demo User')

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
        console.warn('Chat record creation notice (using generated ID):', chatError.message)
        currentChatId = `chat-session-${Date.now()}`
      } else {
        currentChatId = chat.id
      }
    }

    // 3. Persist incoming user message to database
    try {
      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          role: 'user',
          content: message,
        })
    } catch (msgErr) {
      console.warn('Message log notice:', msgErr)
    }

    // 4. Select Employee Persona System Prompt & Employee-specific Toolset
    let systemInstruction = `You are GrovAI, an elite AI Lead Receptionist for Grovaitech.
Your goal is to warmly assist prospective customers, qualify their requirements, answer questions intelligently, and use tools when appropriate to schedule visits, book appointments, or create CRM leads.

**Guidelines:**
1. If the user provides sufficient information to book a visit or appointment, invoke the appropriate tool.
2. If any critical info is missing, ask naturally and concisely in 1-2 sentences.
3. Keep responses friendly, highly professional, and helpful.`

    let activeTools: GeminiFunctionDeclaration[] = ALL_GROVAITECH_TOOLS

    if (employeeSlug.includes('real-estate')) {
      activeTools = REAL_ESTATE_TOOLS
      systemInstruction = `You are GrovAI, an elite AI Real Estate Lead Receptionist for Grovaitech Real Estate.
Your goal is to warmly assist prospective property buyers, answer questions intelligently, and qualify them for a site visit.

**Core Objectives:**
1. Understand buyer preferences (Property Type, Location, BHK, Budget, Timeline).
2. If any critical info is missing, ask naturally and concisely in 1-2 sentences.
3. When the user wants to see properties or requests a visit (e.g. this weekend / Saturday / Sunday), ask for their name and phone number and use the 'schedule_site_visit' or 'create_lead' tool.
4. Keep answers friendly, highly professional, and helpful.`
    } else if (
      employeeSlug.includes('clinic') ||
      employeeSlug.includes('medical') ||
      employeeSlug.includes('doctor')
    ) {
      activeTools = CLINIC_TOOLS
      systemInstruction = `You are GrovAI, an elite Medical & Dental Clinic AI Front-Desk Receptionist.
Your goal is to assist patients, answer inquiries regarding clinic hours/doctors, and book appointments using the 'book_clinic_appointment' tool.

**Clinic Information:**
- Hours: Mon - Sat: 9:00 AM - 6:00 PM (Closed Sundays)
- Doctors: Dr. Verma (General Dentistry), Dr. Reddy (Orthodontics)
- When patient provides name, phone, date, and time, invoke the 'book_clinic_appointment' tool.`
    }

    // Check custom employee system prompt from registry if available
    if (employeeSlug) {
      try {
        const employee = await getEmployeeBySlug(employeeSlug)
        if (employee?.system_prompt) {
          systemInstruction = employee.system_prompt
        }
      } catch (empErr) {
        console.warn('Employee registry lookup notice:', empErr)
      }
    }

    // 5. Construct conversation contents for Gemini
    const contents: any[] = []

    if (history && Array.isArray(history) && history.length > 0) {
      for (const turn of history) {
        if (turn.role && turn.content) {
          contents.push({
            role: turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user',
            parts: [{ text: turn.content }],
          })
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    })

    // 6. Autonomous Agent Execution Loop with Tool Calling
    const gemini = new Gemini()
    let iteration = 0
    let aiFinalText = ''
    const executedToolResults: ToolExecutionResult[] = []
    let capturedWorkflowResult: any = null
    let capturedLeadResult: any = null

    console.log(`[Chat Runtime] Initiating agent execution loop (Active Tools: ${activeTools.map(t => t.name).join(', ')})`)

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++

      const geminiRes = await gemini.generateContentWithTools({
        contents,
        tools: activeTools,
        systemInstruction,
      })

      // If Gemini requested structured function calls
      if (geminiRes.functionCalls && geminiRes.functionCalls.length > 0) {
        console.log(`[Chat Runtime] Turn ${iteration}: Gemini requested ${geminiRes.functionCalls.length} tool call(s):`, geminiRes.functionCalls.map(f => f.name))

        for (const fnCall of geminiRes.functionCalls) {
          // Route every tool call through the safe dispatcher
          const toolResult = await dispatchToolCall(fnCall.name, fnCall.args)
          executedToolResults.push(toolResult)

          // Capture workflow and lead references for UI state compatibility
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

          // Append model function call and function response into conversation turns
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
        // Model provided conversational text response
        aiFinalText = geminiRes.text || ''
        break
      }
    }

    // If loop concluded without raw text, generate a natural wrap-up summary
    if (!aiFinalText && executedToolResults.length > 0) {
      const summaryRes = await gemini.generateText({
        prompt: `You have completed the following actions: ${JSON.stringify(executedToolResults)}. Please provide a polite, natural confirmation response to the customer.`,
        systemInstruction,
      })
      aiFinalText = summaryRes.text
    } else if (!aiFinalText) {
      // Fallback
      aiFinalText = "Thank you for reaching out! How else may I assist you today?"
    }

    // 7. Backward-compatible Vertical Slice fallback if no tool triggered on real estate inquiry
    if (employeeSlug === 'real-estate-lead-receptionist' && executedToolResults.length === 0) {
      try {
        const turnHistory = [
          ...(history || []),
          { role: 'user', content: message },
          { role: 'assistant', content: aiFinalText },
        ]

        const extractedLead = await extractRealEstateLead(turnHistory)
        if (extractedLead.qualification_status === 'qualified' || extractedLead.phone || extractedLead.site_visit_requested) {
          capturedLeadResult = extractedLead
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
            capturedLeadResult = saveRes.data
            capturedWorkflowResult = await executeRealEstateWorkflow({
              leadId: saveRes.data.id,
              conversationId: currentChatId,
              lead: extractedLead,
            })
          }
        }
      } catch (fallbackErr) {
        console.warn('[Chat Runtime] Passive extraction notice:', fallbackErr)
      }
    }

    // 8. Persist assistant message to database
    try {
      await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          role: 'assistant',
          content: aiFinalText,
        })
    } catch (aiMsgErr) {
      console.warn('Assistant message log notice:', aiMsgErr)
    }

    // 9. Return structured response to frontend
    return NextResponse.json({
      message: aiFinalText,
      chatId: currentChatId,
      toolResults: executedToolResults.length > 0 ? executedToolResults : undefined,
      lead: capturedLeadResult,
      workflow: capturedWorkflowResult,
    })
  } catch (error: any) {
    console.error('[API Chat Exception]', error)
    return NextResponse.json(
      { error: error?.message || String(error) },
      { status: 500 }
    )
  }
}
