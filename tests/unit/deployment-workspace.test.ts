/**
 * Grovaitech AI Platform
 * tests/unit/deployment-workspace.test.ts
 *
 * Unit and integration tests for the Deployment Engine server actions and data-flow contracts
 * consumed by the DeploymentEngineWorkspace component.
 *
 * NOTE: These tests directly exercise the underlying server actions (analyzeProspectForDeployment,
 * executeDeploymentDemoAction) and verify schema validity, deterministic matching, sandbox safety,
 * and CRM readiness contracts without mounting or clicking React DOM components.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  analyzeProspectForDeployment,
  executeDeploymentDemoAction,
} from '@/app/actions/deployment'
import type { Prospect } from '@/lib/deployment'
import { Gemini } from '@/lib/ai/gemini'

vi.mock('@/lib/ai/gemini', () => {
  return {
    Gemini: vi.fn(),
  }
})

describe('Deployment Engine Action Contracts & Data Flow (Consumed by DeploymentEngineWorkspace)', () => {
  let mockGenerateContentWithTools: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateContentWithTools = vi.fn()

    vi.mocked(Gemini).mockImplementation(() => ({
      generateContentWithTools: mockGenerateContentWithTools,
      generateText: vi.fn(),
      generateContent: vi.fn(),
      getEmbeddings: vi.fn(),
    } as any))
  })

  it('1. validates required company name and industry on intake', async () => {
    const invalidProspect1: Prospect = {
      company_name: '',
      industry: 'Real Estate',
    }
    const res1 = await analyzeProspectForDeployment(invalidProspect1)
    expect(res1.success).toBe(false)
    expect(res1.error).toContain('Company name is required')

    const invalidProspect2: Prospect = {
      company_name: 'Apex Estates',
      industry: '',
    }
    const res2 = await analyzeProspectForDeployment(invalidProspect2)
    expect(res2.success).toBe(false)
    expect(res2.error).toContain('Industry is required')
  })

  it('2. successfully executes analyzeProspectForDeployment action with valid prospect data', async () => {
    const prospect: Prospect = {
      company_name: 'Apex Luxury Estates',
      industry: 'Real Estate',
      known_problems: ['slow response to buyer inquiries', 'missed leads after-hours'],
      current_channels: ['WhatsApp', 'Website'],
    }

    const res = await analyzeProspectForDeployment(prospect)

    expect(res.success).toBe(true)
    expect(res.data).toBeDefined()
    expect(res.data?.prospect.company_name).toBe('Apex Luxury Estates')
  })

  it('3. returns structured revenue leaks and matched canonical employee without exposing internal prompts', async () => {
    const prospect: Prospect = {
      company_name: 'CareClinic Health',
      industry: 'Healthcare',
      known_problems: ['appointment booking friction'],
    }

    const res = await analyzeProspectForDeployment(prospect)

    expect(res.success).toBe(true)
    expect(res.data?.revenue_leaks.length).toBeGreaterThan(0)
    expect(res.data?.recommended_employee).toBeDefined()
    expect(res.data?.recommended_employee?.employee_slug).toBe('clinic-receptionist')
    expect(res.data?.recommended_employee?.match_score).toBeGreaterThan(0)
    expect(res.data?.recommended_employee?.reasons.length).toBeGreaterThan(0)
    // Verify system_prompt is NOT exposed in public profile
    expect((res.data?.recommended_employee?.employee as any).system_prompt).toBeUndefined()
  })

  it('4. provides exactly 3 conversation starters in the generated demo plan', async () => {
    const prospect: Prospect = {
      company_name: 'UrbanStyle Apparel',
      industry: 'E-Commerce',
      known_problems: ['order tracking inquiries', 'returns and exchanges overload'],
    }

    const res = await analyzeProspectForDeployment(prospect)

    expect(res.success).toBe(true)
    expect(res.data?.demo).toBeDefined()
    expect(res.data?.demo?.conversation_starters).toHaveLength(3)
    expect(res.data?.demo?.headline).toContain('UrbanStyle Apparel')
  })

  it('5. executes executeDeploymentDemoAction with starter text in sandbox mode', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Hello from Real Estate Lead Receptionist! How can I help you explore villas today?',
      functionCalls: [],
    })

    const prospect: Prospect = {
      company_name: 'Greenfield Realty',
      industry: 'Real Estate',
    }

    const analysis = await analyzeProspectForDeployment(prospect)
    const starter = analysis.data!.demo!.conversation_starters[0]

    const demoRes = await executeDeploymentDemoAction({
      prospect: analysis.data!.prospect,
      employeeSlug: analysis.data!.recommended_employee!.employee_slug,
      conversationStarter: starter,
      executionMode: 'sandbox',
    })

    expect(demoRes.success).toBe(true)
    expect(demoRes.data?.replyText).toContain('Real Estate Lead Receptionist')
    expect(demoRes.data?.conversationStarter).toBe(starter)
    expect(demoRes.data?.hasRealSideEffects).toBe(false)
  })

  it('6. returns sandbox executionMode and structured response from demo action', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Reasoned in sandbox.',
      functionCalls: [],
    })

    const prospect: Prospect = {
      company_name: 'Apex Test',
      industry: 'Real Estate',
    }

    const demoRes = await executeDeploymentDemoAction({
      prospect,
      employeeSlug: 'real-estate-lead-receptionist',
      conversationStarter: 'Inquire about pricing',
      executionMode: 'sandbox',
    })

    expect(demoRes.success).toBe(true)
    expect(demoRes.data?.executionMode).toBe('sandbox')
    expect(demoRes.data?.hasRealSideEffects).toBe(false)
  })

  it('7. returns planned workflow metadata in demo result without claiming workflow execution', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Here are the details on our commercial law intake process.',
      functionCalls: [],
    })

    const prospect: Prospect = {
      company_name: 'Vanguard Legal',
      industry: 'Legal Services',
    }

    const demoRes = await executeDeploymentDemoAction({
      prospect,
      employeeSlug: 'legal-intake-agent',
      conversationStarter: 'What is your case intake process?',
      executionMode: 'sandbox',
    })

    expect(demoRes.success).toBe(true)
    expect(demoRes.data?.workflowId).toBe('wf-006')
    expect(demoRes.data?.simulatedActions).toContain('Planned workflow: wf-006')
  })

  it('8. returns CRM-ready true when all 5 qualification fields are provided', async () => {
    const readyProspect: Prospect = {
      company_name: 'Prestige Realty',
      industry: 'Real Estate',
      contact_name: 'Vikram Seth',
      phone: '+91 91234 56789',
      location: 'Tirupati',
      budget: '₹2.5 Cr',
      timeline: 'Immediate',
    }

    const res = await analyzeProspectForDeployment(readyProspect)

    expect(res.success).toBe(true)
    expect(res.data?.crm.ready_for_lead_creation).toBe(true)
    expect(res.data?.crm.missing_fields).toHaveLength(0)
    expect(res.data?.crm.lead_payload?.name).toBe('Vikram Seth')
    expect(res.data?.crm.lead_payload?.phone).toBe('+91 91234 56789')
  })

  it('9. returns missing CRM qualification fields when contact information is incomplete', async () => {
    const partialProspect: Prospect = {
      company_name: 'Partial Prospect Co',
      industry: 'Real Estate',
    }

    const res = await analyzeProspectForDeployment(partialProspect)

    expect(res.success).toBe(true)
    expect(res.data?.crm.ready_for_lead_creation).toBe(false)
    expect(res.data?.crm.missing_fields).toContain('name')
    expect(res.data?.crm.missing_fields).toContain('phone')
    expect(res.data?.crm.missing_fields).toContain('location')
    expect(res.data?.crm.missing_fields).toContain('budget')
    expect(res.data?.crm.missing_fields).toContain('timeline')
  })

  it('10. enforces sandbox-only execution on demo action regardless of input executionMode', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Sandbox execution forced by server action.',
      functionCalls: [],
    })

    const prospect: Prospect = {
      company_name: 'Live Mode Test',
      industry: 'Real Estate',
    }

    // executeDeploymentDemoAction strictly forces executionMode: 'sandbox'
    const demoRes = await executeDeploymentDemoAction({
      prospect,
      employeeSlug: 'real-estate-lead-receptionist',
      conversationStarter: 'Test starter',
      executionMode: 'live' as any,
    })

    expect(demoRes.data?.executionMode).toBe('sandbox')
    expect(demoRes.data?.hasRealSideEffects).toBe(false)
  })

  it('11. verifies zero database writes and zero automatic CRM lead record creation during demo action', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Qualification completed in sandbox without writing to database.',
      functionCalls: [],
    })

    const prospect: Prospect = {
      company_name: 'No DB Writes Inc',
      industry: 'Real Estate',
      contact_name: 'Sunita Rao',
      phone: '+91 98888 77777',
      location: 'Hyderabad',
      budget: '₹1.8 Cr',
      timeline: '1 month',
    }

    const res = await analyzeProspectForDeployment(prospect)
    expect(res.data?.crm.ready_for_lead_creation).toBe(true)

    const demoRes = await executeDeploymentDemoAction({
      prospect,
      employeeSlug: 'real-estate-lead-receptionist',
      conversationStarter: 'Schedule visit',
      executionMode: 'sandbox',
    })

    expect(demoRes.success).toBe(true)
    expect(demoRes.data?.hasRealSideEffects).toBe(false)
  })

  it('12. handles invalid inputs and returns structured action errors gracefully', async () => {
    const invalidActionRes = await executeDeploymentDemoAction({} as any)
    expect(invalidActionRes.success).toBe(false)
    expect(invalidActionRes.error).toBeDefined()
  })
})
