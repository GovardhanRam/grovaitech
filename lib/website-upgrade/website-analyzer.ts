/**
 * Grovaitech AI Platform
 * lib/website-upgrade/website-analyzer.ts
 *
 * Core Deterministic Website Upgrade Intelligence Engine.
 * Integrates Claims Guard, 15-point Audit, 8-stage Revenue Leak Model,
 * Canonical Strategy, UI/UX Blueprint, and Deployment Handoff.
 *
 * Strict Principles:
 * - Business-Agnostic: Zero hard-coded client specifics.
 * - Evidence-Backed: Never converts inferences into verified facts.
 * - Non-Fabricated: No invented revenue losses or metrics.
 * - Safety: All sensitive claims gated until verified.
 */

import type {
  WebsiteUpgradeInput,
  WebsiteUpgradeResult,
  DeploymentHandoffPayload,
  WebsiteClaim,
} from './types'
import { scanClaims, auditSingleClaim } from './claim-guard'
import { executeWebsiteAudit, analyzeWebsiteRevenueLeaks } from './website-audit'
import { generateWebsiteStrategy, generateUIUXPlan } from './strategy'
import { generatePreviewPlan } from './preview-planner'
import { evaluateCrmReadiness, type Prospect } from '@/lib/deployment'
import { detectIndustryFamily, getIndustryConfig } from './industry-context'
import {
  generateRevenueOpportunities,
  summarizeRevenueOpportunities,
} from './revenue-opportunity-engine'

/**
 * Deterministically analyzes a website or business profile for full conversion upgrade.
 */
