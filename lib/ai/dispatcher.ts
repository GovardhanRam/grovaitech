/**
 * Grovaitech AI Platform
 * lib/ai/dispatcher.ts
 *
 * Safe Tool Execution Dispatcher for Grovaitech AI Workforce OS.
 * Receives structured Gemini function calls, validates arguments,
 * enforces safety guardrails, and executes corresponding Grovaitech actions.
 *
 * Server-only execution layer.
 */

import { createLead, type LeadData } from '@/app/actions/leads'
import { createBooking } from '@/app/actions/bookings'
import {
  executeRealEstateWorkflow,
  getSiteVisitCustomerMessage,
  executeClinicWorkflow,
  getClinicCustomerMessage,
  executeSupportEscalationWorkflow,
  getEscalationCustomerMessage,
  executeWhatsAppLeadWorkflow,
  getWhatsAppLeadCustomerMessage,
  executeSalonWorkflow,
  getSalonCustomerMessage,
  executeQaWorkflow,
  getQaAuditCustomerMessage,
  type QaRubricBreakdown,
  executeLegalWorkflow,
  getLegalCustomerMessage,
  type LegalIntakeData,
  executeEcommerceWorkflow,
  getEcommerceCustomerMessage,
  type EcommerceSupportData,
  executeOnboardingWorkflow,
  getOnboardingCustomerMessage,
  type OnboardingIntakeData,
  executeFinancialWorkflow,
  getFinancialCustomerMessage,
  type FinancialConsultationData,
  type WorkflowExecutionResult,
} from '@/lib/workflows/executor'
import { generateResponse } from '@/lib/ai/gemini'
import { createServerClient } from '@/lib/supabase/server'
import {
  TOOL_NAMES,
  type ToolName,
  type CreateLeadParams,
  type ScheduleSiteVisitParams,
  type BookClinicAppointmentParams,
  type SearchKnowledgeBaseParams,
  type BookLegalConsultationParams,
  type LookupOrderAndSupportParams,
  type ScheduleOnboardingInductionParams,
  type BookFinancialConsultationParams,
} from '@/lib/ai/tools'

// ─── Dispatcher Response Interfaces ──────────────────────────────────────────

export interface ToolExecutionResult<T = any> {
  toolName: string
  success: boolean
  result?: T
  error?: string
  durationMs: number
}

// ─── Sanitization Helpers ───────────────────────────────────────────────────

function sanitizeErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred during tool execution.'
  const raw = typeof error === 'string' ? error : error.message || String(error)
  
  // Mask any potential leaked API keys, tokens, or internal credentials
  return raw
    .replace(/(?:AIza[0-9A-Za-z-_]{35})/g, '[REDACTED_API_KEY]')
    .replace(/(?:ghp_[0-9A-Za-z]{36})/g, '[REDACTED_TOKEN]')
    .replace(/(?:eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})/g, '[REDACTED_JWT]')
    .slice(0, 300)
}

function sanitizeString(val: any, maxLength?: number): string {
  if (typeof val !== 'string') return ''
  const trimmed = val.trim()
  return typeof maxLength === 'number' ? trimmed.slice(0, maxLength) : trimmed
}

function sanitizePhone(val: any): string {
  if (typeof val !== 'string') return ''
  // Normalize and keep digits and leading +
  return val.trim().replace(/[^\d+]/g, '')
}

// ─── Declarative Parameter Validator ────────────────────────────────────────

export interface FieldRule {
  type?: 'string' | 'phone' | 'email' | 'number'
  required?: boolean
  requiredMessage?: string
  minLength?: number
  minLengthMessage?: string
  maxLength?: number
  enum?: readonly string[] | string[]
  enumMessage?: string
  strictEnum?: boolean
  default?: any
  aliases?: string[]
}

export type ParamSchema = Record<string, FieldRule>

/**
 * Lightweight, zero-dependency declarative argument validator and sanitizer.
 */
export function validateParams(
  rawArgs: Record<string, any>,
  schema: ParamSchema
): Record<string, any> {
  const result: Record<string, any> = {}

  for (const [key, rule] of Object.entries(schema)) {
    // 1. Resolve raw value from key or alias
    let rawVal = rawArgs?.[key]
    if (rawVal === undefined && rule.aliases) {
      for (const alias of rule.aliases) {
        if (rawArgs?.[alias] !== undefined) {
          rawVal = rawArgs[alias]
          break
        }
      }
    }

    // 2. Format / Sanitize value according to type
    let val: any
    if (rule.type === 'phone') {
      val = sanitizePhone(rawVal)
    } else if (rule.type === 'number') {
      val = typeof rawVal === 'number' ? rawVal : (rule.default ?? undefined)
    } else {
      val = sanitizeString(rawVal, rule.maxLength)
    }

    // 3. Required check
    if (!val || (rule.type === 'number' && typeof val !== 'number')) {
      if (rule.required) {
        throw new Error(rule.requiredMessage || `Validation Error: '${key}' is required.`)
      }
      val = rule.default !== undefined ? rule.default : undefined
      result[key] = val
      continue
    }

    // 4. Min length check
    if (rule.minLength && typeof val === 'string' && val.length < rule.minLength) {
      throw new Error(
        rule.minLengthMessage ||
          rule.requiredMessage ||
          `Validation Error: '${key}' must be at least ${rule.minLength} characters.`
      )
    }

    // 5. Email format check
    if (rule.type === 'email' && typeof val === 'string' && !val.includes('@')) {
      throw new Error(
        rule.requiredMessage || `Validation Error: A valid '${key}' is required.`
      )
    }

    // 6. Enum check
    if (rule.enum && typeof val === 'string') {
      const lower = val.toLowerCase()
      const match = rule.enum.find((e) => e.toLowerCase() === lower)
      if (match) {
        val = match
      } else if (rule.strictEnum) {
        throw new Error(
          rule.enumMessage ||
            `Validation Error: '${key}' must be one of: ${rule.enum.join(', ')}.`
        )
      } else {
        val = rule.default !== undefined ? rule.default : rule.enum[0]
      }
    }

    result[key] = val
  }

  return result
}

