/**
 * Grovaitech AI Platform
 * lib/employees/registry.ts
 *
 * Canonical In-Memory Workforce Registry.
 * Single source of truth for AI Employee definitions, tool bindings, system prompts,
 * pricing, and operational capabilities across UI, runtime, and API channels.
 */

export interface AIEmployeePricing {
  monthly: number
  setup: number
}

export interface AIEmployeeDemoConfig {
  enabled: boolean
}

export interface AIEmployee {
  id: string
  name: string
  slug: string
  title: string
  department: string
  industry: string
  description: string
  status: 'live' | 'beta' | 'demo' | 'in_development' | 'planned'
  capabilities: string[]
  responsibilities: string[]
  integrations: string[]
  channels: string[]
  tools: string[]
  system_prompt: string
  pricing: AIEmployeePricing
  demo_config: AIEmployeeDemoConfig
  avatar_url: string | null
  version: string
  created_at: string
  updated_at: string
}

export const CANONICAL_EMPLOYEES: AIEmployee[] = [
  // ── LIVE & OPERATIONAL ───────────────────────────────────────────────────
  {
    id: 'emp-001',
    name: 'Real Estate Lead Receptionist',
    slug: 'real-estate-lead-receptionist',
    title: 'AI Real Estate Receptionist',
    department: 'Sales',
    industry: 'Real Estate',
    description:
      'Handles property enquiries via web chat and WhatsApp. Qualifies buyers and sellers, captures lead details (name, phone, budget, location, timeline), supports site-visit scheduling, and creates structured leads directly in the CRM.',
    status: 'live',
    capabilities: [
      'Lead qualification',
      'Budget capture',
      'Location capture',
      'Site-visit scheduling',
      'CRM lead creation',
      'Multi-turn conversation',
    ],
    responsibilities: [
      'Capture leads',
      'Qualify buyers/sellers',
      'Book site visits',
      'Follow up',
      'Escalate to agent',
    ],
    integrations: ['Supabase (live)', 'WhatsApp (live)', 'Google Calendar (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'WhatsApp'],
    tools: ['create_lead', 'schedule_site_visit', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite AI Real Estate Lead Receptionist for Grovaitech Real Estate.
Your goal is to warmly assist prospective property buyers, answer questions intelligently, and qualify them for a site visit.

**Core Objectives:**
1. Understand buyer preferences (Property Type, Location, BHK, Budget, Timeline).
2. If any critical info is missing, ask naturally and concisely in 1-2 sentences.
3. When the user wants to see properties or requests a visit (e.g. this weekend / Saturday / Sunday), ask for their name and phone number and use the 'schedule_site_visit' or 'create_lead' tool.
4. Keep answers friendly, highly professional, and helpful.`,
    pricing: { monthly: 5000, setup: 5000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-002',
    name: 'Clinic Receptionist',
    slug: 'clinic-receptionist',
    title: 'AI Medical Front-Desk',
    department: 'Operations',
    industry: 'Healthcare',
    description:
      'Handles patient appointment requests, answers clinic FAQs, and manages booking confirmations. Integrates with Google Calendar, Supabase clinic bookings, and sends appointment reminders via WhatsApp.',
    status: 'live',
    capabilities: [
      'Appointment booking',
      'Patient intake',
      'FAQ answering',
      'Reminder sending',
      'Doctor schedule lookup',
    ],
    responsibilities: [
      'Book appointments',
      'Answer clinic FAQs',
      'Confirm doctor slots',
      'Send reminder notifications',
    ],
    integrations: ['Google Calendar (live)', 'WhatsApp (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'WhatsApp (planned)'],
    tools: ['book_clinic_appointment', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite Medical & Dental Clinic AI Front-Desk Receptionist.
Your goal is to assist patients, answer inquiries regarding clinic hours/doctors, and book appointments using the 'book_clinic_appointment' tool.

**Clinic Information:**
- Hours: Mon - Sat: 9:00 AM - 6:00 PM (Closed Sundays)
- Doctors: Dr. Verma (General Dentistry), Dr. Reddy (Orthodontics)
- When patient provides name, phone, date, and time, invoke the 'book_clinic_appointment' tool.`,
    pricing: { monthly: 4000, setup: 4000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },

  // ── IN PROGRESS & PLANNED CATALOG ─────────────────────────────────────────
  {
    id: 'emp-003',
    name: 'WhatsApp Lead Agent',
    slug: 'whatsapp-lead-agent',
    title: 'AI WhatsApp Sales Agent',
    department: 'Sales',
    industry: 'General',
    description:
      'Responds to inbound WhatsApp messages 24/7, qualifies customer intent, collects contact information, and routes hot leads to human agents. Handles initial objections and answers product questions.',
    status: 'in_development',
    capabilities: ['WhatsApp integration', 'Lead scoring', 'Auto-routing', 'Objection handling'],
    responsibilities: ['Respond to messages', 'Qualify intent', 'Collect contact info', 'Route hot leads'],
    integrations: ['WhatsApp Business API (in progress)', 'Supabase'],
    channels: ['WhatsApp'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, an AI WhatsApp Sales Agent. Answer questions concisely and qualify leads.`,
    pricing: { monthly: 6000, setup: 3000 },
    demo_config: { enabled: false },
    avatar_url: null,
    version: '0.3.0',
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  },
  {
    id: 'emp-004',
    name: 'Salon & Spa Receptionist',
    slug: 'salon-spa-receptionist',
    title: 'AI Hospitality Receptionist',
    department: 'Operations',
    industry: 'Salons & Spas',
    description:
      'Books appointments for salon and spa services, answers service queries, sends reminders, and handles rescheduling. Reduces front-desk workload by handling routine booking interactions autonomously.',
    status: 'in_development',
    capabilities: ['Service booking', 'Rescheduling', 'Reminder sending', 'FAQ answering'],
    responsibilities: ['Book services', 'Reschedule appointments', 'Send reminders', 'Answer service queries'],
    integrations: ['Google Calendar (in progress)', 'WhatsApp (planned)'],
    channels: ['WhatsApp', 'Web Chat'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, a Salon & Spa Front-Desk Assistant. Help clients with service details and bookings.`,
    pricing: { monthly: 3500, setup: 3000 },
    demo_config: { enabled: false },
    avatar_url: null,
    version: '0.2.0',
    created_at: '2026-08-15T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  },
  {
    id: 'emp-005',
    name: 'Customer Support Agent',
    slug: 'customer-support-agent',
    title: 'AI Tier-1 Support Specialist',
    department: 'Customer Support',
    industry: 'General',
    description:
      'Handles tier-1 support queries using a RAG knowledge base, creates tickets for unresolved issues, and escalates to human agents with full conversation context and sentiment summary.',
    status: 'planned',
    capabilities: ['RAG knowledge base', 'Ticket creation', 'Escalation', 'Sentiment analysis'],
    responsibilities: ['Answer support queries', 'Resolve common issues', 'Create tickets', 'Escalate when needed'],
    integrations: ['Supabase', 'n8n Workflows (planned)', 'Email (planned)'],
    channels: ['Web Chat', 'Email', 'WhatsApp'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, a Tier-1 Customer Support Specialist. Assist users using our verified knowledge base.`,
    pricing: { monthly: 5500, setup: 4000 },
    demo_config: { enabled: false },
    avatar_url: null,
    version: '0.1.0',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  },
  {
    id: 'emp-006',
    name: 'AI QA Inspector',
    slug: 'ai-qa-inspector',
    title: 'AI Quality Assurance Specialist',
    department: 'Operations',
    industry: 'General',
    description:
      'Reviews conversation logs, scores AI Employee interactions against quality rubrics, flags non-compliant or harmful responses, and generates daily quality reports for the operations team.',
    status: 'planned',
    capabilities: ['Conversation scoring', 'Compliance checking', 'Report generation', 'Flag escalation'],
    responsibilities: ['Review logs', 'Score interactions', 'Flag non-compliance', 'Generate reports'],
    integrations: ['Supabase', 'n8n (planned)'],
    channels: ['Internal Dashboard'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, an AI QA and Quality Assurance Inspector.`,
    pricing: { monthly: 3500, setup: 2000 },
    demo_config: { enabled: false },
    avatar_url: null,
    version: '0.1.0',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  },
  {
    id: 'emp-007',
    name: 'Legal Intake Agent',
    slug: 'legal-intake-agent',
    title: 'AI Legal Inquiry Handler',
    department: 'Sales',
    industry: 'Law Firms',
    description:
      'Handles initial client inquiries for law firms. Qualifies case type, urgency, and jurisdiction. Collects client details, answers general legal process questions (without giving legal advice), and books consultation slots.',
    status: 'planned',
    capabilities: ['Case qualification', 'Client intake', 'Consultation booking', 'FAQ answering'],
    responsibilities: ['Qualify case inquiries', 'Collect client details', 'Book consultations', 'Answer process FAQs'],
    integrations: ['Google Calendar (planned)', 'WhatsApp (planned)', 'Supabase'],
    channels: ['Web Chat', 'WhatsApp', 'Email'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, a Legal Intake Assistant for law chambers. Do not provide legal advice; collect case intake details.`,
    pricing: { monthly: 7000, setup: 5000 },
    demo_config: { enabled: false },
    avatar_url: null,
    version: '0.1.0',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  },
  {
    id: 'emp-008',
    name: 'E-Commerce Support Agent',
    slug: 'ecommerce-support-agent',
    title: 'AI E-Commerce Assistant',
    department: 'Customer Support',
    industry: 'E-Commerce',
    description:
      'Handles order tracking, return requests, product questions, and shipping queries for e-commerce businesses. Integrates with order management systems to provide real-time order status.',
    status: 'planned',
    capabilities: ['Order tracking', 'Return handling', 'Product Q&A', 'Shipping queries'],
    responsibilities: ['Track orders', 'Process return requests', 'Answer product queries', 'Resolve shipping issues'],
    integrations: ['Shopify (planned)', 'WooCommerce (planned)', 'WhatsApp', 'Email'],
    channels: ['Web Chat', 'WhatsApp', 'Email'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, an E-Commerce Support Assistant. Help customers with order tracking and product FAQs.`,
    pricing: { monthly: 5000, setup: 3500 },
    demo_config: { enabled: false },
    avatar_url: null,
    version: '0.1.0',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  },
  {
    id: 'emp-009',
    name: 'HR Onboarding Agent',
    slug: 'hr-onboarding-agent',
    title: 'AI HR & Onboarding Specialist',
    department: 'Operations',
    industry: 'General',
    description:
      'Guides new employee onboarding by answering HR policy questions, collecting required documents, scheduling induction sessions, and tracking onboarding task completion — all through a conversational interface.',
    status: 'planned',
    capabilities: ['Policy Q&A', 'Document collection', 'Task tracking', 'Induction scheduling'],
    responsibilities: ['Answer HR queries', 'Collect documents', 'Schedule inductions', 'Track onboarding tasks'],
    integrations: ['Google Drive (planned)', 'Calendar (planned)', 'Slack (planned)'],
    channels: ['Web Chat', 'Email', 'Internal'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, an HR & Onboarding Assistant. Guide new team members through onboarding tasks and policies.`,
    pricing: { monthly: 4500, setup: 3000 },
    demo_config: { enabled: false },
    avatar_url: null,
    version: '0.1.0',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  },
  {
    id: 'emp-010',
    name: 'Financial Advisory Agent',
    slug: 'financial-advisory-agent',
    title: 'AI Financial Inquiry Handler',
    department: 'Sales',
    industry: 'Financial Services',
    description:
      'Handles initial inquiries for financial products (insurance, loans, investments). Qualifies customer intent, collects KYC data, answers product questions, and books advisor consultations. Fully compliant conversational intake — no advice given.',
    status: 'planned',
    capabilities: ['Product qualification', 'KYC data capture', 'Consultation booking', 'Compliance-safe FAQ'],
    responsibilities: ['Qualify financial inquiries', 'Capture KYC data', 'Book advisor calls', 'Answer product FAQs'],
    integrations: ['CRM (planned)', 'Calendar (planned)', 'WhatsApp', 'Email'],
    channels: ['Web Chat', 'WhatsApp', 'Email', 'Voice (planned)'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, a Financial Services Intake Assistant. Collect inquiry requirements without providing financial advice.`,
    pricing: { monthly: 8000, setup: 6000 },
    demo_config: { enabled: false },
    avatar_url: null,
    version: '0.1.0',
    created_at: '2026-12-01T00:00:00Z',
    updated_at: '2026-08-26T00:00:00Z',
  },
]

export function getCanonicalEmployees(): AIEmployee[] {
  return [...CANONICAL_EMPLOYEES]
}

export function getCanonicalEmployeeBySlug(slug: string): AIEmployee | undefined {
  if (!slug) return undefined
  const normalized = slug.trim().toLowerCase()
  return CANONICAL_EMPLOYEES.find((emp) => emp.slug.toLowerCase() === normalized)
}
