import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/webhooks/whatsapp/route'
import { Gemini } from '@/lib/ai/gemini'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { createServerClient } from '@/lib/supabase/server'
import { getEmployeeBySlug } from '@/lib/employees'
import { extractRealEstateLead } from '@/lib/leads/extractor'
import { executeRealEstateWorkflow } from '@/lib/workflows/executor'
import { createLead } from '@/app/actions/leads'
import { sendWhatsAppTextMessage } from '@/lib/whatsapp/client'
import { verifyMetaSignature, resetDuplicateCache } from '@/lib/whatsapp/security'

// ─── Mock External Dependencies ──────────────────────────────────────────────

const mockGenerateContentWithTools = vi.fn()
const mockGenerateText = vi.fn()

vi.mock('@/lib/ai/gemini', () => {
  return {
    Gemini: vi.fn().mockImplementation(() => ({
      generateContentWithTools: mockGenerateContentWithTools,
      generateText: mockGenerateText,
    })),
  }
})

vi.mock('@/lib/ai/dispatcher', () => ({
  dispatchToolCall: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/employees', () => ({
  getEmployeeBySlug: vi.fn(),
}))

vi.mock('@/lib/leads/extractor', () => ({
  extractRealEstateLead: vi.fn(),
}))

vi.mock('@/lib/workflows/executor', () => ({
  executeRealEstateWorkflow: vi.fn(),
}))

vi.mock('@/app/actions/leads', () => ({
  createLead: vi.fn(),
}))

vi.mock('@/lib/whatsapp/client', () => ({
  sendWhatsAppTextMessage: vi.fn(),
}))

vi.mock('@/lib/whatsapp/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/whatsapp/security')>()
  return {
    ...actual,
    verifyMetaSignature: vi.fn(actual.verifyMetaSignature),
  }
})

// ─── Sample Meta Payloads ───────────────────────────────────────────────────

const createInboundMessagePayload = (messageId: string, phone: string, text: string, name = 'Test User') => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA_ID_001',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15550234567',
              phone_number_id: 'PHONE_NUM_ID_001',
            },
            contacts: [
              {
                profile: { name },
                wa_id: phone,
              },
            ],
            messages: [
              {
                from: phone,
                id: messageId,
                timestamp: '1724900000',
                text: { body: text },
                type: 'text',
              },
            ],
          },
        },
      ],
    },
  ],
})

const STATUS_UPDATE_PAYLOAD = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'WABA_ID_001',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15550234567',
              phone_number_id: 'PHONE_NUM_ID_001',
            },
            statuses: [
              {
                id: 'wamid.STATUS_001',
                status: 'read',
                timestamp: '1724900005',
                recipient_id: '919876543210',
              },
            ],
          },
        },
      ],
    },
  ],
}