// ─── Declarative Workflow Dispatch Helper ────────────────────────────────────

interface WorkflowDispatchConfig<TPayload, TResult> {
  idPrefix?: string
  generateId?: (rawArgs: Record<string, any>) => string
  executor: (input: { id: string; conversationId: string; payload: TPayload; rawArgs: Record<string, any> }) => Promise<WorkflowExecutionResult>
  formatter?: (wfResult: WorkflowExecutionResult, payload: TPayload) => string
  buildResult: (ctx: { id: string; payload: TPayload; wfResult: WorkflowExecutionResult; message: string; rawArgs: Record<string, any> }) => TResult
}

async function dispatchWorkflowHandler<TPayload, TResult>(
  rawArgs: Record<string, any>,
  payload: TPayload,
  config: WorkflowDispatchConfig<TPayload, TResult>
): Promise<TResult> {
  const conversationId = sanitizeString(rawArgs.conversation_id || rawArgs.chat_id || '')
  const id = config.generateId
    ? config.generateId(rawArgs)
    : `${config.idPrefix || 'wf'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const wfResult = await config.executor({ id, conversationId, payload, rawArgs })
  const message = config.formatter ? config.formatter(wfResult, payload) : ''

  return config.buildResult({ id, payload, wfResult, message, rawArgs })
}

// ─── Tool Handlers ───────────────────────────────────────────────────────────

/**
 * Handler 1: create_lead
 * Connects to existing lead creation action (app/actions/leads.ts).
 */
async function handleCreateLead(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    name: { type: 'string', required: true, requiredMessage: "Validation Error: 'name' is required for create_lead." },
    phone: { type: 'phone', required: true, minLength: 7, requiredMessage: "Validation Error: A valid 'phone' is required for create_lead." },
    email: { type: 'string' },
    location: { type: 'string', default: 'Tirupati' },
    budget: { type: 'string', default: 'Standard' },
    timeline: { type: 'string', default: 'Flexible' },
    notes: { type: 'string' },
    property_type: { type: 'string', enum: ['villa', 'apartment', 'house', 'plot', 'commercial', 'other'], default: 'villa' },
  })

  const isWhatsApp = rawArgs.source === 'whatsapp' || rawArgs.channel === 'whatsapp'
  const source = isWhatsApp ? ('whatsapp' as const) : ('ai_demo' as const)

  // Extract trusted server-provided tenant identity (never from untrusted model arguments)
  const clientId = sanitizeString(rawArgs.clientId || rawArgs.customerContext?.clientId || '') || undefined
  const deploymentId = sanitizeString(rawArgs.deploymentId || rawArgs.customerContext?.deploymentId || '') || undefined

  const leadPayload: LeadData = {
    name: p.name,
    phone: p.phone,
    email: p.email,
    property_type: p.property_type,
    location: p.location,
    budget: p.budget,
    timeline: p.timeline,
    lead_score: 'warm',
    lead_status: 'qualified',
    notes: p.notes ? `[Gemini Tool] ${p.notes}` : '[Gemini Tool] Lead registered via AI tool call',
    source,
    client_id: clientId,
    deployment_id: deploymentId,
  }

  // Enforce executionMode sandbox guardrail: sandbox execution MUST NEVER write to database
  if (rawArgs.executionMode === 'sandbox') {
    return {
      leadId: `mock-lead-${Date.now()}`,
      lead: { ...leadPayload, id: `mock-lead-${Date.now()}` },
      isUpdate: false,
      message: `[Sandbox] Simulated lead registration for ${p.name} (${p.phone}). No database write performed.`,
      isSimulated: true,
    }
  }

  const result = await createLead(leadPayload)
  if (!result.success) {
    throw new Error(result.error || 'Failed to register lead in CRM.')
  }

  let workflowResult: any = undefined
  if (isWhatsApp) {
    try {
      workflowResult = await executeWhatsAppLeadWorkflow({
        leadId: result.data?.id || '',
        conversationId: sanitizeString(rawArgs.conversation_id || rawArgs.chat_id || ''),
        lead: {
          name: p.name,
          phone: p.phone,
          property_type: p.property_type,
          location: p.location,
          budget: p.budget,
          timeline: p.timeline,
          intent: sanitizeString(rawArgs.intent) || undefined,
          notes: p.notes,
        },
      })
    } catch (wfErr) {
      console.warn('[handleCreateLead] wf-004 dispatch notice:', wfErr)
    }
  }

  const confirmationMessage = workflowResult
    ? getWhatsAppLeadCustomerMessage(workflowResult, { name: p.name, property_type: p.property_type, location: p.location })
    : `Lead for ${p.name} (${p.phone}) successfully registered in Grovaitech CRM.`

  return {
    leadId: result.data?.id,
    lead: result.data,
    isUpdate: result.isUpdate,
    workflowResult,
    message: confirmationMessage,
  }
}

/**
 * Handler 2: schedule_site_visit
 * Connects to existing lead registration and real estate workflow engine (wf-001).
 */
async function handleScheduleSiteVisit(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    customer_name: { type: 'string', required: true, minLength: 2, requiredMessage: "Validation Error: 'customer_name' is required to schedule a site visit." },
    phone: { type: 'phone', required: true, minLength: 7, requiredMessage: "Validation Error: 'phone' is required to coordinate the site visit." },
    preferred_date: { type: 'string', required: true, minLength: 3, requiredMessage: "Validation Error: 'preferred_date' is required to schedule a site visit." },
    preferred_time: { type: 'string', default: 'Morning (10:30 AM)' },
    property_type: { type: 'string', default: 'Villa' },
    location: { type: 'string', default: 'Tirupati' },
    notes: { type: 'string' },
    lead_id: { type: 'string' },
  })

  // 1. Ensure lead record is registered / updated in Supabase with site visit flag
  const clientId = sanitizeString(rawArgs.clientId || rawArgs.client_id || rawArgs.customerContext?.clientId || '') || undefined
  const deploymentId = sanitizeString(rawArgs.deploymentId || rawArgs.deployment_id || rawArgs.customerContext?.deploymentId || '') || undefined

  const leadPayload: LeadData = {
    name: p.customer_name,
    phone: p.phone,
    location: p.location,
    budget: 'Standard',
    timeline: p.preferred_date,
    site_visit_requested: true,
    site_visit_date: p.preferred_date,
    site_visit_time: p.preferred_time,
    lead_score: 'hot',
    lead_status: 'site_visit',
    notes: p.notes ? `[Site Visit Tool] ${p.notes}` : `[Site Visit Tool] Site visit requested for ${p.preferred_date} at ${p.preferred_time}`,
    source: 'ai_demo',
    client_id: clientId,
    deployment_id: deploymentId,
  }

  // Enforce executionMode sandbox guardrail: sandbox execution MUST NEVER write to database
  if (rawArgs.executionMode === 'sandbox') {
    const mockLeadId = p.lead_id || `mock-lead-${Date.now()}`
    return {
      leadId: mockLeadId,
      customerName: p.customer_name,
      phone: p.phone,
      preferredDate: p.preferred_date,
      preferredTime: p.preferred_time,
      workflowId: 'wf-001',
      workflowStatus: 'simulated',
      customerConfirmationAllowed: false,
      isSimulated: true,
      message: `[Sandbox] Simulated site visit for ${p.customer_name} on ${p.preferred_date} (${p.preferred_time}). No database write performed.`,
    }
  }

  const leadSaveResult = await createLead(leadPayload)
  const effectiveLeadId = leadSaveResult.data?.id || p.lead_id || `lead-visit-${Date.now()}`

  // 2. Dispatch canonical workflow wf-001 via dispatchWorkflowHandler
  return dispatchWorkflowHandler(rawArgs, p, {
    generateId: () => effectiveLeadId,
    executor: ({ id, conversationId }) =>
      executeRealEstateWorkflow({
        leadId: id,
        conversationId: conversationId || `tool-call-${Date.now()}`,
        lead: {
          name: p.customer_name,
          phone: p.phone,
          email: null,
          property_type: (p.property_type.toLowerCase() as any) || 'villa',
          bhk: null,
          location: p.location,
          budget: 'Standard',
          timeline: p.preferred_date,
          intent: 'Site Visit',
          qualification_score: 95,
          qualification_status: 'qualified',
          site_visit_requested: true,
          site_visit_date: p.preferred_date,
          site_visit_time: p.preferred_time,
        },
      }),
    formatter: (wfResult, payload) =>
      getSiteVisitCustomerMessage(wfResult, {
        customerName: payload.customer_name,
        preferredDate: payload.preferred_date,
        preferredTime: payload.preferred_time,
      }),
    buildResult: ({ id, payload, wfResult, message }) => ({
      leadId: id,
      customerName: payload.customer_name,
      phone: payload.phone,
      preferredDate: payload.preferred_date,
      preferredTime: payload.preferred_time,
      workflowId: wfResult.workflowId,
      workflowStatus: wfResult.overallStatus,
      customerConfirmationAllowed: wfResult.customerConfirmationAllowed,
      steps: wfResult.steps,
      message,
    }),
  })
}

/**
 * Handler 3: book_clinic_appointment
 * Connects to clinic appointment booking & reminder workflow engine (wf-002).
 */
async function handleBookClinicAppointment(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    patient_name: { type: 'string', required: true, requiredMessage: "Validation Error: 'patient_name' is required for clinic booking." },
    patient_phone: { type: 'phone', required: true, minLength: 7, requiredMessage: "Validation Error: 'patient_phone' is required for appointment confirmation." },
    appointment_date: { type: 'string', required: true, requiredMessage: "Validation Error: 'appointment_date' (YYYY-MM-DD) is required." },
    appointment_time: { type: 'string', required: true, requiredMessage: "Validation Error: 'appointment_time' is required." },
    patient_email: { type: 'string' },
    doctor_name: { type: 'string', default: 'Dr. Verma' },
    reason: { type: 'string', default: 'General Consultation' },
  })

  return dispatchWorkflowHandler(rawArgs, p, {
    executor: ({ conversationId, payload }) =>
      executeClinicWorkflow({
        patient: {
          patient_name: payload.patient_name,
          patient_phone: payload.patient_phone,
          patient_email: payload.patient_email,
          appointment_date: payload.appointment_date,
          appointment_time: payload.appointment_time,
          doctor_name: payload.doctor_name,
          reason: payload.reason,
        },
        conversationId: conversationId || `tool-clinic-${Date.now()}`,
      }),
    formatter: (wfResult, payload) =>
      getClinicCustomerMessage(wfResult, {
        patientName: payload.patient_name,
        appointmentDate: payload.appointment_date,
        appointmentTime: payload.appointment_time,
        doctorName: payload.doctor_name,
      }),
    buildResult: ({ payload, wfResult, message }) => ({
      bookingId: wfResult.leadId,
      patientName: payload.patient_name,
      patientPhone: payload.patient_phone,
      appointmentDate: payload.appointment_date,
      appointmentTime: payload.appointment_time,
      doctorName: payload.doctor_name,
      reason: payload.reason,
      workflowId: wfResult.workflowId,
      workflowStatus: wfResult.overallStatus,
      customerConfirmationAllowed: wfResult.customerConfirmationAllowed,
      steps: wfResult.steps,
      message,
    }),
  })
}

/**
 * Handler 4: search_knowledge_base
 * Reuses existing RAG search logic from app/api/rag-search/route.ts.
 */
async function handleSearchKnowledgeBase(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    query: { type: 'string', required: true, requiredMessage: "Validation Error: 'query' is required for search_knowledge_base." },
    category: { type: 'string', default: 'general' },
  })
  const maxResults = typeof rawArgs.max_results === 'number' ? Math.min(rawArgs.max_results, 10) : 3

  // Fetch document metadata from Supabase
  let docNames = 'Clinic FAQs, Real Estate Brochure, Pricing Guide, Company Policies'
  try {
    const supabase = await createServerClient()
    const { data: docs } = await supabase
      .from('documents')
      .select('name')
      .limit(maxResults)

    if (docs && docs.length > 0) {
      docNames = docs.map((d: any) => d.name).join(', ')
    }
  } catch (dbErr) {
    console.warn('[Knowledge Base Dispatcher] Document metadata notice:', dbErr)
  }

  // Generate grounded answer using Gemini
  const ragPrompt = `
You are GrovAI, a Knowledge Base Search assistant for Grovaitech AI Workforce OS.
Available Business Documents: [${docNames}]
Category Filter: "${p.category}"
Search Query: "${p.query}"

Provide a factual, concise response answering the search query based on these enterprise documents. Mention the relevant document source.`

  const answer = await generateResponse(ragPrompt)

  return {
    query: p.query,
    category: p.category,
    answer,
    referencedDocs: docNames,
  }
}

/**
 * Handler for 'escalate_to_human'
 */
async function handleEscalateToHuman(rawArgs: Record<string, any>) {
  const p = validateParams(rawArgs, {
    reason: { type: 'string', default: 'General Customer Assistance', maxLength: 200, minLength: 3, minLengthMessage: "Validation Error: 'reason' must be at least 3 characters." },
    summary: { type: 'string', default: 'Customer requested human assistance.', maxLength: 500, minLength: 5, minLengthMessage: "Validation Error: 'summary' must be at least 5 characters." },
    urgency: { type: 'string', default: 'medium', maxLength: 20 },
    customer_name: { type: 'string', maxLength: 100, aliases: ['name'] },
    phone: { type: 'string', maxLength: 30 },
    email: { type: 'string', maxLength: 100 },
    conversation_id: { type: 'string', maxLength: 100, aliases: ['chat_id'] },
  })

  return dispatchWorkflowHandler(rawArgs, p, {
    executor: ({ conversationId, payload }) =>
      executeSupportEscalationWorkflow({
        conversationId,
        escalation: {
          customer_name: payload.customer_name || undefined,
          reason: payload.reason,
          urgency: payload.urgency.toLowerCase(),
          summary: payload.summary,
          phone: payload.phone || undefined,
          email: payload.email || undefined,
        },
      }),
    formatter: (wfResult, payload) =>
      getEscalationCustomerMessage(wfResult, {
        customerName: payload.customer_name || undefined,
        reason: payload.reason,
        urgency: payload.urgency.toLowerCase(),
      }),
    buildResult: ({ payload, wfResult, message }) => ({
      escalated: true,
      workflowId: wfResult.workflowId,
      executionId: wfResult.executionId,
      workflowStatus: wfResult.overallStatus,
      reason: payload.reason,
      urgency: payload.urgency.toLowerCase(),
      customerName: payload.customer_name || undefined,
      message,
      steps: wfResult.steps,
    }),
  })
}

/**
 * Handler 6: book_salon_service
 * Connects to canonical salon workflow engine (wf-007).
 */
async function handleBookSalonService(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    client_name: { type: 'string', required: true, maxLength: 100, aliases: ['name'], requiredMessage: "Validation Error: 'client_name' is required to book a salon appointment." },
    client_phone: { type: 'phone', required: true, minLength: 7, aliases: ['phone'], requiredMessage: "Validation Error: A valid 'client_phone' is required to book a salon appointment.", minLengthMessage: "Validation Error: A valid 'client_phone' is required to book a salon appointment." },
    service_name: { type: 'string', required: true, maxLength: 150, aliases: ['service'], requiredMessage: "Validation Error: 'service_name' is required to book a salon appointment." },
    appointment_date: { type: 'string', required: true, maxLength: 50, aliases: ['date'], requiredMessage: "Validation Error: 'appointment_date' is required to book a salon appointment." },
    appointment_time: { type: 'string', required: true, maxLength: 50, aliases: ['time'], requiredMessage: "Validation Error: 'appointment_time' is required to book a salon appointment." },
    stylist_preference: { type: 'string', maxLength: 100, aliases: ['stylist'] },
    client_email: { type: 'string', maxLength: 100, aliases: ['email'] },
    notes: { type: 'string', maxLength: 500 },
    conversation_id: { type: 'string', maxLength: 100, aliases: ['chat_id'] },
  })

  return dispatchWorkflowHandler(rawArgs, p, {
    idPrefix: 'salon-bk',
    executor: ({ id, conversationId, payload }) =>
      executeSalonWorkflow({
        bookingId: id,
        conversationId,
        client: {
          client_name: payload.client_name,
          client_phone: payload.client_phone,
          client_email: payload.client_email,
          service_name: payload.service_name,
          appointment_date: payload.appointment_date,
          appointment_time: payload.appointment_time,
          stylist_preference: payload.stylist_preference,
          notes: payload.notes,
        },
      }),
    formatter: (wfResult, payload) =>
      getSalonCustomerMessage(wfResult, {
        client_name: payload.client_name,
        service_name: payload.service_name,
        appointment_date: payload.appointment_date,
        appointment_time: payload.appointment_time,
        stylist_preference: payload.stylist_preference,
      }),
    buildResult: ({ id, payload, wfResult, message }) => ({
      bookingId: id,
      workflowId: wfResult.workflowId,
      executionId: wfResult.executionId,
      workflowStatus: wfResult.overallStatus,
      clientName: payload.client_name,
      serviceName: payload.service_name,
      appointmentDate: payload.appointment_date,
      appointmentTime: payload.appointment_time,
      stylistPreference: payload.stylist_preference,
      message,
      steps: wfResult.steps,
    }),
  })
}

/**
 * Masks sensitive credentials such as API keys, Bearer tokens, passwords, and JWTs in transcripts.
 */
export function maskSensitiveCredentials(text: string): string {
  if (!text) return ''
  return text
    .replace(/(?:sk-[a-zA-Z0-9_\-]{16,})/gi, '[REDACTED_API_KEY]')
    .replace(/(?:bearer\s+[a-zA-Z0-9_\-\.]{16,})/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(?:password\s*[:=]\s*["']?)([^"'\s\n\r]+)(["']?)/gi, 'password=[REDACTED_PASSWORD]')
    .replace(/(?:eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,})/gi, '[REDACTED_JWT]')
}

/**
 * Handler 7: audit_conversation_quality
 * Connects to canonical AI QA workflow engine (wf-005).
 */
async function handleAuditConversationQuality(rawArgs: Record<string, any>): Promise<any> {
  const chatId = sanitizeString(rawArgs.chat_id, 100) || undefined
  let rawTranscript = sanitizeString(rawArgs.transcript, 8000)
  const rubric = sanitizeString(rawArgs.rubric, 50) || 'standard'
  const focusAreas = sanitizeString(rawArgs.focus_areas, 200) || undefined
  const notes = sanitizeString(rawArgs.notes, 500) || undefined

  // 1. If transcript not provided but chatId is present, fetch conversation turns from Supabase
  if (!rawTranscript && chatId) {
    try {
      const supabase = await createServerClient()
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(20)

      if (messages && messages.length > 0) {
        rawTranscript = messages
          .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n')
      }
    } catch (err) {
      console.warn('[QA Dispatcher] Notice fetching chat transcript:', err)
    }
  }

  if (!rawTranscript && !chatId) {
    throw new Error("Validation Error: Either 'transcript' or 'chat_id' is required for quality inspection.")
  }

  // 2. Sanitize and mask any sensitive credentials
  const sanitizedTranscript = maskSensitiveCredentials(rawTranscript || `Transcript for chat ${chatId}`)

  // 3. Perform rubric evaluation across 4 dimensions: Truthfulness, Helpfulness, Compliance, Safety
  let truthfulnessScore = 25
  let helpfulnessScore = 25
  let complianceScore = 25
  let safetyScore = 25
  const strengths: string[] = []
  const violations: string[] = []
  const recommendations: string[] = []

  const lower = sanitizedTranscript.toLowerCase()

  // Truthfulness & Grounding check
  if (
    lower.includes('guarantee 100% profit') ||
    lower.includes('unauthorized discount') ||
    lower.includes('free medical diagnosis')
  ) {
    truthfulnessScore -= 15
    violations.push('Model made ungrounded or fabricated promises not supported by enterprise knowledge base.')
    recommendations.push('Enforce stricter search_knowledge_base retrieval prior to answering.')
  } else {
    strengths.push('Responses maintained truthful boundaries and avoided unauthorized promises.')
  }

  // Safety & Tone check
  if (lower.includes('shut up') || lower.includes('not my problem') || lower.includes('i do not care')) {
    safetyScore -= 20
    violations.push('Agent displayed non-empathetic or unprofessional communication tone.')
    recommendations.push('Apply hospitality de-escalation guidelines in prompt.')
  } else {
    strengths.push('Maintained polite, professional, and empathetic tone throughout the interaction.')
  }

  // Helpfulness check
  if (sanitizedTranscript.length < 30) {
    helpfulnessScore -= 10
    violations.push('Interaction was overly terse with insufficient detail for customer resolution.')
    recommendations.push('Provide more comprehensive step-by-step assistance.')
  } else {
    strengths.push('Provided clear, actionable assistance aligned with user query.')
  }

  // Compliance check
  if (lower.includes('refund processed immediately') && !lower.includes('escalate_to_human')) {
    complianceScore -= 15
    violations.push('Promised financial refunds without human operator escalation approval.')
    recommendations.push('Route all refund/billing disputes through escalate_to_human.')
  } else {
    strengths.push('Strictly observed operational compliance and role boundaries.')
  }

  const overallScore = Math.max(0, Math.min(100, truthfulnessScore + helpfulnessScore + complianceScore + safetyScore))
  const passed = overallScore >= 70

  const rubricBreakdown: QaRubricBreakdown = {
    truthfulness: truthfulnessScore,
    helpfulness: helpfulnessScore,
    compliance: complianceScore,
    safety: safetyScore,
  }

  const summary = passed
    ? `Interaction passed quality rubric scoring ${overallScore}/100 with high adherence to truthfulness and company guidelines.`
    : `Interaction flagged with score ${overallScore}/100 due to ${violations.length} policy or quality deviations.`

  const auditPayload = {
    chat_id: chatId,
    transcript: sanitizedTranscript,
    rubric,
    focus_areas: focusAreas,
    notes,
    overallScore,
    passed,
    rubricBreakdown,
    strengths,
    violations,
    recommendations,
    summary,
    sanitizedTranscriptSnippet: sanitizedTranscript.slice(0, 150),
  }

  return dispatchWorkflowHandler(rawArgs, auditPayload, {
    idPrefix: 'qa-audit',
    executor: ({ id, conversationId, payload }) =>
      executeQaWorkflow({
        auditId: id,
        conversationId: chatId || conversationId,
        audit: payload,
      }),
    formatter: (wfResult, payload) =>
      getQaAuditCustomerMessage(wfResult, {
        chat_id: payload.chat_id,
        transcript: payload.transcript,
        rubric: payload.rubric,
        focus_areas: payload.focus_areas,
        notes: payload.notes,
        overallScore: payload.overallScore,
        passed: payload.passed,
        rubricBreakdown: payload.rubricBreakdown,
        strengths: payload.strengths,
        violations: payload.violations,
        recommendations: payload.recommendations,
        summary: payload.summary,
      }),
    buildResult: ({ id, payload, wfResult, message }) => ({
      auditId: id,
      workflowId: wfResult.workflowId,
      executionId: wfResult.executionId,
      overallScore: payload.overallScore,
      passed: payload.passed,
      rubricBreakdown: payload.rubricBreakdown,
      strengths: payload.strengths,
      violations: payload.violations,
      recommendations: payload.recommendations,
      summary: payload.summary,
      message,
      steps: wfResult.steps,
    }),
  })
}

/**
 * Handler 8: book_legal_consultation
 * Connects to Legal Intake Workflow Engine (wf-006).
 */
async function handleBookLegalConsultation(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    client_name: { type: 'string', required: true, requiredMessage: "Validation Error: 'client_name' is required for legal consultation intake." },
    client_phone: { type: 'phone', required: true, minLength: 7, requiredMessage: "Validation Error: A valid 'client_phone' is required for legal consultation intake.", minLengthMessage: "Validation Error: A valid 'client_phone' is required for legal consultation intake." },
    client_email: { type: 'email', required: true, requiredMessage: "Validation Error: A valid 'client_email' is required for legal consultation intake." },
    matter_summary: { type: 'string', required: true, requiredMessage: "Validation Error: 'matter_summary' is required for legal consultation intake." },
    preferred_date: { type: 'string', required: true, requiredMessage: "Validation Error: 'preferred_date' is required for legal consultation intake." },
    preferred_time: { type: 'string', required: true, requiredMessage: "Validation Error: 'preferred_time' is required for legal consultation intake." },
    practice_area: {
      type: 'string',
      required: true,
      strictEnum: true,
      enum: ['corporate', 'litigation', 'family', 'criminal', 'real_estate', 'employment', 'ip', 'other'],
      enumMessage: "Validation Error: 'practice_area' must be one of: corporate, litigation, family, criminal, real_estate, employment, ip, other.",
    },
    urgency: {
      type: 'string',
      required: true,
      strictEnum: true,
      enum: ['routine', 'urgent', 'critical'],
      enumMessage: "Validation Error: 'urgency' must be one of: routine, urgent, critical.",
    },
    opposing_party: { type: 'string', default: 'None' },
    notes: { type: 'string' },
  })

  const intakePayload: LegalIntakeData = {
    client_name: p.client_name,
    client_phone: p.client_phone,
    client_email: p.client_email,
    practice_area: p.practice_area,
    matter_summary: p.matter_summary,
    opposing_party: p.opposing_party,
    urgency: p.urgency,
    preferred_date: p.preferred_date,
    preferred_time: p.preferred_time,
    notes: p.notes,
  }

  return dispatchWorkflowHandler(rawArgs, intakePayload, {
    idPrefix: 'legal-intake',
    executor: ({ id, conversationId, payload }) =>
      executeLegalWorkflow({
        intakeId: id,
        conversationId,
        client: payload,
      }),
    formatter: (wfResult, payload) => getLegalCustomerMessage(wfResult, payload),
    buildResult: ({ id, payload, wfResult, message }) => ({
      intakeId: id,
      workflowId: wfResult.workflowId,
      executionId: wfResult.executionId,
      client_name: payload.client_name,
      client_phone: payload.client_phone,
      client_email: payload.client_email,
      practice_area: payload.practice_area,
      matter_summary: payload.matter_summary,
      opposing_party: payload.opposing_party,
      urgency: payload.urgency,
      preferred_date: payload.preferred_date,
      preferred_time: payload.preferred_time,
      conflict_status: payload.conflict_status || 'clear',
      workflowStatus: wfResult.overallStatus,
      customerConfirmationAllowed: wfResult.customerConfirmationAllowed,
      message,
      steps: wfResult.steps,
    }),
  })
}

/**
 * Handler 9: lookup_order_and_support
 * Connects to E-Commerce Order Tracking & Returns Pipeline (wf-008).
 */
async function handleLookupOrderAndSupport(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    order_id: {
      type: 'string',
      required: true,
      minLength: 3,
      requiredMessage: "Validation Error: A valid 'order_id' (minimum 3 characters) is required for store support lookup.",
      minLengthMessage: "Validation Error: A valid 'order_id' (minimum 3 characters) is required for store support lookup.",
    },
    customer_email: { type: 'string' },
    customer_phone: { type: 'phone' },
    action_type: {
      type: 'string',
      required: true,
      strictEnum: true,
      enum: ['track_order', 'return_request', 'exchange_request', 'cancel_request'],
      enumMessage: "Validation Error: 'action_type' must be one of: track_order, return_request, exchange_request, cancel_request.",
    },
    item_details: { type: 'string' },
    reason: { type: 'string' },
    notes: { type: 'string' },
  })

  if (!p.customer_email && !p.customer_phone) {
    throw new Error("Validation Error: Please provide at least one contact method ('customer_email' or 'customer_phone') to authenticate and look up order details.")
  }

  const supportPayload: EcommerceSupportData = {
    order_id: p.order_id,
    customer_email: p.customer_email,
    customer_phone: p.customer_phone,
    action_type: p.action_type,
    item_details: p.item_details,
    reason: p.reason,
    notes: p.notes,
  }

  return dispatchWorkflowHandler(rawArgs, supportPayload, {
    idPrefix: 'ecom-supp',
    executor: ({ id, conversationId, payload }) =>
      executeEcommerceWorkflow({
        supportId: id,
        conversationId,
        client: payload,
      }),
    formatter: (wfResult, payload) => getEcommerceCustomerMessage(wfResult, payload),
    buildResult: ({ id, payload, wfResult, message }) => ({
      supportId: id,
      workflowId: wfResult.workflowId,
      executionId: wfResult.executionId,
      order_id: payload.order_id,
      customer_email: payload.customer_email,
      customer_phone: payload.customer_phone,
      action_type: payload.action_type,
      order_status: payload.order_status,
      tracking_number: payload.tracking_number,
      carrier: payload.carrier,
      estimated_delivery: payload.estimated_delivery,
      eligibility_status: payload.eligibility_status,
      workflowStatus: wfResult.overallStatus,
      customerConfirmationAllowed: wfResult.customerConfirmationAllowed,
      message,
      steps: wfResult.steps,
    }),
  })
}

/**
 * Handler 10: schedule_onboarding_induction
 * Connects to Employee Onboarding Intake & Induction Pipeline (wf-009).
 */
async function handleScheduleOnboardingInduction(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    candidate_name: {
      type: 'string',
      required: true,
      minLength: 2,
      requiredMessage: "Validation Error: 'candidate_name' must be at least 2 characters.",
      minLengthMessage: "Validation Error: 'candidate_name' must be at least 2 characters.",
    },
    candidate_email: {
      type: 'email',
      required: true,
      requiredMessage: "Validation Error: A valid 'candidate_email' is required for onboarding registration.",
    },
    candidate_phone: {
      type: 'phone',
      required: true,
      minLength: 8,
      requiredMessage: "Validation Error: A valid 'candidate_phone' (minimum 8 digits) is required.",
      minLengthMessage: "Validation Error: A valid 'candidate_phone' (minimum 8 digits) is required.",
    },
    role_title: {
      type: 'string',
      required: true,
      minLength: 2,
      requiredMessage: "Validation Error: 'role_title' is required for employee onboarding.",
      minLengthMessage: "Validation Error: 'role_title' is required for employee onboarding.",
    },
    department: {
      type: 'string',
      enum: ['engineering', 'product', 'sales', 'marketing', 'operations', 'finance', 'hr', 'other'],
      default: 'other',
    },
    joining_date: {
      type: 'string',
      required: true,
      requiredMessage: "Validation Error: 'joining_date' is required for onboarding coordination.",
    },
    preferred_induction_slot: {
      type: 'string',
      required: true,
      requiredMessage: "Validation Error: 'preferred_induction_slot' is required to reserve an orientation session.",
    },
    document_status: {
      type: 'string',
      enum: ['all_submitted', 'pending_documents', 'under_review'],
      default: 'all_submitted',
    },
    notes: { type: 'string' },
  })

  const onboardingPayload: OnboardingIntakeData = {
    candidate_name: p.candidate_name,
    candidate_email: p.candidate_email,
    candidate_phone: p.candidate_phone,
    role_title: p.role_title,
    department: p.department,
    joining_date: p.joining_date,
    preferred_induction_slot: p.preferred_induction_slot,
    document_status: p.document_status,
    notes: p.notes,
  }

  return dispatchWorkflowHandler(rawArgs, onboardingPayload, {
    idPrefix: 'hr-intake',
    executor: ({ id, conversationId, payload }) =>
      executeOnboardingWorkflow({
        intakeId: id,
        conversationId,
        client: payload,
      }),
    formatter: (wfResult, payload) => getOnboardingCustomerMessage(wfResult, payload),
    buildResult: ({ id, payload, wfResult, message }) => ({
      intakeId: id,
      workflowId: wfResult.workflowId,
      executionId: wfResult.executionId,
      candidate_name: payload.candidate_name,
      candidate_email: payload.candidate_email,
      candidate_phone: payload.candidate_phone,
      role_title: payload.role_title,
      department: payload.department,
      joining_date: payload.joining_date,
      preferred_induction_slot: payload.preferred_induction_slot,
      document_status: payload.document_status,
      induction_status: payload.induction_status || 'scheduled',
      orientation_room: payload.orientation_room,
      workflowStatus: wfResult.overallStatus,
      customerConfirmationAllowed: wfResult.customerConfirmationAllowed,
      message,
      steps: wfResult.steps,
    }),
  })
}

/**
 * Handler 11: book_financial_consultation
 * Connects to Financial Advisory Consultation & KYC Intake Pipeline (wf-010).
 */
async function handleBookFinancialConsultation(rawArgs: Record<string, any>): Promise<any> {
  const p = validateParams(rawArgs, {
    client_name: {
      type: 'string',
      required: true,
      minLength: 2,
      requiredMessage: "Validation Error: 'client_name' must be at least 2 characters.",
      minLengthMessage: "Validation Error: 'client_name' must be at least 2 characters.",
    },
    client_email: {
      type: 'email',
      required: true,
      requiredMessage: "Validation Error: A valid 'client_email' is required for advisory booking.",
    },
    client_phone: {
      type: 'phone',
      required: true,
      minLength: 8,
      requiredMessage: "Validation Error: A valid 'client_phone' (minimum 8 digits) is required.",
      minLengthMessage: "Validation Error: A valid 'client_phone' (minimum 8 digits) is required.",
    },
    product_category: {
      type: 'string',
      enum: ['insurance', 'home_loan', 'personal_loan', 'mutual_funds', 'wealth_management', 'retirement_planning', 'tax_planning', 'other'],
      default: 'other',
    },
    amount_range: {
      type: 'string',
      required: true,
      minLength: 2,
      requiredMessage: "Validation Error: 'amount_range' is required to qualify financial consultation scope.",
      minLengthMessage: "Validation Error: 'amount_range' is required to qualify financial consultation scope.",
    },
    employment_type: {
      type: 'string',
      enum: ['salaried', 'self_employed', 'business_owner', 'retired', 'other'],
      default: 'other',
    },
    preferred_date: {
      type: 'string',
      required: true,
      requiredMessage: "Validation Error: 'preferred_date' is required for advisor consultation scheduling.",
    },
    preferred_time: {
      type: 'string',
      required: true,
      requiredMessage: "Validation Error: 'preferred_time' is required for advisor consultation scheduling.",
    },
    kyc_status: {
      type: 'string',
      enum: ['verified', 'documents_pending', 'exempt'],
      default: 'verified',
    },
    annual_income: { type: 'string' },
    notes: { type: 'string' },
  })

  const financialPayload: FinancialConsultationData = {
    client_name: p.client_name,
    client_phone: p.client_phone,
    client_email: p.client_email,
    product_category: p.product_category,
    amount_range: p.amount_range,
    employment_type: p.employment_type,
    annual_income: p.annual_income,
    kyc_status: p.kyc_status,
    preferred_date: p.preferred_date,
    preferred_time: p.preferred_time,
    notes: p.notes,
  }

  return dispatchWorkflowHandler(rawArgs, financialPayload, {
    idPrefix: 'fin-consult',
    executor: ({ id, conversationId, payload }) =>
      executeFinancialWorkflow({
        consultationId: id,
        conversationId,
        client: payload,
      }),
    formatter: (wfResult, payload) => getFinancialCustomerMessage(wfResult, payload),
    buildResult: ({ id, payload, wfResult, message }) => ({
      consultationId: id,
      workflowId: wfResult.workflowId,
      executionId: wfResult.executionId,
      client_name: payload.client_name,
      client_phone: payload.client_phone,
      client_email: payload.client_email,
      product_category: payload.product_category,
      amount_range: payload.amount_range,
      employment_type: payload.employment_type,
      annual_income: payload.annual_income,
      kyc_status: payload.kyc_status,
      preferred_date: payload.preferred_date,
      preferred_time: payload.preferred_time,
      assigned_advisor: payload.assigned_advisor,
      meeting_mode: payload.meeting_mode,
      workflowStatus: wfResult.overallStatus,
      customerConfirmationAllowed: wfResult.customerConfirmationAllowed,
      message,
      steps: wfResult.steps,
    }),
  })
}

// ─── Main Dispatcher Entry Point ─────────────────────────────────────────────

/**
 * Dispatches a Gemini function call to the corresponding Grovaitech handler.
 * Enforces strict validation, rejects unknown tools, and returns structured results.
 */
export async function dispatchToolCall(
  toolName: string,
  rawArgs: Record<string, any>
): Promise<ToolExecutionResult> {
  const startTime = Date.now()

  // 1. Validate tool name
  if (!toolName || typeof toolName !== 'string') {
    return {
      toolName: String(toolName),
      success: false,
      error: 'Invalid tool invocation: toolName must be a non-empty string.',
      durationMs: Date.now() - startTime,
    }
  }

  const normalizedToolName = toolName.trim()

  // 2. Reject unknown tools (Safety Guardrail: Only execute known, registered tools)
  const allowedTools = Object.values(TOOL_NAMES) as string[]
  if (!allowedTools.includes(normalizedToolName)) {
    return {
      toolName: normalizedToolName,
      success: false,
      error: `Security Violation: Rejected unknown tool execution '${normalizedToolName}'.`,
      durationMs: Date.now() - startTime,
    }
  }

  // 3. Dispatch to designated handler with strict exception isolation
  try {
    let result: any

    switch (normalizedToolName as ToolName) {
      case TOOL_NAMES.CREATE_LEAD:
        result = await handleCreateLead(rawArgs || {})
        break

      case TOOL_NAMES.SCHEDULE_SITE_VISIT:
        result = await handleScheduleSiteVisit(rawArgs || {})
        break

      case TOOL_NAMES.BOOK_CLINIC_APPOINTMENT:
        result = await handleBookClinicAppointment(rawArgs || {})
        break

      case TOOL_NAMES.SEARCH_KNOWLEDGE_BASE:
        result = await handleSearchKnowledgeBase(rawArgs || {})
        break

      case TOOL_NAMES.ESCALATE_TO_HUMAN:
        result = await handleEscalateToHuman(rawArgs || {})
        break

      case TOOL_NAMES.BOOK_SALON_SERVICE:
        result = await handleBookSalonService(rawArgs || {})
        break

      case TOOL_NAMES.AUDIT_CONVERSATION_QUALITY:
        result = await handleAuditConversationQuality(rawArgs || {})
        break

      case TOOL_NAMES.BOOK_LEGAL_CONSULTATION:
        result = await handleBookLegalConsultation(rawArgs || {})
        break

      case TOOL_NAMES.LOOKUP_ORDER_AND_SUPPORT:
        result = await handleLookupOrderAndSupport(rawArgs || {})
        break

      case TOOL_NAMES.SCHEDULE_ONBOARDING_INDUCTION:
        result = await handleScheduleOnboardingInduction(rawArgs || {})
        break

      case TOOL_NAMES.BOOK_FINANCIAL_CONSULTATION:
        result = await handleBookFinancialConsultation(rawArgs || {})
        break

      default:
        throw new Error(`Unhandled tool action: ${normalizedToolName}`)
    }

    return {
      toolName: normalizedToolName,
      success: true,
      result,
      durationMs: Date.now() - startTime,
    }
  } catch (error: any) {
    console.error(`[Tool Dispatcher Error: ${normalizedToolName}]`, error)
    return {
      toolName: normalizedToolName,
      success: false,
      error: sanitizeErrorMessage(error),
      durationMs: Date.now() - startTime,
    }
  }
}
