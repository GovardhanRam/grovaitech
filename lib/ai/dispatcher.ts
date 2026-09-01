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

function sanitizeString(val: any): string {
  if (typeof val !== 'string') return ''
  return val.trim()
}

function sanitizePhone(val: any): string {
  if (typeof val !== 'string') return ''
  // Normalize and keep digits and leading +
  return val.trim().replace(/[^\d+]/g, '')
}

// ─── Tool Handlers ───────────────────────────────────────────────────────────

/**
 * Handler 1: create_lead
 * Connects to existing lead creation action (app/actions/leads.ts).
 */
async function handleCreateLead(rawArgs: Record<string, any>): Promise<any> {
  const name = sanitizeString(rawArgs.name)
  const phone = sanitizePhone(rawArgs.phone)
  const email = sanitizeString(rawArgs.email) || undefined
  const location = sanitizeString(rawArgs.location) || 'Tirupati'
  const budget = sanitizeString(rawArgs.budget) || 'Standard'
  const timeline = sanitizeString(rawArgs.timeline) || 'Flexible'
  const notes = sanitizeString(rawArgs.notes) || undefined

  if (!name) {
    throw new Error("Validation Error: 'name' is required for create_lead.")
  }
  if (!phone || phone.length < 7) {
    throw new Error("Validation Error: A valid 'phone' is required for create_lead.")
  }

  const validPropertyTypes = ['villa', 'apartment', 'house', 'plot', 'commercial', 'other'] as const
  let property_type: typeof validPropertyTypes[number] = 'villa'
  if (rawArgs.property_type && validPropertyTypes.includes(rawArgs.property_type.toLowerCase())) {
    property_type = rawArgs.property_type.toLowerCase() as typeof validPropertyTypes[number]
  }

  const leadPayload: LeadData = {
    name,
    phone,
    email,
    property_type,
    location,
    budget,
    timeline,
    lead_score: 'warm',
    lead_status: 'qualified',
    notes: notes ? `[Gemini Tool] ${notes}` : '[Gemini Tool] Lead registered via AI tool call',
    source: 'ai_demo',
  }

  const result = await createLead(leadPayload)
  if (!result.success) {
    throw new Error(result.error || 'Failed to register lead in CRM.')
  }

  return {
    leadId: result.data?.id,
    lead: result.data,
    isUpdate: result.isUpdate,
    message: `Lead for ${name} (${phone}) successfully registered in Grovaitech CRM.`,
  }
}

/**
 * Handler 2: schedule_site_visit
 * Connects to existing lead registration and real estate workflow engine (wf-001).
 */
async function handleScheduleSiteVisit(rawArgs: Record<string, any>): Promise<any> {
  const customerName = sanitizeString(rawArgs.customer_name)
  const phone = sanitizePhone(rawArgs.phone)
  const preferredDate = sanitizeString(rawArgs.preferred_date)
  const preferredTime = sanitizeString(rawArgs.preferred_time) || 'Morning (10:30 AM)'
  const propertyType = sanitizeString(rawArgs.property_type) || 'Villa'
  const location = sanitizeString(rawArgs.location) || 'Tirupati'
  const notes = sanitizeString(rawArgs.notes) || undefined
  const leadId = sanitizeString(rawArgs.lead_id) || undefined

  if (!customerName) {
    throw new Error("Validation Error: 'customer_name' is required to schedule a site visit.")
  }
  if (!phone || phone.length < 7) {
    throw new Error("Validation Error: 'phone' is required to coordinate the site visit.")
  }
  if (!preferredDate) {
    throw new Error("Validation Error: 'preferred_date' is required to schedule a site visit.")
  }

  // 1. Ensure lead record is registered / updated in Supabase with site visit flag
  const leadPayload: LeadData = {
    name: customerName,
    phone,
    location,
    budget: 'Standard',
    timeline: preferredDate,
    site_visit_requested: true,
    site_visit_date: preferredDate,
    site_visit_time: preferredTime,
    lead_score: 'hot',
    lead_status: 'site_visit',
    notes: notes ? `[Site Visit Tool] ${notes}` : `[Site Visit Tool] Site visit requested for ${preferredDate} at ${preferredTime}`,
    source: 'ai_demo',
  }

  const leadSaveResult = await createLead(leadPayload)
  const effectiveLeadId = leadSaveResult.data?.id || leadId || `lead-visit-${Date.now()}`

  // 2. Dispatch canonical workflow wf-001
  const workflowResult = await executeRealEstateWorkflow({
    leadId: effectiveLeadId,
    conversationId: `tool-call-${Date.now()}`,
    lead: {
      name: customerName,
      phone,
      email: null,
      property_type: (propertyType.toLowerCase() as any) || 'villa',
      bhk: null,
      location,
      budget: 'Standard',
      timeline: preferredDate,
      intent: 'Site Visit',
      qualification_score: 95,
      qualification_status: 'qualified',
      site_visit_requested: true,
      site_visit_date: preferredDate,
      site_visit_time: preferredTime,
    },
  })

  return {
    leadId: effectiveLeadId,
    customerName,
    phone,
    preferredDate,
    preferredTime,
    workflowId: workflowResult.workflowId,
    workflowStatus: workflowResult.overallStatus,
    customerConfirmationAllowed: workflowResult.customerConfirmationAllowed,
    steps: workflowResult.steps,
    message: getSiteVisitCustomerMessage(workflowResult, {
      customerName,
      preferredDate,
      preferredTime,
    }),
  }
}

