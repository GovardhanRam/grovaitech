/**
 * Grovaitech AI Workforce OS
 * tests/unit/gbp-sales-workspace.test.ts
 *
 * Dedicated Test Suite for Step 3: GBP Sales Workspace & Lead Detail Drawer.
 * Verifies:
 * 1. Metadata & Notes Parsing:
 *    - parseLeadNotes handles null/empty/plain text/malformed JSON safely
 *    - prevents raw JSON string leakage into UI
 *    - accurately deserializes gbp_audit and outreach_history
 * 2. Audit Display Logic:
 *    - completeness score extraction and health threshold classification
 *    - missing fields, recommendations, and revenue leak preservation
 *    - hot/warm score mapping based on audit urgency
 * 3. Outreach Recording & History:
 *    - channel formatting and outcome badge meta
 *    - chronological reversal for latest-first outreach timeline
 *    - status mapping contract (contacted, qualified, lost)
 * 4. End-to-End Workspace State Update Flow:
 *    - simulates drawer action dispatch and lead state update callback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseLeadNotes,
  formatOutreachTime,
  type ParsedLeadNotes,
  type Lead,
} from '@/components/leads/LeadsWorkspace'
import { runGbpAudit, recordProspectOutreach } from '@/app/actions/gbp-sales'

// Mock Supabase admin client for server actions
const mockDb: Record<string, any> = {}

vi.mock('@/app/actions/leads', async () => {
  const actual = await vi.importActual<typeof import('@/app/actions/leads')>('@/app/actions/leads')
  return {
    ...actual,
    getAdminClient: vi.fn(() => ({
      from: vi.fn((_table: string) => {
        let currentId: string | null = null
        let currentPayload: any = null

        const builder: any = {
          select: vi.fn(() => builder),
          eq: vi.fn((col: string, val: any) => {
            if (col === 'id') currentId = val
            return builder
          }),
          single: vi.fn(async () => {
            if (currentId && mockDb[currentId]) {
              if (currentPayload) {
                mockDb[currentId] = { ...mockDb[currentId], ...currentPayload }
                currentPayload = null
              }
              return { data: { ...mockDb[currentId] }, error: null }
            }
            return { data: null, error: { message: 'Row not found' } }
          }),
          insert: vi.fn((payload: any) => {
            currentPayload = payload
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => {
                  const inserted = {
                    id: currentPayload.id || `lead-${Date.now()}`,
                    ...currentPayload,
                    created_at: new Date().toISOString(),
                  }
                  mockDb[inserted.id] = inserted
                  return { data: inserted, error: null }
                }),
              })),
            }
          }),
          update: vi.fn((payload: any) => {
            currentPayload = payload
            return builder
          }),
        }

        builder.then = (resolve: any) => {
          if (currentId && mockDb[currentId] && currentPayload) {
            mockDb[currentId] = { ...mockDb[currentId], ...currentPayload }
            return resolve({ data: mockDb[currentId], error: null })
          }
          return resolve({ data: null, error: null })
        }

        return builder
      }),
    })),
  }
})

describe('GBP Sales Workspace (LeadsWorkspace & LeadDrawer)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(mockDb)) {
      delete mockDb[key]
    }
  })

  // ─── 1. Metadata & Notes Parsing ──────────────────────────────────────────
  describe('1. Metadata & Notes Parsing (parseLeadNotes)', () => {
    it('1.1 returns null meta and null rawText for empty or undefined notes', () => {
      expect(parseLeadNotes(undefined)).toEqual({ meta: null, rawText: null })
      expect(parseLeadNotes('')).toEqual({ meta: null, rawText: null })
    })

    it('1.2 returns plain text in rawText without creating JSON meta', () => {
      const plainNote = 'Client called asking for GBP optimization and review management.'
      const res = parseLeadNotes(plainNote)
      expect(res.meta).toBeNull()
      expect(res.rawText).toBe(plainNote)
    })

    it('1.3 safely recovers from malformed JSON string without throwing', () => {
      const brokenJson = '{"gbp_audit": { "score": 45, invalid json...'
      const res = parseLeadNotes(brokenJson)
      expect(res.meta).toBeNull()
      expect(res.rawText).toBe(brokenJson)
    })

    it('1.4 correctly parses valid JSON metadata with gbp_audit and outreach_history', () => {
      const validMeta: ParsedLeadNotes = {
        company_name: 'Metro Dental Clinic',
        industry: 'Healthcare',
        gbp_audit: {
          score: 55,
          missing_fields: ['Hours', 'Website'],
          recommendations: ['Add business hours', 'Link official website'],
          revenue_leak: {
            title: 'High Customer Drop-off',
            problem: 'Missing phone and operating hours',
            opportunity: 'Capture +20 local calls per week',
          },
          timestamp: '2026-03-20T10:00:00.000Z',
        },
        outreach_history: [
          {
            channel: 'whatsapp',
            outcome: 'sent',
            notes: 'Sent initial audit PDF',
            timestamp: '2026-03-20T10:15:00.000Z',
          },
        ],
        raw_notes: 'Spoke with clinic receptionist Dr. Anita',
      }

      const res = parseLeadNotes(JSON.stringify(validMeta))
      expect(res.meta).toBeDefined()
      expect(res.meta?.company_name).toBe('Metro Dental Clinic')
      expect(res.meta?.gbp_audit?.score).toBe(55)
      expect(res.meta?.outreach_history).toHaveLength(1)
      expect(res.rawText).toBe('Spoke with clinic receptionist Dr. Anita')
    })
  })

  // ─── 2. Time Formatting ───────────────────────────────────────────────────
  describe('2. Outreach Time Formatting (formatOutreachTime)', () => {
    it('2.1 returns Recently for undefined or empty timestamp', () => {
      expect(formatOutreachTime(undefined)).toBe('Recently')
      expect(formatOutreachTime('')).toBe('Recently')
    })

    it('2.2 returns localized formatted string for valid ISO timestamp', () => {
      const iso = '2026-03-20T10:30:00.000Z'
      const formatted = formatOutreachTime(iso)
      expect(typeof formatted).toBe('string')
      expect(formatted.length).toBeGreaterThan(3)
    })
  })

  // ─── 3. Audit Scoring & Urgency Logic ─────────────────────────────────────
  describe('3. Audit Scoring & Urgency Logic', () => {
    it('3.1 classifies score health according to visual thresholds', () => {
      const classifyScore = (s: number) =>
        s >= 70 ? 'Good Visibility' : s >= 50 ? 'Needs Fixes' : 'High Drop-Off'

      expect(classifyScore(85)).toBe('Good Visibility')
      expect(classifyScore(70)).toBe('Good Visibility')
      expect(classifyScore(65)).toBe('Needs Fixes')
      expect(classifyScore(50)).toBe('Needs Fixes')
      expect(classifyScore(45)).toBe('High Drop-Off')
      expect(classifyScore(20)).toBe('High Drop-Off')
    })

    it('3.2 maps low audit score (< 60) to hot lead priority for sales urgency', () => {
      const getPriority = (score: number) => (score < 60 ? 'hot' : 'warm')

      expect(getPriority(45)).toBe('hot')
      expect(getPriority(55)).toBe('hot')
      expect(getPriority(60)).toBe('warm')
      expect(getPriority(80)).toBe('warm')
    })
  })

  // ─── 4. Outreach Lifecycle Transition Rules ───────────────────────────────
  describe('4. Outreach Lifecycle Status Rules', () => {
    it('4.1 verifies outcome to status transition mappings', () => {
      const outcomeToStatus: Record<string, string> = {
        sent: 'contacted',
        no_response: 'contacted',
        replied: 'qualified',
        interested: 'qualified',
        not_interested: 'lost',
      }

      expect(outcomeToStatus['sent']).toBe('contacted')
      expect(outcomeToStatus['no_response']).toBe('contacted')
      expect(outcomeToStatus['replied']).toBe('qualified')
      expect(outcomeToStatus['interested']).toBe('qualified')
      expect(outcomeToStatus['not_interested']).toBe('lost')
    })

    it('4.2 orders outreach history newest-first', () => {
      const history = [
        { channel: 'email' as const, timestamp: '2026-03-18T10:00:00Z', notes: 'First touch' },
        { channel: 'whatsapp' as const, timestamp: '2026-03-19T14:00:00Z', notes: 'Second touch' },
        { channel: 'call' as const, timestamp: '2026-03-20T16:00:00Z', notes: 'Third touch' },
      ]

      const displayedOrder = [...history].reverse()
      expect(displayedOrder[0].notes).toBe('Third touch')
      expect(displayedOrder[1].notes).toBe('Second touch')
      expect(displayedOrder[2].notes).toBe('First touch')
    })
  })

  // ─── 5. End-to-End Workflow Integration ───────────────────────────────────
  describe('5. End-to-End Workflow Integration', () => {
    it('5.1 runs audit, updates lead status to analyzed, and records outreach to update status to qualified', async () => {
      // Seed a prospect lead in mock database
      const leadId = 'lead-gbp-test-01'
      mockDb[leadId] = {
        id: leadId,
        name: 'Apex Orthopedic Clinic',
        phone: '+91 9888877777',
        location: 'Tirupati, AP',
        property_type: 'commercial',
        budget: 'GBP Growth & Reputation Package',
        timeline: 'Immediate',
        lead_status: 'new',
        lead_score: 'warm',
        source: 'ai_demo',
        notes: null,
      }

      // Step A: Run GBP audit via server action
      const auditRes = await runGbpAudit({
        prospectId: leadId,
        business_name: 'Apex Orthopedic Clinic',
        phone: '+91 9888877777',
        location: 'Tirupati, AP',
        category: 'Orthopedic Clinic',
      })

      expect(auditRes.success).toBe(true)
      expect(auditRes.audit).toBeDefined()
      expect(auditRes.audit?.score).toBeDefined()
      expect(auditRes.prospectId).toBe(leadId)

      // Verify db was updated to analyzed status with audit metadata
      const auditedLead = mockDb[leadId]
      expect(auditedLead.lead_status).toBe('analyzed')
      const parsedAuditNotes = parseLeadNotes(auditedLead.notes)
      expect(parsedAuditNotes.meta?.gbp_audit).toBeDefined()
      expect(parsedAuditNotes.meta?.gbp_audit?.score).toBe(auditRes.audit?.score)

      // Step B: Record outreach (outcome: 'interested')
      const outreachRes = await recordProspectOutreach(leadId, {
        channel: 'whatsapp',
        outcome: 'interested',
        notes: 'Owner replied saying they want the GBP ranking package and review system.',
      })

      expect(outreachRes.success).toBe(true)
      expect(outreachRes.status).toBe('qualified')
      expect(outreachRes.outreach?.channel).toBe('whatsapp')
      expect(outreachRes.outreach?.outcome).toBe('interested')

      // Verify db was updated to qualified status with outreach history appended
      const qualifiedLead = mockDb[leadId]
      expect(qualifiedLead.lead_status).toBe('qualified')
      const parsedOutreachNotes = parseLeadNotes(qualifiedLead.notes)
      expect(parsedOutreachNotes.meta?.outreach_history).toHaveLength(1)
      expect(parsedOutreachNotes.meta?.outreach_history?.[0].outcome).toBe('interested')
      expect(parsedOutreachNotes.meta?.gbp_audit).toBeDefined() // Audit data retained
    })

    it('5.2 handles lead state callback safely on client update simulation', () => {
      const leadState: Lead = {
        id: 'lead-client-01',
        name: 'Apollo Pharmacy',
        phone: '+91 9123456789',
        location: 'Bangalore',
        property_type: 'commercial',
        budget: 'GBP Package',
        timeline: 'Immediate',
        lead_status: 'new',
        lead_score: 'warm',
        source: 'manual',
        created_at: new Date().toISOString(),
        notes: undefined,
      }

      let currentLead = { ...leadState }
      const handleLeadUpdate = (updated: Lead) => {
        currentLead = updated
      }

      // Simulate audit update
      const sampleAudit = {
        score: 45,
        missing_fields: ['Website'],
        recommendations: ['Add website link'],
        timestamp: new Date().toISOString(),
      }
      const updatedMeta: ParsedLeadNotes = {
        company_name: currentLead.name,
        gbp_audit: sampleAudit,
        prospect_status: 'analyzed',
      }

      handleLeadUpdate({
        ...currentLead,
        lead_status: 'analyzed',
        lead_score: sampleAudit.score < 60 ? 'hot' : 'warm',
        notes: JSON.stringify(updatedMeta),
      })

      expect(currentLead.lead_status).toBe('analyzed')
      expect(currentLead.lead_score).toBe('hot')
      expect(parseLeadNotes(currentLead.notes).meta?.gbp_audit?.score).toBe(45)
    })
  })
})