export function analyzeWebsiteForUpgrade(input: WebsiteUpgradeInput): WebsiteUpgradeResult {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid input: expected a valid WebsiteUpgradeInput object.')
  }

  const businessName = input.business_name?.trim() || 'Prospective Business'
  const industry = input.industry?.trim() || 'General Business'

  const sanitizedInput: WebsiteUpgradeInput = {
    url: input.url?.trim() || undefined,
    business_name: businessName,
    industry,
    target_audience: input.target_audience?.trim() || undefined,
    current_description: input.current_description?.trim() || undefined,
    current_services: Array.isArray(input.current_services)
      ? input.current_services.map((s) => s.trim()).filter(Boolean)
      : [],
    known_problems: Array.isArray(input.known_problems)
      ? input.known_problems.map((p) => p.trim()).filter(Boolean)
      : [],
    current_channels: Array.isArray(input.current_channels)
      ? input.current_channels.map((c) => c.trim()).filter(Boolean)
      : [],
    contact_name: input.contact_name?.trim() || undefined,
    contact_email: input.contact_email?.trim() || undefined,
    contact_phone: input.contact_phone?.trim() || undefined,
    location: input.location?.trim() || undefined,
    budget: input.budget?.trim() || undefined,
    timeline: input.timeline?.trim() || undefined,
    raw_site_text: input.raw_site_text?.trim() || undefined,
    supplied_evidence: Array.isArray(input.supplied_evidence) ? input.supplied_evidence : [],
    crawl_summary: input.crawl_summary,
  }

  // 1. Scan and Audit Claims
  const textsToScan: string[] = [
    sanitizedInput.raw_site_text || '',
    sanitizedInput.current_description || '',
    ...(sanitizedInput.known_problems || []),
    ...(sanitizedInput.current_services || []),
  ].filter(Boolean)

  const analyzedClaims: WebsiteClaim[] = scanClaims(
    textsToScan,
    sanitizedInput.supplied_evidence
  )

  const verifiedClaimsCount = analyzedClaims.filter((c) => c.status === 'VERIFIED_FACT').length
  const gatedClaimsCount = analyzedClaims.filter((c) => c.is_gated).length
  const proposedClaimsCount = analyzedClaims.filter((c) => c.status === 'PROPOSED_COPY').length

  // 2. Compute Business Clarity Score (0 - 100)
  let clarityScore = 50
  if (sanitizedInput.current_description && sanitizedInput.current_description.length > 20) clarityScore += 15
  if (sanitizedInput.current_services && sanitizedInput.current_services.length >= 2) clarityScore += 15
  if (sanitizedInput.target_audience) clarityScore += 10
  if (gatedClaimsCount > 2) clarityScore -= 15 // Penalty for uncorroborated marketing claims
  if (clarityScore > 100) clarityScore = 100
  if (clarityScore < 20) clarityScore = 20

  // 3. 15-Point Structured Audit
  const auditFindings = executeWebsiteAudit(sanitizedInput, analyzedClaims)

  // 4. 8-Stage Revenue Leak Model
  const revenueLeaks = analyzeWebsiteRevenueLeaks(sanitizedInput, auditFindings)

  // 5. Commercial Revenue Opportunities Engine
  const revenueOpportunities = generateRevenueOpportunities(
    sanitizedInput,
    auditFindings,
    revenueLeaks
  )
  const revenueOpportunitySummary = summarizeRevenueOpportunities(revenueOpportunities)

  // 6. Upgrade Strategy & AI Opportunities (Canonical Registry)
  const strategy = generateWebsiteStrategy(sanitizedInput, auditFindings, revenueLeaks)

  // 7. UI/UX Implementation Blueprint
  const uiPlan = generateUIUXPlan(sanitizedInput)

  // 8. Preview Plan with Strict Gating
  const previewPlan = generatePreviewPlan(sanitizedInput, strategy, uiPlan, analyzedClaims)

  // 9. Prepare Safe Deployment Engine Handoff (No DB Writes in Preview)
  const prospect: Prospect = {
    company_name: sanitizedInput.business_name,
    industry: sanitizedInput.industry,
    website: sanitizedInput.url,
    description: sanitizedInput.current_description,
    current_channels: sanitizedInput.current_channels,
    known_problems: sanitizedInput.known_problems,
    contact_name: sanitizedInput.contact_name,
    phone: sanitizedInput.contact_phone,
    email: sanitizedInput.contact_email,
    location: sanitizedInput.location,
    budget: sanitizedInput.budget,
    timeline: sanitizedInput.timeline,
  }

  const crmReadiness = evaluateCrmReadiness(prospect)

  const family = detectIndustryFamily(sanitizedInput.industry)
  const config = getIndustryConfig(family)
  const primaryEmployee = strategy.ai_employee_opportunities[0]
  const primaryEmployeeSlug = primaryEmployee?.employee_slug || config.primaryFrontlineSlug
  const assignedWorkflowId =
    primaryEmployee?.workflow_id || (config.family === 'healthcare' ? 'wf-002' : 'wf-003')

  const deploymentHandoff: DeploymentHandoffPayload = {
    prospect,
    primary_employee_slug: primaryEmployeeSlug,
    assigned_workflow_id: assignedWorkflowId,
    website_metadata: {
      url: sanitizedInput.url,
      audit_findings_count: auditFindings.length,
      revenue_leaks_count: revenueLeaks.length,
      revenue_opportunities_count: revenueOpportunities.length,
      verified_claims_count: verifiedClaimsCount,
      gated_claims_count: gatedClaimsCount,
      ui_direction: uiPlan.design_direction,
    },
    crm_readiness: crmReadiness,
    approval_status: 'PENDING_APPROVAL',
  }

  return {
    input: sanitizedInput,
    intelligence: {
      detected_industry: sanitizedInput.industry,
      business_clarity_score: clarityScore,
      signals_found: [
        ...(sanitizedInput.current_services || []),
        ...(sanitizedInput.current_channels || []),
        ...(sanitizedInput.known_problems || []),
      ],
      claims_analyzed: analyzedClaims,
      claims_summary: {
        total: analyzedClaims.length,
        verified: verifiedClaimsCount,
        gated: gatedClaimsCount,
        proposed: proposedClaimsCount,
      },
      crawl_summary: sanitizedInput.crawl_summary,
    },
    audit_findings: auditFindings,
    revenue_leaks: revenueLeaks,
    revenue_opportunities: revenueOpportunities,
    revenue_opportunity_summary: revenueOpportunitySummary,
    strategy,
    ui_ux_plan: uiPlan,
    preview_plan: previewPlan,
    deployment_handoff: deploymentHandoff,
    generated_at: new Date().toISOString(),
  }
}
