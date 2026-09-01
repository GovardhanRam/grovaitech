/**
 * Grovaitech AI Platform
 * lib/ai/tools.ts
 *
 * Typed Gemini Function Declarations & Tool Schemas for Grovaitech AI Workforce OS.
 * Strictly conforms to @google/generative-ai SDK SchemaType and FunctionDeclaration specifications.
 */

import { SchemaType, type FunctionDeclaration, type FunctionDeclarationsTool } from "@google/generative-ai"

// ─── Tool Parameter Interfaces ───────────────────────────────────────────────

export interface CreateLeadParams {
  name: string
  phone: string
  email?: string
  property_type?: 'villa' | 'apartment' | 'house' | 'plot' | 'commercial' | 'other'
  bhk?: number
  location?: string
  budget?: string
  timeline?: string
  intent?: string
  notes?: string
}

export interface ScheduleSiteVisitParams {
  customer_name: string
  phone: string
  preferred_date: string
  preferred_time?: string
  property_type?: string
  location?: string
  lead_id?: string
  notes?: string
}

export interface BookClinicAppointmentParams {
  patient_name: string
  patient_phone: string
  patient_email?: string
  appointment_date: string
  appointment_time: string
  doctor_name?: string
  reason?: string
}

export interface BookLegalConsultationParams {
  client_name: string
  client_phone: string
  client_email: string
  practice_area: 'corporate' | 'litigation' | 'family' | 'criminal' | 'real_estate' | 'employment' | 'ip' | 'other'
  matter_summary: string
  opposing_party: string
  urgency: 'routine' | 'urgent' | 'critical'
  preferred_date: string
  preferred_time: string
  notes?: string
}

export interface LookupOrderAndSupportParams {
  order_id: string
  customer_email?: string
  customer_phone?: string
  action_type: 'track_order' | 'return_request' | 'exchange_request' | 'cancel_request'
  item_details?: string
  reason?: string
  notes?: string
}

export interface ScheduleOnboardingInductionParams {
  candidate_name: string
  candidate_email: string
  candidate_phone: string
  role_title: string
  department: 'engineering' | 'product' | 'sales' | 'marketing' | 'operations' | 'finance' | 'hr' | 'other'
  joining_date: string
  preferred_induction_slot: string
  document_status?: 'all_submitted' | 'pending_documents' | 'under_review'
  notes?: string
}

export interface BookFinancialConsultationParams {
  client_name: string
  client_phone: string
  client_email: string
  product_category:
    | 'insurance'
    | 'home_loan'
    | 'personal_loan'
    | 'mutual_funds'
    | 'wealth_management'
    | 'retirement_planning'
    | 'tax_planning'
    | 'other'
  amount_range: string
  employment_type: 'salaried' | 'self_employed' | 'business_owner' | 'retired' | 'other'
  annual_income?: string
  kyc_status?: 'verified' | 'documents_pending' | 'exempt'
  preferred_date: string
  preferred_time: string
  notes?: string
}

export interface SearchKnowledgeBaseParams {
  query: string
  category?: string
  max_results?: number
}

// Re-export type alias for backwards compatibility
export type GeminiFunctionDeclaration = FunctionDeclaration
export type GeminiTool = FunctionDeclarationsTool

// ─── Tool Declarations (Conforming to @google/generative-ai SchemaType) ──────

