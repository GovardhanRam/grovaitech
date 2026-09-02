/**
 * Grovaitech AI Platform
 * lib/deployment/types.ts
 *
 * Domain types and interfaces for the AI Employee Deployment Engine.
 */

import type { AIEmployeePricing } from '@/lib/employees/registry'
import type { LeadData } from '@/app/actions/leads'

export interface Prospect {
  company_name: string
  industry: string
  website?: string
  description?: string
  current_channels?: string[]
  known_problems?: string[]
  contact_name?: string
  phone?: string
  email?: string
  location?: string
  budget?: string
  timeline?: string
}

export type RevenueLeakCategory =
  | 'LEAD_RESPONSE'
  | 'WHATSAPP'
  | 'APPOINTMENT'
  | 'SUPPORT'
  | 'ECOMMERCE_SUPPORT'
  | 'LEGAL_INTAKE'
  | 'HR_ONBOARDING'
  | 'FINANCIAL_INTAKE'
  | 'AI_QA'

export interface RevenueLeak {
  category: RevenueLeakCategory
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  detected_signals: string[]
  estimated_impact: string
}

/**
 * Public/Sanitized AI Employee profile.
 * Excludes sensitive internal fields such as `system_prompt`, credentials, or execution secrets.
 */
export interface PublicEmployeeProfile {
  id: string
  name: string
  slug: string
  title: string
  department: string
  industry: string
  description: string
  status: 'live' | 'beta' | 'demo' | 'in_development' | 'planned'
  capabilities: string[]
  responsibilities: string[]
  integrations: string[]
  channels: string[]
  tools: string[]
  pricing: AIEmployeePricing
  avatar_url: string | null
  version: string
  created_at: string
  updated_at: string
}

export interface EmployeeMatch {
  employee_id: string
  employee_name: string
  employee_slug: string
  match_score: number // 0 - 100
  reasons: string[]
  matched_capabilities: string[]
  matched_channels: string[]
  matched_tools: string[]
  employee: PublicEmployeeProfile
  pricing: {
    monthly: number
    setup: number
  }
}

export interface DemoPlan {
  headline: string
  scenario: string
  conversation_starters: [string, string, string] // Exactly 3 conversation starters
  expected_outcome: string
  workflow_id?: string
}

export interface CrmReadiness {
  ready_for_lead_creation: boolean
  missing_fields: string[]
  lead_payload?: Partial<LeadData>
}

export interface DeploymentAnalysis {
  prospect: Prospect
  revenue_leaks: RevenueLeak[]
  recommended_employee: EmployeeMatch | null
  alternative_matches: EmployeeMatch[]
  demo: DemoPlan | null
  crm: CrmReadiness
}
