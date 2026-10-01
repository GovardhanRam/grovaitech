/**
 * Grovaitech AI Platform
 * lib/website-upgrade/types.ts
 *
 * Core domain types and interfaces for the GOVA Website Upgrade Employee.
 * Strongly typed, business-agnostic, and evidence-backed.
 */

import type { Prospect, CrmReadiness } from '@/lib/deployment/types'

// ─── EVIDENCE & CLAIM STATUS ──────────────────────────────────────────────────

export type EvidenceStatus =
  | 'VERIFIED_FACT'    // Proven by explicitly supplied, verified evidence
  | 'OBSERVATION'      // Direct observable fact from provided website content/URL
  | 'INFERENCE'        // Logical conclusion drawn from observations (never auto-promoted to fact)
  | 'ASSUMPTION'       // Working premise requiring client confirmation
  | 'PROPOSED_COPY'    // Copy created for preview/upgrade, subject to client review
  | 'UNKNOWN'          // Missing information or unverified claim that must remain gated

export type WebsiteClaimType =
  | 'superlative'          // "best", "#1", "leading", "cheapest", "most trusted"
  | 'numerical_metric'      // exact customer count, revenue figure, conversion rate
  | 'award'                 // industry awards, recognitions
  | 'certification'         // ISO, board certifications, compliance badges
  | 'credential'            // university degrees, doctorates, staff licenses
  | 'experience'            // "20 years of experience", established dates
  | 'pricing'               // exact prices, guarantee of lowest rate
  | 'medical_outcome'       // cure, 100% painless, zero side effects
  | 'guarantee'             // legal, financial, or performance guarantees
  | 'general'               // standard descriptive statement

export interface WebsiteEvidence {
  id: string
  fact: string
  source: 'user_input' | 'website_content' | 'document' | 'third_party_verified'
  source_reference?: string
  verified_at?: string
  raw_text?: string
}

export interface WebsiteClaim {
  id: string
  text: string
  claim_type: WebsiteClaimType
  status: EvidenceStatus
  source_reference?: string
  is_gated: boolean
  gating_reason?: string
  detected_pattern?: string
  replacement_suggestion?: string
}

// ─── WORKSPACE INPUT ─────────────────────────────────────────────────────────

export interface WebsiteUpgradeInput {
  url?: string
  business_name: string
  industry: string
  target_audience?: string
  current_description?: string
  current_services?: string[]
  known_problems?: string[]
  current_channels?: string[]
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  location?: string
  budget?: string
  timeline?: string
  raw_site_text?: string
  supplied_evidence?: WebsiteEvidence[]
  crawl_summary?: {
    totalPagesCrawled: number
    totalHeadingsFound: number
    totalFormsFound: number
    totalCtasFound: number
    phoneNumbers: string[]
    emailAddresses: string[]
    whatsappLinks: string[]
    detectedServices: string[]
    detectedTitle?: string
    detectedDescription?: string
    detectedLocation?: string
    missingCriticalElements: string[]
    isSpaShell?: boolean
    spaFramework?: string
    discoveredRoutes?: string[]
  }
  crawl_result?: any
}

// ─── AUDIT DOMAIN ────────────────────────────────────────────────────────────

export type WebsiteAuditCategory =
  | 'BUSINESS_CLARITY'
  | 'VALUE_PROPOSITION'
  | 'NAVIGATION'
  | 'MOBILE_UX'
  | 'CTA_VISIBILITY'
  | 'LEAD_CAPTURE'
  | 'SERVICE_DISCOVERY'
  | 'TRUST_PROOF'
  | 'CONTENT_GAPS'
  | 'LOCAL_SEO'
  | 'ACCESSIBILITY'
  | 'PERFORMANCE_OBSERVATIONS'
  | 'TECHNICAL_UX'
  | 'CONVERSION_JOURNEY'
  | 'AI_EMPLOYEE_OPPORTUNITIES'

export type AuditPriority =
  | 'P0' // Broken / inaccessible / unsafe / blocking
  | 'P1' // High-confidence important issue
  | 'P2' // Meaningful improvement
  | 'P3' // Low-impact optimization

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low'

export interface WebsiteAuditFinding {
  id: string
  category: WebsiteAuditCategory
  title: string
  priority: AuditPriority
  severity: AuditSeverity
  observation: string
  evidence: string[]
  recommendation: string
  uncertainty?: string
  evidence_status: EvidenceStatus
}

