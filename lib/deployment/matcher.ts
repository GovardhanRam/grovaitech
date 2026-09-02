/**
 * Grovaitech AI Platform
 * lib/deployment/matcher.ts
 *
 * Deterministic AI Employee Matching Engine.
 * Evaluates prospects and detected revenue leaks against the canonical AI workforce metadata.
 */

import { getCanonicalEmployees, type AIEmployee } from '@/lib/employees/registry'
import type { Prospect, RevenueLeak, EmployeeMatch, PublicEmployeeProfile } from './types'

// V1 Explicit Domain-Knowledge Bonuses for Leak Mitigation
const LEAK_TO_EMPLOYEE_SLUGS: Record<string, string[]> = {
  LEAD_RESPONSE: ['real-estate-lead-receptionist', 'whatsapp-lead-agent', 'customer-support-agent'],
  WHATSAPP: ['whatsapp-lead-agent', 'real-estate-lead-receptionist', 'salon-spa-receptionist'],
  APPOINTMENT: ['clinic-receptionist', 'salon-spa-receptionist', 'real-estate-lead-receptionist'],
  SUPPORT: ['customer-support-agent', 'ecommerce-support-agent'],
  ECOMMERCE_SUPPORT: ['ecommerce-support-agent', 'customer-support-agent'],
  LEGAL_INTAKE: ['legal-intake-agent'],
  HR_ONBOARDING: ['hr-onboarding-agent'],
  FINANCIAL_INTAKE: ['financial-advisory-agent'],
  AI_QA: ['ai-qa-inspector'],
}

// V1 Explicit Domain-Knowledge Bonuses for Industry Association
const INDUSTRY_TO_SLUGS: Record<string, string[]> = {
  'real estate': ['real-estate-lead-receptionist', 'whatsapp-lead-agent'],
  'property': ['real-estate-lead-receptionist'],
  'realty': ['real-estate-lead-receptionist'],
  'clinic': ['clinic-receptionist'],
  'dental': ['clinic-receptionist'],
  'medical': ['clinic-receptionist'],
  'healthcare': ['clinic-receptionist'],
  'doctor': ['clinic-receptionist'],
  'hospital': ['clinic-receptionist'],
  'salon': ['salon-spa-receptionist'],
  'spa': ['salon-spa-receptionist'],
  'beauty': ['salon-spa-receptionist'],
  'wellness': ['salon-spa-receptionist'],
  'legal': ['legal-intake-agent'],
  'law': ['legal-intake-agent'],
  'law firm': ['legal-intake-agent'],
  'attorney': ['legal-intake-agent'],
  'ecommerce': ['ecommerce-support-agent', 'customer-support-agent'],
  'e-commerce': ['ecommerce-support-agent', 'customer-support-agent'],
  'retail': ['ecommerce-support-agent'],
  'store': ['ecommerce-support-agent'],
  'hr': ['hr-onboarding-agent'],
  'human resources': ['hr-onboarding-agent'],
  'staffing': ['hr-onboarding-agent'],
  'recruitment': ['hr-onboarding-agent'],
  'finance': ['financial-advisory-agent'],
  'financial': ['financial-advisory-agent'],
  'insurance': ['financial-advisory-agent'],
  'banking': ['financial-advisory-agent'],
  'wealth': ['financial-advisory-agent'],
  'loans': ['financial-advisory-agent'],
  'qa': ['ai-qa-inspector'],
  'quality': ['ai-qa-inspector'],
  'compliance': ['ai-qa-inspector', 'legal-intake-agent'],
}

/**
 * Sanitizes an AIEmployee entity into a public profile, stripping sensitive internal configuration
 * like `system_prompt` and runtime credentials.
 */
export function sanitizeEmployee(emp: AIEmployee): PublicEmployeeProfile {
  return {
    id: emp.id,
    name: emp.name,
    slug: emp.slug,
    title: emp.title,
    department: emp.department,
    industry: emp.industry,
    description: emp.description,
    status: emp.status,
    capabilities: [...emp.capabilities],
    responsibilities: [...emp.responsibilities],
    integrations: [...emp.integrations],
    channels: [...emp.channels],
    tools: [...emp.tools],
    pricing: { ...emp.pricing },
    avatar_url: emp.avatar_url,
    version: emp.version,
    created_at: emp.created_at,
    updated_at: emp.updated_at,
  }
}

