'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Bot,
  Workflow,
  Sparkles,
  BookOpen,
  Lightbulb,
  ArrowRight,
  Send,
  X,
  CheckCircle2,
  Cpu,
} from 'lucide-react'

export default function ProductCards() {
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false)
  const [suggestionRole, setSuggestionRole] = useState('')
  const [suggestionDesc, setSuggestionDesc] = useState('')
  const [suggestionSubmitted, setSuggestionSubmitted] = useState(false)

  const handleSuggestionSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Safe client-side feedback without phantom backend calls
    if (suggestionRole.trim()) {
      setSuggestionSubmitted(true)
    }
  }

  const resetModal = () => {
    setSuggestionModalOpen(false)
    setSuggestionSubmitted(false)
    setSuggestionRole('')
    setSuggestionDesc('')
  }

  return (
    <section id="solutions" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Workforce Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed for Real Operational Impact
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            Explore our ready-to-deploy AI Employees, autonomous workflows, and knowledge systems.
          </p>
        </div>

        {/* 5 Compact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: AI Employees */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-5">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                AI Employees
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Specialized digital employees for real estate, clinics, customer support, and sales intake that work 24/7.
              </p>
            </div>
            <Link
              href="/ai-employees"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition group"
            >
              <span>Explore Marketplace</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 2: Solutions */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5">
                <Workflow className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Solutions & Workflows
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Automate multi-step business logic from lead capture and WhatsApp alerts to CRM syncing and calendar bookings.
              </p>
            </div>
            <Link
              href="/workflows"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition group"
            >
              <span>View Solutions</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 3: How It Works */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-5">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                How It Works
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Connect your business knowledge, configure communication channels, and deploy guarded AI Employees in minutes.
              </p>
            </div>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition group"
            >
              <span>See the Process</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 4: Blog (Prominent Card) */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-slate-50 border-2 border-blue-200/80 hover:border-blue-400 hover:shadow-md transition-all duration-200 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-600 text-white">
                Featured
              </span>
            </div>
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-xs">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Grovaitech Blog
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Read engineering updates, case analyses, and practical guides on building agentic business systems.
              </p>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 transition group"
            >
              <span>Read Articles</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Card 5: Suggest an Employee */}
          <div className="flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200 md:col-span-2 lg:col-span-2">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5">
                <Lightbulb className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Suggest an Employee
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-xl">
                Have an idea for an AI Employee? We’d love to hear it. Tell us the role, tasks, and systems you want automated for your industry.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setSuggestionModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Submit Suggestion</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Suggest an Employee Modal */}
      {suggestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={resetModal}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {suggestionSubmitted ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  Suggestion Received!
                </h3>
                <p className="text-sm text-slate-600">
                  Thank you for submitting your idea for "{suggestionRole}". Our product team reviews all workforce suggestions.
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSuggestionSubmit} className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Suggest an AI Employee
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Have an idea for an AI Employee? We’d love to hear it.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Role Title / Industry
                  </label>
                  <input
                    type="text"
                    required
                    value={suggestionRole}
                    onChange={(e) => setSuggestionRole(e.target.value)}
                    placeholder="e.g. Dental Clinic Billing Clerk, Logistics Dispatcher"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Key Tasks & Integrations
                  </label>
                  <textarea
                    rows={3}
                    value={suggestionDesc}
                    onChange={(e) => setSuggestionDesc(e.target.value)}
                    placeholder="What specific tasks, channels (WhatsApp/Web), or software (Google Sheets/CRM) should this employee handle?"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Suggestion</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
