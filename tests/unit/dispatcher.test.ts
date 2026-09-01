import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { createLead } from '@/app/actions/leads'
import { createBooking } from '@/app/actions/bookings'
import { executeRealEstateWorkflow, executeClinicWorkflow } from '@/lib/workflows/executor'
import { generateResponse } from '@/lib/ai/gemini'
import { createServerClient } from '@/lib/supabase/server'

// ─── Mock Side Effects ───────────────────────────────────────────────────────

vi.mock('@/app/actions/leads', () => ({
  createLead: vi.fn(),
}))

vi.mock('@/app/actions/bookings', () => ({
  createBooking: vi.fn(),
}))

vi.mock('@/lib/workflows/executor', () => ({
  executeRealEstateWorkflow: vi.fn(),
  executeClinicWorkflow: vi.fn(),
  getSiteVisitCustomerMessage: (workflow: any, details?: any) => {
    if (workflow.overallStatus === 'failed') {
      return "I've recorded your request, but I couldn't complete the booking automatically. Our team will follow up to confirm it."
    }
    if (!workflow.customerConfirmationAllowed) {
      return 'Your site visit request has been recorded. Our team will confirm the exact slot shortly.'
    }
    return `Your site visit for ${details.preferredDate} at ${details.preferredTime} has been confirmed, ${details.customerName}.`
  },
  getClinicCustomerMessage: (workflow: any, details?: any) => {
    if (workflow.overallStatus === 'failed') {
      return "I've recorded your appointment request, but I couldn't complete the booking automatically. Our clinic front desk will follow up to confirm it."
    }
    if (!workflow.customerConfirmationAllowed) {
      return `Your appointment request for ${details?.patientName || 'you'} with ${details?.doctorName || 'Dr. Verma'} on ${details?.appointmentDate || 'the requested date'} at ${details?.appointmentTime || 'the requested time'} has been recorded. Our clinic team will confirm the final slot shortly.`
    }
    return `Your appointment with ${details?.doctorName || 'Dr. Verma'} on ${details?.appointmentDate} at ${details?.appointmentTime} has been confirmed for ${details?.patientName || 'you'}.`
  },
}))

