/**
 * Grovaitech AI Platform
 * lib/deployment/revenue-leaks.ts
 *
 * Deterministic Revenue Leak Detection Engine.
 * Scans prospect signals, problems, and channels against operational leak patterns.
 */

import type { Prospect, RevenueLeak, RevenueLeakCategory } from './types'

interface LeakCategoryDefinition {
  category: RevenueLeakCategory
  title: string
  problem: string
  description: string
  severity: 'high' | 'medium' | 'low'
  likely_impact: string
  opportunity: string
  signals: string[]
}

export const REVENUE_LEAK_DEFINITIONS: LeakCategoryDefinition[] = [
  {
    category: 'LEAD_RESPONSE',
    title: 'Slow Inbound Lead Response & Drop-Off',
    problem: 'Delayed first response to inbound prospective buyers and inquiries',
    description:
      'Prospective buyers and enquiries go unanswered for hours or overnight, leading to high drop-off rates and lost conversion opportunities.',
    severity: 'high',
    likely_impact: 'Delayed response time increases lead drop-off and risks losing prospective buyers to competitors before initial contact.',
    opportunity: 'Deploy autonomous 24/7 lead qualification to engage every inquiry within seconds.',
    signals: [
      'slow response',
      'missed leads',
      'missed enquiries',
      'nobody responds',
      'delayed response',
      'leads waiting',
      'after-hours enquiries',
      'after-hours',
      'after hours',
      'lead response',
      'slow response time',
      'unresponsive',
      'drop-off',
    ],
  },
  {
    category: 'WHATSAPP',
    title: 'Unattended WhatsApp Enquiries & Conversational Friction',
    problem: 'Inbound customer WhatsApp messages uncaptured and unresponded',
    description:
      'Inbound customer messages on WhatsApp are not qualified or captured into the CRM automatically, causing lost sales conversations.',
    severity: 'high',
    likely_impact: 'Prospective clients messaging via WhatsApp experience delayed replies, resulting in abandoned conversations and missing CRM records.',
    opportunity: 'Connect an autonomous WhatsApp sales agent to capture buyer criteria and synchronize leads directly to CRM.',
    signals: [
      'whatsapp enquiries',
      'whatsapp leads',
      'whatsapp messages',
      'whatsapp follow-up',
      'customers message on whatsapp',
      'whatsapp',
      'whatsapp business',
      'whatsapp support',
      'whatsapp sales',
    ],
  },
  {
    category: 'APPOINTMENT',
    title: 'Manual Booking & Appointment Scheduling Friction',
    problem: 'Manual calendar coordination and front-desk appointment bottlenecks',
    description:
      'Staff and front-desk spend excessive hours manually juggling calendars, handling reschedules, or losing clients due to booking delays.',
    severity: 'high',
    likely_impact: 'Manual scheduling creates booking friction, delayed confirmations, and administrative burden on front-desk staff.',
    opportunity: 'Automate appointment intake, calendar synchronization, and automated confirmation reminders.',
    signals: [
      'appointment booking',
      'scheduling',
      'missed appointments',
      'phone booking',
      'receptionist workload',
      'booking requests',
      'calendar scheduling',
      'appointment',
      'booking',
      'site visit',
      'clinic appointment',
      'salon booking',
    ],
  },
  {
    category: 'SUPPORT',
    title: 'Repetitive Support Backlog & FAQ Overload',
    problem: 'High queue times and ticket backlog from repetitive tier-1 support queries',
    description:
      'Support teams are overwhelmed by tier-1 repetitive questions, creating long ticket queues and frustrated customers.',
    severity: 'medium',
    likely_impact: 'High queue times for basic inquiries divert staff focus away from high-priority escalations and increase customer frustration.',
    opportunity: 'Deploy an autonomous support specialist to resolve tier-1 repetitive questions using grounded documentation.',
    signals: [
      'repetitive support questions',
      'faq overload',
      'support backlog',
      'customers waiting',
      'unresolved support',
      'support questions',
      'ticket backlog',
      'customer support',
      'tier-1 support',
      'support overload',
    ],
  },
  {
    category: 'ECOMMERCE_SUPPORT',
    title: 'E-Commerce Order & Return Inquiries Congestion',
    problem: 'Support congestion from repetitive order tracking and return inquiries',
    description:
      'High volume of "where is my order", returns, and exchange requests overburden customer service teams.',
    severity: 'medium',
    likely_impact: 'Order tracking and return friction delays customer resolution and increases support team ticket volume.',
    opportunity: 'Automate real-time order lookups, carrier tracking, and policy-compliant return processing.',
    signals: [
      'order tracking',
      'returns',
      'exchanges',
      'shipping questions',
      'order status',
      'return request',
      'package tracking',
      'order lookup',
      'ecommerce support',
      'where is my order',
    ],
  },
  {
    category: 'LEGAL_INTAKE',
    title: 'Unstructured Legal Case Intake & Conflict Bottlenecks',
    problem: 'Manual legal matter intake and delayed preliminary conflict screening',
    description:
      'Law firms lose high-value prospective clients due to slow intake processes, delayed conflict-of-interest screening, and manual intake coordination.',
    severity: 'high',
    likely_impact: 'Delayed intake screening risks losing urgent matters to other firms and burdens attorneys with manual qualification.',
    opportunity: 'Automate structured case intake, conflict-of-interest screening, and consultation coordination.',
    signals: [
      'legal enquiries',
      'case intake',
      'consultation requests',
      'conflict checking',
      'legal intake',
      'conflict of interest',
      'practice area',
      'attorney consultation',
      'legal inquiry',
    ],
  },
  {
    category: 'HR_ONBOARDING',
    title: 'Manual New Hire Onboarding & Document Chasing',
    problem: 'Manual collection and verification of new hire onboarding documentation',
    description:
      'HR teams waste substantial time manually verifying new hire documents, scheduling orientation inductions, and answering repetitive policy FAQs.',
    severity: 'medium',
    likely_impact: 'Manual document chasing delays employee readiness and consumes HR bandwidth on administrative tasks.',
    opportunity: 'Automate new-hire document validation, induction scheduling, and policy guidance.',
    signals: [
      'onboarding',
      'new hires',
      'induction',
      'hr document collection',
      'new hire',
      'employee onboarding',
      'document submission',
      'orientation slot',
      'hr policies',
    ],
  },
  {
    category: 'FINANCIAL_INTAKE',
    title: 'Financial Product Lead Drop-Off & KYC Screening Delays',
    problem: 'Prospective advisory and loan clients dropping off during early intake',
    description:
      'Prospective advisory and loan clients drop off before completing intake, KYC verification, or meeting with certified financial advisors.',
    severity: 'high',
    likely_impact: 'Intake and document friction leads prospective advisory clients to abandon inquiries before initial consultation.',
    opportunity: 'Automate pre-consultation financial qualification, intake checklists, and certified advisor booking.',
    signals: [
      'financial enquiries',
      'insurance',
      'loans',
      'kyc',
      'advisor consultation',
      'financial advisory',
      'mutual funds',
      'wealth management',
      'home loan',
      'tax planning',
    ],
  },
  {
    category: 'AI_QA',
    title: 'Unmonitored AI Quality, Compliance & Hallucination Risk',
    problem: 'Conversational AI interactions lacking automated quality and compliance auditing',
    description:
      'AI customer interactions run without automated quality scoring, compliance verification, or hallucination detection.',
    severity: 'medium',
    likely_impact: 'Unmonitored conversational AI risks non-compliant claims, unauthorized promises, and brand exposure.',
    opportunity: 'Implement automated transcript evaluation across truthfulness, compliance, and safety rubrics.',
    signals: [
      'ai quality',
      'hallucinations',
      'ai evaluation',
      'conversation quality',
      'compliance auditing',
      'quality scoring',
      'qa inspector',
      'hallucination',
      'rubric evaluation',
      'conversation scoring',
    ],
  },
]

