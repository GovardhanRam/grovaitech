/**
 * Grovaitech AI Platform
 * tests/unit/gova-voice.test.ts
 *
 * Comprehensive unit tests for GOVA Voice UI v1:
 * - Audio codecs & resampling (PCM16 / Float32 / Base64)
 * - Protocol contracts (gemini-3.1-flash-live-preview & BidiGenerateContent)
 * - Server-side ephemeral token authentication (/api/voice/token)
 * - Secret protection & key leakage prevention
 * - Interruption barge-in signal handling
 * - GOVA system identity verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  float32ToPcm16,
  pcm16ToFloat32,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  resampleAudioBuffer,
} from '@/lib/voice/audio'
import {
  GEMINI_LIVE_MODEL,
  GEMINI_LIVE_WS_URL,
  POST as tokenRoutePost,
} from '@/app/api/voice/token/route'
import {
  DEFAULT_GOVA_IDENTITY,
  GeminiLiveSession,
  buildGovaSystemInstruction,
  toGeminiLiveToolDeclarations,
} from '@/lib/voice/live-client'
import {
  GOVA_SUPPORTED_LANGUAGES,
  GOVA_VOICE_TOOL_ALLOWLIST,
  DEFAULT_VOICE_TOOL_NAMES,
} from '@/lib/voice/types'
import { POST as voiceToolExecutePost } from '@/app/api/voice/tools/execute/route'
import { NextRequest } from 'next/server'

describe('GOVA Voice UI v1 - Audio Processing Utilities', () => {
  it('1. converts Float32Array to 16-bit linear PCM Int16Array accurately', () => {
    const input = new Float32Array([-1.0, -0.5, 0.0, 0.5, 1.0])
    const pcm16 = float32ToPcm16(input)

    expect(pcm16).toBeInstanceOf(Int16Array)
    expect(pcm16.length).toBe(5)
    expect(pcm16[0]).toBe(-32768) // -1.0 * 0x8000
    expect(pcm16[2]).toBe(0) // 0.0
    expect(pcm16[4]).toBe(32767) // 1.0 * 0x7FFF
  })

  it('2. converts Int16Array back to Float32Array with minimal quantization error', () => {
    const pcm16 = new Int16Array([-32768, 0, 32767])
    const float32 = pcm16ToFloat32(pcm16)

    expect(float32).toBeInstanceOf(Float32Array)
    expect(float32.length).toBe(3)
    expect(float32[0]).toBeCloseTo(-1.0, 4)
    expect(float32[1]).toBe(0.0)
    expect(float32[2]).toBeCloseTo(1.0, 4)
  })

  it('3. roundtrips binary data through ArrayBuffer <-> Base64 without corruption', () => {
    const original = new Uint8Array([0, 15, 255, 128, 64, 32, 16, 8, 4, 2, 1])
    const base64 = arrayBufferToBase64(original.buffer)
    expect(typeof base64).toBe('string')
    expect(base64.length).toBeGreaterThan(0)

    const restoredBuffer = base64ToArrayBuffer(base64)
    const restored = new Uint8Array(restoredBuffer)

    expect(restored.length).toBe(original.length)
    for (let i = 0; i < original.length; i++) {
      expect(restored[i]).toBe(original[i])
    }
  })

  it('4. resamples audio buffer between sample rates (e.g. 48kHz to 16kHz)', () => {
    // 480 samples at 48kHz = 10ms of audio -> should become ~160 samples at 16kHz
    const input = new Float32Array(480)
    for (let i = 0; i < 480; i++) {
      input[i] = Math.sin((i / 480) * 2 * Math.PI)
    }

    const resampled = resampleAudioBuffer(input, 48000, 16000)
    expect(resampled.length).toBe(160)
    expect(resampled[0]).toBeCloseTo(input[0], 2)
  })

  it('5. returns identical buffer if source and target sample rates match', () => {
    const input = new Float32Array([0.1, 0.2, 0.3])
    const resampled = resampleAudioBuffer(input, 16000, 16000)
    expect(resampled).toBe(input)
  })
})

describe('GOVA Voice UI v1 - Model & Protocol Specifications', () => {
  it('1. targets the approved Gemini Live model gemini-3.1-flash-live-preview', () => {
    expect(GEMINI_LIVE_MODEL).toBe('gemini-3.1-flash-live-preview')
    expect(GEMINI_LIVE_MODEL).not.toContain('1.5')
    expect(GEMINI_LIVE_MODEL).not.toContain('2.5')
  })

  it('2. uses the constrained Google Gemini Live WebSocket endpoint', () => {
    expect(GEMINI_LIVE_WS_URL).toContain('generativelanguage.googleapis.com')
    expect(GEMINI_LIVE_WS_URL).toContain('BidiGenerateContentConstrained')
    expect(GEMINI_LIVE_WS_URL.startsWith('wss://')).toBe(true)
  })

  it('3. embodies the official canonical GOVA intelligence identity', () => {
    expect(DEFAULT_GOVA_IDENTITY).toContain('GOVA')
    expect(DEFAULT_GOVA_IDENTITY).toContain('Grovaitech AI Workforce OS')
    expect(DEFAULT_GOVA_IDENTITY).toContain('AI Employees')
    expect(DEFAULT_GOVA_IDENTITY).toContain('must not falsely claim')
  })
})

describe('GOVA Voice UI v1 - Server-Side Ephemeral Token Route', () => {
  const originalEnvKey = process.env.GEMINI_API_KEY
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env.GEMINI_API_KEY = originalEnvKey
    global.fetch = originalFetch
  })

  it('1. returns 503 if GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY

    const req = new NextRequest('http://localhost:3000/api/voice/token', { method: 'POST' })
    const res = await tokenRoutePost(req)

    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.code).toBe('MISSING_API_KEY')
    expect(json.error).toContain('GEMINI_API_KEY is not configured')
  })

  it('2. successfully obtains and returns single-use ephemeral token from Google', async () => {
    process.env.GEMINI_API_KEY = 'AIzaSyFakeTestKeyForLiveVoiceVerification'

    const mockGoogleResponse = {
      name: 'auth_tokens/test-ephemeral-token-abc-12345',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGoogleResponse,
    } as any)

    const req = new NextRequest('http://localhost:3000/api/voice/token', { method: 'POST' })
    const res = await tokenRoutePost(req)

    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.token).toBe('auth_tokens/test-ephemeral-token-abc-12345')
    expect(json.model).toBe('gemini-3.1-flash-live-preview')
    expect(json.wsUrl).toBe(GEMINI_LIVE_WS_URL)
    expect(json.expireTime).toBeDefined()

    // Verify upstream call was constrained
    expect(global.fetch).toHaveBeenCalledTimes(1)
    const [fetchUrl, fetchOptions] = (global.fetch as any).mock.calls[0]
    expect(fetchUrl).toContain('generativelanguage.googleapis.com/v1beta/auth_tokens')
    const body = JSON.parse(fetchOptions.body)
    expect(body.uses).toBe(1)
    expect(body.expireTime).toBeDefined()
  })

  it('3. NEVER leaks GEMINI_API_KEY in the client response payload', async () => {
    const sensitiveKey = 'AIzaSySecretNeverExposeToClientCode999'
    process.env.GEMINI_API_KEY = sensitiveKey

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'auth_tokens/token-safe' }),
    } as any)

    const req = new NextRequest('http://localhost:3000/api/voice/token', { method: 'POST' })
    const res = await tokenRoutePost(req)
    const responseText = await res.text()

    expect(responseText).not.toContain(sensitiveKey)
  })

  it('4. handles upstream Google token service error gracefully without leaking key', async () => {
    const sensitiveKey = 'AIzaSySecretNeverExposeToClientCode888'
    process.env.GEMINI_API_KEY = sensitiveKey

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => `Permission denied for key ${sensitiveKey}`,
    } as any)

    const req = new NextRequest('http://localhost:3000/api/voice/token', { method: 'POST' })
    const res = await tokenRoutePost(req)

    expect(res.status).toBe(502)
    const json = await res.json()
    expect(json.code).toBe('UPSTREAM_TOKEN_ERROR')
    expect(JSON.stringify(json)).not.toContain(sensitiveKey)
  })
})

describe('GOVA Voice UI v1 - GeminiLiveSession Protocol & Regression Tests', () => {
  it('1. sends audio using the supported realtimeInput.audio schema with 16kHz PCM MIME type', async () => {
    let capturedSentData: string | null = null
    const mockWs = {
      readyState: 1, // OPEN
      binaryType: 'blob',
      send: vi.fn((data: string) => {
        capturedSentData = data
      }),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
    }

    const MockWebSocketClass: any = vi.fn().mockImplementation(() => mockWs)
    MockWebSocketClass.OPEN = 1
    MockWebSocketClass.CONNECTING = 0
    MockWebSocketClass.CLOSING = 2
    MockWebSocketClass.CLOSED = 3
    vi.stubGlobal('WebSocket', MockWebSocketClass)

    const session = new GeminiLiveSession(
      'wss://mock.gemini.live',
      { model: 'gemini-3.1-flash-live-preview' },
      {
        onStateChange: vi.fn(),
        onAudioChunk: vi.fn(),
        onTranscript: vi.fn(),
        onInterrupted: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
      }
    )

    await session.connect()
    // Simulate setup complete from server
    mockWs.onmessage({ data: JSON.stringify({ setupComplete: {} }) })

    // Send 16-bit PCM audio
    const pcmData = new Int16Array([100, -200, 300, -400])
    session.sendRealtimeAudio(pcmData)

    expect(capturedSentData).not.toBeNull()
    const parsed = JSON.parse(capturedSentData!)

    // Must have realtimeInput.audio
    expect(parsed.realtimeInput).toBeDefined()
    expect(parsed.realtimeInput.audio).toBeDefined()
    expect(parsed.realtimeInput.audio.mimeType).toBe('audio/pcm;rate=16000')
    expect(typeof parsed.realtimeInput.audio.data).toBe('string')

    // Must NOT have deprecated mediaChunks
    expect(parsed.realtimeInput.mediaChunks).toBeUndefined()

    vi.unstubAllGlobals()
  })

  it('2. transitions to ERROR state and relays reason on abnormal WebSocket closure (e.g. 1007)', async () => {
    const mockWs = {
      readyState: 1,
      binaryType: 'blob',
      send: vi.fn(),
      close: vi.fn(),
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
    }

    vi.stubGlobal('WebSocket', vi.fn().mockImplementation(() => mockWs))

    const stateChanges: string[] = []
    let receivedError: string | null = null

    const session = new GeminiLiveSession(
      'wss://mock.gemini.live',
      { model: 'gemini-3.1-flash-live-preview' },
      {
        onStateChange: (s) => stateChanges.push(s),
        onAudioChunk: vi.fn(),
        onTranscript: vi.fn(),
        onInterrupted: vi.fn(),
        onError: (err) => {
          receivedError = err
        },
        onClose: vi.fn(),
      }
    )

    await session.connect()
    mockWs.onmessage({ data: JSON.stringify({ setupComplete: {} }) })

    // Simulate server closing with protocol error 1007
    const serverReason = 'realtime_input.media_chunks is deprecated. Use audio, video, or text instead.'
    mockWs.onclose({ code: 1007, reason: serverReason })

    expect(session.getState()).toBe('ERROR')
    expect(stateChanges).toContain('ERROR')
    expect(receivedError).toBe(serverReason)

    vi.unstubAllGlobals()
  })

  it('3. transitions to DISCONNECTED state on clean user/server close (1000)', async () => {
    const mockWs = {
      readyState: 1,
      binaryType: 'blob',
      send: vi.fn(),
      close: vi.fn(),
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
    }

    vi.stubGlobal('WebSocket', vi.fn().mockImplementation(() => mockWs))

    const stateChanges: string[] = []

    const session = new GeminiLiveSession(
      'wss://mock.gemini.live',
      { model: 'gemini-3.1-flash-live-preview' },
      {
        onStateChange: (s) => stateChanges.push(s),
        onAudioChunk: vi.fn(),
        onTranscript: vi.fn(),
        onInterrupted: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
      }
    )

    await session.connect()
    mockWs.onclose({ code: 1000, reason: 'Normal Closure' })

    expect(session.getState()).toBe('DISCONNECTED')

    vi.unstubAllGlobals()
  })
})

describe('GOVA Voice Phase 2 - Multilingual Voice Capabilities', () => {
  it('1. configures the 6 canonical Indic and English languages with exact locale codes', () => {
    const codes = GOVA_SUPPORTED_LANGUAGES.map((l) => l.code)
    expect(codes).toContain('en-IN')
    expect(codes).toContain('te-IN')
    expect(codes).toContain('ta-IN')
    expect(codes).toContain('hi-IN')
    expect(codes).toContain('kn-IN')
    expect(codes).toContain('ml-IN')
    expect(GOVA_SUPPORTED_LANGUAGES.length).toBe(6)

    const te = GOVA_SUPPORTED_LANGUAGES.find((l) => l.code === 'te-IN')
    expect(te?.nativeName).toBe('తెలుగు')

    const ta = GOVA_SUPPORTED_LANGUAGES.find((l) => l.code === 'ta-IN')
    expect(ta?.nativeName).toBe('தமிழ்')

    const hi = GOVA_SUPPORTED_LANGUAGES.find((l) => l.code === 'hi-IN')
    expect(hi?.nativeName).toBe('हिन्दी')
  })

  it('2. embeds multilingual mirroring and smooth language switching in system instructions', () => {
    const instruction = buildGovaSystemInstruction()
    expect(instruction).toContain('English (en-IN)')
    expect(instruction).toContain('Telugu (te-IN)')
    expect(instruction).toContain('Tamil (ta-IN)')
    expect(instruction).toContain('Hindi (hi-IN)')
    expect(instruction).toContain('Kannada (kn-IN)')
    expect(instruction).toContain('Malayalam (ml-IN)')
    expect(instruction).toContain("Respond in the user's current spoken language by default")
    expect(instruction).toContain('switches languages during the conversation')
    expect(instruction).toContain('Do not repeat or translate the user')
  })

  it('3. enforces natural spoken audio formatting rules without markdown or bullet points', () => {
    const instruction = buildGovaSystemInstruction()
    expect(instruction).toContain('usually 1-3 sentences')
    expect(instruction).toContain('Do NOT use markdown formatting')
    expect(instruction).toContain('bullet points')
  })

  it('4. maintains language-independent parameter schemas regardless of user language', () => {
    const tools = toGeminiLiveToolDeclarations(['book_clinic_appointment', 'schedule_site_visit'])
    expect(tools.length).toBe(1)
    const declarations = tools[0].functionDeclarations
    expect(declarations.length).toBe(2)

    const clinicDecl = declarations.find((d) => d.name === 'book_clinic_appointment')
    expect(clinicDecl?.parameters?.required).toContain('patient_name')
    expect(clinicDecl?.parameters?.required).toContain('appointment_date')
  })
})

describe('GOVA Voice Phase 2 - Tool Declarations & Explicit Allowlist', () => {
  it('1. generates Gemini Live tool declarations from Grovaitech canonical tool definitions', () => {
    const tools = toGeminiLiveToolDeclarations(DEFAULT_VOICE_TOOL_NAMES)
    expect(tools.length).toBe(1)
    const declarations = tools[0].functionDeclarations

    const names = declarations.map((d) => d.name)
    expect(names).toContain('schedule_site_visit')
    expect(names).toContain('book_clinic_appointment')
    expect(names).toContain('lookup_order_and_support')
    expect(names).toContain('search_knowledge_base')

    for (const decl of declarations) {
      expect(decl.name).toBeDefined()
      expect(decl.description).toBeDefined()
      expect(decl.parameters).toBeDefined()
    }
  })

  it('2. filters out unallowed tools not present on GOVA_VOICE_TOOL_ALLOWLIST', () => {
    const tools = toGeminiLiveToolDeclarations([
      'schedule_site_visit',
      'unauthorized_shell_exec',
      'delete_database_records',
    ])

    expect(tools.length).toBe(1)
    const names = tools[0].functionDeclarations.map((d) => d.name)
    expect(names).toContain('schedule_site_visit')
    expect(names).not.toContain('unauthorized_shell_exec')
    expect(names).not.toContain('delete_database_records')
  })

  it('3. includes function declarations in GeminiLiveSession setup message', async () => {
    let capturedSetup: string | null = null
    const mockWs = {
      readyState: 1,
      send: vi.fn((data: string) => {
        capturedSetup = data
      }),
      close: vi.fn(),
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
    }

    const MockWebSocketClass: any = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any)
      }, 0)
      return mockWs
    })
    MockWebSocketClass.OPEN = 1
    vi.stubGlobal('WebSocket', MockWebSocketClass)

    const session = new GeminiLiveSession(
      'wss://mock.gemini.live',
      {
        model: 'gemini-3.1-flash-live-preview',
        allowedTools: ['schedule_site_visit', 'search_knowledge_base'],
      },
      {
        onStateChange: vi.fn(),
        onAudioChunk: vi.fn(),
        onTranscript: vi.fn(),
        onInterrupted: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
      }
    )

    await session.connect()
    if (mockWs.onopen) {
      mockWs.onopen({} as any)
    }

    expect(capturedSetup).not.toBeNull()
    const parsed = JSON.parse(capturedSetup!)

    expect(parsed.setup.tools).toBeDefined()
    expect(parsed.setup.tools.length).toBe(1)
    const names = parsed.setup.tools[0].functionDeclarations.map((d: any) => d.name)
    expect(names).toContain('schedule_site_visit')
    expect(names).toContain('search_knowledge_base')

    vi.unstubAllGlobals()
  })
})

describe('GOVA Voice Phase 2 - Real-Time Tool Calling Wire Protocol', () => {
  it('1. executes incoming toolCall, sets state to THINKING, and sends toolResponse back', async () => {
    let capturedResponse: string | null = null
    const stateHistory: string[] = []

    const mockWs = {
      readyState: 1,
      send: vi.fn((data: string) => {
        capturedResponse = data
      }),
      close: vi.fn(),
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
    }

    const MockWebSocketClass: any = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any)
      }, 0)
      return mockWs
    })
    MockWebSocketClass.OPEN = 1
    vi.stubGlobal('WebSocket', MockWebSocketClass)

    const mockExecutor = vi.fn().mockResolvedValue({
      bookingId: 'book-dental-999',
      status: 'confirmed',
      timeSlot: '2026-09-12 10:00 AM',
    })

    const session = new GeminiLiveSession(
      'wss://mock.gemini.live',
      {
        model: 'gemini-3.1-flash-live-preview',
        toolExecutor: mockExecutor,
      },
      {
        onStateChange: (s) => stateHistory.push(s),
        onAudioChunk: vi.fn(),
        onTranscript: vi.fn(),
        onInterrupted: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
      }
    )

    await session.connect()
    mockWs.onmessage({ data: JSON.stringify({ setupComplete: {} }) })

    // Simulate Gemini Live issuing a tool call
    const incomingToolCall = {
      toolCall: {
        functionCalls: [
          {
            id: 'call_clinic_001',
            name: 'book_clinic_appointment',
            args: {
              patient_name: 'Suresh Rao',
              patient_phone: '+919876543210',
              appointment_date: '2026-09-12',
              appointment_time: '10:00 AM',
            },
          },
        ],
      },
    }

    await mockWs.onmessage({ data: JSON.stringify(incomingToolCall) })

    expect(stateHistory).toContain('THINKING')
    expect(mockExecutor).toHaveBeenCalledWith('book_clinic_appointment', {
      patient_name: 'Suresh Rao',
      patient_phone: '+919876543210',
      appointment_date: '2026-09-12',
      appointment_time: '10:00 AM',
    })

    expect(capturedResponse).not.toBeNull()
    const parsedResp = JSON.parse(capturedResponse!)

    expect(parsedResp.toolResponse).toBeDefined()
    expect(parsedResp.toolResponse.functionResponses.length).toBe(1)
    const fnResp = parsedResp.toolResponse.functionResponses[0]
    expect(fnResp.id).toBe('call_clinic_001')
    expect(fnResp.name).toBe('book_clinic_appointment')
    expect(fnResp.response.bookingId).toBe('book-dental-999')
    expect(fnResp.response.status).toBe('confirmed')

    vi.unstubAllGlobals()
  })

  it('2. discards responses for tool calls cancelled via toolCallCancellation', async () => {
    let capturedToolResponse: string | null = null

    const mockWs = {
      readyState: 1,
      send: vi.fn((data: string) => {
        if (data.includes('toolResponse')) {
          capturedToolResponse = data
        }
      }),
      close: vi.fn(),
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
    }

    const MockWebSocketClass: any = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any)
      }, 0)
      return mockWs
    })
    MockWebSocketClass.OPEN = 1
    vi.stubGlobal('WebSocket', MockWebSocketClass)

    const session = new GeminiLiveSession(
      'wss://mock.gemini.live',
      {
        model: 'gemini-3.1-flash-live-preview',
      },
      {
        onStateChange: vi.fn(),
        onAudioChunk: vi.fn(),
        onTranscript: vi.fn(),
        onInterrupted: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
        onToolCall: vi.fn().mockResolvedValue({ status: 'cancelled_test' }),
      }
    )

    await session.connect()
    mockWs.onmessage({ data: JSON.stringify({ setupComplete: {} }) })

    // Simulate Gemini Live cancelling a tool call due to user barge-in
    mockWs.onmessage({
      data: JSON.stringify({
        toolCallCancellation: {
          ids: ['call_cancelled_101'],
        },
      }),
    })

    // Issue tool call matching the cancelled ID
    await mockWs.onmessage({
      data: JSON.stringify({
        toolCall: {
          functionCalls: [
            {
              id: 'call_cancelled_101',
              name: 'schedule_site_visit',
              args: {},
            },
          ],
        },
      }),
    })

    expect(capturedToolResponse).toBeNull()
    vi.unstubAllGlobals()
  })

  it('3. safely catches tool execution errors and returns structured failure in toolResponse', async () => {
    let capturedToolResponse: string | null = null

    const mockWs = {
      readyState: 1,
      send: vi.fn((data: string) => {
        if (data.includes('toolResponse')) {
          capturedToolResponse = data
        }
      }),
      close: vi.fn(),
      onopen: null as any,
      onmessage: null as any,
      onerror: null as any,
      onclose: null as any,
    }

    const MockWebSocketClass3: any = vi.fn().mockImplementation(() => {
      setTimeout(() => {
        if (mockWs.onopen) mockWs.onopen({} as any)
      }, 0)
      return mockWs
    })
    MockWebSocketClass3.OPEN = 1
    vi.stubGlobal('WebSocket', MockWebSocketClass3)

    const session = new GeminiLiveSession(
      'wss://mock.gemini.live',
      {
        model: 'gemini-3.1-flash-live-preview',
      },
      {
        onStateChange: vi.fn(),
        onAudioChunk: vi.fn(),
        onTranscript: vi.fn(),
        onInterrupted: vi.fn(),
        onError: vi.fn(),
        onClose: vi.fn(),
        onToolCall: vi.fn().mockRejectedValue(new Error('Hospital database timeout')),
      }
    )

    await session.connect()
    mockWs.onmessage({ data: JSON.stringify({ setupComplete: {} }) })

    await mockWs.onmessage({
      data: JSON.stringify({
        toolCall: {
          functionCalls: [
            {
              id: 'call_err_01',
              name: 'book_clinic_appointment',
              args: { patient_name: 'Ravi' },
            },
          ],
        },
      }),
    })

    expect(capturedToolResponse).not.toBeNull()
    const parsed = JSON.parse(capturedToolResponse!)
    expect(parsed.toolResponse.functionResponses[0].response.success).toBe(false)
    expect(parsed.toolResponse.functionResponses[0].response.error).toContain('Hospital database timeout')

    vi.unstubAllGlobals()
  })
})

describe('GOVA Voice Phase 2 - Server-Side Tool Execution Route (/api/voice/tools/execute)', () => {
  it('1. rejects requests with missing toolName with HTTP 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/voice/tools/execute', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await voiceToolExecutePost(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain("'toolName' is required")
  })

  it('2. rejects unallowed tools with HTTP 403 Security Violation', async () => {
    const req = new NextRequest('http://localhost:3000/api/voice/tools/execute', {
      method: 'POST',
      body: JSON.stringify({
        toolName: 'unauthorized_shell_exec',
        args: {},
      }),
    })

    const res = await voiceToolExecutePost(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toContain('Security Violation')
  })

  it('3. executes allowed tool through Grovaitech dispatcher and returns structured outcome', async () => {
    const req = new NextRequest('http://localhost:3000/api/voice/tools/execute', {
      method: 'POST',
      body: JSON.stringify({
        toolName: 'book_clinic_appointment',
        args: {
          patient_name: 'Pooja Verma',
          patient_phone: '+919876543210',
          appointment_date: '2026-09-15',
          appointment_time: '11:00 AM',
          doctor_name: 'Dr. Reddy',
          reason: 'Routine Dental Clean',
        },
      }),
    })

    const res = await voiceToolExecutePost(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.toolName).toBe('book_clinic_appointment')
    expect(json.result).toBeDefined()
  })
})

describe('GOVA Voice Phase 2 - Business Grounding & AI Employee Context', () => {
  it('1. injects tenant business context and operating guidelines into system instructions', () => {
    const instruction = buildGovaSystemInstruction({
      tenantContext: {
        businessName: 'Apex Horizon Living',
        businessType: 'Luxury Real Estate Development',
        operatingInstructions: 'Strictly promote Tirupati villa project and require phone verification.',
      },
    })

    expect(instruction).toContain('Active Business Context:')
    expect(instruction).toContain('Apex Horizon Living')
    expect(instruction).toContain('Luxury Real Estate Development')
    expect(instruction).toContain('Strictly promote Tirupati villa project')
    expect(instruction).toContain("Use 'search_knowledge_base' to retrieve verified business documents")
  })

  it('2. injects active AI Employee persona and capabilities into system instructions', () => {
    const instruction = buildGovaSystemInstruction({
      activeEmployee: {
        id: 'emp-002',
        name: 'Clinic Receptionist',
        slug: 'clinic-receptionist',
        title: 'AI Medical Front-Desk',
        capabilities: ['Appointment booking', 'Patient intake', 'Clinic FAQ answering'],
        systemPrompt: 'Warmly assist dental clinic patients and book doctor consultation slots.',
      },
    })

    expect(instruction).toContain('Active AI Employee Delegation:')
    expect(instruction).toContain('Clinic Receptionist (AI Medical Front-Desk)')
    expect(instruction).toContain('Warmly assist dental clinic patients')
    expect(instruction).toContain('Appointment booking, Patient intake, Clinic FAQ answering')
  })
})


