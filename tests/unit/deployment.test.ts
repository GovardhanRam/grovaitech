/**
 * Grovaitech AI Platform
 * tests/unit/deployment.test.ts
 *
 * Unit tests for AI Employee Deployment Engine (Phase 1 & Phase 2B).
 * Verifies deterministic leak detection, workforce matcher, demo planner,
 * security sanitization, CRM readiness, and safe sandbox demo execution.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  analyzeProspect,
  detectRevenueLeaks,
  matchEmployeesForProspect,
  generateDemoPlan,
  evaluateCrmReadiness,
  executeDeploymentDemo,
  EMPLOYEE_WORKFLOW_MAP,
  type Prospect,
} from '@/lib/deployment'
import {
  analyzeProspectForDeployment,
  executeDeploymentDemoAction,
} from '@/app/actions/deployment'
import * as employeeRegistry from '@/lib/employees/registry'
import { Gemini } from '@/lib/ai/gemini'

vi.mock('@/lib/ai/gemini', () => {
  return {
    Gemini: vi.fn(),
  }
})

describe('AI Employee Deployment Engine (Phase 1 & Phase 2B)', () => {
  let mockGenerateContentWithTools: any
  let mockGenerateText: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateContentWithTools = vi.fn()
    mockGenerateText = vi.fn()

    vi.mocked(Gemini).mockImplementation(() => ({
      generateContentWithTools: mockGenerateContentWithTools,
      generateText: mockGenerateText,
      generateContent: vi.fn(),
      getEmbeddings: vi.fn(),
    } as any))
  })

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
        company_name: 'LexCorp Legal',
        industry: 'Law Firm',
        known_problems: ['case intake delay', 'conflict checking'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-007')
      expect(recommended_employee?.employee_slug).toBe('legal-intake-agent')
    })

    it('matches HR onboarding problem → HR Onboarding Agent (emp-009)', () => {
      const prospect: Prospect = {
        company_name: 'HyperGrowth Tech',
        industry: 'Technology',
        known_problems: ['new hire document collection', 'induction slot booking'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-009')
      expect(recommended_employee?.employee_slug).toBe('hr-onboarding-agent')
    })

    it('matches financial consultation problem → Financial Advisory Agent (emp-010)', () => {
      const prospect: Prospect = {
        company_name: 'SecureWealth Planners',
        industry: 'Financial Services',
        known_problems: ['insurance inquiry drop-off', 'kyc documentation friction'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-010')
      expect(recommended_employee?.employee_slug).toBe('financial-advisory-agent')
    })

    it('matches salon & spa booking problem → Salon & Spa Receptionist (emp-004)', () => {
      const prospect: Prospect = {
        company_name: 'Glow Wellness Spa',
        industry: 'Beauty & Wellness',
        known_problems: ['spa treatment booking friction', 'phone appointment scheduling'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-004')
      expect(recommended_employee?.employee_slug).toBe('salon-spa-receptionist')
    })

    it('matches AI QA / compliance problem → AI QA Inspector (emp-006)', () => {
      const prospect: Prospect = {
        company_name: 'OmniAI Enterprise',
        industry: 'Software',
        known_problems: ['hallucination auditing', 'ai compliance scoring'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      expect(recommended_employee?.employee_id).toBe('emp-006')
      expect(recommended_employee?.employee_slug).toBe('ai-qa-inspector')
    })

    it('sanitizes employee output so system_prompt is NEVER exposed in recommended or alternative matches', () => {
      const prospect: Prospect = {
        company_name: 'Security Test Co',
        industry: 'Real Estate',
        known_problems: ['missed leads'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee, alternative_matches } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee).not.toBeNull()
      // system_prompt must be undefined on the sanitized PublicEmployeeProfile
      expect((recommended_employee?.employee as any).system_prompt).toBeUndefined()
      expect((recommended_employee?.employee as any).demo_config).toBeUndefined()

      for (const alt of alternative_matches) {
        expect((alt.employee as any).system_prompt).toBeUndefined()
        expect((alt.employee as any).demo_config).toBeUndefined()
      }
    })

    it('excludes employees with demo_config.enabled === false from recommendations and alternatives', () => {
      const canonicalEmployees = employeeRegistry.getCanonicalEmployees()
      const modifiedEmployees = canonicalEmployees.map((emp) =>
        emp.slug === 'real-estate-lead-receptionist'
          ? { ...emp, demo_config: { ...emp.demo_config, enabled: false } }
          : emp
      )

      vi.spyOn(employeeRegistry, 'getCanonicalEmployees').mockReturnValue(modifiedEmployees as any)

      const prospect: Prospect = {
        company_name: 'Apex Realty',
        industry: 'Real Estate',
        known_problems: ['missed leads', 'site visit scheduling'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee, alternative_matches } = matchEmployeesForProspect(prospect, leaks)

      expect(recommended_employee?.employee_slug).not.toBe('real-estate-lead-receptionist')
      for (const alt of alternative_matches) {
        expect(alt.employee_slug).not.toBe('real-estate-lead-receptionist')
      }

      vi.restoreAllMocks()
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

  describe('5. Phase 2B Safe Sandbox Demo Execution', () => {
    it('1. executes sandbox demo successfully and returns structured output', async () => {
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Hello! I am the Clinic Receptionist configured for Apollo Health. How can I assist you with doctor appointments today?',
        functionCalls: [],
      })

      const prospect: Prospect = {
        company_name: 'Apollo Health',
        industry: 'Healthcare',
        contact_name: 'Dr. Ramesh',
        phone: '+91 98765 43210',
      }

      const result = await executeDeploymentDemo({
        prospect,
        employeeSlug: 'clinic-receptionist',
        conversationStarter: 'I would like to know if Dr. Sharma is available tomorrow afternoon.',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(true)
      expect(result.executionMode).toBe('sandbox')
      expect(result.employeeSlug).toBe('clinic-receptionist')
      expect(result.employeeName).toBe('Clinic Receptionist')
      expect(result.replyText).toContain('Clinic Receptionist')
      expect(result.hasRealSideEffects).toBe(false)
      expect(result.workflowId).toBe('wf-002')
      expect(result.simulatedActions).toContain('Planned workflow: wf-002')
    })

    it('2. selects and executes the correct canonical employee persona', async () => {
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Welcome to UrbanStyle! I can check return policies or help you track your recent orders.',
        functionCalls: [],
      })

      const prospect: Prospect = {
        company_name: 'UrbanStyle',
        industry: 'E-Commerce',
      }

      const result = await executeDeploymentDemo({
        prospect,
        employeeSlug: 'ecommerce-support-agent',
        conversationStarter: 'What is your return policy on damaged goods?',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(true)
      expect(result.employeeSlug).toBe('ecommerce-support-agent')
      expect(result.employeeName).toBe('E-Commerce Support Agent')
      expect(result.workflowId).toBe('wf-008')
      expect(result.simulatedActions).toContain('Planned workflow: wf-008')
    })

    it('3. preserves canonical employee system prompt without overriding it, and passes prospect context in user message', async () => {
      let capturedSystemInstruction = ''
      let capturedContents: any[] = []
      mockGenerateContentWithTools.mockImplementationOnce((args: any) => {
        capturedSystemInstruction = args.systemInstruction || ''
        capturedContents = args.contents || []
        return Promise.resolve({
          text: 'Understood. Demonstrating intake procedure.',
          functionCalls: [],
        })
      })

      const canonicalLegal = employeeRegistry.getCanonicalEmployeeBySlug('legal-intake-agent')

      const prospect: Prospect = {
        company_name: 'Vanguard Law Firm',
        industry: 'Legal Services',
        known_problems: ['intake bottlenecks', 'conflict check delays'],
        current_channels: ['Website', 'Email'],
      }

      await executeDeploymentDemo({
        prospect,
        employeeSlug: 'legal-intake-agent',
        conversationStarter: 'We need consultation for a commercial dispute.',
        executionMode: 'sandbox',
      })

      // The system instruction must be the authoritative canonical employee prompt, NOT overridden
      expect(capturedSystemInstruction).toBe(canonicalLegal?.system_prompt)

      // The user message must contain the injected demo prospect context
      const lastUserContent = capturedContents[capturedContents.length - 1].parts[0].text
      expect(lastUserContent).toContain('Vanguard Law Firm')
      expect(lastUserContent).toContain('Legal Services')
      expect(lastUserContent).toContain('intake bottlenecks')
      expect(lastUserContent).toContain('Website, Email')
      expect(lastUserContent).toContain('We need consultation for a commercial dispute.')
    })

    it('4. retains personalized conversation starter in output', async () => {
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Yes, we have 3BHK villas available in Tirupati.',
        functionCalls: [],
      })

      const prospect: Prospect = {
        company_name: 'Tirupati Prime Estates',
        industry: 'Real Estate',
      }

      const starter = 'Do you have 3BHK villas available under ₹1.5 Cr in Tirupati?'
      const result = await executeDeploymentDemo({
        prospect,
        employeeSlug: 'real-estate-lead-receptionist',
        conversationStarter: starter,
        executionMode: 'sandbox',
      })

      expect(result.conversationStarter).toBe(starter)
    })

    it('5. strictly prevents create_lead from being provided to runtime in sandbox mode', async () => {
      let toolsPassedToGemini: any[] = []
      mockGenerateContentWithTools.mockImplementationOnce((args: any) => {
        toolsPassedToGemini = args.tools || []
        return Promise.resolve({
          text: 'Demonstrating lead qualification.',
          functionCalls: [],
        })
      })

      const prospect: Prospect = {
        company_name: 'Apex Realty',
        industry: 'Real Estate',
      }

      await executeDeploymentDemo({
        prospect,
        employeeSlug: 'real-estate-lead-receptionist',
        conversationStarter: 'Please register my lead details for a 2BHK flat.',
        executionMode: 'sandbox',
      })

      const toolNames = toolsPassedToGemini.map((t) => t.name)
      expect(toolNames).not.toContain('create_lead')
    })

    it('6. strictly prevents booking and write tools from being provided in sandbox mode', async () => {
      let toolsPassedToGemini: any[] = []
      mockGenerateContentWithTools.mockImplementationOnce((args: any) => {
        toolsPassedToGemini = args.tools || []
        return Promise.resolve({
          text: 'Demonstrating appointment scheduling workflow.',
          functionCalls: [],
        })
      })

      const prospect: Prospect = {
        company_name: 'CareClinic',
        industry: 'Healthcare',
      }

      await executeDeploymentDemo({
        prospect,
        employeeSlug: 'clinic-receptionist',
        conversationStarter: 'Book an appointment with Dr. Rao for tomorrow at 10 AM.',
        executionMode: 'sandbox',
      })

      const toolNames = toolsPassedToGemini.map((t) => t.name)
      expect(toolNames).not.toContain('book_clinic_appointment')
      expect(toolNames).not.toContain('schedule_site_visit')
      expect(toolNames).not.toContain('book_salon_service')
      expect(toolNames).not.toContain('book_legal_consultation')
      expect(toolNames).not.toContain('book_financial_consultation')
      expect(toolNames).not.toContain('schedule_onboarding_induction')
      expect(toolNames).not.toContain('lookup_order_and_support')
    })

    it('7. strictly prevents escalate_to_human from being provided in sandbox mode', async () => {
      let toolsPassedToGemini: any[] = []
      mockGenerateContentWithTools.mockImplementationOnce((args: any) => {
        toolsPassedToGemini = args.tools || []
        return Promise.resolve({
          text: 'I can assist you directly with support inquiries.',
          functionCalls: [],
        })
      })

      const prospect: Prospect = {
        company_name: 'SaaS Corp',
        industry: 'Technology',
      }

      await executeDeploymentDemo({
        prospect,
        employeeSlug: 'customer-support-agent',
        conversationStarter: 'I want to speak to a human manager immediately.',
        executionMode: 'sandbox',
      })

      const toolNames = toolsPassedToGemini.map((t) => t.name)
      expect(toolNames).not.toContain('escalate_to_human')
    })

    it('8. reports hasRealSideEffects === false on all sandbox results', async () => {
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Simulation completed.',
        functionCalls: [],
      })

      const prospect: Prospect = {
        company_name: 'Safe Demo Inc',
        industry: 'Technology',
      }

      const result = await executeDeploymentDemo({
        prospect,
        employeeSlug: 'real-estate-lead-receptionist',
        conversationStarter: 'Test message',
        executionMode: 'sandbox',
      })

      expect(result.hasRealSideEffects).toBe(false)
    })

    it('9. rejects unknown employee slug with clean error', async () => {
      const prospect: Prospect = {
        company_name: 'Unknown Co',
        industry: 'General',
      }

      const result = await executeDeploymentDemo({
        prospect,
        employeeSlug: 'non-existent-ai-employee',
        conversationStarter: 'Hello',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Unknown AI Employee 'non-existent-ai-employee'")
    })

    it('10. rejects non-demo-enabled employee with clean error', async () => {
      const canonicalClinic = employeeRegistry.getCanonicalEmployeeBySlug('clinic-receptionist')
      if (canonicalClinic) {
        vi.spyOn(employeeRegistry, 'getCanonicalEmployeeBySlug').mockReturnValue({
          ...canonicalClinic,
          demo_config: { ...canonicalClinic.demo_config, enabled: false },
        } as any)
      }

      const prospect: Prospect = {
        company_name: 'Disabled Demo Clinic',
        industry: 'Healthcare',
      }

      const result = await executeDeploymentDemo({
        prospect,
        employeeSlug: 'clinic-receptionist',
        conversationStarter: 'Hello',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('is not enabled for interactive demonstration')

      vi.restoreAllMocks()
    })

    it('11. strictly rejects live execution mode with controlled error', async () => {
      const prospect: Prospect = {
        company_name: 'Live Mode Test',
        industry: 'Real Estate',
      }

      const result = await executeDeploymentDemo({
        prospect,
        employeeSlug: 'real-estate-lead-receptionist',
        conversationStarter: 'Hello',
        executionMode: 'live' as any,
      })

      expect(result.success).toBe(false)
      expect(result.executionMode).toBe('live')
      expect(result.error).toBe('Live deployment execution is not enabled in Phase 2.')
      expect(result.hasRealSideEffects).toBe(false)
    })

    it('12. performs zero database writes during sandbox demo execution', async () => {
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Sandbox response without DB writes.',
        functionCalls: [],
      })

      const prospect: Prospect = {
        company_name: 'Zero DB Write Corp',
        industry: 'Real Estate',
        contact_name: 'Test Buyer',
        phone: '+91 99999 88888',
        location: 'Tirupati',
        budget: '₹2 Cr',
        timeline: 'Immediate',
      }

      const result = await executeDeploymentDemo({
        prospect,
        employeeSlug: 'real-estate-lead-receptionist',
        conversationStarter: 'Schedule a visit for tomorrow.',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(true)
      expect(result.hasRealSideEffects).toBe(false)
    })

    it('13. performs zero external HTTP or webhook calls', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Zero network calls made.',
        functionCalls: [],
      })

      const prospect: Prospect = {
        company_name: 'Offline Test Inc',
        industry: 'Real Estate',
      }

      await executeDeploymentDemo({
        prospect,
        employeeSlug: 'real-estate-lead-receptionist',
        conversationStarter: 'Hello',
        executionMode: 'sandbox',
      })

      expect(fetchSpy).not.toHaveBeenCalled()
      fetchSpy.mockRestore()
    })
  })

  describe('6. Server Actions Integration', () => {
    it('analyzeProspectForDeployment successfully processes valid prospect', async () => {
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
      expect((result.data?.recommended_employee?.employee as any).system_prompt).toBeUndefined()
    })

    it('executeDeploymentDemoAction runs sandbox demo successfully via server action', async () => {
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Welcome to Greenfield Realty! I can help you explore available villas.',
        functionCalls: [],
      })

      const prospect: Prospect = {
        company_name: 'Greenfield Realty',
        industry: 'Real Estate',
      }

      const result = await executeDeploymentDemoAction({
        prospect,
        employeeSlug: 'real-estate-lead-receptionist',
        conversationStarter: 'Show me available 3BHK villas.',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(true)
      expect(result.data?.success).toBe(true)
      expect(result.data?.executionMode).toBe('sandbox')
      expect(result.data?.hasRealSideEffects).toBe(false)
      expect(result.data?.replyText).toContain('Greenfield Realty')
    })

    it('executeDeploymentDemoAction returns error when invalid options provided', async () => {
      const result = await executeDeploymentDemoAction(null as any)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid input')
    })
  })
})
