/**
 * Grovaitech AI Platform
 * lib/website-upgrade/strategy.ts
 *
 * Deterministic Strategy & UI/UX Upgrade Plan Generator.
 * Transforms intake and audit intelligence into actionable conversion blueprints.
 * Mapped strictly to the CANONICAL Grovaitech AI workforce without duplicate concepts.
 */

import type {
  WebsiteUpgradeInput,
  WebsiteStrategy,
  UIUXPlan,
  AIOpportunity,
  WebsiteAuditFinding,
  WebsiteRevenueLeak,
} from './types'
import { CANONICAL_EMPLOYEES } from '@/lib/employees/registry'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'
import {
  detectIndustryFamily,
  getIndustryConfig,
  isEmployeeCompatibleWithIndustry,
  resolveIndustryWorkflow,
  sanitizeRecommendationCopy,
} from './industry-context'

/**
 * Resolves high-impact AI Employee opportunities from the canonical workforce.
 */
export function resolveAIOpportunities(
  input: WebsiteUpgradeInput,
  leaks: WebsiteRevenueLeak[]
): AIOpportunity[] {
  const opportunities: AIOpportunity[] = []
  const family = detectIndustryFamily(input.industry)
  const config = getIndustryConfig(family)
  const problemsLower = (input.known_problems || []).join(' ').toLowerCase()

  // Matcher helper
  const addMatch = (slug: string, matchedNeed: string, integrationPoint: string) => {
    if (!isEmployeeCompatibleWithIndustry(slug, family)) return
    const canonical = CANONICAL_EMPLOYEES.find((e) => e.slug === slug)
    if (!canonical) return

    const resolvedWf = resolveIndustryWorkflow(slug, family)

    if (!opportunities.some((o) => o.employee_slug === slug)) {
      opportunities.push({
        employee_id: canonical.id,
        employee_slug: canonical.slug,
        employee_name: canonical.name,
        role: canonical.title,
        department: canonical.department,
        matched_need: sanitizeRecommendationCopy(matchedNeed, family),
        integration_point: integrationPoint,
        workflow_id: resolvedWf.workflowId,
        workflow_name: resolvedWf.workflowName,
      })
    }
  }

  // 1. Industry-specific frontline agent
  switch (family) {
    case 'healthcare':
      addMatch(
        'clinic-receptionist',
        'Administrative patient appointment booking, inquiry handling, and timing coordination',
        'Appointment booking modal & sticky mobile CTA'
      )
      break
    case 'real_estate':
      addMatch(
        'real-estate-lead-receptionist',
        'Qualify inbound buyers and schedule property viewings 24/7',
        'Hero booking widget & WhatsApp link'
      )
      break
    case 'legal':
      addMatch(
        'legal-intake-agent',
        'Structured legal matter intake, conflict check, and consultation booking',
        'Legal consultation intake card'
      )
      break
    case 'salon':
      addMatch(
        'salon-spa-receptionist',
        'Stylist & service appointment coordination and client confirmations',
        'Instant appointment booking widget'
      )
      break
    case 'home_services':
      addMatch(
        'hvac-lead-recovery',
        'Emergency service dispatch and missed-call follow-up',
        'Emergency service banner & SMS/WhatsApp trigger'
      )
      break
    case 'finance':
      addMatch(
        'financial-advisory-agent',
        'Pre-consultation financial readiness qualification and lead capture',
        'Financial assessment calculator & form'
      )
      break
    case 'ecommerce':
      addMatch(
        'ecommerce-support-agent',
        'Automated order status inquiries, returns, and product recommendation',
        'Bottom-right embedded support drawer'
      )
      break
    case 'restaurant':
    case 'general':
    default:
      addMatch(
        'customer-support-agent',
        'Instant 24/7 tier-1 customer inquiries and FAQ resolution',
        'Website chat drawer & lead form'
      )
      break
  }

  // 2. WhatsApp conversational sales channel
  if (
    problemsLower.includes('whatsapp') ||
    problemsLower.includes('drop-off') ||
    problemsLower.includes('slow response') ||
    problemsLower.includes('response time') ||
    problemsLower.includes('after-hours') ||
    leaks.some((l) => l.stage === 'LEAD_TO_FOLLOWUP' || l.stage === 'CTA_TO_LEAD')
  ) {
    addMatch(
      'whatsapp-lead-agent',
      family === 'healthcare'
        ? 'Engage patient inquiries on WhatsApp with verified clinic information, preferred appointment timing, and front-desk coordination'
        : 'Engage mobile visitors directly on WhatsApp with sub-30s response times',
      'Sticky mobile WhatsApp button and QR code'
    )
  }

  // 3. Local Reputation & Review Growth
  if (
    input.location ||
    problemsLower.includes('review') ||
    problemsLower.includes('seo') ||
    problemsLower.includes('google') ||
    problemsLower.includes('reputation') ||
    leaks.some((l) => l.stage === 'UNDERSTANDING_TO_TRUST')
  ) {
    addMatch(
      'gbp-growth-manager',
      'Automated Google review requests, local reputation monitoring, and local SEO citations',
      'Post-service review automation trigger'
    )
  }

  // Ensure at least 1 opportunity from allowed roster
  if (opportunities.length === 0) {
    addMatch(
      config.primaryFrontlineSlug,
      'Automated inquiry assistance and conversion coordination',
      'Floating website assistant'
    )
  }

  return opportunities
}

