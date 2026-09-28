/**
 * Grovaitech AI Platform
 * lib/website-upgrade/industry-context.ts
 *
 * Deterministic Industry Context & Terminology Isolation Engine.
 * Enforces strict boundary separation across industries (e.g. Healthcare vs Real Estate).
 * Guarantees that domain-specific terminology, employee matching, and workflow
 * descriptions never contaminate an unrelated business profile.
 */

export type IndustryFamily =
  | 'healthcare'
  | 'real_estate'
  | 'legal'
  | 'finance'
  | 'salon'
  | 'home_services'
  | 'restaurant'
  | 'ecommerce'
  | 'general'

export interface IndustryTerminologyConfig {
  family: IndustryFamily
  primaryFrontlineSlug: string
  allowedEmployeeSlugs: string[]
  disallowedEmployeeSlugs: string[]
  primaryCtaLabel: string
  primaryCtaType: 'lead_form' | 'booking' | 'chat' | 'call' | 'contact'
  secondaryCtaLabel: string
  prohibitedTerms: string[]
  intakeLeadCapRecommendation: string
  ctaVisibilityRecommendation: string
  leak5Recommendation: string
  leak6Fix: string
  leak6EmployeeSlug: string
  leak8Impact: string
  leak8EmployeeSlug: string
  conversionStep4Action: string
}

/**
 * Detects the standard industry family from raw industry / business text.
 */
export function detectIndustryFamily(industryText?: string): IndustryFamily {
  const norm = (industryText || '').toLowerCase().trim()

  if (/dental|dentist|clinic|doctor|health|medical|hospital|orthodont|physio|chiro/i.test(norm)) {
    return 'healthcare'
  }
  if (/real\s*estate|property|realtor|realty|housing|brokerage/i.test(norm)) {
    return 'real_estate'
  }
  if (/legal|law|attorney|lawyer|litigation|solicitor/i.test(norm)) {
    return 'legal'
  }
  if (/salon|spa|beauty|wellness|hair|barber|aesthetic/i.test(norm)) {
    return 'salon'
  }
  if (/hvac|plumb|electric|roof|contractor|clean|pest|home\s*service/i.test(norm)) {
    return 'home_services'
  }
  if (/restaurant|dining|cafe|bistro|\bbar\b|catering|food\s*(&|and)?\s*beverage/i.test(norm)) {
    return 'restaurant'
  }
  if (/finance|financial|wealth|loan|banking|tax|accounting|insurance|advisory/i.test(norm)) {
    return 'finance'
  }
  if (/ecommerce|e-commerce|retail|store|shop/i.test(norm)) {
    return 'ecommerce'
  }

  return 'general'
}

/**
 * Returns the authoritative configuration for an industry family.
 */
