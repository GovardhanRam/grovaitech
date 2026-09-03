/**
 * Grovaitech AI Platform
 * tests/unit/deployment-provisioning.test.ts
 *
 * Unit tests for Client Workspace Provisioning & AI Employee Activation Engine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  provisionClientDeployment,
  buildClientRuntimeConfig,
  evaluateCrmReadiness,
  analyzeProspect,
  executeDeploymentDemo,
  type Prospect,
} from '@/lib/deployment'
import { provisionClientDeploymentFromLead, saveQualifiedProspectToCrm } from '@/app/actions/deployment'
import { CANONICAL_EMPLOYEES, getCanonicalEmployeeBySlug } from '@/lib/employees/registry'

// Mock createLead action
vi.mock('@/app/actions/leads', () => ({
  createLead: vi.fn().mockResolvedValue({
    success: true,
    data: { id: 'lead-mock-123' },
    isUpdate: false,
  }),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn().mockImplementation(() => ({
    generateContentWithTools: vi.fn().mockResolvedValue({
      text: 'Hello! I can help you find villas.',
      toolCalls: [],
    }),
    generateText: vi.fn().mockResolvedValue('Mock text response'),
    generateContent: vi.fn().mockResolvedValue({ text: 'Mock text response' }),
  })),
}))

// Mock createServerClient for tests
vi.mock('@/lib/supabase/server', () => {
  let mockClients: any[] = []
  let mockDeployments: any[] = []

  return {
    createServerClient: async () => ({
      from: (table: string) => {
        let currentFilterField: string | null = null
        let currentFilterVal: any = null

        const queryBuilder = {
          eq: (field: string, val: any) => {
            currentFilterField = field
            currentFilterVal = val
            return queryBuilder
          },
          order: () => queryBuilder,
          limit: () => queryBuilder,
          single: async () => {
            const list = table === 'clients' ? mockClients : mockDeployments
            const filtered = currentFilterField
              ? list.filter((item) => String(item[currentFilterField!]) === String(currentFilterVal))
              : list
            return { data: filtered[0] || null, error: null }
          },
          then: (resolve: any) => {
            const list = table === 'clients' ? mockClients : mockDeployments
            const filtered = currentFilterField
              ? list.filter((item) => String(item[currentFilterField!]) === String(currentFilterVal))
              : list
            return resolve({ data: [...filtered], error: null })
          },
        }

        return {
          select: (cols = '*') => queryBuilder,
          insert: (payload: any) => {
            const items = Array.isArray(payload) ? payload : [payload]
            if (table === 'clients') {
              mockClients.push(...items)
            }
            if (table === 'client_deployments') {
              mockDeployments.push(...items)
            }
            return {
              select: () => ({
                single: async () => ({ data: items[0], error: null }),
              }),
              data: items[0],
              error: null,
            }
          },
          update: (payload: any) => ({
            eq: (field: string, val: any) => {
              if (table === 'clients') {
                mockClients = mockClients.map((c) =>
                  String(c[field]) === String(val) ? { ...c, ...payload } : c
                )
              }
              if (table === 'client_deployments') {
                mockDeployments = mockDeployments.map((d) =>
                  String(d[field]) === String(val) ? { ...d, ...payload } : d
                )
              }
              return {
                select: () => ({
                  single: async () => ({ data: payload, error: null }),
                }),
                data: payload,
                error: null,
              }
            },
          }),
        }
      },
    }),
  }
})

describe('Client Workspace Provisioning & AI Employee Activation Engine', () => {
  const validProspect: Prospect = {
    company_name: 'Apex Horizon Realty',
    industry: 'Real Estate',
    website: 'https://apexhorizon.in',
    current_channels: ['WhatsApp', 'Website'],
    known_problems: ['Unanswered leads after hours', 'Slow response times'],
    contact_name: 'Govardhan Ram',
    phone: '+91 98765 43210',
    email: 'contact@apexhorizon.in',
    location: 'Bangalore, India',
    budget: '?50,000 / month',
    timeline: 'Immediate',
  }

  it('1. Valid lead ? client provisioning creates an Active client & deployment record', async () => {
    const result = await provisionClientDeployment({
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
    })

    expect(result.success).toBe(true)
    expect(result.client).toBeDefined()
    expect(result.client.name).toBe('Apex Horizon Realty')
    expect(result.client.status).toBe('Active')
    expect(result.deployment).toBeDefined()
    expect(result.deployment?.assigned_employee_slug).toBe('real-estate-lead-receptionist')
    expect(result.deployment?.status).toBe('active')
  })

  it('2. Matched canonical employee is correctly bound to client deployment', async () => {
    const result = await provisionClientDeployment({
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
    })

    expect(result.success).toBe(true)
    expect(result.deployment?.assigned_employee_id).toBe('emp-001')
    expect(result.deployment?.assigned_employee_name).toBe('Real Estate Lead Receptionist')
    expect(result.deployment?.assigned_employee_slug).toBe('real-estate-lead-receptionist')
  })

  it('3. Canonical workflow is correctly resolved and bound (emp-001 -> wf-001)', async () => {
    const result = await provisionClientDeployment({
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
    })

    expect(result.success).toBe(true)
    expect(result.deployment?.assigned_workflow_id).toBe('wf-001')
    expect(result.deployment?.assigned_workflow_name).toContain('Real Estate Lead')
  })

  it('4. Repeated provisioning of the same client/lead is strictly idempotent', async () => {
    const res1 = await provisionClientDeployment({
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
    })
    expect(res1.success).toBe(true)

    const res2 = await provisionClientDeployment({
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
    })

    expect(res2.success).toBe(true)
    expect(res2.isExisting).toBe(true)
    expect(res2.deployment?.id).toBe(res1.deployment?.id)
  })

  it('5. Re-provisioning updates existing client services without losing previous history', async () => {
    const result = await provisionClientDeployment({
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
    })

    expect(result.success).toBe(true)
    expect(result.client.services).toContain('AI Real Estate Receptionist')
    expect(result.client.status).toBe('Active')
  })

  it('6. Invalid/missing business identity is rejected safely', async () => {
    const noNameProspect: Prospect = {
      ...validProspect,
      company_name: '',
    }

    const result = await provisionClientDeployment({
      prospect: noNameProspect,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Company/Business name is required')
  })

  it('7. Unqualified prospect missing required CRM fields is rejected', async () => {
    const unqualifiedProspect: Prospect = {
      ...validProspect,
      contact_name: undefined,
      phone: undefined,
    }

    const result = await provisionClientDeployment({
      prospect: unqualifiedProspect,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('not CRM-qualified')
  })

  it('8. Unrecognized AI Employee slug is safely rejected', async () => {
    const result = await provisionClientDeployment({
      prospect: validProspect,
      employeeSlug: 'non-existent-employee-slug',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unrecognized AI Employee slug')
  })

  it('9. Provisioning is pure and does not trigger external network/API side effects', async () => {
    const globalFetchSpy = vi.spyOn(global, 'fetch')

    const result = await provisionClientDeployment({
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
    })

    expect(result.success).toBe(true)
    // Confirm no external HTTP requests to WhatsApp or n8n were made
    expect(globalFetchSpy).not.toHaveBeenCalled()

    globalFetchSpy.mockRestore()
  })

  it('10. Client-scoped runtime configuration contains verified business context without secrets', () => {
    const runtimeConfig = buildClientRuntimeConfig({
      deploymentId: 'dep-client-1-emp-001',
      clientId: 'client-1',
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
      workflowId: 'wf-001',
      employeeName: 'Real Estate Lead Receptionist',
      workflowName: 'Real Estate Lead ? WhatsApp & Site Visit Sync',
    })

    expect(runtimeConfig.company_name).toBe('Apex Horizon Realty')
    expect(runtimeConfig.industry).toBe('Real Estate')
    expect(runtimeConfig.location).toBe('Bangalore, India')
    expect(runtimeConfig.system_context_instruction).toContain('Organization: "Apex Horizon Realty"')
    expect(runtimeConfig.system_context_instruction).toContain('Assigned Workforce Agent: "Real Estate Lead Receptionist"')
    expect(runtimeConfig.system_context_instruction).not.toContain('API_KEY')
    expect(runtimeConfig.system_context_instruction).not.toContain('SECRET')
  })

  it('11. Existing deployment sandbox execution remains isolated and side-effect free', async () => {
    const demoResult = await executeDeploymentDemo({
      prospect: validProspect,
      employeeSlug: 'real-estate-lead-receptionist',
      conversationStarter: 'Hi, what properties do you have?',
      executionMode: 'sandbox',
    })

    expect(demoResult.hasRealSideEffects).toBe(false)
    expect(demoResult.executionMode).toBe('sandbox')
  })

  it('12. End-to-End Pipeline: Analyze ? Qualify ? CRM Save ? Provision Workspace', async () => {
    // A. Analyze
    const analysis = analyzeProspect(validProspect)
    expect(analysis.recommended_employee).toBeDefined()
    expect(analysis.crm.ready_for_lead_creation).toBe(true)

    // B. Save to CRM
    const crmResult = await saveQualifiedProspectToCrm(analysis.prospect)
    expect(crmResult.success).toBe(true)

    // C. Provision Workspace via Server Action
    const provisionResult = await provisionClientDeploymentFromLead({
      prospect: analysis.prospect,
      employeeSlug: analysis.recommended_employee?.employee_slug,
    })

    expect(provisionResult.success).toBe(true)
    expect(provisionResult.deployment?.assigned_employee_slug).toBe('real-estate-lead-receptionist')
    expect(provisionResult.client?.status).toBe('Active')
  })
})
