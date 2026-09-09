/**
 * Grovaitech AI Platform
 * tests/unit/deployment-prospect-slice.test.ts
 *
 * Comprehensive end-to-end slice verification for:
 * PROSPECT -> REVENUE LEAK ANALYSIS -> PERSONALIZED AI EMPLOYEE DEMO -> CRM
 *
 * Verifies:
 * 1. Prospect intake, storage, retrieval, and status tracking
 * 2. Revenue leak analysis with structured findings:
 *    - problem, evidence, likely_impact, opportunity, confidence
 * 3. Handling insufficient evidence with low confidence and explicit uncertainty
 * 4. Personalized demo plan generation:
 *    - business_problem, relevant_employee, employee_actions,
 *    - expected_operational_outcome, missing_information, uncertainty
 * 5. CRM persistence and full lifecycle transitions:
 *    - new -> analyzed -> demo_ready -> qualified
 * 6. Non-fabrication and guardrails (no promised revenue, no made-up statistics)
 * 7. Durable execution boundary and E1 sandbox safety
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  saveProspect,
  getProspects,
  analyzeProspectForDeployment,
  markProspectDemoReady,
  saveQualifiedProspectToCrm,
  executeDeploymentDemoAction,
} from '@/app/actions/deployment'
import { createLead } from '@/app/actions/leads'
import { detectRevenueLeaks } from '@/lib/deployment/revenue-leaks'
import { generateDemoPlan } from '@/lib/deployment/demo-planner'
import { matchEmployeesForProspect } from '@/lib/deployment/matcher'
import type { Prospect } from '@/lib/deployment/types'
import { Gemini } from '@/lib/ai/gemini'

// Mock Supabase admin client for tests
const mockSupabaseAdmin = {
  from: vi.fn(),
}

vi.mock('@/app/actions/leads', () => ({
  createLead: vi.fn(),
  getAdminClient: vi.fn(() => mockSupabaseAdmin),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
}))

describe('Deployment Engine: Prospect Vertical Slice (End-to-End)', () => {
  let mockGenerateContentWithTools: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateContentWithTools = vi.fn()

    vi.mocked(Gemini).mockImplementation(
      () =>
        ({
          generateContentWithTools: mockGenerateContentWithTools,
          generateText: vi.fn(),
          generateContent: vi.fn(),
          getEmbeddings: vi.fn(),
        } as any)
    )
  })

  // =========================================================================
  // 1. Prospect Intake and Lifecycle Persistence
  // =========================================================================
  describe('1. Prospect Intake and CRM Persistence (saveProspect, getProspects)', () => {
    it('persists a new prospect draft to CRM with status "new"', async () => {
      const prospect: Prospect = {
        company_name: 'Apex Horizon Estates',
        industry: 'Real Estate',
        contact_name: 'Vikram Sharma',
        phone: '+91 98765 43210',
        location: 'Tirupati, AP',
        budget: '₹1.5 Crore',
        timeline: 'Immediate',
      }

      const mockRecord = {
        id: 'lead-uuid-123',
        name: 'Vikram Sharma (Apex Horizon Estates)',
        phone: '+91 98765 43210',
        status: 'new',
        source: 'ai_demo',
        notes: JSON.stringify({
          prospect_id: 'lead-uuid-123',
          company_name: prospect.company_name,
          industry: prospect.industry,
          location: prospect.location,
          budget: prospect.budget,
          timeline: prospect.timeline,
          crm_status: 'new',
        }),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSupabaseAdmin.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
          }),
        }),
      }))

      const res = await saveProspect(prospect, 'new')
      expect(res.success).toBe(true)
      expect(res.prospectId).toBe('lead-uuid-123')
      expect(res.data?.id).toBe('lead-uuid-123')
      expect(res.data?.status).toBe('new')
    })

    it('retrieves saved prospects mapped to canonical ProspectRecord schema', async () => {
      const mockRows = [
        {
          id: 'lead-uuid-101',
          name: 'Priya Patel (CareFirst Clinic)',
          phone: '+91 91234 56789',
          lead_status: 'analyzed',
          source: 'ai_demo',
          notes: JSON.stringify({
            prospect_id: 'lead-uuid-101',
            company_name: 'CareFirst Clinic',
            industry: 'Healthcare',
            location: 'Bangalore',
            budget: '₹50,000/mo',
            crm_status: 'analyzed',
            analysis_summary: { leaks_found: 2 },
          }),
          created_at: '2026-09-09T10:00:00Z',
          updated_at: '2026-09-09T10:05:00Z',
        },
      ]

      mockSupabaseAdmin.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockRows, error: null }),
        }),
      }))

      const res = await getProspects()
      expect(res.success).toBe(true)
      expect(res.data).toHaveLength(1)
      expect(res.data?.[0].id).toBe('lead-uuid-101')
      expect(res.data?.[0].company_name).toBe('CareFirst Clinic')
      expect(res.data?.[0].status).toBe('analyzed')
    })
  })

  // =========================================================================
  // 2. Revenue Leak Analysis with Strict Grounding
  // =========================================================================
  describe('2. Grounded Revenue Leak Analysis (No Fabricated Stats)', () => {
    it('detects operational revenue leaks with problem, evidence, likely_impact, opportunity, and confidence', () => {
      const prospect: Prospect = {
        company_name: 'Nexus Real Estate',
        industry: 'Real Estate',
        contact_name: 'Arjun Reddy',
        phone: '+91 99887 76655',
        operational_signals: [
          'slow inbound response time during peak site visit inquiry hours',
          'no after hours coverage on weekends',
          'manual lead tracking in personal phone chats',
        ],
      }

      const leaks = detectRevenueLeaks(prospect)
      expect(leaks.length).toBeGreaterThan(0)

      for (const leak of leaks) {
        expect(leak.problem).toBeDefined()
        expect(typeof leak.problem).toBe('string')
        expect(leak.evidence).toBeInstanceOf(Array)
        expect(leak.evidence.length).toBeGreaterThan(0)
        expect(leak.likely_impact).toBeDefined()
        expect(leak.opportunity).toBeDefined()
        expect(['high', 'medium', 'low']).toContain(leak.confidence)

        // Must not contain fabricated revenue metrics or invented percentages
        expect(leak.problem).not.toMatch(/\b\d+%\b/)
        expect(leak.likely_impact).not.toMatch(/\b30% to 50%\b/)
        expect(leak.opportunity).not.toMatch(/\b\$\d+/)
      }
    })

    it('identifies uncertainty and assigns low confidence when operational evidence is insufficient', () => {
      const minimalProspect: Prospect = {
        company_name: 'Unknown Startup',
        industry: 'General Business',
      }

      const leaks = detectRevenueLeaks(minimalProspect)
      expect(leaks.length).toBeGreaterThan(0)

      const generalLeak = leaks[0]
      expect(generalLeak.confidence).toBe('low')
      expect(generalLeak.uncertainty).toBeDefined()
      expect(generalLeak.uncertainty).toContain('Insufficient operational evidence provided')
      expect(generalLeak.evidence[0]).toContain('Zero direct operational bottlenecks or challenges were submitted')
    })
  })

  // =========================================================================
  // 3. Personalized AI Employee Demo Plan Generation
  // =========================================================================
  describe('3. Personalized Demo Plan Structure and Guardrails', () => {
    it('synthesizes concrete business_problem, relevant_employee, employee_actions, expected_operational_outcome, and uncertainty', () => {
      const prospect: Prospect = {
        company_name: 'Grandeur Living',
        industry: 'Real Estate',
        contact_name: 'Anita Desai',
        phone: '+91 98111 22334',
        location: 'Hyderabad, Telangana',
        budget: '₹2.5 Crore',
        timeline: 'Immediate',
        operational_signals: ['leads calling after 8pm get voicemail', 'missed weekend site visits'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee } = matchEmployeesForProspect(prospect, leaks)
      expect(recommended_employee).not.toBeNull()
      const demoPlan = generateDemoPlan(prospect, recommended_employee!, leaks[0])

      // Verify required structured fields
      expect(demoPlan.business_problem).toBeDefined()
      expect(demoPlan.business_problem.length).toBeGreaterThan(5)
      expect(demoPlan.relevant_employee).toBe(recommended_employee!.employee_name)
      expect(demoPlan.employee_actions).toBeInstanceOf(Array)
      expect(demoPlan.employee_actions.length).toBeGreaterThan(0)
      expect(demoPlan.expected_operational_outcome).toBeDefined()
      expect(demoPlan.expected_operational_outcome).toContain('When deployed')
      expect(demoPlan.missing_information).toBeInstanceOf(Array)
      expect(demoPlan.uncertainty).toBeDefined()

      // Absolute safety: No promised revenue numbers
      expect(demoPlan.expected_operational_outcome).not.toMatch(/\b(guaranteed|revenue of ₹|\$\d+)/i)
      expect(demoPlan.uncertainty).toContain('Revenue gains and conversion rates cannot be guaranteed')
    })

    it('flags missing operational information required for live deployment', () => {
      const incompleteProspect: Prospect = {
        company_name: 'Solo Studio',
        industry: 'Salon & Spa',
      }

      const leaks = detectRevenueLeaks(incompleteProspect)
      const { recommended_employee } = matchEmployeesForProspect(incompleteProspect, leaks)
      expect(recommended_employee).not.toBeNull()
      const demoPlan = generateDemoPlan(incompleteProspect, recommended_employee!)

      expect(demoPlan.missing_information).toContain('Prospect phone number for SMS/WhatsApp verification')
      expect(demoPlan.missing_information).toContain('Designated business contact person name')
      expect(demoPlan.missing_information).toContain('Budget qualification criteria and thresholds')
      expect(demoPlan.missing_information).toContain('Target operating location / geography')
      expect(demoPlan.missing_information).toContain('Deployment and decision timeline')
    })
  })

  // =========================================================================
  // 4. CRM Status Transition Flow: new -> analyzed -> demo_ready -> qualified
  // =========================================================================
  describe('4. CRM Lifecycle State Machine (new -> analyzed -> demo_ready -> qualified)', () => {
    it('transitions prospect from new to analyzed during analyzeProspectForDeployment', async () => {
      const prospect: Prospect = {
        company_name: 'Apex Realtors',
        industry: 'Real Estate',
        contact_name: 'Vikram Sharma',
        phone: '+91 98765 43210',
        location: 'Tirupati, AP',
        budget: '₹1.5 Crore',
        timeline: '3 months',
      }

      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'lead-uuid-123', lead_status: 'analyzed' }, error: null }),
          }),
        }),
      })
      const mockSelectFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { notes: '{}' }, error: null }),
        }),
      })

      mockSupabaseAdmin.from.mockImplementation(() => ({
        select: mockSelectFn,
        update: mockUpdateFn,
      }))

      const analysisRes = await analyzeProspectForDeployment(prospect, 'lead-uuid-123')
      expect(analysisRes.success).toBe(true)
      expect(analysisRes.data?.prospect_id).toBe('lead-uuid-123')
      expect(analysisRes.data?.crm_status).toBe('analyzed')

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('real_estate_leads')
      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_status: 'analyzed',
        })
      )
    })

    it('transitions prospect to demo_ready when markProspectDemoReady is invoked', async () => {
      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      const mockSelectFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { notes: '{}' }, error: null }),
        }),
      })
      mockSupabaseAdmin.from.mockImplementation(() => ({
        select: mockSelectFn,
        update: mockUpdateFn,
      }))

      const demoPlan = {
        headline: 'Interactive Real Estate Demo',
        scenario: 'A buyer seeks property info',
        conversation_starters: ['Hi' as const, 'What prices?' as const, 'Book tour' as const],
        expected_outcome: 'Site visit booked',
        workflow_id: 'wf-001',
        business_problem: 'Inbound latency',
        relevant_employee: 'Real Estate Lead Receptionist',
        employee_actions: ['Qualify budget', 'Schedule tour'],
        expected_operational_outcome: 'Instant response',
        missing_information: [],
        uncertainty: 'Conversion not guaranteed',
      }

      const res = await markProspectDemoReady('lead-uuid-123', demoPlan)
      expect(res.success).toBe(true)
      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_status: 'demo_ready',
        })
      )
    })

    it('transitions prospect to qualified when saveQualifiedProspectToCrm is called with a prospectId', async () => {
      const qualifiedProspect: Prospect = {
        company_name: 'Apex Realtors',
        industry: 'Real Estate',
        contact_name: 'Vikram Sharma',
        phone: '+91 98765 43210',
        location: 'Tirupati, AP',
        budget: '₹1.5 Crore',
        timeline: '3 months',
      }

      const mockUpdateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'lead-uuid-123', lead_status: 'qualified' },
              error: null,
            }),
          }),
        }),
      })
      const mockSelectFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { notes: '{}' }, error: null }),
        }),
      })
      mockSupabaseAdmin.from.mockImplementation(() => ({
        select: mockSelectFn,
        update: mockUpdateFn,
      }))

      const res = await saveQualifiedProspectToCrm(qualifiedProspect, 'lead-uuid-123')
      expect(res.success).toBe(true)
      expect(res.crm_status).toBe('qualified')
      expect(res.leadId).toBe('lead-uuid-123')

      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_status: 'qualified',
        })
      )
      expect(createLead).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 5. Sandbox Safety and Phase 5T-E1 Execution Gates
  // =========================================================================
  describe('5. Sandbox Safety and Zero Unintended Side Effects', () => {
    it('executes demo interactions in strict sandbox mode with hasRealSideEffects=false', async () => {
      mockGenerateContentWithTools.mockResolvedValueOnce({
        replyText: 'I would be glad to help schedule an in-person site visit for you.',
        functionCalls: [],
        toolResults: [],
      })

      const prospect: Prospect = {
        company_name: 'Apex Realtors',
        industry: 'Real Estate',
        contact_name: 'Vikram Sharma',
        phone: '+91 98765 43210',
        location: 'Tirupati, AP',
        budget: '₹1.5 Crore',
        timeline: '3 months',
      }

      const demoResult = await executeDeploymentDemoAction({
        prospect,
        employeeSlug: 'real-estate-lead-receptionist',
        conversationStarter: 'Schedule a visit for Saturday',
      })

      expect(demoResult.success).toBe(true)
      expect(demoResult.data?.executionMode).toBe('sandbox')
      expect(demoResult.data?.hasRealSideEffects).toBe(false)
      expect(createLead).not.toHaveBeenCalled()
    })
  })
})
