/**
 * Grovaitech AI Platform
 * tests/unit/lead-deduplication.test.ts
 *
 * Tests tenant-scoped lead deduplication in createLead().
 * Verifies:
 * 1. Same client + same phone => updates existing lead for that tenant
 * 2. Different client + same phone => creates a separate lead for the second tenant
 * 3. Legacy/unscoped lead (no client_id) + same phone => preserves global phone deduplication
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createLead, type LeadData } from '@/app/actions/leads'
import { createServerClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('Tenant-Scoped Lead Deduplication in createLead()', () => {
  let mockLeadsDb: any[]
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockLeadsDb = [
      {
        id: 'lead-client-a-1',
        name: 'Suresh Kumar',
        phone: '+91 9876543210',
        location: 'Tirupati',
        budget: '?1.5 Crore',
        timeline: '3 months',
        client_id: 'client-apex-101',
        deployment_id: 'dep-apex-1',
        lead_score: 'warm',
        lead_status: 'qualified',
      },
      {
        id: 'lead-unscoped-1',
        name: 'Anita Roy',
        phone: '+91 9111122222',
        location: 'Nellore',
        budget: '?80 Lakhs',
        timeline: 'Immediate',
        client_id: null,
        deployment_id: null,
        lead_score: 'hot',
        lead_status: 'new',
      },
    ]

    mockSupabase = {
      from: vi.fn((table: string) => {
        let selectedPhone: string | null = null
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((col: string, val: any) => {
            if (col === 'phone') {
              selectedPhone = val
              const matching = mockLeadsDb.filter((l) => l.phone === val)
              return {
                data: matching,
                error: null,
                limit: vi.fn().mockReturnValue({ data: matching, error: null }),
              }
            }
            if (col === 'id') {
              const found = mockLeadsDb.find((l) => l.id === val)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: found, error: null }),
                }),
              }
            }
            return { data: [], error: null }
          }),
          insert: vi.fn((payload: any) => {
            const newRecord = { id: `lead-new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...payload }
            mockLeadsDb.push(newRecord)
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newRecord, error: null }),
              }),
            }
          }),
          update: vi.fn((payload: any) => ({
            eq: vi.fn((col: string, val: any) => {
              const idx = mockLeadsDb.findIndex((l) => l.id === val)
              if (idx !== -1) {
                mockLeadsDb[idx] = { ...mockLeadsDb[idx], ...payload }
                return {
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({ data: mockLeadsDb[idx], error: null }),
                  }),
                }
              }
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
                }),
              }
            }),
          })),
        }
      }),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
  })

  it('1. updates the existing lead when the SAME client submits the same phone number', async () => {
    const res = await createLead({
      name: 'Suresh Kumar Updated',
      phone: '+91 9876543210',
      location: 'Tirupati',
      budget: '?2 Crore',
      timeline: '1 month',
      client_id: 'client-apex-101', // Same client
      deployment_id: 'dep-apex-1',
    })

    expect(res.success).toBe(true)
    expect(res.isUpdate).toBe(true)
    expect(res.data?.id).toBe('lead-client-a-1')
    expect(res.data?.budget).toBe('?2 Crore')
  })

  it('2. creates a NEW separate lead when a DIFFERENT client submits the same phone number', async () => {
    const res = await createLead({
      name: 'Suresh Kumar (Client B)',
      phone: '+91 9876543210', // Same phone as Client A
      location: 'Bengaluru',
      budget: '?3 Crore',
      timeline: 'Immediate',
      client_id: 'client-zenith-202', // Different client
      deployment_id: 'dep-zenith-2',
    })

    expect(res.success).toBe(true)
    expect(res.isUpdate).toBe(false)
    expect(res.data?.id).not.toBe('lead-client-a-1')
    expect(res.data?.client_id).toBe('client-zenith-202')
    // Verify both records exist independently
    expect(mockLeadsDb.filter((l) => l.phone === '+91 9876543210').length).toBe(2)
  })

  it('3. preserves legacy phone-based deduplication for unscoped leads without client_id', async () => {
    const res = await createLead({
      name: 'Anita Roy Updated',
      phone: '+91 9111122222', // Existing unscoped lead phone
      location: 'Nellore',
      budget: '?95 Lakhs',
      timeline: 'Immediate',
      // No client_id (legacy / unscoped)
    })

    expect(res.success).toBe(true)
    expect(res.isUpdate).toBe(true)
    expect(res.data?.id).toBe('lead-unscoped-1')
    expect(res.data?.budget).toBe('?95 Lakhs')
  })
})
