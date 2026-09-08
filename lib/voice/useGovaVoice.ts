'use client'

/**
 * Grovaitech AI Platform
 * lib/voice/useGovaVoice.ts
 *
 * React Hook managing the full GOVA Voice UI v1 lifecycle:
 * - Native browser microphone acquisition with permission checks
 * - Ephemeral token fetching from /api/voice/token
 * - Bi-directional streaming via GeminiLiveSession
 * - 16kHz PCM audio capture & streaming
 * - 24kHz PCM streamed audio playback with jitter buffer & seamless queue
 * - Instant barge-in interruption handling
 * - Clean teardown on stop or component unmount
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  type VoiceState,
  type TranscriptItem,
  type VoiceSessionConfig,
  type LiveTokenResponse,
} from './types'
import { GeminiLiveSession } from './live-client'
import { float32ToPcm16, pcm16ToFloat32, resampleAudioBuffer } from './audio'

export interface UseGovaVoiceOptions {
  config?: VoiceSessionConfig
  onTranscriptUpdate?: (transcripts: TranscriptItem[]) => void
}

export function useGovaVoice(options: UseGovaVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('IDLE')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [micVolume, setMicVolume] = useState(0)

  // References for active audio graph & WebSocket session
  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const inputAudioCtxRef = useRef<AudioContext | null>(null)
  const outputAudioCtxRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const activeAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set())
  const nextPlayTimeRef = useRef<number>(0)
  const isMutedRef = useRef(false)
  isMutedRef.current = isMuted

  // Keeps track of the current in-progress transcript
  const currentTranscriptIdRef = useRef<string | null>(null)

  /**
   * Immediately halts active audio playback and clears scheduled audio chunks (barge-in).
   */
  const flushAudioPlayback = useCallback(() => {
    for (const source of activeAudioSourcesRef.current) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // Source might have already finished
      }
    }
    activeAudioSourcesRef.current.clear()

    if (outputAudioCtxRef.current) {
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime
    }
  }, [])

  /**
   * Appends or creates a transcript entry.
   */
  const handleTranscript = useCallback(
    (text: string, role: 'user' | 'gova', isFinal: boolean) => {
      setTranscripts((prev) => {
        if (!text && isFinal) {
          currentTranscriptIdRef.current = null
          return prev
        }

        const currId = currentTranscriptIdRef.current
        if (currId && prev.length > 0 && prev[prev.length - 1].id === currId) {
          // Append to existing entry
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = {
            ...last,
            text: last.text + text,
            isFinal,
          }
          if (isFinal) {
            currentTranscriptIdRef.current = null
          }
          return updated
        } else if (text) {
          // New transcript entry
          const newId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          if (!isFinal) {
            currentTranscriptIdRef.current = newId
          }
          return [
            ...prev,
            {
              id: newId,
              role,
              text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isFinal,
            },
          ]
        }
        return prev
      })
    },
    []
  )

  /**
   * Plays a streamed 24kHz 16-bit linear PCM chunk received from Gemini Live API.
   */
  const playAudioChunk = useCallback((pcmBuffer: ArrayBuffer) => {
    if (!outputAudioCtxRef.current) {
      try {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
        outputAudioCtxRef.current = new AudioCtxClass({ sampleRate: 24000 })
      } catch (e) {
        console.warn('[GOVA Voice] Failed to initialize output AudioContext:', e)
        return
      }
    }

    const audioCtx = outputAudioCtxRef.current
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }

    const pcm16 = new Int16Array(pcmBuffer)
    const float32 = pcm16ToFloat32(pcm16)

    // Create 1-channel AudioBuffer at 24kHz
    const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000)
    audioBuffer.getChannelData(0).set(float32)

    const source = audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioCtx.destination)

    // Schedule seamlessly directly after the previous chunk
    const currentTime = audioCtx.currentTime
    const startTime = Math.max(currentTime, nextPlayTimeRef.current)
    source.start(startTime)
    nextPlayTimeRef.current = startTime + audioBuffer.duration

    activeAudioSourcesRef.current.add(source)
    source.onended = () => {
      activeAudioSourcesRef.current.delete(source)
      if (activeAudioSourcesRef.current.size === 0) {
        setState((current) => (current === 'SPEAKING' ? 'LISTENING' : current))
      }
    }
  }, [])

  /**
   * Cleanly closes all audio and network resources.
   */
  const stopSession = useCallback(() => {
    // 1. Flush playback
    flushAudioPlayback()

    // 2. Stop microphone track
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    // 3. Disconnect processor node
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect()
      } catch {}
      scriptProcessorRef.current = null
    }

    // 4. Close input audio context
    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close()
      } catch {}
      inputAudioCtxRef.current = null
    }

    // 5. Close output audio context
    if (outputAudioCtxRef.current) {
      try {
        outputAudioCtxRef.current.close()
      } catch {}
      outputAudioCtxRef.current = null
    }

    // 6. Close Gemini Live session
    if (sessionRef.current) {
      sessionRef.current.close()
      sessionRef.current = null
    }

    setMicVolume(0)
    setState('IDLE')
  }, [flushAudioPlayback])

  /**
   * Starts a new real-time voice session with GOVA.
   */
  const startSession = useCallback(async () => {
    // If already active, stop first
    if (state !== 'IDLE' && state !== 'ERROR' && state !== 'DISCONNECTED') {
      stopSession()
      return
    }

    setErrorMessage(null)
    setState('CONNECTING')

    // 1. Verify browser compatibility
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setState('ERROR')
      setErrorMessage('Microphone access is not supported by your browser.')
      return
    }

    let stream: MediaStream
    try {
      // 2. Request microphone permission
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = stream
    } catch (micErr: any) {
      setState('ERROR')
      if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission was denied. Please allow microphone access in your browser.')
      } else if (micErr.name === 'NotFoundError' || micErr.name === 'DevicesNotFoundError') {
        setErrorMessage('No microphone device found on your system.')
      } else {
        setErrorMessage('Unable to access microphone: ' + (micErr.message || 'Unknown error'))
      }
      return
    }

    // 3. Obtain secure ephemeral token from backend
    let tokenData: LiveTokenResponse
    try {
      const res = await fetch('/api/voice/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to authenticate voice session.')
      }

      tokenData = await res.json()
    } catch (tokenErr: any) {
      stream.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
      setState('ERROR')
      setErrorMessage(tokenErr.message || 'Voice authorization failed.')
      return
    }

    // 4. Initialize Gemini Live Session
    const fullWsUrl = `${tokenData.wsUrl}?access_token=${tokenData.token}`
    const session = new GeminiLiveSession(
      fullWsUrl,
      {
        model: tokenData.model,
        ...options.config,
      },
      {
        onStateChange: (newState) => {
          setState(newState)
        },
        onAudioChunk: (chunk) => {
          playAudioChunk(chunk)
        },
        onTranscript: (text, role, isFinal) => {
          handleTranscript(text, role, isFinal)
        },
        onInterrupted: () => {
          flushAudioPlayback()
        },
        onError: (err) => {
          setErrorMessage(err)
        },
        onClose: () => {
          // Handled via state transitions
        },
      }
    )
    sessionRef.current = session

    // 5. Connect WebSocket
    try {
      await session.connect()
    } catch (wsErr: any) {
      stopSession()
      setState('ERROR')
      setErrorMessage(wsErr.message || 'Failed to connect to voice service.')
      return
    }

    // 6. Setup Audio Graph for microphone capture
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext
      const inputAudioCtx = new AudioCtxClass()
      inputAudioCtxRef.current = inputAudioCtx

      const source = inputAudioCtx.createMediaStreamSource(stream)
      // Use 2048 sample buffer size for low latency (~46ms at 44.1kHz)
      const processor = inputAudioCtx.createScriptProcessor(2048, 1, 1)
      scriptProcessorRef.current = processor

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) {
          setMicVolume(0)
          return
        }

        const inputChannelData = e.inputBuffer.getChannelData(0)

        // Calculate simple volume level for visualizer
        let sum = 0
        for (let i = 0; i < inputChannelData.length; i++) {
          sum += inputChannelData[i] * inputChannelData[i]
        }
        const rms = Math.sqrt(sum / inputChannelData.length)
        setMicVolume(Math.min(1, rms * 5))

        // Resample from browser hardware rate (e.g. 44.1k/48k) to 16kHz required by Gemini Live
        const resampled = resampleAudioBuffer(inputChannelData, inputAudioCtx.sampleRate, 16000)
        const pcm16 = float32ToPcm16(resampled)

        // Stream PCM16 audio chunk over WebSocket
        session.sendRealtimeAudio(pcm16)
      }

      source.connect(processor)
      processor.connect(inputAudioCtx.destination)
    } catch (audioErr: any) {
      stopSession()
      setState('ERROR')
      setErrorMessage('Audio processing error: ' + (audioErr.message || 'Unknown error'))
    }
  }, [state, stopSession, options.config, playAudioChunk, handleTranscript, flushAudioPlayback])

  /**
   * Toggles microphone mute.
   */
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev)
  }, [])

  /**
   * Clears stored transcript history.
   */
  const clearTranscripts = useCallback(() => {
    setTranscripts([])
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession()
    }
  }, [stopSession])

  return {
    state,
    errorMessage,
    transcripts,
    isMuted,
    micVolume,
    startSession,
    stopSession,
    toggleMute,
    clearTranscripts,
    isConnected: state === 'LISTENING' || state === 'THINKING' || state === 'SPEAKING',
    isSpeaking: state === 'SPEAKING',
    isListening: state === 'LISTENING',
  }
}