export const CREATE_LEAD_TOOL: FunctionDeclaration = {
  name: 'create_lead',
  description: 'Creates and registers a newly qualified customer lead in the Grovaitech CRM database with contact details and property preferences.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: 'Full name of the customer or prospective lead.',
      },
      phone: {
        type: SchemaType.STRING,
        description: 'Primary contact phone number of the customer (e.g., +91 9876543210).',
      },
      email: {
        type: SchemaType.STRING,
        description: 'Email address of the customer if provided.',
      },
      property_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['villa', 'apartment', 'house', 'plot', 'commercial', 'other'],
        description: 'Type of real estate property the customer is interested in.',
      },
      bhk: {
        type: SchemaType.INTEGER,
        description: 'Number of bedrooms/BHK requested (e.g. 2, 3, 4).',
      },
      location: {
        type: SchemaType.STRING,
        description: 'Preferred city, locality, or neighborhood (e.g., Tirupati, Whitefield).',
      },
      budget: {
        type: SchemaType.STRING,
        description: 'Customer budget range or maximum budget (e.g., ₹75 Lakhs, 2 Crore).',
      },
      timeline: {
        type: SchemaType.STRING,
        description: 'Expected purchase or move-in timeline (e.g., Immediate, Within 3 Months).',
      },
      intent: {
        type: SchemaType.STRING,
        description: 'Primary intent (e.g., Self-use, Investment, Rental).',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Any additional special requests, amenities, or notes.',
      },
    },
    required: ['name', 'phone'],
  },
}

export const SCHEDULE_SITE_VISIT_TOOL: FunctionDeclaration = {
  name: 'schedule_site_visit',
  description: 'Records a customer request for an in-person property site visit and asks the workflow to attempt the necessary coordination. This request is not a confirmed booking unless the returned result explicitly reports verified completion.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      customer_name: {
        type: SchemaType.STRING,
        description: 'Full name of the customer attending the site visit.',
      },
      phone: {
        type: SchemaType.STRING,
        description: 'Contact phone number of the customer to coordinate the visit.',
      },
      preferred_date: {
        type: SchemaType.STRING,
        description: 'Requested date or day for the site visit (e.g., 2026-09-05, Saturday, This Weekend).',
      },
      preferred_time: {
        type: SchemaType.STRING,
        description: 'Preferred time slot for the site visit (e.g., 10:30 AM, Morning, Afternoon).',
      },
      property_type: {
        type: SchemaType.STRING,
        description: 'Type of property to visit (e.g., 3 BHK Villa, Luxury Apartment).',
      },
      location: {
        type: SchemaType.STRING,
        description: 'Location or project name of the property site.',
      },
      lead_id: {
        type: SchemaType.STRING,
        description: 'Existing Lead ID if already registered in the CRM.',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Special requests or notes for the site visit.',
      },
    },
    required: ['customer_name', 'phone', 'preferred_date'],
  },
}

export const BOOK_CLINIC_APPOINTMENT_TOOL: FunctionDeclaration = {
  name: 'book_clinic_appointment',
  description: 'Requests a patient medical or dental appointment with date, time, doctor preference, and reason for visit. Do not describe it as booked or confirmed unless the returned result explicitly verifies that outcome.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      patient_name: {
        type: SchemaType.STRING,
        description: 'Full name of the patient.',
      },
      patient_phone: {
        type: SchemaType.STRING,
        description: 'Contact phone number for appointment confirmation and reminders.',
      },
      patient_email: {
        type: SchemaType.STRING,
        description: 'Email address of the patient.',
      },
      appointment_date: {
        type: SchemaType.STRING,
        description: 'Appointment date in YYYY-MM-DD format (e.g., 2026-09-01).',
      },
      appointment_time: {
        type: SchemaType.STRING,
        description: 'Appointment time slot (e.g., 10:00 AM, 02:30 PM, 16:00).',
      },
      doctor_name: {
        type: SchemaType.STRING,
        description: 'Name of the requested doctor or specialist (e.g., Dr. Verma, Dr. Reddy).',
      },
      reason: {
        type: SchemaType.STRING,
        description: 'Reason for visit or chief medical complaint (e.g., Dental Checkup, Tooth Pain).',
      },
    },
    required: ['patient_name', 'patient_phone', 'appointment_date', 'appointment_time'],
  },
}

