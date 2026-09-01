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
import { getEmployeeBySlug, getCanonicalEmployeeBySlug } from '@/lib/employees'
import {
  getSiteVisitCustomerMessage,
  getClinicCustomerMessage,
  getLegalCustomerMessage,
  getEcommerceCustomerMessage,
  getOnboardingCustomerMessage,
  getFinancialCustomerMessage,
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
  if (!slug) return ALL_GROVAITECH_TOOLS

  const canonical = getCanonicalEmployeeBySlug(slug)
  if (canonical && Array.isArray(canonical.tools) && canonical.tools.length > 0) {
    const toolMap = new Map(ALL_GROVAITECH_TOOLS.map((t) => [t.name, t]))
    const tools = canonical.tools
      .map((name) => toolMap.get(name))
      .filter(Boolean) as GeminiFunctionDeclaration[]
    if (tools.length > 0) {
      return tools
    }
  }

  const normalized = slug.toLowerCase()
  if (normalized.includes('real-estate')) {
    return REAL_ESTATE_TOOLS
  }
  if (normalized.includes('clinic') || normalized.includes('medical') || normalized.includes('doctor')) {
    return CLINIC_TOOLS
  }
  return ALL_GROVAITECH_TOOLS
}

export function getDefaultSystemPrompt(slug?: string): string {
  if (slug) {
    const canonical = getCanonicalEmployeeBySlug(slug)
    if (canonical && canonical.system_prompt) {
      return canonical.system_prompt
    }
  }

  const normalized = (slug || '').toLowerCase()

  if (normalized.includes('real-estate')) {
    return getCanonicalEmployeeBySlug('real-estate-lead-receptionist')?.system_prompt || ''
  }
  if (normalized.includes('clinic') || normalized.includes('medical') || normalized.includes('doctor')) {
    return getCanonicalEmployeeBySlug('clinic-receptionist')?.system_prompt || ''
  }
  if (normalized.includes('legal') || normalized.includes('law') || normalized.includes('attorney')) {
    return getCanonicalEmployeeBySlug('legal-intake-agent')?.system_prompt || ''
  }
  if (
    normalized.includes('ecommerce') ||
    normalized.includes('e-commerce') ||
    normalized.includes('order') ||
    normalized.includes('shipping') ||
    normalized.includes('return')
  ) {
    return getCanonicalEmployeeBySlug('ecommerce-support-agent')?.system_prompt || ''
  }
  if (
    normalized.includes('hr') ||
    normalized.includes('onboarding') ||
    normalized.includes('induction')
  ) {
    return getCanonicalEmployeeBySlug('hr-onboarding-agent')?.system_prompt || ''
  }
  if (
    normalized.includes('financial') ||
    normalized.includes('advisory') ||
    normalized.includes('wealth') ||
    normalized.includes('investment')
  ) {
    return getCanonicalEmployeeBySlug('financial-advisory-agent')?.system_prompt || ''
  }

  return `You are GrovAI, an elite AI Lead Receptionist for Grovaitech.
Your goal is to warmly assist prospective customers, qualify their requirements, answer questions intelligently, and use tools when appropriate to schedule visits, book appointments, or create CRM leads.

**Guidelines:**
1. If the user provides sufficient information to book a visit or appointment, invoke the appropriate tool.
2. If any critical info is missing, ask naturally and concisely in 1-2 sentences.
3. Keep responses friendly, highly professional, and helpful.`
}

// ─── Workflow Outcome Extraction Helpers ─────────────────────────────────────

interface WorkflowExtractorConfig {
  workflowId: string
  workflowName: string
  triggerEvent: string
  leadIdKey: string
  formatCondition: 'always' | 'when_not_confirmed'
  extractEntity?: (res: any) => { leadResult?: Record<string, unknown> | null; bookingResult?: Record<string, unknown> | null }
}

const WORKFLOW_EXTRACTORS: Record<string, WorkflowExtractorConfig> = {
  schedule_site_visit: {
    workflowId: 'wf-001',
    workflowName: 'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
    triggerEvent: 'Lead Qualified & Site Visit Booked',
    leadIdKey: 'leadId',
    formatCondition: 'when_not_confirmed',
    extractEntity: (res) => ({ leadResult: (res.lead as Record<string, unknown>) || null }),
  },
  book_clinic_appointment: {
    workflowId: 'wf-002',
    workflowName: 'Clinic Appointment Booking & Reminder Pipeline',
    triggerEvent: 'Appointment Booked by Patient',
    leadIdKey: 'bookingId',
    formatCondition: 'when_not_confirmed',
    extractEntity: (res) => ({ bookingResult: (res as Record<string, unknown>) || null }),
  },
  book_legal_consultation: {
    workflowId: 'wf-006',
    workflowName: 'Legal Consultation Intake & Conflict Check',
    triggerEvent: 'New Legal Inquiry Submitted',
    leadIdKey: 'intakeId',
    formatCondition: 'when_not_confirmed',
  },
  lookup_order_and_support: {
    workflowId: 'wf-008',
    workflowName: 'E-Commerce Order Tracking & Returns Resolution Pipeline',
    triggerEvent: 'Customer Order Query / Return Request',
    leadIdKey: 'supportId',
    formatCondition: 'always',
  },
  schedule_onboarding_induction: {
    workflowId: 'wf-009',
    workflowName: 'Employee Onboarding Intake & Induction Scheduling Pipeline',
    triggerEvent: 'New Employee Onboarding / Induction Request',
    leadIdKey: 'intakeId',
    formatCondition: 'always',
  },
  book_financial_consultation: {
    workflowId: 'wf-010',
    workflowName: 'Financial Advisory Consultation & KYC Intake Pipeline',
    triggerEvent: 'New Financial Inquiry Submitted',
    leadIdKey: 'consultationId',
    formatCondition: 'always',
  },
}

