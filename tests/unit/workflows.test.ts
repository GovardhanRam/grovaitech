import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getWorkflows, triggerTestWorkflow } from '@/app/actions/workflows'
import { saveWorkflowExecution } from '@/lib/workflows/executor'
import { createServerClient } from '@/lib/supabase/server'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('Workflows & Execution Persistence Layer', () => {
  let mockSupabase: any
  let mockDbData: any[]

  beforeEach(() => {
    vi.clearAllMocks()
    mockDbData = []

    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn(() => ({
          order: vi.fn(async () => ({
            data: table === 'workflow_executions' ? [...mockDbData] : [],
            error: null,
          })),
        })),
        insert: vi.fn(async (record: any) => {
          if (table === 'workflow_executions') {
            mockDbData.push(record)
          }
          return { data: record, error: null }
        }),
      })),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase)
  })

  it('falls back cleanly to canonical demo workflows when database is empty', async () => {
    const result = await getWorkflows()

    expect(result.success).toBe(true)
    expect(result.isFallback).toBe(true)
    expect(result.workflows.length).toBe(6)
    expect(result.workflows[0].id).toBe('wf-001')
  })

  it('merges live Supabase workflow_executions into wf-001 with calculated metrics', async () => {
    const now = new Date().toISOString()
    const past = new Date(Date.now() - 1000 * 60 * 30).toISOString()

    mockDbData = [
      {
        id: 'exec-1',
        workflow_id: 'wf-001',
        trigger_event: 'Lead Qualified & Site Visit Booked',
        status: 'success',
        overall_status: 'success',
        started_at: now,
        completed_at: now,
        duration_ms: 320,
        lead_name: 'Ananya Sharma',
        payload_summary: 'Qualified ₹1.5 Cr Villa lead. All live integrations verified.',
        steps: [
          { stepId: 's1', stepName: 'Insert Lead in CRM', status: 'success' },
          { stepId: 's2', stepName: 'Dispatch WhatsApp Template', status: 'success' },
        ],
        created_at: now,
      },
      {
        id: 'exec-2',
        workflow_id: 'wf-001',
        trigger_event: 'Lead Qualified',
        status: 'partial',
        overall_status: 'partial',
        started_at: past,
        completed_at: past,
        duration_ms: 210,
        lead_name: 'Vikram Seth',
        payload_summary: 'Qualified ₹85 Lakh 2BHK flat. Simulated WhatsApp & Calendar.',
        steps: [
          { stepId: 's1', stepName: 'Insert Lead in CRM', status: 'success' },
          { stepId: 's2', stepName: 'Dispatch WhatsApp Template', status: 'simulated' },
        ],
        created_at: past,
      },
    ]

    const result = await getWorkflows()

    expect(result.success).toBe(true)
    expect(result.isFallback).toBe(false)

    const wf001 = result.workflows.find((w) => w.id === 'wf-001')
    expect(wf001).toBeDefined()
    expect(wf001?.total_executions).toBe(2)
    expect(wf001?.success_rate).toBe(100) // Both success and partial count towards non-failed runs
    expect(wf001?.last_executed_at).toBe(now)
    expect(wf001?.executions.length).toBe(2)
    expect(wf001?.executions[0].lead_name).toBe('Ananya Sharma')
    expect(wf001?.executions[0].steps?.length).toBe(2)
  })

  it('correctly calculates success rate when a failed execution occurs', async () => {
    mockDbData = [
      {
        id: 'exec-success',
        workflow_id: 'wf-001',
        trigger_event: 'Lead Qualified',
        status: 'success',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 'exec-failed',
        workflow_id: 'wf-001',
        trigger_event: 'Lead Qualified',
        status: 'failed',
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    ]

    const result = await getWorkflows()
    const wf001 = result.workflows.find((w) => w.id === 'wf-001')

    expect(wf001?.total_executions).toBe(2)
    expect(wf001?.success_rate).toBe(50)
  })

  it('persists execution records to database via saveWorkflowExecution helper', async () => {
    const execResult = {
      executionId: 'exec-custom-001',
      workflowId: 'wf-001',
      workflowName: 'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
      leadId: 'lead-test-123',
      conversationId: 'chat-test-456',
      triggerEvent: 'Site Visit Booked',
      overallStatus: 'success' as const,
      hasSimulatedSteps: false,
      failedStepIds: [],
      customerConfirmationAllowed: true,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 275,
      steps: [
        {
          stepId: 's1',
          stepName: 'Insert Lead in CRM',
          type: 'database',
          status: 'success' as const,
          target: 'Supabase real_estate_leads',
          durationMs: 15,
          detail: 'Lead record saved.',
        },
      ],
      n8nResult: { status: 'dispatched' as const, statusCode: 200 },
    }

    await saveWorkflowExecution(execResult, 'Rajesh Varma')

    expect(mockSupabase.from).toHaveBeenCalledWith('workflow_executions')
    expect(mockDbData.length).toBe(1)
    expect(mockDbData[0].id).toBe('exec-custom-001')
    expect(mockDbData[0].lead_name).toBe('Rajesh Varma')
    expect(mockDbData[0].status).toBe('success')
  })

  it('triggers a test run for wf-001 and persists the execution record', async () => {
    const res = await triggerTestWorkflow('wf-001')

    expect(res.success).toBe(true)
    expect(res.workflowId).toBe('wf-001')
    expect(res.executionId).toBeDefined()
    expect(res.execution).toBeDefined()
    expect(res.execution.workflowId).toBe('wf-001')
    expect(mockDbData.length).toBeGreaterThanOrEqual(1)
  })

  it('handles database exceptions gracefully and returns fallback data without throwing', async () => {
    vi.mocked(createServerClient).mockRejectedValue(new Error('Connection timeout'))

    const result = await getWorkflows()

    expect(result.success).toBe(false)
    expect(result.isFallback).toBe(true)
    expect(result.workflows).toEqual(CANONICAL_DEMO_WORKFLOWS)
    expect(result.error).toContain('Connection timeout')
  })
})