export const SEARCH_KNOWLEDGE_BASE_TOOL: FunctionDeclaration = {
  name: 'search_knowledge_base',
  description: 'Performs semantic RAG search across uploaded business documents, FAQs, clinic procedures, pricing lists, and policies.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: 'The search query or specific question to find answers for in the knowledge base.',
      },
      category: {
        type: SchemaType.STRING,
        description: 'Optional document category filter (e.g., real_estate_faqs, clinic_policies, pricing).',
      },
      max_results: {
        type: SchemaType.INTEGER,
        description: 'Maximum number of relevant document passages to return (default: 3).',
      },
    },
    required: ['query'],
  },
}

export const ESCALATE_TO_HUMAN_TOOL: FunctionDeclaration = {
  name: 'escalate_to_human',
  description: 'Escalates an active customer inquiry to an on-duty human support operator when the issue is complex, sensitive, unresolved, or explicitly requested by the customer.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      reason: {
        type: SchemaType.STRING,
        description: 'Specific reason for human escalation (e.g., Billing Dispute, Complex Technical Error, Explicit Human Request, High Frustration).',
      },
      summary: {
        type: SchemaType.STRING,
        description: 'Concise 1-2 sentence summary of the issue and context for the human agent.',
      },
      urgency: {
        type: SchemaType.STRING,
        description: 'Urgency level: low, medium, high, or critical (default: medium).',
      },
      customer_name: {
        type: SchemaType.STRING,
        description: 'Name of the customer requiring assistance.',
      },
      phone: {
        type: SchemaType.STRING,
        description: 'Contact phone number of the customer if provided.',
      },
      email: {
        type: SchemaType.STRING,
        description: 'Contact email address of the customer if provided.',
      },
    },
    required: ['reason', 'summary'],
  },
}

export const BOOK_SALON_SERVICE_TOOL: FunctionDeclaration = {
  name: 'book_salon_service',
  description: 'Books a salon or spa appointment with service type, date, time, stylist preference, and customer contact information. Do not describe it as booked or confirmed unless the returned result explicitly verifies that outcome.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      client_name: {
        type: SchemaType.STRING,
        description: 'Full name of the client booking the salon or spa service.',
      },
      client_phone: {
        type: SchemaType.STRING,
        description: 'Contact phone number of the client.',
      },
      client_email: {
        type: SchemaType.STRING,
        description: 'Email address of the client if provided.',
      },
      service_name: {
        type: SchemaType.STRING,
        description: 'Name of the requested salon or spa service (e.g., Haircut & Styling, Aromatherapy Massage, Bridal Makeup, Facial).',
      },
      appointment_date: {
        type: SchemaType.STRING,
        description: 'Requested date or day for the appointment (e.g., 2026-09-06, Tomorrow, Saturday).',
      },
      appointment_time: {
        type: SchemaType.STRING,
        description: 'Preferred appointment time slot (e.g., 11:00 AM, 3:30 PM, Morning).',
      },
      stylist_preference: {
        type: SchemaType.STRING,
        description: 'Preferred stylist, therapist, or aesthetician name if requested.',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Special requests, skin/hair sensitivities, or additional notes.',
      },
    },
    required: ['client_name', 'client_phone', 'service_name', 'appointment_date', 'appointment_time'],
  },
}

export const AUDIT_CONVERSATION_QUALITY_TOOL: FunctionDeclaration = {
  name: 'audit_conversation_quality',
  description: 'Evaluates an AI employee conversation transcript against quality, truthfulness, compliance, and safety rubrics. Produces an objective score (0-100), itemized rubric breakdown, detected violations, and actionable recommendations.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      chat_id: {
        type: SchemaType.STRING,
        description: 'Optional ID of an existing conversation in Supabase to fetch and evaluate.',
      },
      transcript: {
        type: SchemaType.STRING,
        description: 'Raw conversation text or multi-turn transcript to evaluate if not providing chat_id.',
      },
      rubric: {
        type: SchemaType.STRING,
        description: 'Evaluation rubric or focus mode: standard, compliance, sales, support, or hospitality (default: standard).',
      },
      focus_areas: {
        type: SchemaType.STRING,
        description: 'Specific aspects or policies to scrutinize (e.g., pricing truthfulness, hallucination check, refund policy).',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Optional audit notes or context for the quality inspector.',
      },
    },
  },
}

