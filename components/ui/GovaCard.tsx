'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/ui/GovaCard.tsx
 *
 * Dedicated conversational card for GOVA Assistant (Voice + Text AI),
 * featuring branded gradient surface, voice quick-action, and interactive prompts.
 */

import React from 'react'
import { Sparkles, Mic, MessageSquare, ArrowRight } from 'lucide-react'

export interface GovaCardProps {
  onVoiceClick?: () => void
  onChatClick?: () => void
  onPromptClick?: (prompt: string) => void
  prompts?: string[]
  statusText?: string
  className?: string
}

const defaultPrompts = [
  'What are my key leads today?',
  'Schedule a follow-up with Dr. Verma',
  'Summarize recent AI employee activity',
]

export function GovaCard({
  onVoiceClick,
  onChatClick,
  onPromptClick,
  prompts = defaultPrompts,
  statusText = 'Online & Listening',
  className = '',
}: GovaCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#00142E] via-[#0A1A3F] to-[#002866] text-white p-5 sm:p-6 shadow-md border border-blue-900/50 ${className}`}
    >
      {/* Background Decorative Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#0066FF]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0066FF] to-indigo-500 flex items-center justify-center text-white shadow-xs shadow-blue-500/30 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                GOVA Assistant
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00A859] animate-ping" />
                <span>{statusText}</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Autonomous workforce orchestrator &amp; CRM co-pilot
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="relative z-10 grid grid-cols-2 gap-2.5 mb-4">
        <button
          type="button"
          onClick={onVoiceClick}
          className="flex items-center justify-center gap-2 h-11 min-h-[44px] px-3 rounded-xl bg-gradient-to-r from-[#0066FF] to-indigo-600 hover:from-[#0052CC] hover:to-indigo-500 active:scale-[0.98] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Mic className="w-4 h-4" />
          <span>Talk to GOVA</span>
        </button>

        <button
          type="button"
          onClick={onChatClick}
          className="flex items-center justify-center gap-2 h-11 min-h-[44px] px-3 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] border border-white/15 text-white text-xs font-semibold transition-all cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Open Chat</span>
        </button>
      </div>

      {/* Suggested Prompt Chips */}
      {prompts.length > 0 && (
        <div className="relative z-10 pt-3 border-t border-white/10">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">
            Suggested Actions:
          </span>
          <div className="flex flex-col gap-1.5">
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPromptClick?.(p)}
                className="flex items-center justify-between text-left px-3 py-2 min-h-[40px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-slate-200 transition-colors group cursor-pointer"
              >
                <span className="truncate">{p}</span>
                <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GovaCard