describe('WhatsApp Webhook Route - app/api/webhooks/whatsapp/route.ts', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()
    resetDuplicateCache()

    mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }),
    }

    vi.mocked(createServerClient).mockResolvedValue(mockSupabase)
    vi.mocked(getEmployeeBySlug).mockResolvedValue({
      system_prompt: 'You are GrovAI Real Estate Receptionist.',
    } as any)

    mockGenerateContentWithTools.mockResolvedValue({
      text: 'Hello! I can assist you with properties in Tirupati.',
      functionCalls: undefined,
    })
    mockGenerateText.mockResolvedValue({
      text: 'Your request has been processed successfully.',
    })

    vi.mocked(extractRealEstateLead).mockResolvedValue({
      name: 'Test User',
      phone: '919876543210',
      qualification_status: 'unqualified',
      site_visit_requested: false,
      qualification_score: 20,
    } as any)

    vi.mocked(createLead).mockResolvedValue({
      success: true,
      data: { id: 'lead_mock_wa_001', name: 'Test User' } as any,
    })

    vi.mocked(executeRealEstateWorkflow).mockResolvedValue({
      workflowId: 'wf_wa_001',
      overallStatus: 'success',
      steps: [],
    } as any)

    vi.mocked(sendWhatsAppTextMessage).mockResolvedValue({
      success: true,
      messageId: 'outbound_msg_001',
      status: 'SENT',
    })
  })

  // ─── 1. GET Webhook Verification Handshake ──────────────────────────────────
  describe('GET Webhook Verification Handshake', () => {
    it('returns challenge with HTTP 200 when Meta verify token is valid', async () => {
      const url = 'http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=grovaitech_whatsapp_verify_token_2026&hub.challenge=challenge_code_abc123'
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)

      expect(response.status).toBe(200)
      const text = await response.text()
      expect(text).toBe('challenge_code_abc123')
      expect(response.headers.get('Content-Type')).toContain('text/plain')
    })

    it('returns HTTP 403 Forbidden when verify token is invalid', async () => {
      const url = 'http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=invalid_wrong_token&hub.challenge=challenge_code_abc123'
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)

      expect(response.status).toBe(403)
      const text = await response.text()
      expect(text).toBe('Forbidden')
    })

    it('returns HTTP 403 Forbidden when mode is not subscribe', async () => {
      const url = 'http://localhost:3000/api/webhooks/whatsapp?hub.mode=unsubscribe&hub.verify_token=grovaitech_whatsapp_verify_token_2026&hub.challenge=challenge_code_abc123'
      const request = new NextRequest(url, { method: 'GET' })

      const response = await GET(request)

      expect(response.status).toBe(403)
    })
  })

  // ─── 2. POST Webhook Signature Security ─────────────────────────────────────
  describe('POST Webhook Signature Security', () => {
    it('rejects request with HTTP 401 when signature verification fails', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({
        isValid: false,
        reason: 'Signature mismatch',
      })

      const rawPayload = JSON.stringify(createInboundMessagePayload('msg_sig_fail', '919876543210', 'Hi'))
      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hub-signature-256': 'sha256=invalid_hash',
        },
        body: rawPayload,
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
      const json = await response.json()
      expect(json.error).toBe('Invalid signature')
      expect(json.reason).toBe('Signature mismatch')
      expect(mockGenerateContentWithTools).not.toHaveBeenCalled()
    })

    it('returns HTTP 400 when body contains invalid JSON', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-non-json-string{',
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Invalid JSON payload')
    })
  })

  // ─── 3. Status-Only Meta Events ─────────────────────────────────────────────
  describe('Status-Only Events (Delivery / Read Receipts)', () => {
    it('returns HTTP 200 STATUS_ACKNOWLEDGED without invoking AI or external actions', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(STATUS_UPDATE_PAYLOAD),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.status).toBe('STATUS_ACKNOWLEDGED')
      expect(mockGenerateContentWithTools).not.toHaveBeenCalled()
      expect(createLead).not.toHaveBeenCalled()
      expect(sendWhatsAppTextMessage).not.toHaveBeenCalled()
    })
  })

  // ─── 4. Duplicate Message Handling ──────────────────────────────────────────
  describe('Duplicate Message Handling', () => {
    it('processes message on first delivery and ignores on duplicate retry', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValue({ isValid: true })

      const payload = createInboundMessagePayload('msg_dedup_001', '919876543210', 'Looking for villa')

      // First delivery: should process normally
      const request1 = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const response1 = await POST(request1)
      expect(response1.status).toBe(200)
      const json1 = await response1.json()
      expect(json1.status).toBe('EVENT_PROCESSED')
      expect(mockGenerateContentWithTools).toHaveBeenCalledTimes(1)
      expect(sendWhatsAppTextMessage).toHaveBeenCalledTimes(1)

      // Duplicate delivery with same message ID: should be skipped
      const request2 = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const response2 = await POST(request2)
      expect(response2.status).toBe(200)
      const json2 = await response2.json()
      expect(json2.status).toBe('NO_ACTIONABLE_MESSAGES')
      expect(json2.skippedDuplicates).toBe(1)

      // Assert Gemini and WhatsApp outbound client were NOT called again
      expect(mockGenerateContentWithTools).toHaveBeenCalledTimes(1)
      expect(sendWhatsAppTextMessage).toHaveBeenCalledTimes(1)
    })
  })

  // ─── 5. Normal Inbound Message Flow with Tool Runtime ──────────────────────
  describe('Normal Inbound Message Flow with Gemini Tool Runtime', () => {
    it('receives customer message, executes tool calling loop, logs messages, and sends outbound reply', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'We have luxury 3 BHK villas in Tirupati starting at 1.2 Cr.',
        functionCalls: undefined,
      })

      const payload = createInboundMessagePayload('msg_normal_001', '919876543210', 'Show me villas in Tirupati', 'Karthik')

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.status).toBe('EVENT_PROCESSED')
      expect(json.processedCount).toBe(1)

      expect(mockGenerateContentWithTools).toHaveBeenCalledTimes(1)
      expect(sendWhatsAppTextMessage).toHaveBeenCalledTimes(1)
      expect(sendWhatsAppTextMessage).toHaveBeenCalledWith({
        to: '919876543210',
        text: 'We have luxury 3 BHK villas in Tirupati starting at 1.2 Cr.',
        replyToMessageId: 'msg_normal_001',
      })
    })

    it('does NOT create a CRM lead for ordinary conversation just because customerPhone exists', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Hello! Welcome to Grovaitech. How can I help you today?',
        functionCalls: undefined,
      })

      // Mock extractor to confirm ordinary inquiry is unqualified
      vi.mocked(extractRealEstateLead).mockResolvedValueOnce({
        name: 'Karthik',
        phone: '919876543210',
        qualification_status: 'unqualified',
        site_visit_requested: false,
        qualification_score: 10,
      } as any)

      const payload = createInboundMessagePayload('msg_chat_001', '919876543210', 'Hello there', 'Karthik')

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.status).toBe('EVENT_PROCESSED')
      // Crucial: createLead must NOT be called for normal chat
      expect(createLead).not.toHaveBeenCalled()
      expect(executeRealEstateWorkflow).not.toHaveBeenCalled()
    })
  })

  // ─── 6. Autonomous Tool Calling Execution ──────────────────────────────────
  describe('Autonomous Tool Calling & Verified Phone Injection', () => {
    it('executes schedule_site_visit tool call and automatically injects customer phone when omitted by model', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })

      // Turn 1: Model invokes schedule_site_visit tool without explicitly providing phone
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: null,
        functionCalls: [
          {
            name: 'schedule_site_visit',
            args: {
              customer_name: 'Vikram Sharma',
              preferred_date: '2026-09-06',
              preferred_time: '11:00 AM',
              property_type: 'Villa',
              // phone omitted by model
            },
          },
        ],
      })

      // Turn 2: Model returns conversational confirmation after tool result
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'Your site visit for Sunday at 11:00 AM is confirmed!',
        functionCalls: undefined,
      })

      vi.mocked(dispatchToolCall).mockResolvedValueOnce({
        toolName: 'schedule_site_visit',
        success: true,
        result: {
          leadId: 'lead_wa_visit_123',
          customerName: 'Vikram Sharma',
          phone: '919876543210',
          preferredDate: '2026-09-06',
          preferredTime: '11:00 AM',
          workflowId: 'wf_exec_wa_999',
          workflowStatus: 'success',
          steps: [],
          message: 'Site visit confirmed.',
        },
        durationMs: 45,
      })

      const payload = createInboundMessagePayload(
        'msg_tool_001',
        '919876543210',
        'Can I visit the villa project this Sunday at 11 AM?',
        'Vikram Sharma'
      )

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.status).toBe('EVENT_PROCESSED')

      // Verify tool was dispatched with auto-injected verified phone
      expect(dispatchToolCall).toHaveBeenCalledTimes(1)
      expect(dispatchToolCall).toHaveBeenCalledWith(
        'schedule_site_visit',
        expect.objectContaining({
          customer_name: 'Vikram Sharma',
          preferred_date: '2026-09-06',
          phone: '919876543210', // Verified phone injected
        })
      )

      // Verify outbound WhatsApp response dispatched
      expect(sendWhatsAppTextMessage).toHaveBeenCalledWith({
        to: '919876543210',
        text: 'Your site visit for Sunday at 11:00 AM is confirmed!',
        replyToMessageId: 'msg_tool_001',
      })
    })

    it('generates a wrap-up confirmation message via gemini.generateText when tool loop finishes without raw text', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })

      // Turn 1: Model requests tool call
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: null,
        functionCalls: [
          {
            name: 'create_lead',
            args: {
              name: 'Anil Kumar',
              location: 'Tirupati',
              budget: '1.5 Cr',
            },
          },
        ],
      })

      // Turn 2: Model finishes without text (empty text)
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: null,
        functionCalls: undefined,
      })

      vi.mocked(dispatchToolCall).mockResolvedValueOnce({
        toolName: 'create_lead',
        success: true,
        result: {
          leadId: 'lead_anil_001',
          message: 'Lead registered successfully.',
        },
        durationMs: 30,
      })

      mockGenerateText.mockResolvedValueOnce({
        text: 'Thank you Anil! Your property request in Tirupati has been noted.',
      })

      const payload = createInboundMessagePayload('msg_tool_summary', '919876543210', 'Looking for villa in Tirupati', 'Anil Kumar')

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockGenerateText).toHaveBeenCalledTimes(1)
      expect(sendWhatsAppTextMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Thank you Anil! Your property request in Tirupati has been noted.',
        })
      )
    })
  })

  // ─── 7. Narrow Passive Extractor Fallback ───────────────────────────────────
  describe('Narrow Passive Extractor Fallback', () => {
    it('creates lead and triggers workflow when no tool executed but passive extractor identifies qualified site visit', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })

      // Model produces plain conversational text without invoking tool
      mockGenerateContentWithTools.mockResolvedValueOnce({
        text: 'I would be happy to help you with your property search.',
        functionCalls: undefined,
      })

      vi.mocked(extractRealEstateLead).mockResolvedValueOnce({
        name: 'Suresh Reddy',
        phone: '919876543210',
        property_type: 'villa',
        location: 'Tirupati Highway',
        budget: '2 Cr',
        timeline: 'Saturday',
        intent: 'Site Visit',
        qualification_score: 95,
        qualification_status: 'qualified',
        site_visit_requested: true,
        site_visit_date: '2026-09-05',
        site_visit_time: '11:00 AM',
      } as any)

      const payload = createInboundMessagePayload('msg_fallback_001', '919876543210', 'Book site visit for Saturday', 'Suresh Reddy')

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(createLead).toHaveBeenCalledTimes(1)
      expect(createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Suresh Reddy',
          phone: '919876543210',
          site_visit_requested: true,
          lead_score: 'hot',
          lead_status: 'site_visit',
          source: 'whatsapp',
        })
      )
      expect(executeRealEstateWorkflow).toHaveBeenCalledTimes(1)
    })
  })

  // ─── 8. Error Handling ──────────────────────────────────────────────────────
  describe('Error Handling Behavior', () => {
    it('returns HTTP 200 with ERROR_HANDLED when unhandled runtime failure occurs to prevent Meta retry loops', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })
      mockGenerateContentWithTools.mockRejectedValueOnce(
        new Error('AI Tool Inference Engine Timeout')
      )

      const payload = createInboundMessagePayload('msg_err_001', '919876543210', 'Hello')

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.status).toBe('ERROR_HANDLED')
      expect(json.message).toContain('AI Tool Inference Engine Timeout')
    })
  })

  // ─── 9. Regression & Non-Actionable Payloads ─────────────────────────────────
  describe('Regression & Empty Payloads', () => {
    it('returns NO_ACTIONABLE_MESSAGES and does not trigger actions when entry is empty', async () => {
      vi.mocked(verifyMetaSignature).mockReturnValueOnce({ isValid: true })

      const emptyPayload = {
        object: 'whatsapp_business_account',
        entry: [],
      }

      const request = new NextRequest('http://localhost:3000/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emptyPayload),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.status).toBe('NO_ACTIONABLE_MESSAGES')
      expect(mockGenerateContentWithTools).not.toHaveBeenCalled()
      expect(createLead).not.toHaveBeenCalled()
      expect(sendWhatsAppTextMessage).not.toHaveBeenCalled()
    })
  })
})
