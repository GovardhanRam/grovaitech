import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCanonicalEmployeeBySlug,
  CANONICAL_EMPLOYEES,
} from '@/lib/employees'
import { resolveAuthorizedTools, runAgentTurn } from '@/lib/ai/runtime'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import {
  executeWhatsAppLeadWorkflow,
  getWhatsAppLeadCustomerMessage,
} from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { Gemini } from '@/lib/ai/gemini'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/app/actions/leads', () => ({
  createLead: vi.fn().mockImplementation(async (payload: any) => ({
    success: true,
    data: {
      id: 'lead-wa-101',
      ...payload,
      lead_status: 'qualified',
      lead_score: 'warm',
    },
    isUpdate: false,
  })),
}))

vi.mock('@/lib/ai/gemini', () => ({
  Gemini: vi.fn(),
  generateResponse: vi.fn().mockResolvedValue('We offer 3 BHK luxury villas and 2 BHK apartments in Tirupati.'),
}))

describe('WhatsApp Lead Agent Vertical Slice & wf-004 Pipeline', () => {
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
              { name: 'property_brochure.pdf' },
              { name: 'pricing_matrix.docx' },
            ],
            error: null,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'lead-wa-101',
                name: 'Kavitha Reddy',
                phone: '+919988776655',
                property_type: 'villa',
                location: 'Tirupati',
                budget: '1.5 Cr',
                timeline: 'Immediate',
                source: 'whatsapp',
                lead_status: 'qualified',
                lead_score: 'warm',
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: { id: 'lead-wa-101' }, error: null }),
        }),
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

  it('1. verifies whatsapp-lead-agent is live and has correct tools bound in registry', () => {
    const emp = getCanonicalEmployeeBySlug('whatsapp-lead-agent')
    expect(emp).toBeDefined()
    expect(emp?.status).toBe('live')
    expect(emp?.demo_config.enabled).toBe(true)
    expect(emp?.tools).toEqual(['create_lead', 'search_knowledge_base'])
    expect(emp?.system_prompt).toContain('WhatsApp Sales & Lead Qualification Specialist')
  })

  it('2. enforces tool authorization boundaries for whatsapp-lead-agent', () => {
    const tools = resolveAuthorizedTools('whatsapp-lead-agent')
    const toolNames = tools.map((t) => t.name)

    expect(toolNames).toContain('create_lead')
    expect(toolNames).toContain('search_knowledge_base')
    expect(toolNames).not.toContain('schedule_site_visit')
    expect(toolNames).not.toContain('book_clinic_appointment')
    expect(toolNames).not.toContain('escalate_to_human')
  })

  it('3. executes create_lead and triggers wf-004 pipeline on WhatsApp source', async () => {
    const result = await dispatchToolCall('create_lead', {
      name: 'Kavitha Reddy',
      phone: '+919988776655',
      property_type: 'villa',
      location: 'Tirupati',
      budget: '1.5 Cr',
      timeline: 'Immediate',
      source: 'whatsapp',
    })

    expect(result.success).toBe(true)
    expect(result.toolName).toBe('create_lead')
    expect(result.result.workflowResult).toBeDefined()
    expect(result.result.workflowResult.workflowId).toBe('wf-004')
    expect(result.result.message).toContain('Kavitha Reddy')
    expect(result.result.message).toContain('registered with our sales team')

    // Verify persistence to workflow_executions
    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
  })

  it('4. executes executeWhatsAppLeadWorkflow with all 3 pipeline steps', async () => {
    const wfRes = await executeWhatsAppLeadWorkflow({
      leadId: 'lead-wa-202',
      conversationId: 'whatsapp_+919988776655',
      lead: {
        name: 'Kavitha Reddy',
        phone: '+919988776655',
        property_type: 'villa',
        location: 'Tirupati',
        budget: '1.5 Cr',
        timeline: 'Immediate',
      },
    })

    expect(wfRes.workflowId).toBe('wf-004')
    expect(wfRes.workflowName).toBe('Inbound WhatsApp Lead Qualification Pipeline (n8n)')
    expect(wfRes.steps).toHaveLength(3)
    expect(wfRes.steps[0].stepId).toBe('s1')
    expect(wfRes.steps[0].type).toBe('whatsapp')
    expect(wfRes.steps[1].stepId).toBe('s2')
    expect(wfRes.steps[1].type).toBe('ai_action')
    expect(wfRes.steps[2].stepId).toBe('s3')
    expect(wfRes.steps[2].type).toBe('n8n_webhook')
    expect(wfRes.customerConfirmationAllowed).toBe(true)
  })

  it('5. generates truthful customer message via getWhatsAppLeadCustomerMessage', () => {
    const successMsg = getWhatsAppLeadCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      { name: 'Kavitha', property_type: 'Villa', location: 'Tirupati' }
    )
    expect(successMsg).toContain('Thank you, Kavitha!')
    expect(successMsg).toContain('Villa in Tirupati')
    expect(successMsg).toContain('registered with our sales team')

    const failedMsg = getWhatsAppLeadCustomerMessage(
      { overallStatus: 'failed', customerConfirmationAllowed: false },
      { name: 'Kavitha', property_type: 'Villa', location: 'Tirupati' }
    )
    expect(failedMsg).toContain('sales team has been notified and will reach out')
  })

  it('6. executes complete multi-turn reasoning turn for whatsapp-lead-agent in runtime', async () => {
    // Turn 1: Model requests create_lead tool call
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: null,
      functionCalls: [
        {
          name: 'create_lead',
          args: {
            name: 'Kavitha Reddy',
            phone: '+919988776655',
            property_type: 'villa',
            location: 'Tirupati',
            budget: '1.5 Cr',
            source: 'whatsapp',
          },
        },
      ],
    })

    // Turn 2: Model returns response text
    mockGenerateContentWithTools.mockResolvedValueOnce({
      text: 'Thank you, Kavitha! Your details for a Villa in Tirupati have been registered with our sales team. An advisor will contact you on WhatsApp with matching options.',
      functionCalls: [],
    })

    const turnRes = await runAgentTurn({
      employeeSlug: 'whatsapp-lead-agent',
      message: 'I want to buy a 3 BHK Villa in Tirupati within 1.5 Cr.',
      channel: 'whatsapp',
      customerContext: { phone: '+919988776655', name: 'Kavitha Reddy' },
    })

    expect(turnRes.executedTools).toHaveLength(1)
    expect(turnRes.executedTools[0].toolName).toBe('create_lead')
    expect(turnRes.replyText).toContain('registered with our sales team')
    expect(turnRes.iterations).toBe(2)
  })
})