function formatWorkflowCustomerMessage(
  toolName: string,
  wfResult: WorkflowExecutionResult,
  res: any
): string | null {
  switch (toolName) {
    case 'schedule_site_visit':
      return typeof getSiteVisitCustomerMessage === 'function'
        ? getSiteVisitCustomerMessage(wfResult, {
            customerName: res.customerName,
            preferredDate: res.preferredDate,
            preferredTime: res.preferredTime,
          })
        : null
    case 'book_clinic_appointment':
      return typeof getClinicCustomerMessage === 'function'
        ? getClinicCustomerMessage(wfResult, {
            patientName: res.patientName,
            appointmentDate: res.appointmentDate,
            appointmentTime: res.appointmentTime,
            doctorName: res.doctorName,
          })
        : null
    case 'book_legal_consultation':
      return typeof getLegalCustomerMessage === 'function'
        ? getLegalCustomerMessage(wfResult, {
            client_name: res.client_name,
            client_phone: res.client_phone,
            client_email: res.client_email,
            practice_area: res.practice_area,
            matter_summary: res.matter_summary,
            opposing_party: res.opposing_party,
            urgency: res.urgency,
            preferred_date: res.preferred_date,
            preferred_time: res.preferred_time,
            conflict_status: res.conflict_status,
          })
        : null
    case 'lookup_order_and_support':
      return typeof getEcommerceCustomerMessage === 'function'
        ? getEcommerceCustomerMessage(wfResult, {
            order_id: res.order_id,
            customer_email: res.customer_email,
            customer_phone: res.customer_phone,
            action_type: res.action_type,
            order_status: res.order_status,
            tracking_number: res.tracking_number,
            carrier: res.carrier,
            estimated_delivery: res.estimated_delivery,
            eligibility_status: res.eligibility_status,
          })
        : null
    case 'schedule_onboarding_induction':
      return typeof getOnboardingCustomerMessage === 'function'
        ? getOnboardingCustomerMessage(wfResult, {
            candidate_name: res.candidate_name,
            candidate_email: res.candidate_email,
            candidate_phone: res.candidate_phone,
            role_title: res.role_title,
            department: res.department,
            joining_date: res.joining_date,
            preferred_induction_slot: res.preferred_induction_slot,
            document_status: res.document_status,
            induction_status: res.induction_status,
            orientation_room: res.orientation_room,
          })
        : null
    case 'book_financial_consultation':
      return typeof getFinancialCustomerMessage === 'function'
        ? getFinancialCustomerMessage(wfResult, {
            client_name: res.client_name,
            client_phone: res.client_phone,
            client_email: res.client_email,
            product_category: res.product_category,
            amount_range: res.amount_range,
            employment_type: res.employment_type,
            annual_income: res.annual_income,
            kyc_status: res.kyc_status,
            preferred_date: res.preferred_date,
            preferred_time: res.preferred_time,
            assigned_advisor: res.assigned_advisor,
            meeting_mode: res.meeting_mode,
          })
        : null
    default:
      return null
  }
}

export function extractWorkflowOutcome(toolResult: ToolExecutionResult): {
  workflowResult?: WorkflowExecutionResult | null
  safeWorkflowMessage?: string | null
  leadResult?: Record<string, unknown> | null
  bookingResult?: Record<string, unknown> | null
} {
  if (!toolResult.result) return {}

  if (toolResult.toolName === 'create_lead') {
    return {
      leadResult: (toolResult.result.lead as Record<string, unknown>) || null,
    }
  }

  const config = WORKFLOW_EXTRACTORS[toolResult.toolName]
  if (!config) return {}

  let leadResult: Record<string, unknown> | null = null
  let bookingResult: Record<string, unknown> | null = null

  if (config.extractEntity) {
    const entities = config.extractEntity(toolResult.result)
    if (entities.leadResult !== undefined) leadResult = entities.leadResult
    if (entities.bookingResult !== undefined) bookingResult = entities.bookingResult
  }

  if (!toolResult.result.workflowId) {
    return { leadResult, bookingResult }
  }

  const executionId = toolResult.result.executionId || toolResult.result.workflowId
  const leadId = toolResult.result[config.leadIdKey] || ''
  const customerConfirmationAllowed = !!toolResult.result.customerConfirmationAllowed

  const workflowResult: WorkflowExecutionResult = {
    executionId,
    workflowId: config.workflowId,
    workflowName: config.workflowName,
    leadId,
    conversationId: '',
    triggerEvent: config.triggerEvent,
    overallStatus: toolResult.result.workflowStatus || 'success',
    hasSimulatedSteps: !customerConfirmationAllowed,
    failedStepIds: [],
    customerConfirmationAllowed,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: 0,
    steps: toolResult.result.steps || [],
    n8nResult: { status: 'dispatched' },
  }

  let safeWorkflowMessage: string | null = null
  if (config.formatCondition === 'always' || !customerConfirmationAllowed) {
    safeWorkflowMessage = formatWorkflowCustomerMessage(toolResult.toolName, workflowResult, toolResult.result)
  }

  return {
    workflowResult,
    safeWorkflowMessage,
    leadResult,
    bookingResult,
  }
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
        const outcome = extractWorkflowOutcome(toolResult)
        if (outcome.workflowResult) {
          workflowResult = outcome.workflowResult
        }
        if (outcome.safeWorkflowMessage) {
          safeWorkflowMessage = outcome.safeWorkflowMessage
        }
        if (outcome.leadResult !== undefined) {
          leadResult = outcome.leadResult
        }
        if (outcome.bookingResult !== undefined) {
          bookingResult = outcome.bookingResult
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