/**
 * Deterministically scores and ranks canonical employees for a given prospect and detected revenue leaks.
 * Evaluates actual canonical employee metadata (industry, capabilities, responsibilities, channels, tools, integrations)
 * as the primary matching evidence.
 */
export function matchEmployeesForProspect(
  prospect: Prospect,
  leaks: RevenueLeak[]
): {
  recommended_employee: EmployeeMatch | null
  alternative_matches: EmployeeMatch[]
} {
  const canonicalEmployees = getCanonicalEmployees()

  // Strict Rule: Only recommend employees whose demo_config.enabled is true
  const eligibleEmployees = canonicalEmployees.filter(
    (emp) => emp.demo_config && emp.demo_config.enabled === true
  )

  if (eligibleEmployees.length === 0) {
    return {
      recommended_employee: null,
      alternative_matches: [],
    }
  }

  const prospectText = [
    prospect.company_name || '',
    prospect.industry || '',
    prospect.description || '',
    ...(prospect.current_channels || []),
    ...(prospect.known_problems || []),
  ]
    .join(' ')
    .toLowerCase()

  const prospectIndustryLower = (prospect.industry || '').toLowerCase().trim()
  const prospectChannels = (prospect.current_channels || []).map((c) => c.toLowerCase().trim())
  const leakCategories = leaks.map((l) => l.category)

  const scoredMatches: EmployeeMatch[] = []

  for (const emp of eligibleEmployees) {
    let score = 20 // Base baseline for eligible active workers
    const reasons: string[] = []
    const matchedCapabilities: string[] = []
    const matchedChannels: string[] = []
    const matchedTools: string[] = []

    const empIndustryLower = emp.industry.toLowerCase()

    // 1. Primary Evidence: Canonical Industry Alignment (+30 max)
    let industryMatched = false
    if (
      empIndustryLower !== 'general' &&
      (prospectIndustryLower.includes(empIndustryLower) || empIndustryLower.includes(prospectIndustryLower))
    ) {
      score += 30
      industryMatched = true
      reasons.push(`Direct industry specialization in ${emp.industry}.`)
    } else if (empIndustryLower === 'general') {
      score += 15
      industryMatched = true
      reasons.push(`Cross-industry versatile autonomous worker.`)
    } else {
      for (const [key, slugs] of Object.entries(INDUSTRY_TO_SLUGS)) {
        if (prospectIndustryLower.includes(key) && slugs.includes(emp.slug)) {
          score += 25
          industryMatched = true
          reasons.push(`Industry keyword '${key}' matches ${emp.name} profile.`)
          break
        }
      }
    }

    // 2. Primary Evidence: Capabilities & Responsibilities Match (+25 max)
    for (const cap of emp.capabilities) {
      const capLower = cap.toLowerCase()
      if (
        prospectText.includes(capLower) ||
        (capLower.includes('lead') && prospectText.includes('lead')) ||
        (capLower.includes('appointment') && prospectText.includes('appointment')) ||
        (capLower.includes('support') && prospectText.includes('support')) ||
        (capLower.includes('faq') && (prospectText.includes('faq') || prospectText.includes('support'))) ||
        (capLower.includes('order') && prospectText.includes('order')) ||
        (capLower.includes('onboarding') && prospectText.includes('onboarding')) ||
        (capLower.includes('kyc') && prospectText.includes('kyc')) ||
        (capLower.includes('qa') && prospectText.includes('qa'))
      ) {
        matchedCapabilities.push(cap)
      }
    }
    for (const resp of emp.responsibilities) {
      const respLower = resp.toLowerCase()
      if (
        (prospectText.includes(respLower) ||
          (respLower.includes('support') && prospectText.includes('support')) ||
          (respLower.includes('faq') && prospectText.includes('support'))) &&
        !matchedCapabilities.includes(resp)
      ) {
        matchedCapabilities.push(resp)
      }
    }
    if (matchedCapabilities.length > 0) {
      const capScore = Math.min(25, matchedCapabilities.length * 6)
      score += capScore
      reasons.push(`Proven capabilities: ${matchedCapabilities.slice(0, 3).join(', ')}.`)
    }

    // 3. Primary Evidence: Canonical Tool & Integration Alignment (+15 max)
    for (const tool of emp.tools) {
      const toolClean = tool.replace(/_/g, ' ').toLowerCase()
      if (prospectText.includes(toolClean) || prospectText.includes(tool.toLowerCase())) {
        matchedTools.push(tool)
      } else if (
        (tool.includes('lead') && prospectText.includes('lead')) ||
        (tool.includes('appointment') && prospectText.includes('appointment')) ||
        (tool.includes('visit') && prospectText.includes('visit')) ||
        (tool.includes('order') && (prospectText.includes('order') || prospectText.includes('tracking'))) ||
        (tool.includes('legal') && prospectText.includes('legal')) ||
        (tool.includes('financial') && prospectText.includes('financial')) ||
        (tool.includes('onboarding') && prospectText.includes('onboarding')) ||
        (tool.includes('escalat') && (prospectText.includes('support') || prospectText.includes('escalat'))) ||
        (tool.includes('knowledge') && (prospectText.includes('faq') || prospectText.includes('support'))) ||
        (tool.includes('audit') && prospectText.includes('qa'))
      ) {
        matchedTools.push(tool)
      }
    }
    if (matchedTools.length > 0) {
      score += Math.min(15, matchedTools.length * 4)
      reasons.push(`Tool bindings: ${matchedTools.slice(0, 2).join(', ')}.`)
    }

    // 4. Primary Evidence: Channel Support (+10 max)
    for (const ch of emp.channels) {
      if (prospectChannels.some((pc) => pc.includes(ch.toLowerCase()) || ch.toLowerCase().includes(pc))) {
        matchedChannels.push(ch)
      }
    }
    if (matchedChannels.length > 0) {
      score += 10
      reasons.push(`Active on prospect channels: ${matchedChannels.join(', ')}.`)
    }

    // 5. V1 Domain-Knowledge Bonus: Leak Mitigation Fit (+25 max)
    for (const cat of leakCategories) {
      const preferredSlugs = LEAK_TO_EMPLOYEE_SLUGS[cat] || []
      if (preferredSlugs.includes(emp.slug)) {
        const priorityIndex = preferredSlugs.indexOf(emp.slug)
        const bonus = priorityIndex === 0 ? 25 : priorityIndex === 1 ? 12 : 8
        score += bonus
        reasons.push(`Explicitly mitigates detected ${cat.replace(/_/g, ' ')} leak.`)
        break
      }
    }

    // 6. Live Status Boost (+5)
    if (emp.status === 'live') {
      score += 5
    }

    // If neither industry matched nor general, and not leak matched, apply vertical penalty
    if (!industryMatched && empIndustryLower !== 'general') {
      score = Math.max(10, score - 20)
    }

    // Cap score at 100
    const finalScore = Math.min(100, Math.max(10, score))

    if (reasons.length === 0) {
      reasons.push(`Standard autonomous worker capabilities with 24/7 responsiveness.`)
    }

    scoredMatches.push({
      employee_id: emp.id,
      employee_name: emp.name,
      employee_slug: emp.slug,
      match_score: finalScore,
      reasons,
      matched_capabilities: matchedCapabilities,
      matched_channels: matchedChannels,
      matched_tools: matchedTools,
      employee: sanitizeEmployee(emp),
      pricing: { ...emp.pricing },
    })
  }

  // Sort descending by match score
  scoredMatches.sort((a, b) => b.match_score - a.match_score)

  const recommended_employee = scoredMatches.length > 0 ? scoredMatches[0] : null
  const alternative_matches = scoredMatches.slice(1)

  return {
    recommended_employee,
    alternative_matches,
  }
}
