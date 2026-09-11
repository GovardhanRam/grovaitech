/**
 * Grovaitech AI Platform
 * lib/voice/live-client.ts
 *
 * Browser WebSocket client for Gemini Live API (BidiGenerateContent).
 * Connects securely using ephemeral tokens, manages session handshake with
 * multilingual identity and tool declarations, streams microphone PCM audio,
 * handles real-time bidirectional tool calling, receives model audio responses,
 * and handles real-time barge-in interruption.
 */

import {
  type VoiceState,
  type VoiceSessionConfig,
  type GeminiLiveSetupMessage,
  type GeminiLiveRealtimeInputMessage,
  type GeminiLiveServerMessage,
  type GeminiLiveTool,
  type GeminiLiveToolDeclaration,
  type GeminiLiveToolResponseMessage,
  type GeminiLiveFunctionCall,
  DEFAULT_VOICE_TOOL_NAMES,
  GOVA_VOICE_TOOL_ALLOWLIST,
} from './types'
import { arrayBufferToBase64, base64ToArrayBuffer } from './audio'
import { TOOL_REGISTRY } from '@/lib/ai/tools'

/**
 * Builds the canonical multilingual, grounded system instructions for GOVA Voice sessions.
 * Preserves core GOVA identity while adding explicit multilingual switching and tool communication.
 */
export function buildGovaSystemInstruction(config?: VoiceSessionConfig): string {
  let instruction = `You are GOVA, the central AI intelligence and voice operations interface of Grovaitech AI Workforce OS.
You speak clearly, warmly, concisely, and professionally.

Language & Multilingual Capabilities:
- You natively support English (en-IN), Telugu (te-IN), Tamil (ta-IN), Hindi (hi-IN), Kannada (kn-IN), and Malayalam (ml-IN).
- Respond in the user's current spoken language by default.
- If the user speaks Telugu, reply in Telugu.
- If the user speaks Tamil, reply in Tamil.
- If the user speaks Hindi, reply in Hindi.
- If the user speaks Kannada, reply in Kannada.
- If the user speaks Malayalam, reply in Malayalam.
- If the user speaks English, reply in English.
- If the user switches languages during the conversation (e.g. from English to Telugu, or Telugu to Tamil), naturally and smoothly continue in that new language.
- Do not force translation unless explicitly requested by the user.
- Do not repeat or translate the user's sentence back to them.
- Maintain the conversation's current language unless the user clearly switches languages.
- Preserve business context, tool names, reference IDs, tracking codes, phone numbers, and structured data accurately regardless of language.

Real-Time Tool Execution & Truthfulness:
- You coordinate AI Employees, workflows, business knowledge, tools, and enterprise actions.
- Available voice tools: schedule_site_visit, book_clinic_appointment, lookup_order_and_support, and search_knowledge_base.
- When an action is requested, call the appropriate tool with clean parameters.
- Never fabricate an action or make false claims about executing a transaction without an actual tool call; you must not falsely claim to have booked, scheduled, or queried anything unless confirmed by a real tool execution.
- When a tool is executed successfully, explain the confirmed result naturally and concisely in the user's current spoken language.
- When a tool fails or reports an error, honestly explain the issue in the user's current spoken language without technical jargon.

Conversational Audio Formatting:
- Keep spoken responses natural, concise (usually 1-3 sentences), conversational, and easy to understand over audio.
- Do NOT use markdown formatting, asterisks, bullet points, numbered lists, or URLs when speaking aloud.`

  if (config?.tenantContext?.businessName) {
    instruction += `\n\nActive Business Context:\n- Organization / Client: ${config.tenantContext.businessName}`
    if (config.tenantContext.businessType) {
      instruction += `\n- Industry / Domain: ${config.tenantContext.businessType}`
    }
    if (config.tenantContext.operatingInstructions) {
      instruction += `\n- Operating Guidelines: ${config.tenantContext.operatingInstructions}`
    }
    instruction += `\n- Always scope answers and tool actions to this business organization. Use 'search_knowledge_base' to retrieve verified business documents and FAQs.`
  }

  if (config?.activeEmployee?.name) {
    instruction += `\n\nActive AI Employee Delegation:\n- Coordinated Employee: ${config.activeEmployee.name} (${config.activeEmployee.title})`
    if (config.activeEmployee.systemPrompt) {
      instruction += `\n- Specialist Guidelines: ${config.activeEmployee.systemPrompt}`
    }
    if (config.activeEmployee.capabilities && config.activeEmployee.capabilities.length > 0) {
      instruction += `\n- Employee Capabilities: ${config.activeEmployee.capabilities.join(', ')}`
    }
  }

  return instruction
}

export const DEFAULT_GOVA_IDENTITY = buildGovaSystemInstruction()

