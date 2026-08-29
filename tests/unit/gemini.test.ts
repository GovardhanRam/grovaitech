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
      expect(formatted).toContain('AI Receptionist: Welcome! What is your budget range?')
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
})
