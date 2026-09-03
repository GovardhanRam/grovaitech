/**
 * Grovaitech AI Platform
 * tests/unit/local-deployment-execution.e2e.test.ts
 *
 * PHASE 4C: REAL END-TO-END LOCAL DEPLOYMENT EXECUTION (LOCAL MOCK E2E).
 * Proves the full inbound request path:
 * HTTP POST /api/deployments/[deploymentId]/messages
 * -> client_deployments lookup
 * -> canonical employee resolution
 * -> runtime tool execution (create_lead)
 * -> tenant-scoped real_estate_leads persistence & deduplication
 * -> HTTP JSON response
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/deployments/[deploymentId]/messages/route'
import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
}))

describe('PHASE 4C: Local Deployment Execution E2E Flow', () => {
  let mockDatabase: {
    client_deployments: any[]
    real_estate_leads: any[]
  }
  let mockSupabase: any
  let mockGenerateContentWithTools: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Initialize in-memory mock database state
    mockDatabase = {
      client_deployments: [
        {
          id: 'dep-client-apex-e2e-real-estate-lead-receptionist',
          client_id: 'client-apex-e2e',
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
            deployment_id: 'dep-client-apex-e2e-real-estate-lead-receptionist',
            client_id: 'client-apex-e2e',
            company_name: 'Apex Horizon Realty',
            industry: 'Real Estate',
            assigned_employee_slug: 'real-estate-lead-receptionist',
            assigned_workflow_id: 'wf-001',
            system_context_instruction: '[Client Context] Organization: "Apex Horizon Realty", Location: "Tirupati, AP".',
            created_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'dep-client-zenith-e2e-real-estate-lead-receptionist',
          client_id: 'client-zenith-e2e',
          company_name: 'Zenith Living Spaces',
          industry: 'Real Estate',
          contact_name: 'Priya Nair',
          contact_phone: '+91 9111122222',
          contact_email: 'priya@zenithliving.com',
          assigned_employee_id: 'emp-001',
          assigned_employee_name: 'Real Estate Lead Receptionist',
          assigned_employee_slug: 'real-estate-lead-receptionist',
          assigned_workflow_id: 'wf-001',
          assigned_workflow_name: 'Real Estate Lead ? WhatsApp & Site Visit Sync',
          status: 'active',
          runtime_config: {
            deployment_id: 'dep-client-zenith-e2e-real-estate-lead-receptionist',
            client_id: 'client-zenith-e2e',
            company_name: 'Zenith Living Spaces',
            industry: 'Real Estate',
            assigned_employee_slug: 'real-estate-lead-receptionist',
            assigned_workflow_id: 'wf-001',
            system_context_instruction: '[Client Context] Organization: "Zenith Living Spaces", Location: "Bengaluru, KA".',
            created_at: new Date().toISOString(),
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'dep-client-inactive-e2e',
          client_id: 'client-inactive-e2e',
          company_name: 'Dormant Properties',
          industry: 'Real Estate',
          assigned_employee_slug: 'real-estate-lead-receptionist',
          status: 'configured', // Inactive
          created_at: new Date().toISOString(),
        },
      ],
      real_estate_leads: [],
    }

    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => {
          if (table === 'client_deployments') {
            const found = mockDatabase.client_deployments.find((d) => d[col] === val)
            return {
              single: vi.fn().mockResolvedValue(
                found ? { data: found, error: null } : { data: null, error: { message: 'Not found' } }
              ),
            }
          }
          if (table === 'real_estate_leads') {
            if (col === 'phone') {
              const matching = mockDatabase.real_estate_leads.filter((l) => l.phone === val)
              return {
                data: matching,
                error: null,
                limit: vi.fn().mockReturnValue({ data: matching, error: null }),
              }
            }
            if (col === 'id') {
              const found = mockDatabase.real_estate_leads.find((l) => l.id === val)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: found, error: null }),
                }),
              }
            }
          }
          if (table === 'employees') {
            return {
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }
          }
          return {
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
            data: [],
            error: null,
          }
        }) as any,
        insert: vi.fn((payload: any) => {
          const newRow = {
            id: `lead-persisted-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            ...payload,
            created_at: new Date().toISOString(),
          }
          if (table === 'real_estate_leads') {
            mockDatabase.real_estate_leads.push(newRow)
          }
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: newRow, error: null }),
            }),
          }
        }),
        update: vi.fn((payload: any) => ({
          eq: vi.fn((col: string, val: any) => {
            if (table === 'real_estate_leads') {
              const idx = mockDatabase.real_estate_leads.findIndex((l) => l.id === val)
              if (idx !== -1) {
                mockDatabase.real_estate_leads[idx] = { ...mockDatabase.real_estate_leads[idx], ...payload }
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockDatabase.real_estate_leads[idx], error: null }),
                  }),
                }
              }
            }
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }
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

  function createPostRequest(path: string, body: any) {
    return new NextRequest(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  it('E2E-1: Executes full inbound message turn, calls create_lead, and persists lead with client attribution', async () => {
    // Model Turn 1: AI calls create_lead
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
            timeline: '3 months',
          },
        },
      ],
    })

    // Model Turn 2: AI completes turn with confirmation reply
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Thank you Gowtham Rao! Your inquiry for a ?1.8 Crore property in Tirupati has been registered with Apex Horizon Realty.',
      functionCalls: [],
    })

    const req = createPostRequest('/api/deployments/dep-client-apex-e2e-real-estate-lead-receptionist/messages', {
      message: 'I am interested in a property in Tirupati. My name is Gowtham Rao. My phone is +91 9777766666. My budget is 1.8 crore and I want to buy within 3 months.',
    })

    const res = await POST(req, {
      params: Promise.resolve({ deploymentId: 'dep-client-apex-e2e-real-estate-lead-receptionist' }),
    })
    const json = await res.json()

    // 1. HTTP boundary responds successfully
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.deploymentId).toBe('dep-client-apex-e2e-real-estate-lead-receptionist')
    expect(json.clientId).toBe('client-apex-e2e')
    expect(json.employeeSlug).toBe('real-estate-lead-receptionist')
    expect(json.replyText).toContain('Apex Horizon Realty')

    // 2. create_lead executed and returned lead metadata
    expect(json.executedTools.length).toBe(1)
    expect(json.executedTools[0].toolName).toBe('create_lead')
    expect(json.leadResult?.id).toBeDefined()

    // 3. Lead was persisted in database with tenant attribution
    const persistedLeads = mockDatabase.real_estate_leads
    expect(persistedLeads.length).toBe(1)
    expect(persistedLeads[0].name).toBe('Gowtham Rao')
    expect(persistedLeads[0].phone).toBe('+919777766666')
    expect(persistedLeads[0].client_id).toBe('client-apex-e2e')
    expect(persistedLeads[0].deployment_id).toBe('dep-client-apex-e2e-real-estate-lead-receptionist')
    expect(persistedLeads[0].lead_status).toBe('qualified')
  })

  it('E2E-2: Handles returning lead on the same deployment with idempotent update (no duplicate row)', async () => {
    // Seed initial lead for Apex
    mockDatabase.real_estate_leads.push({
      id: 'lead-apex-existing-1',
      name: 'Gowtham Rao',
      phone: '+919777766666',
      location: 'Tirupati',
      budget: '?1.8 Crore',
      timeline: '3 months',
      client_id: 'client-apex-e2e',
      deployment_id: 'dep-client-apex-e2e-real-estate-lead-receptionist',
      lead_status: 'qualified',
      created_at: new Date().toISOString(),
    })

    // Second inquiry updating budget
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Gowtham Rao',
            phone: '+91 9777766666',
            location: 'Tirupati',
            budget: '?2.2 Crore',
            timeline: '1 month',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Updated your budget to ?2.2 Crore for Apex Horizon Realty.',
      functionCalls: [],
    })

    const req = createPostRequest('/api/deployments/dep-client-apex-e2e-real-estate-lead-receptionist/messages', {
      message: 'Update my budget to 2.2 crore and timeline to 1 month.',
    })

    const res = await POST(req, {
      params: Promise.resolve({ deploymentId: 'dep-client-apex-e2e-real-estate-lead-receptionist' }),
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // Verify lead was UPDATED, not duplicated
    expect(mockDatabase.real_estate_leads.length).toBe(1)
    expect(mockDatabase.real_estate_leads[0].id).toBe('lead-apex-existing-1')
    expect(mockDatabase.real_estate_leads[0].budget).toBe('?2.2 Crore')
  })

  it('E2E-3: Isolates leads across different deployments when the same phone number contacts both', async () => {
    // Seed initial lead for Apex
    mockDatabase.real_estate_leads.push({
      id: 'lead-apex-1',
      name: 'Gowtham Rao',
      phone: '+919777766666',
      location: 'Tirupati',
      budget: '?1.8 Crore',
      timeline: '3 months',
      client_id: 'client-apex-e2e',
      deployment_id: 'dep-client-apex-e2e-real-estate-lead-receptionist',
    })

    // Same customer contacts Zenith Living Spaces (Deployment B)
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Gowtham Rao',
            phone: '+91 9777766666',
            location: 'Bengaluru',
            budget: '?3.5 Crore',
            timeline: 'Immediate',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Thank you Gowtham Rao! Your inquiry with Zenith Living Spaces has been registered.',
      functionCalls: [],
    })

    const req = createPostRequest('/api/deployments/dep-client-zenith-e2e-real-estate-lead-receptionist/messages', {
      message: 'Looking for 3.5 Crore luxury apartment in Bengaluru. Phone +91 9777766666.',
    })

    const res = await POST(req, {
      params: Promise.resolve({ deploymentId: 'dep-client-zenith-e2e-real-estate-lead-receptionist' }),
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.clientId).toBe('client-zenith-e2e')

    // Verify 2 DISTINCT leads exist in the database with identical phone numbers but separate client_ids
    const allLeads = mockDatabase.real_estate_leads
    expect(allLeads.length).toBe(2)

    const apexLead = allLeads.find((l) => l.client_id === 'client-apex-e2e')
    const zenithLead = allLeads.find((l) => l.client_id === 'client-zenith-e2e')

    expect(apexLead).toBeDefined()
    expect(apexLead?.budget).toBe('?1.8 Crore')

    expect(zenithLead).toBeDefined()
    expect(zenithLead?.budget).toBe('?3.5 Crore')
    expect(zenithLead?.deployment_id).toBe('dep-client-zenith-e2e-real-estate-lead-receptionist')
  })

  it('E2E-4: Rejects inactive deployment before Gemini reasoning is invoked', async () => {
    const req = createPostRequest('/api/deployments/dep-client-inactive-e2e/messages', {
      message: 'Hello dormant',
    })

    const res = await POST(req, {
      params: Promise.resolve({ deploymentId: 'dep-client-inactive-e2e' }),
    })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain('cannot execute live turns. Must be "active"')
    // Gemini must NOT be invoked
    expect(mockGenerateContentWithTools).not.toHaveBeenCalled()
  })

  it('E2E-5: Rejects non-existent deployment before Gemini reasoning is invoked', async () => {
    const req = createPostRequest('/api/deployments/dep-does-not-exist/messages', {
      message: 'Hello unknown',
    })

    const res = await POST(req, {
      params: Promise.resolve({ deploymentId: 'dep-does-not-exist' }),
    })
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.error).toContain('was not found')
    // Gemini must NOT be invoked
    expect(mockGenerateContentWithTools).not.toHaveBeenCalled()
  })

  it('E2E-6: Ignores caller attempts to spoof client_id or employeeSlug in HTTP body', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '',
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Spoof Tester',
            phone: '+91 9555544444',
            location: 'Tirupati',
            budget: '?1 Crore',
            timeline: '1 month',
            // Model attempts to echo spoofed IDs
            clientId: 'spoofed-client-999',
            deploymentId: 'spoofed-dep-999',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Registered.',
      functionCalls: [],
    })

    const req = createPostRequest('/api/deployments/dep-client-apex-e2e-real-estate-lead-receptionist/messages', {
      message: 'My phone is +91 9555544444',
      // Caller attempts to spoof parameters in body
      clientId: 'spoofed-caller-client',
      employeeSlug: 'spoofed-caller-employee',
      executionMode: 'sandbox',
    })

    const res = await POST(req, {
      params: Promise.resolve({ deploymentId: 'dep-client-apex-e2e-real-estate-lead-receptionist' }),
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.clientId).toBe('client-apex-e2e')
    expect(json.deploymentId).toBe('dep-client-apex-e2e-real-estate-lead-receptionist')

    // Verify persisted lead in database received TRUSTED client_id and deployment_id
    const persisted = mockDatabase.real_estate_leads.find((l) => l.phone === '+919555544444')
    expect(persisted).toBeDefined()
    expect(persisted?.client_id).toBe('client-apex-e2e')
    expect(persisted?.deployment_id).toBe('dep-client-apex-e2e-real-estate-lead-receptionist')
  })
})