/**
 * Converts Grovaitech canonical tool definitions into Gemini Live API functionDeclarations.
 */
export function toGeminiLiveToolDeclarations(toolNames?: readonly string[] | string[]): GeminiLiveTool[] {
  const names = toolNames || DEFAULT_VOICE_TOOL_NAMES
  const functionDeclarations: GeminiLiveToolDeclaration[] = []

  for (const name of names) {
    if (!GOVA_VOICE_TOOL_ALLOWLIST.has(name)) continue
    const registered = (TOOL_REGISTRY as Record<string, any>)[name]
    if (registered) {
      functionDeclarations.push({
        name: registered.name,
        description: registered.description,
        parameters: registered.parameters,
      })
    }
  }

  return functionDeclarations.length > 0 ? [{ functionDeclarations }] : []
}

export interface LiveSessionCallbacks {
  onStateChange: (state: VoiceState) => void
  onAudioChunk: (pcmBuffer: ArrayBuffer) => void
  onTranscript: (text: string, role: 'user' | 'gova', isFinal: boolean) => void
  onInterrupted: () => void
  onError: (errorMessage: string) => void
  onClose: () => void
  onToolCall?: (call: GeminiLiveFunctionCall) => Promise<any>
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null
  private wsUrl: string
  private config: VoiceSessionConfig
  private callbacks: LiveSessionCallbacks
  private isSetupDone = false
  private currentState: VoiceState = 'IDLE'
  private cancelledToolCallIds = new Set<string>()

  constructor(wsUrl: string, config: VoiceSessionConfig, callbacks: LiveSessionCallbacks) {
    this.wsUrl = wsUrl
    this.config = config
    this.callbacks = callbacks
  }

  public getState(): VoiceState {
    return this.currentState
  }

  private setState(state: VoiceState) {
    this.currentState = state
    this.callbacks.onStateChange(state)
  }

  /**
   * Opens the WebSocket connection to Gemini Live API and initiates setup.
   */
  public async connect(): Promise<void> {
    if (this.ws) {
      this.close()
    }

    this.setState('CONNECTING')

    try {
      this.ws = new WebSocket(this.wsUrl)
      try {
        this.ws.binaryType = 'arraybuffer'
      } catch {}

      this.ws.onopen = () => {
        this.sendSetup()
      }

      this.ws.onmessage = async (event) => {
        try {
          let text = ''
          if (typeof event.data === 'string') {
            text = event.data
          } else if (event.data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(event.data)
          } else if (event.data instanceof Blob) {
            text = await event.data.text()
          }

          if (text) {
            this.handleServerMessage(JSON.parse(text))
          }
        } catch (err: any) {
          console.warn('[Gemini Live Client] Message parse notice:', err?.message || err)
        }
      }

      this.ws.onerror = (_event) => {
        // User-safe error
        const msg = 'Unable to establish secure connection to Gemini Live API.'
        this.setState('ERROR')
        this.callbacks.onError(msg)
      }

      this.ws.onclose = (event) => {
        this.isSetupDone = false
        if (event.code !== 1000 && event.code !== 1005) {
          const reason =
            event.reason ||
            (event.code === 1008
              ? 'Voice session token expired or invalid.'
              : event.code === 1011
              ? 'Voice session limit reached.'
              : event.code === 1007
              ? 'Voice protocol configuration error.'
              : 'Voice connection closed unexpectedly.')
          this.setState('ERROR')
          this.callbacks.onError(reason)
        } else {
          if (this.currentState !== 'ERROR') {
            this.setState('DISCONNECTED')
          }
        }
        this.callbacks.onClose()
      }
    } catch (err: any) {
      this.setState('ERROR')
      this.callbacks.onError(err?.message || 'Failed to initialize voice connection.')
    }
  }

  /**
   * Sends the initial setup payload required by Gemini Live API with function declarations.
   */
  private sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const modelName = this.config.model || 'gemini-3.1-flash-live-preview'
    const formattedModel = modelName.startsWith('models/') ? modelName : `models/${modelName}`

    // Resolve tools from config, active employee, or default voice allowlist
    const activeToolNames =
      this.config.allowedTools ||
      (this.config.activeEmployee?.tools ? this.config.activeEmployee.tools : DEFAULT_VOICE_TOOL_NAMES)
    const toolDeclarations = this.config.tools || toGeminiLiveToolDeclarations(activeToolNames)

    const systemInstructionText =
      this.config.systemInstruction || buildGovaSystemInstruction(this.config)

