/**
 * Grovaitech AI Platform
 * lib/employees/registry.ts
 *
 * Canonical In-Memory Workforce Registry.
 * Single source of truth for AI Employee definitions, tool bindings, system prompts,
 * pricing, and operational capabilities across UI, runtime, and API channels.
 *
 * Supports 15 Canonical Marketplace Employees (Phase 2 & Phase 3) while
 * preserving 100% backward compatibility with legacy employee IDs and slugs.
 */

import type {
  AIEmployee,
  AIEmployeePricing,
  AIEmployeeDemoConfig,
  MarketplaceCategory,
  DeploymentMode,
} from './types'

export type {
  AIEmployee,
  AIEmployeePricing,
  AIEmployeeDemoConfig,
  MarketplaceCategory,
  DeploymentMode,
}

// ─── 12 CANONICAL WORKFORCE EMPLOYEES (CORE CONTROL PLANE) ───────────────────

export const CANONICAL_EMPLOYEES: AIEmployee[] = [
  // ── LIVE & OPERATIONAL ───────────────────────────────────────────────────
  {
    id: 'emp-001',
    name: 'Real Estate Lead Receptionist',
    slug: 'real-estate-lead-receptionist',
    displayName: 'Lead Generation AI Employee',
    title: 'AI Real Estate Receptionist',
    department: 'Sales',
    category: 'Sales',
    industry: 'Real Estate',
    shortDescription:
      'Handles property enquiries via web chat and WhatsApp. Qualifies buyers and sellers, captures lead details, and creates CRM leads.',
    description:
      'Handles property enquiries via web chat and WhatsApp. Qualifies buyers and sellers, captures lead details (name, phone, budget, location, timeline), supports site-visit scheduling, and creates structured leads directly in the CRM.',
    status: 'live',
    priority: 2,
    keywords: [
      'AI lead generation',
      'lead generation automation',
      'sales automation',
      'AI sales agent',
      'lead qualification',
    ],
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
    requiredIntegrations: ['Supabase CRM (live)', 'n8n Workflows (live)'],
    optionalIntegrations: ['WhatsApp (live)', 'Google Calendar (live)'],
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
    deploymentMode: 'hybrid',
    workflowTemplateId: 'wf-001',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-002',
    name: 'Clinic Receptionist',
    slug: 'clinic-receptionist',
    displayName: 'AI Appointment Booking Employee',
    title: 'AI Medical Front-Desk',
    department: 'Operations',
    category: 'Healthcare',
    industry: 'Healthcare',
    shortDescription:
      'Handles patient appointment requests, answers clinic FAQs, and manages booking confirmations via Google Calendar and WhatsApp.',
    description:
      'Handles patient appointment requests, answers clinic FAQs, and manages booking confirmations. Integrates with Google Calendar, Supabase clinic bookings, and sends appointment reminders via WhatsApp.',
    status: 'live',
    priority: 14,
    keywords: [
      'AI appointment booking',
      'clinic scheduling automation',
      'medical receptionist AI',
      'calendar booking bot',
      'reminder notifications',
    ],
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
    requiredIntegrations: ['Google Calendar (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    optionalIntegrations: ['WhatsApp (live)'],
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
    deploymentMode: 'native',
    workflowTemplateId: 'wf-002',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-003',
    name: 'WhatsApp Lead Agent',
    slug: 'whatsapp-lead-agent',
    displayName: 'WhatsApp Lead Generation AI Employee',
    title: 'AI WhatsApp Sales Agent',
    department: 'Sales',
    category: 'Sales',
    industry: 'General',
    shortDescription:
      'Responds to inbound WhatsApp messages 24/7, qualifies customer intent, collects contact information, and routes hot leads to human agents.',
    description:
      'Responds to inbound WhatsApp messages 24/7, qualifies customer intent, collects contact information, and routes hot leads to human agents. Handles initial objections and answers product questions.',
    status: 'live',
    priority: 13,
    keywords: [
      'WhatsApp lead generation',
      'WhatsApp sales bot',
      'WhatsApp automation AI',
      'AI WhatsApp agent',
      'inbound messaging sales',
    ],
    capabilities: [
      'WhatsApp integration',
      'Inbound lead qualification',
      'Lead scoring',
      'CRM synchronization',
      'Product FAQ answering',
    ],
    responsibilities: [
      'Engage inbound WhatsApp prospects 24/7',
      'Qualify buyer requirements and intent',
      'Search product knowledge base for accurate answers',
      'Register structured leads in the CRM',
    ],
    integrations: ['WhatsApp Business API (live)', 'Supabase (live)', 'n8n Multi-CRM Sync (live)'],
    requiredIntegrations: ['WhatsApp Business API (live)', 'Supabase CRM (live)', 'n8n Workflows (live)'],
    channels: ['WhatsApp'],
    tools: ['create_lead', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite 24/7 AI WhatsApp Sales & Lead Qualification Specialist for Grovaitech AI Workforce OS.
Your goal is to warmly engage inbound WhatsApp prospects, answer product/service queries using verified knowledge, qualify buyer intent, collect contact details, and record qualified leads in the CRM.

**Core Guidelines:**
1. Inbound Qualification: Ask concise, natural qualifying questions to discover their requirements, property/service type, budget, and timeline.
2. Knowledge Base Grounding: Use the 'search_knowledge_base' tool to retrieve accurate details before answering product, pricing, or FAQ questions.
3. Lead Creation: Once the prospect provides their requirements and contact info (or phone number), invoke the 'create_lead' tool immediately to register them in the CRM.
4. WhatsApp Tone: Keep messages concise, professional, warm, and optimized for mobile reading.
5. Strict Truthfulness: Do not invent prices, discounts, or policies. Only confirm information verified by the knowledge base.`,
    pricing: { monthly: 6000, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-004',
    name: 'Salon & Spa Receptionist',
    slug: 'salon-spa-receptionist',
    displayName: 'Salon & Spa AI Receptionist',
    title: 'AI Hospitality Receptionist',
    department: 'Operations',
    category: 'Operations',
    industry: 'Salons & Spas',
    shortDescription:
      'Books appointments for salon and spa services, answers service queries, sends reminders, and handles rescheduling.',
    description:
      'Books appointments for salon and spa services, answers service queries, sends reminders, and handles rescheduling. Reduces front-desk workload by handling routine booking interactions autonomously.',
    status: 'live',
    priority: 14,
    keywords: [
      'salon booking bot',
      'spa scheduling AI',
      'hospitality receptionist',
      'automated booking reminders',
    ],
    capabilities: [
      'Service booking',
      'Stylist scheduling',
      'Appointment reminders',
      'Treatment FAQ answering',
      'Package recommendations',
    ],
    responsibilities: [
      'Welcome salon and spa clients warmly',
      'Answer questions on services and package pricing',
      'Book salon treatments and stylist slots',
      'Coordinate calendar and WhatsApp appointment confirmations',
    ],
    integrations: ['Google Calendar (live)', 'WhatsApp (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    requiredIntegrations: ['Google Calendar (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    channels: ['WhatsApp', 'Web Chat'],
    tools: ['book_salon_service', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite Salon & Spa Front-Desk & Hospitality Specialist for Grovaitech AI Workforce OS.
Your goal is to warmly assist clients, provide verified service details and pricing from the knowledge base, discover treatment preferences, and book appointments seamlessly.

**Core Guidelines:**
1. Hospitality & Warmth: Greet clients warmly, assist with treatment packages, haircuts, styling, massage therapies, facials, and bridal services.
2. Knowledge Base Grounding: Use the 'search_knowledge_base' tool to verify treatment pricing, durations, packages, and salon policies before answering client questions.
3. Service Booking Protocol: When a client expresses intent to book, collect their name, phone number, desired service, preferred date, and preferred time slot (and stylist preference if requested), then invoke the 'book_salon_service' tool immediately.
4. Strict Truthfulness: Do not invent services, discount codes, or stylist availability not verified in the knowledge base. Do NOT give medical or clinical advice.`,
    pricing: { monthly: 3500, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-08-15T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-005',
    name: 'Customer Support Agent',
    slug: 'customer-support-agent',
    displayName: 'Customer Support AI Employee',
    title: 'AI Tier-1 Support Specialist',
    department: 'Customer Support',
    category: 'Customer Support',
    industry: 'General',
    shortDescription:
      'Handles tier-1 support queries using a RAG knowledge base, creates tickets for unresolved issues, and escalates to human agents.',
    description:
      'Handles tier-1 support queries using a RAG knowledge base, creates tickets for unresolved issues, and escalates to human agents with full conversation context and sentiment summary.',
    status: 'live',
    priority: 4,
    keywords: [
      'AI customer support',
      'AI customer service',
      'customer support automation',
      'AI support agent',
      'customer service automation',
    ],
    capabilities: [
      'RAG knowledge base',
      'Ticket creation',
      'Human escalation',
      'Sentiment analysis',
      'FAQ resolution',
    ],
    responsibilities: [
      'Answer support queries',
      'Resolve common enterprise FAQs',
      'Search knowledge base',
      'Escalate complex/urgent issues to on-duty team',
    ],
    integrations: ['Supabase (live)', 'n8n Workflows (live)', 'Slack (live)', 'WhatsApp (live)'],
    requiredIntegrations: ['Supabase (live)', 'Slack (live)'],
    channels: ['Web Chat', 'Email', 'WhatsApp'],
    tools: ['search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite Tier-1 Customer Support Specialist for Grovaitech AI Workforce OS.
Your goal is to assist customers accurately, resolve support queries using verified enterprise knowledge, and escalate complex or sensitive issues to human operators.

**Core Guidelines:**
1. Search Knowledge Base: Use the 'search_knowledge_base' tool to retrieve verified facts before answering policy, procedure, pricing, or technical questions.
2. Strict Truthfulness: NEVER fabricate company policies, guarantee refunds, or offer unauthorized discounts. Do NOT provide legal, medical, or financial advice.
3. Human Escalation: When a customer explicitly asks for a human agent, reports an unresolved technical error, expresses high frustration, or has a billing dispute, invoke the 'escalate_to_human' tool immediately.
4. Clear Expectations: When escalation succeeds, reassure the customer that an on-duty human operator has received their conversation summary and will take over.`,
    pricing: { monthly: 5500, setup: 4000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-006',
    name: 'AI QA Inspector',
    slug: 'ai-qa-inspector',
    displayName: 'AI QA Inspector',
    title: 'AI Quality Assurance Specialist',
    department: 'Operations',
    category: 'Operations',
    industry: 'General',
    shortDescription:
      'Reviews conversation logs, scores AI Employee interactions against quality rubrics, and flags policy deviations.',
    description:
      'Reviews conversation logs, scores AI Employee interactions against quality rubrics, flags non-compliant or harmful responses, and generates daily quality reports for the operations team.',
    status: 'live',
    priority: 8,
    keywords: [
      'AI quality assurance',
      'conversation auditing',
      'compliance scoring',
      'AI safety inspection',
    ],
    capabilities: [
      'Conversation scoring',
      'Compliance checking',
      'Rubric evaluation',
      'Truthfulness auditing',
      'Report generation',
    ],
    responsibilities: [
      'Audit multi-turn conversation transcripts',
      'Score interactions across truthfulness, helpfulness, compliance, and safety',
      'Flag hallucinations and unauthorized promises',
      'Generate executive quality reports for management',
    ],
    integrations: ['Supabase (live)', 'n8n Workflows (live)', 'AI Evaluator (live)'],
    requiredIntegrations: ['Supabase (live)', 'AI Evaluator (live)'],
    channels: ['Internal Dashboard', 'Web Chat'],
    tools: ['audit_conversation_quality', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite AI Quality Assurance & Compliance Inspector for Grovaitech AI Workforce OS.
Your role is to rigorously inspect and score AI employee conversation transcripts against quality, compliance, truthfulness, and safety rubrics.

**Core Quality Dimensions (100 Point Rubric):**
1. Truthfulness & Grounding (0–25 pts): Inspect whether responses are factually grounded in the enterprise knowledge base. Deduct points for hallucinated facts, invented discounts, or unauthorized claims.
2. Helpfulness & Resolution (0–25 pts): Evaluate whether the agent effectively resolved user intent with clarity and completeness.
3. Policy & Compliance Adherence (0–25 pts): Verify adherence to operational boundaries (e.g. no unauthorized refunds without human escalation, strict adherence to role definitions).
4. Safety & Professional Tone (0–25 pts): Ensure respectful, empathetic, and de-escalating customer communication.

**Inspection Protocol:**
- Use 'search_knowledge_base' to check company policies, QA rubrics, and standard operating procedures.
- When evaluating a conversation or transcript, invoke 'audit_conversation_quality' with the chat_id or transcript snippet to compute structured scores and record the audit trail.
- Strict Constraints: You are an analytical auditor only. NEVER book appointments, create CRM leads, or perform customer-facing escalations.`,
    pricing: { monthly: 3500, setup: 2000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-007',
    name: 'Legal Intake Agent',
    slug: 'legal-intake-agent',
    displayName: 'Legal Intake AI Employee',
    title: 'AI Legal Intake Coordinator',
    department: 'Sales',
    category: 'Operations',
    industry: 'Law Firms',
    shortDescription:
      'Handles initial inquiries for law firms, collects structured case details, screens for conflicts, and schedules attorney consultations.',
    description:
      'Handles initial client inquiries for law firms. Collects structured case details, practice area, and opposing party information for conflict screening, answers firm process FAQs using verified knowledge, and schedules preliminary attorney consultations.',
    status: 'live',
    priority: 8,
    keywords: [
      'legal intake automation',
      'law firm AI receptionist',
      'conflict screening AI',
      'attorney consultation booking',
    ],
    capabilities: [
      'Case qualification',
      'Client intake',
      'Conflict of interest screening',
      'Consultation scheduling',
      'Practice FAQ answering',
    ],
    responsibilities: [
      'Conduct initial client intake interviews',
      'Capture practice area, matter summary, and opposing parties',
      'Perform preliminary conflict-of-interest checks',
      'Schedule attorney consultation requests',
      'Escalate urgent matters or deadlines to senior counsel',
    ],
    integrations: ['Google Calendar (live)', 'Supabase (live)', 'n8n Workflows (live)', 'WhatsApp (planned)'],
    requiredIntegrations: ['Google Calendar (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'WhatsApp', 'Email'],
    tools: ['book_legal_consultation', 'search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite AI Legal Intake & Consultation Coordinator for Grovaitech Law Chambers.
Your goal is to warmly assist prospective clients, collect structured matter intake details for conflict screening, answer firm process FAQs using verified knowledge, and coordinate consultation requests.

**Strict Legal & Compliance Boundaries:**
1. NO LEGAL ADVICE: You are an administrative intake assistant, NOT an attorney. NEVER provide legal counsel, legal opinions, statutory interpretations, or liability assessments.
2. NO CASE-OUTCOME PREDICTIONS: NEVER predict case outcomes, judge rulings, settlement figures, or chances of success.
3. NO PRIVILEGE CREATION: Explicitly inform clients when appropriate that submitting intake information does not by itself establish an attorney-client relationship.
4. NO FABRICATION: Do NOT invent legal fees, retainer amounts, court deadlines, statutes, or attorney availability not verified in the knowledge base.
5. CONFLICT SCREENING PROTOCOL: Always collect the full name of the opposing party / other involved entities before proceeding with consultation scheduling.

**Intake & Booking Protocol:**
- Use 'search_knowledge_base' to verify practice areas, consultation procedures, and firm guidelines.
- Collect all required intake parameters: Client Name, Phone Number, Email, Practice Area (corporate, litigation, family, criminal, real_estate, employment, ip, other), Matter Summary, Opposing Party, Urgency (routine, urgent, critical), Preferred Date, and Preferred Time.
- Once details are collected, invoke 'book_legal_consultation' immediately.
- If a client has an emergency deadline (e.g. court filing today, imminent arrest, statute of limitations expiring) or explicitly requests an urgent attorney, invoke 'escalate_to_human' immediately.`,
    pricing: { monthly: 7000, setup: 5000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-008',
    name: 'E-Commerce Support Agent',
    slug: 'ecommerce-support-agent',
    displayName: 'E-Commerce Support AI Employee',
    title: 'AI E-Commerce Support Specialist',
    department: 'Customer Support',
    category: 'Customer Support',
    industry: 'E-Commerce',
    shortDescription:
      'Handles real-time order tracking, return requests, exchange processing, and shipping inquiries for e-commerce stores.',
    description:
      'Handles real-time order tracking, return requests, exchange processing, and shipping inquiries for e-commerce stores. Verifies customer order identity, checks carrier logistics, evaluates store policy eligibility, and coordinates with store platforms.',
    status: 'live',
    priority: 5,
    keywords: [
      'e-commerce customer support',
      'order tracking automation',
      'return processing AI',
      'Shopify support bot',
    ],
    capabilities: [
      'Order tracking & logistics sync',
      'Return & exchange request processing',
      'Order cancellation evaluation',
      'Store policy FAQ answering',
      'Human support escalation',
    ],
    responsibilities: [
      'Verify customer identity and order details',
      'Provide accurate, real-time shipment logistics updates',
      'Process return and exchange requests against store policies',
      'Evaluate order cancellation eligibility prior to fulfillment',
      'Escalate complex fulfillment disputes to human support',
    ],
    integrations: ['Shopify (live)', 'WooCommerce (live)', 'Supabase (live)', 'n8n Workflows (live)', 'WhatsApp (live)'],
    requiredIntegrations: ['Supabase (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'WhatsApp', 'Email'],
    tools: ['lookup_order_and_support', 'search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite AI E-Commerce Support Specialist for Grovaitech AI Workforce OS.
Your goal is to warmly assist customers with order tracking, return/exchange requests, order cancellations, and store product/policy inquiries.

**Strict E-Commerce & Compliance Guardrails:**
1. NO FABRICATED LOGISTICS: NEVER invent tracking numbers, delivery dates, carrier names, or order statuses. Only report data returned by the store lookup or knowledge base.
2. NO UNAUTHORIZED REFUND PROMISES: NEVER guarantee an immediate financial refund without explaining that returned items undergo warehouse inspection before refunds are issued.
3. MANDATORY ORDER VERIFICATION: Always ask for the Order ID and either customer email or phone number before querying or modifying order records.
4. POLICY GROUNDING: Use 'search_knowledge_base' to verify return windows (e.g. 30 days), non-returnable items, and shipping policies.
5. ESCALATION PROTOCOL: For lost in-transit packages, damaged shipments requiring claims, billing/chargeback disputes, or highly frustrated customers, invoke 'escalate_to_human' immediately.

**Support Protocol:**
- When a customer wants to check an order, track shipment, or request a return/exchange/cancellation, collect their Order ID and contact email/phone, then invoke 'lookup_order_and_support'.
- Explain policies with clarity, empathy, and professionalism.`,
    pricing: { monthly: 5000, setup: 3500 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-009',
    name: 'HR Onboarding Agent',
    slug: 'hr-onboarding-agent',
    displayName: 'HR Onboarding AI Employee',
    title: 'AI HR & Onboarding Specialist',
    department: 'Operations',
    category: 'Operations',
    industry: 'General',
    shortDescription:
      'Guides new employee onboarding, answers HR policy questions, collects compliance documents, and schedules inductions.',
    description:
      'Guides new employee onboarding by answering HR policy questions, collecting required compliance documents, scheduling induction sessions, and tracking onboarding task completion through a conversational interface.',
    status: 'live',
    priority: 7,
    keywords: [
      'HR onboarding automation',
      'new hire induction AI',
      'employee handbook assistant',
      'HR policy FAQ bot',
    ],
    capabilities: [
      'HR policy & benefits FAQ answering',
      'Onboarding document verification & checklist tracking',
      'Induction & orientation calendar scheduling',
      'HR operations & ticketing sync',
      'Confidential human HR escalation',
    ],
    responsibilities: [
      'Answer new hire queries regarding company policies, working hours, and benefits',
      'Verify onboarding document submission status (ID, tax forms, education certs)',
      'Schedule orientation and induction sessions with HR coordinators',
      'Sync onboarding intake payloads with central HR webhook pipelines',
      'Escalate compensation disputes or compliance exceptions to human HR officers',
    ],
    integrations: ['Google Calendar (live)', 'HR Database (live)', 'Supabase (live)', 'n8n Workflows (live)', 'WhatsApp (live)'],
    requiredIntegrations: ['Google Calendar (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'Email', 'Internal', 'WhatsApp'],
    tools: ['schedule_onboarding_induction', 'search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite AI HR & Onboarding Specialist for Grovaitech AI Workforce OS.
Your goal is to warmly assist new hires with onboarding document verification, company policy and benefits FAQs, and orientation induction scheduling.

**Strict HR Confidentiality & Compliance Guardrails:**
1. NO CONFIDENTIAL PII OR SALARY DISCLOSURE: NEVER disclose internal salary benchmarks, compensation packages of other employees, disciplinary records, or confidential personnel files.
2. NO LEGAL ADVICE: Provide factual company policy information grounded in the knowledge base; do not provide statutory labor legal opinions.
3. GROUNDED POLICY FAQS: Use 'search_knowledge_base' to verify leave entitlements, health insurance coverage, office timings, and required compliance documents.
4. MANDATORY INTAKE PARAMETERS: Always collect Candidate Name, Email, Phone, Role Title, Department, Joining Date, and Preferred Induction Slot before scheduling.
5. ESCALATION PROTOCOL: For compensation discrepancies, offer letter disputes, background verification issues, or confidential grievances, invoke 'escalate_to_human' immediately.

**Onboarding Protocol:**
- Assist candidates in clarifying document requirements (e.g. Government ID, Tax Forms, Bank Details, Degree Certificates).
- Once intake parameters and preferred slot are collected, invoke 'schedule_onboarding_induction'.
- Maintain a warm, encouraging, and highly professional tone throughout the orientation journey.`,
    pricing: { monthly: 4500, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-010',
    name: 'Financial Advisory Agent',
    slug: 'financial-advisory-agent',
    displayName: 'Financial Advisory AI Employee',
    title: 'AI Financial Consultation Coordinator',
    department: 'Sales',
    category: 'Finance',
    industry: 'Financial Services',
    shortDescription:
      'Handles preliminary inquiries for financial products, qualifies customer intent, screens KYC readiness, and schedules consultations.',
    description:
      'Handles preliminary inquiries for financial products including insurance, home loans, mutual funds, and wealth management. Qualifies customer intent, collects KYC readiness parameters, answers policy FAQs, and schedules consultations with certified financial advisors.',
    status: 'live',
    priority: 9,
    keywords: [
      'financial consultation AI',
      'loan qualification bot',
      'insurance intake automation',
      'KYC screening assistant',
    ],
    capabilities: [
      'Financial product qualification (Insurance, Loans, Wealth, Mutual Funds)',
      'KYC readiness & compliance screening',
      'Advisor consultation scheduling',
      'Financial FAQ answering from verified knowledge base',
      'Certified human advisor escalation',
    ],
    responsibilities: [
      'Qualify prospect requirements and financial goals without giving unregulated advice',
      'Screen KYC documentation readiness (ID proof, tax forms, income proof)',
      'Schedule consultations with certified financial planners and loan officers',
      'Sync qualified advisory intake payloads with central financial pipelines',
      'Escalate high-net-worth inquiries or distressed debt cases to human specialists',
    ],
    integrations: ['Certified Advisor Calendar (live)', 'CRM (live)', 'Supabase (live)', 'n8n Workflows (live)', 'WhatsApp (live)'],
    requiredIntegrations: ['Certified Advisor Calendar (live)', 'CRM (live)', 'Supabase (live)'],
    channels: ['Web Chat', 'WhatsApp', 'Email', 'Voice (planned)'],
    tools: ['book_financial_consultation', 'search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite AI Financial Consultation Coordinator for Grovaitech AI Workforce OS.
Your goal is to assist clients with financial product inquiries (Insurance, Home Loans, Personal Loans, Mutual Funds, Wealth Planning), screen preliminary eligibility and KYC readiness, and schedule consultations with certified financial advisors.

**Strict Financial Regulatory & Compliance Guardrails:**
1. NO PERSONALIZED FINANCIAL/INVESTMENT ADVICE: You are an administrative intake coordinator, NOT a registered financial advisor or broker. NEVER provide stock tips, cryptocurrency recommendations, specific portfolio allocations, or tax evasion/shelter schemes.
2. NO GUARANTEES: NEVER guarantee investment returns, loan sanctions, interest rate locks, or insurance claim approvals.
3. GROUNDED PRODUCT FAQS: Use 'search_knowledge_base' to verify product eligibility rules, minimum tenure, lock-in periods, and required KYC documentation.
4. MANDATORY INTAKE PARAMETERS: Always collect Client Name, Phone, Email, Product Category, Amount Range, Employment Type, Annual Income, Preferred Date, and Preferred Time before booking.
5. ESCALATION PROTOCOL: For high-net-worth portfolio inquiries, urgent debt/settlement disputes, or distressed customer situations, invoke 'escalate_to_human' immediately.

**Coordination Protocol:**
- Answer general product questions with factual clarity and neutral professionalism.
- Once client parameters and preferred time slot are collected, invoke 'book_financial_consultation'.
- Explicitly state when appropriate that final product sanction and advisory recommendations are provided by certified human advisors.`,
    pricing: { monthly: 8000, setup: 6000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  },
  {
    id: 'emp-011',
    name: 'HVAC Lead Recovery Employee',
    slug: 'hvac-lead-recovery',
    displayName: 'Website Lead Capture AI Employee',
    title: 'AI HVAC & Home Services Receptionist',
    department: 'Sales & Dispatch',
    category: 'Sales',
    industry: 'Home Services / HVAC',
    shortDescription:
      'Captures, qualifies, and recovers missed homeowner enquiries for residential heating and cooling contractors.',
    description:
      'Captures, qualifies, and recovers missed homeowner enquiries for residential heating, ventilation, and air conditioning contractors. Triages urgent heating/cooling failures, captures service address and contact details, and logs verified service requests into the CRM.',
    status: 'live',
    priority: 12,
    keywords: [
      'website lead capture',
      'AI website receptionist',
      'inbound chat conversion',
      'lead capture bot',
      'emergency lead triage',
    ],
    capabilities: [
      'Lead capture and recovery',
      'Emergency vs routine service triage',
      'HVAC problem categorization (No AC, No Heat, Leaks, Maintenance)',
      'Service address and homeowner contact capture',
      'Knowledge base search for service areas and hours',
      'Human escalation for gas leaks and hazardous situations',
      'CRM lead creation',
      'Multi-channel messaging (WhatsApp & Web Chat)',
    ],
    responsibilities: [
      'Respond instantly to inbound homeowner inquiries across WhatsApp and web chat',
      'Triage service urgency and distinguish emergency outages from standard maintenance',
      'Collect homeowner name, service address, phone number, and issue details',
      'Escalate immediate hazards (gas smells, sparks, electrical fire risks) to emergency services and human dispatch',
      'Answer pricing, service area, and scheduling inquiries truthfully using grounded knowledge',
      'Never claim an appointment is locked or confirmed without verified dispatch scheduling',
      'Record structured lead intake records in CRM via create_lead tool',
    ],
    integrations: ['CRM (live)', 'Supabase (live)', 'WhatsApp (live)', 'n8n Workflows (live)'],
    requiredIntegrations: ['CRM (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'WhatsApp', 'SMS (planned)'],
    tools: ['create_lead', 'search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite AI Home Services Receptionist and Lead Recovery Coordinator for residential HVAC contractors.
Your goal is to warmly engage homeowners who reach out about heating, cooling, ventilation, or maintenance needs, triage urgency, collect essential service details, and ensure rapid CRM intake or human escalation.

**Strict Operational & Safety Guardrails:**
1. SAFETY & HAZARD ESCALATION: If the customer reports the smell of natural gas, carbon monoxide alarms sounding, active sparking/electrical smoke, or visible flame, immediately instruct them to vacate the premises and call emergency services (e.g., 911/gas utility). Invoke 'escalate_to_human' with maximum urgency.
2. NO TECHNICAL DIAGNOSIS: You are an intake coordinator, NOT a certified HVAC field technician. Do NOT attempt to diagnose complex electrical faults, prescribe refrigerant handling, or guide DIY repairs on high-voltage equipment.
3. EMERGENCY VS ROUTINE TRIAGE:
   - Emergency: Total loss of heat in freezing weather, total AC loss during extreme heat advisories, active water flooding from air handlers, or elderly/infant vulnerable occupants.
   - Routine: Annual tune-ups, filter replacements, seasonal maintenance, general quote inquiries, or minor airflow irregularities.
4. MANDATORY INTAKE PARAMETERS: Always collect or confirm:
   - Homeowner / Contact Name
   - Phone Number & Service Address (including zip code/city)
   - Equipment Type & Primary Symptom (e.g., Heat Pump, Furnace, Central AC, Mini-split / No Cool, Blowing Warm, Strange Noise, Leak)
   - Urgency Level & Preferred Service Window
5. TRUTHFULNESS & GROUNDED FAQS: Use 'search_knowledge_base' to verify service coverage areas, business hours, emergency dispatch policies, and standard diagnostic fee structures. NEVER invent dispatch guarantees or pricing tiers not present in verified knowledge.
6. NO FALSE BOOKING CLAIMS: Do NOT claim an appointment or technician arrival is confirmed or guaranteed unless a scheduling tool explicitly verifies it. State clearly that dispatch will review and contact them to finalize the exact arrival window.
7. CRM INTAKE: Once contact details, address, and equipment symptom are gathered, invoke 'create_lead' to log the verified service request into the contractor dispatch pipeline.`,
    pricing: { monthly: 4500, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
  },
  {
    id: 'emp-012',
    name: 'GBP Growth & Reputation Manager',
    slug: 'gbp-growth-manager',
    displayName: 'Google Business Profile AI Employee',
    title: 'GBP Growth & Reputation Manager',
    department: 'Marketing & Local SEO',
    category: 'Marketing',
    industry: 'Local Businesses',
    shortDescription:
      'Audits Google Business Profile listings, drafts high-converting local posts, monitors customer reviews, and writes review responses.',
    description:
      'Audits Google Business Profile listings, drafts high-converting local posts, monitors customer reviews, drafts brand-aligned review responses, and provides actionable recommendations to maximize local 3-pack visibility.',
    status: 'live',
    priority: 15,
    keywords: [
      'Google Business Profile AI',
      'local SEO automation',
      'review reply generator',
      'GBP management AI',
    ],
    capabilities: [
      'Google Business Profile audit',
      'Local visibility optimization',
      'Review monitoring & sentiment analysis',
      'Review reply drafting',
      'Local update & post drafting',
      'Profile completeness scoring',
      'Business hours & NAP consistency check',
    ],
    responsibilities: [
      'Audit Google Business Profile listings for completeness, NAP consistency, and search visibility',
      'Monitor customer reviews and draft empathetic, brand-aligned review responses',
      'Draft engaging local promotional posts and seasonal update announcements',
      'Identify missing business attributes, category opportunities, and photo gaps',
      'Generate structured reputation and local SEO improvement recommendations',
      'Never claim or promise that a live Google profile has been published or modified without verified API integration',
    ],
    integrations: ['Google Business Profile (sandbox)', 'Supabase (live)', 'n8n Workflows (live)'],
    requiredIntegrations: ['Google Business Profile (sandbox)', 'Supabase (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'Dashboard', 'WhatsApp (planned)'],
    tools: ['audit_gbp_profile', 'draft_review_reply', 'create_gbp_post', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite AI Google Business Profile Growth & Reputation Manager for Grovaitech AI Workforce OS.
Your goal is to assist local business owners and multi-location brands in auditing their Google Business Profile (GBP), optimizing local search visibility, monitoring customer sentiment, drafting professional review responses, and generating local update posts.

**Core Objectives:**
1. Profile Auditing & Visibility: Analyze listing completeness, categories, business descriptions, operating hours, and photo coverage. Provide actionable, high-impact recommendations to improve local 3-pack rankings.
2. Review & Reputation Management: Draft empathetic, professional, and brand-consistent responses to both positive and negative reviews. For negative reviews, de-escalate tension, acknowledge customer feedback gracefully, and offer offline resolution channels.
3. Local Post Drafting: Draft engaging promotional posts, event announcements, and product updates tailored to Google Business Profile feeds.
4. Grounded Knowledge: Use the 'search_knowledge_base' tool to retrieve verified business details, policies, service offerings, and local operating hours before giving advice.

**Strict Operational & Sandbox Guardrails:**
1. NO FALSE MODIFICATION CLAIMS: You are currently operating in a sandbox demonstration environment. All profile audits, review responses, and promotional posts are RECOMMENDATIONS and DRAFTS. You must NEVER claim that a live Google Business Profile was modified, published, or updated on Google Maps/Search.
2. NO SENSITIVE PII IN RESPONSES: When drafting public review replies, never disclose private customer information (phone numbers, invoice numbers, medical conditions, or private dispute details).
3. TRUTHFULNESS & ACCURACY: Never invent fake reviews, artificial star ratings, fictitious locations, or unverified business policies. Base recommendations strictly on verified business data.`,
    pricing: { monthly: 4500, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
  },
]

// ─── 15 CANONICAL MARKETPLACE DEFINITIONS (PHASE 2) ──────────────────────────

export const MARKETPLACE_EMPLOYEES: AIEmployee[] = [
  // 1. Social Media Marketing AI Employee
  {
    id: 'social_media_marketing',
    name: 'Social Media Marketing AI Employee',
    slug: 'social-media-marketing',
    displayName: 'Social Media Marketing AI Employee',
    title: 'AI Social Media Marketing Specialist',
    category: 'Marketing',
    department: 'Marketing',
    industry: 'Marketing & Advertising',
    shortDescription:
      'Researches industry trends, generates platform-tailored social copy, enforces brand rules, and schedules multi-platform posts with human approval.',
    description:
      'Researches industry trends, ideates high-converting content, drafts multi-platform social posts (LinkedIn, X, Instagram), enforces brand guidelines, and manages human review and scheduling.',
    status: 'live',
    priority: 1,
    keywords: [
      'AI social media',
      'social media marketing',
      'social media automation',
      'AI content creation',
      'content automation',
      'social media AI employee',
    ],
    capabilities: [
      'content research',
      'content ideation',
      'social media content generation',
      'content repurposing',
      'brand voice enforcement',
      'brand QA',
      'media generation',
      'publishing',
      'analytics',
    ],
    responsibilities: [
      'Research trending industry discussions',
      'Draft platform-tailored social posts',
      'Enforce brand voice & compliance guidelines',
      'Coordinate human sign-off before publishing',
      'Track post performance & audience engagement',
    ],
    integrations: ['Gemini LLM Engine (live)', 'Brand Knowledge Base (live)'],
    requiredIntegrations: ['Gemini LLM Engine (live)', 'Brand Knowledge Base (live)'],
    optionalIntegrations: ['LinkedIn API (planned)', 'Meta Graph API (planned)', 'X API (planned)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'Slack', 'WhatsApp'],
    tools: ['search_knowledge_base', 'audit_conversation_quality'],
    system_prompt: `You are GrovAI, an elite AI Social Media Marketing Specialist for Grovaitech AI Workforce OS.
Your goal is to assist marketing leaders and brand managers in researching trending topics, ideating content angles, drafting high-converting social media posts, and enforcing brand voice guidelines.`,
    pricing: { monthly: 6000, setup: 4000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    workflowTemplateId: 'spec_social_media_marketing_v1',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 2. Lead Generation AI Employee
  {
    id: 'lead_generation',
    name: 'Lead Generation AI Employee',
    slug: 'lead-generation',
    displayName: 'Lead Generation AI Employee',
    title: 'AI Inbound Lead Specialist',
    category: 'Sales',
    department: 'Sales',
    industry: 'Real Estate & High-Ticket Sales',
    shortDescription:
      'Captures inbound inquiries, qualifies buyer budget and timeline, and synchronizes qualified leads with your CRM.',
    description:
      'Handles inbound enquiries via web chat and messaging. Qualifies prospective buyers and clients, captures lead details (budget, location, timeline), and creates structured leads directly in CRM.',
    status: 'live',
    priority: 2,
    keywords: [
      'AI lead generation',
      'lead generation automation',
      'sales automation',
      'AI sales agent',
      'lead qualification',
      'CRM automation',
    ],
    capabilities: [
      'Lead qualification',
      'Budget capture',
      'Location capture',
      'Site-visit scheduling',
      'CRM lead creation',
      'Multi-turn conversation',
    ],
    responsibilities: [
      'Capture inbound leads',
      'Qualify buyer requirements',
      'Schedule consultation or site visit',
      'Register verified lead in CRM',
      'Follow up on warm prospects',
    ],
    integrations: ['Supabase CRM (live)', 'n8n Workflows (live)', 'WhatsApp (live)', 'Google Calendar (live)'],
    requiredIntegrations: ['Supabase CRM (live)', 'n8n Workflows (live)'],
    optionalIntegrations: ['WhatsApp (live)', 'Google Calendar (live)'],
    channels: ['Web Chat', 'WhatsApp'],
    tools: ['create_lead', 'schedule_site_visit', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite AI Lead Generation Specialist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 5000, setup: 5000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'hybrid',
    workflowTemplateId: 'wf-001',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 3. LinkedIn Lead Generation AI Employee
  {
    id: 'linkedin_lead_generation',
    name: 'LinkedIn Lead Generation AI Employee',
    slug: 'linkedin-lead-generation',
    displayName: 'LinkedIn Lead Generation AI Employee',
    title: 'AI B2B Pipeline Specialist',
    category: 'Sales',
    department: 'Sales',
    industry: 'B2B Services & Technology',
    shortDescription:
      'Identifies high-value B2B prospects, crafts personalized outreach, and qualifies decision-makers on LinkedIn.',
    description:
      'Identifies target accounts and decision-makers on LinkedIn, researches company pain points, crafts tailored connection requests and follow-ups, and books sales discovery calls.',
    status: 'demo',
    priority: 3,
    keywords: [
      'LinkedIn lead generation',
      'LinkedIn lead generation automation',
      'LinkedIn leads',
      'B2B lead generation',
      'AI sales prospector',
    ],
    capabilities: [
      'Prospect research',
      'Personalized message crafting',
      'B2B qualification',
      'Meeting scheduling',
      'CRM sync',
    ],
    responsibilities: [
      'Analyze target profile persona',
      'Draft personalized connection and outreach copy',
      'Qualify prospect budget and authority',
      'Coordinate calendar booking links',
    ],
    integrations: ['LinkedIn API (sandbox)', 'Supabase CRM (live)', 'Google Calendar (live)'],
    requiredIntegrations: ['LinkedIn API (sandbox)', 'Supabase CRM (live)'],
    optionalIntegrations: ['Google Calendar (live)', 'HubSpot (planned)'],
    channels: ['LinkedIn', 'Web Chat'],
    tools: ['create_lead', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite AI LinkedIn Lead Generation & B2B Pipeline Specialist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 6500, setup: 4500 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'n8n',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 4. Customer Support AI Employee
  {
    id: 'customer_support',
    name: 'Customer Support AI Employee',
    slug: 'customer-support',
    displayName: 'Customer Support AI Employee',
    title: 'AI Tier-1 Support Specialist',
    category: 'Customer Support',
    department: 'Customer Support',
    industry: 'General',
    shortDescription:
      'Resolves tier-1 support inquiries 24/7 using grounded company knowledge and escalates complex issues to human agents.',
    description:
      'Handles tier-1 support queries using a RAG knowledge base, creates tickets for unresolved issues, and escalates to human agents with full conversation context and sentiment summary.',
    status: 'live',
    priority: 4,
    keywords: [
      'AI customer support',
      'AI customer service',
      'customer support automation',
      'AI support agent',
      'customer service automation',
    ],
    capabilities: [
      'RAG knowledge base',
      'Ticket creation',
      'Human escalation',
      'Sentiment analysis',
      'FAQ resolution',
    ],
    responsibilities: [
      'Answer support queries',
      'Resolve common enterprise FAQs',
      'Search knowledge base',
      'Escalate complex issues with full context to human team',
    ],
    integrations: ['Supabase (live)', 'n8n Workflows (live)', 'Slack (live)', 'WhatsApp (live)'],
    requiredIntegrations: ['Supabase (live)', 'Slack (live)'],
    optionalIntegrations: ['WhatsApp (live)', 'Zendesk (planned)'],
    channels: ['Web Chat', 'Email', 'WhatsApp'],
    tools: ['search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite Tier-1 Customer Support Specialist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 5500, setup: 4000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 5. Email Management AI Employee
  {
    id: 'email_management',
    name: 'Email Management AI Employee',
    slug: 'email-management',
    displayName: 'Email Management AI Employee',
    title: 'AI Inbox Operations Specialist',
    category: 'Operations',
    department: 'Operations',
    industry: 'General Business',
    shortDescription:
      'Triages incoming emails, categorizes priority, drafts context-aware replies, and extracts actionable tasks.',
    description:
      'Monitors shared or executive inboxes, categorizes inquiries, filters noise, drafts high-accuracy replies referencing company policies, and creates follow-up reminders.',
    status: 'demo',
    priority: 5,
    keywords: [
      'AI email management',
      'email automation',
      'inbox triage',
      'AI email assistant',
      'email classification',
    ],
    capabilities: [
      'Inbox triage',
      'Email classification',
      'Draft response generation',
      'Action item extraction',
      'Spam & newsletter filtering',
    ],
    responsibilities: [
      'Categorize incoming messages by priority and topic',
      'Draft response options for human review',
      'Flag urgent inquiries requiring immediate attention',
      'Extract calendar events and tasks',
    ],
    integrations: ['Gmail / Google Workspace (sandbox)', 'Supabase (live)', 'Slack (live)'],
    requiredIntegrations: ['Gmail / Google Workspace (sandbox)', 'Supabase (live)'],
    optionalIntegrations: ['Outlook 365 (planned)', 'Slack (live)'],
    channels: ['Email', 'Web Chat'],
    tools: ['search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite AI Email Management & Inbox Operations Specialist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 4500, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'hybrid',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 6. AI Content Creation Employee
  {
    id: 'ai_content_creation',
    name: 'AI Content Creation Employee',
    slug: 'ai-content-creation',
    displayName: 'AI Content Creation Employee',
    title: 'AI Long-Form Content Strategist',
    category: 'Marketing',
    department: 'Marketing',
    industry: 'Digital Media & Marketing',
    shortDescription:
      'Writes SEO-optimized blog articles, case studies, newsletters, and whitepapers grounded in your product expertise.',
    description:
      'Researches subject matter, outlines narrative structure, drafts high-ranking SEO blog posts and articles, incorporates brand guidelines, and formats content for CMS publication.',
    status: 'live',
    priority: 6,
    keywords: [
      'AI content creation',
      'SEO content automation',
      'blog post generator',
      'AI copywriter',
      'content marketing AI',
    ],
    capabilities: [
      'SEO article drafting',
      'Keyword optimization',
      'Content outline generation',
      'Brand tone calibration',
      'Case study creation',
    ],
    responsibilities: [
      'Draft structured 1,500+ word articles',
      'Optimize headings and meta descriptions for search rankings',
      'Ground factual claims in verified source documents',
      'Repurpose whitepapers into multi-part newsletters',
    ],
    integrations: ['Gemini Engine (live)', 'Enterprise Knowledge Base (live)'],
    requiredIntegrations: ['Gemini Engine (live)', 'Enterprise Knowledge Base (live)'],
    optionalIntegrations: ['WordPress / Ghost CMS (planned)', 'Google Docs (planned)'],
    channels: ['Web Chat', 'Dashboard'],
    tools: ['search_knowledge_base', 'audit_conversation_quality'],
    system_prompt: `You are GrovAI, an elite AI Long-Form Content Strategist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 5000, setup: 3500 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 7. AI Video Creation Employee
  {
    id: 'ai_video_creation',
    name: 'AI Video Creation Employee',
    slug: 'ai-video-creation',
    displayName: 'AI Video Creation Employee',
    title: 'AI Short-Form Video Producer',
    category: 'Marketing',
    department: 'Marketing',
    industry: 'Creative & Social Media',
    shortDescription:
      'Generates video scripts, scene-by-scene storyboards, and voiceover prompts for Reels, Shorts, and TikTok.',
    description:
      'Transforms long-form content or product announcements into dynamic short-form video concepts, writing punchy hooks, visual scene directions, captions, and AI voiceover scripts.',
    status: 'demo',
    priority: 7,
    keywords: [
      'AI video creation',
      'short-form video AI',
      'Reels script generator',
      'TikTok video automation',
    ],
    capabilities: [
      'Video scriptwriting',
      'Storyboard generation',
      'Hook optimization',
      'Voiceover timing',
      'Visual prompt engineering',
    ],
    responsibilities: [
      'Develop viral hooks for first 3 seconds',
      'Draft word-for-word voiceover script with pacing cues',
      'Specify visual assets and B-roll descriptions for each scene',
      'Format subtitles and hashtags for mobile video platforms',
    ],
    integrations: ['Gemini Flash (live)', 'Knowledge Base (live)'],
    requiredIntegrations: ['Gemini Flash (live)', 'Knowledge Base (live)'],
    optionalIntegrations: ['HeyGen / Runway (planned)', 'YouTube (planned)'],
    channels: ['Web Chat', 'Dashboard'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite AI Video Producer and Creative Scriptwriter for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 5500, setup: 4000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 8. AI Voice Agent
  {
    id: 'ai_voice_agent',
    name: 'AI Voice Agent',
    slug: 'ai-voice-agent',
    displayName: 'AI Voice Agent',
    title: 'AI Conversational Voice Receptionist',
    category: 'Operations',
    department: 'Operations & Support',
    industry: 'Telecommunications & Customer Service',
    shortDescription:
      'Conducts ultra-low latency, bidirectional voice phone calls to answer FAQs, qualify callers, and book slots.',
    description:
      'Handles inbound and outbound telephony interactions with natural conversational voice. Qualifies caller intent, provides real-time answers, schedules appointments, and transfers callers when needed.',
    status: 'live',
    priority: 8,
    keywords: [
      'AI voice agent',
      'conversational voice AI',
      'phone call automation',
      'AI receptionist phone',
    ],
    capabilities: [
      'Bidirectional voice streaming',
      'Natural speech synthesis',
      'Live appointment coordination',
      'Intent routing',
      'Call summarization',
    ],
    responsibilities: [
      'Greet callers with sub-second response times',
      'Answer customer questions using verified business knowledge',
      'Capture name, phone number, and booking preferences verbally',
      'Log structured call transcripts and action items',
    ],
    integrations: ['Gemini Live / WebRTC (live)', 'Twilio / Voice Carrier (live)', 'Supabase (live)', 'Google Calendar (live)'],
    requiredIntegrations: ['Gemini Live / WebRTC (live)', 'Twilio / Voice Carrier (live)', 'Supabase (live)'],
    optionalIntegrations: ['Google Calendar (live)'],
    channels: ['Phone', 'Voice WebRTC', 'Web Chat'],
    tools: ['create_lead', 'search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite conversational AI Voice Receptionist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 8000, setup: 6000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 9. Invoice Management AI Employee
  {
    id: 'invoice_management',
    name: 'Invoice Management AI Employee',
    slug: 'invoice-management',
    displayName: 'Invoice Management AI Employee',
    title: 'AI Accounts Receivable & Payable Specialist',
    category: 'Finance',
    department: 'Finance',
    industry: 'Accounting & Finance',
    shortDescription:
      'Extracts data from incoming invoices, tracks payment schedules, and automates friendly customer payment reminders.',
    description:
      'Processes vendor invoices and client billing, checks line-item math, matches purchase orders, monitors aging receivables, and drafts respectful payment reminders.',
    status: 'demo',
    priority: 9,
    keywords: [
      'AI invoice management',
      'accounts receivable automation',
      'invoice OCR AI',
      'payment reminder automation',
    ],
    capabilities: [
      'Invoice OCR extraction',
      'Aging report tracking',
      'Overdue reminder dispatch',
      'Discrepancy detection',
      'Payment ledger sync',
    ],
    responsibilities: [
      'Parse PDF invoices and extract vendor, total, and due dates',
      'Identify overdue accounts and draft tiered reminder sequences',
      'Verify billing calculations against work orders',
      'Provide payment status answers to vendor inquiries',
    ],
    integrations: ['Supabase (live)', 'Document Storage (live)', 'WhatsApp (live)'],
    requiredIntegrations: ['Supabase (live)', 'Document Storage (live)'],
    optionalIntegrations: ['QuickBooks (planned)', 'Stripe (planned)', 'WhatsApp (live)'],
    channels: ['Web Chat', 'Email', 'WhatsApp'],
    tools: ['search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite AI Accounts Receivable & Invoice Operations Specialist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 6000, setup: 4000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'hybrid',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 10. YouTube Content AI Employee
  {
    id: 'youtube_content',
    name: 'YouTube Content AI Employee',
    slug: 'youtube-content',
    displayName: 'YouTube Content AI Employee',
    title: 'AI YouTube Channel Strategist',
    category: 'Marketing',
    department: 'Marketing',
    industry: 'Media & Video Production',
    shortDescription:
      'Researches high-CTR video topics, drafts structured YouTube scripts, generates titles, and writes SEO descriptions.',
    description:
      'Optimizes YouTube channel growth by discovering high-demand video ideas, crafting retention-focused full video scripts with timestamped chapter outlines, and generating clickable titles and descriptions.',
    status: 'demo',
    priority: 10,
    keywords: [
      'YouTube AI employee',
      'YouTube script generator',
      'video SEO automation',
      'YouTube channel growth AI',
    ],
    capabilities: [
      'CTR-optimized title generation',
      'Full video scriptwriting',
      'Chapter timestamp creation',
      'YouTube description & tag SEO',
      'Thumbnail concept briefing',
    ],
    responsibilities: [
      'Generate 10 high-CTR video title variations per topic',
      'Draft comprehensive 10-15 minute video scripts with visual cues',
      'Format YouTube descriptions with keyword placement and links',
      'Analyze audience comments for recurring video requests',
    ],
    integrations: ['Gemini Engine (live)', 'Knowledge Base (live)'],
    requiredIntegrations: ['Gemini Engine (live)', 'Knowledge Base (live)'],
    optionalIntegrations: ['YouTube Data API (planned)'],
    channels: ['Web Chat', 'Dashboard'],
    tools: ['search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite AI YouTube Channel Strategist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 5000, setup: 3500 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 11. AI Ad Creative Employee
  {
    id: 'ai_ad_creative',
    name: 'AI Ad Creative Employee',
    slug: 'ai-ad-creative',
    displayName: 'AI Ad Creative Employee',
    title: 'AI Paid Media Copywriter',
    category: 'Marketing',
    department: 'Marketing',
    industry: 'Digital Advertising',
    shortDescription:
      'Drafts high-converting ad copy, headlines, and creative angles for Google Ads, Meta Ads, and LinkedIn Ads.',
    description:
      'Engineers direct-response advertising campaigns across search and social channels. Produces varied headlines, benefit-driven body copy, hook variations, and CTA copy tailored to target persona pain points.',
    status: 'live',
    priority: 11,
    keywords: [
      'AI ad creative',
      'paid ads automation',
      'Meta ads copywriter AI',
      'Google ads headline generator',
    ],
    capabilities: [
      'Ad headline generation',
      'Primary text variation',
      'Creative angle ideation',
      'Policy compliance check',
      'Audience persona targeting',
    ],
    responsibilities: [
      'Draft 5+ headline and primary text variations per campaign angle',
      'Enforce character limit constraints across Meta, Google, and LinkedIn',
      'Check copy against ad platform compliance rules',
      'Create paired visual briefing prompts for design teams',
    ],
    integrations: ['Gemini Engine (live)', 'Brand Guidelines (live)'],
    requiredIntegrations: ['Gemini Engine (live)', 'Brand Guidelines (live)'],
    optionalIntegrations: ['Google Ads API (planned)', 'Meta Ads API (planned)'],
    channels: ['Web Chat', 'Dashboard'],
    tools: ['search_knowledge_base', 'audit_conversation_quality'],
    system_prompt: `You are GrovAI, an elite AI Paid Media Copywriter for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 5500, setup: 3500 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 12. Website Lead Capture AI Employee
  {
    id: 'website_lead_capture',
    name: 'Website Lead Capture AI Employee',
    slug: 'website-lead-capture',
    displayName: 'Website Lead Capture AI Employee',
    title: 'AI Interactive Conversion Specialist',
    category: 'Sales',
    department: 'Sales',
    industry: 'Local & Home Services / B2B',
    shortDescription:
      'Engages website visitors in real-time, triages their urgency, and converts casual traffic into verified leads.',
    description:
      'Proactively greets visitors on your website, answers immediate questions, triages urgent vs routine requirements, collects contact and service address details, and passes qualified leads to your sales team.',
    status: 'live',
    priority: 12,
    keywords: [
      'website lead capture',
      'AI website receptionist',
      'inbound chat conversion',
      'lead capture bot',
    ],
    capabilities: [
      'Visitor greeting & triage',
      'Contact capture',
      'Service qualification',
      'Knowledge base Q&A',
      'Immediate CRM notification',
    ],
    responsibilities: [
      'Engage website visitors before they bounce',
      'Diagnose service requirements and urgency',
      'Collect homeowner or buyer contact details',
      'Log qualified leads into CRM instantly',
    ],
    integrations: ['CRM (live)', 'Supabase (live)', 'WhatsApp (live)', 'n8n Workflows (live)'],
    requiredIntegrations: ['Supabase CRM (live)', 'n8n Workflows (live)'],
    optionalIntegrations: ['WhatsApp (live)', 'SMS (planned)'],
    channels: ['Web Chat', 'WhatsApp'],
    tools: ['create_lead', 'search_knowledge_base', 'escalate_to_human'],
    system_prompt: `You are GrovAI, an elite AI Website Lead Capture & Inbound Receptionist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 4500, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 13. WhatsApp Lead Generation AI Employee
  {
    id: 'whatsapp_lead_generation',
    name: 'WhatsApp Lead Generation AI Employee',
    slug: 'whatsapp-lead-generation',
    displayName: 'WhatsApp Lead Generation AI Employee',
    title: 'AI WhatsApp Sales Agent',
    category: 'Sales',
    department: 'Sales',
    industry: 'Retail, Services & E-Commerce',
    shortDescription:
      'Engages inbound WhatsApp prospects 24/7, answers product questions, qualifies intent, and captures lead details.',
    description:
      'Responds to inbound WhatsApp messages 24/7, qualifies customer intent, collects contact information, and routes hot leads to human sales reps while answering product FAQs accurately.',
    status: 'live',
    priority: 13,
    keywords: [
      'WhatsApp lead generation',
      'WhatsApp sales bot',
      'WhatsApp automation AI',
      'AI WhatsApp agent',
    ],
    capabilities: [
      'WhatsApp messaging integration',
      'Lead qualification',
      'Lead scoring',
      'CRM synchronization',
      'Product FAQ answering',
    ],
    responsibilities: [
      'Engage inbound WhatsApp prospects 24/7',
      'Qualify buyer requirements and intent',
      'Search product knowledge base for accurate answers',
      'Register structured leads in the CRM',
    ],
    integrations: ['WhatsApp Business API (live)', 'Supabase (live)', 'n8n Multi-CRM Sync (live)'],
    requiredIntegrations: ['WhatsApp Business API (live)', 'Supabase CRM (live)', 'n8n Workflows (live)'],
    channels: ['WhatsApp'],
    tools: ['create_lead', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite 24/7 AI WhatsApp Sales & Lead Qualification Specialist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 6000, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-08-10T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 14. AI Appointment Booking Employee
  {
    id: 'ai_appointment_booking',
    name: 'AI Appointment Booking Employee',
    slug: 'ai-appointment-booking',
    displayName: 'AI Appointment Booking Employee',
    title: 'AI Front-Desk Scheduling Specialist',
    category: 'Healthcare',
    department: 'Operations',
    industry: 'Clinics, Salons & Professional Services',
    shortDescription:
      'Books client appointments, confirms doctor or stylist availability, sends reminders, and prevents no-shows.',
    description:
      'Coordinates calendar scheduling across clinics, salons, and practices. Answers scheduling FAQs, checks practitioner slots, reserves calendar events, and dispatches automated reminder notifications.',
    status: 'live',
    priority: 14,
    keywords: [
      'AI appointment booking',
      'scheduling automation',
      'AI clinic receptionist',
      'salon booking bot',
    ],
    capabilities: [
      'Appointment booking',
      'Calendar schedule lookup',
      'Intake qualification',
      'FAQ answering',
      'Reminder notification queue',
    ],
    responsibilities: [
      'Check availability and reserve confirmed time slots',
      'Collect client contact details and consultation reason',
      'Block practitioner Google Calendar in real time',
      'Queue automated confirmation and reminder messages',
    ],
    integrations: ['Google Calendar (live)', 'WhatsApp (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    requiredIntegrations: ['Google Calendar (live)', 'Supabase (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'WhatsApp'],
    tools: ['book_clinic_appointment', 'book_salon_service', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite Medical & Front-Desk AI Appointment Booking Specialist for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 4000, setup: 4000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    workflowTemplateId: 'wf-002',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },

  // 15. Google Business Profile AI Employee
  {
    id: 'google_business_profile',
    name: 'Google Business Profile AI Employee',
    slug: 'google-business-profile',
    displayName: 'Google Business Profile AI Employee',
    title: 'AI Local SEO & Reputation Manager',
    category: 'Marketing',
    department: 'Marketing',
    industry: 'Local Businesses & Multi-Location Brands',
    shortDescription:
      'Audits GBP listings, drafts local posts, monitors customer reviews, and writes brand-aligned responses.',
    description:
      'Audits Google Business Profile listings, drafts high-converting local posts, monitors customer reviews, drafts brand-aligned review responses, and provides actionable recommendations to maximize local 3-pack visibility.',
    status: 'live',
    priority: 15,
    keywords: [
      'Google Business Profile AI',
      'local SEO automation',
      'review reply generator',
      'GBP management AI',
    ],
    capabilities: [
      'Google Business Profile audit',
      'Local visibility optimization',
      'Review monitoring & sentiment analysis',
      'Review reply drafting',
      'Local update post drafting',
    ],
    responsibilities: [
      'Audit listings for completeness and NAP consistency',
      'Monitor customer reviews and draft empathetic responses',
      'Draft engaging local promotional posts and updates',
      'Provide recommendations to improve local rankings',
    ],
    integrations: ['Google Business Profile (sandbox)', 'Supabase (live)', 'n8n Workflows (live)'],
    requiredIntegrations: ['Google Business Profile (sandbox)', 'Supabase (live)', 'n8n Workflows (live)'],
    channels: ['Web Chat', 'Dashboard'],
    tools: ['audit_gbp_profile', 'draft_review_reply', 'create_gbp_post', 'search_knowledge_base'],
    system_prompt: `You are GrovAI, an elite AI Google Business Profile Growth & Reputation Manager for Grovaitech AI Workforce OS.`,
    pricing: { monthly: 4500, setup: 3000 },
    demo_config: { enabled: true },
    avatar_url: null,
    version: '1.0.0',
    deploymentMode: 'native',
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },
]

// ─── Pre-Indexed Workforce Lookups ──────────────────────────────────────────

const CANONICAL_EMPLOYEES_BY_SLUG = new Map<string, AIEmployee>(
  CANONICAL_EMPLOYEES.map((emp) => [emp.slug.toLowerCase(), emp])
)

const CANONICAL_EMPLOYEES_BY_ID = new Map<string, AIEmployee>(
  CANONICAL_EMPLOYEES.map((emp) => [emp.id.toLowerCase(), emp])
)

const MARKETPLACE_EMPLOYEES_BY_SLUG = new Map<string, AIEmployee>(
  MARKETPLACE_EMPLOYEES.map((emp) => [emp.slug.toLowerCase(), emp])
)

const MARKETPLACE_EMPLOYEES_BY_ID = new Map<string, AIEmployee>(
  MARKETPLACE_EMPLOYEES.map((emp) => [emp.id.toLowerCase(), emp])
)

export function getCanonicalEmployees(): AIEmployee[] {
  return [...CANONICAL_EMPLOYEES]
}

export function getMarketplaceEmployees(): AIEmployee[] {
  return [...MARKETPLACE_EMPLOYEES]
}

export function getCanonicalEmployeeBySlug(slug: string | null | undefined): AIEmployee | undefined {
  if (typeof slug !== 'string') return undefined
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return undefined

  // 1. Check Canonical Employees first (preserves legacy test behavior)
  const canonical = CANONICAL_EMPLOYEES_BY_SLUG.get(normalized)
  if (canonical) return canonical

  // 2. Check Marketplace Employees
  const marketplace = MARKETPLACE_EMPLOYEES_BY_SLUG.get(normalized)
  if (marketplace) return marketplace

  // 3. Aliases
  if (normalized === 'customer-support') return CANONICAL_EMPLOYEES_BY_SLUG.get('customer-support-agent')
  if (normalized === 'lead-generation') return CANONICAL_EMPLOYEES_BY_SLUG.get('real-estate-lead-receptionist')
  if (normalized === 'whatsapp-lead-generation') return CANONICAL_EMPLOYEES_BY_SLUG.get('whatsapp-lead-agent')
  if (normalized === 'ai-appointment-booking') return CANONICAL_EMPLOYEES_BY_SLUG.get('clinic-receptionist')
  if (normalized === 'website-lead-capture') return CANONICAL_EMPLOYEES_BY_SLUG.get('hvac-lead-recovery')
  if (normalized === 'google-business-profile') return CANONICAL_EMPLOYEES_BY_SLUG.get('gbp-growth-manager')

  return undefined
}

export function getCanonicalEmployeeById(id: string | null | undefined): AIEmployee | undefined {
  if (typeof id !== 'string') return undefined
  const normalized = id.trim().toLowerCase()
  if (!normalized) return undefined

  // 1. Check Canonical Employees first
  const canonical = CANONICAL_EMPLOYEES_BY_ID.get(normalized)
  if (canonical) return canonical

  // 2. Check Marketplace Employees
  const marketplace = MARKETPLACE_EMPLOYEES_BY_ID.get(normalized)
  if (marketplace) return marketplace

  // 3. Aliases
  if (normalized === 'lead_generation') return CANONICAL_EMPLOYEES_BY_ID.get('emp-001')
  if (normalized === 'customer_support') return CANONICAL_EMPLOYEES_BY_ID.get('emp-005')
  if (normalized === 'whatsapp_lead_generation') return CANONICAL_EMPLOYEES_BY_ID.get('emp-003')
  if (normalized === 'ai_appointment_booking') return CANONICAL_EMPLOYEES_BY_ID.get('emp-002')
  if (normalized === 'website_lead_capture') return CANONICAL_EMPLOYEES_BY_ID.get('emp-011')
  if (normalized === 'google_business_profile') return CANONICAL_EMPLOYEES_BY_ID.get('emp-012')

  return undefined
}

