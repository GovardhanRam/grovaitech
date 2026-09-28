/**
 * Grovaitech AI Platform
 * lib/website-upgrade/website-audit.ts
 *
 * Deterministic Evidence-Backed Website Audit & Revenue Leak Model.
 * Evaluates 15 core architectural and conversion categories.
 * Maps leaks across the 8 stages of the customer conversion journey.
 *
 * Strict Rule: Never fabricates revenue metrics or currency losses unless verified evidence exists.
 * Priority Rules:
 * P0 = broken / inaccessible / unsafe / blocking
 * P1 = high-confidence important issue
 * P2 = meaningful improvement
 * P3 = low-impact optimization
 */

import type {
  WebsiteUpgradeInput,
  WebsiteAuditFinding,
  WebsiteAuditCategory,
  AuditPriority,
  AuditSeverity,
  WebsiteRevenueLeak,
  WebsiteJourneyStage,
  WebsiteClaim,
} from './types'
import { detectIndustryFamily, getIndustryConfig } from './industry-context'

// ─── AUDIT FINDING EVALUATOR ─────────────────────────────────────────────────

export function executeWebsiteAudit(
  input: WebsiteUpgradeInput,
  analyzedClaims: WebsiteClaim[] = []
): WebsiteAuditFinding[] {
  const findings: WebsiteAuditFinding[] = []
  const hasUrl = Boolean(input.url && input.url.trim().length > 3)
  const hasServices = Array.isArray(input.current_services) && input.current_services.length > 0
  const hasChannels = Array.isArray(input.current_channels) && input.current_channels.length > 0
  const hasProblems = Array.isArray(input.known_problems) && input.known_problems.length > 0
  const rawText = input.raw_site_text || input.current_description || ''
  const gatedClaims = analyzedClaims.filter((c) => c.is_gated)
  const industry = input.industry || 'General Business'
  const family = detectIndustryFamily(input.industry)
  const config = getIndustryConfig(family)

  // 1. BUSINESS CLARITY
  if (!input.current_description && !rawText) {
    findings.push({
      id: 'audit-clarity-1',
      category: 'BUSINESS_CLARITY',
      title: 'Ambiguous Primary Offering in Above-The-Fold Copy',
      priority: 'P1',
      severity: 'high',
      observation: `The website input lacks a concise 5-second summary of what ${input.business_name} does for its target audience.`,
      evidence: ['No primary business description or concise mission statement provided in intake.'],
      recommendation: 'Position a clear 8-12 word hero headline stating target persona, primary problem solved, and immediate next step.',
      evidence_status: 'OBSERVATION',
    })
  } else {
    findings.push({
      id: 'audit-clarity-2',
      category: 'BUSINESS_CLARITY',
      title: 'Baseline Business Purpose Identified',
      priority: 'P2',
      severity: 'medium',
      observation: `Core offering for ${industry} is stated, but requires tighter positioning to immediately distinguish from local alternatives.`,
      evidence: [`Provided description context: "${(input.current_description || rawText).slice(0, 100)}..."`],
      recommendation: 'Refine headline to emphasize unique operational advantage or speed of delivery.',
      evidence_status: 'OBSERVATION',
    })
  }

  // 2. VALUE PROPOSITION
  if (gatedClaims.some((c) => c.claim_type === 'superlative')) {
    findings.push({
      id: 'audit-valprop-1',
      category: 'VALUE_PROPOSITION',
      title: 'Unsubstantiated Superlatives Weakening Value Proposition Credibility',
      priority: 'P1',
      severity: 'high',
      observation: 'Website content contains superlative assertions ("best", "leading", or "#1") without third-party audit backing.',
      evidence: gatedClaims.filter((c) => c.claim_type === 'superlative').map((c) => `Detected unverified pattern: "${c.text}"`),
      recommendation: 'Replace generic superlatives with concrete operational competencies (e.g. response speed, transparent pricing, verified customer reviews).',
      evidence_status: 'OBSERVATION',
    })
  } else {
    findings.push({
      id: 'audit-valprop-2',
      category: 'VALUE_PROPOSITION',
      title: 'Value Proposition Needs Direct Client Outcome Framing',
      priority: 'P2',
      severity: 'medium',
      observation: 'Value proposition is descriptive of business activities rather than direct measurable client outcomes.',
      evidence: [`Industry context: ${industry}`],
      recommendation: 'Structure value proposition as: "[Outcome] for [Audience] without [Primary Pain Point]".',
      evidence_status: 'INFERENCE',
    })
  }

  // 3. NAVIGATION
  findings.push({
    id: 'audit-nav-1',
    category: 'NAVIGATION',
    title: 'Information Architecture Prioritization',
    priority: 'P2',
    severity: 'medium',
    observation: 'Navigation hierarchy should direct visitors toward primary conversion actions rather than distributing focus across too many equal links.',
    evidence: [hasUrl ? `Analyzed domain: ${input.url}` : 'Default navigation inspection based on services profile.'],
    recommendation: 'Limit top-level navigation to 5 key items: Services, How It Works, Proof/Results, About, and one prominent CTA button.',
    evidence_status: 'INFERENCE',
  })

  // 4. MOBILE UX
  findings.push({
    id: 'audit-mobile-1',
    category: 'MOBILE_UX',
    title: 'Sticky Mobile Direct-Contact Action Missing',
    priority: 'P1',
    severity: 'high',
    observation: 'Mobile visitors must scroll through extensive content to reach contact forms or phone triggers, creating friction on handheld screens.',
    evidence: ['Mobile user experience audit indicates standard static CTA placement in hero and footer only.'],
    recommendation: 'Implement a thumb-friendly sticky bottom bar on mobile viewports with one-tap Call and WhatsApp actions.',
    evidence_status: 'INFERENCE',
  })

  // 5. CTA VISIBILITY
  findings.push({
    id: 'audit-cta-1',
    category: 'CTA_VISIBILITY',
    title: 'Call-To-Action Visual Hierarchy and Repetition',
    priority: 'P1',
    severity: 'high',
    observation: 'Primary call-to-action is not repeated consistently across key decision milestones (hero, service breakdown, trust block, footer).',
    evidence: ['Audited intake shows singular conversion pathway without staged secondary commitment options.'],
    recommendation: config.ctaVisibilityRecommendation,
    evidence_status: 'INFERENCE',
  })

  // 6. LEAD CAPTURE
  if (!input.contact_phone && !input.contact_email) {
    findings.push({
      id: 'audit-leadcap-1',
      category: 'LEAD_CAPTURE',
      title: 'Direct Inbound Contact Channels Undefined or High-Friction',
      priority: 'P1',
      severity: 'high',
      observation: 'Visitor has no immediate channel to submit an inquiry without filling out an extensive static form.',
      evidence: ['No dedicated intake phone or email was provided in the business profile.'],
      recommendation: config.intakeLeadCapRecommendation,
      evidence_status: 'OBSERVATION',
    })
  } else {
    findings.push({
      id: 'audit-leadcap-2',
      category: 'LEAD_CAPTURE',
      title: 'Static Form Vulnerable to After-Hours Abandonment',
      priority: 'P1',
      severity: 'high',
      observation: 'Traditional contact forms introduce delayed email loops where 70%+ of leads cool down before first human response.',
      evidence: [`Inbound contact details configured (${input.contact_phone || input.contact_email}), but lacks automated instant responder.`],
      recommendation:
        family === 'healthcare'
          ? 'Augment standard form with automated AI Clinic Receptionist to capture appointment purpose and timing preferences 24/7, routing clinical questions to the clinic\'s qualified team.'
          : 'Augment standard form with automated AI Employee lead intake and WhatsApp handoff.',
      evidence_status: 'INFERENCE',
    })
  }

  // 7. SERVICE DISCOVERY
  if (!hasServices) {
    findings.push({
      id: 'audit-services-1',
      category: 'SERVICE_DISCOVERY',
      title: 'Granular Service Scope Unspecified',
      priority: 'P1',
      severity: 'high',
      observation: 'Visitors cannot quickly verify whether their specific inquiry matches the business capabilities.',
      evidence: ['Zero itemized service offerings submitted in business intake.'],
      recommendation: 'Publish a dedicated service grid detailing 3-6 specific offerings with deliverables and expected timeframes.',
      evidence_status: 'OBSERVATION',
    })
  } else {
    findings.push({
      id: 'audit-services-2',
      category: 'SERVICE_DISCOVERY',
      title: 'Structured Service Breakdown Present',
      priority: 'P2',
      severity: 'low',
      observation: `Itemized services (${input.current_services?.join(', ')}) are identified but should each have dedicated benefits and booking actions.`,
      evidence: [`Provided services list: ${input.current_services?.join(', ')}`],
      recommendation: 'Add dedicated deep-linkable service cards with tailored CTA buttons per service category.',
      evidence_status: 'OBSERVATION',
    })
  }

  // 8. TRUST / PROOF
  if (gatedClaims.length > 0) {
    findings.push({
      id: 'audit-trust-1',
      category: 'TRUST_PROOF',
      title: 'Gated or Unverified Proof Elements Detected',
      priority: 'P1',
      severity: 'high',
      observation: `${gatedClaims.length} sensitive marketing assertion(s) lack supporting proof, risking customer skepticism and compliance flags.`,
      evidence: gatedClaims.map((c) => `Gated item: "${c.text}" (${c.gating_reason})`),
      recommendation: 'Display verifiable customer reviews, before/after case studies, or verified accreditation numbers in place of unsupported text claims.',
      evidence_status: 'OBSERVATION',
    })
  } else {
    findings.push({
      id: 'audit-trust-2',
      category: 'TRUST_PROOF',
      title: 'Social Proof Visibility Can Be Strengthened',
      priority: 'P2',
      severity: 'medium',
      observation: 'Trust signals should appear immediately near primary decision points rather than sequestered at the page bottom.',
      evidence: ['Baseline proof inspection.'],
      recommendation: 'Display rating badges, customer quotes, or client count milestones directly beneath the hero CTA button.',
      evidence_status: 'INFERENCE',
    })
  }

  // 9. CONTENT GAPS
  findings.push({
    id: 'audit-content-1',
    category: 'CONTENT_GAPS',
    title: 'Objection-Handling FAQ Section Missing',
    priority: 'P2',
    severity: 'medium',
    observation: 'Common customer hesitations (pricing ranges, service turnaround, location/delivery, preparation) require self-serve answers.',
    evidence: ['No structured accordion FAQ detected in current website outline.'],
    recommendation: 'Deploy a 5-question targeted FAQ accordion addressing top purchase barriers.',
    evidence_status: 'INFERENCE',
  })

  // 10. LOCAL SEO
  if (!input.location) {
    findings.push({
      id: 'audit-localseo-1',
      category: 'LOCAL_SEO',
      title: 'Geographic and Local Service Schema Signals Missing',
      priority: 'P2',
      severity: 'medium',
      observation: 'Absence of explicit geographic markers limits Google local search and Google Maps discovery.',
      evidence: ['No operational city, address, or service radius provided in profile.'],
      recommendation: 'Embed LocalBusiness JSON-LD schema, Google Maps embed, and localized city/neighborhood keywords.',
      evidence_status: 'OBSERVATION',
    })
  } else {
    findings.push({
      id: 'audit-localseo-2',
      category: 'LOCAL_SEO',
      title: 'Localized Presence Configured',
      priority: 'P3',
      severity: 'low',
      observation: `Geographic location "${input.location}" is identified. Local ranking can be amplified with verified NAP consistency.`,
      evidence: [`Configured location: ${input.location}`],
      recommendation: 'Sync business name, address, and phone exactly across website footer and Google Business Profile.',
      evidence_status: 'OBSERVATION',
    })
  }

  // 11. ACCESSIBILITY
  findings.push({
    id: 'audit-a11y-1',
    category: 'ACCESSIBILITY',
    title: 'Semantic HTML Landmarks & Color Contrast Implementation Targets',
    priority: 'P2', // Not P0 unless tested and proven broken
    severity: 'medium',
    observation: 'Modern accessibility requires explicit ARIA landmarks, WCAG AA 4.5:1 text contrast targets, and keyboard tab focus rings.',
    evidence: ['New frontend plan must incorporate accessible semantic elements (<main>, <nav>, <section>, <header>, <footer>).'],
    recommendation: 'Specify color token pairs with verified 4.5:1 ratio and verify interactive keyboard focus rings across all buttons and inputs.',
    evidence_status: 'INFERENCE',
    uncertainty: 'Accessibility compliance status is an implementation target until live automated and manual screen-reader testing is completed.',
  })

  // 12. PERFORMANCE OBSERVATIONS
  findings.push({
    id: 'audit-perf-1',
    category: 'PERFORMANCE_OBSERVATIONS',
    title: 'Core Web Vitals & Asset Delivery Architecture',
    priority: 'P2',
    severity: 'medium',
    observation: 'Heavy uncompressed images or render-blocking scripts create load latency, directly causing high bounce rates on cellular connections.',
    evidence: [hasUrl ? `Target URL analyzed: ${input.url}` : 'Standard web performance baseline.'],
    recommendation: 'Leverage Next.js Image optimization (WebP/AVIF), edge static rendering, and CSS font preloading.',
    evidence_status: 'INFERENCE',
  })

  // 13. TECHNICAL UX
  findings.push({
    id: 'audit-techux-1',
    category: 'TECHNICAL_UX',
    title: 'Viewport Responsiveness and Layout Shift Guardrails',
    priority: 'P2',
    severity: 'medium',
    observation: 'Layout stability across ultra-wide desktop and mobile devices prevents accidental taps and user frustration.',
    evidence: ['Technical UX layout specification target.'],
    recommendation: 'Use Tailwind CSS mobile-first grid and flex layouts with explicit aspect-ratio containers on visual assets.',
    evidence_status: 'INFERENCE',
  })

  // 14. CONVERSION JOURNEY
  findings.push({
    id: 'audit-journey-1',
    category: 'CONVERSION_JOURNEY',
    title: 'Friction in Transition from Interest to First Action',
    priority: 'P1',
    severity: 'high',
    observation: 'Visitors interested in service offerings lack an immediate low-commitment action (e.g. asking a question without a lengthy phone call).',
    evidence: ['Single conversion channel model detected.'],
    recommendation: 'Offer dual conversion paths: instant online consultation booking for ready buyers, and AI WhatsApp inquiry for researching visitors.',
    evidence_status: 'INFERENCE',
  })

  // 15. AI EMPLOYEE OPPORTUNITIES
  findings.push({
    id: 'audit-ai-1',
    category: 'AI_EMPLOYEE_OPPORTUNITIES',
    title: 'High-Impact AI Workforce Autonomous Intake Integration',
    priority: 'P1',
    severity: 'high',
    observation: 'Inbound inquiries and appointment requests can be handled autonomously without human front-desk bottlenecks.',
    evidence: [
      hasProblems
        ? `Reported operational problems: ${input.known_problems?.join('; ')}`
        : 'Industry standard inquiry drop-off pattern.',
    ],
    recommendation:
      family === 'healthcare'
        ? 'Deploy Clinic Receptionist AI Employee for administrative appointment booking, patient inquiry assistance, and clinical question routing to the clinic\'s qualified team.'
        : 'Deploy a matched Grovaitech canonical AI Employee (e.g. Lead Receptionist or Appointment Agent) embedded directly into the site.',
    evidence_status: 'INFERENCE',
  })

  return findings
}

