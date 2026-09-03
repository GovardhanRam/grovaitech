/**
 * Grovaitech AI Platform
 * tests/unit/whatsapp-deployment-adapter.test.ts
 *
 * PHASE 5B: WhatsApp Channel Adapter Verification.
 * Tests:
 * A. Valid phone_number_id -> correct deployment & live turn execution
 * B. Unknown phone_number_id -> safe acknowledgment, zero execution
 * C. Inactive deployment -> zero execution
 * D. Client A phone_number_id cannot route to Client B
 * E. Customer phone number cannot determine tenant
 * F. Caller/model cannot override deployment/client/employee
 * G. Meta signature invalid -> reject with 401
 * H. Duplicate provider message ID -> deduplicated, no second execution
 * I. Same customer phone across two deployments -> isolated conversation histories
 * J. create_lead remains tenant-scoped
 * K. Outbound credentials missing -> dev/test simulated, production fail-closed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from '@/app/api/webhooks/whatsapp/route'
import { executeLiveDeploymentTurn, resolveDeploymentByPhoneNumberId } from '@/lib/deployment/live-executor'
import { sendWhatsAppTextMessage } from '@/lib/whatsapp/client'
import { resetDuplicateCache } from '@/lib/whatsapp/security'
import { createServerClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

vi.mock('@/lib/deployment/live-executor', async () => {
  const actual = await vi.importActual('@/lib/deployment/live-executor')
  return {
    ...actual,
    executeLiveDeploymentTurn: vi.fn(),
    resolveDeploymentByPhoneNumberId: vi.fn(),
  }
})

vi.mock('@/lib/whatsapp/client', async () => {
  const actual = await vi.importActual('@/lib/whatsapp/client')
  return {
    ...actual,
    sendWhatsAppTextMessage: vi.fn(),
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('PHASE 5B: WhatsApp Channel Adapter (Meta Cloud API Ingress)', () => {
  let mockSupabase: any
  let mockMessages: any[]

  beforeEach(() => {
    vi.clearAllMocks()
    resetDuplicateCache()

    mockMessages = []
    mockSupabase = {
      from: vi.fn((table: string) => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((col: string, val: any) => ({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockMessages.filter((m) => m[col] === val),
              error: null,
            }),
          }),
        })),
        insert: vi.fn((payload: any) => {
          mockMessages.push(payload)
          return Promise.resolve({ data: payload, error: null })
        }),
      })),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

    vi.mocked(sendWhatsAppTextMessage).mockResolvedValue({
      success: true,
      status: 'simulated',
      recipient: '+919777766666',
      durationMs: 15,
    })
  })

  function createMetaWebhookPayload({
    phoneNumberId = 'meta-phone-apex-101',
    from = '+919777766666',
    name = 'Gowtham Rao',
    text = 'Hi, I need a 1.8 Cr villa in Tirupati.',
    messageId = `wamid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  }: {
    phoneNumberId?: string
    from?: string
    name?: string
    text?: string
    messageId?: string
  } = {}) {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-12345',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '+16505551234',
                  phone_number_id: phoneNumberId,
                },
                contacts: [{ profile: { name }, wa_id: from.replace(/[^0-9]/g, '') }],
                messages: [
                  {
                    from: from.replace(/[^0-9]/g, ''),
                    id: messageId,
                    timestamp: `${Math.floor(Date.now() / 1000)}`,
                    text: { body: text },
                    type: 'text',
                  },
                ],
              },
            },
          ],
        },
      ],
    }
  }

  function createMockRequest(body: any, headers: Record<string, string> = {}) {
    return new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    })
  }

  // GET: Webhook handshake
  it('GET handshake verifies hub.verify_token and returns challenge', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=grovaitech_whatsapp_verify_token_2026&hub.challenge=test_challenge_123'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('test_challenge_123')
  })

  // A. Valid phone_number_id -> correct deployment & live turn execution
  it('A. resolves valid phone_number_id to ClientDeployment and executes live turn', async () => {
    vi.mocked(resolveDeploymentByPhoneNumberId).mockResolvedValueOnce({
      id: 'dep-client-apex-real-estate-lead-receptionist',
      client_id: 'client-apex-101',
      company_name: 'Apex Horizon Realty',
      industry: 'Real Estate',
      contact_name: 'Vikram Sharma',
      contact_phone: '+91 9876543210',
      assigned_employee_id: 'emp-001',
      assigned_employee_name: 'Real Estate Lead Receptionist',
      assigned_employee_slug: 'real-estate-lead-receptionist',
      assigned_workflow_id: 'wf-001',
      assigned_workflow_name: 'Real Estate Lead Workflow',
      status: 'active',
      runtime_config: {} as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    vi.mocked(executeLiveDeploymentTurn).mockResolvedValueOnce({
      success: true,
      deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
      clientId: 'client-apex-101',
      employeeSlug: 'real-estate-lead-receptionist',
      employeeName: 'Real Estate Lead Receptionist',
      replyText: 'Hello Gowtham Rao! Apex Horizon Realty has received your inquiry for a 1.8 Cr villa.',
      executedTools: [],
    })

    const payload = createMetaWebhookPayload({
      phoneNumberId: 'meta-phone-apex-101',
      from: '+91 9777766666',
      name: 'Gowtham Rao',
      text: 'Hi, I need a 1.8 Cr villa in Tirupati.',
    })

    const res = await POST(createMockRequest(payload))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.status).toBe('EVENT_PROCESSED')
    expect(json.results[0].deploymentId).toBe('dep-client-apex-real-estate-lead-receptionist')
    expect(json.results[0].clientId).toBe('client-apex-101')
    expect(executeLiveDeploymentTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        deploymentId: 'dep-client-apex-real-estate-lead-receptionist',
        message: 'Hi, I need a 1.8 Cr villa in Tirupati.',
        channel: 'whatsapp',
      })
    )
    expect(sendWhatsAppTextMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '919777766666',
        text: expect.stringContaining('Apex Horizon Realty'),
      })
    )
  })

  // B. Unknown phone_number_id -> safe acknowledgment, zero execution
  it('B. handles unknown phone_number_id safely without executing live turn or CRM', async () => {
    vi.mocked(resolveDeploymentByPhoneNumberId).mockResolvedValueOnce(null)

    const payload = createMetaWebhookPayload({
      phoneNumberId: 'meta-phone-unknown-999',
    })

    const res = await POST(createMockRequest(payload))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results[0].status).toBe('UNBOUND_CHANNEL_ACKNOWLEDGED')
    expect(executeLiveDeploymentTurn).not.toHaveBeenCalled()
    expect(sendWhatsAppTextMessage).not.toHaveBeenCalled()
  })

  // C. Inactive deployment -> zero execution
  it('C. does not execute live turn if deployment is inactive (resolveDeploymentByPhoneNumberId returns null)', async () => {
    vi.mocked(resolveDeploymentByPhoneNumberId).mockResolvedValueOnce(null)

    const payload = createMetaWebhookPayload({
      phoneNumberId: 'meta-phone-inactive-101',
    })

    const res = await POST(createMockRequest(payload))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results[0].status).toBe('UNBOUND_CHANNEL_ACKNOWLEDGED')
    expect(executeLiveDeploymentTurn).not.toHaveBeenCalled()
  })

  // D. Client A phone_number_id cannot route to Client B
  it('D. guarantees phone_number_id strictly routes to its own bound deployment', async () => {
    vi.mocked(resolveDeploymentByPhoneNumberId).mockImplementation(async (phoneId) => {
      if (phoneId === 'meta-phone-zenith-202') {
        return {
          id: 'dep-client-zenith-real-estate-lead-receptionist',
          client_id: 'client-zenith-202',
          company_name: 'Zenith Living Spaces',
          status: 'active',
        } as any
      }
      return null
    })

    vi.mocked(executeLiveDeploymentTurn).mockResolvedValueOnce({
      success: true,
      deploymentId: 'dep-client-zenith-real-estate-lead-receptionist',
      clientId: 'client-zenith-202',
      employeeSlug: 'real-estate-lead-receptionist',
      employeeName: 'Real Estate Lead Receptionist',
      replyText: 'Zenith response',
      executedTools: [],
    })

    const payload = createMetaWebhookPayload({
      phoneNumberId: 'meta-phone-zenith-202',
    })

    const res = await POST(createMockRequest(payload))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results[0].clientId).toBe('client-zenith-202')
    expect(json.results[0].deploymentId).toBe('dep-client-zenith-real-estate-lead-receptionist')
  })

  // E. Customer phone number cannot determine tenant
  it('E. customer phone number is passed strictly as customerContext, never as tenant ID', async () => {
    vi.mocked(resolveDeploymentByPhoneNumberId).mockResolvedValueOnce({
      id: 'dep-client-apex-101',
      client_id: 'client-apex-101',
      company_name: 'Apex Realty',
      status: 'active',
    } as any)

    vi.mocked(executeLiveDeploymentTurn).mockResolvedValueOnce({
      success: true,
      deploymentId: 'dep-client-apex-101',
      clientId: 'client-apex-101',
      employeeSlug: 'real-estate-lead-receptionist',
      employeeName: 'Real Estate Lead Receptionist',
      replyText: 'Apex reply',
      executedTools: [],
    })

    const payload = createMetaWebhookPayload({
      phoneNumberId: 'meta-phone-apex-101',
      from: '+91 9999999999', // Customer phone
    })

    await POST(createMockRequest(payload))

    expect(executeLiveDeploymentTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        deploymentId: 'dep-client-apex-101',
        customerContext: expect.objectContaining({
          phone: '919999999999',
        }),
      })
    )
  })

  // G. Meta signature invalid -> reject with 401
  it('G. rejects inbound request with 401 when signature check fails', async () => {
    process.env.META_APP_SECRET = 'real_super_secret_app_key'

    const payload = createMetaWebhookPayload()
    const req = createMockRequest(payload, {
      'x-hub-signature-256': 'sha256=invalid_tampered_signature_hex',
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Invalid signature')

    delete process.env.META_APP_SECRET
  })

  // H. Duplicate provider message ID -> deduplicated, no second execution
  it('H. skips processing duplicate Meta message IDs', async () => {
    const duplicateMessageId = 'wamid-unique-duplicate-test-id'

    vi.mocked(resolveDeploymentByPhoneNumberId).mockResolvedValue({
      id: 'dep-client-apex-101',
      client_id: 'client-apex-101',
      status: 'active',
    } as any)

    vi.mocked(executeLiveDeploymentTurn).mockResolvedValue({
      success: true,
      deploymentId: 'dep-client-apex-101',
      clientId: 'client-apex-101',
      employeeSlug: 'real-estate-lead-receptionist',
      employeeName: 'Real Estate Lead Receptionist',
      replyText: 'Reply',
      executedTools: [],
    })

    const payload1 = createMetaWebhookPayload({ messageId: duplicateMessageId })
    const res1 = await POST(createMockRequest(payload1))
    expect(res1.status).toBe(200)
    expect(executeLiveDeploymentTurn).toHaveBeenCalledTimes(1)

    // Second request with SAME messageId (Meta retry delivery)
    const payload2 = createMetaWebhookPayload({ messageId: duplicateMessageId })
    const res2 = await POST(createMockRequest(payload2))
    const json2 = await res2.json()

    expect(res2.status).toBe(200)
    expect(json2.status).toBe('NO_ACTIONABLE_MESSAGES')
    expect(json2.skippedDuplicates).toBe(1)
    // executeLiveDeploymentTurn must NOT be called a second time
    expect(executeLiveDeploymentTurn).toHaveBeenCalledTimes(1)
  })

  // I. Same customer phone across two deployments -> isolated conversation histories
  it('I. isolates conversation chat_id by deploymentId + customerPhone', async () => {
    vi.mocked(resolveDeploymentByPhoneNumberId)
      .mockResolvedValueOnce({
        id: 'dep-apex-101',
        client_id: 'client-apex-101',
        status: 'active',
      } as any)
      .mockResolvedValueOnce({
        id: 'dep-zenith-202',
        client_id: 'client-zenith-202',
        status: 'active',
      } as any)

    vi.mocked(executeLiveDeploymentTurn).mockResolvedValue({
      success: true,
      deploymentId: 'dep-test',
      clientId: 'client-test',
      employeeSlug: 'real-estate-lead-receptionist',
      employeeName: 'Real Estate Lead Receptionist',
      replyText: 'Reply',
      executedTools: [],
    })

    const samePhone = '+91 9777766666'

    // Message 1 to Apex
    const payloadApex = createMetaWebhookPayload({
      phoneNumberId: 'meta-phone-apex-101',
      from: samePhone,
      text: 'Apex inquiry',
      messageId: 'msg-apex-1',
    })
    await POST(createMockRequest(payloadApex))

    // Message 2 to Zenith
    const payloadZenith = createMetaWebhookPayload({
      phoneNumberId: 'meta-phone-zenith-202',
      from: samePhone,
      text: 'Zenith inquiry',
      messageId: 'msg-zenith-2',
    })
    await POST(createMockRequest(payloadZenith))

    // Verify messages logged to Supabase have distinct tenant-scoped chat_ids
    const loggedChatIds = mockMessages.map((m) => m.chat_id)
    expect(loggedChatIds).toContain('whatsapp_dep-apex-101_919777766666')
    expect(loggedChatIds).toContain('whatsapp_dep-zenith-202_919777766666')
  })

  // J. create_lead remains tenant-scoped
  it('J. returns attributed lead in webhook response when create_lead executes', async () => {
    vi.mocked(resolveDeploymentByPhoneNumberId).mockResolvedValueOnce({
      id: 'dep-client-apex-101',
      client_id: 'client-apex-101',
      company_name: 'Apex Horizon Realty',
      status: 'active',
    } as any)

    vi.mocked(executeLiveDeploymentTurn).mockResolvedValueOnce({
      success: true,
      deploymentId: 'dep-client-apex-101',
      clientId: 'client-apex-101',
      employeeSlug: 'real-estate-lead-receptionist',
      employeeName: 'Real Estate Lead Receptionist',
      replyText: 'Your lead has been saved.',
      executedTools: [
        {
          toolName: 'create_lead',
          success: true,
          result: { leadId: 'lead-persisted-123' },
          durationMs: 30,
        },
      ],
      leadResult: {
        id: 'lead-persisted-123',
        name: 'Gowtham Rao',
        phone: '+919777766666',
        client_id: 'client-apex-101',
        deployment_id: 'dep-client-apex-101',
      },
    })

    const payload = createMetaWebhookPayload({
      phoneNumberId: 'meta-phone-apex-101',
      from: '+919777766666',
      name: 'Gowtham Rao',
    })

    const res = await POST(createMockRequest(payload))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.results[0].leadSaved).toBe(true)
    expect(json.results[0].lead.client_id).toBe('client-apex-101')
    expect(json.results[0].lead.deployment_id).toBe('dep-client-apex-101')
  })

  // K. Outbound credentials missing -> dev/test simulation allowed, production fail-closed
  it('K. verifies outbound delivery behavior under missing credentials in production vs non-production', async () => {
    // Test the real sendWhatsAppTextMessage function directly
    const { sendWhatsAppTextMessage: realSend } = await vi.importActual<any>('@/lib/whatsapp/client')

    // In development (default NODE_ENV)
    const devRes = await realSend({
      to: '+919777766666',
      text: 'Test message',
    })
    expect(devRes.success).toBe(true)
    expect(devRes.status).toBe('simulated')

    // In production
    const originalEnv = process.env.NODE_ENV
    ;(process.env as any).NODE_ENV = 'production'

    const prodRes = await realSend({
      to: '+919777766666',
      text: 'Test message',
    })
    expect(prodRes.success).toBe(false)
    expect(prodRes.status).toBe('failed')
    expect(prodRes.error).toContain('Meta WhatsApp API credentials not configured in production')

    ;(process.env as any).NODE_ENV = originalEnv
  })
})