// ─── REVENUE LEAK MODEL ──────────────────────────────────────────────────────

export type WebsiteJourneyStage =
  | 'TRAFFIC_TO_LANDING'
  | 'LANDING_TO_UNDERSTANDING'
  | 'UNDERSTANDING_TO_TRUST'
  | 'TRUST_TO_SERVICE_DISCOVERY'
  | 'SERVICE_DISCOVERY_TO_CTA'
  | 'CTA_TO_LEAD'
  | 'LEAD_TO_FOLLOWUP'
  | 'FOLLOWUP_TO_ACTION'

export interface WebsiteRevenueLeak {
  id: string
  stage: WebsiteJourneyStage
  title: string
  friction_point: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  evidence: string[]
  /** Non-fabricated impact language (e.g. "may reduce contact opportunities", "creates friction", "proof is not visible") */
  impact_language: string
  recommended_fix: string
  applicable_ai_employee_slug?: string
  confidence: 'high' | 'medium' | 'low'
  uncertainty?: string
}

// ─── REVENUE OPPORTUNITY ENGINE (COMMERCIAL EXPANSION) ────────────────────────

export type CustomerJourneyStage =
  | 'DISCOVERY'
  | 'LANDING'
  | 'CONTACT'
  | 'QUALIFICATION'
  | 'BOOKING'
  | 'CONVERSION'
  | 'FOLLOW_UP'
  | 'RETENTION'
  | 'REPUTATION'

export type OpportunityEvidenceStatus =
  | 'OBSERVED'
  | 'VERIFIED'
  | 'INFERENCE'
  | 'RECOMMENDATION'
  | 'MISSING_INFORMATION'

export type RevenueOpportunityImpactType =
  | 'inquiry_capture'
  | 'contact_friction'
  | 'appointment_conversion'
  | 'response_speed'
  | 'lead_qualification'
  | 'lead_follow_up'
  | 'booking_coordination'
  | 'local_discovery'
  | 'reputation_management'
  | 'retention_customer_success'

export type RevenueOpportunityPriority = 'HIGH' | 'MEDIUM' | 'LOW'

export interface RevenueOpportunity {
  id: string
  title: string
  journeyStage: CustomerJourneyStage
  journeyTransition?: string // e.g. "CONTACT → BOOKING"
  evidence: string[]
  evidenceStatus: OpportunityEvidenceStatus
  evidenceProvenance?: 'static_html' | 'meta' | 'json_ld' | 'same_origin_bundle' | 'noscript'
  problem: string
  opportunity: string
  impactType: RevenueOpportunityImpactType
  confidence: 'high' | 'medium' | 'low'
  priority: RevenueOpportunityPriority
  priorityReason: string
  recommendedEmployee?: {
    id: string
    name: string
    slug: string
    role: string
    department: string
  }
  recommendedWorkflow?: {
    id: string
    name: string
    description: string
  }
  deploymentReady: boolean
  deploymentRequirements?: string[]
  assumptions?: string[]
  missingInformation?: string[]
  rationale: string
}

export interface RevenueOpportunitySummary {
  totalOpportunities: number
  highPriorityCount: number
  mediumPriorityCount: number
  lowPriorityCount: number
  aiEmployeeCount: number
  verifiedEvidenceCount: number
  missingInformationCount: number
}

// ─── STRATEGY DOMAIN ─────────────────────────────────────────────────────────

export interface AIOpportunity {
  employee_id: string
  employee_slug: string
  employee_name: string
  role: string
  department: string
  matched_need: string
  integration_point: string
  workflow_id: string
  workflow_name: string
}

export interface WebsiteStrategy {
  primary_audience: string
  customer_intent: string
  primary_website_objective: string
  primary_cta: {
    label: string
    action_type: 'lead_form' | 'booking' | 'chat' | 'call' | 'contact'
    placement: string
  }
  secondary_cta: {
    label: string
    action_type: 'lead_form' | 'booking' | 'chat' | 'call' | 'contact'
    placement: string
  }
  value_proposition: {
    headline: string
    subheadline: string
    supporting_points: string[]
    status: EvidenceStatus
  }
  trust_strategy: {
    elements_needed: string[]
    recommended_proof_types: string[]
    verified_proof_items: string[]
    missing_proof_items: string[]
  }
  sitemap: Array<{
    path: string
    title: string
    purpose: string
    priority: 'high' | 'medium' | 'low'
  }>
  homepage_structure: string[]
  service_page_structure: string[]
  conversion_journey_steps: Array<{
    step_number: number
    stage_name: string
    user_action: string
    friction_eliminated: string
  }>
  ai_employee_opportunities: AIOpportunity[]
}

