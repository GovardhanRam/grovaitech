import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDashboardData } from '@/app/actions/dashboard'
import { CANONICAL_FALLBACK_DASHBOARD } from '@/lib/dashboard/utils'
import { createServerClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('app/actions/dashboard - getDashboardData()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. returns canonical fallback dashboard when database has zero live records', async () => {
    const mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    const result = await getDashboardData()

    expect(result.success).toBe(true)
    expect(result.isFallback).toBe(true)
    expect(result.stats.totalConversations).toBe(1248)
    expect(result.stats.totalLeads).toBe(94)
    expect(result.recentLeads).toHaveLength(4)
    expect(result.recentWorkflows).toHaveLength(3)
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
      { id: 'wx-1', workflow_id: 'wf-001', lead_name: 'Ravi Teja', status: 'success', overall_status: 'success', duration_ms: 250, created_at: '2026-09-01T11:01:00Z' },
      { id: 'wx-2', workflow_id: 'wf-002', lead_name: 'Ananya', status: 'partial', overall_status: 'partial', duration_ms: 180, created_at: '2026-09-01T12:01:00Z' },
      { id: 'wx-3', workflow_id: 'wf-001', lead_name: 'Kavita Reddy', status: 'failed', overall_status: 'failed', duration_ms: 90, created_at: '2026-09-01T13:01:00Z' },
    ]
    const mockDocuments = [{ id: 'd-1', name: 'Real Estate FAQs' }]

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'chats') {
          return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: mockChats, error: null }) })) }
        }
        if (table === 'messages') {
          return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: mockMessages, error: null }) })) }
        }
        if (table === 'real_estate_leads') {
          return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: mockLeads, error: null }) })) }
        }
        if (table === 'clinic_bookings') {
          return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: mockBookings, error: null }) })) }
        }
        if (table === 'workflow_executions') {
          return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: mockWorkflowExecutions, error: null }) })) }
        }
        if (table === 'documents') {
          return { select: vi.fn().mockResolvedValue({ data: mockDocuments, error: null }) }
        }
        return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
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
    const mockWorkflowExecutions = [
      { id: 'wx-1', workflow_id: 'wf-001', status: 'success', created_at: '2026-09-01T10:00:00Z' },
      { id: 'wx-2', workflow_id: 'wf-001', status: 'success', created_at: '2026-09-01T11:00:00Z' },
      { id: 'wx-3', workflow_id: 'wf-002', status: 'partial', created_at: '2026-09-01T12:00:00Z' },
    ]

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'workflow_executions') {
          return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: mockWorkflowExecutions, error: null }) })) }
        }
        return { select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })) }
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
    vi.mocked(createServerClient).mockRejectedValue(new Error('Network connection timeout'))

    const result = await getDashboardData()

    expect(result.success).toBe(true)
    expect(result.isFallback).toBe(true)
    expect(result.error).toContain('Network connection timeout')
    expect(result.stats).toBeDefined()
  })
})
