/**
 * Grovaitech AI Platform
 * lib/ai/runtime.ts
 *
 * Unified Headless Agent Runtime Controller.
 * Server-only execution engine for multi-turn Gemini reasoning, dynamic prompt resolution,
 * tool calling, context injection, and truthfulness guardrail enforcement.
 */

import { Gemini } from '@/lib/ai/gemini'
import {
  REAL_ESTATE_TOOLS,
  CLINIC_TOOLS,
  ALL_GROVAITECH_TOOLS,
  type GeminiFunctionDeclaration,
} from '@/lib/ai/tools'
import { dispatchToolCall, type ToolExecutionResult } from '@/lib/ai/dispatcher'
import { getEmployeeBySlug } from '@/lib/employees'
import {
  getSiteVisitCustomerMessage,
  getClinicCustomerMessage,
  type WorkflowExecutionResult,
  type PatientAppointmentData,
} from '@/lib/workflows/executor'
import type { LeadData } from '@/app/actions/leads'

const DEFAULT_MAX_ITERATIONS = 3

// ─── Runtime Types ──────────────────────────────────────────────────────────

export interface CustomerContext {
  name?: string | null
  phone?: string | null
  email?: string | null
  userId?: string | null
}

export interface ConversationTurn {
  role: 'user' | 'assistant' | 'model' | 'system'
  content: string
}

export interface RunAgentTurnOptions {
  employeeSlug?: string
  message: string
  history?: ConversationTurn[]
  channel?: 'web_chat' | 'whatsapp' | 'api'
  customerContext?: CustomerContext
  systemInstruction?: string
  tools?: GeminiFunctionDeclaration[]
  maxIterations?: number
  onToolExecuted?: (result: ToolExecutionResult) => void
}

export interface AgentTurnResult {
  replyText: string
  executedTools: ToolExecutionResult[]
  workflowResult: WorkflowExecutionResult | null
  leadResult: Partial<LeadData> | null
  bookingResult: Partial<PatientAppointmentData> | null
  iterations: number
  hasSimulatedWorkflow: boolean
}

// ─── Persona & Tool Authorization Resolution ────────────────────────────────

export function resolveAuthorizedTools(slug?: string): GeminiFunctionDeclaration[] {
  const normalized = (slug || '').toLowerCase()
  if (normalized.includes('real-estate')) {
    return REAL_ESTATE_TOOLS
  }
  if (normalized.includes('clinic') || normalized.includes('medical') || normalized.includes('doctor')) {
    return CLINIC_TOOLS
  }
  return ALL_GROVAITECH_TOOLS
}

export function getDefaultSystemPrompt(slug?: string): string {
  const normalized = (slug || '').toLowerCase()

  if (normalized.includes('real-estate')) {
    return `You are GrovAI, an elite AI Real Estate Lead Receptionist for Grovaitech Real Estate.
Your goal is to warmly assist prospective property buyers, answer questions intelligently, and qualify them for a site visit.

**Core Objectives:**
1. Understand buyer preferences (Property Type, Location, BHK, Budget, Timeline).
2. If any critical info is missing, ask naturally and concisely in 1-2 sentences.
3. When the user wants to see properties or requests a visit (e.g. this weekend / Saturday / Sunday), ask for their name and phone number and use the 'schedule_site_visit' or 'create_lead' tool.
4. Keep answers friendly, highly professional, and helpful.`
  }

  if (normalized.includes('clinic') || normalized.includes('medical') || normalized.includes('doctor')) {
    return `You are GrovAI, an elite Medical & Dental Clinic AI Front-Desk Receptionist.
Your goal is to assist patients, answer inquiries regarding clinic hours/doctors, and book appointments using the 'book_clinic_appointment' tool.

**Clinic Information:**
- Hours: Mon - Sat: 9:00 AM - 6:00 PM (Closed Sundays)
- Doctors: Dr. Verma (General Dentistry), Dr. Reddy (Orthodontics)
- When patient provides name, phone, date, and time, invoke the 'book_clinic_appointment' tool.`
  }

  return `You are GrovAI, an elite AI Lead Receptionist for Grovaitech.
Your goal is to warmly assist prospective customers, qualify their requirements, answer questions intelligently, and use tools when appropriate to schedule visits, book appointments, or create CRM leads.

**Guidelines:**
1. If the user provides sufficient information to book a visit or appointment, invoke the appropriate tool.
2. If any critical info is missing, ask naturally and concisely in 1-2 sentences.
3. Keep responses friendly, highly professional, and helpful.`
}

