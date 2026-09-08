'use client'

/**
 * Grovaitech AI Platform
 * components/voice/GovaVoiceOrb.tsx
 *
 * Dynamic Voice State Orb Visualizer for GOVA Voice UI v1.
 * Renders distinct visual representations for:
 * IDLE, CONNECTING, LISTENING, THINKING, SPEAKING, ERROR, DISCONNECTED.
 */

import React from 'react'
import { type VoiceState } from '@/lib/voice/types'
import { Mic, MicOff, AlertCircle, Sparkles, Loader2, Volume2, Power } from 'lucide-react'

interface GovaVoiceOrbProps {
  state: VoiceState
  volume?: number
  isMuted?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

export default function GovaVoiceOrb({
  state,
  volume = 0,
  isMuted = false,
  onClick,
  size = 'md',
}: GovaVoiceOrbProps) {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-36 h-36',
    lg: 'w-48 h-48',
  }[size]

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }[size]

  // Dynamic scale based on mic volume when listening
  const volumeScale = state === 'LISTENING' ? 1 + volume * 0.4 : 1

  return (
    <div className="relative flex items-center justify-center select-none">
      {/* ── Outer Pulsing Rings ──────────────────────────────────────────── */}
      {state === 'LISTENING' && (
        <>
          <div
            className="absolute rounded-full bg-blue-500/15 animate-ping duration-1000 pointer-events-none"
            style={{
              width: size === 'lg' ? '280px' : size === 'md' ? '200px' : '140px',
              height: size === 'lg' ? '280px' : size === 'md' ? '200px' : '140px',
              animationDuration: '2.5s',
            }}
          />
          <div
            className="absolute rounded-full bg-cyan-400/20 pointer-events-none transition-transform duration-75"
            style={{
              width: size === 'lg' ? '240px' : size === 'md' ? '170px' : '120px',
              height: size === 'lg' ? '240px' : size === 'md' ? '170px' : '120px',
              transform: `scale(${volumeScale})`,
            }}
          />
        </>
      )}

      {state === 'SPEAKING' && (
        <>
          <div
            className="absolute rounded-full bg-indigo-500/20 animate-pulse pointer-events-none"
            style={{
              width: size === 'lg' ? '280px' : size === 'md' ? '210px' : '150px',
              height: size === 'lg' ? '280px' : size === 'md' ? '210px' : '150px',
            }}
          />
          <div
            className="absolute rounded-full bg-blue-400/20 animate-ping pointer-events-none"
            style={{
              width: size === 'lg' ? '240px' : size === 'md' ? '180px' : '130px',
              height: size === 'lg' ? '240px' : size === 'md' ? '180px' : '130px',
              animationDuration: '1.8s',
            }}
          />
        </>
      )}

      {state === 'CONNECTING' && (
        <div
          className="absolute rounded-full border-2 border-dashed border-blue-400/40 animate-spin pointer-events-none"
          style={{
            width: size === 'lg' ? '220px' : size === 'md' ? '170px' : '120px',
            height: size === 'lg' ? '220px' : size === 'md' ? '170px' : '120px',
            animationDuration: '6s',
          }}
        />
      )}

      {/* ── Central Orb Core ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onClick}
        className={`relative ${sizeClasses} rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-xl cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/30 ${
          state === 'IDLE'
            ? 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-blue-500/50 hover:shadow-blue-500/10'
            : state === 'CONNECTING'
            ? 'bg-gradient-to-br from-blue-900/80 to-indigo-950 border border-blue-500/40 shadow-blue-500/20'
            : state === 'LISTENING'
            ? 'bg-gradient-to-br from-cyan-600 to-blue-700 border-2 border-cyan-300 shadow-cyan-500/30 ring-4 ring-cyan-500/20'
            : state === 'THINKING'
            ? 'bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 border-2 border-purple-300 shadow-purple-500/30 animate-pulse'
            : state === 'SPEAKING'
            ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 border-2 border-white shadow-blue-500/40'
            : state === 'ERROR'
            ? 'bg-gradient-to-br from-rose-900 to-slate-900 border-2 border-rose-500 shadow-rose-500/20'
            : 'bg-slate-900 border border-slate-800'
        }`}
        style={{
          transform: state === 'LISTENING' ? `scale(${Math.max(1, volumeScale * 0.98)})` : undefined,
        }}
        aria-label={`GOVA Voice Orb - Status: ${state}`}
      >
        {/* Core Icon & Animation */}
        {state === 'IDLE' && (
          <div className="flex flex-col items-center gap-1.5 text-slate-400 group-hover:text-white transition-colors">
            <Mic className={`${iconSizes} text-blue-400`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tap to Talk</span>
          </div>
        )}

        {state === 'CONNECTING' && (
          <div className="flex flex-col items-center gap-1.5 text-blue-300">
            <Loader2 className={`${iconSizes} animate-spin text-cyan-400`} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-300">Connecting</span>
          </div>
        )}

        {state === 'LISTENING' && (
          <div className="flex flex-col items-center gap-1 text-white">
            {isMuted ? (
              <MicOff className={`${iconSizes} text-amber-300`} />
            ) : (
              <Mic className={`${iconSizes} text-white animate-bounce-slow`} />
            )}
            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-200">
              {isMuted ? 'Muted' : 'Listening'}
            </span>
          </div>
        )}

        {state === 'THINKING' && (
          <div className="flex flex-col items-center gap-1 text-white">
            <Sparkles className={`${iconSizes} text-purple-200 animate-spin`} style={{ animationDuration: '4s' }} />
            <span className="text-[9px] font-black uppercase tracking-widest text-purple-200">Thinking</span>
          </div>
        )}

        {state === 'SPEAKING' && (
          <div className="flex flex-col items-center gap-1 text-white">
            <div className="flex items-center gap-1 h-8">
              <span className="w-1.5 h-6 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-8 bg-cyan-200 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-4 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              <span className="w-1.5 h-7 bg-cyan-200 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-100">GOVA Speaking</span>
          </div>
        )}

        {state === 'ERROR' && (
          <div className="flex flex-col items-center gap-1.5 text-rose-300">
            <AlertCircle className={`${iconSizes} text-rose-400`} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-rose-300">Error</span>
          </div>
        )}

        {state === 'DISCONNECTED' && (
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <Power className={iconSizes} />
            <span className="text-[9px] font-bold uppercase tracking-wider">Off</span>
          </div>
        )}
      </button>
    </div>
  )
}
