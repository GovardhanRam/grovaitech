/**
 * Grovaitech AI Platform
 * tests/unit/grounded-knowledge.test.ts
 *
 * Comprehensive Unit and Adversarial Security Tests for Tenant-Scoped Grounded Business Knowledge.
 * Verifies:
 * 1. Strict multi-tenant isolation (Tenant A cannot retrieve Tenant B's knowledge)
 * 2. Deterministic retrieval (exact verified facts returned; no model hallucination)
 * 3. Fail-closed behavior on missing, blank, or malformed tenant identities
 * 4. Explicit "no verified knowledge found" on non-matching queries
 * 5. Dispatcher adversarial defense: untrusted tool arguments cannot select another tenant
 * 6. RAG Search API adversarial defense: BOLA/IDOR protection (cross-tenant clientId rejected with 403)
 * 7. Runtime boundary defense: model-injected tenant arguments stripped before tool execution
 * 8. CRUD helpers validation and strict tenant scoping
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  searchClientKnowledge,
  upsertClientKnowledgeItem,
  listClientKnowledge,
  deleteClientKnowledgeItem,
  isValidTenantId,
  type ClientKnowledgeItem,
} from '@/lib/knowledge'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { runAgentTurn } from '@/lib/ai/runtime'
import { Gemini, generateResponse } from '@/lib/ai/gemini'
import { POST as ragSearchPost } from '@/app/api/rag-search/route'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

// Mock gemini to verify it is NOT called during grounded tenant retrieval
let mockGenerateContentWithTools: any
let mockGenerateText: any

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn(),
  generateModelResponse: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

describe('Tenant-Scoped Grounded Business Knowledge & Adversarial Hardening', () => {
  const TENANT_A = 'client-apex-dental-101'
  const TENANT_B = 'client-zenith-realty-202'

  let inMemoryKnowledgeStore: ClientKnowledgeItem[] = []

  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn().mockImplementation((table: string) => {
      let filters: Array<{ field: string; val: any }> = []
      let insertedPayload: any = null
      let isDelete = false

      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((field: string, val: any) => {
          filters.push({ field, val })
          return builder
        }),
        insert: vi.fn().mockImplementation((data: any) => {
          insertedPayload = data
          return builder
        }),
        delete: vi.fn().mockImplementation(() => {
          isDelete = true
          return builder
        }),
        single: vi.fn().mockImplementation(async () => {
          if (insertedPayload) {
            const item = {
              id: insertedPayload.id || `k-${Math.random().toString(36).substring(2, 7)}`,
              created_at: new Date().toISOString(),
              ...insertedPayload,
            }
            inMemoryKnowledgeStore.push(item)
            return { data: item, error: null }
          }
          return { data: null, error: new Error('Not found') }
        }),
        then: (onfulfilled: any) => {
          if (isDelete) {
            inMemoryKnowledgeStore = inMemoryKnowledgeStore.filter(r =>
              !filters.every(f => String((r as any)[f.field]) === String(f.val))
            )
            return onfulfilled({ data: null, error: null })
          }

          let filtered = [...inMemoryKnowledgeStore]
          if (filters.length > 0) {
            filtered = filtered.filter(r =>
              filters.every(f => String((r as any)[f.field]) === String(f.val))
            )
          }
          return onfulfilled({ data: filtered, error: null })
        },
      }
      return builder
    }),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    inMemoryKnowledgeStore = [
      {
        id: 'k-apex-1',
        client_id: TENANT_A,
        category: 'hours',
        question_or_topic: 'Operating Hours and Clinic Timings',
        verified_content: 'Monday to Saturday: 9:00 AM - 7:00 PM. Closed on Sundays.',
      },
      {
        id: 'k-apex-2',
        client_id: TENANT_A,
        category: 'pricing',
        question_or_topic: 'Consultation and Cleaning Pricing',
        verified_content: 'Routine dental consultation is ₹500. Comprehensive teeth cleaning starts at ₹1,500.',
      },
      {
        id: 'k-apex-3',
        client_id: TENANT_A,
        category: 'policies',
        question_or_topic: 'Cancellation and Rescheduling Policy',
        verified_content: 'Appointments may be rescheduled or cancelled without penalty up to 2 hours prior to the scheduled slot.',
      },
      {
        id: 'k-zenith-1',
        client_id: TENANT_B,
        category: 'pricing',
        question_or_topic: 'Apartment Price Ranges and Booking Amounts',
        verified_content: '2BHK luxury apartments start from ₹85 Lakhs. Initial booking token amount is ₹2 Lakhs.',
      },
      {
        id: 'k-zenith-2',
        client_id: TENANT_B,
        category: 'hours',
        question_or_topic: 'Experience Center Hours',
        verified_content: 'Site visits and experience center open all 7 days from 10:00 AM to 6:00 PM.',
      },
    ]

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
    vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

    mockGenerateContentWithTools = vi.fn()
    mockGenerateText = vi.fn()
    vi.mocked(Gemini).mockImplementation(() => ({
      generateContentWithTools: mockGenerateContentWithTools,
      generateText: mockGenerateText,
      generateContent: vi.fn(),
      getEmbeddings: vi.fn(),
    } as any))
  })

  // ─── 1. Tenant Isolation Tests ──────────────────────────────────────────────
  describe('1. Multi-Tenant Isolation', () => {
    it('Tenant A retrieves ONLY its own verified knowledge and NEVER leaks Tenant B data', async () => {
      const result = await searchClientKnowledge({
        clientId: TENANT_A,
        query: 'What are the pricing details and fees?',
        client: mockSupabase,
      })

      expect(result.found).toBe(true)
      expect(result.answer).toContain('Routine dental consultation is ₹500')
      expect(result.answer).toContain('teeth cleaning starts at ₹1,500')
      // Must NOT contain Tenant B's real estate pricing
      expect(result.answer).not.toContain('₹85 Lakhs')
      expect(result.answer).not.toContain('2BHK')
      expect(result.items.every(i => i.client_id === TENANT_A)).toBe(true)
    })

    it('Tenant B retrieves ONLY its own verified knowledge for identical query topic', async () => {
      const result = await searchClientKnowledge({
        clientId: TENANT_B,
        query: 'What are the pricing details?',
        client: mockSupabase,
      })

      expect(result.found).toBe(true)
      expect(result.answer).toContain('2BHK luxury apartments start from ₹85 Lakhs')
      expect(result.answer).toContain('booking token amount is ₹2 Lakhs')
      // Must NOT contain Tenant A's clinic pricing
      expect(result.answer).not.toContain('dental consultation')
      expect(result.answer).not.toContain('₹500')
      expect(result.items.every(i => i.client_id === TENANT_B)).toBe(true)
    })
  })

  // ─── 2. Deterministic Grounding & Zero Hallucination ─────────────────────────
  describe('2. Deterministic Retrieval & Zero Hallucination', () => {
    it('returns exact verified facts without calling generative model when knowledge matches', async () => {
      const result = await searchClientKnowledge({
        clientId: TENANT_A,
        query: 'cancellation policy',
        client: mockSupabase,
      })

      expect(result.found).toBe(true)
      expect(result.answer).toContain('up to 2 hours prior to the scheduled slot')
      expect(result.referencedDocs).toContain('Cancellation and Rescheduling Policy')
      expect(generateResponse).not.toHaveBeenCalled()
    })

    it('returns explicit "no verified knowledge found" on non-matching query without fabricating answers', async () => {
      const result = await searchClientKnowledge({
        clientId: TENANT_A,
        query: 'Do you offer emergency helicopter ambulance services?',
        client: mockSupabase,
      })

      expect(result.found).toBe(false)
      expect(result.answer).toContain('No verified knowledge found')
      expect(result.items).toHaveLength(0)
      expect(result.referencedDocs).toBe('')
      expect(generateResponse).not.toHaveBeenCalled()
    })
  })

  // ─── 3. Fail-Closed Boundaries ──────────────────────────────────────────────
  describe('3. Fail-Closed Boundaries on Invalid/Missing Identifiers', () => {
    it('fails closed when clientId is missing or null', async () => {
      const result = await searchClientKnowledge({
        clientId: null,
        query: 'What are the prices?',
        client: mockSupabase,
      })

      expect(result.found).toBe(false)
      expect(result.answer).toContain('No verified knowledge found for this organization')
      expect(result.items).toHaveLength(0)
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('fails closed when clientId is blank', async () => {
      const result = await searchClientKnowledge({
        clientId: '   ',
        query: 'What are the prices?',
        client: mockSupabase,
      })

      expect(result.found).toBe(false)
      expect(result.answer).toContain('No verified knowledge found for this organization')
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('fails closed when clientId is malformed with injection characters or symbols', async () => {
      const maliciousClientIds = [
        "client-apex'; DROP TABLE client_knowledge_items;--",
        'client-apex/../../etc/passwd',
        '<script>alert(1)</script>',
        'client apex space',
        'a'.repeat(200), // Exceeds 128 chars
      ]

      for (const badId of maliciousClientIds) {
        expect(isValidTenantId(badId)).toBe(false)
        const result = await searchClientKnowledge({
          clientId: badId,
          query: 'What are the prices?',
          client: mockSupabase,
        })
        expect(result.found).toBe(false)
        expect(result.answer).toContain('No verified knowledge found for this organization')
        expect(mockSupabase.from).not.toHaveBeenCalled()
      }
    })
  })

  // ─── 4. Dispatcher Security & Context Separation ────────────────────────────
  describe('4. Dispatcher Defense: Authorized vs. Requested Tenant', () => {
    it('uses authorizedClientId when provided and rejects cross-tenant requestedClientId argument', async () => {
      // Caller is authorized for TENANT_A, but untrusted tool arg requested TENANT_B
      const result = await dispatchToolCall(
        'search_knowledge_base',
        {
          clientId: TENANT_B, // Untrusted argument trying to access Tenant B
          query: 'What are the pricing details?',
        },
        {
          authorizedClientId: TENANT_A, // Authorized server context
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Security Violation')
      expect(result.error).toContain('does not match authorized tenant')
      // Tenant B's data must NEVER be returned
      expect(result.result).toBeUndefined()
    })

    it('successfully retrieves knowledge for authorizedClientId when no conflicting requestedClientId is sent', async () => {
      const result = await dispatchToolCall(
        'search_knowledge_base',
        {
          query: 'What are the consultation fees?',
        },
        {
          authorizedClientId: TENANT_A,
        }
      )

      expect(result.success).toBe(true)
      expect(result.result.found).toBe(true)
      expect(result.result.answer).toContain('Routine dental consultation is ₹500')
      expect(result.result.answer).not.toContain('₹85 Lakhs')
      expect(generateResponse).not.toHaveBeenCalled()
    })

    it('rejects cross-tenant access when customerContext contains a forged tenant in direct runtime dispatch', async () => {
      // When context is provided from runtime with authorizedClientId, a mismatched requestedClientId in rawArgs is blocked
      const result = await dispatchToolCall(
        'search_knowledge_base',
        {
          query: 'What are the apartment prices?',
          customerContext: { clientId: TENANT_B },
          clientId: TENANT_B,
        },
        {
          authorizedClientId: TENANT_A,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Security Violation')
    })

    it('fails closed and rejects caller when requestedClientId is provided without authorizedClientId', async () => {
      const result = await dispatchToolCall('search_knowledge_base', {
        clientId: TENANT_B,
        query: 'What are the pricing details?',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Security Violation')
      expect(result.error).toContain('Unauthorized tenant search request')
      expect(result.result).toBeUndefined()
    })
  })

  // ─── 5. Runtime Boundary Defense: Stripping Model Args ──────────────────────
  describe('5. Agent Runtime Boundary Defense', () => {
    it('strips model-emitted clientId and enforces server-derived customerContext.clientId', async () => {
      // Simulate Gemini emitting a tool call attempting cross-tenant injection
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Let me look that up for you.',
        functionCalls: [
          {
            name: 'search_knowledge_base',
            args: {
              query: 'apartment prices',
              clientId: TENANT_B, // Model attempting to inject Tenant B
              client_id: TENANT_B,
              tenantId: TENANT_B,
              authorizedClientId: TENANT_B,
            },
          },
        ],
        rawResponse: {},
      })

      // Turn 2: Assistant final message
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'The clinic fees are ₹500.',
        functionCalls: [],
        rawResponse: {},
      })

      const turnResult = await runAgentTurn({
        employeeSlug: 'clinic-receptionist',
        message: 'What are the prices?',
        customerContext: {
          clientId: TENANT_A, // Legitimate server tenant
        },
      })

      expect(turnResult.executedTools.length).toBe(1)
      const executed = turnResult.executedTools[0]
      expect(executed.success).toBe(true)
      // Because runtime stripped the model args and passed authorizedClientId: TENANT_A,
      // the search ran against TENANT_A and NOT TENANT_B
      expect(executed.result.answer).not.toContain('₹85 Lakhs')
    })

    it('prevents unscoped runtime caller from querying arbitrary tenant when customerContext.clientId is missing', async () => {
      // Simulate Gemini emitting a tool call with clientId when server customerContext has NO clientId
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Searching...',
        functionCalls: [
          {
            name: 'search_knowledge_base',
            args: {
              query: 'apartment prices',
              clientId: TENANT_B,
            },
          },
        ],
        rawResponse: {},
      })

      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Done.',
        functionCalls: [],
        rawResponse: {},
      })

      // Unscoped caller (e.g. demo mode)
      const turnResult = await runAgentTurn({
        employeeSlug: 'clinic-receptionist',
        message: 'What are the prices?',
        customerContext: {}, // No clientId
      })

      expect(turnResult.executedTools.length).toBe(1)
      const executed = turnResult.executedTools[0]
      // Should hit unscoped/legacy branch without leaking Tenant B's verified items
      expect(executed.result.verifiedItems).toBeUndefined()
    })
  })

  // ─── 6. RAG Search API Route (BOLA / IDOR Defense) ──────────────────────────
  describe('6. RAG Search API Route (/api/rag-search) Security', () => {
    it('returns 401 Unauthorized when unauthenticated caller requests search', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No session') })

      const req = new NextRequest('http://localhost:3000/api/rag-search', {
        method: 'POST',
        body: JSON.stringify({ query: 'pricing' }),
        headers: { 'content-type': 'application/json' },
      })

      const res = await ragSearchPost(req)
      const data = await res.json()

      expect(res.status).toBe(401)
      expect(data.error).toContain('Unauthorized')
    })

    it('returns 403 Forbidden when authenticated non-admin user queries another tenant (BOLA defense)', async () => {
      // User is logged in as operator for TENANT_A
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: TENANT_A,
            email: 'operator@apex.com',
            user_metadata: { role: 'operator' },
          },
        },
        error: null,
      })

      const req = new NextRequest('http://localhost:3000/api/rag-search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'What are your apartment prices and token amounts?',
          clientId: TENANT_B, // Cross-tenant request!
        }),
        headers: { 'content-type': 'application/json' },
      })

      const res = await ragSearchPost(req)
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.errorCode).toBe('FORBIDDEN_CROSS_TENANT')
      expect(data.error).toContain('Forbidden')
    })

    it('allows authenticated non-admin user to query their own tenant knowledge', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: TENANT_A,
            email: 'operator@apex.com',
            user_metadata: { role: 'operator' },
          },
        },
        error: null,
      })

      const req = new NextRequest('http://localhost:3000/api/rag-search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'What are the consultation fees?',
          clientId: TENANT_A, // Self-tenant request
        }),
        headers: { 'content-type': 'application/json' },
      })

      const res = await ragSearchPost(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.found).toBe(true)
      expect(data.answer).toContain('Routine dental consultation is ₹500')
    })

    it('allows Admin operator to query tenant knowledge', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'admin-user-001',
            email: 'admin@grovaitech.com',
            user_metadata: { role: 'Admin' },
          },
        },
        error: null,
      })

      const req = new NextRequest('http://localhost:3000/api/rag-search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'apartment price ranges',
          clientId: TENANT_B,
        }),
        headers: { 'content-type': 'application/json' },
      })

      const res = await ragSearchPost(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.found).toBe(true)
      expect(data.answer).toContain('₹85 Lakhs')
    })
  })

  // ─── 7. CRUD Knowledge Helpers Scoping ──────────────────────────────────────
  describe('7. Knowledge Management Scoping & Validation', () => {
    it('rejects upsert with malformed clientId', async () => {
      await expect(
        upsertClientKnowledgeItem(
          {
            client_id: 'bad id with spaces',
            question_or_topic: 'Topic',
            verified_content: 'Content',
          },
          mockSupabase
        )
      ).rejects.toThrow('Valid client_id is required')
    })

    it('returns empty array when listing items with malformed clientId', async () => {
      const items = await listClientKnowledge('bad/id/injection', undefined, mockSupabase)
      expect(items).toEqual([])
    })

    it('returns false when deleting item with malformed clientId', async () => {
      const deleted = await deleteClientKnowledgeItem('k-1', 'bad id', mockSupabase)
      expect(deleted).toBe(false)
    })
  })
})
