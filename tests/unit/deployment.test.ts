/**
 * Grovaitech AI Platform
 * tests/unit/deployment.test.ts
 *
 * Unit tests for AI Employee Deployment Engine (Phase 1).
 * Verifies deterministic leak detection, workforce matcher, demo planner, security sanitization, and CRM readiness.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  analyzeProspect,
  detectRevenueLeaks,
  matchEmployeesForProspect,
  generateDemoPlan,
  evaluateCrmReadiness,
  EMPLOYEE_WORKFLOW_MAP,
  type Prospect,
} from '@/lib/deployment'
import { analyzeProspectForDeployment } from '@/app/actions/deployment'
import * as employeeRegistry from '@/lib/employees/registry'

describe('AI Employee Deployment Engine (Phase 1)', () => {
  describe('1. Revenue Leak Detection', () => {
    it('detects LEAD_RESPONSE and WHATSAPP leaks from slow response signals', () => {
      const prospect: Prospect = {
        company_name: 'Apex Realty',
        industry: 'Real Estate',
        known_problems: ['slow response to buyer inquiries', 'missed leads after-hours'],
        current_channels: ['WhatsApp', 'Website'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('LEAD_RESPONSE')
      expect(categories).toContain('WHATSAPP')
      expect(leaks[0].detected_signals.length).toBeGreaterThan(0)
    })

    it('detects APPOINTMENT leak from scheduling bottlenecks', () => {
      const prospect: Prospect = {
        company_name: 'City Care Dental',
        industry: 'Healthcare',
        known_problems: ['appointment booking friction', 'receptionist workload'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('APPOINTMENT')
    })

    it('detects ECOMMERCE_SUPPORT leak from return and tracking problems', () => {
      const prospect: Prospect = {
        company_name: 'UrbanStyle Apparel',
        industry: 'E-Commerce',
        known_problems: ['order tracking inquiries', 'returns and exchanges overload'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('ECOMMERCE_SUPPORT')
    })

    it('detects LEGAL_INTAKE leak from case intake signals', () => {
      const prospect: Prospect = {
        company_name: 'Vanguard Legal Partners',
        industry: 'Law Firm',
        known_problems: ['case intake bottlenecks', 'conflict checking delays'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('LEGAL_INTAKE')
    })

    it('detects HR_ONBOARDING leak from new hire and induction signals', () => {
      const prospect: Prospect = {
        company_name: 'TechScale Corp',
        industry: 'Technology',
        known_problems: ['new hires onboarding delay', 'hr document collection manual work'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('HR_ONBOARDING')
    })

    it('detects FINANCIAL_INTAKE leak from loan & KYC signals', () => {
      const prospect: Prospect = {
        company_name: 'GrowFin Capital',
        industry: 'Financial Services',
        known_problems: ['kyc verification friction', 'insurance and home loan inquiries drop-off'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('FINANCIAL_INTAKE')
    })

    it('detects AI_QA leak from compliance & hallucination concerns', () => {
      const prospect: Prospect = {
        company_name: 'NextGen AI Ops',
        industry: 'Software',
        known_problems: ['ai quality scoring needed', 'hallucinations in customer conversations'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('AI_QA')
    })

    it('detects SUPPORT leak from FAQ and repetitive support backlog', () => {
      const prospect: Prospect = {
        company_name: 'CloudSync SaaS',
        industry: 'SaaS',
        known_problems: ['repetitive support questions', 'support backlog', 'customers waiting'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('SUPPORT')
    })

    it('provides a safe general leak fallback when no explicit keywords match', () => {
      const prospect: Prospect = {
        company_name: 'Unspecified Enterprises',
        industry: 'Consulting',
        known_problems: ['general inefficiency'],
      }

      const leaks = detectRevenueLeaks(prospect)
      expect(leaks.length).toBeGreaterThan(0)
      expect(leaks[0].category).toBe('LEAD_RESPONSE')
    })
  })

  describe('2. Canonical AI Employee Matching & Security Sanitization', () => {
    it('matches WhatsApp lead problem → WhatsApp Lead Agent (emp-003)', () => {
      const prospect: Prospect = {
        company_name: 'Global Retailers',
        industry: 'General',
        known_problems: ['customers message on whatsapp', 'whatsapp leads follow-up'],
        current_channels: ['WhatsApp'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-003')
      expect(recommended_employee?.employee_slug).toBe('whatsapp-lead-agent')
      expect(recommended_employee?.match_score).toBeGreaterThanOrEqual(60)
    })

    it('matches real estate lead problem → Real Estate Lead Receptionist (emp-001)', () => {
      const prospect: Prospect = {
        company_name: 'Prestige Homes',
        industry: 'Real Estate',
        known_problems: ['missed leads', 'site visit scheduling'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-001')
      expect(recommended_employee?.employee_slug).toBe('real-estate-lead-receptionist')
      expect(recommended_employee?.match_score).toBeGreaterThanOrEqual(70)
    })

    it('matches clinic appointment problem → Clinic Receptionist (emp-002)', () => {
      const prospect: Prospect = {
        company_name: 'Verma Dental Clinic',
        industry: 'Healthcare',
        known_problems: ['missed appointments', 'phone booking overload'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-002')
      expect(recommended_employee?.employee_slug).toBe('clinic-receptionist')
    })

    it('matches e-commerce return/order problem → E-Commerce Support Agent (emp-008)', () => {
      const prospect: Prospect = {
        company_name: 'TrendyWear Store',
        industry: 'E-Commerce',
        known_problems: ['order tracking questions', 'return request backlog'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-008')
      expect(recommended_employee?.employee_slug).toBe('ecommerce-support-agent')
    })

    it('matches legal intake problem → Legal Intake Agent (emp-007)', () => {
      const prospect: Prospect = {
        company_name: 'Sterling Law Chambers',
        industry: 'Law Firm',
        known_problems: ['legal enquiries', 'case intake conflict checking'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-007')
      expect(recommended_employee?.employee_slug).toBe('legal-intake-agent')
    })

    it('matches HR onboarding problem → HR Onboarding Agent (emp-009)', () => {
      const prospect: Prospect = {
        company_name: 'Nexus Technologies',
        industry: 'Human Resources',
        known_problems: ['new hires onboarding delay', 'hr document collection'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-009')
      expect(recommended_employee?.employee_slug).toBe('hr-onboarding-agent')
    })

    it('matches financial/KYC problem → Financial Advisory Agent (emp-010)', () => {
      const prospect: Prospect = {
        company_name: 'WealthGuard Advisors',
        industry: 'Financial Services',
        known_problems: ['kyc verification friction', 'financial enquiries', 'insurance consultation'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-010')
      expect(recommended_employee?.employee_slug).toBe('financial-advisory-agent')
    })

    it('matches AI quality problem → AI QA Inspector (emp-006)', () => {
      const prospect: Prospect = {
        company_name: 'AI Operations Lab',
        industry: 'General',
        known_problems: ['ai quality scoring', 'conversation quality auditing', 'hallucinations'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-006')
      expect(recommended_employee?.employee_slug).toBe('ai-qa-inspector')
    })

    it('matches support escalation problem → Customer Support Agent (emp-005)', () => {
      const prospect: Prospect = {
        company_name: 'Apex SaaS Solutions',
        industry: 'General',
        known_problems: ['repetitive support questions', 'support backlog', 'customers waiting'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-005')
      expect(recommended_employee?.employee_slug).toBe('customer-support-agent')
    })

    it('unknown/general problem produces a safe canonical fallback rather than a fictional employee', () => {
      const prospect: Prospect = {
        company_name: 'Mystery Corp',
        industry: 'Unspecified',
        known_problems: ['unknown issue XYZ'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee, alternative_matches } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      const canonicalIds = employeeRegistry.CANONICAL_EMPLOYEES.map((e) => e.id)
      expect(canonicalIds).toContain(recommended_employee?.employee_id)
      expect(alternative_matches.length).toBeGreaterThan(0)
    })

    it('strictly excludes employees whose demo_config.enabled is false from recommended and alternatives', () => {
      const actualEmployees = employeeRegistry.getCanonicalEmployees()
      // Mock canonical employees where emp-001 (Real Estate) has demo disabled
      const mockedEmployees = actualEmployees.map((emp) =>
        emp.id === 'emp-001'
          ? { ...emp, demo_config: { enabled: false } }
          : emp
      )

      const spy = vi.spyOn(employeeRegistry, 'getCanonicalEmployees').mockReturnValue(mockedEmployees)

      try {
        const prospect: Prospect = {
          company_name: 'Greenfield Realty',
          industry: 'Real Estate',
          known_problems: ['site visit scheduling', 'missed leads'],
        }

        const leaks = detectRevenueLeaks(prospect)
        const { recommended_employee, alternative_matches } = matchEmployeesForProspect(prospect, leaks)

        // emp-001 must NEVER be recommended or included in alternatives
        expect(recommended_employee?.employee_id).not.toBe('emp-001')
        const alternativeIds = alternative_matches.map((a) => a.employee_id)
        expect(alternativeIds).not.toContain('emp-001')
      } finally {
        spy.mockRestore()
      }
    })

    it('security sanitization: never exposes system_prompt or internal configuration in deployment analysis', () => {
      const prospect: Prospect = {
        company_name: 'Vanguard Legal',
        industry: 'Law Firm',
        known_problems: ['case intake bottlenecks'],
      }

      const analysis = analyzeProspect(prospect)

      expect(analysis.recommended_employee).not.toBeNull()
      // system_prompt must be undefined on the sanitized employee object
      expect((analysis.recommended_employee?.employee as any).system_prompt).toBeUndefined()
      expect((analysis.recommended_employee?.employee as any).demo_config).toBeUndefined()

      // Verify all alternative matches are also sanitized
      for (const alt of analysis.alternative_matches) {
        expect((alt.employee as any).system_prompt).toBeUndefined()
        expect((alt.employee as any).demo_config).toBeUndefined()
      }
    })
  })

  describe('3. Personalized Demo Planning & Workflow Mappings', () => {
    it('generates demo plan with prospect company name and exactly 3 conversation starters', () => {
      const prospect: Prospect = {
        company_name: 'Apex Luxury Estates',
        industry: 'Real Estate',
        known_problems: ['missed leads on weekend'],
      }

      const analysis = analyzeProspect(prospect)

      expect(analysis.demo).not.toBeNull()
      expect(analysis.demo?.headline).toContain('Apex Luxury Estates')
      expect(analysis.demo?.scenario).toContain('Apex Luxury Estates')
      expect(analysis.demo?.conversation_starters).toHaveLength(3)
      expect(analysis.demo?.workflow_id).toBe('wf-001')
    })

    it('maps all 10 canonical employees to strictly existing workflow IDs without inventing IDs', () => {
      const expectedWorkflowMap: Record<string, string> = {
        'emp-001': 'wf-001',
        'emp-002': 'wf-002',
        'emp-003': 'wf-004',
        'emp-004': 'wf-007',
        'emp-005': 'wf-003',
        'emp-006': 'wf-005',
        'emp-007': 'wf-006',
        'emp-008': 'wf-008',
        'emp-009': 'wf-009',
        'emp-010': 'wf-010',
      }

      for (const [empId, wfId] of Object.entries(expectedWorkflowMap)) {
        expect(EMPLOYEE_WORKFLOW_MAP[empId]).toBe(wfId)
      }
    })

    it('uses prospective/planned wording in expected_outcome and does not claim live past execution', () => {
      const prospect: Prospect = {
        company_name: 'CareWell Clinic',
        industry: 'Healthcare',
        known_problems: ['missed appointments'],
      }

      const analysis = analyzeProspect(prospect)

      expect(analysis.demo?.expected_outcome).toBeDefined()
      const outcome = analysis.demo!.expected_outcome
      expect(
        outcome.includes('When deployed') ||
        outcome.includes('configured') ||
        outcome.includes('designed to') ||
        outcome.includes('can')
      ).toBe(true)
    })
  })

  describe('4. CRM Readiness Evaluation', () => {
    it('flags unreadiness when contact_name is missing (company_name alone does NOT satisfy name requirement)', () => {
      const prospect: Prospect = {
        company_name: 'Incomplete Lead Corp',
        industry: 'Real Estate',
        phone: '+91 98765 43210',
        location: 'Tirupati',
        budget: '₹1.5 Crore',
        timeline: 'Immediate',
      }

      const crm = evaluateCrmReadiness(prospect)

      expect(crm.ready_for_lead_creation).toBe(false)
      expect(crm.missing_fields).toContain('name')
      expect(crm.lead_payload).toBeUndefined()
    })

    it('flags unreadiness and correctly lists missing phone, location, budget, and timeline fields', () => {
      const prospect: Prospect = {
        company_name: 'Partial Lead Corp',
        industry: 'Real Estate',
        contact_name: 'Ravi Kumar',
      }

      const crm = evaluateCrmReadiness(prospect)

      expect(crm.ready_for_lead_creation).toBe(false)
      expect(crm.missing_fields).not.toContain('name')
      expect(crm.missing_fields).toContain('phone')
      expect(crm.missing_fields).toContain('location')
      expect(crm.missing_fields).toContain('budget')
      expect(crm.missing_fields).toContain('timeline')
      expect(crm.lead_payload).toBeUndefined()
    })

    it('flags readiness when all 5 mandatory LeadData fields are supplied with contact_name', () => {
      const qualifiedProspect: Prospect = {
        company_name: 'Ready Lead Inc',
        industry: 'Real Estate',
        contact_name: 'Ravi Kumar',
        phone: '+91 98765 43210',
        location: 'Tirupati',
        budget: '₹1.5 Crore',
        timeline: 'Immediate',
      }

      const crm = evaluateCrmReadiness(qualifiedProspect)

      expect(crm.ready_for_lead_creation).toBe(true)
      expect(crm.missing_fields).toHaveLength(0)
      expect(crm.lead_payload).toBeDefined()
      expect(crm.lead_payload?.name).toBe('Ravi Kumar')
      expect(crm.lead_payload?.phone).toBe('+91 98765 43210')
      expect(crm.lead_payload?.location).toBe('Tirupati')
      expect(crm.lead_payload?.budget).toBe('₹1.5 Crore')
      expect(crm.lead_payload?.timeline).toBe('Immediate')
    })
  })

  describe('5. Server Action (analyzeProspectForDeployment)', () => {
    it('successfully processes valid prospect and returns structured, sanitized deployment analysis', async () => {
      const result = await analyzeProspectForDeployment({
        company_name: 'Greenfield Realty',
        industry: 'Real Estate',
        known_problems: ['slow response time', 'after-hours enquiries'],
        current_channels: ['WhatsApp', 'Website'],
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.recommended_employee?.employee_slug).toBe('real-estate-lead-receptionist')
      expect(result.data?.demo?.workflow_id).toBe('wf-001')
      expect(result.data?.revenue_leaks.length).toBeGreaterThan(0)
      // Server action output must also be sanitized
      expect((result.data?.recommended_employee?.employee as any).system_prompt).toBeUndefined()
    })

    it('returns error when company name is missing', async () => {
      const result = await analyzeProspectForDeployment({
        company_name: '',
        industry: 'Real Estate',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Company name is required')
    })

    it('returns error when industry is missing', async () => {
      const result = await analyzeProspectForDeployment({
        company_name: 'Test Corp',
        industry: '',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Industry is required')
    })
  })
})