export function getIndustryConfig(family: IndustryFamily): IndustryTerminologyConfig {
  switch (family) {
    case 'healthcare':
      return {
        family: 'healthcare',
        primaryFrontlineSlug: 'clinic-receptionist',
        allowedEmployeeSlugs: [
          'clinic-receptionist',
          'whatsapp-lead-agent',
          'gbp-growth-manager',
          'customer-support-agent',
        ],
        disallowedEmployeeSlugs: [
          'real-estate-lead-receptionist',
          'legal-intake-agent',
          'financial-advisory-agent',
          'ecommerce-support-agent',
          'hvac-lead-recovery',
          'salon-spa-receptionist',
        ],
        primaryCtaLabel: 'Book Consultation',
        primaryCtaType: 'booking',
        secondaryCtaLabel: 'Ask on WhatsApp',
        prohibitedTerms: [
          'real estate',
          'site visit',
          'bhk',
          'property budget',
          'property type',
          'real estate lead',
          'instant estimate',
          'get instant estimate',
          'explore properties',
          // Healthcare Clinical Safety Boundaries
          'diagnose',
          'medical diagnosis',
          'assess medical severity',
          'assess clinical severity',
          'recommend treatment',
          'prescribe treatment',
          'determine clinical urgency',
          'medical eligibility decision',
          'clinical triage',
          'treatment suitability',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational clinic intake widget to capture administrative details (appointment purpose, preferred appointment timing, contact details, communication preference, and general clinic information) 24/7. If a patient mentions symptoms, route the clinical question to the clinic\'s qualified team.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Book Consultation" or "Schedule Appointment") at hero, mid-page, and bottom, paired with a low-friction secondary CTA ("Ask Question on WhatsApp").',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Book Consultation", "Schedule Appointment", "Ask on WhatsApp").',
        leak6Fix:
          'Deploy an AI clinic receptionist to coordinate administrative appointment requests, collect contact details and timing preferences, and route clinical questions directly to the clinic\'s qualified team.',
        leak6EmployeeSlug: 'clinic-receptionist',
        leak8Impact:
          'Creates friction in locking in firm patient consultation slots and clinic appointments.',
        leak8EmployeeSlug: 'clinic-receptionist',
        conversionStep4Action:
          'Engages with AI Clinic Receptionist to specify appointment purpose, preferred appointment timing, contact details, and communication preference for administrative consultation booking',
      }

    case 'real_estate':
      return {
        family: 'real_estate',
        primaryFrontlineSlug: 'real-estate-lead-receptionist',
        allowedEmployeeSlugs: [
          'real-estate-lead-receptionist',
          'whatsapp-lead-agent',
          'gbp-growth-manager',
          'customer-support-agent',
        ],
        disallowedEmployeeSlugs: [
          'clinic-receptionist',
          'legal-intake-agent',
          'salon-spa-receptionist',
          'ecommerce-support-agent',
        ],
        primaryCtaLabel: 'Schedule Viewing',
        primaryCtaType: 'lead_form',
        secondaryCtaLabel: 'Ask on WhatsApp',
        prohibitedTerms: [
          'patient',
          'treatment',
          'dental implant',
          'root canal',
          'clinic receptionist',
          'medical front-desk',
          'doctor consultation',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational lead capture widget capable of qualifying buyer preferences, budget, and timeline 24/7.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Schedule Viewing" or "Inquire on Properties") at hero, mid-page, and bottom, paired with a low-friction secondary CTA ("Ask Question on WhatsApp").',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Schedule Viewing", "Inquire on Properties", "Chat on WhatsApp").',
        leak6Fix:
          'Deploy a conversational AI lead receptionist to qualify buyer preferences and schedule property viewings.',
        leak6EmployeeSlug: 'real-estate-lead-receptionist',
        leak8Impact:
          'Creates friction in locking in firm consultation dates and property site visits.',
        leak8EmployeeSlug: 'real-estate-lead-receptionist',
        conversionStep4Action:
          'Engages with AI Receptionist to specify property preferences, budget, and timeline',
      }

    case 'legal':
      return {
        family: 'legal',
        primaryFrontlineSlug: 'legal-intake-agent',
        allowedEmployeeSlugs: [
          'legal-intake-agent',
          'whatsapp-lead-agent',
          'gbp-growth-manager',
          'customer-support-agent',
        ],
        disallowedEmployeeSlugs: [
          'real-estate-lead-receptionist',
          'clinic-receptionist',
          'salon-spa-receptionist',
          'ecommerce-support-agent',
        ],
        primaryCtaLabel: 'Book Consultation',
        primaryCtaType: 'booking',
        secondaryCtaLabel: 'Inquire on WhatsApp',
        prohibitedTerms: [
          'bhk',
          'site visit',
          'property budget',
          'property type',
          'dental implant',
          'root canal',
          'patient',
          'haircut',
          'real estate',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational legal intake widget capable of capturing preliminary matter criteria and scheduling attorney consultations 24/7.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Book Consultation" or "Request Case Evaluation") at hero, mid-page, and bottom, paired with a low-friction secondary CTA ("Ask Question on WhatsApp").',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Book Consultation", "Case Evaluation", "Inquire on WhatsApp").',
        leak6Fix:
          'Deploy an AI legal intake specialist to capture case parameters and schedule initial consultations.',
        leak6EmployeeSlug: 'legal-intake-agent',
        leak8Impact:
          'Creates friction in confirming initial attorney consultation dates and case intakes.',
        leak8EmployeeSlug: 'legal-intake-agent',
        conversionStep4Action:
          'Engages with AI Intake Agent to provide preliminary matter details and request an initial consultation',
      }

    case 'salon':
      return {
        family: 'salon',
        primaryFrontlineSlug: 'salon-spa-receptionist',
        allowedEmployeeSlugs: [
          'salon-spa-receptionist',
          'whatsapp-lead-agent',
          'gbp-growth-manager',
          'customer-support-agent',
        ],
        disallowedEmployeeSlugs: [
          'real-estate-lead-receptionist',
          'clinic-receptionist',
          'legal-intake-agent',
          'financial-advisory-agent',
        ],
        primaryCtaLabel: 'Book Appointment',
        primaryCtaType: 'booking',
        secondaryCtaLabel: 'Ask on WhatsApp',
        prohibitedTerms: [
          'property budget',
          'bhk',
          'site visit',
          'property type',
          'dental implant',
          'root canal',
          'litigation',
          'real estate',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational appointment booking widget capable of checking service preferences and scheduling stylist slots 24/7.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Book Appointment" or "Explore Treatments") at hero, mid-page, and bottom, paired with a low-friction secondary CTA ("Ask Question on WhatsApp").',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Book Appointment", "View Treatments", "Ask on WhatsApp").',
        leak6Fix:
          'Deploy an AI salon receptionist to coordinate stylist schedules and service bookings.',
        leak6EmployeeSlug: 'salon-spa-receptionist',
        leak8Impact:
          'Creates friction in confirming treatment appointment slots and stylist availability.',
        leak8EmployeeSlug: 'salon-spa-receptionist',
        conversionStep4Action:
          'Engages with AI Receptionist to select desired services and choose a booking slot',
      }

    case 'home_services':
      return {
        family: 'home_services',
        primaryFrontlineSlug: 'hvac-lead-recovery',
        allowedEmployeeSlugs: [
          'hvac-lead-recovery',
          'whatsapp-lead-agent',
          'gbp-growth-manager',
          'customer-support-agent',
        ],
        disallowedEmployeeSlugs: [
          'clinic-receptionist',
          'legal-intake-agent',
          'salon-spa-receptionist',
        ],
        primaryCtaLabel: 'Request Service',
        primaryCtaType: 'lead_form',
        secondaryCtaLabel: 'Message on WhatsApp',
        prohibitedTerms: [
          'patient',
          'dental treatment',
          'bhk',
          'court appearance',
          'dental implant',
          'root canal',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational service dispatch widget capable of logging service requirements and scheduling technician visits 24/7.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Request Service" or "Schedule Inspection") at hero, mid-page, and bottom, paired with a low-friction secondary CTA ("Message on WhatsApp").',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Request Service", "Schedule Inspection", "Message on WhatsApp").',
        leak6Fix:
          'Deploy an AI service recovery agent to capture service inquiries and emergency requests with zero response delay.',
        leak6EmployeeSlug: 'hvac-lead-recovery',
        leak8Impact:
          'Creates friction in locking in service appointments and dispatch time windows.',
        leak8EmployeeSlug: 'hvac-lead-recovery',
        conversionStep4Action:
          'Engages with AI Service Agent to specify service requirements and schedule a dispatch window',
      }

    case 'restaurant':
      return {
        family: 'restaurant',
        primaryFrontlineSlug: 'customer-support-agent',
        allowedEmployeeSlugs: [
          'customer-support-agent',
          'whatsapp-lead-agent',
          'gbp-growth-manager',
        ],
        disallowedEmployeeSlugs: [
          'real-estate-lead-receptionist',
          'clinic-receptionist',
          'legal-intake-agent',
          'financial-advisory-agent',
        ],
        primaryCtaLabel: 'Reserve Table',
        primaryCtaType: 'booking',
        secondaryCtaLabel: 'Ask on WhatsApp',
        prohibitedTerms: [
          'property budget',
          'patient',
          'dental treatment',
          'bhk',
          'site visit',
          'property type',
          'legal matter',
          'root canal',
          'dental implant',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational dining reservation widget capable of taking table bookings and answering dietary FAQs 24/7.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Reserve Table" or "View Menu & Reserve") at hero, mid-page, and bottom, paired with a low-friction secondary CTA ("Ask Question on WhatsApp").',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Reserve Table", "View Menu", "Ask on WhatsApp").',
        leak6Fix:
          'Deploy an AI dining assistant to coordinate table reservations and guest inquiries promptly.',
        leak6EmployeeSlug: 'customer-support-agent',
        leak8Impact:
          'Creates friction in confirming table availability and dining reservations.',
        leak8EmployeeSlug: 'customer-support-agent',
        conversionStep4Action:
          'Engages with AI Assistant to check menu details and reserve a dining slot',
      }

    case 'finance':
      return {
        family: 'finance',
        primaryFrontlineSlug: 'financial-advisory-agent',
        allowedEmployeeSlugs: [
          'financial-advisory-agent',
          'whatsapp-lead-agent',
          'customer-support-agent',
          'gbp-growth-manager',
        ],
        disallowedEmployeeSlugs: [
          'real-estate-lead-receptionist',
          'clinic-receptionist',
          'salon-spa-receptionist',
        ],
        primaryCtaLabel: 'Request Consultation',
        primaryCtaType: 'lead_form',
        secondaryCtaLabel: 'Inquire on WhatsApp',
        prohibitedTerms: [
          'bhk',
          'site visit',
          'property type',
          'dental implant',
          'patient',
          'root canal',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational advisory intake widget capable of pre-qualifying inquiries and scheduling advisor consultations 24/7.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Request Consultation" or "Schedule Advisory Session") at hero, mid-page, and bottom, paired with a low-friction secondary CTA ("Inquire on WhatsApp").',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Request Consultation", "Schedule Call", "Inquire on WhatsApp").',
        leak6Fix:
          'Deploy an AI advisory intake agent to capture financial consultation parameters and verify client intent.',
        leak6EmployeeSlug: 'financial-advisory-agent',
        leak8Impact:
          'Creates friction in confirming advisor consultation dates and onboarding meetings.',
        leak8EmployeeSlug: 'financial-advisory-agent',
        conversionStep4Action:
          'Engages with AI Advisory Agent to provide inquiry context and schedule an initial consultation',
      }

    case 'ecommerce':
      return {
        family: 'ecommerce',
        primaryFrontlineSlug: 'ecommerce-support-agent',
        allowedEmployeeSlugs: [
          'ecommerce-support-agent',
          'customer-support-agent',
          'whatsapp-lead-agent',
        ],
        disallowedEmployeeSlugs: [
          'clinic-receptionist',
          'real-estate-lead-receptionist',
          'legal-intake-agent',
        ],
        primaryCtaLabel: 'Explore Catalog',
        primaryCtaType: 'lead_form',
        secondaryCtaLabel: 'Chat on WhatsApp',
        prohibitedTerms: [
          'property budget',
          'site visit',
          'bhk',
          'patient',
          'dental treatment',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational shopping assistant capable of resolving order questions and recommending items 24/7.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Explore Catalog" or "Shop Now") prominently, paired with instant AI chat support.',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Explore Catalog", "Track Order", "Chat with Support").',
        leak6Fix:
          'Deploy an AI e-commerce assistant to handle product queries, order lookups, and support requests.',
        leak6EmployeeSlug: 'ecommerce-support-agent',
        leak8Impact:
          'Creates friction in checkout completion and post-purchase resolution.',
        leak8EmployeeSlug: 'ecommerce-support-agent',
        conversionStep4Action:
          'Engages with AI Shopping Assistant to find products, verify specifications, and track deliveries',
      }

    case 'general':
    default:
      return {
        family: 'general',
        primaryFrontlineSlug: 'customer-support-agent',
        allowedEmployeeSlugs: [
          'customer-support-agent',
          'whatsapp-lead-agent',
          'gbp-growth-manager',
        ],
        disallowedEmployeeSlugs: [
          'real-estate-lead-receptionist',
          'clinic-receptionist',
        ],
        primaryCtaLabel: 'Get Free Consultation',
        primaryCtaType: 'lead_form',
        secondaryCtaLabel: 'Ask on WhatsApp',
        prohibitedTerms: [
          'bhk',
          'site visit',
          'property budget',
          'property type',
          'dental implant',
          'root canal',
        ],
        intakeLeadCapRecommendation:
          'Integrate conversational intake assistant capable of addressing inquiries and capturing visitor contact details 24/7.',
        ctaVisibilityRecommendation:
          'Deploy primary CTA ("Get Free Consultation" or "Schedule Call") at hero, mid-page, and bottom, paired with a low-friction secondary CTA ("Ask Question on WhatsApp").',
        leak5Recommendation:
          'Deploy action-oriented buttons ("Book Consultation", "Get in Touch", "Chat on WhatsApp").',
        leak6Fix:
          'Deploy an AI customer support assistant to handle visitor questions and route inquiries instantly.',
        leak6EmployeeSlug: 'customer-support-agent',
        leak8Impact:
          'Creates friction in confirming consultation dates and follow-up meetings.',
        leak8EmployeeSlug: 'customer-support-agent',
        conversionStep4Action:
          'Engages with AI Assistant to specify inquiry details, service interest, and preferred contact time',
      }
  }
}

/**
 * Checks whether an employee slug is compatible with the business industry.
 */
export function isEmployeeCompatibleWithIndustry(
  employeeSlug: string,
  family: IndustryFamily
): boolean {
  const config = getIndustryConfig(family)
  if (config.disallowedEmployeeSlugs.includes(employeeSlug)) {
    return false
  }
  return true
}

export interface ResolvedWorkflowInfo {
  workflowId: string
  workflowName: string
  workflowDescription: string
}

/**
 * Resolves an industry-safe workflow definition for a given employee and industry family.
 * Strictly guarantees that the workflow description and name do not leak unrelated
 * industry terms (e.g. dental clinic never receives real-estate site-visit workflow copy).
 */
export function resolveIndustryWorkflow(
  employeeSlug: string,
  family: IndustryFamily
): ResolvedWorkflowInfo {
  switch (employeeSlug) {
    case 'clinic-receptionist':
      return {
        workflowId: 'wf-002',
        workflowName: 'Clinic Appointment Booking & Reminder Pipeline',
        workflowDescription:
          'Autonomous administrative patient intake: captures appointment purpose, preferred timing, and contact details, logs appointment record, queues reminders, and routes clinical questions to the clinic\'s qualified team.',
      }

    case 'whatsapp-lead-agent':
      if (family === 'healthcare') {
        return {
          workflowId: 'wf-004',
          workflowName: 'Patient Inquiry ➔ WhatsApp Conversation ➔ Appointment Coordination',
          workflowDescription:
            'Engages patients on WhatsApp, provides general clinic information, coordinates administrative consultation booking, and routes clinical questions to the clinic\'s qualified team.',
        }
      }
      if (family === 'salon') {
        return {
          workflowId: 'wf-004',
          workflowName: 'Client Inquiry ➔ WhatsApp Conversation ➔ Service Booking',
          workflowDescription:
            'Engages clients on WhatsApp, answers treatment/package FAQs, and coordinates salon appointments.',
        }
      }
      if (family === 'legal') {
        return {
          workflowId: 'wf-004',
          workflowName: 'Client Inquiry ➔ WhatsApp Conversation ➔ Consultation Scheduling',
          workflowDescription:
            'Engages prospective clients on WhatsApp, verifies basic matter criteria, and schedules consultations.',
        }
      }
      if (family === 'real_estate') {
        return {
          workflowId: 'wf-004',
          workflowName: 'Inbound WhatsApp Lead Qualification Pipeline (n8n)',
          workflowDescription:
            'Routes inbound WhatsApp messages to qualify buyer intent and synchronize leads with CRM.',
        }
      }
      return {
        workflowId: 'wf-004',
        workflowName: 'Inbound Inquiry ➔ WhatsApp Conversation ➔ Qualification & Routing',
        workflowDescription:
          'Engages inbound website and mobile prospects on WhatsApp, qualifies requirements, and routes inquiries.',
      }

    case 'gbp-growth-manager':
      return {
        workflowId: 'wf-012',
        workflowName: 'Google Business Profile Review Monitoring & Local Reputation Pipeline',
        workflowDescription:
          'Audits Google Business Profile, monitors local customer reviews, drafts brand-aligned responses, and optimizes local search presence.',
      }

    case 'customer-support-agent':
      if (family === 'healthcare') {
        return {
          workflowId: 'wf-003',
          workflowName: 'Clinic Information & Administrative Inquiries ➔ Staff Dispatch',
          workflowDescription:
            'Answers general clinic operating FAQs (hours, location, accepted insurance, parking) and routes clinical questions to the clinic\'s qualified team.',
        }
      }
      return {
        workflowId: 'wf-003',
        workflowName: 'Urgent Escalation ➔ Human Agent Dispatch & FAQ Resolution',
        workflowDescription:
          'Answers customer inquiries autonomously from verified knowledge base and escalates urgent matters to on-duty staff.',
      }

    case 'real-estate-lead-receptionist':
      return {
        workflowId: 'wf-001',
        workflowName: 'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
        workflowDescription:
          'Qualifies property buyers/sellers, captures preferences, and coordinates site visit bookings.',
      }

    case 'salon-spa-receptionist':
      return {
        workflowId: 'wf-007',
        workflowName: 'Salon & Spa Service Booking & Reminder Pipeline',
        workflowDescription:
          'Confirms treatment slots, logs bookings, reserves stylist calendar, and schedules WhatsApp confirmations.',
      }

    case 'legal-intake-agent':
      return {
        workflowId: 'wf-006',
        workflowName: 'Legal Consultation Intake & Conflict Check',
        workflowDescription:
          'Captures matter parameters, performs automated conflict check, and schedules preliminary attorney consultation.',
      }

    case 'ecommerce-support-agent':
      return {
        workflowId: 'wf-008',
        workflowName: 'E-Commerce Order Tracking & Returns Resolution Pipeline',
        workflowDescription:
          'Verifies order parameters, syncs real-time shipment logistics, and evaluates return eligibility.',
      }

    case 'financial-advisory-agent':
      return {
        workflowId: 'wf-010',
        workflowName: 'Financial Advisory Consultation & KYC Intake Pipeline',
        workflowDescription:
          'Qualifies financial inquiries, evaluates KYC readiness, and reserves certified advisor consultations.',
      }

    case 'hvac-lead-recovery':
      return {
        workflowId: 'wf-004',
        workflowName: 'Emergency Service Dispatch & Lead Recovery Pipeline',
        workflowDescription:
          'Dispatches emergency service requests and follows up on missed inbound inquiries automatically.',
      }

    default:
      return {
        workflowId: 'wf-003',
        workflowName: 'Inbound Inquiry Intake & Escalation Pipeline',
        workflowDescription:
          'Handles inbound visitor requests, qualifies inquiry intent, and routes to appropriate team members.',
      }
  }
}

/**
 * Sanitizes recommendation text to guarantee no cross-industry terms contaminate the output.
 */
export function sanitizeRecommendationCopy(text: string, family: IndustryFamily): string {
  if (!text) return text
  let cleaned = text

  if (family !== 'real_estate') {
    // Scrub real estate terms when not in real estate
    cleaned = cleaned.replace(/real\s*estate\s*lead/gi, 'inbound inquiry')
    cleaned = cleaned.replace(/real\s*estate/gi, 'business')
    cleaned = cleaned.replace(/site\s*visits?/gi, 'consultations')
    cleaned = cleaned.replace(/\bproperty\s*budget\b/gi, 'budget')
    cleaned = cleaned.replace(/\bproperty\s*type\b/gi, 'service category')
    cleaned = cleaned.replace(/\bbhk\b/gi, '')
    cleaned = cleaned.replace(/get\s*instant\s*estimate/gi, 'Book Consultation')
    cleaned = cleaned.replace(/get\s*price\s*estimate/gi, 'Book Consultation')
  }

  if (family !== 'healthcare') {
    // Scrub dental/healthcare terms when not in healthcare
    cleaned = cleaned.replace(/\bdental\s*implants?\b/gi, 'services')
    cleaned = cleaned.replace(/\broot\s*canals?\b/gi, 'services')
    cleaned = cleaned.replace(/\bclinic\s*receptionist\b/gi, 'intake assistant')
  }

  if (family === 'healthcare') {
    // Ensure Healthcare & Dental recommendations remain strictly administrative/informational
    // Never diagnose, assess severity, recommend treatment, determine urgency, or make medical eligibility decisions
    cleaned = cleaned.replace(/\b(diagnos(e|ing|is))\b/gi, 'route clinical questions to qualified team')
    cleaned = cleaned.replace(/\b(assess(ing)?\s+(medical\s+|clinical\s+)?severity)\b/gi, 'collect preferred appointment timing')
    cleaned = cleaned.replace(/\b(recommend(ing)?\s+treatment|treatment\s+suitability)\b/gi, 'coordinate administrative consultation booking')
    cleaned = cleaned.replace(/\b(clinical\s+triage|determine\s+clinical\s+urgency)\b/gi, 'record appointment purpose and communication preference')
    cleaned = cleaned.replace(/\b(medical\s+eligibility\s+decisions?)\b/gi, 'general clinic information requests')
  }

  return cleaned.trim()
}

/**
 * Verifies that Healthcare & Dental recommendations strictly adhere to administrative boundaries:
 * - No diagnosis
 * - No medical severity assessment
 * - No treatment recommendation
 * - No clinical urgency determination
 * - No medical eligibility decision
 * - Supports administrative appointment coordination & routes clinical questions to qualified staff
 */
export function isHealthcareRecommendationSafe(text?: string): {
  isSafe: boolean
  violations: string[]
} {
  const violations: string[] = []
  if (!text) {
    return { isSafe: true, violations: [] }
  }
  const lower = text.toLowerCase()

  if (/\b(diagnos(e|ing|is)|medical diagnosis)\b/i.test(lower)) {
    violations.push('Contains medical diagnostic language')
  }
  if (/\b(assess(ing)?\s+(medical|clinical)\s+severity|determine\s+clinical\s+urgency|medical\s+severity)\b/i.test(lower)) {
    violations.push('Contains medical severity assessment language')
  }
  if (/\b(recommend(ing)?\s+treatment|prescribe\s+treatment|treatment\s+suitability)\b/i.test(lower)) {
    violations.push('Contains treatment recommendation language')
  }
  if (/\b(clinical\s+triage|triage\s+symptoms|triage\s+urgency)\b/i.test(lower)) {
    violations.push('Contains clinical triage language')
  }
  if (/\b(medical\s+eligibility\s+decision|determine\s+medical\s+eligibility)\b/i.test(lower)) {
    violations.push('Contains medical eligibility decision language')
  }

  return {
    isSafe: violations.length === 0,
    violations,
  }
}
