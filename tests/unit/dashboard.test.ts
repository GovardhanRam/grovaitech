import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDashboardData } from '@/app/actions/dashboard'
import { createServerClient } from '@/lib/supabase/server'
import { resolveAuthorizedTenant } from '@/lib/auth/tenant'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/auth/tenant', () => ({
  resolveAuthorizedTenant: vi.fn(),
}))

describe('app/actions/dashboard - getDashboardData()', () => {
  const createMockChain = (data: any[]) => {
    const chain: any = {
      eq: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn().mockResolvedValue({ data, error: null }),
      then: (resolve: any) => resolve({ data, error: null }),
    }
    return {
      select: vi.fn(() => chain),
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default: Authenticated user with authorized tenant
    vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
      success: true,
      tenantId: 'tenant-apex-101',
      user: { id: 'user-apex-owner', email: 'owner@apexrealty.com' },
      tenant: {
        id: 'tenant-apex-101',
        name: 'Apex Realty',
        slug: 'apex-realty',
        type: 'customer',
        industry: 'Real Estate',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      membership: {} as any,
      role: 'owner',
      isPlatformAdmin: false,
    })
  })

  it('1. returns honest empty-state fallback when database has zero live records (no fake data)', async () => {
    const mockSupabase = {
      from: vi.fn(() => createMockChain([])),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    const result = await getDashboardData()

    expect(result.success).toBe(true)
    expect(result.isFallback).toBe(true)
    expect(result.stats.totalConversations).toBe(0)
    expect(result.stats.totalLeads).toBe(0)
    expect(result.recentLeads).toHaveLength(0)
    expect(result.recentWorkflows).toHaveLength(0)
  })

  it('2. accurately aggregates live counts from chats, leads, bookings, and workflow executions', async () => {
    const mockChats = [{ id: 'chat-1' }, { id: 'chat-2' }, { id: 'chat-3' }]
    const mockMessages = [
      { id: 'm-1', chat_id: 'chat-1', role: 'user', created_at: '2026-09-01T10:00:00Z' },
      { id: 'm-2', chat_id: 'chat-1', role: 'assistant', created_at: '2026-09-01T10:01:00Z' },
    ]
    const mockLeads = [
      { id: 'l-1', name: 'Ravi Teja', source: 'whatsapp', lead_status: 'qualified', budget: '1.5 Cr', location: 'Tirupati', created_at: '2026-09-01T11:00:00Z' },
      { id: 'l-2', name: 'Kavita Reddy', source: 'ai_demo', lead_status: 'site_visit', budget: '80 Lakhs', location: 'Nellore', created_at: '2026-09-01T12:00:00Z' },
    ]
    const mockBookings = [
      { id: 'b-1', patient_name: 'Ananya', doctor_name: 'Dr. Verma', appointment_date: '2026-09-02', appointment_time: '10:00 AM', status: 'pending' },
    ]
    const mockWorkflowExecutions = [
      { id: 'wx-1', workflow_id: 'wf-001', lead_id: 'l-1', lead_name: 'Ravi Teja', status: 'success', overall_status: 'success', duration_ms: 250, created_at: '2026-09-01T11:01:00Z' },
      { id: 'wx-2', workflow_id: 'wf-002', lead_id: 'l-1', lead_name: 'Ananya', status: 'partial', overall_status: 'partial', duration_ms: 180, created_at: '2026-09-01T12:01:00Z' },
      { id: 'wx-3', workflow_id: 'wf-001', lead_id: 'l-2', lead_name: 'Kavita Reddy', status: 'failed', overall_status: 'failed', duration_ms: 90, created_at: '2026-09-01T13:01:00Z' },
    ]
    const mockDocuments = [{ id: 'd-1', name: 'Real Estate FAQs' }]

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'chats') return createMockChain(mockChats)
        if (table === 'messages') return createMockChain(mockMessages)
        if (table === 'real_estate_leads') return createMockChain(mockLeads)
        if (table === 'clinic_bookings') return createMockChain(mockBookings)
        if (table === 'workflow_executions') return createMockChain(mockWorkflowExecutions)
        if (table === 'documents') return createMockChain(mockDocuments)
        return createMockChain([])
      }),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    const result = await getDashboardData()

    expect(result.success).toBe(true)
    expect(result.isFallback).toBe(false)
    expect(result.stats.totalConversations).toBe(3)
    expect(result.stats.totalLeads).toBe(2)
    expect(result.stats.totalAppointments).toBe(1)
    expect(result.stats.totalWorkflowRuns).toBe(3)
    // 2 successful/partial out of 3 = 66.7%
    expect(result.stats.workflowSuccessRate).toBe(66.7)
    expect(result.recentLeads).toHaveLength(2)
    expect(result.recentLeads[0].name).toBe('Ravi Teja')
    expect(result.recentWorkflows).toHaveLength(3)
  })

  it('3. derives AI employee operational activity strictly from workflow executions', async () => {
    const mockLeads = [
      { id: 'l-1', name: 'Ravi Teja', client_id: 'tenant-apex-101', created_at: '2026-09-01T10:00:00Z' },
    ]
    const mockWorkflowExecutions = [
      { id: 'wx-1', workflow_id: 'wf-001', lead_id: 'l-1', status: 'success', created_at: '2026-09-01T10:00:00Z' },
      { id: 'wx-2', workflow_id: 'wf-001', lead_id: 'l-1', status: 'success', created_at: '2026-09-01T11:00:00Z' },
      { id: 'wx-3', workflow_id: 'wf-002', lead_id: 'l-1', status: 'partial', created_at: '2026-09-01T12:00:00Z' },
    ]

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'real_estate_leads') return createMockChain(mockLeads)
        if (table === 'workflow_executions') return createMockChain(mockWorkflowExecutions)
        return createMockChain([])
      }),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    const result = await getDashboardData()

    const realEstateWorker = result.employeesStatus.find((e) => e.slug === 'real-estate-lead-receptionist')
    const clinicWorker = result.employeesStatus.find((e) => e.slug === 'clinic-receptionist')

    expect(realEstateWorker?.totalActions).toBe(2)
    expect(realEstateWorker?.metric).toContain('2 workflow runs completed')
    expect(clinicWorker?.totalActions).toBe(1)
    expect(clinicWorker?.metric).toContain('1 appointments managed')
  })

  it('4. handles unexpected database errors gracefully and returns fallback data without throwing', async () => {
    vi.mocked(resolveAuthorizedTenant).mockRejectedValueOnce(new Error('Network connection timeout'))

    const result = await getDashboardData()

    expect(result.success).toBe(true)
    expect(result.isFallback).toBe(true)
    expect(result.error).toContain('Network connection timeout')
    expect(result.stats).toBeDefined()
  })

  it('5. strictly scopes database queries by resolved tenant_id and user_id', async () => {
    const eqSpies: Record<string, any> = {}

    const mockSupabase = {
      from: vi.fn((table: string) => {
        const chain: any = {
          eq: vi.fn((col: string, val: any) => {
            eqSpies[table] = { col, val }
            return chain
          }),
          in: vi.fn(() => chain),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          then: (resolve: any) => resolve({ data: [], error: null }),
        }
        return {
          select: vi.fn(() => chain),
        }
      }),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    await getDashboardData()

    // real_estate_leads must be filtered by client_id = tenant-apex-101
    expect(eqSpies['real_estate_leads']).toEqual({ col: 'client_id', val: 'tenant-apex-101' })
    // clinic_bookings must be filtered by clinic_id = tenant-apex-101
    expect(eqSpies['clinic_bookings']).toEqual({ col: 'clinic_id', val: 'tenant-apex-101' })
    // chats must be filtered by user_id = user-apex-owner
    expect(eqSpies['chats']).toEqual({ col: 'user_id', val: 'user-apex-owner' })
  })

  it('6. returns clean empty-state fallback when user has no authorized tenant membership', async () => {
    vi.mocked(resolveAuthorizedTenant).mockResolvedValueOnce({
      success: false,
      error: 'User has no active workspace memberships.',
      status: 403,
      user: null,
    })

    const result = await getDashboardData()

    expect(result.success).toBe(true)
    expect(result.isFallback).toBe(true)
    expect(result.stats.totalLeads).toBe(0)
    expect(result.stats.totalConversations).toBe(0)
    expect(result.recentLeads).toHaveLength(0)
  })

  it('7. requests only required columns for messages and workflow_executions to optimize payload transfer', async () => {
    const selectSpies: Record<string, string> = {}
    const inSpies: Record<string, { col: string; vals: any[] }> = {}

    const mockChats = [{ id: 'chat-tenant-1', title: 'Sales Chat', user_id: 'user-apex-owner' }]
    const mockLeads = [{ id: 'lead-tenant-1', name: 'John Doe', client_id: 'tenant-apex-101' }]

    const mockSupabase = {
      from: vi.fn((table: string) => {
        let selectedCols = '*'
        const chain: any = {
          eq: vi.fn(() => chain),
          in: vi.fn((col: string, vals: any[]) => {
            inSpies[table] = { col, vals }
            return chain
          }),
          order: vi.fn().mockImplementation(() => {
            if (table === 'chats') return Promise.resolve({ data: mockChats, error: null })
            if (table === 'real_estate_leads') return Promise.resolve({ data: mockLeads, error: null })
            return Promise.resolve({ data: [], error: null })
          }),
          then: (resolve: any) => {
            if (table === 'chats') return resolve({ data: mockChats, error: null })
            if (table === 'real_estate_leads') return resolve({ data: mockLeads, error: null })
            return resolve({ data: [], error: null })
          },
        }
        return {
          select: vi.fn((cols: string) => {
            selectedCols = cols
            selectSpies[table] = cols
            return chain
          }),
        }
      }),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    await getDashboardData()

    // messages must only query 'id'
    expect(selectSpies['messages']).toBe('id')
    expect(inSpies['messages']).toEqual({ col: 'chat_id', vals: ['chat-tenant-1'] })

    // workflow_executions must NOT select '*' and must omit JSONB execution trees ('steps', 'n8n_result')
    expect(selectSpies['workflow_executions']).not.toContain('*')
    expect(selectSpies['workflow_executions']).not.toContain('steps')
    expect(selectSpies['workflow_executions']).not.toContain('n8n_result')
    expect(selectSpies['workflow_executions']).toContain('workflow_id')
    expect(selectSpies['workflow_executions']).toContain('status')
    expect(inSpies['workflow_executions']).toEqual({ col: 'lead_id', vals: ['lead-tenant-1'] })
  })
})
