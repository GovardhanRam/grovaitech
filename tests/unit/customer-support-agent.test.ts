import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCanonicalEmployeeBySlug,
  CANONICAL_EMPLOYEES,
} from '@/lib/employees'
import { resolveAuthorizedTools, runAgentTurn } from '@/lib/ai/runtime'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import {
  executeSupportEscalationWorkflow,
  getEscalationCustomerMessage,
} from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn().mockResolvedValue('Based on company docs, our standard response time is 2 hours.'),
}))

describe('Customer Support Agent Vertical Slice & wf-003 Escalation', () => {
  let mockSupabase: any
  let mockGenerateContentWithTools: any
  let mockGenerateText: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockResolvedValue({
            data: [
              { name: 'support_policy.pdf' },
              { name: 'refund_guidelines.docx' },
            ],
            error: null,
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: { id: 'rec-1' }, error: null }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-1' } }, error: null }),
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

  it('1. verifies customer-support-agent is live and has correct tools bound in registry', () => {
    const emp = getCanonicalEmployeeBySlug('customer-support-agent')
    expect(emp).toBeDefined()
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['search_knowledge_base', 'escalate_to_human'])
    expect(emp?.system_prompt).toContain('Tier-1 Customer Support Specialist')
  })

  it('2. enforces tool authorization boundaries for customer-support-agent', () => {
    const tools = resolveAuthorizedTools('customer-support-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).toContain('search_knowledge_base')
    expect(toolNames).toContain('escalate_to_human')
    expect(toolNames).not.toContain('create_lead')
    expect(toolNames).not.toContain('schedule_site_visit')
    expect(toolNames).not.toContain('book_clinic_appointment')
  })

  it('3. executes search_knowledge_base via tool dispatcher', async () => {
    const result = await dispatchToolCall('search_knowledge_base', {
      query: 'What is your response time policy?',
    })

    expect(result.success).toBe(true)
    expect(result.toolName).toBe('search_knowledge_base')
    expect(result.result.query).toBe('What is your response time policy?')
    expect(result.result.answer).toContain('Based on company docs')
  })

  it('4. rejects escalate_to_human when validation fails on short arguments', async () => {
    const result = await dispatchToolCall('escalate_to_human', {
      reason: 'a',
      summary: 'b',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Validation Error')
  })

  it('5. executes escalate_to_human and persists wf-003 execution record', async () => {
    const result = await dispatchToolCall('escalate_to_human', {
      customer_name: 'Rahul Sharma',
      reason: 'Billing Discrepancy',
      urgency: 'high',
      summary: 'Customer charged twice for monthly subscription renewal.',
      phone: '+919876500000',
    })

    expect(result.success).toBe(true)
    expect(result.result.escalated).toBe(true)
    expect(result.result.workflowId).toBe('wf-003')
    expect(result.result.workflowStatus).toBe('partial') // Steps s2 & s3 are simulated sandbox
    expect(result.result.message).toContain('Rahul Sharma, I have alerted our human support team')
    expect(result.result.steps).toHaveLength(3)

    // Verify Supabase persistence call
    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
  })

  it('6. generates truthful customer escalation message via getEscalationCustomerMessage', () => {
    const successMsg = getEscalationCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      { customerName: 'Deepa', reason: 'Order Cancellation' }
    )
    expect(successMsg).toContain('Deepa, I have alerted our human support team regarding "Order Cancellation"')

    const failedMsg = getEscalationCustomerMessage(
      { overallStatus: 'failed', customerConfirmationAllowed: false },
      { customerName: 'Deepa', reason: 'Order Cancellation' }
    )
    expect(failedMsg).toContain("I attempted to alert our human support team, but encountered a system issue")
  })

  it('7. executes complete multi-turn reasoning turn for customer-support-agent in runtime', async () => {
    // Turn 1: Model requests escalate_to_human tool call
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'escalate_to_human',
          args: {
            customer_name: 'Anjali',
            reason: 'Damaged shipment received',
            urgency: 'high',
            summary: 'Package arrived with broken seal and damaged item.',
          },
        },
      ],
    })

    // Turn 2: Model returns response text
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Anjali, I have alerted our human support team regarding "Damaged shipment received". An on-duty operator has received your conversation summary and will take over shortly.',
      functionCalls: [],
    })

    const turnRes = await runAgentTurn({
      employeeSlug: 'customer-support-agent',
      message: 'My package arrived broken and damaged!',
      customerContext: { name: 'Anjali' },
    })

    expect(turnRes.executedTools).toHaveLength(1)
    expect(turnRes.executedTools[0].toolName).toBe('escalate_to_human')
    expect(turnRes.replyText).toContain('alerted our human support team')
    expect(turnRes.iterations).toBe(2)
  })
})