/**
 * Builds the comprehensive website strategy.
 */
export function generateWebsiteStrategy(
  input: WebsiteUpgradeInput,
  findings: WebsiteAuditFinding[],
  leaks: WebsiteRevenueLeak[]
): WebsiteStrategy {
  const family = detectIndustryFamily(input.industry)
  const config = getIndustryConfig(family)
  const businessName = input.business_name || 'Business'
  const industry = input.industry || 'Professional Services'
  const targetAudience = input.target_audience || `Clients and customers seeking dependable ${industry} solutions`
  const aiOpportunities = resolveAIOpportunities(input, leaks)

  // Determine CTA pairing from industry configuration
  const primaryCtaLabel = config.primaryCtaLabel
  const primaryCtaType = config.primaryCtaType

  const secondaryCtaLabel = config.secondaryCtaLabel
  const secondaryCtaType = 'chat'

  // Headline & Value Proposition
  const headline = `Professional, High-Reliability ${industry} Tailored to Your Needs`
  const subheadline = `Experience transparent guidance, prompt response times, and exceptional service standards at ${businessName}.`

  const supportingPoints = [
    `Dedicated ${industry} specialists committed to prompt service`,
    'Clear, upfront consultation with zero hidden complexities',
    'Rapid response to all customer inquiries via web and WhatsApp',
  ]

  // Trust strategy
  const verifiedProofItems = (input.supplied_evidence || []).map((e) => e.fact)
  const missingProofItems = [
    'Recent authentic customer testimonial quotes with client initials or photos',
    'Verified Google Business rating badge and review count',
    'Official business registration or professional practice credentials',
  ]

  // Sitemap
  const sitemap = [
    { path: '/', title: 'Home', purpose: 'Primary conversion hub, value proposition, and instant intake', priority: 'high' as const },
    { path: '/services', title: 'Services & Solutions', purpose: 'Granular breakdown of offerings, deliverables, and process', priority: 'high' as const },
    { path: '/reviews', title: 'Client Reviews & Case Studies', purpose: 'Verified social proof, before/after stories, and outcomes', priority: 'medium' as const },
    { path: '/about', title: 'About & Credentials', purpose: 'Team background, values, and professional standards', priority: 'medium' as const },
    { path: '/contact', title: 'Contact & Location', purpose: 'Interactive map, contact hours, phone, and direct messaging', priority: 'high' as const },
  ]

  // Homepage structure
  const homepage_structure = [
    'Header (Brand Logo, Navigation Links, Primary CTA Button)',
    'Hero Section (Outcome Headline, Subhead, Primary Action, Secondary WhatsApp, Social Proof Badge)',
    'Key Benefits / Value Pillars (3 cards with concrete advantages)',
    'Featured Services Grid (Detailed service cards with direct inquiry buttons)',
    'Verified Social Proof & Reviews Carousel',
    'How It Works / 3-Step Engagement Process',
    'Interactive AI Intake & Consultation Scheduling Drawer',
    'Comprehensive FAQ Accordion (Addressing top 5 client hesitations)',
    'Location & Operating Hours Map Banner',
    'Footer (NAP Details, Quick Links, Privacy Policy, Terms)',
  ]

  // Service page structure
  const service_page_structure = [
    'Service Header with Contextual Breadcrumbs',
    'Service Overview & Specific Problem Solved',
    'What Is Included (Itemized Checklist)',
    'Expected Timeline & Engagement Stages',
    'Client Case Study / Example Outcome',
    'Specific Service FAQ',
    'Direct Consultation Booking Form',
  ]

  // Conversion journey steps
  const conversion_journey_steps = [
    {
      step_number: 1,
      stage_name: 'Visitor Arrival',
      user_action: 'Lands on homepage or localized service landing page',
      friction_eliminated: 'Instant clarity on core offering within 5 seconds without cognitive clutter',
    },
    {
      step_number: 2,
      stage_name: 'Value & Trust Verification',
      user_action: 'Scans key benefits and verified social proof badges',
      friction_eliminated: 'Eliminates skepticism through transparent verified testimonials and credentials',
    },
    {
      step_number: 3,
      stage_name: 'Low-Friction Action Selection',
      user_action: 'Clicks primary CTA or starts quick WhatsApp chat',
      friction_eliminated: 'Provides immediate channel matching visitor preference (booking vs instant chat)',
    },
    {
      step_number: 4,
      stage_name: 'Autonomous 24/7 Qualification',
      user_action: config.conversionStep4Action,
      friction_eliminated: 'No waiting for office hours or manual email replies; inquiries answered in <30 seconds',
    },
    {
      step_number: 5,
      stage_name: 'Confirmed Consultation / Hand-Off',
      user_action: 'Receives instant confirmation and calendar invite / WhatsApp summary',
      friction_eliminated: 'Eliminates missed appointments and manual phone tag follow-up',
    },
  ]

  return {
    primary_audience: targetAudience,
    customer_intent:
      family === 'healthcare'
        ? `Seeking verified clinic hours, appointment availability, and transparent consultation scheduling for ${businessName}.`
        : `Seeking trusted, responsive ${industry} expertise with immediate availability and transparent communication.`,
    primary_website_objective:
      family === 'healthcare'
        ? `Provide transparent clinic information and convert visitors into scheduled consultations while routing clinical questions to the clinic's qualified team.`
        : `Convert qualified visitors into scheduled consultations or direct inbound inquiries at maximum velocity.`,
    primary_cta: {
      label: primaryCtaLabel,
      action_type: primaryCtaType,
      placement: 'Hero right/center, sticky header, and end-of-page banner',
    },
    secondary_cta: {
      label: secondaryCtaLabel,
      action_type: secondaryCtaType,
      placement: 'Hero secondary button, sticky mobile bottom bar, and floating widget',
    },
    value_proposition: {
      headline,
      subheadline,
      supporting_points: supportingPoints,
      status: 'PROPOSED_COPY',
    },
    trust_strategy: {
      elements_needed: [
        'Google Review rating summary card (e.g. verified 4.8+ rating)',
        'Local business licensing or accreditation identifiers',
        'Transparent step-by-step engagement process',
      ],
      recommended_proof_types: [
        'Direct customer testimonials',
        'Verified Google Business reviews',
        'Professional association credentials',
      ],
      verified_proof_items: verifiedProofItems,
      missing_proof_items: missingProofItems,
    },
    sitemap,
    homepage_structure,
    service_page_structure,
    conversion_journey_steps,
    ai_employee_opportunities: aiOpportunities,
  }
}

