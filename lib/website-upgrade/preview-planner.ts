/**
 * Grovaitech AI Platform
 * lib/website-upgrade/preview-planner.ts
 *
 * Deterministic Preview Plan Synthesizer.
 * Creates an interactive preview-ready architecture mapping pages, components,
 * copy manifests, and explicit evidence gating.
 *
 * Strictly labels copy status as:
 * - VERIFIED: Supported by explicitly supplied evidence
 * - PROPOSED: Safe, professionally drafted copy awaiting customer sign-off
 * - MISSING: Critical evidence or assets required from the customer before launch
 */

import type {
  WebsiteUpgradeInput,
  WebsiteStrategy,
  UIUXPlan,
  WebsiteClaim,
  WebsitePreviewPlan,
  CopyManifestItem,
  WebsitePagePlan,
} from './types'

export function generatePreviewPlan(
  input: WebsiteUpgradeInput,
  strategy: WebsiteStrategy,
  uiPlan: UIUXPlan,
  analyzedClaims: WebsiteClaim[] = []
): WebsitePreviewPlan {
  const businessName = input.business_name || 'Business'
  const industry = input.industry || 'General Business'

  const verifiedClaims = analyzedClaims.filter((c) => c.status === 'VERIFIED_FACT')
  const gatedClaims = analyzedClaims.filter((c) => c.is_gated)

  // 1. Pages Outline
  const pages: WebsitePagePlan[] = [
    {
      page_path: '/',
      page_name: 'Homepage (Conversion Engine)',
      sections: strategy.homepage_structure,
      components: [
        'SiteHeader',
        'ConversionHero',
        'TrustPillars',
        'ServiceGrid',
        'SocialProofCarousel',
        'IntakeLeadForm',
        'FaqAccordion',
        'StickyMobileBar',
        'LocationMapSection',
        'SiteFooter',
      ],
      seo_meta_intent: `Primary organic discovery for ${businessName} in ${industry}`,
    },
    {
      page_path: '/services',
      page_name: 'Services Catalog',
      sections: strategy.service_page_structure,
      components: ['SiteHeader', 'ServiceGrid', 'IntakeLeadForm', 'SiteFooter'],
      seo_meta_intent: `High-intent commercial search for specific ${industry} service offerings`,
    },
    {
      page_path: '/contact',
      page_name: 'Contact & Booking',
      sections: ['Header', 'Contact Form & AI Chat', 'Operating Hours', 'Location Map', 'Footer'],
      components: ['SiteHeader', 'IntakeLeadForm', 'LocationMapSection', 'SiteFooter'],
      seo_meta_intent: `Direct local inquiry and appointment booking for ${businessName}`,
    },
  ]

  // Page sections map
  const page_sections: Record<string, string[]> = {
    '/': strategy.homepage_structure,
    '/services': strategy.service_page_structure,
    '/contact': ['Header', 'Intake Form', 'Hours & Map', 'Footer'],
  }

  // 2. Copy Manifest with strict status labeling
  const copy_manifest: CopyManifestItem[] = []

  // Hero Copy
  copy_manifest.push({
    section: 'Hero',
    element: 'Headline',
    content: strategy.value_proposition.headline,
    status: 'PROPOSED',
  })

  copy_manifest.push({
    section: 'Hero',
    element: 'Subheadline',
    content: strategy.value_proposition.subheadline,
    status: 'PROPOSED',
  })

  copy_manifest.push({
    section: 'Hero',
    element: 'Primary CTA Button',
    content: strategy.primary_cta.label,
    status: 'PROPOSED',
  })

  copy_manifest.push({
    section: 'Hero',
    element: 'Secondary CTA Button',
    content: strategy.secondary_cta.label,
    status: 'PROPOSED',
  })

  // Value Proposition Supporting Points
  strategy.value_proposition.supporting_points.forEach((point, idx) => {
    copy_manifest.push({
      section: 'Value Proposition',
      element: `Value Pillar ${idx + 1}`,
      content: point,
      status: 'PROPOSED',
    })
  })

  // Verified Evidence Manifest Items
  verifiedClaims.forEach((claim) => {
    copy_manifest.push({
      section: 'Proof & Badges',
      element: `Verified Fact: ${claim.detected_pattern || claim.claim_type}`,
      content: claim.text,
      status: 'VERIFIED',
      original_claim: claim,
    })
  })

  // Gated Items Manifest Items
  gatedClaims.forEach((claim) => {
    copy_manifest.push({
      section: 'Gated / Pending Proof',
      element: `Unverified Claim: ${claim.detected_pattern || claim.claim_type}`,
      content: `[GATED] "${claim.text}" — ${claim.gating_reason}`,
      status: 'MISSING',
      original_claim: claim,
    })
  })

  // Missing essential evidence items
  const missing_evidence: string[] = []
  if (gatedClaims.length > 0) {
    gatedClaims.forEach((gc) => {
      missing_evidence.push(
        `Documentation supporting "${gc.detected_pattern}": ${gc.gating_reason}`
      )
    })
  }

  if (!input.supplied_evidence || input.supplied_evidence.length === 0) {
    missing_evidence.push('Verified customer review ratings or third-party audit citations')
  }

  // Required Customer Inputs
  const required_customer_inputs: string[] = []
  if (!input.contact_phone) {
    required_customer_inputs.push('Verified business contact phone number for inbound leads')
  }
  if (!input.contact_email) {
    required_customer_inputs.push('Primary operational notification email address')
  }
  if (!input.location) {
    required_customer_inputs.push('Physical address or geographic service radius for Local SEO')
  }
  if (!input.current_services || input.current_services.length === 0) {
    required_customer_inputs.push('Itemized list of top 3-5 billable services with pricing or timeframes')
  }
  required_customer_inputs.push('High-resolution brand logo (SVG or transparent PNG)')
  required_customer_inputs.push('Google Business Profile URL for review synchronization')

  // Implementation Notes
  const implementation_notes: string[] = [
    'Built with Next.js 15 App Router and React 19 server components for edge speed.',
    'Accessibility targets (contrast 4.5:1, ARIA landmarks, keyboard focus rings) are implementation specifications to be verified upon live deployment.',
    'Zero hardcoded customer assumptions; 100% configurable via client runtime configuration.',
    'Claims Guard enforces that all unverified claims remain gated until client provides proof.',
    'Direct handoff into existing Grovaitech Deployment Engine for seamless AI Employee provisioning.',
  ]

  return {
    pages,
    page_sections,
    component_list: Object.values(uiPlan.components),
    copy_manifest,
    verified_claims: verifiedClaims,
    gated_claims: gatedClaims,
    cta_configuration: {
      primary: {
        label: strategy.primary_cta.label,
        action: strategy.primary_cta.action_type,
      },
      secondary: {
        label: strategy.secondary_cta.label,
        action: strategy.secondary_cta.action_type,
      },
      sticky_mobile: {
        enabled: true,
        label: strategy.secondary_cta.label,
      },
    },
    required_customer_inputs,
    missing_evidence,
    implementation_notes,
  }
}
