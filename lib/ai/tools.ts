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

// ─── Grouped Tool Collections for AI Employee Personas ───────────────────────

export const REAL_ESTATE_TOOLS: FunctionDeclaration[] = [
  CREATE_LEAD_TOOL,
  SCHEDULE_SITE_VISIT_TOOL,
  SEARCH_KNOWLEDGE_BASE_TOOL,
]

export const CLINIC_TOOLS: FunctionDeclaration[] = [
  BOOK_CLINIC_APPOINTMENT_TOOL,
  SEARCH_KNOWLEDGE_BASE_TOOL,
]

export const SUPPORT_TOOLS: FunctionDeclaration[] = [
  SEARCH_KNOWLEDGE_BASE_TOOL,
  ESCALATE_TO_HUMAN_TOOL,
]

export const ALL_GROVAITECH_TOOLS: FunctionDeclaration[] = [
  CREATE_LEAD_TOOL,
  SCHEDULE_SITE_VISIT_TOOL,
  BOOK_CLINIC_APPOINTMENT_TOOL,
  SEARCH_KNOWLEDGE_BASE_TOOL,
  ESCALATE_TO_HUMAN_TOOL,
]

export const GROVAITECH_TOOLSET: FunctionDeclarationsTool = {
  functionDeclarations: ALL_GROVAITECH_TOOLS,
}

// ─── Tool Name Constants ────────────────────────────────────────────────────

export const TOOL_NAMES = {
  CREATE_LEAD: 'create_lead',
  SCHEDULE_SITE_VISIT: 'schedule_site_visit',
  BOOK_CLINIC_APPOINTMENT: 'book_clinic_appointment',
  SEARCH_KNOWLEDGE_BASE: 'search_knowledge_base',
  ESCALATE_TO_HUMAN: 'escalate_to_human',
} as const

export type ToolName = typeof TOOL_NAMES[keyof typeof TOOL_NAMES]