/**
 * Builds the UI/UX implementation specification.
 * Accessibility target is strictly marked as an implementation target until verified.
 */
export function generateUIUXPlan(input: WebsiteUpgradeInput): UIUXPlan {
  const industry = (input.industry || 'general').toLowerCase()

  // Select balanced accessible color palettes by domain
  let primaryColor = '#2563EB' // blue-600
  let secondaryColor = '#0F172A' // slate-900
  let accentColor = '#38BDF8' // sky-400

  if (industry.includes('health') || industry.includes('clinic') || industry.includes('dental')) {
    primaryColor = '#0D9488' // teal-600
    secondaryColor = '#134E4A' // teal-900
    accentColor = '#2DD4BF' // teal-400
  } else if (industry.includes('real estate') || industry.includes('property')) {
    primaryColor = '#1D4ED8' // blue-700
    secondaryColor = '#0F172A' // slate-900
    accentColor = '#F59E0B' // amber-500
  } else if (industry.includes('legal') || industry.includes('finance')) {
    primaryColor = '#1E3A8A' // blue-900
    secondaryColor = '#0F172A' // slate-900
    accentColor = '#D97706' // amber-600
  }

  return {
    design_direction: 'Modern clean architectural layout with generous whitespace, high-contrast typography, and explicit thumb-friendly mobile action targets.',
    color_tokens: {
      primary: primaryColor,
      secondary: secondaryColor,
      accent: accentColor,
      background: '#FFFFFF',
      surface: '#F8FAFC',
      text_primary: '#0F172A',
      text_muted: '#64748B',
      border: '#E2E8F0',
    },
    typography: {
      heading_font: 'Inter, system-ui, sans-serif (font-bold tracking-tight)',
      body_font: 'Inter, system-ui, sans-serif (font-normal leading-relaxed text-slate-600)',
      scale_notes: 'Hero h1: text-4xl sm:text-5xl font-extrabold; Section h2: text-2xl sm:text-3xl font-bold; Card h3: text-lg font-semibold; Body: text-base',
    },
    spacing_system: '8pt grid system using Tailwind rem steps (py-12 sm:py-20 for section padding; gap-6 to gap-8 for grids; p-6 for card surfaces).',
    responsive_breakpoints: {
      sm: '640px (single column stack to dual column layout)',
      md: '768px (navigation collapse to expanded header menu)',
      lg: '1024px (service grid 3-column expansion; hero split content layout)',
      xl: '1280px (max-w-7xl bounded container with centered gutters)',
    },
    components: {
      header: {
        component_id: 'cmp-header',
        name: 'SiteHeader',
        section: 'Global Navigation',
        purpose: 'Provides persistent brand identity, primary navigation links, and primary CTA trigger.',
        props_specification: {
          brandName: 'string',
          logoUrl: 'string | null',
          navLinks: 'Array<{ label: string; href: string }>',
          ctaText: 'string',
        },
        accessibility_target: 'Semantic <header> landmark with role="banner", aria-expanded on mobile menu toggle, and visible keyboard focus ring on all focusable links.',
      },
      hero: {
        component_id: 'cmp-hero',
        name: 'ConversionHero',
        section: 'Above The Fold',
        purpose: 'Captures attention with outcome-focused value proposition and immediate action triggers.',
        props_specification: {
          headline: 'string',
          subheadline: 'string',
          primaryCtaText: 'string',
          secondaryCtaText: 'string',
          badgeText: 'string',
        },
        accessibility_target: 'Semantic <h1> hierarchy for main headline; minimum 44x44px touch targets on buttons.',
      },
      service_cards: {
        component_id: 'cmp-services',
        name: 'ServiceGrid',
        section: 'Services',
        purpose: 'Displays categorized offerings with deliverables and direct consultation buttons.',
        props_specification: {
          services: 'Array<{ id: string; title: string; description: string; benefits: string[] }>',
        },
        accessibility_target: 'Structured <ul> and <li> semantic list items with <h3> card headings for screen reader outlines.',
      },
      trust_sections: {
        component_id: 'cmp-trust',
        name: 'TrustPillars',
        section: 'Value Proposition',
        purpose: 'Reinforces operational standards, speed, and customer care principles.',
        props_specification: {
          pillars: 'Array<{ title: string; detail: string; icon: string }>',
        },
        accessibility_target: 'SVG decorative icons marked with aria-hidden="true" to prevent screen reader stutter.',
      },
      proof_reviews: {
        component_id: 'cmp-reviews',
        name: 'SocialProofCarousel',
        section: 'Customer Reviews',
        purpose: 'Showcases authentic testimonials, rating badges, and verifiable client feedback.',
        props_specification: {
          reviews: 'Array<{ author: string; rating: number; text: string; date?: string }>',
          source: 'string',
        },
        accessibility_target: 'ARIA live region for carousel navigation with pause controls and accessible previous/next button labels.',
      },
      forms: {
        component_id: 'cmp-form',
        name: 'IntakeLeadForm',
        section: 'Conversion',
        purpose: 'Captures qualified inquiry criteria (name, contact, service interest, notes) with zero friction.',
        props_specification: {
          onSubmit: '(data: LeadData) => Promise<void>',
          fields: 'Array<{ name: string; label: string; type: string; required: boolean }>',
        },
        accessibility_target: 'Explicit <label> elements with matching htmlFor attributes; aria-invalid and aria-describedby for error states.',
      },
      sticky_mobile_cta: {
        component_id: 'cmp-sticky-cta',
        name: 'StickyMobileBar',
        section: 'Mobile Viewport Overlay',
        purpose: 'Maintains persistent thumb-reachable Call and WhatsApp buttons on mobile screens.',
        props_specification: {
          phone: 'string',
          whatsappUrl: 'string',
        },
        accessibility_target: 'Fixed position bottom bar with aria-label="Quick contact options" and safe-area-inset padding for notched devices.',
      },
      faq: {
        component_id: 'cmp-faq',
        name: 'FaqAccordion',
        section: 'Objection Handling',
        purpose: 'Resolves common client hesitations and purchase barriers self-servingly.',
        props_specification: {
          items: 'Array<{ question: string; answer: string }>',
        },
        accessibility_target: 'Standard WAI-ARIA accordion pattern with aria-controls, aria-expanded, and arrow key keyboard navigation.',
      },
      location_contact: {
        component_id: 'cmp-location',
        name: 'LocationMapSection',
        section: 'Local Presence',
        purpose: 'Displays physical location, hours, service radius, and Google Maps embed.',
        props_specification: {
          address: 'string',
          hours: 'string',
          mapEmbedUrl: 'string',
        },
        accessibility_target: 'Title attribute on iframe embed; address encapsulated in semantic <address> element.',
      },
      footer: {
        component_id: 'cmp-footer',
        name: 'SiteFooter',
        section: 'Global Footer',
        purpose: 'Provides copyright, legal terms, site map links, and contact information.',
        props_specification: {
          companyName: 'string',
          legalLinks: 'Array<{ label: string; href: string }>',
        },
        accessibility_target: 'Semantic <footer> landmark with role="contentinfo".',
      },
    },
    accessibility_targets: {
      contrast_ratio_target: 'Minimum 4.5:1 text-to-background contrast ratio (WCAG AA target).',
      keyboard_navigation: 'Complete tab order sequence with visible focus rings across all interactive elements.',
      aria_landmarks: 'Clear landmark hierarchy (<header>, <nav>, <main>, <section>, <footer>).',
      focus_indicators: 'Focus visible ring: 2px solid with 2px offset.',
      alt_text_policy: 'Meaningful alt text for descriptive images; aria-hidden="true" for purely decorative graphics.',
      compliance_status: 'IMPLEMENTATION_TARGET_UNVERIFIED',
    },
  }
}
