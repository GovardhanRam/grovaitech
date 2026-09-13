/**
 * Grovaitech AI Platform
 * tests/unit/gbp-ui-demo.test.ts
 *
 * Dedicated UI/Demo Integration Test for GBP Growth & Reputation Manager (emp-012):
 * - Employee resolution via getEmployeeBySlug and getEmployeeById
 * - Tool authorization resolution via resolveAuthorizedTools
 * - Public marketplace catalog integration
 * - Web chat ingress and runtime contract
 * - Sandbox execution guarantees (isDraft, published, isSimulated)
 */

import { describe, it, expect } from 'vitest'
import {
  getEmployeeBySlug,
  getEmployeeById,
  getEmployees,
  getAllEmployees,
  getCanonicalEmployees,
} from '@/lib/employees'
import {
  resolveAuthorizedTools,
  getDefaultSystemPrompt,
  runAgentTurn,
} from '@/lib/ai/runtime'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { TOOL_NAMES } from '@/lib/ai/tools'

describe('GBP AI Employee UI & Demo Integration (emp-012)', () => {
  // ─── 1. Employee Resolution ────────────────────────────────────────────────
  describe('1. Employee Resolution', () => {
    it('resolves gbp-growth-manager by slug with verified metadata', async () => {
      const employee = await getEmployeeBySlug('gbp-growth-manager')
      expect(employee).toBeDefined()
      expect(employee).not.toBeNull()
      expect(employee?.id).toBe('emp-012')
      expect(employee?.slug).toBe('gbp-growth-manager')
      expect(employee?.name).toBe('GBP Growth & Reputation Manager')
      expect(employee?.status).toBe('live')
      expect(employee?.demo_config?.enabled).toBe(true)
    })

    it('resolves emp-012 by unique ID', async () => {
      const employee = await getEmployeeById('emp-012')
      expect(employee).toBeDefined()
      expect(employee).not.toBeNull()
      expect(employee?.id).toBe('emp-012')
      expect(employee?.slug).toBe('gbp-growth-manager')
    })
  })

  // ─── 2. Tool Authorization ────────────────────────────────────────────────
  describe('2. Tool Authorization', () => {
    it('resolves exact authorized tools registered for gbp-growth-manager', () => {
      const tools = resolveAuthorizedTools('gbp-growth-manager')
      const toolNames = tools.map((t) => t.name)

      expect(toolNames).toContain('audit_gbp_profile')
      expect(toolNames).toContain('draft_review_reply')
      expect(toolNames).toContain('create_gbp_post')
      expect(toolNames).toContain('search_knowledge_base')
      expect(toolNames).toHaveLength(4)
    })

    it('resolves canonical system prompt containing GBP operational guidance', () => {
      const prompt = getDefaultSystemPrompt('gbp-growth-manager')
      expect(prompt).toContain('Google Business Profile Growth & Reputation Manager')
      expect(prompt).toContain('Profile Auditing & Visibility')
      expect(prompt).toContain('Review & Reputation Management')
      expect(prompt).toContain('Local Post Drafting')
      expect(prompt).toContain('NO FALSE MODIFICATION CLAIMS')
    })
  })

  // ─── 3. Public Employee Catalog ───────────────────────────────────────────
  describe('3. Public Employee Catalog (/ai-employees)', () => {
    it('includes gbp-growth-manager in the public employee marketplace collection', async () => {
      const allEmployees = await getAllEmployees()
      const canonicalEmployees = getCanonicalEmployees()

      expect(allEmployees.length).toBeGreaterThanOrEqual(12)
      expect(canonicalEmployees.length).toBeGreaterThanOrEqual(12)

      const gbpMarketplaceItem = allEmployees.find(
        (e) => e.slug === 'gbp-growth-manager'
      )
      expect(gbpMarketplaceItem).toBeDefined()
      expect(gbpMarketplaceItem?.id).toBe('emp-012')
      expect(gbpMarketplaceItem?.status).toBe('live')
      expect(gbpMarketplaceItem?.demo_config?.enabled).toBe(true)
    })
  })

  // ─── 4. Chat Ingress & Runtime Contract ──────────────────────────────────
  describe('4. Chat Ingress & Runtime Contract', () => {
    it('accepts gbp-growth-manager employeeSlug and resolves system prompt and tools', async () => {
      const prompt = getDefaultSystemPrompt('gbp-growth-manager')
      const tools = resolveAuthorizedTools('gbp-growth-manager')

      expect(prompt).toBeDefined()
      expect(prompt.length).toBeGreaterThan(100)
      expect(tools.length).toBe(4)
      expect(tools.map((t) => t.name)).toEqual([
        'audit_gbp_profile',
        'draft_review_reply',
        'create_gbp_post',
        'search_knowledge_base',
      ])
    })

    it('dispatches GBP tool call directly through the tool execution contract', async () => {
      const auditRes = await dispatchToolCall(
        TOOL_NAMES.AUDIT_GBP_PROFILE,
        {
          business_name: 'Salem Dental Care',
          category: 'Dental Clinic',
        },
        { executionMode: 'sandbox' }
      )

      expect(auditRes.success).toBe(true)
      expect(auditRes.toolName).toBe('audit_gbp_profile')
      expect(auditRes.result.business_name).toBe('Salem Dental Care')
      expect(auditRes.result.completeness_score).toBe(45)
    })
  })

  // ─── 5. Sandbox Guarantee ─────────────────────────────────────────────────
  describe('5. Sandbox Guarantee', () => {
    it('verifies audit_gbp_profile operates as a draft/simulation with explicit disclaimer', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.AUDIT_GBP_PROFILE, {
        business_name: 'Grovaitech Tech Hub',
      })

      expect(res.success).toBe(true)
      expect(res.result.isSimulated).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.disclaimer).toContain('SANDBOX AUDIT DEMO')
      expect(res.result.disclaimer).toContain('No live Google Business Profile API calls or account modifications were executed.')
    })

    it('verifies draft_review_reply produces draft-only responses without live publishing', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.DRAFT_REVIEW_REPLY, {
        business_name: 'Grovaitech Tech Hub',
        review_text: 'Great service and quick response time!',
        rating: 5,
      })

      expect(res.success).toBe(true)
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.disclaimer).toContain('SANDBOX DRAFT DEMO')
      expect(res.result.disclaimer).toContain('The response has NOT been published to Google Business Profile.')
    })

    it('verifies create_gbp_post produces draft-only local posts without live publishing', async () => {
      const res = await dispatchToolCall(TOOL_NAMES.CREATE_GBP_POST, {
        business_name: 'Grovaitech Tech Hub',
        post_topic: 'Weekend AI Employee Demo',
        offer_event_details: 'Try our new GBP Growth & Reputation Manager AI Employee.',
        call_to_action: 'learn_more',
      })

      expect(res.success).toBe(true)
      expect(res.result.isDraft).toBe(true)
      expect(res.result.published).toBe(false)
      expect(res.result.disclaimer).toContain('SANDBOX DRAFT DEMO')
      expect(res.result.disclaimer).toContain('The post has NOT been published to Google.')
    })
  })
})
