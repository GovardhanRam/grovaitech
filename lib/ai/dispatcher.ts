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

  const isWhatsApp = rawArgs.source === 'whatsapp' || rawArgs.channel === 'whatsapp'
  const source = isWhatsApp ? ('whatsapp' as const) : ('ai_demo' as const)

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
    source,
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
          name,
          phone,
          property_type,
          location,
          budget,
          timeline,
          intent: sanitizeString(rawArgs.intent) || undefined,
          notes,
        },
      })
    } catch (wfErr) {
      console.warn('[handleCreateLead] wf-004 dispatch notice:', wfErr)
    }
  }

  const confirmationMessage = workflowResult
    ? getWhatsAppLeadCustomerMessage(workflowResult, { name, property_type, location })
    : `Lead for ${name} (${phone}) successfully registered in Grovaitech CRM.`

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

/**
 * Handler for 'escalate_to_human'
 */
async function handleEscalateToHuman(rawArgs: Record<string, any>) {
  const reason = sanitizeString(rawArgs.reason || 'General Customer Assistance', 200)
  const summary = sanitizeString(rawArgs.summary || 'Customer requested human assistance.', 500)
  const urgency = sanitizeString(rawArgs.urgency || 'medium', 20).toLowerCase()
  const customerName = sanitizeString(rawArgs.customer_name || rawArgs.name || '', 100)
  const phone = sanitizeString(rawArgs.phone || '', 30)
  const email = sanitizeString(rawArgs.email || '', 100)
  const conversationId = sanitizeString(rawArgs.conversation_id || rawArgs.chat_id || '', 100)

  if (!reason || reason.length < 3) {
    throw new Error("Validation Error: 'reason' must be at least 3 characters.")
  }
  if (!summary || summary.length < 5) {
    throw new Error("Validation Error: 'summary' must be at least 5 characters.")
  }

  const workflowRes = await executeSupportEscalationWorkflow({
    conversationId,
    escalation: {
      customer_name: customerName || undefined,
      reason,
      urgency,
      summary,
      phone: phone || undefined,
      email: email || undefined,
    },
  })

  const message = getEscalationCustomerMessage(workflowRes, {
    customerName: customerName || undefined,
    reason,
    urgency,
  })

  return {
    escalated: true,
    workflowId: workflowRes.workflowId,
    executionId: workflowRes.executionId,
    workflowStatus: workflowRes.overallStatus,
    reason,
    urgency,
    customerName: customerName || undefined,
    message,
    steps: workflowRes.steps,
  }
}

/**
 * Handler 6: book_salon_service
 * Connects to canonical salon workflow engine (wf-007).
 */
async function handleBookSalonService(rawArgs: Record<string, any>): Promise<any> {
  const clientName = sanitizeString(rawArgs.client_name || rawArgs.name, 100)
  const clientPhone = sanitizePhone(rawArgs.client_phone || rawArgs.phone)
  const clientEmail = sanitizeString(rawArgs.client_email || rawArgs.email, 100) || undefined
  const serviceName = sanitizeString(rawArgs.service_name || rawArgs.service, 150)
  const appointmentDate = sanitizeString(rawArgs.appointment_date || rawArgs.date, 50)
  const appointmentTime = sanitizeString(rawArgs.appointment_time || rawArgs.time, 50)
  const stylistPreference = sanitizeString(rawArgs.stylist_preference || rawArgs.stylist, 100) || undefined
  const notes = sanitizeString(rawArgs.notes, 500) || undefined
  const conversationId = sanitizeString(rawArgs.conversation_id || rawArgs.chat_id, 100)

  if (!clientName) {
    throw new Error("Validation Error: 'client_name' is required to book a salon appointment.")
  }
  if (!clientPhone || clientPhone.length < 7) {
    throw new Error("Validation Error: A valid 'client_phone' is required to book a salon appointment.")
  }
  if (!serviceName) {
    throw new Error("Validation Error: 'service_name' is required to book a salon appointment.")
  }
  if (!appointmentDate) {
    throw new Error("Validation Error: 'appointment_date' is required to book a salon appointment.")
  }
  if (!appointmentTime) {
    throw new Error("Validation Error: 'appointment_time' is required to book a salon appointment.")
  }

  const bookingId = `salon-bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

  const workflowRes = await executeSalonWorkflow({
    bookingId,
    conversationId,
    client: {
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      service_name: serviceName,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      stylist_preference: stylistPreference,
      notes,
    },
  })

  const message = getSalonCustomerMessage(workflowRes, {
    client_name: clientName,
    service_name: serviceName,
    appointment_date: appointmentDate,
    appointment_time: appointmentTime,
    stylist_preference: stylistPreference,
  })

  return {
    bookingId,
    workflowId: workflowRes.workflowId,
    executionId: workflowRes.executionId,
    workflowStatus: workflowRes.overallStatus,
    clientName,
    serviceName,
    appointmentDate,
    appointmentTime,
    stylistPreference,
    message,
    steps: workflowRes.steps,
  }
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

  const auditId = `qa-audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const summary = passed
    ? `Interaction passed quality rubric scoring ${overallScore}/100 with high adherence to truthfulness and company guidelines.`
    : `Interaction flagged with score ${overallScore}/100 due to ${violations.length} policy or quality deviations.`

  const workflowRes = await executeQaWorkflow({
    auditId,
    conversationId: chatId || '',
    audit: {
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
    },
  })

  const message = getQaAuditCustomerMessage(workflowRes, {
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
  })

  return {
    auditId,
    workflowId: workflowRes.workflowId,
    executionId: workflowRes.executionId,
    overallScore,
    passed,
    rubricBreakdown,
    strengths,
    violations,
    recommendations,
    summary,
    message,
    steps: workflowRes.steps,
  }
}