// ─── UI / UX SPECIFICATION ──────────────────────────────────────────────────

export interface WebsiteComponentPlan {
  component_id: string
  name: string
  section: string
  purpose: string
  props_specification: Record<string, string>
  accessibility_target: string
}

export interface UIUXPlan {
  design_direction: string
  color_tokens: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text_primary: string
    text_muted: string
    border: string
  }
  typography: {
    heading_font: string
    body_font: string
    scale_notes: string
  }
  spacing_system: string
  responsive_breakpoints: Record<string, string>
  components: {
    header: WebsiteComponentPlan
    hero: WebsiteComponentPlan
    service_cards: WebsiteComponentPlan
    trust_sections: WebsiteComponentPlan
    proof_reviews: WebsiteComponentPlan
    forms: WebsiteComponentPlan
    sticky_mobile_cta: WebsiteComponentPlan
    faq: WebsiteComponentPlan
    location_contact: WebsiteComponentPlan
    footer: WebsiteComponentPlan
  }
  accessibility_targets: {
    contrast_ratio_target: string
    keyboard_navigation: string
    aria_landmarks: string
    focus_indicators: string
    alt_text_policy: string
    compliance_status: 'IMPLEMENTATION_TARGET_UNVERIFIED'
  }
}

// ─── PREVIEW PLAN ────────────────────────────────────────────────────────────

export interface WebsitePagePlan {
  page_path: string
  page_name: string
  sections: string[]
  components: string[]
  seo_meta_intent: string
}

export interface CopyManifestItem {
  section: string
  element: string
  content: string
  status: 'VERIFIED' | 'PROPOSED' | 'MISSING'
  original_claim?: WebsiteClaim
}

export interface WebsitePreviewPlan {
  pages: WebsitePagePlan[]
  page_sections: Record<string, string[]>
  component_list: WebsiteComponentPlan[]
  copy_manifest: CopyManifestItem[]
  verified_claims: WebsiteClaim[]
  gated_claims: WebsiteClaim[]
  cta_configuration: {
    primary: { label: string; action: string }
    secondary: { label: string; action: string }
    sticky_mobile: { enabled: boolean; label: string }
  }
  required_customer_inputs: string[]
  missing_evidence: string[]
  implementation_notes: string[]
}

// ─── DEPLOYMENT INTEGRATION HANDOFF ──────────────────────────────────────────

export interface DeploymentHandoffPayload {
  prospect: Prospect
  primary_employee_slug: string
  assigned_workflow_id: string
  website_metadata: {
    url?: string
    audit_findings_count: number
    revenue_leaks_count: number
    revenue_opportunities_count?: number
    verified_claims_count: number
    gated_claims_count: number
    ui_direction: string
  }
  crm_readiness: CrmReadiness
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  approved_by?: string
  approved_at?: string
  notes?: string
}

// ─── OVERALL RESULT ─────────────────────────────────────────────────────────

export interface WebsiteUpgradeResult {
  input: WebsiteUpgradeInput
  intelligence: {
    detected_industry: string
    business_clarity_score: number // 0 - 100
    signals_found: string[]
    claims_analyzed: WebsiteClaim[]
    claims_summary: {
      total: number
      verified: number
      gated: number
      proposed: number
    }
    crawl_summary?: {
      totalPagesCrawled: number
      totalHeadingsFound: number
      totalFormsFound: number
      totalCtasFound: number
      phoneNumbers: string[]
      emailAddresses: string[]
      whatsappLinks: string[]
      detectedServices: string[]
      detectedTitle?: string
      detectedDescription?: string
      detectedLocation?: string
      missingCriticalElements: string[]
      isSpaShell?: boolean
      spaFramework?: string
      discoveredRoutes?: string[]
    }
  }
  audit_findings: WebsiteAuditFinding[]
  revenue_leaks: WebsiteRevenueLeak[]
  revenue_opportunities: RevenueOpportunity[]
  revenue_opportunity_summary: RevenueOpportunitySummary
  strategy: WebsiteStrategy
  ui_ux_plan: UIUXPlan
  preview_plan: WebsitePreviewPlan
  deployment_handoff: DeploymentHandoffPayload
  generated_at: string
}
