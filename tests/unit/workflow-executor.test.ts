import { afterEach, describe, expect, it, vi } from 'vitest'
import { executeRealEstateWorkflow, type WorkflowExecutionAdapters } from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  }),
}))

const lead = {
  name: 'Priya Patel',
  phone: '+919988776655',
  email: null,
  property_type: 'villa',
  bhk: 3,
  location: 'Tirupati',
  budget: '1.5 Cr',
  timeline: 'Immediate',
  intent: 'Site Visit',
  qualification_score: 95,
  qualification_status: 'qualified',
  site_visit_requested: true,
  site_visit_date: '2026-09-05',
  site_visit_time: '11:00 AM',
} as any

const liveAdapters: WorkflowExecutionAdapters = {
  dispatchWhatsAppTemplate: async () => ({ status: 'success', detail: 'Verified WhatsApp template dispatch.' }),
  createCalendarEvent: async () => ({ status: 'success', detail: 'Verified calendar event creation.' }),
}

async function execute(adapters?: WorkflowExecutionAdapters) {
  return executeRealEstateWorkflow({
    leadId: 'lead_001',
    conversationId: 'chat_001',
    lead,
    adapters,
  })
}

describe('lib/workflows/executor - truthful execution status', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('returns success only when every required step has a verified live result', async () => {
    vi.stubEnv('N8N_WEBHOOK_URL', 'https://n8n.example.test/webhook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const result = await execute(liveAdapters)

    expect(result.overallStatus).toBe('success')
    expect(result.hasSimulatedSteps).toBe(false)
    expect(result.failedStepIds).toEqual([])
    expect(result.customerConfirmationAllowed).toBe(true)
  })

  it('returns partial when a required integration is simulated', async () => {
    vi.stubEnv('N8N_WEBHOOK_URL', 'https://n8n.example.test/webhook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const result = await execute({ createCalendarEvent: liveAdapters.createCalendarEvent })

    expect(result.overallStatus).toBe('partial')
    expect(result.hasSimulatedSteps).toBe(true)
    expect(result.failedStepIds).toEqual([])
    expect(result.customerConfirmationAllowed).toBe(false)
    expect(result.steps.find((step) => step.stepId === 's2')?.status).toBe('simulated')
  })

  it('returns failed when a required integration fails', async () => {
    vi.stubEnv('N8N_WEBHOOK_URL', 'https://n8n.example.test/webhook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const result = await execute({
      ...liveAdapters,
      createCalendarEvent: async () => ({ status: 'failed', detail: 'Calendar API rejected the event.' }),
    })

    expect(result.overallStatus).toBe('failed')
    expect(result.failedStepIds).toContain('s3')
    expect(result.customerConfirmationAllowed).toBe(false)
  })

  it('returns failed for an n8n non-2xx response', async () => {
    vi.stubEnv('N8N_WEBHOOK_URL', 'https://n8n.example.test/webhook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }))

    const result = await execute(liveAdapters)

    expect(result.overallStatus).toBe('failed')
    expect(result.failedStepIds).toContain('s4')
    expect(result.steps.find((step) => step.stepId === 's4')?.status).toBe('failed')
  })

  it('returns failed for an n8n network or timeout error', async () => {
    vi.stubEnv('N8N_WEBHOOK_URL', 'https://n8n.example.test/webhook')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection timeout')))

    const result = await execute(liveAdapters)

    expect(result.overallStatus).toBe('failed')
    expect(result.failedStepIds).toContain('s4')
    expect(result.steps.find((step) => step.stepId === 's4')?.status).toBe('failed')
  })

  it('returns partial for unavailable integrations even when credentials are present', async () => {
    vi.stubEnv('META_WHATSAPP_TOKEN', 'configured-but-not-an-adapter-token')
    vi.stubEnv('GOOGLE_CALENDAR_CLIENT_EMAIL', 'calendar@example.test')

    const result = await execute()

    expect(result.overallStatus).toBe('partial')
    expect(result.hasSimulatedSteps).toBe(true)
    expect(result.customerConfirmationAllowed).toBe(false)
    expect(result.steps.map((step) => step.status)).toContain('simulated')
  })
})
