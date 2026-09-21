/**
 * Grovaitech AI Platform
 * tests/unit/gbp-sales-action.test.ts
 *
 * Unit tests for Step 1 Revenue-First GBP Sales Funnel:
 * `runGbpAudit` server action in `app/actions/gbp-sales.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runGbpAudit, type GbpProspectInput } from '@/app/actions/gbp-sales'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { TOOL_NAMES } from '@/lib/ai/tools'

// Mock dependencies
const mockSupabaseAdmin = {
  from: vi.fn(),
}

vi.mock('@/app/actions/leads', () => ({
  getAdminClient: vi.fn(() => mockSupabaseAdmin),
}))

vi.mock('@/lib/ai/dispatcher', () => ({
  dispatchToolCall: vi.fn(),
}))

describe('runGbpAudit Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── 1. Validation Failures ────────────────────────────────────────────────
  describe('1. Input Validation', () => {
    it('rejects missing or empty prospect input', async () => {
      const res = await runGbpAudit(null as any)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Invalid input')
    })

    it('rejects missing business_name', async () => {
      const res = await runGbpAudit({ business_name: '' })
      expect(res.success).toBe(false)
      expect(res.error).toContain("'business_name' is required")
    })

    it('rejects business_name with less than 2 characters', async () => {
      const res = await runGbpAudit({ business_name: 'A' })
      expect(res.success).toBe(false)
      expect(res.error).toContain("'business_name' is required")
    })
  })

  // ─── 2. Audit Execution & Failure Handling ─────────────────────────────────
  describe('2. Audit Tool Dispatch & Error Handling', () => {
    it('returns error when dispatchToolCall reports failure', async () => {
      vi.mocked(dispatchToolCall).mockResolvedValueOnce({
        toolName: TOOL_NAMES.AUDIT_GBP_PROFILE,
        success: false,
        error: 'Rate limit exceeded on GBP verification',
        durationMs: 42,
      })

      const input: GbpProspectInput = {
        business_name: 'Sri Venkateswara Dental Care',
        category: 'Dental Clinic',
      }

      const res = await runGbpAudit(input)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Rate limit exceeded on GBP verification')
    })

    it('handles unexpected exceptions during execution gracefully', async () => {
      vi.mocked(dispatchToolCall).mockRejectedValueOnce(new Error('Network failure'))

      const input: GbpProspectInput = {
        business_name: 'Sri Venkateswara Dental Care',
      }

      const res = await runGbpAudit(input)
      expect(res.success).toBe(false)
      expect(res.error).toContain('Network failure')
    })
  })

  // ─── 3. Successful Audit Persistence (New Prospect) ────────────────────────
  describe('3. Successful Audit Persistence (New Prospect)', () => {
    it('runs GBP audit, detects revenue leak, sets lead_status to analyzed, and inserts prospect', async () => {
      vi.mocked(dispatchToolCall).mockResolvedValueOnce({
        toolName: TOOL_NAMES.AUDIT_GBP_PROFILE,
        success: true,
        result: {
          business_name: 'Apex Physiotherapy Clinic',
          category: 'Physiotherapy Clinic',
          completeness_score: 45,
          missing_sections: ['Operating hours', 'Website URL', 'Photo coverage'],
          prioritized_recommendations: [
            'Add regular and holiday operating hours.',
            'Link an official website.',
          ],
        },
        durationMs: 120,
      })

      let insertedPayload: any = null
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'real_estate_leads') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
                data: [],
              }),
            }),
            insert: vi.fn().mockImplementation((payload: any) => {
              insertedPayload = payload
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'lead-new-101', ...payload },
                    error: null,
                  }),
                }),
              }
            }),
          }
        }
        return {}
      })

      const input: GbpProspectInput = {
        business_name: 'Apex Physiotherapy Clinic',
        category: 'Physiotherapy Clinic',
        address_nap: '12-3 Main Road, Tirupati',
        phone: '+91 98765 00001',
      }

      const res = await runGbpAudit(input)

      expect(res.success).toBe(true)
      expect(res.prospectId).toBe('lead-new-101')
      expect(res.audit).toBeDefined()
      expect(res.audit?.score).toBe(45)
      expect(res.audit?.missing_fields).toContain('Operating hours')
      expect(res.audit?.recommendations.length).toBeGreaterThan(0)
      expect(res.audit?.revenue_leak?.category).toBe('LOCAL_SEO_REPUTATION')

      // Verify DB payload
      expect(insertedPayload).toBeDefined()
      expect(insertedPayload.lead_status).toBe('analyzed')
      expect(insertedPayload.lead_score).toBe('hot') // score < 60 -> hot
      expect(insertedPayload.phone).toBe('+91 98765 00001')

      // Verify notes JSON content
      const parsedNotes = JSON.parse(insertedPayload.notes)
      expect(parsedNotes.company_name).toBe('Apex Physiotherapy Clinic')
      expect(parsedNotes.prospect_status).toBe('analyzed')
      expect(parsedNotes.gbp_audit.audit_score).toBe(45)
      expect(parsedNotes.gbp_audit.revenue_leak.title).toContain('Google Business Profile')
      expect(parsedNotes.gbp_audit.audit_timestamp).toBeDefined()
    })
  })

  // ─── 4. Preserving Existing Prospect Metadata (Update) ─────────────────────
  describe('4. Preserving Existing Prospect Metadata', () => {
    it('preserves existing prospect notes/outreach data when updating by prospectId', async () => {
      vi.mocked(dispatchToolCall).mockResolvedValueOnce({
        toolName: TOOL_NAMES.AUDIT_GBP_PROFILE,
        success: true,
        result: {
          business_name: 'Dr. Rao Smiles',
          category: 'Dental Clinic',
          completeness_score: 75,
          missing_sections: ['Photo coverage'],
          prioritized_recommendations: ['Upload exterior photos'],
        },
        durationMs: 85,
      })

      const existingRecord = {
        id: 'existing-prospect-555',
        name: 'Dr. Rao',
        phone: '+91 94400 99999',
        lead_status: 'new',
        source: 'manual',
        client_id: 'tenant-client-1',
        notes: JSON.stringify({
          contact_name: 'Dr. Rao',
          custom_tag: 'VIP Referral',
          outreach_history: [
            { channel: 'whatsapp', date: '2026-09-01', status: 'sent' },
          ],
        }),
      }

      let updatedPayload: any = null
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'real_estate_leads') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: existingRecord,
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockImplementation((payload: any) => {
              updatedPayload = payload
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...existingRecord, ...payload },
                      error: null,
                    }),
                  }),
                }),
              }
            }),
          }
        }
        return {}
      })

      const input: GbpProspectInput = {
        prospectId: 'existing-prospect-555',
        business_name: 'Dr. Rao Smiles',
        category: 'Dental Clinic',
        hours: 'Mon-Sat 9AM-8PM',
        rating_info: '4.8 stars (52 reviews)',
      }

      const res = await runGbpAudit(input)

      expect(res.success).toBe(true)
      expect(res.prospectId).toBe('existing-prospect-555')
      expect(res.audit?.score).toBe(75)

      // Verify payload
      expect(updatedPayload).toBeDefined()
      expect(updatedPayload.lead_status).toBe('analyzed')

      // Verify existing metadata was preserved
      const parsedNotes = JSON.parse(updatedPayload.notes)
      expect(parsedNotes.custom_tag).toBe('VIP Referral')
      expect(parsedNotes.outreach_history).toEqual([
        { channel: 'whatsapp', date: '2026-09-01', status: 'sent' },
      ])
      expect(parsedNotes.gbp_audit.audit_score).toBe(75)
      expect(parsedNotes.prospect_status).toBe('analyzed')
    })

    it('deduplicates and updates existing record by phone when prospectId is omitted', async () => {
      vi.mocked(dispatchToolCall).mockResolvedValueOnce({
        toolName: TOOL_NAMES.AUDIT_GBP_PROFILE,
        success: true,
        result: {
          business_name: 'Lotus Wellness Spa',
          category: 'Spa & Salon',
          completeness_score: 65,
          missing_sections: [],
          prioritized_recommendations: ['Maintain active reviews'],
        },
        durationMs: 90,
      })

      const existingRecord = {
        id: 'lead-lotus-77',
        name: 'Lotus Spa',
        phone: '+91 91111 22222',
        lead_status: 'new',
        client_id: 'tenant-abc',
        notes: JSON.stringify({
          initial_source: 'instagram',
        }),
      }

      let updatedPayload: any = null
      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'real_estate_leads') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((col: string, val: any) => {
                if (col === 'phone') {
                  return {
                    eq: vi.fn().mockResolvedValue({
                      data: [existingRecord],
                      error: null,
                    }),
                  }
                }
                return { single: vi.fn().mockResolvedValue({ data: null, error: null }) }
              }),
            }),
            update: vi.fn().mockImplementation((payload: any) => {
              updatedPayload = payload
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...existingRecord, ...payload },
                      error: null,
                    }),
                  }),
                }),
              }
            }),
          }
        }
        return {}
      })

      const input: GbpProspectInput = {
        business_name: 'Lotus Wellness Spa',
        phone: '+91 91111 22222',
        client_id: 'tenant-abc',
      }

      const res = await runGbpAudit(input)

      expect(res.success).toBe(true)
      expect(res.prospectId).toBe('lead-lotus-77')
      expect(updatedPayload).toBeDefined()
      expect(updatedPayload.lead_status).toBe('analyzed')

      const parsedNotes = JSON.parse(updatedPayload.notes)
      expect(parsedNotes.initial_source).toBe('instagram')
      expect(parsedNotes.gbp_audit).toBeDefined()
    })
  })
})