/**
 * Handler 8: book_legal_consultation
 * Connects to Legal Intake Workflow Engine (wf-006).
 */
async function handleBookLegalConsultation(rawArgs: Record<string, any>): Promise<any> {
  const client_name = sanitizeString(rawArgs.client_name)
  const client_phone = sanitizePhone(rawArgs.client_phone)
  const client_email = sanitizeString(rawArgs.client_email)
  const matter_summary = sanitizeString(rawArgs.matter_summary)
  const opposing_party = sanitizeString(rawArgs.opposing_party) || 'None'
  const preferred_date = sanitizeString(rawArgs.preferred_date)
  const preferred_time = sanitizeString(rawArgs.preferred_time)
  const notes = sanitizeString(rawArgs.notes) || undefined

  if (!client_name) {
    throw new Error("Validation Error: 'client_name' is required for legal consultation intake.")
  }
  if (!client_phone || client_phone.length < 7) {
    throw new Error("Validation Error: A valid 'client_phone' is required for legal consultation intake.")
  }
  if (!client_email || !client_email.includes('@')) {
    throw new Error("Validation Error: A valid 'client_email' is required for legal consultation intake.")
  }
  if (!matter_summary) {
    throw new Error("Validation Error: 'matter_summary' is required for legal consultation intake.")
  }
  if (!preferred_date) {
    throw new Error("Validation Error: 'preferred_date' is required for legal consultation intake.")
  }
  if (!preferred_time) {
    throw new Error("Validation Error: 'preferred_time' is required for legal consultation intake.")
  }

  const validPracticeAreas = [
    'corporate',
    'litigation',
    'family',
    'criminal',
    'real_estate',
    'employment',
    'ip',
    'other',
  ] as const
  const practiceAreaRaw = (rawArgs.practice_area || '').trim().toLowerCase()
  if (!validPracticeAreas.includes(practiceAreaRaw as any)) {
    throw new Error(
      `Validation Error: 'practice_area' must be one of: ${validPracticeAreas.join(', ')}.`
    )
  }
  const practice_area = practiceAreaRaw as typeof validPracticeAreas[number]

  const validUrgencies = ['routine', 'urgent', 'critical'] as const
  const urgencyRaw = (rawArgs.urgency || '').trim().toLowerCase()
  if (!validUrgencies.includes(urgencyRaw as any)) {
    throw new Error(`Validation Error: 'urgency' must be one of: ${validUrgencies.join(', ')}.`)
  }
  const urgency = urgencyRaw as typeof validUrgencies[number]

  const intakePayload: LegalIntakeData = {
    client_name,
    client_phone,
    client_email,
    practice_area,
    matter_summary,
    opposing_party,
    urgency,
    preferred_date,
    preferred_time,
    notes,
  }

  const intakeId = `legal-intake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const conversationId = sanitizeString(rawArgs.conversation_id || rawArgs.chat_id || '')

  const workflowResult = await executeLegalWorkflow({
    intakeId,
    conversationId,
    client: intakePayload,
  })

  const message = getLegalCustomerMessage(workflowResult, intakePayload)

  return {
    intakeId,
    workflowId: workflowResult.workflowId,
    executionId: workflowResult.executionId,
    client_name,
    client_phone,
    client_email,
    practice_area,
    matter_summary,
    opposing_party,
    urgency,
    preferred_date,
    preferred_time,
    conflict_status: intakePayload.conflict_status || 'clear',
    workflowStatus: workflowResult.overallStatus,
    customerConfirmationAllowed: workflowResult.customerConfirmationAllowed,
    message,
    steps: workflowResult.steps,
  }
}

/**
 * Handler 9: lookup_order_and_support
 * Connects to E-Commerce Order Tracking & Returns Pipeline (wf-008).
 */
async function handleLookupOrderAndSupport(rawArgs: Record<string, any>): Promise<any> {
  const order_id = sanitizeString(rawArgs.order_id)
  const customer_email = sanitizeString(rawArgs.customer_email) || undefined
  const customer_phone = sanitizePhone(rawArgs.customer_phone) || undefined
  const item_details = sanitizeString(rawArgs.item_details) || undefined
  const reason = sanitizeString(rawArgs.reason) || undefined
  const notes = sanitizeString(rawArgs.notes) || undefined

  if (!order_id || order_id.length < 3) {
    throw new Error("Validation Error: A valid 'order_id' (minimum 3 characters) is required for store support lookup.")
  }

  if (!customer_email && !customer_phone) {
    throw new Error("Validation Error: Please provide at least one contact method ('customer_email' or 'customer_phone') to authenticate and look up order details.")
  }

  const validActionTypes = ['track_order', 'return_request', 'exchange_request', 'cancel_request'] as const
  const actionRaw = (rawArgs.action_type || '').trim().toLowerCase()
  if (!validActionTypes.includes(actionRaw as any)) {
    throw new Error(`Validation Error: 'action_type' must be one of: ${validActionTypes.join(', ')}.`)
  }
  const action_type = actionRaw as typeof validActionTypes[number]

  const supportPayload: EcommerceSupportData = {
    order_id,
    customer_email,
    customer_phone,
    action_type,
    item_details,
    reason,
    notes,
  }

  const supportId = `ecom-supp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const conversationId = sanitizeString(rawArgs.conversation_id || rawArgs.chat_id || '')

  const workflowResult = await executeEcommerceWorkflow({
    supportId,
    conversationId,
    client: supportPayload,
  })

  const message = getEcommerceCustomerMessage(workflowResult, supportPayload)

  return {
    supportId,
    workflowId: workflowResult.workflowId,
    executionId: workflowResult.executionId,
    order_id,
    customer_email,
    customer_phone,
    action_type,
    order_status: supportPayload.order_status,
    tracking_number: supportPayload.tracking_number,
    carrier: supportPayload.carrier,
    estimated_delivery: supportPayload.estimated_delivery,
    eligibility_status: supportPayload.eligibility_status,
    workflowStatus: workflowResult.overallStatus,
    customerConfirmationAllowed: workflowResult.customerConfirmationAllowed,
    message,
    steps: workflowResult.steps,
  }
}