// ─── Main Runtime Entry Point ───────────────────────────────────────────────

/**
 * Executes a single multi-turn agent reasoning turn for any channel or employee.
 */
export async function runAgentTurn(options: RunAgentTurnOptions): Promise<AgentTurnResult> {
  const {
    employeeSlug = 'real-estate-lead-receptionist',
    message,
    history = [],
    customerContext = {},
    maxIterations = DEFAULT_MAX_ITERATIONS,
    onToolExecuted,
  } = options

  // 1. Resolve authorized toolset (Caller tools can ONLY narrow, never expand authorized tools)
  const authorizedTools = resolveAuthorizedTools(employeeSlug)
  let activeTools = authorizedTools
  if (options.tools && Array.isArray(options.tools)) {
    const authorizedNames = new Set(authorizedTools.map((t) => t.name))
    activeTools = options.tools.filter((t) => authorizedNames.has(t.name))
  }

  // 2. Resolve system prompt (Default -> Custom DB registry -> Explicit caller override)
  let systemInstruction = getDefaultSystemPrompt(employeeSlug)
  if (employeeSlug) {
    try {
      const employee = await getEmployeeBySlug(employeeSlug)
      if (employee?.system_prompt) {
        systemInstruction = employee.system_prompt
      }
    } catch (empErr) {
      console.warn('[Agent Runtime] Employee registry lookup notice:', empErr)
    }
  }
  if (options.systemInstruction) {
    systemInstruction = options.systemInstruction
  }

  // 3. Build contents array for Gemini
  const contents: Array<{
    role: 'user' | 'model' | 'function' | 'system'
    parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>
  }> = []

  if (Array.isArray(history) && history.length > 0) {
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

  // 4. Multi-Turn Autonomous Reasoning Loop
  const gemini = new Gemini()
  let iteration = 0
  let rawAiText = ''
  const executedTools: ToolExecutionResult[] = []
  let workflowResult: WorkflowExecutionResult | null = null
  let leadResult: Record<string, unknown> | null = null
  let bookingResult: Record<string, unknown> | null = null
  let safeWorkflowMessage: string | null = null

  while (iteration < maxIterations) {
    iteration++

    const geminiRes = await gemini.generateContentWithTools({
      contents,
      tools: activeTools,
      systemInstruction,
    })

    if (geminiRes.functionCalls && geminiRes.functionCalls.length > 0) {
      // Group all function calls in a single model turn
      contents.push({
        role: 'model',
        parts: geminiRes.functionCalls.map((fnCall) => ({ functionCall: fnCall })),
      })

      const turnFunctionResponses: Array<{ name: string; response: any }> = []

      for (const fnCall of geminiRes.functionCalls) {
        const callArgs = { ...fnCall.args }

        // Inject customer context if omitted by the model
        if (!callArgs.phone && !callArgs.patient_phone && customerContext.phone) {
          callArgs.phone = customerContext.phone
          callArgs.patient_phone = customerContext.phone
        }
        if (
          !callArgs.name &&
          !callArgs.customer_name &&
          !callArgs.patient_name &&
          customerContext.name
        ) {
          callArgs.name = customerContext.name
          callArgs.customer_name = customerContext.name
          callArgs.patient_name = customerContext.name
        }

        // Execute tool call via server dispatcher
        const toolResult = await dispatchToolCall(fnCall.name, callArgs)
        executedTools.push(toolResult)

        if (onToolExecuted) {
          try {
            onToolExecuted(toolResult)
          } catch (hookErr) {
            console.warn('[Agent Runtime] onToolExecuted hook notice:', hookErr)
          }
        }

        // Capture workflow and entity outcomes
        if (toolResult.toolName === 'schedule_site_visit' && toolResult.result) {
          if (toolResult.result.workflowId) {
            workflowResult = {
              executionId: toolResult.result.workflowId,
              workflowId: 'wf-001',
              workflowName: 'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
              leadId: toolResult.result.leadId || '',
              conversationId: '',
              triggerEvent: 'Lead Qualified & Site Visit Booked',
              overallStatus: toolResult.result.workflowStatus || 'success',
              hasSimulatedSteps: !toolResult.result.customerConfirmationAllowed,
              failedStepIds: [],
              customerConfirmationAllowed: !!toolResult.result.customerConfirmationAllowed,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              durationMs: 0,
              steps: toolResult.result.steps || [],
              n8nResult: { status: 'dispatched' },
            }
            if (!workflowResult.customerConfirmationAllowed) {
              safeWorkflowMessage = getSiteVisitCustomerMessage(workflowResult, {
                customerName: toolResult.result.customerName,
                preferredDate: toolResult.result.preferredDate,
                preferredTime: toolResult.result.preferredTime,
              })
            }
          }
          leadResult = (toolResult.result.lead as Record<string, unknown>) || null
        } else if (toolResult.toolName === 'create_lead' && toolResult.result) {
          leadResult = (toolResult.result.lead as Record<string, unknown>) || null
        } else if (toolResult.toolName === 'book_clinic_appointment' && toolResult.result) {
          bookingResult = (toolResult.result as Record<string, unknown>) || null
          if (toolResult.result.workflowId) {
            workflowResult = {
              executionId: toolResult.result.workflowId,
              workflowId: 'wf-002',
              workflowName: 'Clinic Appointment Booking & Reminder Pipeline',
              leadId: toolResult.result.bookingId || '',
              conversationId: '',
              triggerEvent: 'Appointment Booked by Patient',
              overallStatus: toolResult.result.workflowStatus || 'success',
              hasSimulatedSteps: !toolResult.result.customerConfirmationAllowed,
              failedStepIds: [],
              customerConfirmationAllowed: !!toolResult.result.customerConfirmationAllowed,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              durationMs: 0,
              steps: toolResult.result.steps || [],
              n8nResult: { status: 'dispatched' },
            }
            if (!workflowResult.customerConfirmationAllowed) {
              safeWorkflowMessage = getClinicCustomerMessage(workflowResult, {
                patientName: toolResult.result.patientName,
                appointmentDate: toolResult.result.appointmentDate,
                appointmentTime: toolResult.result.appointmentTime,
                doctorName: toolResult.result.doctorName,
              })
            }
          }
        }

        turnFunctionResponses.push({
          name: fnCall.name,
          response: toolResult.success ? toolResult.result : { error: toolResult.error },
        })
      }

      // Group all function responses in a single function turn
      contents.push({
        role: 'function',
        parts: turnFunctionResponses.map((item) => ({
          functionResponse: item,
        })),
      })
    } else {
      rawAiText = geminiRes.text || ''
      break
    }
  }

  // 5. Final message resolution
  let replyText = rawAiText
  if (!replyText && executedTools.length > 0) {
    const summaryRes = await gemini.generateText({
      prompt: `You have completed the following actions: ${JSON.stringify(
        executedTools
      )}. Please provide a polite, natural confirmation response to the customer.`,
      systemInstruction,
    })
    replyText = summaryRes.text
  } else if (!replyText) {
    replyText = 'Thank you for reaching out to Grovaitech! How else may I assist you today?'
  }

  // Enforce truthful customer message when confirmation is not allowed
  if (safeWorkflowMessage) {
    replyText = safeWorkflowMessage
  }

  return {
    replyText,
    executedTools,
    workflowResult,
    leadResult,
    bookingResult,
    iterations: iteration,
    hasSimulatedWorkflow: workflowResult ? !workflowResult.customerConfirmationAllowed : false,
  }
}