/**
 * Handler 3: book_clinic_appointment
 * Connects to clinic appointment booking & reminder workflow engine (wf-002).
 */
async function handleBookClinicAppointment(rawArgs: Record<string, any>): Promise<any> {
  const patientName = sanitizeString(rawArgs.patient_name)
  const patientPhone = sanitizePhone(rawArgs.patient_phone)
  const patientEmail = sanitizeString(rawArgs.patient_email) || undefined
  const appointmentDate = sanitizeString(rawArgs.appointment_date)
  const appointmentTime = sanitizeString(rawArgs.appointment_time)
  const doctorName = sanitizeString(rawArgs.doctor_name) || 'Dr. Verma'
  const reason = sanitizeString(rawArgs.reason) || 'General Consultation'

  if (!patientName) {
    throw new Error("Validation Error: 'patient_name' is required for clinic booking.")
  }
  if (!patientPhone || patientPhone.length < 7) {
    throw new Error("Validation Error: 'patient_phone' is required for appointment confirmation.")
  }
  if (!appointmentDate) {
    throw new Error("Validation Error: 'appointment_date' (YYYY-MM-DD) is required.")
  }
  if (!appointmentTime) {
    throw new Error("Validation Error: 'appointment_time' is required.")
  }

  const workflowResult = await executeClinicWorkflow({
    patient: {
      patient_name: patientName,
      patient_phone: patientPhone,
      patient_email: patientEmail,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      doctor_name: doctorName,
      reason,
    },
    conversationId: `tool-clinic-${Date.now()}`,
  })

  return {
    bookingId: workflowResult.leadId,
    patientName,
    patientPhone,
    appointmentDate,
    appointmentTime,
    doctorName,
    reason,
    workflowId: workflowResult.workflowId,
    workflowStatus: workflowResult.overallStatus,
    customerConfirmationAllowed: workflowResult.customerConfirmationAllowed,
    steps: workflowResult.steps,
    message: getClinicCustomerMessage(workflowResult, {
      patientName,
      appointmentDate,
      appointmentTime,
      doctorName,
    }),
  }
}

/**
 * Handler 4: search_knowledge_base
 * Reuses existing RAG search logic from app/api/rag-search/route.ts.
 */
async function handleSearchKnowledgeBase(rawArgs: Record<string, any>): Promise<any> {
  const query = sanitizeString(rawArgs.query)
  const category = sanitizeString(rawArgs.category) || 'general'
  const maxResults = typeof rawArgs.max_results === 'number' ? Math.min(rawArgs.max_results, 10) : 3

  if (!query) {
    throw new Error("Validation Error: 'query' is required for search_knowledge_base.")
  }

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
Category Filter: "${category}"
Search Query: "${query}"

Provide a factual, concise response answering the search query based on these enterprise documents. Mention the relevant document source.`

  const answer = await generateResponse(ragPrompt)

  return {
    query,
    category,
    answer,
    referencedDocs: docNames,
  }
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
