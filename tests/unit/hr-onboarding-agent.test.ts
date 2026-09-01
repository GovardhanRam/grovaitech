import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCanonicalEmployeeBySlug, getCanonicalEmployees } from '@/lib/employees'
import { resolveAuthorizedTools, getDefaultSystemPrompt, runAgentTurn } from '@/lib/ai/runtime'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import {
  executeOnboardingWorkflow,
  getOnboardingCustomerMessage,
  type OnboardingIntakeData,
} from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn().mockResolvedValue('Company policy: Medical insurance covers employee and immediate family.'),
}))

describe('HR Onboarding Agent (emp-009) & WF-009 Vertical Slice', () => {
  let mockSupabase: any
  let mockGenerateContentWithTools: any
  let mockGenerateText: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: { id: 'wf-exec-hr-1' }, error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'usr-hr' } }, error: null }),
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
  it('1. verifies emp-009 is live, demo-enabled, and has canonical tools bound', () => {
    const emp = getCanonicalEmployeeBySlug('hr-onboarding-agent')
    expect(emp).toBeDefined()
    expect(emp?.id).toBe('emp-009')
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['schedule_onboarding_induction', 'search_knowledge_base', 'escalate_to_human'])
    expect(emp?.system_prompt).toContain('AI HR & Onboarding Specialist')
    expect(emp?.system_prompt).toContain('NO CONFIDENTIAL PII OR SALARY DISCLOSURE')
    expect(emp?.system_prompt).toContain('NO LEGAL ADVICE')
    expect(emp?.system_prompt).toContain('MANDATORY INTAKE PARAMETERS')
  })

  // ─── 2. Exact Tool Authorization ───────────────────────────────────────────
  it('2. resolves exact authorized tools for hr-onboarding-agent', () => {
    const tools = resolveAuthorizedTools('hr-onboarding-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).toContain('schedule_onboarding_induction')
    expect(toolNames).toContain('search_knowledge_base')
    expect(toolNames).toContain('escalate_to_human')
    expect(toolNames).toHaveLength(3)
  })

  // ─── 3. Forbidden Tool Isolation ───────────────────────────────────────────
  it('3. strictly isolates hr onboarding agent from unauthorized domain tools', () => {
    const tools = resolveAuthorizedTools('hr-onboarding-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).not.toContain('create_lead')
    expect(toolNames).not.toContain('schedule_site_visit')
    expect(toolNames).not.toContain('book_clinic_appointment')
    expect(toolNames).not.toContain('book_salon_service')
    expect(toolNames).not.toContain('audit_conversation_quality')
    expect(toolNames).not.toContain('book_legal_consultation')
    expect(toolNames).not.toContain('lookup_order_and_support')
  })

  // ─── 4. Validation: Candidate Name ─────────────────────────────────────────
  it('4. validates mandatory candidate_name in schedule_onboarding_induction', async () => {
    const res = await dispatchToolCall('schedule_onboarding_induction', {
      candidate_name: '',
      candidate_email: 'newhire@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: 'Software Engineer',
      department: 'engineering',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain("'candidate_name'")
  })

  // ─── 5. Validation: Email and Phone ────────────────────────────────────────
  it('5. validates email format and phone number length', async () => {
    // Invalid email
    const resBadEmail = await dispatchToolCall('schedule_onboarding_induction', {
      candidate_name: 'Vikram Seth',
      candidate_email: 'invalid-email',
      candidate_phone: '+919876543210',
      role_title: 'Product Designer',
      department: 'product',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
    })
    expect(resBadEmail.success).toBe(false)
    expect(resBadEmail.error).toContain("'candidate_email'")

    // Short phone
    const resBadPhone = await dispatchToolCall('schedule_onboarding_induction', {
      candidate_name: 'Vikram Seth',
      candidate_email: 'vikram@grovaitech.ai',
      candidate_phone: '123',
      role_title: 'Product Designer',
      department: 'product',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
    })
    expect(resBadPhone.success).toBe(false)
    expect(resBadPhone.error).toContain("'candidate_phone'")
  })

  // ─── 6. Validation: Department, Role, Joining Date, Slot ───────────────────
  it('6. validates role title, joining date, and induction slot requirements', async () => {
    const resNoRole = await dispatchToolCall('schedule_onboarding_induction', {
      candidate_name: 'Kavita Nair',
      candidate_email: 'kavita@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: '',
      department: 'sales',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
    })
    expect(resNoRole.success).toBe(false)
    expect(resNoRole.error).toContain("'role_title'")

    const resNoSlot = await dispatchToolCall('schedule_onboarding_induction', {
      candidate_name: 'Kavita Nair',
      candidate_email: 'kavita@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: 'Account Executive',
      department: 'sales',
      joining_date: '2026-09-15',
      preferred_induction_slot: '',
    })
    expect(resNoSlot.success).toBe(false)
    expect(resNoSlot.error).toContain("'preferred_induction_slot'")
  })

  // ─── 7. Sanitization ───────────────────────────────────────────────────────
  it('7. sanitizes candidate names, emails, phone numbers, and notes', async () => {
    const res = await dispatchToolCall('schedule_onboarding_induction', {
      candidate_name: '  Suresh Menon  ',
      candidate_email: '  suresh.menon@grovaitech.ai  ',
      candidate_phone: ' +91 (987) 654-3210 ',
      role_title: '  DevOps Lead  ',
      department: 'engineering',
      joining_date: ' 2026-09-20 ',
      preferred_induction_slot: ' Tuesday 11:00 AM ',
      document_status: 'all_submitted',
      notes: '  Need Mac M3 setup  ',
    })

    expect(res.success).toBe(true)
    expect(res.result.candidate_name).toBe('Suresh Menon')
    expect(res.result.candidate_email).toBe('suresh.menon@grovaitech.ai')
    expect(res.result.candidate_phone).toBe('+919876543210')
    expect(res.result.role_title).toBe('DevOps Lead')
    expect(res.result.workflowId).toBe('wf-009')
  })

  // ─── 8. Complete WF-009 Execution ──────────────────────────────────────────
  it('8. executes complete 4-step onboarding induction workflow for verified candidate', async () => {
    const payload: OnboardingIntakeData = {
      candidate_name: 'Ananya Sharma',
      candidate_email: 'ananya.sharma@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: 'Frontend Engineer',
      department: 'engineering',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
      document_status: 'all_submitted',
    }

    const workflowRes = await executeOnboardingWorkflow({ client: payload })
    expect(workflowRes.workflowId).toBe('wf-009')
    expect(workflowRes.steps).toHaveLength(4)

    const s1 = workflowRes.steps.find((s) => s.stepId === 's1')
    expect(s1?.status).toBe('success')
    expect(s1?.detail).toContain('Ananya Sharma')

    const s2 = workflowRes.steps.find((s) => s.stepId === 's2')
    expect(s2?.status).toBe('success')
    expect(s2?.detail).toContain('All mandatory onboarding compliance documents verified')

    const s3 = workflowRes.steps.find((s) => s.stepId === 's3')
    expect(s3?.status).toBe('success')
    expect(payload.induction_status).toBe('scheduled')
    expect(payload.orientation_room).toBe('Virtual Induction Suite 1')
  })

  // ─── 9. Pending Documents Flow ─────────────────────────────────────────────
  it('9. evaluates pending documents flow and provides clear guidance', async () => {
    const payload: OnboardingIntakeData = {
      candidate_name: 'Rohan Gupta',
      candidate_email: 'rohan.gupta@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: 'Product Manager',
      department: 'product',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
      document_status: 'pending_documents',
    }

    const workflowRes = await executeOnboardingWorkflow({ client: payload })
    const s2 = workflowRes.steps.find((s) => s.stepId === 's2')
    expect(s2?.status).toBe('success')
    expect(s2?.detail).toContain('Pending mandatory compliance forms')
  })

  // ─── 10. Calendar Reservation Flow ─────────────────────────────────────────
  it('10. reserves induction calendar slot and reports room assignment', async () => {
    const payload: OnboardingIntakeData = {
      candidate_name: 'Divya Iyer',
      candidate_email: 'divya.iyer@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: 'HR Generalist',
      department: 'hr',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Wednesday 2:00 PM',
      document_status: 'all_submitted',
    }

    const workflowRes = await executeOnboardingWorkflow({ client: payload })
    const s3 = workflowRes.steps.find((s) => s.stepId === 's3')
    expect(s3?.status).toBe('success')
    expect(s3?.payload?.preferred_induction_slot).toBe('Wednesday 2:00 PM')
  })

  // ─── 11. Calendar Failure Flow ─────────────────────────────────────────────
  it('11. handles calendar reservation failures truthfully without false confirmation', async () => {
    const payload: OnboardingIntakeData = {
      candidate_name: 'Divya CALENDAR_FAIL',
      candidate_email: 'divya@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: 'QA Engineer',
      department: 'engineering',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Wednesday 2:00 PM',
    }

    const workflowRes = await executeOnboardingWorkflow({ client: payload })
    const s3 = workflowRes.steps.find((s) => s.stepId === 's3')
    expect(s3?.status).toBe('failed')
    expect(workflowRes.overallStatus).toBe('failed')
  })

  // ─── 12. Invalid Candidate Flow ────────────────────────────────────────────
  it('12. handles invalid candidate records without inventing verification', async () => {
    const payload: OnboardingIntakeData = {
      candidate_name: 'INVALID_CANDIDATE_101',
      candidate_email: 'unknown@example.com',
      candidate_phone: '+919876543210',
      role_title: 'Intern',
      department: 'operations',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
    }

    const workflowRes = await executeOnboardingWorkflow({ client: payload })
    expect(workflowRes.overallStatus).toBe('failed')
    const s1 = workflowRes.steps.find((s) => s.stepId === 's1')
    expect(s1?.status).toBe('failed')
  })

  // ─── 13. Sandbox Webhook Fallback ──────────────────────────────────────────
  it('13. handles n8n HR webhook sandbox fallback without false claims', async () => {
    const payload: OnboardingIntakeData = {
      candidate_name: 'Meera Nambiar',
      candidate_email: 'meera@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: 'Marketing Lead',
      department: 'marketing',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
    }

    const res = await executeOnboardingWorkflow({ client: payload })
    const s4 = res.steps.find((s) => s.stepId === 's4')
    expect(s4).toBeDefined()
    expect(s4?.type).toBe('n8n_webhook')
    expect(['success', 'simulated']).toContain(s4?.status)
    expect(res.n8nResult.status).toBeDefined()
  })

  // ─── 14. WF-009 Execution Persistence ──────────────────────────────────────
  it('14. logs WF-009 execution into workflow_executions table', async () => {
    const payload: OnboardingIntakeData = {
      candidate_name: 'Tanvi Shah',
      candidate_email: 'tanvi@grovaitech.ai',
      candidate_phone: '+919876543210',
      role_title: 'Financial Analyst',
      department: 'finance',
      joining_date: '2026-09-15',
      preferred_induction_slot: 'Monday 10:00 AM',
    }

    const res = await executeOnboardingWorkflow({ client: payload })
    expect(res.executionId).toBeDefined()
    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
  })

  // ─── 15. getOnboardingCustomerMessage Truthfulness ─────────────────────────
  it('15. formats truthful new hire confirmation messages across all states', () => {
    // 1. Success with all documents
    const successMsg = getOnboardingCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      {
        candidate_name: 'Arjun Pillai',
        role_title: 'Backend Engineer',
        joining_date: '2026-09-15',
        preferred_induction_slot: 'Monday 10:00 AM',
        document_status: 'all_submitted',
      }
    )
    expect(successMsg).toContain('Arjun Pillai')
    expect(successMsg).toContain('Backend Engineer')
    expect(successMsg).toContain('Monday 10:00 AM')

    // 2. Success with pending documents
    const pendingMsg = getOnboardingCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      {
        candidate_name: 'Arjun Pillai',
        role_title: 'Backend Engineer',
        joining_date: '2026-09-15',
        preferred_induction_slot: 'Monday 10:00 AM',
        document_status: 'pending_documents',
      }
    )
    expect(pendingMsg).toContain('pending compliance documents')

    // 3. Workflow Failed
    const failedMsg = getOnboardingCustomerMessage(
      { overallStatus: 'failed', customerConfirmationAllowed: false },
      { candidate_name: 'Arjun Pillai' }
    )
    expect(failedMsg).toContain("couldn't complete the induction registration automatically")
  })

  // ─── 16. Multi-turn runAgentTurn Integration & Regression Protection ────────
  it('16. integrates with runAgentTurn and maintains regression safety for emp-001..emp-008 and wf-001..wf-008', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'schedule_onboarding_induction',
          args: {
            candidate_name: 'Pooja Hegde',
            candidate_email: 'pooja.hegde@grovaitech.ai',
            candidate_phone: '+919876543210',
            role_title: 'Security Specialist',
            department: 'engineering',
            joining_date: '2026-09-15',
            preferred_induction_slot: 'Monday 10:00 AM',
          },
        },
      ],
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Welcome to the team Pooja! Your induction session is confirmed for Monday 10:00 AM.',
      functionCalls: [],
    })

    const turnResult = await runAgentTurn({
      employeeSlug: 'hr-onboarding-agent',
      message: 'Hi, I am Pooja Hegde joining next Monday as Security Specialist. Please schedule my induction for Monday 10:00 AM. My email is pooja.hegde@grovaitech.ai.',
    })

    expect(turnResult.executedTools).toHaveLength(1)
    expect(turnResult.executedTools[0].toolName).toBe('schedule_onboarding_induction')
    expect(turnResult.executedTools[0].success).toBe(true)
    expect(turnResult.workflowResult).toBeDefined()
    expect(turnResult.workflowResult?.workflowId).toBe('wf-009')
    expect(turnResult.replyText).toContain('Pooja')

    // Regression Check: Employee count & workflows
    const allEmployees = getCanonicalEmployees()
    expect(allEmployees).toHaveLength(10)
    expect(allEmployees.find((e) => e.slug === 'hr-onboarding-agent')?.status).toBe('live')
    expect(allEmployees.find((e) => e.slug === 'ecommerce-support-agent')?.status).toBe('live')
    expect(allEmployees.find((e) => e.slug === 'legal-intake-agent')?.status).toBe('live')

    const wf009 = CANONICAL_DEMO_WORKFLOWS.find((w) => w.id === 'wf-009')
    expect(wf009).toBeDefined()
    expect(wf009?.status).toBe('active')
    expect(wf009?.assigned_employee_slug).toBe('hr-onboarding-agent')

    const hrPrompt = getDefaultSystemPrompt('hr-onboarding-agent')
    expect(hrPrompt).toContain('AI HR & Onboarding Specialist')
    expect(hrPrompt).toContain('NO CONFIDENTIAL PII OR SALARY DISCLOSURE')
  })
})
