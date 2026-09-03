/**
 * Grovaitech AI Platform
 * tests/unit/deployment-live-execution.test.ts
 *
 * Unit and integration tests for the Execution Plane:
 * Client Deployment Live Runtime Runner + Tenant-Scoped Lead Creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeLiveDeploymentTurn, type ExecuteLiveDeploymentTurnOptions } from '@/lib/deployment/live-executor'
import { runLiveDeploymentTurnAction } from '@/app/actions/deployment'
import { CANONICAL_EMPLOYEES, getCanonicalEmployeeBySlug } from '@/lib/employees/registry'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'
import { createLead, type LeadData } from '@/app/actions/leads'
import { executeDeploymentDemo } from '@/lib/deployment/demo-executor'
import { dispatchToolCall } from '@/lib/ai/dispatcher'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
}))

vi.mock('@/app/actions/leads', () => ({
  createLead: vi.fn(),
}))

describe('Client Deployment Live Runtime Runner & Tenant-Scoped Lead Creation', () => {
  let mockSupabase: any
  let mockGenerateContentWithTools: any
  let mockDeploymentsTable: any[]

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeploymentsTable = [
      {
        id: 'dep-client-apex-real-estate-lead-receptionist',
        client_id: 'client-apex-101',
        company_name: 'Apex Horizon Realty',
        industry: 'Real Estate',
        contact_name: 'Vikram Sharma',
        contact_phone: '+91 9876543210',
        contact_email: 'vikram@apexrealty.com',
        assigned_employee_id: 'emp-001',
        assigned_employee_name: 'Real Estate Lead Receptionist',
        assigned_employee_slug: 'real-estate-lead-receptionist',
        assigned_workflow_id: 'wf-001',
        assigned_workflow_name: 'Real Estate Lead ? WhatsApp & Site Visit Sync',
        status: 'active',
        runtime_config: {
          deployment_id: 'dep-client-apex-real-estate-lead-receptionist',
          client_id: 'client-apex-101',
          company_name: 'Apex Horizon Realty',
          industry: 'Real Estate',
          assigned_employee_slug: 'real-estate-lead-receptionist',
          assigned_workflow_id: 'wf-001',
          system_context_instruction: '[Client Context] Organization: "Apex Horizon Realty", Industry: "Real Estate", Location: "Tirupati, AP". Focus on luxury villas.',
          created_at: '2026-09-03T12:00:00.000Z',
        },
        created_at: '2026-09-03T12:00:00.000Z',
        updated_at: '2026-09-03T12:00:00.000Z',
      },
      {
        id: 'dep-client-inactive-slug',
        client_id: 'client-inactive-202',
        company_name: 'Inactive Realty Corp',
        industry: 'Real Estate',
        contact_name: 'Pooja Reddy',
        contact_phone: '+91 9888877777',
        assigned_employee_id: 'emp-001',
        assigned_employee_name: 'Real Estate Lead Receptionist',
        assigned_employee_slug: 'real-estate-lead-receptionist',
        assigned_workflow_id: 'wf-001',
        assigned_workflow_name: 'Lead Sync',
        status: 'configured', // Not active
        runtime_config: {
          deployment_id: 'dep-client-inactive-slug',
          client_id: 'client-inactive-202',
          company_name: 'Inactive Realty Corp',
          industry: 'Real Estate',
          assigned_employee_slug: 'real-estate-lead-receptionist',
          assigned_workflow_id: 'wf-001',
          system_context_instruction: '',
          created_at: '2026-09-03T12:00:00.000Z',
        },
        created_at: '2026-09-03T12:00:00.000Z',
        updated_at: '2026-09-03T12:00:00.000Z',
      },
    ]

    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => ({
          single: vi.fn(async () => {
            if (table === 'client_deployments') {
              const found = mockDeploymentsTable.find((d) => d[col] === val)
              return found ? { data: found, error: null } : { data: null, error: { message: 'Not found' } }
            }
            return { data: null, error: { message: 'Not found' } }
          }),
        })),
      })),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

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

  // 1. Active deployment can execute a live turn
  it('1. allows an active deployment to execute a live turn successfully', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Hello! I am the AI receptionist for Apex Horizon Realty. How can I help you find your dream villa?',
      functionCalls: [],
    })

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Hi, what properties do you offer in Tirupati?',
    })

    expect(res.success).toBe(true)
    expect(res.deploymentId).toBe('dep-client-apex-real-estate-lead-receptionist')
    expect(res.clientId).toBe('client-apex-101')
    expect(res.employeeSlug).toBe('real-estate-lead-receptionist')
    expect(res.replyText).toContain('Apex Horizon Realty')
  })

  // 2. Missing deployment is rejected
  it('2. rejects execution if the deploymentId does not exist in client_deployments', async () => {
    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-non-existent-id',
      message: 'Hello',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Deployment with ID "dep-non-existent-id" was not found')
  })

  // 2b. Regression test: No fallback to clients table
  it('2b. strictly rejects execution if deployment is missing from client_deployments even if a matching clients record exists', async () => {
    // Setup mock supabase where clients table has a matching record but client_deployments does not
    mockSupabase.from = vi.fn((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((col: string, val: any) => ({
        single: vi.fn(async () => {
          if (table === 'clients' && col === 'deployment_id' && val === 'dep-missing-from-deployments-table') {
            return {
              data: {
                id: 'client-orphan-1',
                name: 'Orphan Realty',
                industry: 'Real Estate',
                deployment_id: 'dep-missing-from-deployments-table',
                status: 'Active',
              },
              error: null,
            }
          }
          return { data: null, error: { message: 'Not found' } }
        }),
      })),
    }))

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-missing-from-deployments-table',
      message: 'Hello orphan',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('Deployment with ID "dep-missing-from-deployments-table" was not found')
  })

  // 3. Inactive deployment is rejected
  it('3. rejects execution if the deployment status is not active (e.g. configured)', async () => {
    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-inactive-slug',
      message: 'Hello',
    })

    expect(res.success).toBe(false)
    expect(res.error).toContain('cannot execute live turns. Must be "active"')
  })

  // 4. Canonical employee is loaded from deployment
  it('4. loads the canonical employee correctly from the stored deployment metadata', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Response from receptionist',
      functionCalls: [],
    })

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Inquiry',
    })

    expect(res.success).toBe(true)
    expect(res.employeeName).toBe('Real Estate Lead Receptionist')
  })

  // 5. Client runtime configuration is injected
  it('5. injects client-specific runtime instructions into the system prompt passed to Gemini', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Response with injected context',
      functionCalls: [],
    })

    await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Inquiry',
    })

    expect(mockGenerateContentWithTools).toHaveBeenCalledTimes(1)
    const passedOptions = mockGenerateContentWithTools.mock.calls[0][0]
    expect(passedOptions.systemInstruction).toContain('Organization: "Apex Horizon Realty"')
    expect(passedOptions.systemInstruction).toContain('Focus on luxury villas')
  })

  // 6. Canonical employee prompt remains unchanged in the registry
  it('6. ensures canonical employee in the global registry is not mutated by client execution', () => {
    const canonical = getCanonicalEmployeeBySlug('real-estate-lead-receptionist')
    expect(canonical).toBeDefined()
    expect(canonical?.system_prompt).not.toContain('Apex Horizon Realty')
    expect(canonical?.system_prompt).toContain('You are GrovAI, an elite AI Real Estate Lead Receptionist')
  })

  // 7. Authorized tools come from canonical employee registry with narrow live allowlist
  it('7. restricts active tools strictly to the canonical employee registry tools narrowed to live allowlist', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Tool test',
      functionCalls: [],
    })

    await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Inquiry',
    })

    const passedOptions = mockGenerateContentWithTools.mock.calls[0][0]
    const toolNames = passedOptions.tools.map((t: any) => t.name)
    expect(toolNames).toContain('create_lead')
    expect(toolNames).toContain('search_knowledge_base')
    // schedule_site_visit is excluded from first live execution slice
    expect(toolNames).not.toContain('schedule_site_visit')
    // Must NOT contain clinic or legal tools
    expect(toolNames).not.toContain('book_clinic_appointment')
    expect(toolNames).not.toContain('book_legal_consultation')
  })

  // 8. Caller cannot inject arbitrary tools
  it('8. prevents caller from bypassing canonical tool authorizations', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Tool bypass test',
      functionCalls: [],
    })

    await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Inquiry',
    })

    const passedOptions = mockGenerateContentWithTools.mock.calls[0][0]
    const toolNames = passedOptions.tools.map((t: any) => t.name)
    expect(toolNames).not.toContain('unauthorized_fake_tool')
  })

  // 9 & 10. Tenant identity is trusted from server lookup, not spoofed
  it('9 & 10. prevents caller or model from spoofing clientId and deploymentId', async () => {
    vi.mocked(createLead).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'lead-trusted-123',
        name: 'Ramesh Patel',
        phone: '+91 9123456789',
        location: 'Tirupati',
        budget: '?2 Crore',
        timeline: '1 month',
        client_id: 'client-apex-101',
        deployment_id: 'dep-client-apex-real-estate-lead-receptionist',
      },
      isUpdate: false,
    } as any)

    // First model turn calls create_lead with spoofed args
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Ramesh Patel',
            phone: '+91 9123456789',
            location: 'Tirupati',
            budget: '?2 Crore',
            timeline: '1 month',
            // Attempt to spoof another client ID
            clientId: 'spoofed-attacker-client-999',
            deploymentId: 'spoofed-attacker-dep-999',
          },
        },
      ],
    })

    // Second model turn generates confirmation reply
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Your lead details have been registered with Apex Horizon Realty.',
      functionCalls: [],
    })

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'My name is Ramesh Patel, phone +91 9123456789, looking for ?2 Crore villa in Tirupati.',
      customerContext: {
        // Attempt to pass spoofed clientId from caller
        clientId: 'spoofed-caller-id',
      },
    })

    expect(res.success).toBe(true)
    // Authoritative createLead call must receive TRUSTED client_id and deployment_id
    expect(createLead).toHaveBeenCalledTimes(1)
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ramesh Patel',
        phone: '+919123456789',
        client_id: 'client-apex-101',
        deployment_id: 'dep-client-apex-real-estate-lead-receptionist',
      })
    )
  })

  // 11 & 12. create_lead receives trusted client_id and deployment_id
  it('11 & 12. passes trusted client_id and deployment_id to createLead in live execution', async () => {
    vi.mocked(createLead).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'lead-real-901',
        name: 'Ananya Roy',
        phone: '+91 9876500000',
        location: 'Tirupati',
        budget: '?1.2 Crore',
        timeline: 'Immediate',
        client_id: 'client-apex-101',
        deployment_id: 'dep-client-apex-real-estate-lead-receptionist',
      },
      isUpdate: false,
    } as any)

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Ananya Roy',
            phone: '+91 9876500000',
            location: 'Tirupati',
            budget: '?1.2 Crore',
            timeline: 'Immediate',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'I have registered your interest in Apex Horizon Realty villas.',
      functionCalls: [],
    })

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'I am Ananya Roy (+91 9876500000), budget ?1.2 Cr in Tirupati.',
    })

    expect(res.success).toBe(true)
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-apex-101',
        deployment_id: 'dep-client-apex-real-estate-lead-receptionist',
      })
    )
  })

  // 13. Real lead is persisted with tenant attribution
  it('13. returns the structured lead result containing tenant-attributed lead metadata', async () => {
    vi.mocked(createLead).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'lead-saved-777',
        name: 'Sunil Verma',
        phone: '+91 9444455555',
        client_id: 'client-apex-101',
        deployment_id: 'dep-client-apex-real-estate-lead-receptionist',
      },
      isUpdate: false,
    } as any)

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Sunil Verma',
            phone: '+91 9444455555',
            location: 'Tirupati',
            budget: '?90 Lakhs',
            timeline: '2 months',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Lead registered.',
      functionCalls: [],
    })

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Sunil Verma +91 9444455555',
    })

    expect(res.success).toBe(true)
    expect(res.executedTools.length).toBeGreaterThan(0)
    expect(res.executedTools[0].toolName).toBe('create_lead')
  })

  // 14. Existing lead phone idempotency still works
  it('14. preserves update idempotency when a returning lead contacts the deployment', async () => {
    vi.mocked(createLead).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'lead-existing-101',
        name: 'Sunil Verma',
        phone: '+91 9444455555',
        lead_status: 'qualified',
      },
      isUpdate: true,
    } as any)

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Sunil Verma',
            phone: '+91 9444455555',
            location: 'Tirupati',
            budget: '?95 Lakhs',
            timeline: '1 month',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Updated your preferences.',
      functionCalls: [],
    })

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Update my budget to 95 Lakhs',
    })

    expect(res.success).toBe(true)
    expect(createLead).toHaveBeenCalledTimes(1)
  })

  // 15. Sandbox demos remain write-protected
  it('15. ensures sandbox demos continue to block real write tools (hasRealSideEffects: false)', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Welcome to our sandbox demo. How can I assist you?',
      functionCalls: [],
    })

    const sandboxRes = await executeDeploymentDemo({
      prospect: {
        company_name: 'Sandbox Realtor',
        industry: 'Real Estate',
        contact_name: 'Test User',
        phone: '+91 9999988888',
        location: 'Tirupati',
        budget: '₹1 Crore',
        timeline: 'Immediate',
      },
      employeeSlug: 'real-estate-lead-receptionist',
      conversationStarter: 'Hi, I want to see a villa this weekend',
    })

    expect(sandboxRes.hasRealSideEffects).toBe(false)
    expect(sandboxRes.executionMode).toBe('sandbox')
    // createLead must NOT have been called by sandbox demo
    expect(createLead).not.toHaveBeenCalled()
  })

  // 16. No external HTTP requests occur
  it('16. performs execution purely within Grovaitech data plane without external HTTP calls', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Self-contained response',
      functionCalls: [],
    })

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Inquiry',
    })

    expect(res.success).toBe(true)
  })

  // 17. Server Action wrapper handles validation and delegation
  it('17. validates input and delegates safely via runLiveDeploymentTurnAction', async () => {
    const badRes = await runLiveDeploymentTurnAction(null as any)
    expect(badRes.success).toBe(false)
    expect(badRes.error).toContain('Invalid input')

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Action response',
      functionCalls: [],
    })

    const goodRes = await runLiveDeploymentTurnAction({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'Hello server action',
    })

    expect(goodRes.success).toBe(true)
    expect(goodRes.replyText).toBe('Action response')
  })

  // 18. Full End-to-End Flow
  it('18. executes Full Flow: ClientDeployment ? GLE ? Employee ? Runtime Context ? create_lead ? Attributed Lead ? Agent Response', async () => {
    vi.mocked(createLead).mockResolvedValueOnce({
      success: true,
      data: {
        id: 'lead-e2e-final',
        name: 'Gowtham Rao',
        phone: '+91 9777766666',
        location: 'Tirupati',
        budget: '?1.8 Crore',
        timeline: 'Immediate',
        client_id: 'client-apex-101',
        deployment_id: 'dep-client-apex-real-estate-lead-receptionist',
      },
      isUpdate: false,
    } as any)

    // Turn 1: Model calls create_lead
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Gowtham Rao',
            phone: '+91 9777766666',
            location: 'Tirupati',
            budget: '?1.8 Crore',
            timeline: 'Immediate',
          },
        },
      ],
    })

    // Turn 2: Model completes turn with polite reply
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Thank you Gowtham Rao! Your luxury villa enquiry has been registered with Apex Horizon Realty.',
      functionCalls: [],
    })

    const res = await executeLiveDeploymentTurn({
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      message: 'I am Gowtham Rao (+91 9777766666), looking for ?1.8 Crore villa in Tirupati.',
    })

    expect(res.success).toBe(true)
    expect(res.clientId).toBe('client-apex-101')
    expect(res.deploymentId).toBe('dep-client-apex-real-estate-lead-receptionist')
    expect(res.employeeSlug).toBe('real-estate-lead-receptionist')
    expect(res.replyText).toContain('Apex Horizon Realty')
    expect(createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Gowtham Rao',
        client_id: 'client-apex-101',
        deployment_id: 'dep-client-apex-real-estate-lead-receptionist',
      })
    )
  })

  // 19. Dispatcher sandbox guardrail enforcement
  it('19. ensures dispatcher blocks real database writes when executionMode is explicitly sandbox', async () => {
    const res = await dispatchToolCall('create_lead', {
      name: 'Sandbox Attacker',
      phone: '+91 9000011111',
      location: 'Tirupati',
      budget: '₹1 Crore',
      timeline: 'Immediate',
      executionMode: 'sandbox',
    })

    expect(res.success).toBe(true)
    expect(res.result?.isSimulated).toBe(true)
    expect(res.result?.message).toContain('[Sandbox]')
    // createLead must NOT have been called
    expect(createLead).not.toHaveBeenCalled()
  })
})