export const BOOK_LEGAL_CONSULTATION_TOOL: FunctionDeclaration = {
  name: 'book_legal_consultation',
  description: "Submits a prospective client's legal intake details, identifies practice area and opposing party for conflict checking, and schedules an attorney consultation request. Do not describe it as a confirmed appointment unless the returned result explicitly verifies that outcome.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      client_name: {
        type: SchemaType.STRING,
        description: 'Full name of the prospective client requesting legal consultation.',
      },
      client_phone: {
        type: SchemaType.STRING,
        description: 'Primary contact phone number of the client.',
      },
      client_email: {
        type: SchemaType.STRING,
        description: 'Contact email address of the client.',
      },
      practice_area: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['corporate', 'litigation', 'family', 'criminal', 'real_estate', 'employment', 'ip', 'other'],
        description: 'Primary practice area or type of legal inquiry.',
      },
      matter_summary: {
        type: SchemaType.STRING,
        description: 'Brief overview of the legal matter, question, or dispute.',
      },
      opposing_party: {
        type: SchemaType.STRING,
        description: 'Name of the adverse party, opposing individual, or company involved for conflict-of-interest screening (use "None" if purely transactional or not applicable).',
      },
      urgency: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['routine', 'urgent', 'critical'],
        description: 'Urgency level of the legal inquiry (e.g. routine, urgent, critical).',
      },
      preferred_date: {
        type: SchemaType.STRING,
        description: 'Requested date for the consultation in YYYY-MM-DD format (or relative day like Tomorrow, Next Monday).',
      },
      preferred_time: {
        type: SchemaType.STRING,
        description: 'Requested time slot for the consultation (e.g. 10:00 AM, 3:30 PM, Afternoon).',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Optional additional context or special intake notes.',
      },
    },
    required: [
      'client_name',
      'client_phone',
      'client_email',
      'practice_area',
      'matter_summary',
      'opposing_party',
      'urgency',
      'preferred_date',
      'preferred_time',
    ],
  },
}

export const LOOKUP_ORDER_AND_SUPPORT_TOOL: FunctionDeclaration = {
  name: 'lookup_order_and_support',
  description: 'Looks up e-commerce order details, tracks shipment logistics, and initiates return, exchange, or cancellation requests. Do not fabricate order existence or guarantee refunds without verified eligibility.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      order_id: {
        type: SchemaType.STRING,
        description: 'Store Order ID (e.g., #ORD-10492, GROV-88231).',
      },
      customer_email: {
        type: SchemaType.STRING,
        description: 'Customer email address associated with the order.',
      },
      customer_phone: {
        type: SchemaType.STRING,
        description: 'Customer contact phone number associated with the order.',
      },
      action_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['track_order', 'return_request', 'exchange_request', 'cancel_request'],
        description: 'Action to perform: track shipment, request return, request exchange, or cancel unfulfilled order.',
      },
      item_details: {
        type: SchemaType.STRING,
        description: 'Name, SKU, or description of the specific item being returned or queried.',
      },
      reason: {
        type: SchemaType.STRING,
        description: 'Customer-provided reason for return, exchange, or cancellation (e.g. Defective, Wrong Size, Changed Mind).',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Optional additional support notes or customer comments.',
      },
    },
    required: ['order_id', 'action_type'],
  },
}

