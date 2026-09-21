/**
 * Grovaitech AI Platform
 * tests/unit/gbp-outreach-action.test.ts
 *
 * Unit tests for Step 2 Revenue-First GBP Sales Funnel:
 * `recordProspectOutreach` server action in `app/actions/gbp-sales.ts`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  recordProspectOutreach,
  type RecordProspectOutreachInput,
} from '@/app/actions/gbp-sales'

// Mock dependencies
const mockSupabaseAdmin = {
  from: vi.fn(),
}

vi.mock('@/app/actions/leads', () => ({
  getAdminClient: vi.fn(() => mockSupabaseAdmin),
}))

describe('recordProspectOutreach Server Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── 1. Validation Failures ────────────────────────────────────────────────
  describe('1. Input Validation', () => {
    it('rejects invalid or empty leadId', async () => {
      const res = await recordProspectOutreach('', { channel: 'whatsapp' })
      expect(res.success).toBe(false)
      expect(res.error).toContain("'leadId' is required")

      const resNull = await recordProspectOutreach(null as any, { channel: 'whatsapp' })
      expect(resNull.success).toBe(false)
      expect(resNull.error).toContain("'leadId' is required")
    })

    it('rejects invalid outreach payload or channel', async () => {
      const resNullPayload = await recordProspectOutreach('lead-123', null as any)
      expect(resNullPayload.success).toBe(false)
      expect(resNullPayload.error).toContain("'outreach' must be a valid object")

      const resBadChannel = await recordProspectOutreach('lead-123', {
        channel: 'sms' as any,
      })
      expect(resBadChannel.success).toBe(false)
      expect(resBadChannel.error).toContain("Invalid channel 'sms'")
    })

    it('rejects invalid outcome when supplied', async () => {
      const res = await recordProspectOutreach('lead-123', {
        channel: 'call',
        outcome: 'thinking' as any,
      })
      expect(res.success).toBe(false)
      expect(res.error).toContain("Invalid outcome 'thinking'")
    })

    it('returns error when prospect is not found in database', async () => {
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } }),
          }),
        }),
      })

      const res = await recordProspectOutreach('non-existent-lead', { channel: 'call' })
      expect(res.success).toBe(false)
      expect(res.error).toContain('Prospect not found')
    })
  })

  // ─── 2. Successful Channel Outreach ────────────────────────────────────────
  describe('2. Multi-Channel Outreach Execution', () => {
    it('successfully records WhatsApp outreach with outcome "sent"', async () => {
      const existingLead = {
        id: 'lead-wa-1',
        name: 'Apollo Dental',
        phone: '+91 99887 76655',
        lead_status: 'analyzed',
        notes: JSON.stringify({
          company_name: 'Apollo Dental',
          gbp_audit: { audit_score: 55 },
        }),
      }

      let updatedPayload: any = null
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingLead, error: null }),
          }),
        }),
      })
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn().mockImplementation((payload: any) => {
          updatedPayload = payload
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      })

      const res = await recordProspectOutreach('lead-wa-1', {
        channel: 'whatsapp',
        outcome: 'sent',
        notes: 'Sent Free GBP Audit report summary via WhatsApp',
      })

      expect(res.success).toBe(true)
      expect(res.leadId).toBe('lead-wa-1')
      expect(res.status).toBe('contacted')
      expect(res.outreach?.channel).toBe('whatsapp')
      expect(res.outreach?.outcome).toBe('sent')
      expect(res.outreach?.timestamp).toBeDefined()

      expect(updatedPayload.lead_status).toBe('contacted')
      const parsedNotes = JSON.parse(updatedPayload.notes)
      expect(parsedNotes.company_name).toBe('Apollo Dental')
      expect(parsedNotes.gbp_audit.audit_score).toBe(55)
      expect(parsedNotes.outreach_history).toHaveLength(1)
      expect(parsedNotes.outreach_history[0].channel).toBe('whatsapp')
      expect(parsedNotes.outreach_history[0].notes).toBe('Sent Free GBP Audit report summary via WhatsApp')
    })

    it('successfully records Email outreach with outcome "no_response"', async () => {
      const existingLead = {
        id: 'lead-em-1',
        name: 'Dr. John Clinic',
        lead_status: 'analyzed',
        notes: JSON.stringify({ company_name: 'Dr. John Clinic' }),
      }

      let updatedPayload: any = null
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingLead, error: null }),
          }),
        }),
      })
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn().mockImplementation((payload: any) => {
          updatedPayload = payload
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      })

      const res = await recordProspectOutreach('lead-em-1', {
        channel: 'email',
        outcome: 'no_response',
        notes: 'Cold email sent, no reply after 48h',
      })

      expect(res.success).toBe(true)
      expect(res.status).toBe('contacted')
      expect(updatedPayload.lead_status).toBe('contacted')
    })

    it('successfully records Call outreach with outcome "replied" (transitions to qualified)', async () => {
      const existingLead = {
        id: 'lead-call-1',
        name: 'City Care Hospital',
        lead_status: 'contacted',
        notes: JSON.stringify({ company_name: 'City Care Hospital' }),
      }

      let updatedPayload: any = null
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingLead, error: null }),
          }),
        }),
      })
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn().mockImplementation((payload: any) => {
          updatedPayload = payload
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      })

      const res = await recordProspectOutreach('lead-call-1', {
        channel: 'call',
        outcome: 'replied',
        notes: 'Spoke with clinic manager, interested in review response package',
      })

      expect(res.success).toBe(true)
      expect(res.status).toBe('qualified')
      expect(updatedPayload.lead_status).toBe('qualified')
    })
  })

  // ─── 3. Lifecycle Status Transitions ───────────────────────────────────────
  describe('3. Lifecycle Status Transitions', () => {
    const setupMock = (existingLead: any) => {
      let updatedPayload: any = null
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingLead, error: null }),
          }),
        }),
      })
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn().mockImplementation((payload: any) => {
          updatedPayload = payload
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      })
      return () => updatedPayload
    }

    it('transitions to "contacted" on outcome "sent"', async () => {
      const getPayload = setupMock({ id: 'p1', lead_status: 'analyzed' })
      const res = await recordProspectOutreach('p1', { channel: 'whatsapp', outcome: 'sent' })
      expect(res.status).toBe('contacted')
      expect(getPayload().lead_status).toBe('contacted')
    })

    it('transitions to "contacted" on outcome "no_response"', async () => {
      const getPayload = setupMock({ id: 'p2', lead_status: 'analyzed' })
      const res = await recordProspectOutreach('p2', { channel: 'call', outcome: 'no_response' })
      expect(res.status).toBe('contacted')
      expect(getPayload().lead_status).toBe('contacted')
    })

    it('transitions to "qualified" on outcome "replied"', async () => {
      const getPayload = setupMock({ id: 'p3', lead_status: 'contacted' })
      const res = await recordProspectOutreach('p3', { channel: 'email', outcome: 'replied' })
      expect(res.status).toBe('qualified')
      expect(getPayload().lead_status).toBe('qualified')
    })

    it('transitions to "qualified" on outcome "interested"', async () => {
      const getPayload = setupMock({ id: 'p4', lead_status: 'contacted' })
      const res = await recordProspectOutreach('p4', { channel: 'call', outcome: 'interested' })
      expect(res.status).toBe('qualified')
      expect(getPayload().lead_status).toBe('qualified')
    })

    it('transitions to "lost" on outcome "not_interested"', async () => {
      const getPayload = setupMock({ id: 'p5', lead_status: 'contacted' })
      const res = await recordProspectOutreach('p5', { channel: 'whatsapp', outcome: 'not_interested' })
      expect(res.status).toBe('lost')
      expect(getPayload().lead_status).toBe('lost')
    })

    it('retains current status when outcome is not provided', async () => {
      const getPayload = setupMock({ id: 'p6', lead_status: 'analyzed' })
      const res = await recordProspectOutreach('p6', { channel: 'whatsapp', notes: 'Logged internal check' })
      expect(res.status).toBe('analyzed')
      expect(getPayload().lead_status).toBe('analyzed')
    })
  })

  // ─── 4. Metadata Preservation & History Append ─────────────────────────────
  describe('4. Metadata Preservation & History Append', () => {
    it('preserves existing outreach history and appends new attempt', async () => {
      const existingHistory = [
        {
          channel: 'email',
          outcome: 'sent',
          notes: 'First email sent',
          timestamp: '2026-09-18T10:00:00.000Z',
        },
      ]

      const existingLead = {
        id: 'lead-multi-outreach',
        lead_status: 'contacted',
        notes: JSON.stringify({
          company_name: 'Metro Diagnostic Center',
          custom_tag: 'Tier 1 Target',
          gbp_audit: { audit_score: 40 },
          outreach_history: existingHistory,
        }),
      }

      let updatedPayload: any = null
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingLead, error: null }),
          }),
        }),
      })
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn().mockImplementation((payload: any) => {
          updatedPayload = payload
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      })

      const res = await recordProspectOutreach('lead-multi-outreach', {
        channel: 'whatsapp',
        outcome: 'interested',
        notes: 'Followed up on WhatsApp, agreed to 15-min demo call',
      })

      expect(res.success).toBe(true)
      expect(res.status).toBe('qualified')

      const parsedNotes = JSON.parse(updatedPayload.notes)
      expect(parsedNotes.company_name).toBe('Metro Diagnostic Center')
      expect(parsedNotes.custom_tag).toBe('Tier 1 Target')
      expect(parsedNotes.gbp_audit.audit_score).toBe(40)

      // Check append behavior
      expect(parsedNotes.outreach_history).toHaveLength(2)
      expect(parsedNotes.outreach_history[0].channel).toBe('email')
      expect(parsedNotes.outreach_history[0].notes).toBe('First email sent')
      expect(parsedNotes.outreach_history[1].channel).toBe('whatsapp')
      expect(parsedNotes.outreach_history[1].outcome).toBe('interested')
      expect(parsedNotes.outreach_history[1].notes).toBe('Followed up on WhatsApp, agreed to 15-min demo call')
    })

    it('safely handles malformed notes JSON without crashing and preserves raw string', async () => {
      const existingLead = {
        id: 'lead-bad-json',
        lead_status: 'analyzed',
        notes: '{ malformed json: not valid syntax ...',
      }

      let updatedPayload: any = null
      mockSupabaseAdmin.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: existingLead, error: null }),
          }),
        }),
      })
      mockSupabaseAdmin.from.mockReturnValueOnce({
        update: vi.fn().mockImplementation((payload: any) => {
          updatedPayload = payload
          return {
            eq: vi.fn().mockResolvedValue({ error: null }),
          }
        }),
      })

      const res = await recordProspectOutreach('lead-bad-json', {
        channel: 'call',
        outcome: 'replied',
        notes: 'Customer answered phone',
      })

      expect(res.success).toBe(true)
      expect(res.status).toBe('qualified')

      const parsedNotes = JSON.parse(updatedPayload.notes)
      expect(parsedNotes.raw_notes).toBe('{ malformed json: not valid syntax ...')
      expect(parsedNotes.outreach_history).toHaveLength(1)
      expect(parsedNotes.outreach_history[0].channel).toBe('call')
    })
  })
})
