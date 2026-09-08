'use client'

/**
 * Grovaitech AI Platform
 * components/voice/GovaVoiceModal.tsx
 *
 * Interactive Real-Time Voice Modal for GOVA Voice UI v1.
 * Connects directly to Google Gemini Live API (gemini-3.1-flash-live-preview)
 * using server-generated ephemeral tokens.
 */

import React, { useRef, useEffect } from 'react'
import {
  X,
  Mic,
  MicOff,
  Radio,
  Volume2,
  Sparkles,
  RefreshCw,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import GovaVoiceOrb from './GovaVoiceOrb'
import { useGovaVoice } from '@/lib/voice/useGovaVoice'

interface GovaVoiceModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function GovaVoiceModal({ isOpen, onClose }: GovaVoiceModalProps) {
  const {
    state,
    errorMessage,
    transcripts,
    isMuted,
    micVolume,
    startSession,
    stopSession,
    toggleMute,
    clearTranscripts,
    isConnected,
  } = useGovaVoice()

  const transcriptEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcripts])

  // Stop session when modal is closed
  const handleClose = () => {
    stopSession()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100">
        
        {/* ── Top Header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Radio className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wider text-white uppercase">
                  GOVA VOICE
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  v1 Live Preview
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Central Intelligence Voice Interface · Grovaitech AI Workforce OS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Model Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px] font-mono text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              gemini-3.1-flash-live-preview
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close voice modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Center Voice Visualizer & Status ──────────────────────────── */}
        <div className="flex flex-col items-center justify-center px-6 pt-8 pb-6 bg-gradient-to-b from-slate-950/40 via-slate-900 to-slate-900 border-b border-slate-800/80">
          <div className="my-2">
            <GovaVoiceOrb
              state={state}
              volume={micVolume}
              isMuted={isMuted}
              onClick={isConnected ? stopSession : startSession}
              size="lg"
            />
          </div>

          {/* Status Text & Guidance */}
          <div className="text-center mt-6 space-y-1.5 max-w-md">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 border border-slate-700 text-slate-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  state === 'IDLE'
                    ? 'bg-slate-400'
                    : state === 'CONNECTING'
                    ? 'bg-amber-400 animate-spin'
                    : state === 'LISTENING'
                    ? 'bg-emerald-400 animate-ping'
                    : state === 'THINKING'
                    ? 'bg-purple-400 animate-pulse'
                    : state === 'SPEAKING'
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
              <span className="uppercase tracking-wider font-bold text-[10px]">
                {state === 'IDLE' && 'Ready to Connect'}
                {state === 'CONNECTING' && 'Connecting to Gemini Live...'}
                {state === 'LISTENING' && 'Listening...'}
                {state === 'THINKING' && 'Thinking...'}
                {state === 'SPEAKING' && 'GOVA is Speaking'}
                {state === 'ERROR' && 'Voice Session Error'}
                {state === 'DISCONNECTED' && 'Disconnected'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              {state === 'IDLE' && 'Click the orb or "Start Voice" to begin talking with GOVA.'}
              {state === 'CONNECTING' && 'Requesting microphone & secure ephemeral authentication token...'}
              {state === 'LISTENING' &&
                'Speak into your microphone. Say "Hello GOVA" or ask about AI Employees & workflows.'}
              {state === 'THINKING' && 'GOVA is processing your speech in real-time...'}
              {state === 'SPEAKING' &&
                'Audio is streaming through your speakers. You can interrupt GOVA anytime.'}
              {state === 'ERROR' && (
                <span className="text-rose-400 font-medium">
                  {errorMessage || 'An error occurred during voice communication.'}
                </span>
              )}
              {state === 'DISCONNECTED' && 'Voice session ended. Tap the orb to reconnect.'}
            </p>
          </div>

          {/* Primary Action Controls */}
          <div className="flex items-center gap-3 mt-6">
            {!isConnected ? (
              <button
                type="button"
                onClick={startSession}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Start Voice Session</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    isMuted
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-blue-400" />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <button
                  type="button"
                  onClick={stopSession}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-md shadow-rose-600/20"
                >
                  <span>End Voice</span>
                </button>
              </>
            )}

            {state === 'ERROR' && (
              <button
                type="button"
                onClick={startSession}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-200 border border-slate-700 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Real-Time Conversation Transcript ─────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-[160px] max-h-[260px] bg-slate-950/70 p-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-blue-400" /> Live Transcript
            </span>
            {transcripts.length > 0 && (
              <button
                onClick={clearTranscripts}
                className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition"
                title="Clear transcript history"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 px-1 pr-2">
            {transcripts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs text-center py-6">
                <Sparkles className="w-5 h-5 mb-1.5 text-slate-600" />
                <p>Spoken conversation will appear here in real-time.</p>
              </div>
            ) : (
              transcripts.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-col ${item.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed ${
                      item.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-slate-800/90 border border-slate-700 text-slate-100 rounded-tl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{item.text}</p>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                    {item.role === 'user' ? 'You' : 'GOVA'} · {item.timestamp}
                  </span>
                </div>
              ))
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        {/* ── Footer Info ─────────────────────────────────────────────────── */}
        <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Info className="w-3 h-3 text-blue-400" />
            <span>Low-latency audio-to-audio bidirectional streaming</span>
          </div>
          <span className="font-mono text-slate-400">PCM 16k in / 24k out</span>
        </div>

      </div>
    </div>
  )
}
