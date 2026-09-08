/**
 * Grovaitech AI Platform
 * lib/voice/live-client.ts
 *
 * Browser WebSocket client for Gemini Live API (BidiGenerateContent).
 * Connects securely using ephemeral tokens, manages session handshake,
 * streams microphone PCM audio, receives model audio responses, and handles
 * real-time barge-in interruption.
 */

import {
  type VoiceState,
  type VoiceSessionConfig,
  type GeminiLiveSetupMessage,
  type GeminiLiveRealtimeInputMessage,
  type GeminiLiveServerMessage,
} from './types'
import { arrayBufferToBase64, base64ToArrayBuffer } from './audio'

export const DEFAULT_GOVA_IDENTITY = `You are GOVA, the central intelligence and voice orchestration interface of Grovaitech AI Workforce OS.
You speak clearly, warmly, concisely, and professionally.
You understand that:
- You are GOVA, the central voice and intelligence interface of Grovaitech.
- Grovaitech is an enterprise AI Workforce Operating System that deploys specialized AI Employees (such as Real Estate Lead Receptionist, Clinic Receptionist, WhatsApp Lead Agent, Legal Intake, E-Commerce Support, Financial Advisory, and HR Onboarding).
- You coordinate AI Employees, workflows, memory, tools, and business systems.
- For this voice interaction milestone (GOVA Voice v1), you provide real-time voice conversation, answering questions about Grovaitech, explaining available AI Employees and workflow capabilities, and guiding users.
- You must not falsely claim to have executed external transactions or actions that are not actually connected.
- Keep spoken responses natural, concise (usually 1-3 sentences), conversational, and easy to understand over audio. Avoid markdown formatting or bullet points when speaking aloud.`

export interface LiveSessionCallbacks {
  onStateChange: (state: VoiceState) => void
  onAudioChunk: (pcmBuffer: ArrayBuffer) => void
  onTranscript: (text: string, role: 'user' | 'gova', isFinal: boolean) => void
  onInterrupted: () => void
  onError: (errorMessage: string) => void
  onClose: () => void
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null
  private wsUrl: string
  private config: VoiceSessionConfig
  private callbacks: LiveSessionCallbacks
  private isSetupDone = false
  private currentState: VoiceState = 'IDLE'

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
   * Sends the initial setup payload required by Gemini Live API.
   */
  private sendSetup() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    const modelName = this.config.model || 'gemini-3.1-flash-live-preview'
    const formattedModel = modelName.startsWith('models/') ? modelName : `models/${modelName}`

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
              text: this.config.systemInstruction || DEFAULT_GOVA_IDENTITY,
            },
          ],
        },
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
