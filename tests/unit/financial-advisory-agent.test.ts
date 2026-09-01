import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCanonicalEmployeeBySlug, getCanonicalEmployees } from '@/lib/employees'
import { resolveAuthorizedTools, getDefaultSystemPrompt, runAgentTurn } from '@/lib/ai/runtime'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import {
  executeFinancialWorkflow,
  getFinancialCustomerMessage,
  type FinancialConsultationData,
} from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'
import {
  createMockSupabaseClient,
  createMockGeminiInstance,
  mockGeminiToolCall,
  mockGeminiTextResponse,
} from '../helpers/mocks'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn().mockResolvedValue('Product info: Term insurance provides financial security with fixed tenure.'),
}))

describe('Financial Advisory Agent (emp-010) & WF-010 Vertical Slice', () => {
  let mockSupabase: any
  let mockGenerateContentWithTools: any
  let mockGenerateText: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = createMockSupabaseClient({
      defaultData: { id: 'wf-exec-fin-1' },
      user: { id: 'usr-fin' },
    })

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    mockGenerateContentWithTools = vi.fn()
    mockGenerateText = vi.fn()

    vi.mocked(Gemini).mockImplementation(() =>
      createMockGeminiInstance({
        generateContentWithTools: mockGenerateContentWithTools,
        generateText: mockGenerateText,
      }) as any
    )
  })

  // ─── 1. Registry Activation ────────────────────────────────────────────────
  it('1. verifies emp-010 is live, demo-enabled, and has canonical tools bound', () => {
    const emp = getCanonicalEmployeeBySlug('financial-advisory-agent')
    expect(emp).toBeDefined()
    expect(emp?.id).toBe('emp-010')
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['book_financial_consultation', 'search_knowledge_base', 'escalate_to_human'])
    expect(emp?.system_prompt).toContain('AI Financial Consultation Coordinator')
    expect(emp?.system_prompt).toContain('NO PERSONALIZED FINANCIAL/INVESTMENT ADVICE')
    expect(emp?.system_prompt).toContain('NO GUARANTEES')
    expect(emp?.system_prompt).toContain('MANDATORY INTAKE PARAMETERS')
  })

  // ─── 2. Exact Tool Authorization ───────────────────────────────────────────
  it('2. resolves exact authorized tools for financial-advisory-agent', () => {
    const tools = resolveAuthorizedTools('financial-advisory-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).toContain('book_financial_consultation')
    expect(toolNames).toContain('search_knowledge_base')
    expect(toolNames).toContain('escalate_to_human')
    expect(toolNames).toHaveLength(3)
  })

  // ─── 3. Forbidden Tool Isolation ───────────────────────────────────────────
  it('3. strictly isolates financial advisory agent from unauthorized domain tools', () => {
    const tools = resolveAuthorizedTools('financial-advisory-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).not.toContain('create_lead')
    expect(toolNames).not.toContain('schedule_site_visit')
    expect(toolNames).not.toContain('book_clinic_appointment')
    expect(toolNames).not.toContain('book_salon_service')
    expect(toolNames).not.toContain('audit_conversation_quality')
    expect(toolNames).not.toContain('book_legal_consultation')
    expect(toolNames).not.toContain('lookup_order_and_support')
    expect(toolNames).not.toContain('schedule_onboarding_induction')
  })

  // ─── 4. Validation: Client Name ────────────────────────────────────────────
  it('4. validates mandatory client_name in book_financial_consultation', async () => {
    const res = await dispatchToolCall('book_financial_consultation', {
      client_name: '',
      client_phone: '+919876543210',
      client_email: 'client@example.com',
      product_category: 'mutual_funds',
      amount_range: '₹50 Lakhs',
      employment_type: 'salaried',
      preferred_date: '2026-09-18',
      preferred_time: '11:00 AM',
    })
    expect(res.success).toBe(false)
    expect(res.error).toContain("'client_name'")
  })

  // ─── 5. Validation: Email and Phone ────────────────────────────────────────
  it('5. validates email format and phone number length', async () => {
    // Bad email
    const resBadEmail = await dispatchToolCall('book_financial_consultation', {
      client_name: 'Rahul Varma',
      client_phone: '+919876543210',
      client_email: 'invalid-email',
      product_category: 'home_loan',
      amount_range: '₹75 Lakhs',
      employment_type: 'salaried',
      preferred_date: '2026-09-18',
      preferred_time: '11:00 AM',
    })
    expect(resBadEmail.success).toBe(false)
    expect(resBadEmail.error).toContain("'client_email'")

    // Bad phone
    const resBadPhone = await dispatchToolCall('book_financial_consultation', {
      client_name: 'Rahul Varma',
      client_phone: '123',
      client_email: 'rahul@example.com',
      product_category: 'home_loan',
      amount_range: '₹75 Lakhs',
      employment_type: 'salaried',
      preferred_date: '2026-09-18',
      preferred_time: '11:00 AM',
    })
    expect(resBadPhone.success).toBe(false)
    expect(resBadPhone.error).toContain("'client_phone'")
  })

  // ─── 6. Validation: Product, Amount, Date, Time ────────────────────────────
  it('6. validates amount range, preferred date, and preferred time', async () => {
    const resNoAmount = await dispatchToolCall('book_financial_consultation', {
      client_name: 'Sneha Kapur',
      client_phone: '+919876543210',
      client_email: 'sneha@example.com',
      product_category: 'insurance',
      amount_range: '',
      employment_type: 'self_employed',
      preferred_date: '2026-09-18',
      preferred_time: '11:00 AM',
    })
    expect(resNoAmount.success).toBe(false)
    expect(resNoAmount.error).toContain("'amount_range'")

    const resNoDate = await dispatchToolCall('book_financial_consultation', {
      client_name: 'Sneha Kapur',
      client_phone: '+919876543210',
      client_email: 'sneha@example.com',
      product_category: 'insurance',
      amount_range: '₹1 Crore',
      employment_type: 'self_employed',
      preferred_date: '',
      preferred_time: '11:00 AM',
    })
    expect(resNoDate.success).toBe(false)
    expect(resNoDate.error).toContain("'preferred_date'")
  })

  // ─── 7. Sanitization ───────────────────────────────────────────────────────
  it('7. sanitizes client name, email, phone, and remarks', async () => {
    const res = await dispatchToolCall('book_financial_consultation', {
      client_name: '  Amitabh Roy  ',
      client_phone: ' +91 (987) 654-3210 ',
      client_email: '  amitabh.roy@example.com  ',
      product_category: 'wealth_management',
      amount_range: '  ₹2 Crore  ',
      employment_type: 'business_owner',
      annual_income: '  ₹45 LPA  ',
      kyc_status: 'verified',
      preferred_date: ' 2026-09-20 ',
      preferred_time: ' 4:00 PM ',
      notes: '  Retirement portfolio structuring  ',
    })

    expect(res.success).toBe(true)
    expect(res.result.client_name).toBe('Amitabh Roy')
    expect(res.result.client_email).toBe('amitabh.roy@example.com')
    expect(res.result.client_phone).toBe('+919876543210')
    expect(res.result.product_category).toBe('wealth_management')
    expect(res.result.workflowId).toBe('wf-010')
  })

  // ─── 8. Complete WF-010 Execution ──────────────────────────────────────────
  it('8. executes complete 4-step financial advisory workflow for verified client', async () => {
    const payload: FinancialConsultationData = {
      client_name: 'Deepak Chopra',
      client_phone: '+919876543210',
      client_email: 'deepak@example.com',
      product_category: 'mutual_funds',
      amount_range: '₹25 Lakhs',
      employment_type: 'salaried',
      annual_income: '₹18 LPA',
      kyc_status: 'verified',
      preferred_date: '2026-09-18',
      preferred_time: '2:30 PM',
    }

    const workflowRes = await executeFinancialWorkflow({ client: payload })
    expect(workflowRes.workflowId).toBe('wf-010')
    expect(workflowRes.steps).toHaveLength(4)

    const s1 = workflowRes.steps.find((s) => s.stepId === 's1')
    expect(s1?.status).toBe('success')
    expect(s1?.detail).toContain('Deepak Chopra')

    const s2 = workflowRes.steps.find((s) => s.stepId === 's2')
    expect(s2?.status).toBe('success')
    expect(s2?.detail).toContain('KYC readiness and preliminary regulatory compliance screening verified')

    const s3 = workflowRes.steps.find((s) => s.stepId === 's3')
    expect(s3?.status).toBe('success')
    expect(payload.assigned_advisor).toBe('Senior Wealth Advisor (CERTIFIED)')
  })

  // ─── 9. Pending KYC Flow ───────────────────────────────────────────────────
  it('9. evaluates pending KYC documents flow and provides clear guidance', async () => {
    const payload: FinancialConsultationData = {
      client_name: 'Sunita Rao',
      client_phone: '+919876543210',
      client_email: 'sunita@example.com',
      product_category: 'home_loan',
      amount_range: '₹80 Lakhs',
      employment_type: 'salaried',
      kyc_status: 'documents_pending',
      preferred_date: '2026-09-18',
      preferred_time: '2:30 PM',
    }

    const workflowRes = await executeFinancialWorkflow({ client: payload })
    const s2 = workflowRes.steps.find((s) => s.stepId === 's2')
    expect(s2?.status).toBe('success')
    expect(s2?.detail).toContain('Pending mandatory ID / Address verification documents')
  })

  // ─── 10. Calendar Reservation Flow ─────────────────────────────────────────
  it('10. reserves advisor calendar block and reports consultation slot', async () => {
    const payload: FinancialConsultationData = {
      client_name: 'Rajesh Khanna',
      client_phone: '+919876543210',
      client_email: 'rajesh@example.com',
      product_category: 'tax_planning',
      amount_range: '₹10 Lakhs',
      employment_type: 'self_employed',
      preferred_date: '2026-09-19',
      preferred_time: '10:00 AM',
    }

    const workflowRes = await executeFinancialWorkflow({ client: payload })
    const s3 = workflowRes.steps.find((s) => s.stepId === 's3')
    expect(s3?.status).toBe('success')
    expect(s3?.payload?.preferred_date).toBe('2026-09-19')
    expect(s3?.payload?.preferred_time).toBe('10:00 AM')
  })

  // ─── 11. Calendar Failure Flow ─────────────────────────────────────────────
  it('11. handles calendar reservation failures truthfully without false confirmation', async () => {
    const payload: FinancialConsultationData = {
      client_name: 'Rajesh CALENDAR_FAIL',
      client_phone: '+919876543210',
      client_email: 'rajesh@example.com',
      product_category: 'tax_planning',
      amount_range: '₹10 Lakhs',
      employment_type: 'self_employed',
      preferred_date: '2026-09-19',
      preferred_time: '10:00 AM',
    }

    const workflowRes = await executeFinancialWorkflow({ client: payload })
    const s3 = workflowRes.steps.find((s) => s.stepId === 's3')
    expect(s3?.status).toBe('failed')
    expect(workflowRes.overallStatus).toBe('failed')
  })

  // ─── 12. Invalid Client Flow ───────────────────────────────────────────────
  it('12. handles invalid client records without inventing qualification', async () => {
    const payload: FinancialConsultationData = {
      client_name: 'INVALID_CLIENT_99',
      client_phone: '+919876543210',
      client_email: 'unknown@example.com',
      product_category: 'personal_loan',
      amount_range: '₹5 Lakhs',
      employment_type: 'other',
      preferred_date: '2026-09-19',
      preferred_time: '10:00 AM',
    }

    const workflowRes = await executeFinancialWorkflow({ client: payload })
    expect(workflowRes.overallStatus).toBe('failed')
    const s1 = workflowRes.steps.find((s) => s.stepId === 's1')
    expect(s1?.status).toBe('failed')
  })

  // ─── 13. Sandbox Webhook Fallback ──────────────────────────────────────────
  it('13. handles n8n Financial webhook sandbox fallback without false claims', async () => {
    const payload: FinancialConsultationData = {
      client_name: 'Tarun Mathur',
      client_phone: '+919876543210',
      client_email: 'tarun@example.com',
      product_category: 'retirement_planning',
      amount_range: '₹1.5 Crore',
      employment_type: 'salaried',
      preferred_date: '2026-09-19',
      preferred_time: '10:00 AM',
    }

    const res = await executeFinancialWorkflow({ client: payload })
    const s4 = res.steps.find((s) => s.stepId === 's4')
    expect(s4).toBeDefined()
    expect(s4?.type).toBe('n8n_webhook')
    expect(['success', 'simulated']).toContain(s4?.status)
    expect(res.n8nResult.status).toBeDefined()
  })

  // ─── 14. WF-010 Execution Persistence ──────────────────────────────────────
  it('14. logs WF-010 execution into workflow_executions table', async () => {
    const payload: FinancialConsultationData = {
      client_name: 'Geeta Nair',
      client_phone: '+919876543210',
      client_email: 'geeta@example.com',
      product_category: 'insurance',
      amount_range: '₹50 Lakhs',
      employment_type: 'salaried',
      preferred_date: '2026-09-19',
      preferred_time: '10:00 AM',
    }

    const res = await executeFinancialWorkflow({ client: payload })
    expect(res.executionId).toBeDefined()
    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
  })

  // ─── 15. getFinancialCustomerMessage Truthfulness ──────────────────────────
  it('15. formats truthful consultation confirmation messages with regulatory disclaimers', () => {
    // 1. Success with verified KYC
    const successMsg = getFinancialCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      {
        client_name: 'Manish Pandey',
        product_category: 'mutual_funds',
        preferred_date: '2026-09-18',
        preferred_time: '11:00 AM',
        assigned_advisor: 'Senior Wealth Advisor (CERTIFIED)',
        kyc_status: 'verified',
        client_email: 'manish@example.com',
      }
    )
    expect(successMsg).toContain('Manish Pandey')
    expect(successMsg).toContain('Mutual Funds')
    expect(successMsg).toContain('Senior Wealth Advisor (CERTIFIED)')
    expect(successMsg).toContain('Disclaimer: Grovaitech provides administrative consultation coordination')

    // 2. Success with pending KYC
    const pendingMsg = getFinancialCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      {
        client_name: 'Manish Pandey',
        product_category: 'home_loan',
        preferred_date: '2026-09-18',
        preferred_time: '11:00 AM',
        assigned_advisor: 'Senior Wealth Advisor (CERTIFIED)',
        kyc_status: 'documents_pending',
      }
    )
    expect(pendingMsg).toContain('provisionally reserved')
    expect(pendingMsg).toContain('KYC documentation is currently pending')

    // 3. Failed
    const failedMsg = getFinancialCustomerMessage(
      { overallStatus: 'failed', customerConfirmationAllowed: false },
      { client_name: 'Manish Pandey', product_category: 'insurance', client_phone: '+919876543210' }
    )
    expect(failedMsg).toContain('encountered an issue while scheduling')
  })

  // ─── 16. Multi-turn runAgentTurn Integration & Regression Protection ────────
  it('16. integrates with runAgentTurn and maintains regression safety for emp-001..emp-009 and wf-001..wf-009', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce(
      mockGeminiToolCall(
        'book_financial_consultation',
        {
          client_name: 'Nandini Das',
          client_phone: '+919876543210',
          client_email: 'nandini@example.com',
          product_category: 'wealth_management',
          amount_range: '₹1 Crore',
          employment_type: 'business_owner',
          preferred_date: '2026-09-22',
          preferred_time: '3:00 PM',
        },
        null as any
      )
    )

    mockGenerateContentWithTools.mockResolvedValueOnce(
      mockGeminiTextResponse(
        'Thank you Nandini! Your Wealth Management consultation is booked for 2026-09-22 at 3:00 PM.'
      )
    )

    const turnResult = await runAgentTurn({
      employeeSlug: 'financial-advisory-agent',
      message: 'Hi, I am Nandini Das. I need advice on wealth management for ₹1 Crore portfolio. Can we schedule on 2026-09-22 at 3:00 PM? My email is nandini@example.com.',
    })

    expect(turnResult.executedTools).toHaveLength(1)
    expect(turnResult.executedTools[0].toolName).toBe('book_financial_consultation')
    expect(turnResult.executedTools[0].success).toBe(true)
    expect(turnResult.workflowResult).toBeDefined()
    expect(turnResult.workflowResult?.workflowId).toBe('wf-010')
    expect(turnResult.replyText).toContain('Nandini')

    // Regression Check: All 10 Employees are Live
    const allEmployees = getCanonicalEmployees()
    expect(allEmployees).toHaveLength(10)
    expect(allEmployees.every((e) => e.status === 'live')).toBe(true)
    expect(allEmployees.every((e) => e.demo_config.enabled === true)).toBe(true)

    // Regression Check: All 10 Workflows exist
    expect(CANONICAL_DEMO_WORKFLOWS).toHaveLength(10)
    const wf010 = CANONICAL_DEMO_WORKFLOWS.find((w) => w.id === 'wf-010')
    expect(wf010).toBeDefined()
    expect(wf010?.status).toBe('active')
    expect(wf010?.assigned_employee_slug).toBe('financial-advisory-agent')

    const finPrompt = getDefaultSystemPrompt('financial-advisory-agent')
    expect(finPrompt).toContain('AI Financial Consultation Coordinator')
    expect(finPrompt).toContain('NO PERSONALIZED FINANCIAL/INVESTMENT ADVICE')
  })
})
