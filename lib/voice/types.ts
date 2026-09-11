/**
 * Grovaitech AI Platform
 * lib/voice/types.ts
 *
 * TypeScript types and protocol contracts for GOVA Voice UI v2.
 * Supports Gemini Live API WebSocket protocol (BidiGenerateContent / BidiGenerateContentConstrained).
 * Includes Multilingual Voice, Real-Time Tool Calling, and Tenant Business Grounding.
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

// ─── Multilingual Language Definitions ──────────────────────────────────────

export interface SupportedLanguage {
  code: string
  name: string
  nativeName: string
}

export const GOVA_SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = [
  { code: 'en-IN', name: 'English', nativeName: 'English' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം' },
] as const

// ─── Voice Tool Allowlist ───────────────────────────────────────────────────

export const GOVA_VOICE_TOOL_ALLOWLIST = new Set<string>([
  'schedule_site_visit',
  'book_clinic_appointment',
  'lookup_order_and_support',
  'search_knowledge_base',
  'create_lead',
  'escalate_to_human',
  'book_salon_service',
  'book_legal_consultation',
  'schedule_onboarding_induction',
  'book_financial_consultation',
])

export const DEFAULT_VOICE_TOOL_NAMES = [
  'schedule_site_visit',
  'book_clinic_appointment',
  'lookup_order_and_support',
  'search_knowledge_base',
] as const

// ─── Business / Tenant & AI Employee Contexts ───────────────────────────────

export interface TenantVoiceContext {
  clientId?: string
  businessName?: string
  businessType?: string
  operatingInstructions?: string
}

export interface ActiveEmployeeVoiceContext {
  id: string
  name: string
  slug: string
  title: string
  systemPrompt?: string
  tools?: string[]
  capabilities?: string[]
}

export interface VoiceSessionConfig {
  model?: string
  voiceName?: 'Aoede' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir'
  systemInstruction?: string
  inputSampleRate?: number
  outputSampleRate?: number
  languageCode?: string
  allowedTools?: string[]
  tools?: GeminiLiveTool[]
  tenantContext?: TenantVoiceContext
  activeEmployee?: ActiveEmployeeVoiceContext
  toolExecutor?: (toolName: string, args: Record<string, any>) => Promise<any>
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

export interface GeminiLiveToolDeclaration {
  name: string
  description?: string
  parameters?: {
    type?: string | any
    properties?: Record<string, any>
    required?: string[]
  }
}

export interface GeminiLiveTool {
  functionDeclarations: GeminiLiveToolDeclaration[]
}

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
    tools?: GeminiLiveTool[]
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

export interface GeminiLiveFunctionCall {
  id: string
  name: string
  args: Record<string, any>
}

export interface GeminiLiveToolCall {
  functionCalls: GeminiLiveFunctionCall[]
}

export interface GeminiLiveToolCallCancellation {
  ids: string[]
}

export interface GeminiLiveFunctionResponse {
  id: string
  name: string
  response: Record<string, any>
}

export interface GeminiLiveToolResponseMessage {
  toolResponse: {
    functionResponses: GeminiLiveFunctionResponse[]
  }
}

export interface GeminiLiveServerMessage {
  setupComplete?: Record<string, unknown>
  serverContent?: GeminiLiveServerContent
  toolCall?: GeminiLiveToolCall
  toolCallCancellation?: GeminiLiveToolCallCancellation
  error?: {
    code: number
    message: string
    status: string
  }
}