vi.mock('@/lib/ai/gemini', () => ({
  generateResponse: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('lib/ai/dispatcher - dispatchToolCall()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── 1. Security Tests ──────────────────────────────────────────────────────
  describe('Security & Tool Name Guardrails', () => {
    it('rejects an empty or non-string tool name', async () => {
      const resultEmpty = await dispatchToolCall('', {})
      expect(resultEmpty.success).toBe(false)
      expect(resultEmpty.error).toContain('Invalid tool invocation')
      expect(typeof resultEmpty.durationMs).toBe('number')

      const resultNull = await dispatchToolCall(null as any, {})
      expect(resultNull.success).toBe(false)
      expect(resultNull.error).toContain('Invalid tool invocation')
    })

    it('rejects an unregistered tool such as execute_arbitrary_sql', async () => {
      const result = await dispatchToolCall('execute_arbitrary_sql', { query: 'DROP TABLE leads;' })
      expect(result.success).toBe(false)
      expect(result.error).toContain("Security Violation: Rejected unknown tool execution 'execute_arbitrary_sql'")
      expect(result.toolName).toBe('execute_arbitrary_sql')
      expect(typeof result.durationMs).toBe('number')
    })
  })

  // ─── 2. Validation Tests ────────────────────────────────────────────────────
  describe('Parameter Validation', () => {
    it('create_lead rejects missing required fields (name or phone)', async () => {
      const resultNoName = await dispatchToolCall('create_lead', {
        phone: '+919876543210',
      })
      expect(resultNoName.success).toBe(false)
      expect(resultNoName.error).toContain("Validation Error: 'name' is required for create_lead.")
      expect(createLead).not.toHaveBeenCalled()

      const resultNoPhone = await dispatchToolCall('create_lead', {
        name: 'Ramesh Kumar',
      })
      expect(resultNoPhone.success).toBe(false)
      expect(resultNoPhone.error).toContain("Validation Error: A valid 'phone' is required for create_lead.")
      expect(createLead).not.toHaveBeenCalled()
    })

    it('create_lead rejects an invalid/too-short phone number', async () => {
      const result = await dispatchToolCall('create_lead', {
        name: 'Ramesh Kumar',
        phone: '123',
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain("Validation Error: A valid 'phone' is required for create_lead.")
      expect(createLead).not.toHaveBeenCalled()
    })

    it('schedule_site_visit rejects missing required fields', async () => {
      const resultNoDate = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'Ananya Sharma',
        phone: '+919876543210',
      })
      expect(resultNoDate.success).toBe(false)
      expect(resultNoDate.error).toContain("Validation Error: 'preferred_date' is required")

      const resultNoName = await dispatchToolCall('schedule_site_visit', {
        phone: '+919876543210',
        preferred_date: '2026-09-10',
      })
      expect(resultNoName.success).toBe(false)
      expect(resultNoName.error).toContain("Validation Error: 'customer_name' is required")
    })

    it('book_clinic_appointment rejects missing required fields', async () => {
      const result = await dispatchToolCall('book_clinic_appointment', {
        patient_name: 'Vikram',
        patient_phone: '+919876543210',
        // appointment_date and appointment_time missing
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain("Validation Error: 'appointment_date'")
      expect(createBooking).not.toHaveBeenCalled()
    })

    it('search_knowledge_base rejects an empty query', async () => {
      const result = await dispatchToolCall('search_knowledge_base', {
        query: '   ',
      })
      expect(result.success).toBe(false)
      expect(result.error).toContain("Validation Error: 'query' is required")
      expect(generateResponse).not.toHaveBeenCalled()
    })
  })

  // ─── 3. Successful Execution Tests ──────────────────────────────────────────
  describe('Successful Tool Execution', () => {
    it('create_lead calls the mocked createLead action and returns success', async () => {
      vi.mocked(createLead).mockResolvedValueOnce({
        success: true,
        data: { id: 'lead_mock_001', name: 'John Doe' } as any,
        isUpdate: false,
      })

      const result = await dispatchToolCall('create_lead', {
        name: 'John Doe',
        phone: '+91 98765 43210',
        property_type: 'villa',
        location: 'Tirupati',
        budget: '₹1.5 Cr',
      })

      expect(result.success).toBe(true)
      expect(result.result).toBeDefined()
      expect(result.result.leadId).toBe('lead_mock_001')
      expect(result.result.message).toContain('successfully registered in Grovaitech CRM')
      expect(createLead).toHaveBeenCalledTimes(1)
      expect(createLead).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          phone: '+919876543210',
          property_type: 'villa',
          location: 'Tirupati',
          budget: '₹1.5 Cr',
          lead_score: 'warm',
        })
      )
    })

    it('schedule_site_visit calls the lead action and workflow executor', async () => {
      vi.mocked(createLead).mockResolvedValueOnce({
        success: true,
        data: { id: 'lead_visit_001' } as any,
        isUpdate: false,
      })
      vi.mocked(executeRealEstateWorkflow).mockResolvedValueOnce({
        workflowId: 'wf_exec_999',
        leadId: 'lead_visit_001',
        overallStatus: 'success',
        customerConfirmationAllowed: true,
        steps: [
          { stepId: 'step-1', name: 'Register Lead', status: 'completed', durationMs: 12 },
          { stepId: 'step-2', name: 'Schedule Site Visit', status: 'completed', durationMs: 45 },
        ],
      } as any)

      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'Priya Patel',
        phone: '+91 99887 76655',
        preferred_date: '2026-09-05',
        preferred_time: '11:00 AM',
        property_type: 'Luxury Villa',
        location: 'Tirupati Highway',
      })

      expect(result.success).toBe(true)
      expect(result.result.workflowId).toBe('wf_exec_999')
      expect(result.result.workflowStatus).toBe('success')
      expect(result.result.message).toContain('has been confirmed, Priya Patel')
      expect(createLead).toHaveBeenCalledTimes(1)
      expect(executeRealEstateWorkflow).toHaveBeenCalledTimes(1)
    })

    it('uses request-recorded wording for a partial site-visit workflow', async () => {
      vi.mocked(createLead).mockResolvedValueOnce({ success: true, data: { id: 'lead_partial' } as any, isUpdate: false })
      vi.mocked(executeRealEstateWorkflow).mockResolvedValueOnce({
        workflowId: 'wf_partial', overallStatus: 'partial', customerConfirmationAllowed: false, steps: [],
      } as any)

      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'Priya Patel', phone: '+919988776655', preferred_date: '2026-09-05',
      })

      expect(result.success).toBe(true)
      expect(result.result.message).toBe('Your site visit request has been recorded. Our team will confirm the exact slot shortly.')
      expect(result.result.message.toLowerCase()).not.toContain('confirmed')
    })

    it('uses follow-up wording for a failed site-visit workflow', async () => {
      vi.mocked(createLead).mockResolvedValueOnce({ success: true, data: { id: 'lead_failed' } as any, isUpdate: false })
      vi.mocked(executeRealEstateWorkflow).mockResolvedValueOnce({
        workflowId: 'wf_failed', overallStatus: 'failed', customerConfirmationAllowed: false, steps: [],
      } as any)

      const result = await dispatchToolCall('schedule_site_visit', {
        customer_name: 'Priya Patel', phone: '+919988776655', preferred_date: '2026-09-05',
      })

      expect(result.success).toBe(true)
      expect(result.result.message).toBe("I've recorded your request, but I couldn't complete the booking automatically. Our team will follow up to confirm it.")
    })

    it('book_clinic_appointment routes through executeClinicWorkflow and returns structured result', async () => {
      vi.mocked(executeClinicWorkflow).mockResolvedValueOnce({
        executionId: 'exec_clinic_123',
        workflowId: 'wf-002',
        workflowName: 'Clinic Appointment Booking & Reminder Pipeline',
        leadId: 'booking_123',
        conversationId: 'tool-clinic-1',
        triggerEvent: 'Appointment Booked by Patient',
        overallStatus: 'partial',
        hasSimulatedSteps: true,
        failedStepIds: [],
        customerConfirmationAllowed: false,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: 45,
        steps: [
          { stepId: 's1', stepName: 'Save Clinic Booking', type: 'database', status: 'success', target: 'Supabase', durationMs: 15, detail: 'Saved' },
          { stepId: 's2', stepName: 'Doctor Calendar Block', type: 'calendar', status: 'simulated', target: 'Google Calendar', durationMs: 0, detail: 'Simulated' },
          { stepId: 's3', stepName: 'Queue WhatsApp 24h Reminder', type: 'whatsapp', status: 'simulated', target: 'Patient Phone', durationMs: 0, detail: 'Simulated' },
          { stepId: 's4', stepName: 'Sync n8n Pipeline', type: 'n8n_webhook', status: 'simulated', target: 'n8n', durationMs: 20, detail: 'Simulated' },
        ],
        n8nResult: { status: 'not_configured' },
      })

      const result = await dispatchToolCall('book_clinic_appointment', {
        patient_name: 'Sunita Roy',
        patient_phone: '+91 91234 56789',
        patient_email: 'sunita@example.com',
        appointment_date: '2026-09-02',
        appointment_time: '04:00 PM',
        doctor_name: 'Dr. Verma',
        reason: 'Tooth Cleaning',
      })

      expect(result.success).toBe(true)
      expect(result.result.bookingId).toBe('booking_123')
      expect(result.result.workflowId).toBe('wf-002')
      expect(result.result.patientName).toBe('Sunita Roy')
      expect(result.result.message).toContain('Your appointment request for Sunita Roy')
      expect(executeClinicWorkflow).toHaveBeenCalledTimes(1)
    })

    it('search_knowledge_base uses mocked database/Gemini dependencies and returns success', async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [{ name: 'Dental FAQs' }, { name: 'Doctor Profiles' }],
            }),
          }),
        }),
      }
      vi.mocked(createServerClient).mockResolvedValueOnce(mockSupabase as any)
      vi.mocked(generateResponse).mockResolvedValueOnce('The clinic is open from 9 AM to 6 PM Monday through Saturday.')

      const result = await dispatchToolCall('search_knowledge_base', {
        query: 'What are the clinic timings?',
        category: 'clinic',
        max_results: 2,
      })

      expect(result.success).toBe(true)
      expect(result.result.answer).toContain('9 AM to 6 PM')
      expect(result.result.referencedDocs).toContain('Dental FAQs, Doctor Profiles')
      expect(generateResponse).toHaveBeenCalledTimes(1)
    })
  })

  // ─── 4. Error Handling & Sanitization Tests ─────────────────────────────────
  describe('Error Handling & Sanitization', () => {
    it('returns success: false when an action fails or returns an error', async () => {
      vi.mocked(createLead).mockResolvedValueOnce({
        success: false,
        error: 'CRM Database is temporarily unavailable',
      })

      const result = await dispatchToolCall('create_lead', {
        name: 'Kiran',
        phone: '+919876543210',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('CRM Database is temporarily unavailable')
    })

    it('sanitizes sensitive Google API keys in the returned error', async () => {
      vi.mocked(createLead).mockRejectedValueOnce(
        new Error('Request failed with Google API Key AIzaSyA123456789012345678901234567890BC and token ghp_123456789012345678901234567890123456')
      )

      const result = await dispatchToolCall('create_lead', {
        name: 'Kiran',
        phone: '+919876543210',
      })

      expect(result.success).toBe(false)
      expect(result.error).not.toContain('AIzaSyA123456789012345678901234567890BC')
      expect(result.error).not.toContain('ghp_123456789012345678901234567890123456')
      expect(result.error).toContain('[REDACTED_API_KEY]')
      expect(result.error).toContain('[REDACTED_TOKEN]')
    })

    it('sanitizes sensitive JWT tokens in the returned error', async () => {
      vi.mocked(executeClinicWorkflow).mockRejectedValueOnce(
        new Error('Unauthorized: bearer token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c expired')
      )

      const result = await dispatchToolCall('book_clinic_appointment', {
        patient_name: 'Sunita',
        patient_phone: '+919876543210',
        appointment_date: '2026-09-01',
        appointment_time: '10:00 AM',
      })

      expect(result.success).toBe(false)
      expect(result.error).not.toContain('eyJhbGciOiJIUzI1Ni')
      expect(result.error).toContain('[REDACTED_JWT]')
    })

    it('truncates long error messages to 300 characters', async () => {
      const veryLongErrorMessage = 'A'.repeat(500)
      vi.mocked(createLead).mockRejectedValueOnce(new Error(veryLongErrorMessage))

      const result = await dispatchToolCall('create_lead', {
        name: 'Kiran',
        phone: '+919876543210',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error!.length).toBeLessThanOrEqual(300)
      expect(result.error!.length).toBe(300)
    })
  })
})