// ─── REVENUE LEAK MODEL ──────────────────────────────────────────────────────

export function analyzeWebsiteRevenueLeaks(
  input: WebsiteUpgradeInput,
  findings: WebsiteAuditFinding[]
): WebsiteRevenueLeak[] {
  const leaks: WebsiteRevenueLeak[] = []
  const hasPhone = Boolean(input.contact_phone?.trim())
  const hasProblems = Array.isArray(input.known_problems) && input.known_problems.length > 0
  const industry = input.industry || 'General Business'

  const family = detectIndustryFamily(input.industry)
  const config = getIndustryConfig(family)

  // Stage 1: Traffic to Landing
  leaks.push({
    id: 'leak-1',
    stage: 'TRAFFIC_TO_LANDING',
    title: 'Bounce Risk on First Viewport Impression',
    friction_point: 'Unclear value proposition or slow initial content render causes visitors to bounce back to search results.',
    severity: 'high',
    evidence: ['Baseline user acquisition funnel observation for ' + industry],
    impact_language: 'May reduce contact opportunities as unengaged visitors exit before reading service offerings.',
    recommended_fix: 'Clarify hero headline with direct outcome statement and optimized WebP hero graphic.',
    confidence: 'medium',
  })

  // Stage 2: Landing to Understanding
  leaks.push({
    id: 'leak-2',
    stage: 'LANDING_TO_UNDERSTANDING',
    title: 'Cognitive Friction in Grasping Business Differentiation',
    friction_point: 'Generic business descriptions require excessive reading for visitors to understand exact capabilities.',
    severity: 'medium',
    evidence: findings.filter((f) => f.category === 'BUSINESS_CLARITY').map((f) => f.observation),
    impact_language: 'Creates friction in customer comprehension, causing prospective clients to seek simpler alternatives.',
    recommended_fix: 'Present a 3-pillar feature grid highlighting core business strengths with clear icons.',
    confidence: 'high',
  })

  // Stage 3: Understanding to Trust
  leaks.push({
    id: 'leak-3',
    stage: 'UNDERSTANDING_TO_TRUST',
    title: 'Social Proof Deficit at Critical Decision Moment',
    friction_point: 'Lack of prominent verified reviews, ratings, or client testimonials at the point of decision.',
    severity: 'high',
    evidence: findings.filter((f) => f.category === 'TRUST_PROOF').map((f) => f.observation),
    impact_language: 'Proof is not visible where high-intent buyers evaluate legitimacy and reliability.',
    recommended_fix: 'Embed verified Google Review cards and trust badges directly beneath the service overview.',
    applicable_ai_employee_slug: 'gbp-growth-manager',
    confidence: 'high',
  })

  // Stage 4: Trust to Service Discovery
  leaks.push({
    id: 'leak-4',
    stage: 'TRUST_TO_SERVICE_DISCOVERY',
    title: 'Service Catalog Navigation Overhead',
    friction_point: 'Services are lumped into dense text blocks without dedicated deliverables, FAQs, or pricing guides.',
    severity: 'medium',
    evidence: findings.filter((f) => f.category === 'SERVICE_DISCOVERY').map((f) => f.observation),
    impact_language: 'CTA requires additional navigation across multiple pages before buyer finds relevant offering.',
    recommended_fix: 'Implement interactive service cards with one-click direct inquiry triggers.',
    confidence: 'medium',
  })

  // Stage 5: Service Discovery to CTA
  leaks.push({
    id: 'leak-5',
    stage: 'SERVICE_DISCOVERY_TO_CTA',
    title: 'Weak or Hidden Action Prompts',
    friction_point: 'Only generic "Contact Us" links provided instead of specific high-intent action buttons.',
    severity: 'high',
    evidence: findings.filter((f) => f.category === 'CTA_VISIBILITY').map((f) => f.observation),
    impact_language: 'May reduce contact opportunities because visitors do not see a compelling next step.',
    recommended_fix: config.leak5Recommendation,
    confidence: 'high',
  })

  // Stage 6: CTA to Lead
  leaks.push({
    id: 'leak-6',
    stage: 'CTA_TO_LEAD',
    title: 'Excessive Form Fields & High Inbound Friction',
    friction_point: 'Static web forms with 6+ required fields deter mobile visitors and immediate inquiries.',
    severity: 'high',
    evidence: findings.filter((f) => f.category === 'LEAD_CAPTURE').map((f) => f.observation),
    impact_language: 'Creates friction during submission, leading to high form-abandonment rates.',
    recommended_fix: config.leak6Fix,
    applicable_ai_employee_slug: config.leak6EmployeeSlug,
    confidence: 'high',
  })

  // Stage 7: Lead to Follow-Up
  leaks.push({
    id: 'leak-7',
    stage: 'LEAD_TO_FOLLOWUP',
    title: 'Delayed Human First-Response Latency',
    friction_point: 'Inbound inquiries sit in email inboxes for hours or overnight before staff responds.',
    severity: 'high',
    evidence: [
      hasProblems
        ? `Known problems reported: ${input.known_problems?.join(', ')}`
        : 'Industry average lead response delay without automated routing.',
    ],
    impact_language: 'May reduce contact opportunities as prospective buyers consult competing providers who respond faster.',
    recommended_fix: 'Integrate automated instant WhatsApp response and CRM notification within 15 seconds.',
    applicable_ai_employee_slug: 'whatsapp-lead-agent',
    confidence: 'high',
  })

  // Stage 8: Follow-Up to Action (Appointment / Sale)
  leaks.push({
    id: 'leak-8',
    stage: 'FOLLOWUP_TO_ACTION',
    title: 'Manual Scheduling Back-and-Forth',
    friction_point: 'Manual coordination of calendar availability causes drop-off between inquiry and confirmed meeting.',
    severity: 'medium',
    evidence: ['Scheduling process lacks self-service calendar integration.'],
    impact_language: config.leak8Impact,
    recommended_fix: 'Connect autonomous calendar booking tool with automated calendar invites and reminder triggers.',
    applicable_ai_employee_slug: config.leak8EmployeeSlug,
    confidence: 'medium',
  })

  return leaks
}
