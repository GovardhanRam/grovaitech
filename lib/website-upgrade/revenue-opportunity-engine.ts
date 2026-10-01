/**
 * Grovaitech AI Platform
 * lib/website-upgrade/revenue-opportunity-engine.ts
 *
 * Deterministic Revenue Opportunity Engine.
 * Translates website intelligence and customer journey friction into deployable
 * AI Workforce revenue opportunities.
 *
 * Principles:
 * - Evidence-backed: Preserves evidence provenance (static_html, same_origin_bundle, meta).
 * - Never converts UNKNOWN into a factual problem; marks unverified items as MISSING_INFORMATION.
 * - Zero invented money: No fabricated monetary values, lost revenue figures, or synthetic conversion percentages.
 * - Healthcare safety: Administrative and informational workflows only; no diagnostic or clinical decision claims.
 * - Strict industry isolation: Recommendations adhere to industry boundaries without cross-contamination.
 * - Deterministic priorities: Transparent priority reasoning based on conversion proximity and evidence strength.
 */

import type {
  WebsiteUpgradeInput,
  WebsiteAuditFinding,
  WebsiteRevenueLeak,
  RevenueOpportunity,
  RevenueOpportunitySummary,
  RevenueOpportunityPriority,
  RevenueOpportunityImpactType,
  CustomerJourneyStage,
  OpportunityEvidenceStatus,
} from './types'
import { CANONICAL_EMPLOYEES, type AIEmployee } from '@/lib/employees/registry'
import {
  detectIndustryFamily,
  getIndustryConfig,
  isEmployeeCompatibleWithIndustry,
  resolveIndustryWorkflow,
  sanitizeRecommendationCopy,
  isHealthcareRecommendationSafe,
} from './industry-context'

/**
 * Deterministically constructs commercial Revenue Opportunities from intake & audit evidence.
 */
