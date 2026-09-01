import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCanonicalEmployeeBySlug } from '@/lib/employees'
import { resolveAuthorizedTools, runAgentTurn } from '@/lib/ai/runtime'
import { dispatchToolCall, maskSensitiveCredentials } from '@/lib/ai/dispatcher'
import {
  executeQaWorkflow,
  getQaAuditCustomerMessage,
  type WorkflowExecutionAdapters,
} from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn().mockResolvedValue('QA Audit standard rubric: Score 0-100 based on Truthfulness and Compliance.'),
}))

describe('AI QA Inspector Vertical Slice & wf-005 Pipeline', () => {
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
              limit: vi.fn().mockResolvedValue({
                data: [
                  { role: 'user', content: 'Hello, what is your refund policy?', created_at: '2026-09-01T10:00:00Z' },
                  { role: 'assistant', content: 'We offer refunds within 30 days as verified in our policy document.', created_at: '2026-09-01T10:00:05Z' },
                ],
                error: null,
              }),
            }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          order: vi.fn().mockResolvedValue({
            data: [{ name: 'qa_compliance_rubric.pdf' }],
            error: null,
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: { id: 'wf-exec-qa-1' }, error: null }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-qa' } }, error: null }),
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

  it('1. verifies ai-qa-inspector is live and has correct tools bound in registry', () => {
    const emp = getCanonicalEmployeeBySlug('ai-qa-inspector')
    expect(emp).toBeDefined()
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['audit_conversation_quality', 'search_knowledge_base'])
    expect(emp?.system_prompt).toContain('AI Quality Assurance & Compliance Inspector')
  })

  it('2. enforces analytical tool authorization boundaries for ai-qa-inspector', () => {
    const tools = resolveAuthorizedTools('ai-qa-inspector')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).toContain('audit_conversation_quality')
    expect(toolNames).toContain('search_knowledge_base')
    expect(toolNames).not.toContain('create_lead')
    expect(toolNames).not.toContain('schedule_site_visit')
    expect(toolNames).not.toContain('book_clinic_appointment')
    expect(toolNames).not.toContain('book_salon_service')
    expect(toolNames).not.toContain('escalate_to_human')
  })

  it('3. sanitizes and masks sensitive credentials in transcripts', () => {
    const raw = 'Client called with token bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.do_not_share and API key sk-proj99238478394872938472 and password="SuperSecretPassword123!"'
    const masked = maskSensitiveCredentials(raw)

    expect(masked).not.toContain('sk-proj99238478394872938472')
    expect(masked).not.toContain('SuperSecretPassword123!')
    expect(masked).toContain('[REDACTED_API_KEY]')
    expect(masked).toContain('Bearer [REDACTED_TOKEN]')
    expect(masked).toContain('password=[REDACTED_PASSWORD]')
  })

  it('4. rejects audit_conversation_quality when neither transcript nor chat_id is provided', async () => {
    const result = await dispatchToolCall('audit_conversation_quality', {
      rubric: 'compliance',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Validation Error')
  })

  it('5. executes audit_conversation_quality with transcript and dispatches wf-005', async () => {
    const sampleTranscript = `
USER: Hi, do you guarantee a 100% profit on real estate investments?
ASSISTANT: Yes, we guarantee 100% profit within 3 months! Also, shut up if you don't believe me.
`
    const result = await dispatchToolCall('audit_conversation_quality', {
      transcript: sampleTranscript,
      rubric: 'compliance',
    })

    expect(result.success).toBe(true)
    expect(result.toolName).toBe('audit_conversation_quality')
    expect(result.result.workflowId).toBe('wf-005')
    expect(result.result.overallScore).toBeLessThan(70) // Flagged due to ungrounded claims & tone
    expect(result.result.passed).toBe(false)
    expect(result.result.violations.length).toBeGreaterThanOrEqual(2)
    expect(result.result.message).toContain('QA Interaction Audit Report')
    expect(result.result.steps).toHaveLength(4)

    // Verify Supabase persistence call
    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
  })

  it('6. executes executeQaWorkflow with live adapters returning success', async () => {
    const liveAdapters: WorkflowExecutionAdapters = {
      dispatchWhatsAppTemplate: async () => ({ status: 'success', detail: 'Executive notification email dispatched.' }),
    }

    const wfRes = await executeQaWorkflow({
      auditId: 'qa-audit-101',
      audit: {
        transcript: 'USER: How do I change my clinic appointment?\nASSISTANT: I can help you reschedule your dental slot.',
        rubric: 'standard',
        overallScore: 92,
        passed: true,
        rubricBreakdown: { truthfulness: 25, helpfulness: 25, compliance: 22, safety: 20 },
        strengths: ['Accurate appointment handling'],
        violations: [],
        recommendations: ['Keep up prompt communication'],
        summary: 'Excellent interaction resolution.',
      },
      adapters: liveAdapters,
    })

    expect(wfRes.workflowId).toBe('wf-005')
    expect(wfRes.workflowName).toBe('AI QA Interaction Audit & Quality Scoring')
    expect(wfRes.steps).toHaveLength(4)
    expect(wfRes.steps[0].stepId).toBe('s1')
    expect(wfRes.steps[0].status).toBe('success')
    expect(wfRes.steps[1].stepId).toBe('s2')
    expect(wfRes.steps[1].status).toBe('success')
    expect(wfRes.steps[2].stepId).toBe('s3')
    expect(wfRes.steps[2].status).toBe('success')
    expect(wfRes.customerConfirmationAllowed).toBe(true)
  })

  it('7. generates truthful audit message via getQaAuditCustomerMessage', () => {
    const reportMsg = getQaAuditCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      {
        overallScore: 88,
        passed: true,
        rubricBreakdown: { truthfulness: 23, helpfulness: 22, compliance: 23, safety: 20 },
        strengths: ['Factual responses grounded in knowledge base'],
        violations: ['Minor delay in initial greeting'],
        recommendations: ['Maintain current compliance level'],
        summary: 'Interaction met enterprise standards.',
      }
    )

    expect(reportMsg).toContain('QA Interaction Audit Report')
    expect(reportMsg).toContain('88/100')
    expect(reportMsg).toContain('Truthfulness: 23/25')
    expect(reportMsg).toContain('Factual responses grounded')
  })

  it('8. executes complete multi-turn reasoning turn for ai-qa-inspector in runtime', async () => {
    // Turn 1: Model invokes audit_conversation_quality tool
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'audit_conversation_quality',
          args: {
            transcript: 'USER: Can I book a haircut?\nASSISTANT: Yes, what date and time would you like?',
            rubric: 'hospitality',
          },
        },
      ],
    })

    // Turn 2: Model returns structured audit text
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: '### QA Interaction Audit Report (✅ PASSED)\n**Overall Quality Score:** 92/100 (Compliant)\n**Rubric Breakdown:** Truthfulness: 25/25 | Helpfulness: 25/25 | Compliance: 22/25 | Safety: 20/25\n**Executive Summary:** Interaction passed quality rubric scoring 92/100.',
      functionCalls: [],
    })

    const turnRes = await runAgentTurn({
      employeeSlug: 'ai-qa-inspector',
      message: 'Please audit this salon conversation snippet: USER: Can I book a haircut? ASSISTANT: Yes, what date and time would you like?',
    })

    expect(turnRes.executedTools).toHaveLength(1)
    expect(turnRes.executedTools[0].toolName).toBe('audit_conversation_quality')
    expect(turnRes.replyText).toContain('QA Interaction Audit Report')
    expect(turnRes.iterations).toBe(2)
  })
})
