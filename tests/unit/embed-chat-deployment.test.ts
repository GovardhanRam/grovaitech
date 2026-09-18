/**
 * Grovaitech AI Platform
 * tests/unit/embed-chat-deployment.test.ts
 *
 * Unit and contract tests for the Public Embeddable AI Receptionist:
 * 1. Server-side deployment resolution in EmbedChatPage
 * 2. Inactive and missing deployment guardrails
 * 3. Tenant scoping and immunity to browser-supplied clientId injection
 * 4. Safe unauthenticated guest chat execution via /api/chats
 * 5. Lead capture and workflow attribution with tenant isolation
 * 6. Protection against internal dashboard/navigation exposure
 */

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EmbedChatPage, { generateMetadata } from '@/app/embed/chat/[deploymentId]/page'
import { POST as handleChatPost } from '@/app/api/chats/route'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { runAgentTurn } from '@/lib/ai/runtime'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow } from '@/lib/workflows/executor'
import * as leadsAction from '@/app/actions/leads'
import type { ClientDeployment } from '@/lib/deployment/types'
import { NextRequest } from 'next/server'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/ai/runtime', () => ({
  runAgentTurn: vi.fn(),
  resolveAuthorizedTools: vi.fn().mockReturnValue([
    { name: 'create_lead' },
    { name: 'search_knowledge_base' },
    { name: 'schedule_site_visit' },
  ]),
}))

vi.mock('@/lib/leads/extractor', () => ({
  extractRealEstateLead: vi.fn(),
}))

vi.mock('@/lib/workflows/executor', () => ({
  executeRealEstateWorkflow: vi.fn(),
  getSiteVisitCustomerMessage: vi.fn().mockReturnValue('Thank you. Preferred site-visit request received.'),
}))

vi.mock('@/app/actions/leads', () => ({
  createLead: vi.fn(),
}))

