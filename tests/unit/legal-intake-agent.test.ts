import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCanonicalEmployeeBySlug, getCanonicalEmployees } from '@/lib/employees'
import { resolveAuthorizedTools, getDefaultSystemPrompt, runAgentTurn } from '@/lib/ai/runtime'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import {
  executeLegalWorkflow,
  getLegalCustomerMessage,
  type LegalIntakeData,
  type WorkflowExecutionAdapters,
} from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn().mockResolvedValue('Legal FAQ standard response: Consultations are preliminary.'),
}))

describe('Legal Intake Agent (emp-007) & WF-006 Vertical Slice', () => {
  let mockSupabase: any
  let mockGenerateContentWithTools: any
  let mockGenerateText: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: { id: 'wf-exec-legal-1' }, error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-legal' } }, error: null }),
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
  it('1. verifies emp-007 is live, demo-enabled, and has canonical tools bound', () => {
    const emp = getCanonicalEmployeeBySlug('legal-intake-agent')
    expect(emp).toBeDefined()
    expect(emp?.id).toBe('emp-007')
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['book_legal_consultation', 'search_knowledge_base', 'escalate_to_human'])
    expect(emp?.system_prompt).toContain('AI Legal Intake & Consultation Coordinator')
    expect(emp?.system_prompt).toContain('NO LEGAL ADVICE')
    expect(emp?.system_prompt).toContain('NO CASE-OUTCOME PREDICTIONS')
    expect(emp?.system_prompt).toContain('NO PRIVILEGE CREATION')
    expect(emp?.system_prompt).toContain('CONFLICT SCREENING PROTOCOL')
  })

  // ─── 2. Exact Tool Authorization ───────────────────────────────────────────
  it('2. resolves exact authorized tools for legal-intake-agent', () => {
    const tools = resolveAuthorizedTools('legal-intake-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).toContain('book_legal_consultation')
    expect(toolNames).toContain('search_knowledge_base')
    expect(toolNames).toContain('escalate_to_human')
    expect(toolNames).toHaveLength(3)
  })

  // ─── 3. Forbidden Tool Isolation ───────────────────────────────────────────
  it('3. strictly isolates legal intake agent from unauthorized domain tools', () => {
    const tools = resolveAuthorizedTools('legal-intake-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).not.toContain('create_lead')
    expect(toolNames).not.toContain('schedule_site_visit')
    expect(toolNames).not.toContain('book_clinic_appointment')
    expect(toolNames).not.toContain('book_salon_service')
    expect(toolNames).not.toContain('audit_conversation_quality')
  })

  // ─── 4. Tool Parameter Validation ──────────────────────────────────────────
  it('4. validates mandatory parameters in book_legal_consultation', async () => {
    // Missing client_name
    const resNoName = await dispatchToolCall('book_legal_consultation', {
      client_phone: '+919876543210',
      client_email: 'advocate@example.com',
      practice_area: 'corporate',
      matter_summary: 'Contract dispute',
      opposing_party: 'XYZ Ltd',
      urgency: 'routine',
      preferred_date: '2026-09-10',
      preferred_time: '11:00 AM',
    })
    expect(resNoName.success).toBe(false)
    expect(resNoName.error).toContain("'client_name' is required")

    // Missing client_phone
    const resNoPhone = await dispatchToolCall('book_legal_consultation', {
      client_name: 'Anand Varma',
      client_email: 'anand@example.com',
      practice_area: 'corporate',
      matter_summary: 'Contract dispute',
      opposing_party: 'XYZ Ltd',
      urgency: 'routine',
      preferred_date: '2026-09-10',
      preferred_time: '11:00 AM',
    })
    expect(resNoPhone.success).toBe(false)
    expect(resNoPhone.error).toContain("'client_phone' is required")

    // Missing client_email
    const resNoEmail = await dispatchToolCall('book_legal_consultation', {
      client_name: 'Anand Varma',
      client_phone: '+919876543210',
      practice_area: 'corporate',
      matter_summary: 'Contract dispute',
      opposing_party: 'XYZ Ltd',
      urgency: 'routine',
      preferred_date: '2026-09-10',
      preferred_time: '11:00 AM',
    })
    expect(resNoEmail.success).toBe(false)
    expect(resNoEmail.error).toContain("'client_email' is required")

    // Missing matter_summary
    const resNoSummary = await dispatchToolCall('book_legal_consultation', {
      client_name: 'Anand Varma',
      client_phone: '+919876543210',
      client_email: 'anand@example.com',
      practice_area: 'corporate',
      opposing_party: 'XYZ Ltd',
      urgency: 'routine',
      preferred_date: '2026-09-10',
      preferred_time: '11:00 AM',
    })
    expect(resNoSummary.success).toBe(false)
    expect(resNoSummary.error).toContain("'matter_summary' is required")
  })

  // ─── 5. Contact Sanitization ───────────────────────────────────────────────
  it('5. sanitizes contact data and strings properly', async () => {
    const res = await dispatchToolCall('book_legal_consultation', {
      client_name: '   Vikram Seth   ',
      client_phone: ' +91 (987) 654-3210 ',
      client_email: '  vikram.seth@example.com  ',
      practice_area: 'litigation',
      matter_summary: '  Commercial dispute regarding lease breach  ',
      opposing_party: '  Delta Properties  ',
      urgency: 'urgent',
      preferred_date: ' 2026-09-08 ',
      preferred_time: ' 2:00 PM ',
    })

    expect(res.success).toBe(true)
    expect(res.result.client_name).toBe('Vikram Seth')
    expect(res.result.client_phone).toBe('+919876543210')
    expect(res.result.client_email).toBe('vikram.seth@example.com')
    expect(res.result.opposing_party).toBe('Delta Properties')
    expect(res.result.workflowId).toBe('wf-006')
  })

  // ─── 6. Practice-Area & Urgency Validation ─────────────────────────────────
  it('6. enforces allowed practice areas and urgency levels', async () => {
    // Invalid practice area
    const resInvalidArea = await dispatchToolCall('book_legal_consultation', {
      client_name: 'Pooja Hegde',
      client_phone: '+919876543210',
      client_email: 'pooja@example.com',
      practice_area: 'astrology_law',
      matter_summary: 'Inquiry',
      opposing_party: 'None',
      urgency: 'routine',
      preferred_date: '2026-09-12',
      preferred_time: '10:00 AM',
    })
    expect(resInvalidArea.success).toBe(false)
    expect(resInvalidArea.error).toContain("'practice_area' must be one of")

    // Invalid urgency
    const resInvalidUrgency = await dispatchToolCall('book_legal_consultation', {
      client_name: 'Pooja Hegde',
      client_phone: '+919876543210',
      client_email: 'pooja@example.com',
      practice_area: 'ip',
      matter_summary: 'Patent filing',
      opposing_party: 'None',
      urgency: 'super_extreme',
      preferred_date: '2026-09-12',
      preferred_time: '10:00 AM',
    })
    expect(resInvalidUrgency.success).toBe(false)
    expect(resInvalidUrgency.error).toContain("'urgency' must be one of")
  })

  // ─── 7. Conflict Screening Logic ───────────────────────────────────────────
  it('7. flags potential conflicts when adverse parties match screening rules', async () => {
    const payloadWithConflict: LegalIntakeData = {
      client_name: 'Rajesh Khanna',
      client_phone: '+919876543210',
      client_email: 'rajesh@example.com',
      practice_area: 'litigation',
      matter_summary: 'Dispute over joint venture agreement',
      opposing_party: 'Apex Industries Adverse Corp',
      urgency: 'critical',
      preferred_date: '2026-09-15',
      preferred_time: '3:00 PM',
    }

    const workflowRes = await executeLegalWorkflow({
      client: payloadWithConflict,
    })

    expect(workflowRes.workflowId).toBe('wf-006')
    const s2 = workflowRes.steps.find((s) => s.stepId === 's2')
    expect(s2).toBeDefined()
    expect(s2?.detail).toContain('Potential conflict identified')
    expect(workflowRes.customerConfirmationAllowed).toBe(false)
  })

  // ─── 8. Calendar Simulation Truthfulness ───────────────────────────────────
  it('8. marks calendar reservation simulated when unconfigured and disallows confirmed booking message', async () => {
    const payload: LegalIntakeData = {
      client_name: 'Kiran Bedi',
      client_phone: '+919876543210',
      client_email: 'kiran@example.com',
      practice_area: 'criminal',
      matter_summary: 'Defense advisory consultation',
      opposing_party: 'State Authority',
      urgency: 'routine',
      preferred_date: '2026-09-20',
      preferred_time: '11:30 AM',
    }

    const workflowRes = await executeLegalWorkflow({ client: payload })
    const s3 = workflowRes.steps.find((s) => s.stepId === 's3')

    expect(s3?.status).toBe('simulated')
    expect(s3?.detail).toContain('calendar reservation simulated')
    expect(workflowRes.customerConfirmationAllowed).toBe(false)

    // With live adapter
    const mockAdapters: WorkflowExecutionAdapters = {
      createCalendarEvent: vi.fn().mockResolvedValue({
        status: 'success',
        detail: 'Attorney calendar slot reserved on Google Calendar',
      }),
    }

    const liveWorkflowRes = await executeLegalWorkflow({
      client: { ...payload, opposing_party: 'None' },
      adapters: mockAdapters,
    })

    const liveS3 = liveWorkflowRes.steps.find((s) => s.stepId === 's3')
    expect(liveS3?.status).toBe('success')
  })

  // ─── 9. n8n Sandbox Fallback Truthfulness ───────────────────────────────────
  it('9. handles n8n webhook sandbox fallback truthfully without false claims', async () => {
    const payload: LegalIntakeData = {
      client_name: 'Sunil Gavaskar',
      client_phone: '+919876543210',
      client_email: 'sunil@example.com',
      practice_area: 'employment',
      matter_summary: 'Employment contract review',
      opposing_party: 'Former Employer Corp',
      urgency: 'routine',
      preferred_date: '2026-09-22',
      preferred_time: '4:00 PM',
    }

    const res = await executeLegalWorkflow({ client: payload })
    const s4 = res.steps.find((s) => s.stepId === 's4')

    expect(s4).toBeDefined()
    expect(s4?.type).toBe('n8n_webhook')
    expect(['success', 'simulated']).toContain(s4?.status)
    expect(res.n8nResult.status).toBeDefined()
  })

  // ─── 10. WF-006 Execution Logging ──────────────────────────────────────────
  it('10. logs WF-006 executions into workflow_executions table', async () => {
    const payload: LegalIntakeData = {
      client_name: 'Meera Nambiar',
      client_phone: '+919876543210',
      client_email: 'meera@example.com',
      practice_area: 'family',
      matter_summary: 'Custody arrangement inquiry',
      opposing_party: 'Spouse',
      urgency: 'routine',
      preferred_date: '2026-09-25',
      preferred_time: '10:00 AM',
    }

    const res = await executeLegalWorkflow({ client: payload })
    expect(res.executionId).toBeDefined()
    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
  })

  // ─── 11. getLegalCustomerMessage Truthfulness ──────────────────────────────
  it('11. formats truthful customer messages across all workflow states', () => {
    // 1. Failed workflow
    const failedMsg = getLegalCustomerMessage(
      { overallStatus: 'failed', customerConfirmationAllowed: false },
      { client_name: 'Harish' }
    )
    expect(failedMsg).toContain('automated processing encountered an issue')

    // 2. Potential conflict
    const conflictMsg = getLegalCustomerMessage(
      { overallStatus: 'partial', customerConfirmationAllowed: false },
      { client_name: 'Harish', practice_area: 'litigation', conflict_status: 'potential_conflict' }
    )
    expect(conflictMsg).toContain('mandatory conflict-of-interest review')

    // 3. Unconfirmed / Simulated slot
    const unconfirmedMsg = getLegalCustomerMessage(
      { overallStatus: 'partial', customerConfirmationAllowed: false },
      {
        client_name: 'Harish',
        practice_area: 'corporate',
        preferred_date: '2026-09-18',
        preferred_time: '2:00 PM',
      }
    )
    expect(unconfirmedMsg).toContain('preliminary conflict check')
    expect(unconfirmedMsg).toContain('2026-09-18')

    // 4. Confirmed / Fully cleared
    const confirmedMsg = getLegalCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      {
        client_name: 'Harish',
        practice_area: 'corporate',
        preferred_date: '2026-09-18',
        preferred_time: '2:00 PM',
      }
    )
    expect(confirmedMsg).toContain('submitted for attorney review')
  })

  // ─── 12. Multi-turn runAgentTurn Integration ───────────────────────────────
  it('12. integrates seamlessly with runAgentTurn for legal-intake-agent persona', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'book_legal_consultation',
          args: {
            client_name: 'Aravind Swamy',
            client_phone: '+919988776655',
            client_email: 'aravind@example.com',
            practice_area: 'real_estate',
            matter_summary: 'Commercial property title verification and dispute',
            opposing_party: 'None',
            urgency: 'routine',
            preferred_date: '2026-09-28',
            preferred_time: '11:00 AM',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'I have scheduled your legal consultation request with Grovaitech Law Chambers.',
      functionCalls: [],
    })

    const turnResult = await runAgentTurn({
      employeeSlug: 'legal-intake-agent',
      message: 'I would like to book a legal consultation for real estate property verification on Sep 28 at 11am.',
    })

    expect(turnResult.executedTools).toHaveLength(1)
    expect(turnResult.executedTools[0].toolName).toBe('book_legal_consultation')
    expect(turnResult.executedTools[0].success).toBe(true)
    expect(turnResult.workflowResult).toBeDefined()
    expect(turnResult.workflowResult?.workflowId).toBe('wf-006')
    expect(turnResult.replyText).toContain('legal consultation request')
  })

  // ─── 13. Regression Protection ─────────────────────────────────────────────
  it('13. maintains regression safety across all previous AI employees and workflows', () => {
    const allEmployees = getCanonicalEmployees()
    expect(allEmployees).toHaveLength(10)

    const empSlugs = allEmployees.map((e) => e.slug)
    expect(empSlugs).toContain('real-estate-lead-receptionist') // emp-001
    expect(empSlugs).toContain('clinic-receptionist') // emp-002
    expect(empSlugs).toContain('whatsapp-lead-agent') // emp-003
    expect(empSlugs).toContain('salon-spa-receptionist') // emp-004
    expect(empSlugs).toContain('customer-support-agent') // emp-005
    expect(empSlugs).toContain('ai-qa-inspector') // emp-006
    expect(empSlugs).toContain('legal-intake-agent') // emp-007

    // Verify wf-006 is active in demo workflows
    const wf006 = CANONICAL_DEMO_WORKFLOWS.find((w) => w.id === 'wf-006')
    expect(wf006).toBeDefined()
    expect(wf006?.status).toBe('active')
    expect(wf006?.assigned_employee_slug).toBe('legal-intake-agent')

    // Verify prompt fallback handles legal keywords
    const legalPrompt = getDefaultSystemPrompt('legal-intake-agent')
    expect(legalPrompt).toContain('AI Legal Intake & Consultation Coordinator')
    expect(legalPrompt).toContain('NO LEGAL ADVICE')
  })
})
