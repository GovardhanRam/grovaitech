/**
 * Grovaitech AI Platform
 * lib/voice/types.ts
 *
 * TypeScript types and protocol contracts for GOVA Voice UI v1.
 * Supports Gemini Live API WebSocket protocol (BidiGenerateContent / BidiGenerateContentConstrained).
 */

export type VoiceState =
  | 'IDLE'
  | 'CONNECTING'
  | 'LISTENING'
  | 'THINKING'
  | 'SPEAKING'
  | 'DISCONNECTED'
  | 'ERROR'

export interface TranscriptItem {
  id: string
  role: 'user' | 'gova'
  text: string
  timestamp: string
  isFinal?: boolean
}

export interface VoiceSessionConfig {
  model?: string
  voiceName?: 'Aoede' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir'
  systemInstruction?: string
  inputSampleRate?: number
  outputSampleRate?: number
}

export interface LiveTokenResponse {
  success: boolean
  token: string
  model: string
  wsUrl: string
  expireTime: string
  error?: string
}

// ─── Gemini Live WebSocket Protocol Types ───────────────────────────────────

export interface GeminiLiveSetupMessage {
  setup: {
    model: string
    generationConfig?: {
      responseModalities?: ('AUDIO' | 'TEXT')[]
      speechConfig?: {
        voiceConfig?: {
          prebuiltVoiceConfig?: {
            voiceName?: string
          }
        }
      }
    }
    systemInstruction?: {
      parts: Array<{ text: string }>
    }
  }
}

export interface GeminiLiveRealtimeInputMessage {
  realtimeInput: {
    audio?: {
      mimeType: string
      data: string // Base64 encoded PCM audio
    }
    mediaChunks?: Array<{
      mimeType: string
      data: string
    }>
  }
}

export interface GeminiLiveClientContentMessage {
  clientContent: {
    turns: Array<{
      role: 'user'
      parts: Array<{ text: string }>
    }>
    turnComplete: boolean
  }
}

export interface GeminiLiveServerContent {
  modelTurn?: {
    parts?: Array<{
      text?: string
      inlineData?: {
        mimeType: string
        data: string // Base64 encoded audio
      }
    }>
  }
  turnComplete?: boolean
  interrupted?: boolean
}

export interface GeminiLiveServerMessage {
  setupComplete?: Record<string, unknown>
  serverContent?: GeminiLiveServerContent
  error?: {
    code: number
    message: string
    status: string
  }
}
