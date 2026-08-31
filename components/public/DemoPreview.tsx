'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Calendar,
  ArrowRight,
  X,
  Bot,
  User,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import ChatInterface from '@/components/chat/ChatInterface'

export default function DemoPreview() {
  const [modalOpen, setModalOpen] = useState(false)

  const capabilities = [
    'Qualify Leads',
    'Handle Enquiries',
    'Site Visit Requests',
    'CRM Updates',
  ]

  return (
    <>
      <div className="relative bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
        {/* Top bar with employee name & Live Demo badge */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  Real Estate Lead Receptionist
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Sales · Real Estate
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Demo
            </span>
          </div>

          {/* Capability Tags */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {capabilities.map((cap) => (
              <span
                key={cap}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200/80"
              >
                {cap}
              </span>
            ))}
          </div>

          {/* Conversation Preview Box */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-100 mb-5">
            {/* Customer Message */}
            <div className="flex items-start gap-2.5 justify-end">
              <div className="bg-blue-600 text-white text-xs sm:text-sm rounded-2xl rounded-tr-none px-3.5 py-2 max-w-[85%] shadow-xs leading-relaxed">
                “I’d like to schedule a site visit tomorrow at 10 AM.”
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* AI Assistant Message */}
            <div className="flex items-start gap-2.5 justify-start">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-white border border-slate-200 text-slate-800 text-xs sm:text-sm rounded-2xl rounded-tl-none px-3.5 py-2 max-w-[88%] shadow-xs leading-relaxed">
                “Your site visit request has been recorded. Our team will confirm the exact slot shortly.”
              </div>
            </div>

            {/* Status note */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                Logged to CRM
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                Awaiting Slot Confirmation
              </span>
            </div>
          </div>
        </div>

        {/* CTA button */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Try the Live Demo</span>
          </button>
          <Link
            href="/ai-employees/real-estate-lead-receptionist"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors whitespace-nowrap"
          >
            <span>Full Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Interactive Modal for the Live Demo */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 sm:p-6">
          <div className="bg-white w-full max-w-3xl h-[620px] max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col relative animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    Real Estate Lead Receptionist
                    <span className="text-[10px] uppercase font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      Interactive Live Demo
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Test lead capture, qualification, and site-visit scheduling
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Frame Container */}
            <div className="flex-1 overflow-hidden">
              <ChatInterface employeeSlug="real-estate-lead-receptionist" />
            </div>

          </div>
        </div>
      )}
    </>
  )
}
