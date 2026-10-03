import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  Gemini,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_GEMINI_TIMEOUT_MS,
  extractConversationTextFromContents,
  getSimulatedResponse,
} from '@/lib/ai/gemini'
import { GoogleGenerativeAI } from '@google/generative-ai'

vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn()
  const mockEmbedContent = vi.fn()
  const mockGetGenerativeModel = vi.fn().mockImplementation(() => ({
    generateContent: mockGenerateContent,
    embedContent: mockEmbedContent,
  }))

  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    })),
  }
})

describe('lib/ai/gemini - Gemini Client & Runtime Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── 1. Content Formatting Helper ──────────────────────────────────────────
  describe('extractConversationTextFromContents()', () => {
    it('returns empty string for undefined or empty contents', () => {
      expect(extractConversationTextFromContents(undefined)).toBe('')
      expect(extractConversationTextFromContents([])).toBe('')
    })

    it('formats user and model turns into clean transcript text', () => {
      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: 'Hello, looking for a 3 BHK villa in Tirupati' }],
        },
        {
          role: 'model' as const,
          parts: [{ text: 'Welcome! What is your budget range?' }],
        },
        {
          role: 'user' as const,
          parts: [{ text: 'My budget is 1.5 Cr and phone is 9876543210' }],
        },
      ]

      const formatted = extractConversationTextFromContents(contents)

      expect(formatted).toContain('Customer: Hello, looking for a 3 BHK villa in Tirupati')
      expect(formatted).toContain('Assistant: Welcome! What is your budget range?')
      expect(formatted).toContain('Customer: My budget is 1.5 Cr and phone is 9876543210')
    })

    it('formats function calls and function responses cleanly', () => {
      const contents = [
        {
          role: 'model' as const,
          parts: [{ functionCall: { name: 'create_lead', args: { name: 'Kavita', phone: '9876543210' } } }],
        },
        {
          role: 'function' as const,
          parts: [{ functionResponse: { name: 'create_lead', response: { leadId: 'lead_123', success: true } } }],
        },
      ]

      const formatted = extractConversationTextFromContents(contents as any)

      expect(formatted).toContain('[Action: create_lead({"name":"Kavita","phone":"9876543210"})]')
      expect(formatted).toContain('[Result: {"leadId":"lead_123","success":true}]')
    })
  })

  // ─── 2. Offline Simulation Fallback with Structured Contents ───────────────
  describe('Simulation Fallback with Structured Contents', () => {
    it('accurately parses conversation state and generates real estate response from structured contents', async () => {
      // Offline client (no API key)
      const offlineClient = new Gemini('')

      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: 'My name is Suresh, phone 9123456789. Looking for 3 BHK villa in Tirupati with budget 1.8 Cr.' }],
        },
      ]

      const response = await offlineClient.generateContentWithTools({
        contents,
      })

      expect(response.text).toBeDefined()
      expect(response.text).toContain('Suresh')
      expect(response.text).toContain('3 BHK')
      expect(response.text).toContain('Tirupati')
      expect(response.text?.toLowerCase()).toContain('recorded')
      expect(response.text?.toLowerCase()).not.toMatch(/reserved|confirmed|scheduled|booked/)
      expect(response.functionCalls).toEqual([])
    })

    it('extracts site visit dates from structured multi-turn conversation in simulation mode', async () => {
      const offlineClient = new Gemini('')

      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: 'Hello, I want to schedule a site visit this Saturday for 2 BHK apartment in Tirupati.' }],
        },
      ]

      const response = await offlineClient.generateContentWithTools({
        contents,
      })

      expect(response.text).toBeDefined()
      expect(response.text?.toLowerCase()).toContain('site visit')
      expect(response.text).toContain('Saturday')
      expect(response.text?.toLowerCase()).not.toMatch(/reserved|confirmed|scheduled|booked/)
    })
  })

  // ─── 3. Request Timeout Configuration ──────────────────────────────────────
  describe('Timeout Configuration Pass-Through', () => {
    it('uses DEFAULT_GEMINI_TIMEOUT_MS (15000ms) by default for live client calls', async () => {
      const liveClient = new Gemini('valid_test_api_key_12345')

      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: Promise.resolve({
            text: () => 'Live response text',
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 15, totalTokenCount: 25 },
          }),
        }),
      }

      const mockGetGenerativeModel = vi.fn().mockReturnValue(mockModel)
      vi.mocked(GoogleGenerativeAI).mockImplementationOnce(() => ({
        getGenerativeModel: mockGetGenerativeModel,
      } as any))

      // Re-instantiate with mocked GoogleGenerativeAI
      const client = new Gemini('valid_test_api_key_12345')
      await client.generateText({ prompt: 'Hello world' })

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.objectContaining({ model: DEFAULT_GEMINI_MODEL }),
        expect.objectContaining({ timeout: DEFAULT_GEMINI_TIMEOUT_MS })
      )
    })

    it('accepts a custom timeoutMs override in generateText() and generateContentWithTools()', async () => {
      const mockModel = {
        generateContent: vi.fn().mockResolvedValue({
          response: Promise.resolve({
            text: () => 'Custom timeout response',
            candidates: [],
          }),
        }),
      }

      const mockGetGenerativeModel = vi.fn().mockReturnValue(mockModel)
      vi.mocked(GoogleGenerativeAI).mockImplementationOnce(() => ({
        getGenerativeModel: mockGetGenerativeModel,
      } as any))

      const client = new Gemini('valid_test_api_key_12345')
      await client.generateContentWithTools({
        prompt: 'Book visit',
        timeoutMs: 5000,
      })

      expect(mockGetGenerativeModel).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ timeout: 5000 })
      )
    })
  })

  // ─── 4. Persona Routing Guard: AI Appointment Booking vs Real Estate ───────
  describe('Persona Routing Guard (Clinic / Appointment Booking vs Real Estate)', () => {
    const clinicSystemPrompt = `You are GrovAI, an elite Medical & Dental Clinic AI Front-Desk Receptionist.
Your goal is to assist patients, answer inquiries regarding clinic hours/doctors, and book appointments using the 'book_clinic_appointment' tool.

**Clinic Information:**
- Hours: Mon - Sat: 9:00 AM - 6:00 PM (Closed Sundays)
- Doctors: Dr. Verma (General Dentistry), Dr. Reddy (Orthodontics)
- When patient provides name, phone, date, and time, invoke the 'book_clinic_appointment' tool.`

    const reSystemPrompt = `You are GrovAI, an elite AI Real Estate Lead Receptionist for Grovaitech Real Estate.`

    const legalSystemPrompt = `You are GrovAI, an elite Legal Intake & Conflict Resolution AI Specialist for law firms.`

    const salonSystemPrompt = `You are GrovAI, an elite Salon & Spa Front-Desk AI Receptionist.`

    const hvacSystemPrompt = `You are GrovAI, an elite AI Home Services Receptionist and Lead Recovery Coordinator for residential HVAC contractors.`

    it('A. initial dental appointment request asks for contact, date, and time', () => {
      const prompt = 'Customer: Hi, I want to book a dental consultation. I need an appointment with Dr. K. Dharma Reddy. What slots are available?'
      const res = getSimulatedResponse(prompt, clinicSystemPrompt)
      expect(res).toContain('appointment')
      expect(res.toLowerCase()).toMatch(/name|phone|date/)
      expect(res.toLowerCase()).not.toContain('property search')
      expect(res.toLowerCase()).not.toContain('villa')
    })

    it('B. user provides name ("i am james bond") -> remains in appointment context, no property search', () => {
      const multiTurnPrompt = [
        'Customer: Hi, I want to book a dental consultation. I need an appointment with Dr. K. Dharma Reddy. What slots are available?',
        'Assistant: Hello! I can certainly help you book an appointment at the clinic. Could you please tell me your full name, phone number, and preferred date/time?',
        'Customer: i am james bond',
      ].join('\n')

      const res = getSimulatedResponse(multiTurnPrompt, clinicSystemPrompt)
      expect(res.toLowerCase()).not.toContain('property search')
      expect(res.toLowerCase()).not.toContain('villa')
      expect(res.toLowerCase()).not.toContain('real estate')
      expect(res.toLowerCase()).not.toContain('budget')
      // Must stay in clinic/appointment context acknowledging name
      expect(res).toContain('James')
      expect(res.toLowerCase()).toMatch(/phone|date|appointment|consultation|clinic/)
    })

    it('C. user provides phone and appointment date -> records appointment, no property search', () => {
      const multiTurnPrompt = [
        'Customer: Hi, I want to book a dental consultation. I need an appointment with Dr. K. Dharma Reddy.',
        'Assistant: Hello! I can certainly help you book an appointment at the clinic. Could you please tell me your full name, phone number, and preferred date/time?',
        'Customer: My name is James Bond, phone 9876543210, tomorrow 10am',
      ].join('\n')

      const res = getSimulatedResponse(multiTurnPrompt, clinicSystemPrompt)
      expect(res.toLowerCase()).not.toContain('property search')
      expect(res.toLowerCase()).not.toContain('real estate')
      expect(res.toLowerCase()).not.toContain('villa')
      expect(res.toLowerCase()).toMatch(/appointment|medical|front-desk|slot|clinic/)
    })

    it('D. multi-turn structured contents extraction maintains clinic persona without property search fallback', async () => {
      const offlineClient = new Gemini('')
      const contents = [
        {
          role: 'user' as const,
          parts: [{ text: 'Hi, I want to book a dental consultation with Dr. Reddy' }],
        },
        {
          role: 'model' as const,
          parts: [{ text: 'Hello! I can certainly help you book an appointment at the clinic. Could you please tell me your full name, phone number, and preferred date/time?' }],
        },
        {
          role: 'user' as const,
          parts: [{ text: 'i am james bond' }],
        },
      ]

      const response = await offlineClient.generateContentWithTools({
        contents,
        systemInstruction: clinicSystemPrompt,
      })

      expect(response.text).toBeDefined()
      expect(response.text?.toLowerCase()).not.toContain('property search')
      expect(response.text?.toLowerCase()).not.toContain('real estate')
      expect(response.text?.toLowerCase()).not.toContain('villa')
      expect(response.text?.toLowerCase()).toMatch(/james|phone|date|appointment|consultation|clinic/)
    })

    it('E. Real Estate employee still receives its own correct context', () => {
      const rePrompt = 'Customer: Hello, looking for a 3 BHK villa in Tirupati with budget 1.5 Cr'
      const res = getSimulatedResponse(rePrompt, reSystemPrompt)
      expect(res.toLowerCase()).toMatch(/villa|3 bhk|tirupati|property|real estate|budget/)
      expect(res.toLowerCase()).not.toContain('clinic')
      expect(res.toLowerCase()).not.toContain('doctor')
    })

    it('F. other receptionist-style employees (legal, salon, hvac) maintain their own domain context', () => {
      // Legal Intake
      const legalRes = getSimulatedResponse('Customer: Hello, I need to consult a lawyer about a contract dispute.', legalSystemPrompt)
      expect(legalRes.toLowerCase()).not.toContain('property search')
      expect(legalRes.toLowerCase()).toMatch(/legal|law|inquiry|consult/)

      // Salon & Spa Receptionist
      const salonRes = getSimulatedResponse('Customer: Hello, I would like to book a haircut and facial.', salonSystemPrompt)
      expect(salonRes.toLowerCase()).not.toContain('property search')
      expect(salonRes.toLowerCase()).toMatch(/salon|spa|appointment|service/)

      // HVAC Receptionist
      const hvacRes = getSimulatedResponse('Customer: Hello, our AC is blowing warm air.', hvacSystemPrompt)
      expect(hvacRes.toLowerCase()).not.toContain('property search')
      expect(hvacRes.toLowerCase()).toMatch(/heating|cooling|home|service/)
    })
  })
})
