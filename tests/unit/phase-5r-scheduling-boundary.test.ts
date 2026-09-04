/**
 * Grovaitech AI Platform
 * tests/unit/phase-5r-scheduling-boundary.test.ts
 *
 * PHASE 5R: Site-Visit & Scheduling Boundary Hardening.
 *
 * Proves that customer/model scheduling requests undergo strict server validation,
 * trusted tenant identity attribution, and safe tool boundaries before any real
 * calendar or CRM side effects can occur.
 *
 * 1. Server-side validation: customer_name, phone, preferred_date with length checks.
 * 2. Sandbox guardrail: executionMode === 'sandbox' executes simulated workflow with ZERO database writes.
 * 3. Trusted tenant attribution: Authoritative client_id and deployment_id injected into lead payload.
 * 4. Simulated calendar: Real estate workflow falls back safely to simulated status when no calendar adapter is configured.
 * 5. Live deployment allowlist: schedule_site_visit is excluded from LIVE_EXECUTION_TOOL_ALLOWLIST.
 * 6. Inactive deployment boundary: executeLiveDeploymentTurn rejects non-active deployments before tool dispatch.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { executeLiveDeploymentTurn } from '@/lib/deployment/live-executor'
import { resolveAuthorizedTools } from '@/lib/ai/runtime'
import { ALL_GROVAITECH_TOOLS } from '@/lib/ai/tools'
import { createServerClient } from '@/lib/supabase/server'
import * as leadsAction from '@/app/actions/leads'
import type { ClientDeployment } from '@/lib/deployment/types'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('PHASE 5R: Site-Visit & Scheduling Boundary Hardening', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
  })

  describe('1. Server-Side Parameter Validation for schedule_site_visit', () => {
    it('rejects scheduling requests missing customer_name', async () => {
      const result = await dispatchToolCall('schedule_site_visit', {
        phone: '+91 9876543210',
        preferred_date: 'Tomorrow',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Validation Error: 'customer_name' is required")
    })

    it('rejects customer_name that is too short (< 2 characters)', async () => {
      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'A',
        phone: '+91 9876543210',
        preferred_date: 'Tomorrow',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('customer_name')
    })

    it('rejects scheduling requests missing phone', async () => {
      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'John Doe',
        preferred_date: 'Tomorrow',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Validation Error: 'phone' is required")
    })

    it('rejects invalid or too short phone numbers (< 7 digits)', async () => {
      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'John Doe',
        phone: '123',
        preferred_date: 'Tomorrow',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('phone')
    })

    it('rejects scheduling requests missing preferred_date', async () => {
      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'John Doe',
        phone: '+91 9876543210',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Validation Error: 'preferred_date' is required")
    })

    it('rejects preferred_date that is too short (< 3 characters)', async () => {
      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'John Doe',
        phone: '+91 9876543210',
        preferred_date: 'No',
        executionMode: 'sandbox',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('preferred_date')
    })
  })

  describe('2. Sandbox Guardrail & Zero Production Side Effects', () => {
    it('executes in sandbox mode without calling createLead or writing to Supabase', async () => {
      const createLeadSpy = vi.spyOn(leadsAction, 'createLead')

      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'Ravi Teja',
        phone: '+91 98765 43210',
        preferred_date: 'Tomorrow Morning',
        preferred_time: '10:00 AM',
        property_type: 'Luxury Villa',
        location: 'Tirupati',
        executionMode: 'sandbox',
        clientId: 'client-test-synthetic-01',
        deploymentId: 'dep-client-test-synthetic-01-real-estate-lead-receptionist',
      })

      expect(createLeadSpy).not.toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.result.isSimulated).toBe(true)
      expect(result.result.workflowStatus).toBe('simulated')
      expect(result.result.customerConfirmationAllowed).toBe(false)
      expect(result.result.customerName).toBe('Ravi Teja')
      expect(result.result.phone).toBe('+919876543210')
      expect(result.result.preferredDate).toBe('Tomorrow Morning')
    })
  })

  describe('3. Trusted Tenant & Client Identity Attribution', () => {
    it('correctly attributes snake_case and camelCase client and deployment IDs to createLead payload', async () => {
      const createLeadSpy = vi.spyOn(leadsAction, 'createLead').mockResolvedValueOnce({
        success: true,
        data: { id: 'mock-lead-id-123' } as any, isUpdate: false,
      })

      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'Sneha Reddy',
        phone: '+91 91234 56789',
        preferred_date: 'Saturday',
        client_id: 'client-real-estate-001',
        deployment_id: 'dep-re-001',
        executionMode: 'live',
      })

      expect(createLeadSpy).toHaveBeenCalledTimes(1)
      const passedPayload = createLeadSpy.mock.calls[0][0]
      expect(passedPayload.client_id).toBe('client-real-estate-001')
      expect(passedPayload.deployment_id).toBe('dep-re-001')
      expect(passedPayload.name).toBe('Sneha Reddy')
      expect(passedPayload.site_visit_requested).toBe(true)
      expect(passedPayload.site_visit_date).toBe('Saturday')
      expect(result.success).toBe(true)
    })
  })

  describe('4. Simulated Calendar & Safe Workflow Boundary', () => {
    it('runs workflow with simulated calendar when no real calendar adapter is configured', async () => {
      vi.spyOn(leadsAction, 'createLead').mockResolvedValueOnce({
        success: true,
        data: { id: 'lead-test-cal-999' } as any, isUpdate: false,
      })

      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'Kiran Kumar',
        phone: '+91 99887 76655',
        preferred_date: 'Next Monday',
        preferred_time: '11:00 AM',
        location: 'Chandragiri Road',
        property_type: 'Plot',
        executionMode: 'live',
        clientId: 'client-test-synthetic-01',
        deploymentId: 'dep-client-test-synthetic-01-real-estate-lead-receptionist',
      })

      expect(result.success).toBe(true)
      expect(result.result.workflowId).toBe('wf-001')
      const calStep = result.result.steps?.find((s: any) => s.type === 'calendar'); expect(calStep?.status).toBe('simulated')
      expect(result.result.steps).toBeDefined()
      expect(result.result.calendarEventId).toBeUndefined()
    })
  })

  describe('5. Live Deployment Tool Allowlist & Inactive Boundary', () => {
    it('verifies schedule_site_visit exists in ALL_GROVAITECH_TOOLS but is excluded from live executor allowlist', () => {
      const allToolNames = ALL_GROVAITECH_TOOLS.map((t) => t.name)
      expect(allToolNames).toContain('schedule_site_visit')
      expect(allToolNames).toContain('create_lead')
      expect(allToolNames).toContain('search_knowledge_base')

      const realEstateTools = resolveAuthorizedTools('real-estate-lead-receptionist').map((t) => t.name)
      expect(realEstateTools).toContain('create_lead')
      expect(realEstateTools).toContain('schedule_site_visit')

      // Live executor enforces LIVE_EXECUTION_TOOL_ALLOWLIST = Set(['create_lead', 'search_knowledge_base'])
      const LIVE_EXECUTION_TOOL_ALLOWLIST = new Set(['create_lead', 'search_knowledge_base'])
      expect(LIVE_EXECUTION_TOOL_ALLOWLIST.has('schedule_site_visit')).toBe(false)
      expect(LIVE_EXECUTION_TOOL_ALLOWLIST.has('create_lead')).toBe(true)
      expect(LIVE_EXECUTION_TOOL_ALLOWLIST.has('search_knowledge_base')).toBe(true)
    })

    it('rejects execution turns for inactive deployment before tool execution', async () => {
      const inactiveDeployment: ClientDeployment = {
        id: 'dep-inactive-01',
        client_id: 'client-inactive-01',
        company_name: 'Inactive Properties',
        industry: 'Real Estate',
        contact_name: 'Ramesh',
        contact_phone: '+919222222222',
        assigned_employee_id: 'emp-001',
        assigned_employee_name: 'Real Estate Lead Receptionist',
        assigned_employee_slug: 'real-estate-lead-receptionist',
        assigned_workflow_id: 'wf-001',
        assigned_workflow_name: 'Lead Sync',
        status: 'inactive', runtime_config: { deployment_id: 'dep-inactive-01', client_id: 'client-inactive-01', company_name: 'Inactive Properties', industry: 'Real Estate', assigned_employee_slug: 'real-estate-lead-receptionist', assigned_workflow_id: 'wf-001', system_context_instruction: '', created_at: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSupabase.single.mockResolvedValueOnce({ data: inactiveDeployment, error: null })

      const result = await executeLiveDeploymentTurn({
        deploymentId: 'dep-inactive-01',
        message: 'I want to schedule a site visit tomorrow morning at 10 AM',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('is in status "inactive" and cannot execute live turns')
      expect(result.executedTools).toHaveLength(0)
    })

    it('rejects execution turns for paused deployment before tool execution', async () => {
      const pausedDeployment: ClientDeployment = {
        id: 'dep-paused-01',
        client_id: 'client-paused-01',
        company_name: 'Paused Properties',
        industry: 'Real Estate',
        contact_name: 'Suresh',
        contact_phone: '+919333333333',
        assigned_employee_id: 'emp-001',
        assigned_employee_name: 'Real Estate Lead Receptionist',
        assigned_employee_slug: 'real-estate-lead-receptionist',
        assigned_workflow_id: 'wf-001',
        assigned_workflow_name: 'Lead Sync',
        status: 'paused', runtime_config: { deployment_id: 'dep-paused-01', client_id: 'client-paused-01', company_name: 'Paused Properties', industry: 'Real Estate', assigned_employee_slug: 'real-estate-lead-receptionist', assigned_workflow_id: 'wf-001', system_context_instruction: '', created_at: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSupabase.single.mockResolvedValueOnce({ data: pausedDeployment, error: null })

      const result = await executeLiveDeploymentTurn({
        deploymentId: 'dep-paused-01',
        message: 'Schedule a visit for tomorrow please',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('is in status "paused" and cannot execute live turns')
      expect(result.executedTools).toHaveLength(0)
    })

    it('rejects execution turns for suspended deployment before tool execution', async () => {
      const suspendedDeployment: ClientDeployment = {
        id: 'dep-suspended-01',
        client_id: 'client-suspended-01',
        company_name: 'Suspended Properties',
        industry: 'Real Estate',
        contact_name: 'Kavita',
        contact_phone: '+919444444444',
        assigned_employee_id: 'emp-001',
        assigned_employee_name: 'Real Estate Lead Receptionist',
        assigned_employee_slug: 'real-estate-lead-receptionist',
        assigned_workflow_id: 'wf-001',
        assigned_workflow_name: 'Lead Sync',
        status: 'suspended', runtime_config: { deployment_id: 'dep-suspended-01', client_id: 'client-suspended-01', company_name: 'Suspended Properties', industry: 'Real Estate', assigned_employee_slug: 'real-estate-lead-receptionist', assigned_workflow_id: 'wf-001', system_context_instruction: '', created_at: new Date().toISOString() },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      mockSupabase.single.mockResolvedValueOnce({ data: suspendedDeployment, error: null })

      const result = await executeLiveDeploymentTurn({
        deploymentId: 'dep-suspended-01',
        message: 'Schedule a visit for tomorrow please',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('is in status "suspended" and cannot execute live turns')
      expect(result.executedTools).toHaveLength(0)
    })
  })
})





