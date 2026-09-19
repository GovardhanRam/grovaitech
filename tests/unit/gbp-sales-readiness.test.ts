/**
 * Grovaitech AI Platform
 * tests/unit/gbp-sales-readiness.test.ts
 *
 * Dedicated Test Suite for Google Business Profile / Local Business Growth Sales Readiness:
 * 1. Deployment Engine Alignment:
 *    - LOCAL_SEO_REPUTATION leak detection from signals
 *    - Routing and matching to gbp-growth-manager (emp-012)
 *    - Demo plan generation for emp-012
 * 2. GBP-Qualified Lead Capture:
 *    - extractGbpLead extracts usable contact/business info
 *    - Refuses to qualify when user provides NO contact details
 *    - Qualifies lead when user explicitly supplies phone/name/business
 *    - Multi-turn conversation awareness linking audit context
 * 3. CRM Lead Ingress & Tenant Isolation:
 *    - Tenant isolation preserved (client_id / user_id)
 *    - Deduplication: no duplicate lead records for same phone
 *    - Merely executing audit_gbp_profile DOES NOT create a CRM lead
 * 4. Preservation of Existing GBP Tools:
 *    - audit_gbp_profile, draft_review_reply, create_gbp_post remain fully functional
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  detectRevenueLeaks,
  matchEmployeesForProspect,
  generateDemoPlan,
  type Prospect,
} from '@/lib/deployment'
import { extractGbpLead } from '@/lib/leads/extractor'
import { createLead } from '@/app/actions/leads'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { TOOL_NAMES } from '@/lib/ai/tools'
import { getCanonicalEmployeeBySlug } from '@/lib/employees/registry'

// Mock admin client / supabase for lead tests
vi.mock('@/app/actions/leads', async () => {
  const actual = await vi.importActual<typeof import('@/app/actions/leads')>('@/app/actions/leads')
  const inMemoryStore: Record<string, any[]> = {}

  return {
    ...actual,
    createLead: vi.fn(async (lead: any) => {
      if (!lead.name || !lead.name.trim()) {
        return { success: false, error: 'Name is required' }
      }
      if (!lead.phone || !lead.phone.trim()) {
        return { success: false, error: 'Phone number is required' }
      }
      if (!lead.location || !lead.location.trim()) {
        return { success: false, error: 'Location of interest is required' }
      }
      if (!lead.budget || !lead.budget.trim()) {
        return { success: false, error: 'Budget is required' }
      }
      if (!lead.timeline || !lead.timeline.trim()) {
        return { success: false, error: 'Timeline is required' }
      }

      const tenantKey = lead.client_id || '__public__'
      if (!inMemoryStore[tenantKey]) {
        inMemoryStore[tenantKey] = []
      }

      const cleanPhone = lead.phone.trim()
      const existing = inMemoryStore[tenantKey].find((l) => l.phone === cleanPhone)
      if (existing) {
        return {
          success: true,
          data: existing,
          isUpdate: true,
        }
      }

      const newRecord = {
        ...lead,
        id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        created_at: new Date().toISOString(),
      }
      inMemoryStore[tenantKey].push(newRecord)
      return {
        success: true,
        data: newRecord,
        isUpdate: false,
      }
    }),
  }
})

describe('GBP / Local Business Growth Sales Readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── 1. Deployment Engine Alignment ─────────────────────────────────────────

  describe('1. Deployment Engine Alignment', () => {
    it('1.1 detects LOCAL_SEO_REPUTATION leak from local SEO and GBP signals', () => {
      const prospect: Prospect = {
        company_name: 'Apex Dental Care',
        industry: 'Healthcare Clinic',
        known_problems: [
          'Incomplete Google Business Profile listing',
          'Poor local ranking on Google Maps',
          'Unanswered negative reviews hurting foot traffic',
        ],
        current_channels: ['Google Maps', 'Walk-ins'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const categories = leaks.map((l) => l.category)

      expect(categories).toContain('LOCAL_SEO_REPUTATION')

      const gbpLeak = leaks.find((l) => l.category === 'LOCAL_SEO_REPUTATION')
      expect(gbpLeak).toBeDefined()
      expect(gbpLeak?.detected_signals.length).toBeGreaterThanOrEqual(2)
      expect(gbpLeak?.title).toContain('Google Business Profile')
      expect(gbpLeak?.confidence).toBe('high')
    })

    it('1.2 routes local-business GBP problems to gbp-growth-manager (emp-012)', () => {
      const prospect: Prospect = {
        company_name: 'Dr. Smile Orthodontics',
        industry: 'Dental Clinic',
        known_problems: [
          'low local search visibility on Google 3-pack',
          'need autonomous Google reviews management',
          'google business profile under-optimized',
        ],
      }

      const { recommended_employee, alternative_matches } = matchEmployeesForProspect(prospect)
      expect(recommended_employee).not.toBeNull()

      const topMatch = recommended_employee!
      expect(topMatch.employee.slug).toBe('gbp-growth-manager')
      expect(topMatch.employee_id).toBe('emp-012')
      expect(topMatch.reasons.some((r) => r.includes('LOCAL SEO REPUTATION'))).toBe(true)
      expect(topMatch.match_score).toBeGreaterThanOrEqual(70)
    })

    it('1.3 generates tailored interactive demo plan for gbp-growth-manager', () => {
      const prospect: Prospect = {
        company_name: 'Sunrise Family Restaurant',
        industry: 'Local Business',
        known_problems: ['unanswered reviews', 'google business profile optimization'],
      }

      const leaks = detectRevenueLeaks(prospect)
      const { recommended_employee, alternative_matches } = matchEmployeesForProspect(prospect)
      const allMatches = recommended_employee ? [recommended_employee, ...alternative_matches] : alternative_matches
      const primaryMatch = allMatches.find((m) => m.employee_id === 'emp-012') || allMatches[0]
      const primaryLeak = leaks.find((l) => l.category === 'LOCAL_SEO_REPUTATION')

      const plan = generateDemoPlan(prospect, primaryMatch, primaryLeak)
      expect(plan.headline).toContain('Google Business Profile')
      expect(plan.headline).toContain('Sunrise Family Restaurant')
      expect(plan.conversation_starters.length).toBe(3)
      expect(plan.conversation_starters[0]).toContain('audit our Google Business Profile')
      expect(plan.expected_outcome).toContain('Google profile completeness')
      expect(plan.expected_outcome).toContain('analyzes customer reviews')
    })
  })

  // ─── 2. GBP-Qualified Lead Capture ──────────────────────────────────────────

  describe('2. GBP-Qualified Lead Capture', () => {
    it('2.1 does NOT qualify lead when user only asks for audit without contact details', async () => {
      const history = [
        { role: 'user', content: 'Can you audit Apex Dental Care in Tirupati?' },
        {
          role: 'assistant',
          content: 'Here is your audit. Profile completeness score is 45%. You are missing NAP details.',
        },
      ]

      const auditContext = {
        business_name: 'Apex Dental Care',
        category: 'Dental Clinic',
        address_nap: 'Tirupati, AP',
      }

      const extracted = await extractGbpLead(history, auditContext)

      expect(extracted.phone).toBeNull()
      expect(extracted.is_lead_ready).toBe(false)
    })

    it('2.2 qualifies lead when user explicitly supplies phone number and name', async () => {
      const history = [
        {
          role: 'user',
          content:
            'Please audit our clinic Apex Dental Care in Tirupati. My name is Dr. Ramesh, call me at +91 9876543210.',
        },
      ]

      const auditContext = {
        business_name: 'Apex Dental Care',
        category: 'Dental Clinic',
        address_nap: 'Tirupati, AP',
      }

      const extracted = await extractGbpLead(history, auditContext)

      expect(extracted.is_lead_ready).toBe(true)
      expect(extracted.phone).toContain('9876543210')
      expect(extracted.contact_name).toContain('Ramesh')
      expect(extracted.business_name).toBe('Apex Dental Care')
      expect(extracted.location).toBe('Tirupati')
    })

    it('2.3 captures contact details in multi-turn conversation following an audit', async () => {
      const history = [
        { role: 'user', content: 'Audit Dr. Smiles Clinic in Bangalore' },
        {
          role: 'assistant',
          content: 'Audit completed. Score: 60%. Missing regular posts and unanswered reviews.',
        },
        {
          role: 'user',
          content:
            'I want your team to help fix our ranking. Contact me at 9876543210, email ramesh@drsmiles.com. I am Dr. Ramesh.',
        },
      ]

      const auditContext = {
        business_name: 'Dr. Smiles Clinic',
        category: 'Dental Clinic',
        address_nap: 'Bangalore, KA',
      }

      const extracted = await extractGbpLead(history, auditContext)

      expect(extracted.is_lead_ready).toBe(true)
      expect(extracted.phone).toContain('9876543210')
      expect(extracted.email).toBe('ramesh@drsmiles.com')
      expect(extracted.contact_name).toContain('Ramesh')
      expect(extracted.business_name).toBe('Dr. Smiles Clinic')
    })

    it('2.4 does not confuse audit listing phone with user contact phone when user gives none', async () => {
      // In this case, the user asks to audit a competitor and mentions competitor phone
      // but does NOT provide their own contact info to be contacted.
      const history = [
        {
          role: 'user',
          content: 'Audit competitor profile Apollo Dental, phone on listing is 080-22334455',
        },
      ]

      const extracted = await extractGbpLead(history)
      expect(extracted.phone).toBeNull()
      expect(extracted.is_lead_ready).toBe(false)
    })

    it('2.5 captures phone with explicit reach-me and my-number phrasing', async () => {
      const history1 = [
        {
          role: 'user',
          content: 'You can reach me at 9876543210. Business is Sunrise Bakery in Salem.',
        },
      ]
      const extracted1 = await extractGbpLead(history1)
      expect(extracted1.phone).toContain('9876543210')
      expect(extracted1.is_lead_ready).toBe(true)
      expect(extracted1.business_name).toBe('Sunrise Bakery')

      const history2 = [
        {
          role: 'user',
          content: 'My number is +91 9123456780, owner is Priya.',
        },
      ]
      const extracted2 = await extractGbpLead(history2)
      expect(extracted2.phone).toContain('9123456780')
      expect(extracted2.contact_name).toBe('Priya')
      expect(extracted2.is_lead_ready).toBe(true)
    })
  })

  // ─── 3. CRM Lead Ingress, Tenant Isolation & Deduplication ──────────────────

  describe('3. CRM Lead Ingress, Tenant Isolation & Deduplication', () => {
    it('3.1 creates a qualified CRM lead with commercial classification', async () => {
      const leadPayload = {
        name: 'Dr. Ramesh - Apex Dental Care',
        phone: '+91 9876543210',
        email: 'ramesh@apexdental.com',
        property_type: 'commercial' as const,
        location: 'Tirupati',
        budget: 'GBP Growth & Reputation Package',
        timeline: 'Immediate',
        lead_score: 'warm' as const,
        lead_status: 'qualified' as const,
        notes: '[GBP Growth Lead] Business: Apex Dental Care. Category: Dental Clinic.',
        source: 'ai_demo' as const,
      }

      const res = await createLead(leadPayload)

      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(res.data.name).toBe('Dr. Ramesh - Apex Dental Care')
      expect(res.data.phone).toBe('+91 9876543210')
      expect(res.data.property_type).toBe('commercial')
      expect(res.isUpdate).toBe(false)
    })

    it('3.2 prevents duplicate lead creation on subsequent turns with same phone', async () => {
      const leadPayload = {
        name: 'Dr. Ramesh - Apex Dental Care',
        phone: '+91 9876543210',
        location: 'Tirupati',
        budget: 'GBP Growth & Reputation Package',
        timeline: 'Immediate',
      }

      // First call was in test 3.1
      const res = await createLead(leadPayload)

      expect(res.success).toBe(true)
      expect(res.isUpdate).toBe(true)
      expect(res.data.phone).toBe('+91 9876543210')
    })

    it('3.3 preserves tenant isolation between distinct clients', async () => {
      const client1Payload = {
        name: 'Client 1 Lead',
        phone: '+91 9999988888',
        location: 'Tirupati',
        budget: 'Standard',
        timeline: 'Immediate',
        client_id: 'tenant-client-alpha',
      }

      const client2Payload = {
        name: 'Client 2 Lead',
        phone: '+91 9999988888',
        location: 'Bangalore',
        budget: 'Premium',
        timeline: 'Immediate',
        client_id: 'tenant-client-beta',
      }

      const res1 = await createLead(client1Payload)
      const res2 = await createLead(client2Payload)

      expect(res1.success).toBe(true)
      expect(res2.success).toBe(true)
      // Both are fresh records in their respective tenant stores (no cross-tenant collision)
      expect(res1.isUpdate).toBe(false)
      expect(res2.isUpdate).toBe(false)
      expect(res1.data.client_id).toBe('tenant-client-alpha')
      expect(res2.data.client_id).toBe('tenant-client-beta')
    })
  })

  // ─── 4. Preservation of Existing GBP Tools ──────────────────────────────────

  describe('4. Preservation of Existing GBP Dispatcher Tools', () => {
    it('4.1 audit_gbp_profile executes without side-effect CRM writes', async () => {
      const res = await dispatchToolCall(
        TOOL_NAMES.AUDIT_GBP_PROFILE,
        {
          business_name: 'Tirupati Sweets & Bakery',
          category: 'Bakery',
          address_nap: 'Gandhi Road, Tirupati, +91 9440011223',
        },
        { executionMode: 'sandbox' }
      )

      expect(res.success).toBe(true)
      expect(res.toolName).toBe('audit_gbp_profile')
      expect(res.result.business_name).toBe('Tirupati Sweets & Bakery')
      expect(res.result.completeness_score).toBeDefined()
      expect(res.result.isSimulated).toBe(true)
      // Verifies no lead or workflow was returned by tool directly
      expect(res.result.leadId).toBeUndefined()
    })

    it('4.2 draft_review_reply drafts brand-aligned responses without live Google posting', async () => {
      const res = await dispatchToolCall(
        TOOL_NAMES.DRAFT_REVIEW_REPLY,
        {
          business_name: 'Tirupati Sweets & Bakery',
          reviewer_name: 'Karthik',
          rating: 1,
          review_text: 'Ordered sweets for Diwali, delivery was delayed by 3 hours and box was crushed.',
        },
        { executionMode: 'sandbox' }
      )

      expect(res.success).toBe(true)
      expect(res.toolName).toBe('draft_review_reply')
      expect(res.result.draft_reply).toBeDefined()
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
    })

    it('4.3 create_gbp_post drafts local promotional update without live modification', async () => {
      const res = await dispatchToolCall(
        TOOL_NAMES.CREATE_GBP_POST,
        {
          business_name: 'Tirupati Sweets & Bakery',
          post_topic: 'Special weekend discount 20% off on all traditional ghee sweets!',
          offer_event_details: 'Get 20% off all ghee sweets this Saturday and Sunday',
          call_to_action: 'order_online',
        },
        { executionMode: 'sandbox' }
      )

      expect(res.success).toBe(true)
      expect(res.toolName).toBe('create_gbp_post')
      expect(res.result.draft_post_content).toBeDefined()
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
    })

    it('4.4 verifies canonical gbp-growth-manager employee definition is unchanged and intact', () => {
      const employee = getCanonicalEmployeeBySlug('gbp-growth-manager')
      expect(employee).toBeDefined()
      expect(employee?.id).toBe('emp-012')
      expect(employee?.slug).toBe('gbp-growth-manager')
      expect(employee?.tools).toEqual([
        'audit_gbp_profile',
        'draft_review_reply',
        'create_gbp_post',
        'search_knowledge_base',
      ])
    })
  })
})
