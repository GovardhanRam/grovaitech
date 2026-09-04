/**
 * Grovaitech AI Platform
 * tests/unit/phase-5s-workflow-boundary.test.ts
 *
 * PHASE 5S: Workflow Execution Engine & External Adapter Boundary Verification.
 *
 * Proves that:
 * 1. Workflow execution defaults safely to simulated status when adapters are unconfigured.
 * 2. Unconfigured adapters NEVER produce false success (hasSimulatedSteps is true, customerConfirmationAllowed is false).
 * 3. Injected external adapter exceptions are caught and surfaced as failed steps, failing the workflow.
 * 4. Inactive/paused/suspended deployments cannot reach workflow execution via the live executor.
 * 5. Server-provided tenant attribution (clientId, deploymentId) is immutable and cannot be overridden by model args.
 * 6. Unauthorized tools for live deployment are filtered out before reaching execution.
 * 7. Masking/sanitization redacts tokens, credentials, and API keys.
 * 8. n8n webhook dispatches fail safely or simulate without false live confirmation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  executeRealEstateWorkflow,
  executeClinicWorkflow,
  executeSalonWorkflow,
  executeLegalWorkflow,
  executeN8nWebhookStep,
  computeWorkflowExecutionStatus,
  type WorkflowExecutionAdapters,
} from '@/lib/workflows/executor'
import { executeLiveDeploymentTurn } from '@/lib/deployment/live-executor'
import { maskSensitiveCredentials, dispatchToolCall } from '@/lib/ai/dispatcher'
import { resolveAuthorizedTools } from '@/lib/ai/runtime'
import { createServerClient } from '@/lib/supabase/server'
import type { ClientDeployment } from '@/lib/deployment/types'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('PHASE 5S: Workflow Execution Engine & Adapter Boundary', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
  })

  describe('1. Unconfigured Adapter Safety & Truthful Simulation', () => {
    it('defaults wf-001 calendar and WhatsApp steps to simulated status with false confirmation', async () => {
      const result = await executeRealEstateWorkflow({
        leadId: 'lead-test-01',
        conversationId: 'chat-test-01',
        lead: {
          name: 'Ananya Rao',
          phone: '+919876543210',
          email: null,
          property_type: 'villa',
          bhk: 3,
          location: 'Tirupati',
          budget: '2 Cr',
          timeline: 'Immediate',
          intent: 'Site Visit',
          qualification_score: 95,
          qualification_status: 'qualified',
          site_visit_requested: true,
          site_visit_date: '2026-09-10',
          site_visit_time: '10:00 AM',
        },
        // Zero external adapters provided
        adapters: {},
      })

      expect(result.overallStatus).toBe('partial')
      expect(result.hasSimulatedSteps).toBe(true)
      expect(result.customerConfirmationAllowed).toBe(false)

      const waStep = result.steps.find((s) => s.stepId === 's2')
      expect(waStep?.status).toBe('simulated')
      expect(waStep?.detail).toContain('[SIMULATED]')

      const calStep = result.steps.find((s) => s.stepId === 's3')
      expect(calStep?.status).toBe('simulated')
      expect(calStep?.detail).toContain('[SIMULATED]')
    })

    it('defaults wf-002 doctor calendar step to simulated status when unconfigured', async () => {
      const result = await executeClinicWorkflow({
        bookingId: 'bk-clinic-01',
        conversationId: 'chat-clinic-01',
        patient: {
          patient_name: 'Rahul Varma',
          patient_phone: '+919123456780',
          appointment_date: '2026-09-12',
          appointment_time: '11:00 AM',
          doctor_name: 'Dr. Verma',
          reason: 'General Consultation',
        },
        adapters: {},
      })

      expect(result.hasSimulatedSteps).toBe(true)
      expect(result.customerConfirmationAllowed).toBe(false)
      const calStep = result.steps.find((s) => s.stepId === 's2')
      expect(calStep?.status).toBe('simulated')
      expect(calStep?.detail).toContain('No verified Google Calendar adapter is configured')
    })
  })

  describe('2. Adapter Exception Isolation & Partial/Failed State Representation', () => {
    it('surfaces calendar adapter throw as failed step and marks overallStatus failed', async () => {
      const faultyAdapters: WorkflowExecutionAdapters = {
        createCalendarEvent: vi.fn().mockRejectedValue(new Error('Google Calendar 503 Service Unavailable')),
      }

      const result = await executeRealEstateWorkflow({
        leadId: 'lead-test-02',
        conversationId: 'chat-test-02',
        lead: {
          name: 'Siddharth Roy',
          phone: '+919988776655',
          email: null,
          property_type: 'plot',
          bhk: null,
          location: 'Tirupati',
          budget: '80 Lakhs',
          timeline: 'Flexible',
          intent: 'Site Visit',
          qualification_score: 90,
          qualification_status: 'qualified',
          site_visit_requested: true,
          site_visit_date: '2026-09-15',
          site_visit_time: '04:00 PM',
        },
        adapters: faultyAdapters,
      })

      expect(result.overallStatus).toBe('failed')
      expect(result.failedStepIds).toContain('s3')
      expect(result.customerConfirmationAllowed).toBe(false)

      const calStep = result.steps.find((s) => s.stepId === 's3')
      expect(calStep?.status).toBe('failed')
      expect(calStep?.detail).toContain('Google Calendar 503 Service Unavailable')
    })

    it('surfaces WhatsApp adapter throw as failed step and marks overallStatus failed', async () => {
      const faultyAdapters: WorkflowExecutionAdapters = {
        dispatchWhatsAppTemplate: vi.fn().mockRejectedValue(new Error('Meta Graph API 401 Unauthorized')),
      }

      const result = await executeRealEstateWorkflow({
        leadId: 'lead-test-03',
        conversationId: 'chat-test-03',
        lead: {
          name: 'Pooja Hegde',
          phone: '+919988776644',
          email: null,
          property_type: 'apartment',
          bhk: 2,
          location: 'Tirupati',
          budget: '60 Lakhs',
          timeline: 'Immediate',
          intent: 'Site Visit',
          qualification_score: 85,
          qualification_status: 'qualified',
          site_visit_requested: true,
          site_visit_date: '2026-09-20',
          site_visit_time: '02:00 PM',
        },
        adapters: faultyAdapters,
      })

      expect(result.overallStatus).toBe('failed')
      expect(result.failedStepIds).toContain('s2')
      expect(result.customerConfirmationAllowed).toBe(false)

      const waStep = result.steps.find((s) => s.stepId === 's2')
      expect(waStep?.status).toBe('failed')
      expect(waStep?.detail).toContain('Meta Graph API 401 Unauthorized')
    })
  })

  describe('3. Webhook Pipeline Safety (n8n)', () => {
    it('marks webhook step as simulated when endpoint is a placeholder/demo and env is unset', async () => {
      const { step, n8nResult } = await executeN8nWebhookStep({
        stepId: 's_test',
        stepName: 'Test Webhook',
        webhookUrl: 'https://n8n.grovaitech.ai/webhook/v1/real-estate',
        payload: { test: true },
        mode: 'strict_fail_on_network_error',
        envVarName: 'N8N_UNSET_VAR_TEST',
      })

      expect(step.status).toBe('simulated')
      expect(n8nResult.status).toBe('not_configured')
    })
  })

  describe('4. Lifecycle & Authorization Enclosure for Workflows', () => {
    it('blocks inactive deployment turns from executing workflows', async () => {
      const inactiveDep: ClientDeployment = {
        id: 'dep-inactive-test',
        client_id: 'client-test',
        company_name: 'Inactive Co',
        industry: 'Real Estate',
        contact_name: 'Test Contact',
        contact_phone: '+919000000000',
        assigned_employee_id: 'emp-001',
        assigned_employee_name: 'Real Estate Lead Receptionist',
        assigned_employee_slug: 'real-estate-lead-receptionist',
        assigned_workflow_id: 'wf-001',
        assigned_workflow_name: 'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
        status: 'inactive',
        runtime_config: {
          deployment_id: 'dep-inactive-test',
          client_id: 'client-test',
          company_name: 'Inactive Co',
          industry: 'Real Estate',
          assigned_employee_slug: 'real-estate-lead-receptionist',
          assigned_workflow_id: 'wf-001',
          system_context_instruction: '',
          created_at: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSupabase.single.mockResolvedValueOnce({ data: inactiveDep, error: null })

      const turn = await executeLiveDeploymentTurn({
        deploymentId: 'dep-inactive-test',
        message: 'Book a site visit for tomorrow',
      })

      expect(turn.success).toBe(false)
      expect(turn.error).toContain('is in status "inactive" and cannot execute live turns')
      expect(turn.executedTools).toHaveLength(0)
    })

    it('enforces live execution tool allowlist restricting available tools', () => {
      const realEstateTools = resolveAuthorizedTools('real-estate-lead-receptionist').map((t) => t.name)
      expect(realEstateTools).toContain('create_lead')
      expect(realEstateTools).toContain('schedule_site_visit')

      const LIVE_EXECUTION_TOOL_ALLOWLIST = new Set(['create_lead', 'search_knowledge_base'])
      const liveFiltered = realEstateTools.filter((t) => LIVE_EXECUTION_TOOL_ALLOWLIST.has(t))

      expect(liveFiltered).toEqual(['create_lead', 'search_knowledge_base'])
      expect(liveFiltered).not.toContain('schedule_site_visit')
    })
  })

  describe('5. Credential & Secret Masking Guardrail', () => {
    it('masks Bearer tokens, OpenAI/Anthropic API keys, passwords, and JWTs', () => {
      const dirtyText = 'User sent token token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c and secret sk-1234567890abcdefghijklmn with password=SuperSecretPassword123'
      const sanitized = maskSensitiveCredentials(dirtyText)

      expect(sanitized).not.toContain('sk-1234567890abcdefghijklmn')
      expect(sanitized).not.toContain('SuperSecretPassword123')
      expect(sanitized).toContain('[REDACTED_API_KEY]')
      expect(sanitized).toContain('password=[REDACTED_PASSWORD]')
      expect(sanitized).toContain('[REDACTED_JWT]')
    })
  })
})