export const SCHEDULE_ONBOARDING_INDUCTION_TOOL: FunctionDeclaration = {
  name: 'schedule_onboarding_induction',
  description:
    'Registers employee onboarding intake, validates document submission status, and reserves an induction orientation slot on the HR calendar. Do not fabricate orientation slots without candidate verification.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      candidate_name: {
        type: SchemaType.STRING,
        description: 'Full legal name of the new employee / candidate.',
      },
      candidate_email: {
        type: SchemaType.STRING,
        description: 'Candidate official or personal email address.',
      },
      candidate_phone: {
        type: SchemaType.STRING,
        description: 'Candidate primary contact phone number.',
      },
      role_title: {
        type: SchemaType.STRING,
        description: 'Job role or designation of the new hire (e.g., Software Engineer, Account Executive).',
      },
      department: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['engineering', 'product', 'sales', 'marketing', 'operations', 'finance', 'hr', 'other'],
        description: 'Department to which the employee is assigned.',
      },
      joining_date: {
        type: SchemaType.STRING,
        description: 'Official joining date (e.g., 2026-09-15, Next Monday).',
      },
      preferred_induction_slot: {
        type: SchemaType.STRING,
        description: 'Requested date/time for orientation induction (e.g., Monday 10:00 AM, Morning Batch).',
      },
      document_status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['all_submitted', 'pending_documents', 'under_review'],
        description: 'Status of mandatory onboarding documents (ID, Tax Forms, Bank Details, Degree).',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Optional additional onboarding remarks or equipment requests.',
      },
    },
    required: [
      'candidate_name',
      'candidate_email',
      'candidate_phone',
      'role_title',
      'department',
      'joining_date',
      'preferred_induction_slot',
    ],
  },
}

export const BOOK_FINANCIAL_CONSULTATION_TOOL: FunctionDeclaration = {
  name: 'book_financial_consultation',
  description:
    'Schedules a consultation with a certified financial advisor for insurance, loans, mutual funds, or wealth management. Validates customer KYC readiness without providing unregulated investment advice.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      client_name: {
        type: SchemaType.STRING,
        description: 'Full legal name of the prospective client.',
      },
      client_phone: {
        type: SchemaType.STRING,
        description: 'Primary contact phone number for consultation reminders.',
      },
      client_email: {
        type: SchemaType.STRING,
        description: 'Primary email address for meeting invitation and summary.',
      },
      product_category: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: [
          'insurance',
          'home_loan',
          'personal_loan',
          'mutual_funds',
          'wealth_management',
          'retirement_planning',
          'tax_planning',
          'other',
        ],
        description: 'Financial product category for the consultation.',
      },
      amount_range: {
        type: SchemaType.STRING,
        description: 'Estimated investment, coverage, or loan amount range (e.g. ₹50 Lakhs, ₹1 Crore, ₹5-10k/month).',
      },
      employment_type: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['salaried', 'self_employed', 'business_owner', 'retired', 'other'],
        description: 'Primary employment / income status of the client.',
      },
      annual_income: {
        type: SchemaType.STRING,
        description: 'Approximate annual income range (e.g. ₹15-25 LPA, ₹50L+).',
      },
      kyc_status: {
        type: SchemaType.STRING,
        format: 'enum',
        enum: ['verified', 'documents_pending', 'exempt'],
        description: 'Client KYC documentation readiness status (PAN, ID proof, Address proof).',
      },
      preferred_date: {
        type: SchemaType.STRING,
        description: 'Requested date for advisor consultation (e.g. 2026-09-18, Friday, Tomorrow).',
      },
      preferred_time: {
        type: SchemaType.STRING,
        description: 'Requested time slot (e.g. 11:00 AM, 3:30 PM, Evening).',
      },
      notes: {
        type: SchemaType.STRING,
        description: 'Optional additional financial goals or special consultation requests.',
      },
    },
    required: [
      'client_name',
      'client_phone',
      'client_email',
      'product_category',
      'amount_range',
      'employment_type',
      'preferred_date',
      'preferred_time',
    ],
  },
}

// ─── Tool Name Constants ────────────────────────────────────────────────────

