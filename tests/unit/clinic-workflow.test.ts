import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  executeClinicWorkflow,
  getClinicCustomerMessage,
  type PatientAppointmentData,
  type WorkflowExecutionAdapters,
} from '@/lib/workflows/executor'
import { dispatchToolCall } from '@/lib/ai/dispatcher'

const mockInsert = vi.fn().mockImplementation((payload: any) => ({
  select: vi.fn(() => ({
    single: vi.fn().mockResolvedValue({ data: { id: payload.id || 'mock-booking-id' }, error: null }),
  })),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  }),
}))

const samplePatient: PatientAppointmentData = {
  patient_name: 'Priya Sharma',
  patient_phone: '+919876512345',
  patient_email: 'priya.sharma@example.com',
  appointment_date: '2026-09-05',
  appointment_time: '10:00 AM',
  doctor_name: 'Dr. Verma',
  reason: 'Dental Consultation',
}

const liveAdapters: WorkflowExecutionAdapters = {
  dispatchWhatsAppTemplate: async () => ({ status: 'success', detail: 'Verified 24h reminder queued.' }),
  createCalendarEvent: async () => ({ status: 'success', detail: 'Verified doctor calendar slot booked.' }),
}

describe('wf-002: Clinic Appointment Booking & Reminder Pipeline', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('1. returns success when all steps (database, calendar, whatsapp, n8n) are live', async () => {
    vi.stubEnv('N8N_CLINIC_WEBHOOK_URL', 'https://n8n.example.test/clinic-webhook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    const result = await executeClinicWorkflow({
      bookingId: 'booking_001',
      patient: samplePatient,
      conversationId: 'chat_clinic_001',
      adapters: liveAdapters,
    })

    expect(result.workflowId).toBe('wf-002')
    expect(result.overallStatus).toBe('success')
    expect(result.hasSimulatedSteps).toBe(false)
    expect(result.failedStepIds).toEqual([])
    expect(result.customerConfirmationAllowed).toBe(true)
    expect(result.steps).toHaveLength(4)
    expect(result.steps.map((s) => s.status)).toEqual(['success', 'success', 'success', 'success'])
  })

  it('2. returns partial status when calendar and whatsapp steps are simulated', async () => {
    vi.stubEnv('N8N_CLINIC_WEBHOOK_URL', 'https://n8n.example.test/clinic-webhook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))

    // Execute with no adapters passed (default simulation mode)
    const result = await executeClinicWorkflow({
      bookingId: 'booking_001',
      patient: samplePatient,
      conversationId: 'chat_clinic_001',
    })

    expect(result.overallStatus).toBe('partial')
    expect(result.hasSimulatedSteps).toBe(true)
    expect(result.customerConfirmationAllowed).toBe(false)
    expect(result.steps.find((s) => s.stepId === 's2')?.status).toBe('simulated')
    expect(result.steps.find((s) => s.stepId === 's3')?.status).toBe('simulated')
  })

  it('3. returns failed status when database insertion fails', async () => {
    mockInsert.mockImplementationOnce(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database constraint violation' } }),
      })),
    }))

    const result = await executeClinicWorkflow({
      bookingId: 'booking_001',
      patient: samplePatient,
      conversationId: 'chat_clinic_001',
      adapters: liveAdapters,
    })

    expect(result.overallStatus).toBe('failed')
    expect(result.failedStepIds).toContain('s1')
    expect(result.customerConfirmationAllowed).toBe(false)
  })

  it('4. returns failed status when n8n webhook returns non-200 HTTP response', async () => {
    vi.stubEnv('N8N_CLINIC_WEBHOOK_URL', 'https://n8n.example.test/clinic-webhook')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    const result = await executeClinicWorkflow({
      bookingId: 'booking_001',
      patient: samplePatient,
      conversationId: 'chat_clinic_001',
      adapters: liveAdapters,
    })

    expect(result.overallStatus).toBe('failed')
    expect(result.failedStepIds).toContain('s4')
    expect(result.n8nResult.status).toBe('dispatched')
    expect(result.n8nResult.statusCode).toBe(500)
  })

  it('5. formats truthful customer messages across success, partial, and failed states', () => {
    const successMsg = getClinicCustomerMessage(
      { overallStatus: 'success', customerConfirmationAllowed: true },
      { patientName: 'Priya', appointmentDate: '2026-09-05', appointmentTime: '10:00 AM', doctorName: 'Dr. Verma' }
    )
    expect(successMsg).toContain('confirmed for Priya')
    expect(successMsg).toContain('Dr. Verma')

    const partialMsg = getClinicCustomerMessage(
      { overallStatus: 'partial', customerConfirmationAllowed: false },
      { patientName: 'Priya', appointmentDate: '2026-09-05', appointmentTime: '10:00 AM', doctorName: 'Dr. Verma' }
    )
    expect(partialMsg).toContain('has been recorded')
    expect(partialMsg).toContain('confirm the final slot shortly')

    const failedMsg = getClinicCustomerMessage(
      { overallStatus: 'failed', customerConfirmationAllowed: false }
    )
    expect(failedMsg).toContain("couldn't complete the booking automatically")
  })

  it('6. routes book_clinic_appointment tool call through executeClinicWorkflow in dispatcher', async () => {
    const toolCallArgs = {
      patient_name: 'Priya Sharma',
      patient_phone: '+919876512345',
      patient_email: 'priya@example.com',
      appointment_date: '2026-09-05',
      appointment_time: '10:00 AM',
      doctor_name: 'Dr. Verma',
      reason: 'Teeth cleaning',
    }

    const response = await dispatchToolCall('book_clinic_appointment', toolCallArgs)

    expect(response.success).toBe(true)
    expect(response.result.workflowId).toBe('wf-002')
    expect(response.result.patientName).toBe('Priya Sharma')
    expect(response.result.doctorName).toBe('Dr. Verma')
    expect(response.result.steps).toHaveLength(4)
    expect(response.result.message).toContain('has been recorded')
  })
})
