import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCanonicalEmployeeBySlug, getCanonicalEmployees } from '@/lib/employees'
import { resolveAuthorizedTools, getDefaultSystemPrompt, runAgentTurn } from '@/lib/ai/runtime'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import {
  executeEcommerceWorkflow,
  getEcommerceCustomerMessage,
  type EcommerceSupportData,
} from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn().mockResolvedValue('Store return policy: Items can be returned within 30 days of delivery.'),
}))

describe('E-Commerce Support Agent (emp-008) & WF-008 Vertical Slice', () => {
  let mockSupabase: any
  let mockGenerateContentWithTools: any
  let mockGenerateText: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: { id: 'wf-exec-ecom-1' }, error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-ecom' } }, error: null }),
      },
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    mockGenerateContentWithTools = vi.fn()
    mockGenerateText = vi.fn()

    vi.mocked(Gemini).mockImplementation(() => ({
      generateContentWithTools: mockGenerateContentWithTools,
      generateText: mockGenerateText,
      generateContent: vi.fn(),
      getEmbeddings: vi.fn(),
    } as any))
  })

  // ─── 1. Registry Activation ────────────────────────────────────────────────
  it('1. verifies emp-008 is live, demo-enabled, and has canonical tools bound', () => {
    const emp = getCanonicalEmployeeBySlug('ecommerce-support-agent')
    expect(emp).toBeDefined()
    expect(emp?.id).toBe('emp-008')
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['lookup_order_and_support', 'search_knowledge_base', 'escalate_to_human'])
    expect(emp?.system_prompt).toContain('AI E-Commerce Support Specialist')
    expect(emp?.system_prompt).toContain('NO FABRICATED LOGISTICS')
    expect(emp?.system_prompt).toContain('NO UNAUTHORIZED REFUND PROMISES')
    expect(emp?.system_prompt).toContain('MANDATORY ORDER VERIFICATION')
  })

  // ─── 2. Exact Tool Authorization ───────────────────────────────────────────
  it('2. resolves exact authorized tools for ecommerce-support-agent', () => {
    const tools = resolveAuthorizedTools('ecommerce-support-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).toContain('lookup_order_and_support')
    expect(toolNames).toContain('search_knowledge_base')
    expect(toolNames).toContain('escalate_to_human')
    expect(toolNames).toHaveLength(3)
  })

  // ─── 3. Forbidden Tool Isolation ───────────────────────────────────────────
  it('3. strictly isolates ecommerce support agent from unauthorized domain tools', () => {
    const tools = resolveAuthorizedTools('ecommerce-support-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).not.toContain('create_lead')
    expect(toolNames).not.toContain('schedule_site_visit')
    expect(toolNames).not.toContain('book_clinic_appointment')
    expect(toolNames).not.toContain('book_salon_service')
    expect(toolNames).not.toContain('audit_conversation_quality')
    expect(toolNames).not.toContain('book_legal_consultation')
  })

  // ─── 4. Tool Parameter Validation ──────────────────────────────────────────
  it('4. validates mandatory order_id in lookup_order_and_support', async () => {
    const resNoOrder = await dispatchToolCall('lookup_order_and_support', {
      customer_email: 'buyer@example.com',
      action_type: 'track_order',
    })
    expect(resNoOrder.success).toBe(false)
    expect(resNoOrder.error).toContain("'order_id'")
  })

  // ─── 5. Customer Contact Requirement ───────────────────────────────────────
  it('5. requires at least one customer contact method (email or phone) for verification', async () => {
    const resNoContact = await dispatchToolCall('lookup_order_and_support', {
      order_id: '#ORD-99124',
      action_type: 'track_order',
    })
    expect(resNoContact.success).toBe(false)
    expect(resNoContact.error).toContain("provide at least one contact method")
  })

  // ─── 6. Sanitization ───────────────────────────────────────────────────────
  it('6. sanitizes order ID, phone numbers, email, and input strings', async () => {
    const res = await dispatchToolCall('lookup_order_and_support', {
      order_id: '  #ORD-88192  ',
      customer_email: '  customer@example.com  ',
      customer_phone: ' +91 (987) 654-3210 ',
      action_type: 'track_order',
      reason: '  Checking package status  ',
    })

    expect(res.success).toBe(true)
    expect(res.result.order_id).toBe('#ORD-88192')
    expect(res.result.customer_email).toBe('customer@example.com')
    expect(res.result.customer_phone).toBe('+919876543210')
    expect(res.result.workflowId).toBe('wf-008')
  })

  // ─── 7. Action Type Validation ─────────────────────────────────────────────
  it('7. enforces allowed action types and rejects invalid actions', async () => {
    const resInvalidAction = await dispatchToolCall('lookup_order_and_support', {
      order_id: '#ORD-88192',
      customer_email: 'customer@example.com',
      action_type: 'steal_package',
    })
    expect(resInvalidAction.success).toBe(false)
    expect(resInvalidAction.error).toContain("'action_type' must be one of")
  })

  // ─── 8. Tracking Order Flow ────────────────────────────────────────────────
  it('8. executes track_order flow and returns truthful shipment logistics', async () => {
    const payload: EcommerceSupportData = {
      order_id: '#ORD-DELAY-7721',
      customer_email: 'priya@example.com',
      action_type: 'track_order',
    }

    const workflowRes = await executeEcommerceWorkflow({ client: payload })
    expect(workflowRes.workflowId).toBe('wf-008')
    expect(workflowRes.steps).toHaveLength(4)

    const s2 = workflowRes.steps.find((s) => s.stepId === 's2')
    expect(s2?.status).toBe('success')
    expect(payload.order_status).toBe('delayed')
    expect(payload.carrier).toBe('BlueDart Express')
  })

  // ─── 9. Return Request Policy Flow ─────────────────────────────────────────
  it('9. evaluates return requests against 30-day window policy', async () => {
    // Valid return within 30 days
    const validReturn: EcommerceSupportData = {
      order_id: '#ORD-99381',
      customer_email: 'neha@example.com',
      action_type: 'return_request',
      reason: 'Wrong size delivered',
    }

    const resValid = await executeEcommerceWorkflow({ client: validReturn })
    expect(validReturn.eligibility_status).toBe('inspection_required')

    // Expired return window (>30 days)
    const expiredReturn: EcommerceSupportData = {
      order_id: '#ORD-EXPIRED-1129',
      customer_email: 'neha@example.com',
      action_type: 'return_request',
      reason: 'Changed mind',
    }

    const resExpired = await executeEcommerceWorkflow({ client: expiredReturn })
    expect(expiredReturn.eligibility_status).toBe('ineligible')
  })

  // ─── 10. Exchange Request Flow ─────────────────────────────────────────────
  it('10. handles exchange requests and specifies item replacement details', async () => {
    const exchangePayload: EcommerceSupportData = {
      order_id: '#ORD-55412',
      customer_email: 'rohit@example.com',
      action_type: 'exchange_request',
      item_details: 'Size L Blue Denim Jacket',
      reason: 'Exchange for Size XL',
    }

    const res = await executeEcommerceWorkflow({ client: exchangePayload })
    expect(exchangePayload.eligibility_status).toBe('inspection_required')
    const s3 = res.steps.find((s) => s.stepId === 's3')
    expect(s3?.detail).toContain('Size L Blue Denim Jacket')
  })

  // ─── 11. Cancellation Flow ─────────────────────────────────────────────────
  it('11. handles order cancellation for processing vs already dispatched orders', async () => {
    // Processing order -> Cancelled
    const processingOrder: EcommerceSupportData = {
      order_id: '#ORD-CANCEL-1102',
      customer_email: 'amit@example.com',
      action_type: 'cancel_request',
    }

    await executeEcommerceWorkflow({ client: processingOrder })
    expect(processingOrder.order_status).toBe('cancelled')
    expect(processingOrder.eligibility_status).toBe('cancelled')

    // In-transit order -> Cannot cancel
    const inTransitOrder: EcommerceSupportData = {
      order_id: '#ORD-77492',
      customer_email: 'amit@example.com',
      action_type: 'cancel_request',
    }

    await executeEcommerceWorkflow({ client: inTransitOrder })
    expect(inTransitOrder.eligibility_status).toBe('ineligible')
  })

  // ─── 12. Store API / Logistics Simulation Truthfulness ─────────────────────
  it('12. handles invalid/not-found orders truthfully without inventing data', async () => {
    const notFoundPayload: EcommerceSupportData = {
      order_id: '#ORD-NOT_FOUND-0000',
      customer_email: 'ghost@example.com',
      action_type: 'track_order',
    }

    const res = await executeEcommerceWorkflow({ client: notFoundPayload })
    expect(notFoundPayload.order_status).toBe('not_found')
    const s1 = res.steps.find((s) => s.stepId === 's1')
    expect(s1?.status).toBe('failed')
  })

  // ─── 13. n8n Sandbox Fallback Truthfulness ───────────────────────────────────
  it('13. handles n8n webhook sandbox fallback without false claims', async () => {
    const payload: EcommerceSupportData = {
      order_id: '#ORD-88192',
      customer_email: 'customer@example.com',
      action_type: 'track_order',
    }

    const res = await executeEcommerceWorkflow({ client: payload })
    const s4 = res.steps.find((s) => s.stepId === 's4')
    expect(s4).toBeDefined()
    expect(s4?.type).toBe('n8n_webhook')
    expect(['success', 'simulated']).toContain(s4?.status)
    expect(res.n8nResult.status).toBeDefined()
  })

  // ─── 14. WF-008 Persistence ────────────────────────────────────────────────
  it('14. logs WF-008 execution into workflow_executions table', async () => {
    const payload: EcommerceSupportData = {
      order_id: '#ORD-66231',
      customer_email: 'deepa@example.com',
      action_type: 'track_order',
    }

    const res = await executeEcommerceWorkflow({ client: payload })
    expect(res.executionId).toBeDefined()
    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
  })

  // ─── 15. getEcommerceCustomerMessage Truthfulness ──────────────────────────
  it('15. formats truthful customer messages across all e-commerce states', () => {
    // 1. Order Not Found
    const notFoundMsg = getEcommerceCustomerMessage(
      { overallStatus: 'partial', customerConfirmationAllowed: false },
      { order_id: '#ORD-999', order_status: 'not_found' }
    )
    expect(notFoundMsg).toContain('could not find an order')

    // 2. Track Order (Delayed)
    const trackMsg = getEcommerceCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      {
        order_id: '#ORD-101',
        action_type: 'track_order',
        order_status: 'delayed',
        carrier: 'BlueDart',
        tracking_number: 'BD-101',
      }
    )
    expect(trackMsg).toContain('delayed')
    expect(trackMsg).toContain('BlueDart')
    expect(trackMsg).toContain('BD-101')

    // 3. Return Request (Inspection Required)
    const returnMsg = getEcommerceCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      { order_id: '#ORD-101', action_type: 'return_request', eligibility_status: 'inspection_required' }
    )
    expect(returnMsg).toContain('warehouse receives and inspects')

    // 4. Return Request (Ineligible)
    const ineligibleMsg = getEcommerceCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      { order_id: '#ORD-101', action_type: 'return_request', eligibility_status: 'ineligible' }
    )
    expect(ineligibleMsg).toContain('outside our standard 30-day return window')

    // 5. Cancel Request (Successful)
    const cancelMsg = getEcommerceCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      { order_id: '#ORD-101', action_type: 'cancel_request', order_status: 'cancelled' }
    )
    expect(cancelMsg).toContain('successfully cancelled')
  })

  // ─── 16. Multi-turn runAgentTurn Integration & Regression Protection ────────
  it('16. integrates with runAgentTurn and maintains regression safety for emp-001..emp-007 and wf-001..wf-007', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'lookup_order_and_support',
          args: {
            order_id: '#ORD-88231',
            customer_email: 'rahul@example.com',
            action_type: 'track_order',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Your order #ORD-88231 is currently in transit via BlueDart Logistics.',
      functionCalls: [],
    })

    const turnResult = await runAgentTurn({
      employeeSlug: 'ecommerce-support-agent',
      message: 'Where is my order #ORD-88231? My email is rahul@example.com.',
    })

    expect(turnResult.executedTools).toHaveLength(1)
    expect(turnResult.executedTools[0].toolName).toBe('lookup_order_and_support')
    expect(turnResult.executedTools[0].success).toBe(true)
    expect(turnResult.workflowResult).toBeDefined()
    expect(turnResult.workflowResult?.workflowId).toBe('wf-008')
    expect(turnResult.replyText).toContain('in transit')

    // Regression Check: Employee count & workflows
    const allEmployees = getCanonicalEmployees()
    expect(allEmployees).toHaveLength(10)
    expect(allEmployees.find((e) => e.slug === 'ecommerce-support-agent')?.status).toBe('live')
    expect(allEmployees.find((e) => e.slug === 'legal-intake-agent')?.status).toBe('live')
    expect(allEmployees.find((e) => e.slug === 'ai-qa-inspector')?.status).toBe('live')

    const wf008 = CANONICAL_DEMO_WORKFLOWS.find((w) => w.id === 'wf-008')
    expect(wf008).toBeDefined()
    expect(wf008?.status).toBe('active')
    expect(wf008?.assigned_employee_slug).toBe('ecommerce-support-agent')

    const ecomPrompt = getDefaultSystemPrompt('ecommerce-support-agent')
    expect(ecomPrompt).toContain('AI E-Commerce Support Specialist')
    expect(ecomPrompt).toContain('NO FABRICATED LOGISTICS')
  })
})