export const TOOL_NAMES = {
  CREATE_LEAD: 'create_lead',
  SCHEDULE_SITE_VISIT: 'schedule_site_visit',
  BOOK_CLINIC_APPOINTMENT: 'book_clinic_appointment',
  SEARCH_KNOWLEDGE_BASE: 'search_knowledge_base',
  ESCALATE_TO_HUMAN: 'escalate_to_human',
  BOOK_SALON_SERVICE: 'book_salon_service',
  AUDIT_CONVERSATION_QUALITY: 'audit_conversation_quality',
  BOOK_LEGAL_CONSULTATION: 'book_legal_consultation',
  LOOKUP_ORDER_AND_SUPPORT: 'lookup_order_and_support',
  SCHEDULE_ONBOARDING_INDUCTION: 'schedule_onboarding_induction',
  BOOK_FINANCIAL_CONSULTATION: 'book_financial_consultation',
} as const

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES]

// ─── Authoritative Tool Registry ────────────────────────────────────────────

export const TOOL_REGISTRY: Record<ToolName, FunctionDeclaration> = {
  [TOOL_NAMES.CREATE_LEAD]: CREATE_LEAD_TOOL,
  [TOOL_NAMES.SCHEDULE_SITE_VISIT]: SCHEDULE_SITE_VISIT_TOOL,
  [TOOL_NAMES.BOOK_CLINIC_APPOINTMENT]: BOOK_CLINIC_APPOINTMENT_TOOL,
  [TOOL_NAMES.SEARCH_KNOWLEDGE_BASE]: SEARCH_KNOWLEDGE_BASE_TOOL,
  [TOOL_NAMES.ESCALATE_TO_HUMAN]: ESCALATE_TO_HUMAN_TOOL,
  [TOOL_NAMES.BOOK_SALON_SERVICE]: BOOK_SALON_SERVICE_TOOL,
  [TOOL_NAMES.AUDIT_CONVERSATION_QUALITY]: AUDIT_CONVERSATION_QUALITY_TOOL,
  [TOOL_NAMES.BOOK_LEGAL_CONSULTATION]: BOOK_LEGAL_CONSULTATION_TOOL,
  [TOOL_NAMES.LOOKUP_ORDER_AND_SUPPORT]: LOOKUP_ORDER_AND_SUPPORT_TOOL,
  [TOOL_NAMES.SCHEDULE_ONBOARDING_INDUCTION]: SCHEDULE_ONBOARDING_INDUCTION_TOOL,
  [TOOL_NAMES.BOOK_FINANCIAL_CONSULTATION]: BOOK_FINANCIAL_CONSULTATION_TOOL,
}

export const ALL_GROVAITECH_TOOLS: FunctionDeclaration[] = Object.values(TOOL_REGISTRY)

export const GROVAITECH_TOOLSET: FunctionDeclarationsTool = {
  functionDeclarations: ALL_GROVAITECH_TOOLS,
}

// ─── Grouped Tool Collections for AI Employee Personas ───────────────────────

export const REAL_ESTATE_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.create_lead,
  TOOL_REGISTRY.schedule_site_visit,
  TOOL_REGISTRY.search_knowledge_base,
]

export const CLINIC_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.book_clinic_appointment,
  TOOL_REGISTRY.search_knowledge_base,
]

export const SUPPORT_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.search_knowledge_base,
  TOOL_REGISTRY.escalate_to_human,
]

export const SALON_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.book_salon_service,
  TOOL_REGISTRY.search_knowledge_base,
]

export const QA_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.audit_conversation_quality,
  TOOL_REGISTRY.search_knowledge_base,
]

export const LEGAL_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.book_legal_consultation,
  TOOL_REGISTRY.search_knowledge_base,
  TOOL_REGISTRY.escalate_to_human,
]

export const ECOMMERCE_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.lookup_order_and_support,
  TOOL_REGISTRY.search_knowledge_base,
  TOOL_REGISTRY.escalate_to_human,
]

export const HR_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.schedule_onboarding_induction,
  TOOL_REGISTRY.search_knowledge_base,
  TOOL_REGISTRY.escalate_to_human,
]

export const FINANCIAL_TOOLS: FunctionDeclaration[] = [
  TOOL_REGISTRY.book_financial_consultation,
  TOOL_REGISTRY.search_knowledge_base,
  TOOL_REGISTRY.escalate_to_human,
]