    const setupMsg: GeminiLiveSetupMessage = {
      setup: {
        model: formattedModel,
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName || 'Aoede',
              },
            },
          },
        },
        systemInstruction: {
          parts: [
            {
              text: systemInstructionText,
            },
          ],
        },
        tools: toolDeclarations.length > 0 ? toolDeclarations : undefined,
      },
    }

    this.ws.send(JSON.stringify(setupMsg))
  }

  /**
   * Handles incoming parsed JSON messages from the Gemini Live WebSocket.
   */
  private handleServerMessage(msg: GeminiLiveServerMessage) {
    if (msg.setupComplete) {
      this.isSetupDone = true
      this.setState('LISTENING')
      return
    }

    if (msg.error) {
      const safeMsg = msg.error.message || 'Voice service error encountered.'
      this.setState('ERROR')
      this.callbacks.onError(safeMsg)
      return
    }

    // Handle tool call cancellations (e.g. barge-in or user interrupted turn)
    if (msg.toolCallCancellation?.ids) {
      for (const id of msg.toolCallCancellation.ids) {
        this.cancelledToolCallIds.add(id)
      }
    }

    // Handle incoming real-time tool calls
    if (msg.toolCall?.functionCalls && msg.toolCall.functionCalls.length > 0) {
      this.handleToolCalls(msg.toolCall.functionCalls)
      return
    }

    if (msg.serverContent) {
      const { modelTurn, turnComplete, interrupted } = msg.serverContent

      // 1. Handle barge-in / model interruption
      if (interrupted) {
        this.callbacks.onInterrupted()
        this.setState('LISTENING')
        return
      }

      // 2. Handle model speech & transcript
      if (modelTurn?.parts && modelTurn.parts.length > 0) {
        this.setState('SPEAKING')

        for (const part of modelTurn.parts) {
          if (part.inlineData?.data) {
            const pcmBuffer = base64ToArrayBuffer(part.inlineData.data)
            this.callbacks.onAudioChunk(pcmBuffer)
          }

          if (part.text) {
            this.callbacks.onTranscript(part.text, 'gova', false)
          }
        }
      }

      // 3. Handle turn completion
      if (turnComplete) {
        this.callbacks.onTranscript('', 'gova', true)
        this.setState('LISTENING')
      }
    }
  }

  /**
   * Executes real-time function calls requested by Gemini Live and transmits toolResponses.
   */
  public async handleToolCalls(functionCalls: GeminiLiveFunctionCall[]): Promise<void> {
    this.setState('THINKING')
    const functionResponses: Array<{ id: string; name: string; response: Record<string, any> }> = []

    for (const call of functionCalls) {
      if (this.cancelledToolCallIds.has(call.id)) {
        continue
      }

      let responsePayload: Record<string, any>

      // 1. Strict Allowlist Security Guard
      if (!GOVA_VOICE_TOOL_ALLOWLIST.has(call.name)) {
        responsePayload = {
          error: `Security Violation: Tool '${call.name}' is not permitted for voice execution.`,
          success: false,
        }
      } else {
        try {
          if (this.callbacks.onToolCall) {
            const res = await this.callbacks.onToolCall(call)
            responsePayload = res && typeof res === 'object' ? res : { result: res, success: true }
          } else if (this.config.toolExecutor) {
            const res = await this.config.toolExecutor(call.name, call.args)
            responsePayload = res && typeof res === 'object' ? res : { result: res, success: true }
          } else {
            responsePayload = {
              error: `No tool executor configured for tool '${call.name}'.`,
              success: false,
            }
          }
        } catch (err: any) {
          responsePayload = {
            error: err?.message || 'Tool execution encountered an internal error.',
            success: false,
          }
        }
      }

      if (!this.cancelledToolCallIds.has(call.id)) {
        functionResponses.push({
          id: call.id,
          name: call.name,
          response: responsePayload,
        })
      }
    }

    if (functionResponses.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const toolResponseMsg: GeminiLiveToolResponseMessage = {
        toolResponse: {
          functionResponses,
        },
      }
      this.ws.send(JSON.stringify(toolResponseMsg))
    }
  }

  /**
   * Streams raw 16-bit PCM microphone audio to Gemini Live API.
   */
  public sendRealtimeAudio(pcm16: Int16Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSetupDone) {
      return
    }

    const base64Data = arrayBufferToBase64(pcm16.buffer)
    const msg: GeminiLiveRealtimeInputMessage = {
      realtimeInput: {
        audio: {
          mimeType: 'audio/pcm;rate=16000',
          data: base64Data,
        },
      },
    }

    this.ws.send(JSON.stringify(msg))
  }

  /**
   * Closes the active WebSocket session cleanly.
   */
  public close(): void {
    if (this.ws) {
      this.isSetupDone = false
      try {
        if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close(1000, 'Session stopped by user')
        }
      } catch {
        // Ignore close error
      }
      this.ws = null
    }

    if (this.currentState !== 'IDLE' && this.currentState !== 'ERROR') {
      this.setState('IDLE')
    }
  }
}
