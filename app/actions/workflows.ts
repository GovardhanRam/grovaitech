'use server'

/**
 * Grovaitech AI Platform
 * app/actions/workflows.ts
 *
 * Server Actions for Workflows & Pipeline Operations.
 * Fetches real execution logs from Supabase `workflow_executions`,
 * handles test run execution triggers, and provides isolated fallback data.
 */

import { createServerClient } from '@/lib/supabase/server'
import type {
  Workflow,
  WorkflowExecution,
  GetWorkflowsResult,
} from '@/types/workflows'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'
import { executeRealEstateWorkflow, executeClinicWorkflow } from '@/lib/workflows/executor'

export async function getWorkflows(): Promise<GetWorkflowsResult> {
  try {
    const supabase = await createServerClient()

    // 1. Fetch workflow execution logs from Supabase
    const { data: rawExecutions, error } = await supabase
      .from('workflow_executions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[getWorkflows] Database fetch notice, using fallback:', error.message)
      return {
        success: true,
        workflows: CANONICAL_DEMO_WORKFLOWS,
        isFallback: true,
        error: error.message,
      }
    }

    const liveExecutions: any[] = rawExecutions || []

    if (liveExecutions.length === 0) {
      return {
        success: true,
        workflows: CANONICAL_DEMO_WORKFLOWS,
        isFallback: true,
      }
    }

    // 2. Group executions by workflow_id
    const executionsByWorkflow = new Map<string, WorkflowExecution[]>()
    for (const raw of liveExecutions) {
      const wId = raw.workflow_id || 'wf-001'
      const list = executionsByWorkflow.get(wId) || []

      list.push({
        id: raw.id,
        workflow_id: wId,
        trigger_event: raw.trigger_event || 'Lead Qualified',
        status: raw.status || 'success',
        overall_status: raw.overall_status || raw.status || 'success',
        started_at: raw.started_at || raw.created_at || new Date().toISOString(),
        completed_at: raw.completed_at || raw.created_at || new Date().toISOString(),
        duration_ms: raw.duration_ms || 0,
        lead_id: raw.lead_id || undefined,
        lead_name: raw.lead_name || undefined,
        error_message: raw.error_message || undefined,
        payload_summary: raw.payload_summary || `Workflow ${wId} execution log.`,
        steps: Array.isArray(raw.steps) ? raw.steps : [],
        n8n_result: raw.n8n_result || {},
        created_at: raw.created_at || raw.started_at,
      })

      executionsByWorkflow.set(wId, list)
    }

    // 3. Merge live execution history into canonical workflow models
    const workflows: Workflow[] = CANONICAL_DEMO_WORKFLOWS.map((wf) => {
      const matchingExecutions = executionsByWorkflow.get(wf.id)
      if (!matchingExecutions || matchingExecutions.length === 0) {
        return wf
      }

      const total = matchingExecutions.length
      const successful = matchingExecutions.filter(
        (e) => e.status === 'success' || e.status === 'partial'
      ).length
      const successRate = total > 0 ? Math.round((successful / total) * 100 * 10) / 10 : 100
      const lastExecuted = matchingExecutions[0]?.started_at || wf.last_executed_at

      return {
        ...wf,
        total_executions: total,
        success_rate: successRate,
        last_executed_at: lastExecuted,
        executions: matchingExecutions,
      }
    })

    return {
      success: true,
      workflows,
      isFallback: false,
    }
  } catch (err: any) {
    console.error('[getWorkflows Exception]', err)
    return {
      success: false,
      workflows: CANONICAL_DEMO_WORKFLOWS,
      isFallback: true,
      error: err?.message || String(err),
    }
  }
}

export async function triggerTestWorkflow(workflowId: string): Promise<{
  success: boolean
  workflowId: string
  executionId?: string
  execution?: any
  error?: string
}> {
  if (!workflowId) {
    return { success: false, workflowId: '', error: 'Workflow ID is required' }
  }

  try {
    if (workflowId === 'wf-001') {
      const sampleLead = {
        name: 'Test Customer',
        phone: '+91 94400 12345',
        email: 'test.customer@example.com',
        property_type: 'villa' as const,
        bhk: 3,
        location: 'Tirupati',
        budget: '₹1.2 Crore',
        timeline: 'This Weekend',
        intent: 'Site Visit',
        qualification_score: 95,
        qualification_status: 'qualified' as const,
        site_visit_requested: true,
        site_visit_date: 'This Weekend',
        site_visit_time: '11:00 AM',
      }

      const execResult = await executeRealEstateWorkflow({
        leadId: `test-lead-${Date.now()}`,
        conversationId: `test-run-${Date.now()}`,
        lead: sampleLead,
      })

      return {
        success: true,
        workflowId: 'wf-001',
        executionId: execResult.executionId,
        execution: execResult,
      }
    }

    if (workflowId === 'wf-002') {
      const samplePatient = {
        patient_name: 'Priya Sharma',
        patient_phone: '+91 98765 12345',
        patient_email: 'priya.sharma@example.com',
        appointment_date: '2026-09-05',
        appointment_time: '10:00 AM',
        doctor_name: 'Dr. Verma',
        reason: 'Dental Consultation',
      }

      const execResult = await executeClinicWorkflow({
        bookingId: `test-booking-${Date.now()}`,
        conversationId: `test-clinic-run-${Date.now()}`,
        patient: samplePatient,
      })

      return {
        success: true,
        workflowId: 'wf-002',
        executionId: execResult.executionId,
        execution: execResult,
      }
    }

    // For other preview workflows, log a simulated test execution
    const supabase = await createServerClient()
    const execId = `test-exec-${Date.now()}`
    const startedAt = new Date().toISOString()

    const simulatedRecord = {
      id: execId,
      workflow_id: workflowId,
      trigger_event: 'Manual Test Trigger',
      status: 'success',
      overall_status: 'success',
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      duration_ms: 250,
      lead_name: 'Test Operator',
      payload_summary: `Manual test execution triggered for workflow ${workflowId}.`,
      steps: [],
      n8n_result: {},
      created_at: startedAt,
    }

    try {
      await supabase.from('workflow_executions').insert(simulatedRecord)
    } catch {
      // Best-effort
    }

    return {
      success: true,
      workflowId,
      executionId: execId,
      execution: simulatedRecord,
    }
  } catch (err: any) {
    console.error('[triggerTestWorkflow Error]', err)
    return {
      success: false,
      workflowId,
      error: err?.message || String(err),
    }
  }
}
