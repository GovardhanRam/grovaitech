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
import { DEFAULT_GOVA_IDENTITY, GeminiLiveSession } from '@/lib/voice/live-client'
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