describe('Commercial Deployment: Public Embeddable AI Receptionist', () => {
  let mockServerSupabase: any
  let mockAdminSupabase: any

  const activeDeployment: ClientDeployment = {
    id: 'dep-greenfield-01',
    client_id: 'client-greenfield-corp',
    company_name: 'Greenfield Heights',
    industry: 'Real Estate',
    contact_name: 'Ravi Verma',
    contact_phone: '+919876543210',
    assigned_employee_id: 'emp-001',
    assigned_employee_name: 'Real Estate Lead Receptionist',
    assigned_employee_slug: 'real-estate-lead-receptionist',
    assigned_workflow_id: 'wf-001',
    assigned_workflow_name: 'Real Estate Lead to WhatsApp & Site Visit Sync',
    status: 'active',
    runtime_config: {
      deployment_id: 'dep-greenfield-01',
      client_id: 'client-greenfield-corp',
      company_name: 'Greenfield Heights',
      industry: 'Real Estate',
      location: 'Tirupati, AP',
      assigned_employee_slug: 'real-estate-lead-receptionist',
      assigned_workflow_id: 'wf-001',
      system_context_instruction: 'Focus on 2BHK and 3BHK luxury villas at Tirupati.',
      created_at: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockServerSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'chat-guest-001' }, error: null }),
    }

    mockAdminSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: activeDeployment, error: null }),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockServerSupabase as any)
    vi.mocked(createAdminClient).mockResolvedValue(mockAdminSupabase as any)
  })

  // ─── 1. Embed Route Server Component ───────────────────────────────────────

  describe('1. Embed Route Server Component (app/embed/chat/[deploymentId]/page.tsx)', () => {
    it('renders customer-facing chat interface for valid active deployment', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({ data: activeDeployment, error: null })

      const page = await EmbedChatPage({
        params: Promise.resolve({ deploymentId: 'dep-greenfield-01' }),
      })

      expect(page).toBeDefined()
      // Verify EmbedChatInterface props
      const child = (page as any).props.children
      expect(child.props.deploymentId).toBe('dep-greenfield-01')
      expect(child.props.companyName).toBe('Greenfield Heights')
      expect(child.props.employeeName).toBe('Real Estate Lead Receptionist')
      expect(child.props.location).toBe('Tirupati, AP')
    })

    it('generates accurate metadata for active deployment without exposing internals', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({
        data: { company_name: 'Greenfield Heights', status: 'active' },
        error: null,
      })

      const meta = await generateMetadata({
        params: Promise.resolve({ deploymentId: 'dep-greenfield-01' }),
      })

      expect(meta.title).toBe('Greenfield Heights — AI Receptionist')
      expect(meta.description).toContain('Greenfield Heights')
    })

    it('renders clean unavailable state when deployment is not found in database', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

      const page = (await EmbedChatPage({
        params: Promise.resolve({ deploymentId: 'dep-nonexistent-999' }),
      })) as any

      expect(page).toBeDefined()
      expect(page.props.message).toContain('dep-nonexistent-999')
      const innerHtml = JSON.stringify(page.type(page.props))
      expect(innerHtml).toContain('Receptionist Unavailable')
    })

    it('renders clean offline state when deployment is inactive, paused, or suspended', async () => {
      const inactiveDeployment = { ...activeDeployment, status: 'paused' }
      mockAdminSupabase.single.mockResolvedValueOnce({ data: inactiveDeployment, error: null })

      const page = (await EmbedChatPage({
        params: Promise.resolve({ deploymentId: 'dep-greenfield-01' }),
      })) as any

      expect(page).toBeDefined()
      expect(page.props.companyName).toBe('Greenfield Heights')
      expect(page.props.status).toBe('paused')
      const innerHtml = JSON.stringify(page.type(page.props))
      expect(innerHtml).toContain('Receptionist Currently Offline')
      expect(innerHtml).toContain('Greenfield Heights')
    })

    it('does NOT expose internal dashboard, sidebar navigation, or shell layout', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({ data: activeDeployment, error: null })

      const page = await EmbedChatPage({
        params: Promise.resolve({ deploymentId: 'dep-greenfield-01' }),
      })

      const stringified = JSON.stringify(page)
      expect(stringified).not.toContain('ShellLayout')
      expect(stringified).not.toContain('/dashboard')
      expect(stringified).not.toContain('Admin')
      expect(stringified).not.toContain('Superadmin')
    })
  })

  // ─── 2. Ingress & Chat API Route Handler ───────────────────────────────────

  describe('2. Chat Ingress Route Handler (POST /api/chats) with deploymentId', () => {
    function createJsonRequest(body: any) {
      return new NextRequest('http://localhost:3000/api/chats', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    it('resolves active deployment securely and passes authoritative tenant context to runtime', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({ data: activeDeployment, error: null })

      vi.mocked(runAgentTurn).mockResolvedValueOnce({
        replyText: 'Welcome to Greenfield Heights! We offer luxurious 3BHK villas starting at ₹1.2 Cr.',
        executedTools: [],
        workflowResult: null,
        leadResult: null,
        bookingResult: null,
        iterations: 1,
        hasSimulatedWorkflow: false,
      })

      const req = createJsonRequest({
        message: 'What villas do you offer in Tirupati?',
        deploymentId: 'dep-greenfield-01',
      })

      const res = await handleChatPost(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.message).toContain('Greenfield Heights')
      expect(json.deploymentId).toBe('dep-greenfield-01')

      // Verify runAgentTurn received authoritative server tenant context
      expect(runAgentTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeSlug: 'real-estate-lead-receptionist',
          channel: 'web_chat',
          executionMode: 'live',
          customerContext: expect.objectContaining({
            clientId: 'client-greenfield-corp',
            deploymentId: 'dep-greenfield-01',
          }),
          systemInstruction: expect.stringContaining('Focus on 2BHK and 3BHK luxury villas at Tirupati.'),
        })
      )
    })

    it('ignores and rejects any arbitrary browser-supplied clientId attempting to hijack ownership', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({ data: activeDeployment, error: null })

      vi.mocked(runAgentTurn).mockResolvedValueOnce({
        replyText: 'Hello from Greenfield Heights!',
        executedTools: [],
        workflowResult: null,
        leadResult: null,
        bookingResult: null,
        iterations: 1,
        hasSimulatedWorkflow: false,
      })

      // Attacker attempts to provide a fraudulent clientId in request body
      const req = createJsonRequest({
        message: 'Hello',
        deploymentId: 'dep-greenfield-01',
        clientId: 'client-attacker-fraudulent-tenant',
        client_id: 'client-attacker-fraudulent-tenant',
      })

      const res = await handleChatPost(req)
      expect(res.status).toBe(200)

      // Verified: customerContext MUST contain the true client_id from database, NEVER the attacker's
      expect(runAgentTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          customerContext: expect.objectContaining({
            clientId: 'client-greenfield-corp',
            deploymentId: 'dep-greenfield-01',
          }),
        })
      )
    })

    it('returns 404 when deploymentId does not exist in client_deployments', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

      const req = createJsonRequest({
        message: 'Hello',
        deploymentId: 'dep-unknown-invalid',
      })

      const res = await handleChatPost(req)
      const json = await res.json()

      expect(res.status).toBe(404)
      expect(json.error).toContain('was not found')
      expect(runAgentTurn).not.toHaveBeenCalled()
    })

    it('returns 403 when deployment is inactive', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({
        data: { ...activeDeployment, status: 'inactive' },
        error: null,
      })

      const req = createJsonRequest({
        message: 'Hello',
        deploymentId: 'dep-greenfield-01',
      })

      const res = await handleChatPost(req)
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.error).toContain('is in status "inactive"')
      expect(runAgentTurn).not.toHaveBeenCalled()
    })

    it('allows safe conversation for unauthenticated website guest visitors', async () => {
      // Unauthenticated visitor (auth.getUser returns null user)
      mockServerSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
      mockAdminSupabase.single.mockResolvedValueOnce({ data: activeDeployment, error: null })

      vi.mocked(runAgentTurn).mockResolvedValueOnce({
        replyText: 'Hello guest visitor!',
        executedTools: [],
        workflowResult: null,
        leadResult: null,
        bookingResult: null,
        iterations: 1,
        hasSimulatedWorkflow: false,
      })

      const req = createJsonRequest({
        message: 'I would like to explore villas',
        deploymentId: 'dep-greenfield-01',
      })

      const res = await handleChatPost(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.message).toBe('Hello guest visitor!')
      // Customer context userId should be null
      expect(runAgentTurn).toHaveBeenCalledWith(
        expect.objectContaining({
          customerContext: expect.objectContaining({
            userId: null,
          }),
        })
      )
    })

    it('persists extracted lead with client_id and deployment_id during passive extraction fallback', async () => {
      mockAdminSupabase.single.mockResolvedValueOnce({ data: activeDeployment, error: null })

      // Model returns text without function calls (0 tools executed)
      vi.mocked(runAgentTurn).mockResolvedValueOnce({
        replyText: 'Thank you for your interest. What is the best number to reach you?',
        executedTools: [],
        workflowResult: null,
        leadResult: null,
        bookingResult: null,
        iterations: 1,
        hasSimulatedWorkflow: false,
      })

      // Passive extractor detects qualified contact details & site visit request
      vi.mocked(extractRealEstateLead).mockResolvedValueOnce({
        qualification_status: 'qualified',
        name: 'Venkatesh Rao',
        phone: '+91 94444 55555',
        email: 'venkatesh@example.com',
        property_type: 'villa',
        location: 'Tirupati',
        budget: '₹1.5 Cr',
        timeline: 'This month',
        site_visit_requested: true,
        site_visit_date: 'Saturday',
        site_visit_time: '11:00 AM',
        qualification_score: 95,
        bhk: 3,
        intent: 'Buy Luxury Villa',
      } as any)

      vi.mocked(leadsAction.createLead).mockResolvedValueOnce({
        success: true,
        isUpdate: false,
        data: {
          id: 'lead-persisted-101',
          name: 'Venkatesh Rao',
          phone: '+91 94444 55555',
          client_id: 'client-greenfield-corp',
          deployment_id: 'dep-greenfield-01',
          site_visit_requested: true,
        } as any,
      } as any)

      vi.mocked(executeRealEstateWorkflow).mockResolvedValueOnce({
        workflowId: 'wf-001',
        overallStatus: 'success',
        customerConfirmationAllowed: false,
        leadId: 'lead-persisted-101',
      } as any)

      const req = createJsonRequest({
        message: 'My name is Venkatesh Rao, phone is +91 94444 55555. Can I visit this Saturday at 11 AM?',
        deploymentId: 'dep-greenfield-01',
      })

      const res = await handleChatPost(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      // Verify createLead was called with tenant-scoped attribution
      expect(leadsAction.createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Venkatesh Rao',
          phone: '+91 94444 55555',
          client_id: 'client-greenfield-corp',
          deployment_id: 'dep-greenfield-01',
          site_visit_requested: true,
        })
      )
      // Verify workflow was dispatched
      expect(executeRealEstateWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-persisted-101',
        })
      )
      expect(json.lead?.id).toBe('lead-persisted-101')
    })
  })
})