/**
 * Deterministically analyzes a prospect and detects revenue leaks based on keywords,
 * known problems, industry context, and current channels.
 * Strictly adheres to Revenue Analysis Safety: never fabricates business facts, statistics, or revenue.
 */
export function detectRevenueLeaks(prospect: Prospect): RevenueLeak[] {
  const textCorpus = [
    prospect.company_name || '',
    prospect.industry || '',
    prospect.description || '',
    ...(prospect.current_channels || []),
    ...(prospect.known_problems || []),
    ...(prospect.operational_signals || []),
  ]
    .join(' ')
    .toLowerCase()

  const detectedLeaks: RevenueLeak[] = []

  for (const def of REVENUE_LEAK_DEFINITIONS) {
    const matchedSignals = def.signals.filter((signal) =>
      textCorpus.includes(signal.toLowerCase())
    )

    if (matchedSignals.length > 0) {
      const confidence: 'high' | 'medium' = matchedSignals.length >= 2 ? 'high' : 'medium'
      const uncertainty =
        matchedSignals.length === 1
          ? 'Single operational signal detected from prospect input. Direct operational verification of inquiry volume is recommended.'
          : undefined

      detectedLeaks.push({
        category: def.category,
        title: def.title,
        problem: def.problem,
        description: def.description,
        severity: def.severity,
        detected_signals: matchedSignals,
        evidence: matchedSignals.map((sig) => `Reported operational signal: "${sig}"`),
        likely_impact: def.likely_impact,
        estimated_impact: def.likely_impact,
        opportunity: def.opportunity,
        confidence,
        uncertainty,
      })
    }
  }

  // If no explicit signal matched, produce explicit uncertainty without inventing business facts
  if (detectedLeaks.length === 0) {
    const industryName = prospect.industry?.trim() || 'General Business'
    detectedLeaks.push({
      category: 'LEAD_RESPONSE',
      title: 'Potential Inbound Response Latency (Unverified)',
      problem: 'Unverified inbound inquiry response speed and after-hours coverage',
      description:
        `General baseline assessment for ${industryName}. No direct operational bottlenecks were specified by the prospect.`,
      severity: 'low',
      detected_signals: [],
      evidence: [
        `Industry baseline context: "${industryName}". Zero direct operational bottlenecks or challenges were submitted by the prospect.`,
      ],
      likely_impact:
        'Unquantified. If after-hours or peak-volume inquiries arrive without immediate coverage, response delays can lead to lead drop-off.',
      estimated_impact:
        'Unquantified. Operational impact cannot be determined without verified inquiry volume and current response time data.',
      opportunity:
        'Conduct an operational review of customer inquiry channels and establish automated baseline coverage.',
      confidence: 'low',
      uncertainty:
        'Insufficient operational evidence provided. Known challenges, response times, inquiry volume, and channel metrics were not specified by the prospect. Additional discovery is required to confirm whether bottlenecks exist.',
    })
  }

  return detectedLeaks
}
