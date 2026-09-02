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
  description: string
  severity: 'high' | 'medium' | 'low'
  estimated_impact: string
  signals: string[]
}

export const REVENUE_LEAK_DEFINITIONS: LeakCategoryDefinition[] = [
  {
    category: 'LEAD_RESPONSE',
    title: 'Slow Inbound Lead Response & Drop-Off',
    description:
      'Prospective buyers and enquiries go unanswered for hours or overnight, leading to high drop-off rates and lost conversion opportunities.',
    severity: 'high',
    estimated_impact: '30% to 50% loss of inbound pipeline value due to delayed first contact.',
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
    description:
      'Inbound customer messages on WhatsApp are not qualified or captured into the CRM automatically, causing lost sales conversations.',
    severity: 'high',
    estimated_impact: 'Up to 40% loss of WhatsApp inbound prospect engagement and slow speed-to-lead.',
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
    description:
      'Staff and front-desk spend excessive hours manually juggling calendars, handling reschedules, or losing clients due to booking delays.',
    severity: 'high',
    estimated_impact: '20% to 35% reduction in appointment volume and high front-desk administrative overhead.',
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
    description:
      'Support teams are overwhelmed by tier-1 repetitive questions, creating long ticket queues and frustrated customers.',
    severity: 'medium',
    estimated_impact: 'High customer churn and excessive support staffing costs on tier-1 repetitive queries.',
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
    description:
      'High volume of "where is my order", returns, and exchange requests overburden customer service teams.',
    severity: 'medium',
    estimated_impact: 'Delayed order resolution times and decreased customer repeat purchase rate.',
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
    description:
      'Law firms lose high-value prospective clients due to slow intake processes, delayed conflict-of-interest screening, and manual intake coordination.',
    severity: 'high',
    estimated_impact: 'Loss of retainers and significant attorney time spent on unqualified initial consultations.',
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
    description:
      'HR teams waste substantial time manually verifying new hire documents, scheduling orientation inductions, and answering repetitive policy FAQs.',
    severity: 'medium',
    estimated_impact: 'Delayed employee time-to-productivity and compliance friction during induction.',
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
    description:
      'Prospective advisory and loan clients drop off before completing intake, KYC verification, or meeting with certified financial advisors.',
    severity: 'high',
    estimated_impact: 'Loss of high-ticket wealth and advisory mandates due to friction in initial KYC qualification.',
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
    description:
      'AI customer interactions run without automated quality scoring, compliance verification, or hallucination detection.',
    severity: 'medium',
    estimated_impact: 'Risk of non-compliant claims, unauthorized discount promises, and brand reputation exposure.',
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
 */
export function detectRevenueLeaks(prospect: Prospect): RevenueLeak[] {
  const textCorpus = [
    prospect.company_name || '',
    prospect.industry || '',
    prospect.description || '',
    ...(prospect.current_channels || []),
    ...(prospect.known_problems || []),
  ]
    .join(' ')
    .toLowerCase()

  const detectedLeaks: RevenueLeak[] = []

  for (const def of REVENUE_LEAK_DEFINITIONS) {
    const matchedSignals = def.signals.filter((signal) =>
      textCorpus.includes(signal.toLowerCase())
    )

    if (matchedSignals.length > 0) {
      detectedLeaks.push({
        category: def.category,
        title: def.title,
        description: def.description,
        severity: def.severity,
        detected_signals: matchedSignals,
        estimated_impact: def.estimated_impact,
      })
    }
  }

  // If no explicit signal matched but known_problems or industry was provided, provide a general intake leak
  if (detectedLeaks.length === 0) {
    detectedLeaks.push({
      category: 'LEAD_RESPONSE',
      title: 'General Inbound Conversion & Response Latency',
      description:
        'Inbound customer inquiries and web traffic require autonomous capture and qualification to prevent drop-off.',
      severity: 'medium',
      detected_signals: ['inbound traffic', 'general inquiry'],
      estimated_impact: 'Estimated 20% to 35% improvement in speed-to-lead and initial qualification.',
    })
  }

  return detectedLeaks
}