/**
 * Handler 10: schedule_onboarding_induction
 * Connects to Employee Onboarding Intake & Induction Pipeline (wf-009).
 */
async function handleScheduleOnboardingInduction(rawArgs: Record<string, any>): Promise<any> {
  const candidate_name = sanitizeString(rawArgs.candidate_name)
  const candidate_email = sanitizeString(rawArgs.candidate_email)
  const candidate_phone = sanitizePhone(rawArgs.candidate_phone)
  const role_title = sanitizeString(rawArgs.role_title)
  const joining_date = sanitizeString(rawArgs.joining_date)
  const preferred_induction_slot = sanitizeString(rawArgs.preferred_induction_slot)
  const notes = sanitizeString(rawArgs.notes) || undefined

  if (!candidate_name || candidate_name.length < 2) {
    throw new Error("Validation Error: 'candidate_name' must be at least 2 characters.")
  }

  if (!candidate_email || !candidate_email.includes('@')) {
    throw new Error("Validation Error: A valid 'candidate_email' is required for onboarding registration.")
  }

  if (!candidate_phone || candidate_phone.length < 8) {
    throw new Error("Validation Error: A valid 'candidate_phone' (minimum 8 digits) is required.")
  }

  if (!role_title || role_title.length < 2) {
    throw new Error("Validation Error: 'role_title' is required for employee onboarding.")
  }

  const validDepartments = ['engineering', 'product', 'sales', 'marketing', 'operations', 'finance', 'hr', 'other'] as const
  const deptRaw = (rawArgs.department || 'other').trim().toLowerCase()
  const department = validDepartments.includes(deptRaw as any) ? (deptRaw as typeof validDepartments[number]) : 'other'

  if (!joining_date) {
    throw new Error("Validation Error: 'joining_date' is required for onboarding coordination.")
  }

  if (!preferred_induction_slot) {
    throw new Error("Validation Error: 'preferred_induction_slot' is required to reserve an orientation session.")
  }

  const validDocStatuses = ['all_submitted', 'pending_documents', 'under_review'] as const
  const docStatusRaw = (rawArgs.document_status || 'all_submitted').trim().toLowerCase()
  const document_status = validDocStatuses.includes(docStatusRaw as any) ? (docStatusRaw as typeof validDocStatuses[number]) : 'all_submitted'

  const onboardingPayload: OnboardingIntakeData = {
    candidate_name,
    candidate_email,
    candidate_phone,
    role_title,
    department,
    joining_date,
    preferred_induction_slot,
    document_status,
    notes,
  }

  const intakeId = `hr-intake-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const conversationId = sanitizeString(rawArgs.conversation_id || rawArgs.chat_id || '')

  const workflowResult = await executeOnboardingWorkflow({
    intakeId,
    conversationId,
    client: onboardingPayload,
  })

  const message = getOnboardingCustomerMessage(workflowResult, onboardingPayload)

  return {
    intakeId,
    workflowId: workflowResult.workflowId,
    executionId: workflowResult.executionId,
    candidate_name,
    candidate_email,
    candidate_phone,
    role_title,
    department,
    joining_date,
    preferred_induction_slot,
    document_status,
    induction_status: onboardingPayload.induction_status || 'scheduled',
    orientation_room: onboardingPayload.orientation_room,
    workflowStatus: workflowResult.overallStatus,
    customerConfirmationAllowed: workflowResult.customerConfirmationAllowed,
    message,
    steps: workflowResult.steps,
  }
}

/**
 * Handler 11: book_financial_consultation
 * Connects to Financial Advisory Consultation & KYC Intake Pipeline (wf-010).
 */
async function handleBookFinancialConsultation(rawArgs: Record<string, any>): Promise<any> {
  const client_name = sanitizeString(rawArgs.client_name)
  const client_phone = sanitizePhone(rawArgs.client_phone)
  const client_email = sanitizeString(rawArgs.client_email)
  const amount_range = sanitizeString(rawArgs.amount_range)
  const annual_income = sanitizeString(rawArgs.annual_income) || undefined
  const preferred_date = sanitizeString(rawArgs.preferred_date)
  const preferred_time = sanitizeString(rawArgs.preferred_time)
  const notes = sanitizeString(rawArgs.notes) || undefined

  if (!client_name || client_name.length < 2) {
    throw new Error("Validation Error: 'client_name' must be at least 2 characters.")
  }

  if (!client_email || !client_email.includes('@')) {
    throw new Error("Validation Error: A valid 'client_email' is required for advisory booking.")
  }

  if (!client_phone || client_phone.length < 8) {
    throw new Error("Validation Error: A valid 'client_phone' (minimum 8 digits) is required.")
  }

  const validCategories = [
    'insurance',
    'home_loan',
    'personal_loan',
    'mutual_funds',
    'wealth_management',
    'retirement_planning',
    'tax_planning',
    'other',
  ] as const
  const categoryRaw = (rawArgs.product_category || 'other').trim().toLowerCase()
  const product_category = validCategories.includes(categoryRaw as any)
    ? (categoryRaw as typeof validCategories[number])
    : 'other'

  if (!amount_range || amount_range.length < 2) {
    throw new Error("Validation Error: 'amount_range' is required to qualify financial consultation scope.")
  }

  const validEmployment = ['salaried', 'self_employed', 'business_owner', 'retired', 'other'] as const
  const empRaw = (rawArgs.employment_type || 'other').trim().toLowerCase()
  const employment_type = validEmployment.includes(empRaw as any)
    ? (empRaw as typeof validEmployment[number])
    : 'other'

  if (!preferred_date) {
    throw new Error("Validation Error: 'preferred_date' is required for advisor consultation scheduling.")
  }

  if (!preferred_time) {
    throw new Error("Validation Error: 'preferred_time' is required for advisor consultation scheduling.")
  }

  const validKyc = ['verified', 'documents_pending', 'exempt'] as const
  const kycRaw = (rawArgs.kyc_status || 'verified').trim().toLowerCase()
  const kyc_status = validKyc.includes(kycRaw as any) ? (kycRaw as typeof validKyc[number]) : 'verified'

  const financialPayload: FinancialConsultationData = {
    client_name,
    client_phone,
    client_email,
    product_category,
    amount_range,
    employment_type,
    annual_income,
    kyc_status,
    preferred_date,
    preferred_time,
    notes,
  }

  const consultationId = `fin-consult-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const conversationId = sanitizeString(rawArgs.conversation_id || rawArgs.chat_id || '')

  const workflowResult = await executeFinancialWorkflow({
    consultationId,
    conversationId,
    client: financialPayload,
  })

  const message = getFinancialCustomerMessage(workflowResult, financialPayload)

  return {
    consultationId,
    workflowId: workflowResult.workflowId,
    executionId: workflowResult.executionId,
    client_name,
    client_phone,
    client_email,
    product_category,
    amount_range,
    employment_type,
    annual_income,
    kyc_status,
    preferred_date,
    preferred_time,
    assigned_advisor: financialPayload.assigned_advisor,
    meeting_mode: financialPayload.meeting_mode,
    workflowStatus: workflowResult.overallStatus,
    customerConfirmationAllowed: workflowResult.customerConfirmationAllowed,
    message,
    steps: workflowResult.steps,
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
