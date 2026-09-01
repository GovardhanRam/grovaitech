import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runAgentTurn, resolveAuthorizedTools, getDefaultSystemPrompt } from '@/lib/ai/runtime'
import { Gemini } from '@/lib/ai/gemini'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { REAL_ESTATE_TOOLS, CLINIC_TOOLS, ALL_GROVAITECH_TOOLS, CREATE_LEAD_TOOL, BOOK_CLINIC_APPOINTMENT_TOOL } from '@/lib/ai/tools'

vi.mock('@/lib/ai/gemini', () => {
  return {
    Gemini: vi.fn(),
  }
})

vi.mock('@/lib/ai/dispatcher', () => ({
  dispatchToolCall: vi.fn(),
}))

vi.mock('@/lib/employees', () => ({
  getEmployeeBySlug: vi.fn().mockResolvedValue(null),
}))

describe('lib/ai/runtime - Unified Headless Agent Runtime', () => {
  let mockGenerateContentWithTools: any
  let mockGenerateText: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateContentWithTools = vi.fn()
    mockGenerateText = vi.fn()

    vi.mocked(Gemini).mockImplementation(() => ({
      generateContentWithTools: mockGenerateContentWithTools,
      generateText: mockGenerateText,
      generateContent: vi.fn(),
      getEmbeddings: vi.fn(),
    } as any))
  })

  it('1. returns conversational text when no tools are requested', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Hello! Welcome to Grovaitech. How can I assist you with properties today?',
      functionCalls: [],
    })

    const result = await runAgentTurn({
      employeeSlug: 'real-estate-lead-receptionist',
      message: 'Hi there',
      channel: 'web_chat',
    })

    expect(result.replyText).toBe('Hello! Welcome to Grovaitech. How can I assist you with properties today?')
    expect(result.executedTools).toHaveLength(0)
    expect(result.iterations).toBe(1)
    expect(result.workflowResult).toBeNull()
  })

  it('2. executes a single tool call and completes the turn', async () => {
    // Turn 1: Model requests create_lead tool call
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'create_lead',
          args: { name: 'Kavita', phone: '+919876543210', budget: '1 Cr' },
        },
      ],
    })

    // Dispatcher mock
    vi.mocked(dispatchToolCall).mockResolvedValueOnce({
      toolName: 'create_lead',
      success: true,
      result: { leadId: 'lead_101', lead: { id: 'lead_101', name: 'Kavita' } },
      durationMs: 25,
    })

    // Turn 2: Model returns conversational confirmation text
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Thank you Kavita, your details have been registered in our CRM.',
      functionCalls: [],
    })

    const result = await runAgentTurn({
      employeeSlug: 'real-estate-lead-receptionist',
      message: 'My name is Kavita, budget 1 Cr, phone +919876543210',
    })

    expect(dispatchToolCall).toHaveBeenCalledWith('create_lead', {
      name: 'Kavita',
      phone: '+919876543210',
      budget: '1 Cr',
    })
    expect(result.executedTools).toHaveLength(1)
    expect(result.executedTools[0].toolName).toBe('create_lead')
    expect(result.leadResult).toEqual({ id: 'lead_101', name: 'Kavita' })
    expect(result.replyText).toBe('Thank you Kavita, your details have been registered in our CRM.')
    expect(result.iterations).toBe(2)
  })

  it('3. automatically injects verified customerContext when omitted in tool arguments', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'create_lead',
          args: { budget: '2 Cr' }, // Missing phone and name
        },
      ],
    })

    vi.mocked(dispatchToolCall).mockResolvedValueOnce({
      toolName: 'create_lead',
      success: true,
      result: { leadId: 'lead_wa_01' },
      durationMs: 15,
    })

    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Details saved.',
      functionCalls: [],
    })

    await runAgentTurn({
      employeeSlug: 'real-estate-lead-receptionist',
      message: 'Looking for 2 Cr villa',
      customerContext: {
        phone: '+919999988888',
        name: 'Suresh Kumar',
      },
    })

    expect(dispatchToolCall).toHaveBeenCalledWith('create_lead', {
      budget: '2 Cr',
      phone: '+919999988888',
      patient_phone: '+919999988888',
      name: 'Suresh Kumar',
      customer_name: 'Suresh Kumar',
      patient_name: 'Suresh Kumar',
    })
  })

  it('4. respects maxIterations guardrail and halts looping', async () => {
    // Model keeps requesting tool calls endlessly
    mockGenerateContentWithTools.mockResolvedValue({
      text: null,
      functionCalls: [{ name: 'create_lead', args: { name: 'Infinite', phone: '123' } }],
    })

    vi.mocked(dispatchToolCall).mockResolvedValue({
      toolName: 'create_lead',
      success: true,
      result: {},
      durationMs: 5,
    })

    mockGenerateText.mockResolvedValueOnce({
      text: 'I have processed your request after multiple steps.',
    })

    const result = await runAgentTurn({
      employeeSlug: 'real-estate-lead-receptionist',
      message: 'Loop me',
      maxIterations: 3,
    })

    expect(result.iterations).toBe(3)
    expect(result.executedTools).toHaveLength(3)
    expect(result.replyText).toBe('I have processed your request after multiple steps.')
  })

  it('5. enforces truthful customer message when site visit workflow is simulated or partial', async () => {
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'schedule_site_visit',
          args: { customer_name: 'Anil', phone: '+919876543210', preferred_date: '2026-09-05' },
        },
      ],
    })

    vi.mocked(dispatchToolCall).mockResolvedValueOnce({
      toolName: 'schedule_site_visit',
      success: true,
      result: {
        workflowId: 'wf-001',
        workflowStatus: 'partial',
        customerConfirmationAllowed: false,
        customerName: 'Anil',
        preferredDate: '2026-09-05',
        steps: [],
        message: 'Your site visit request has been recorded. Our team will confirm the exact slot shortly.',
      },
      durationMs: 40,
    })

    // Even if model hallucinated a confirmation in text:
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Great! Your site visit is 100% booked and confirmed for tomorrow!',
      functionCalls: [],
    })

    const result = await runAgentTurn({
      employeeSlug: 'real-estate-lead-receptionist',
      message: 'I want to schedule site visit for tomorrow',
    })

    // The runtime MUST override with the truthful safe message
    expect(result.replyText).toBe('Your site visit request has been recorded. Our team will confirm the exact slot shortly.')
    expect(result.hasSimulatedWorkflow).toBe(true)
  })

  it('6. prevents caller tools from expanding authorized tools', () => {
    const realEstateTools = resolveAuthorizedTools('real-estate-lead-receptionist')
    expect(realEstateTools.map(t => t.name)).toContain('create_lead')
    expect(realEstateTools.map(t => t.name)).not.toContain('book_clinic_appointment')

    const clinicTools = resolveAuthorizedTools('clinic-receptionist')
    expect(clinicTools.map(t => t.name)).toContain('book_clinic_appointment')
    expect(clinicTools.map(t => t.name)).not.toContain('create_lead')
  })
})