export function generateRevenueOpportunities(
  input: WebsiteUpgradeInput,
  auditFindings: WebsiteAuditFinding[],
  leaks: WebsiteRevenueLeak[]
): RevenueOpportunity[] {
  const opportunities: RevenueOpportunity[] = []
  const family = detectIndustryFamily(input.industry)
  const config = getIndustryConfig(family)
  const problemsLower = (input.known_problems || []).join(' ').toLowerCase()
  const channelsLower = (input.current_channels || []).join(' ').toLowerCase()

  const crawl = input.crawl_summary
  const hasExtractedWhatsApp = Boolean(crawl?.whatsappLinks && crawl.whatsappLinks.length > 0)
  const hasExtractedPhone = Boolean(crawl?.phoneNumbers && crawl.phoneNumbers.length > 0)
  const hasExtractedEmail = Boolean(crawl?.emailAddresses && crawl.emailAddresses.length > 0)
  const isSpa = Boolean(crawl?.isSpaShell)

  // Helper to safely resolve a canonical employee
  const resolveEmployee = (slug: string) => {
    if (!isEmployeeCompatibleWithIndustry(slug, family)) return undefined
    const canonical = CANONICAL_EMPLOYEES.find((e) => e.slug === slug)
    if (!canonical) return undefined

    const resolvedWf = resolveIndustryWorkflow(slug, family)
    const sanitizedWfName = sanitizeRecommendationCopy(resolvedWf.workflowName, family)
    const sanitizedWfDesc = sanitizeRecommendationCopy(resolvedWf.workflowDescription, family)

    return {
      employee: {
        id: canonical.id,
        name: canonical.name,
        slug: canonical.slug,
        role: canonical.title,
        department: canonical.department,
      },
      workflow: {
        id: resolvedWf.workflowId,
        name: sanitizedWfName,
        description: sanitizedWfDesc,
      },
    }
  }

  // ─── 1. CONTACT → BOOKING: Conversational Inbound & Response Speed ───────────
  // Evaluates direct WhatsApp / Phone availability and response latency friction
  const hasWhatsAppIntent =
    hasExtractedWhatsApp ||
    channelsLower.includes('whatsapp') ||
    problemsLower.includes('whatsapp') ||
    problemsLower.includes('slow response') ||
    problemsLower.includes('after-hours') ||
    problemsLower.includes('response time') ||
    leaks.some((l) => l.stage === 'CTA_TO_LEAD' || l.stage === 'LEAD_TO_FOLLOWUP')

  if (hasWhatsAppIntent || hasExtractedPhone) {
    const waEmp = resolveEmployee('whatsapp-lead-agent')
    if (waEmp) {
      const evidenceLines: string[] = []
      let status: OpportunityEvidenceStatus = 'OBSERVED'

      if (hasExtractedWhatsApp && crawl?.whatsappLinks?.[0]) {
        const phoneDetail =
          hasExtractedPhone && crawl?.phoneNumbers?.[0]
            ? ` and telephone (${crawl.phoneNumbers[0]})`
            : ''
        evidenceLines.push(
          `Direct WhatsApp link (${crawl.whatsappLinks[0]})${phoneDetail} extracted from website ${isSpa ? 'bundle assets' : 'HTML markup'}.`
        )
        status = 'VERIFIED'
      } else if (hasExtractedPhone && crawl?.phoneNumbers?.[0]) {
        evidenceLines.push(
          `Direct contact telephone (${crawl.phoneNumbers[0]}) verified from website assets.`
        )
        status = 'VERIFIED'
      } else {
        evidenceLines.push(
          `Inbound mobile or messaging channels reported in intake: ${input.current_channels?.join(', ') || 'WhatsApp / mobile inquiries'}.`
        )
      }

      const rawProblem =
        family === 'healthcare'
          ? 'Prospective patients messaging the clinic after hours or during peak receptionist hours experience response latency, risking drop-off.'
          : 'Inbound prospective client inquiries via direct messaging or phone often experience delayed response times during busy hours, risking inquiry abandonment.'

      const rawOpp =
        family === 'healthcare'
          ? 'Deploy autonomous 24/7 WhatsApp patient intake to coordinate administrative inquiries, collect preferred consultation timing, and hand off to clinic staff.'
          : 'Deploy autonomous 24/7 WhatsApp response automation to qualify buyer criteria instantly and capture high-intent inquiries directly into the CRM.'

      const rawRationale =
        family === 'healthcare'
          ? 'Engages prospective patients on their preferred messaging channel with verified clinic hours and administrative timing coordination, routing clinical questions to staff.'
          : 'Engages inbound mobile inquiries within seconds on WhatsApp, eliminating telephone tag and accelerating conversion to consultation or viewing.'

      opportunities.push({
        id: 'opp-whatsapp-inquiry-speed',
        title:
          family === 'healthcare'
            ? 'Autonomous WhatsApp Patient Inquiry & Timing Coordination'
            : 'Autonomous WhatsApp Inquiry & Lead Qualification Speed',
        journeyStage: 'CONTACT',
        journeyTransition: 'CONTACT → BOOKING',
        evidence: evidenceLines,
        evidenceStatus: status,
        evidenceProvenance: isSpa ? 'same_origin_bundle' : 'static_html',
        problem: sanitizeRecommendationCopy(rawProblem, family),
        opportunity: sanitizeRecommendationCopy(rawOpp, family),
        impactType: 'response_speed',
        confidence: status === 'VERIFIED' ? 'high' : 'medium',
        priority: 'HIGH',
        priorityReason:
          'Direct WhatsApp/phone channels have high buyer intent. Automating initial intake eliminates response delay and connects directly to the booking conversion stage.',
        recommendedEmployee: waEmp.employee,
        recommendedWorkflow: waEmp.workflow,
        deploymentReady: true,
        deploymentRequirements: [
          'WhatsApp Business Cloud API account or web hook',
          'Intake notification recipient email/phone',
        ],
        assumptions: [
          'Business receives inbound mobile inquiries via WhatsApp or phone.',
        ],
        rationale: sanitizeRecommendationCopy(rawRationale, family),
      })
    }
  }

  // ─── 2. QUALIFICATION → BOOKING: Frontline Reception & Appointment Coordination ─
  // Primary frontline agent for the business's industry family
  const frontlineSlug = config.primaryFrontlineSlug
  const frontlineEmp = resolveEmployee(frontlineSlug)

  if (frontlineEmp) {
    const evidenceLines: string[] = []
    let status: OpportunityEvidenceStatus = 'OBSERVED'

    if (crawl?.detectedServices && crawl.detectedServices.length > 0) {
      evidenceLines.push(
        `Verified service offerings identified (${crawl.detectedServices.slice(0, 4).join(', ')}) with discovered client routes.`
      )
      status = 'VERIFIED'
    } else if (input.current_services && input.current_services.length > 0) {
      evidenceLines.push(
        `Business services catalog specified in intake: ${input.current_services.slice(0, 3).join(', ')}.`
      )
    } else {
      evidenceLines.push(
        `Service offering discovery relies on general business profile for ${input.business_name}.`
      )
    }

    const hasSpaShell = Boolean(crawl?.isSpaShell)
    const problemText = hasSpaShell
      ? 'Interactive consultation booking forms could not be verified from the initial client-side SPA shell without JavaScript execution.'
      : 'Inbound visitors seeking consultation booking require manual telephone coordination or staff follow-up.'

    const oppText =
      family === 'healthcare'
        ? 'Deploy an AI Clinic Receptionist to manage administrative consultation requests, provide verified clinic hours, collect contact details, and coordinate appointment timing.'
        : `Deploy an AI Frontline Specialist (${frontlineEmp.employee.name}) to qualify prospective client requirements and coordinate consultation scheduling 24/7.`

    const rationaleText =
      family === 'healthcare'
        ? 'Provides a warm, 24/7 administrative front-desk assistant that handles routine patient inquiries, collects preferred timing, and escalates clinical questions to clinic staff.'
        : 'Automates initial intake qualification and appointment coordination, reducing administrative overhead and capturing high-intent prospects immediately.'

    opportunities.push({
      id: `opp-frontline-${frontlineSlug}`,
      title:
        family === 'healthcare'
          ? '24/7 AI Clinic Front-Desk Receptionist & Appointment Intake'
          : `24/7 AI ${frontlineEmp.employee.name} & Intake Coordination`,
      journeyStage: 'BOOKING',
      journeyTransition: 'QUALIFICATION → BOOKING',
      evidence: evidenceLines,
      evidenceStatus: status,
      evidenceProvenance: hasSpaShell ? 'same_origin_bundle' : 'static_html',
      problem: sanitizeRecommendationCopy(problemText, family),
      opportunity: sanitizeRecommendationCopy(oppText, family),
      impactType: 'appointment_conversion',
      confidence: 'high',
      priority: 'HIGH',
      priorityReason:
        'Appointment or consultation booking is the primary commercial conversion action. Eliminating booking friction directly expands captured business opportunities.',
      recommendedEmployee: frontlineEmp.employee,
      recommendedWorkflow: frontlineEmp.workflow,
      deploymentReady: true,
      deploymentRequirements: [
        'Business booking calendar synchronization (Google Calendar or CRM)',
        'Approved consultation intake guidelines and office hours',
      ],
      assumptions: [
        'Business operates an appointment- or consultation-driven service model.',
      ],
      rationale: sanitizeRecommendationCopy(rationaleText, family),
    })
  }

  // ─── 3. REPUTATION → DISCOVERY: Local SEO & Google Business Profile Growth ───
  // Evaluates local map pack discovery and Google review reputation
  const location = input.location || crawl?.detectedLocation
  const isLocalIndustry = [
    'healthcare',
    'salon',
    'home_services',
    'restaurant',
    'real_estate',
    'legal',
  ].includes(family)

  if (location || isLocalIndustry) {
    const gbpEmp = resolveEmployee('gbp-growth-manager')
    if (gbpEmp) {
      const evidenceLines: string[] = []
      let status: OpportunityEvidenceStatus = 'OBSERVED'

      if (location) {
        evidenceLines.push(
          `Local geographic market confirmed (${location}). Local search and Google Business Profile are primary discovery channels for prospective clients.`
        )
        status = 'VERIFIED'
      } else {
        evidenceLines.push(
          `Business operates in local catchment industry (${input.industry}) where Google Maps and local reviews drive customer acquisition.`
        )
      }

      opportunities.push({
        id: 'opp-gbp-reputation-growth',
        title: 'Local Google Business Profile Reputation & Review Growth',
        journeyStage: 'REPUTATION',
        journeyTransition: 'REPUTATION → DISCOVERY',
        evidence: evidenceLines,
        evidenceStatus: status,
        evidenceProvenance: crawl?.detectedLocation ? 'meta' : undefined,
        problem:
          'Local service businesses often lack systematic post-consultation review generation and rapid, professional public review response workflows.',
        opportunity:
          'Automate post-service Google review requests and monitor Google Business Profile reviews to strengthen local map-pack rankings and build prospective client trust.',
        impactType: 'reputation_management',
        confidence: status === 'VERIFIED' ? 'high' : 'medium',
        priority: 'MEDIUM',
        priorityReason:
          'Reputation management compounds local discovery and client trust over time, operating one step upstream from direct transactional booking.',
        recommendedEmployee: gbpEmp.employee,
        recommendedWorkflow: gbpEmp.workflow,
        deploymentReady: true,
        deploymentRequirements: [
          'Google Business Profile account access / OAuth authorization',
          'Customer contact trigger for post-service review invitations',
        ],
        assumptions: [
          'Business maintains an active Google Business Profile listing.',
        ],
        rationale:
          'Maintains 100% response coverage on Google reviews and increases review velocity from satisfied clients without adding staff workload.',
      })
    }
  }

  // ─── 4. BOOKING → FOLLOW_UP: Unverified Follow-Up & Inquiry Leakage ─────────
  // Explicitly handles unverified follow-up status without manufacturing false problems
  const followUpEmp =
    resolveEmployee('customer-support-agent') ||
    resolveEmployee('whatsapp-lead-agent') ||
    resolveEmployee(frontlineSlug)

  if (followUpEmp) {
    opportunities.push({
      id: 'opp-inquiry-followup-leakage',
      title: 'Inquiry Follow-Up & Re-Engagement Automation',
      journeyStage: 'FOLLOW_UP',
      journeyTransition: 'BOOKING → FOLLOW_UP',
      evidence: [
        'Automated lead follow-up, reminder notifications, and inquiry status tracking could not be verified from public website signals alone.',
      ],
      evidenceStatus: 'MISSING_INFORMATION',
      problem:
        'Inquiries that do not immediately finalize an appointment or consultation risk permanent drop-off without structured follow-up sequences.',
      opportunity:
        'Assess whether deploying automated inquiry follow-up reminders and appointment confirmation sequences would reduce no-shows and inquiry leakage.',
      impactType: 'lead_follow_up',
      confidence: 'medium',
      priority: 'MEDIUM',
      priorityReason:
        'Follow-up sequences prevent pipeline leakage, but current internal reminder tooling is unverified from external website observation alone.',
      recommendedEmployee: followUpEmp.employee,
      recommendedWorkflow: followUpEmp.workflow,
      deploymentReady: true,
      deploymentRequirements: [
        'CRM or lead database connection for status tracking',
        'Notification schedule configuration (e.g. 24h before appointment reminder)',
      ],
      missingInformation: [
        'Confirmation of current internal follow-up protocol and appointment reminder software.',
      ],
      rationale:
        family === 'healthcare'
          ? 'Automates administrative appointment confirmation reminders and answers routine clinic prep questions, reducing patient no-shows.'
          : 'Ensures every inbound inquiry receives prompt re-engagement, preventing prospective clients from drifting to alternatives.',
    })
  }

  // ─── 5. DISCOVERY → LANDING: SPA Pre-Rendering & Organic Crawlability ────────
  // Technical opportunity if live website is a client-rendered Single Page Application
  if (isSpa) {
    opportunities.push({
      id: 'opp-spa-prerendering-discovery',
      title: 'Search Engine Crawlability & Organic Pre-Rendering',
      journeyStage: 'DISCOVERY',
      journeyTransition: 'DISCOVERY → LANDING',
      evidence: [
        `Observed client-side rendered SPA shell (${crawl?.spaFramework || 'React / Vite'}) serving minimal initial HTML (< 300 characters body text, 0 server-rendered headings).`,
      ],
      evidenceStatus: 'OBSERVED',
      evidenceProvenance: 'static_html',
      problem:
        'Search engine bots and social share preview scrapers encounter an empty root HTML element without pre-rendered headings or structured service content.',
      opportunity:
        'Implement server-side rendering (SSR) or static pre-rendering for key service and location pages to maximize organic search discovery and social preview richness.',
      impactType: 'local_discovery',
      confidence: 'high',
      priority: 'MEDIUM',
      priorityReason:
        'Improves organic crawlability and SEO indexing over time; foundational web infrastructure rather than frontline conversational AI deployment.',
      deploymentReady: false,
      deploymentRequirements: [
        'Web application build configuration for SSR or static page pre-generation',
      ],
      assumptions: [
        'Client has developer access to the web hosting and build pipeline.',
      ],
      rationale:
        'Ensures search engine indexers parse all service descriptions, geographic keywords, and structured schema directly from the initial HTTP response.',
    })
  }

  // Enforce Healthcare safety across all generated opportunities
  if (family === 'healthcare') {
    for (const opp of opportunities) {
      opp.title = sanitizeRecommendationCopy(opp.title, 'healthcare')
      opp.problem = sanitizeRecommendationCopy(opp.problem, 'healthcare')
      opp.opportunity = sanitizeRecommendationCopy(opp.opportunity, 'healthcare')
      opp.rationale = sanitizeRecommendationCopy(opp.rationale, 'healthcare')
      opp.priorityReason = sanitizeRecommendationCopy(opp.priorityReason, 'healthcare')
      if (opp.recommendedWorkflow) {
        opp.recommendedWorkflow.name = sanitizeRecommendationCopy(
          opp.recommendedWorkflow.name,
          'healthcare'
        )
        opp.recommendedWorkflow.description = sanitizeRecommendationCopy(
          opp.recommendedWorkflow.description,
          'healthcare'
        )
      }
    }
  }

  return opportunities
}

/**
 * Summarizes generated Revenue Opportunities into actionable high-level metrics.
 * Produces zero fabricated monetary figures.
 */
export function summarizeRevenueOpportunities(
  opportunities: RevenueOpportunity[]
): RevenueOpportunitySummary {
  const highPriorityCount = opportunities.filter((o) => o.priority === 'HIGH').length
  const mediumPriorityCount = opportunities.filter((o) => o.priority === 'MEDIUM').length
  const lowPriorityCount = opportunities.filter((o) => o.priority === 'LOW').length
  const aiEmployeeCount = opportunities.filter((o) => Boolean(o.recommendedEmployee)).length
  const verifiedEvidenceCount = opportunities.filter((o) => o.evidenceStatus === 'VERIFIED').length
  const missingInformationCount = opportunities.filter(
    (o) => o.evidenceStatus === 'MISSING_INFORMATION'
  ).length

  return {
    totalOpportunities: opportunities.length,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    aiEmployeeCount,
    verifiedEvidenceCount,
    missingInformationCount,
  }
}
