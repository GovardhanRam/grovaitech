/**
 * Grovaitech AI Platform
 * lib/deployment/index.ts
 *
 * Grovaitech AI Employee Deployment Engine.
 * Single entry point for revenue leak detection, canonical worker matching,
 * personalized demo synthesis, CRM readiness evaluation, and safe demo execution.
 */

import type { Prospect, DeploymentAnalysis, CrmReadiness } from './types'
import { detectRevenueLeaks } from './revenue-leaks'
import { matchEmployeesForProspect } from './matcher'
import { generateDemoPlan, EMPLOYEE_WORKFLOW_MAP } from './demo-planner'

export * from './types'
export * from './revenue-leaks'
export * from './matcher'
export * from './demo-planner'
export * from './demo-executor'
export * from './runtime-config'
export * from './provisioner'
export * from './live-executor'

/**
 * Evaluates CRM readiness according to Grovaitech LeadData strict specifications.
 * Strictly requires exactly five fields: name (from contact_name), phone, location, budget, and timeline.
 * Note: company_name alone cannot satisfy the contact person's name requirement.
 */
export function evaluateCrmReadiness(prospect: Prospect): CrmReadiness {
  const missingFields: string[] = []

  const contactName = prospect.contact_name?.trim() || ''
  const phone = prospect.phone?.trim() || ''
  const location = prospect.location?.trim() || ''
  const budget = prospect.budget?.trim() || ''
  const timeline = prospect.timeline?.trim() || ''

  if (!contactName) missingFields.push('name')
  if (!phone) missingFields.push('phone')
  if (!location) missingFields.push('location')
  if (!budget) missingFields.push('budget')
  if (!timeline) missingFields.push('timeline')

  const isReady = missingFields.length === 0

  return {
    ready_for_lead_creation: isReady,
    missing_fields: missingFields,
    lead_payload: isReady
      ? {
          name: contactName,
          phone,
          location,
          budget,
          timeline,
          notes: `Deployment analysis for prospect: ${prospect.company_name} (${prospect.industry})`,
          source: 'website',
        }
      : undefined,
  }
}

/**
 * Executes a deterministic deployment analysis for a prospect.
 * 1. Detects revenue leaks from signals & problems.
 * 2. Matches the prospect against canonical AI workforce metadata.
 * 3. Builds a tailored demo plan with conversation starters.
 * 4. Determines CRM readiness for downstream qualification.
 */
export function analyzeProspect(prospect: Prospect): DeploymentAnalysis {
  if (!prospect || typeof prospect !== 'object') {
    throw new Error('Invalid prospect input: expected a valid Prospect object.')
  }

  const safeProspect: Prospect = {
    company_name: prospect.company_name?.trim() || 'Prospective Partner',
    industry: prospect.industry?.trim() || 'General Business',
    website: prospect.website?.trim() || undefined,
    description: prospect.description?.trim() || undefined,
    current_channels: Array.isArray(prospect.current_channels) ? prospect.current_channels : [],
    known_problems: Array.isArray(prospect.known_problems) ? prospect.known_problems : [],
    contact_name: prospect.contact_name?.trim() || undefined,
    phone: prospect.phone?.trim() || undefined,
    email: prospect.email?.trim() || undefined,
    location: prospect.location?.trim() || undefined,
    budget: prospect.budget?.trim() || undefined,
    timeline: prospect.timeline?.trim() || undefined,
  }

  // 1. Detect Revenue Leaks
  const revenueLeaks = detectRevenueLeaks(safeProspect)

  // 2. Match Employees
  const { recommended_employee, alternative_matches } = matchEmployeesForProspect(
    safeProspect,
    revenueLeaks
  )

  // 3. Generate Personalized Demo Plan
  const demo = recommended_employee
    ? generateDemoPlan(safeProspect, recommended_employee, revenueLeaks[0])
    : null

  // 4. Evaluate CRM Readiness
  const crm = evaluateCrmReadiness(safeProspect)

  return {
    prospect: safeProspect,
    revenue_leaks: revenueLeaks,
    recommended_employee,
    alternative_matches,
    demo,
    crm,
  }
}
