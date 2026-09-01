import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCanonicalEmployeeBySlug,
  CANONICAL_EMPLOYEES,
} from '@/lib/employees'
import { resolveAuthorizedTools, runAgentTurn } from '@/lib/ai/runtime'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import {
  executeSalonWorkflow,
  getSalonCustomerMessage,
  type WorkflowExecutionAdapters,
} from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn().mockResolvedValue('Our Aromatherapy Massage is 60 minutes for ₹2,500.'),
}))

describe('Salon & Spa Receptionist Vertical Slice & wf-007 Pipeline', () => {
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
              { name: 'spa_service_menu.pdf' },
              { name: 'bridal_packages.docx' },
            ],
            error: null,
          }),
        }),
        insert: vi.fn().mockResolvedValue({ data: { id: 'wf-exec-1' }, error: null }),
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

  it('1. verifies salon-spa-receptionist is live and has correct tools bound in registry', () => {
    const emp = getCanonicalEmployeeBySlug('salon-spa-receptionist')
    expect(emp).toBeDefined()
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['book_salon_service', 'search_knowledge_base'])
    expect(emp?.system_prompt).toContain('Salon & Spa Front-Desk & Hospitality Specialist')
  })

  it('2. enforces tool authorization boundaries for salon-spa-receptionist', () => {
    const tools = resolveAuthorizedTools('salon-spa-receptionist')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).toContain('book_salon_service')
    expect(toolNames).toContain('search_knowledge_base')
    expect(toolNames).not.toContain('create_lead')
    expect(toolNames).not.toContain('schedule_site_visit')
    expect(toolNames).not.toContain('book_clinic_appointment')
    expect(toolNames).not.toContain('escalate_to_human')
  })

  it('3. rejects book_salon_service when required arguments are missing', async () => {
    const result = await dispatchToolCall('book_salon_service', {
      client_name: 'Ananya',
      // missing phone, service, date, time
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Validation Error')
  })

  it('4. executes book_salon_service and dispatches wf-007 pipeline', async () => {
    const result = await dispatchToolCall('book_salon_service', {
      client_name: 'Ananya Roy',
      client_phone: '+919876543210',
      service_name: 'Aromatherapy Massage',
      appointment_date: '2026-09-06',
      appointment_time: '3:00 PM',
      stylist_preference: 'Maya',
    })

    expect(result.success).toBe(true)
    expect(result.toolName).toBe('book_salon_service')
    expect(result.result.workflowId).toBe('wf-007')
    expect(result.result.serviceName).toBe('Aromatherapy Massage')
    expect(result.result.message).toContain('Ananya Roy')
    expect(result.result.message).toContain('Aromatherapy Massage')
    expect(result.result.steps).toHaveLength(4)

    // Verify Supabase persistence call
    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
  })

  it('5. executes executeSalonWorkflow with live adapters returning success', async () => {
    const liveAdapters: WorkflowExecutionAdapters = {
      createCalendarEvent: async () => ({ status: 'success', detail: 'Stylist calendar reserved.' }),
      dispatchWhatsAppTemplate: async () => ({ status: 'success', detail: 'WhatsApp template sent.' }),
    }

    const wfRes = await executeSalonWorkflow({
      bookingId: 'salon-101',
      client: {
        client_name: 'Ananya Roy',
        client_phone: '+919876543210',
        service_name: 'Bridal Makeup',
        appointment_date: '2026-09-10',
        appointment_time: '10:00 AM',
        stylist_preference: 'Sana',
      },
      adapters: liveAdapters,
    })

    expect(wfRes.workflowId).toBe('wf-007')
    expect(wfRes.workflowName).toBe('Salon & Spa Service Booking & Reminder Pipeline')
    expect(wfRes.steps).toHaveLength(4)
    expect(wfRes.steps[0].stepId).toBe('s1')
    expect(wfRes.steps[0].status).toBe('success')
    expect(wfRes.steps[1].stepId).toBe('s2')
    expect(wfRes.steps[1].status).toBe('success')
    expect(wfRes.steps[2].stepId).toBe('s3')
    expect(wfRes.steps[2].status).toBe('success')
    expect(wfRes.customerConfirmationAllowed).toBe(true)
  })

  it('6. generates truthful customer message via getSalonCustomerMessage', () => {
    const successMsg = getSalonCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      { client_name: 'Ananya', service_name: 'Facial & Cleanup', appointment_date: 'Tomorrow', appointment_time: '4:00 PM', stylist_preference: 'Maya' }
    )
    expect(successMsg).toContain('Thank you, Ananya!')
    expect(successMsg).toContain('Facial & Cleanup')
    expect(successMsg).toContain('confirmed')

    const failedMsg = getSalonCustomerMessage(
      { overallStatus: 'failed', customerConfirmationAllowed: false },
      { client_name: 'Ananya', service_name: 'Haircut' }
    )
    expect(failedMsg).toContain('front desk will need to manually confirm')
  })

  it('7. executes complete multi-turn reasoning turn for salon-spa-receptionist in runtime', async () => {
    // Turn 1: Model requests book_salon_service tool call
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'book_salon_service',
          args: {
            client_name: 'Ananya Roy',
            client_phone: '+919876543210',
            service_name: 'Aromatherapy Massage',
            appointment_date: '2026-09-06',
            appointment_time: '3:00 PM',
            stylist_preference: 'Maya',
          },
        },
      ],
    })

    // Turn 2: Model returns response text
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Thank you, Ananya Roy! Your appointment for "Aromatherapy Massage" on 2026-09-06 at 3:00 PM with Maya has been received. Our salon team has blocked the schedule and will confirm details shortly via WhatsApp.',
      functionCalls: [],
    })

    const turnRes = await runAgentTurn({
      employeeSlug: 'salon-spa-receptionist',
      message: 'I would like to book an Aromatherapy Massage with Maya for tomorrow at 3 PM.',
      customerContext: { phone: '+919876543210', name: 'Ananya Roy' },
    })

    expect(turnRes.executedTools).toHaveLength(1)
    expect(turnRes.executedTools[0].toolName).toBe('book_salon_service')
    expect(turnRes.replyText).toContain('Aromatherapy Massage')
    expect(turnRes.iterations).toBe(2)
  })
})
