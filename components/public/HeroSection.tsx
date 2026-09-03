'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  ArrowRight,
  Sparkles,
  Bot,
  Layers,
  Workflow,
  CheckCircle2,
} from 'lucide-react'
import DemoPreview from './DemoPreview'

export default function HeroSection() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/ai-employees?search=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/ai-employees')
    }
  }

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-12 md:pb-24 bg-white">
      {/* Subtle background ambient touch */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Hero Copy & Actions */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/70 text-blue-700 text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-blue-600" />
              <span>AI Employees for Business</span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                We Don’t Sell Software.{' '}
                <span className="block text-blue-600 mt-1">
                  We Deploy AI Employees.
                </span>
              </h1>
            </div>

            {/* Supporting Copy */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
              Specialized AI Employees that handle real conversations, automate workflows, and deliver measurable business results.
            </p>

            {/* Primary Command / Search Interaction */}
            <form onSubmit={handleSearchSubmit} className="max-w-xl">
              <div className="relative flex items-center bg-white border border-slate-300 hover:border-slate-400 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-2xl p-1.5 shadow-xs transition-all">
                <div className="pl-3.5 pr-2 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What would you like an AI Employee to handle?"
                  className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none py-2"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer shrink-0"
                >
                  <span>Search</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pl-0.5">
                <span className="text-slate-400 font-medium">Popular:</span>
                <button
                  type="button"
                  onClick={() => router.push('/ai-employees?search=receptionist')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/80 font-medium transition cursor-pointer"
                >
                  Receptionist
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/ai-employees?search=leads')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/80 font-medium transition cursor-pointer"
                >
                  Lead Qualification
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/ai-employees?search=whatsapp')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200/80 font-medium transition cursor-pointer"
                >
                  WhatsApp Agent
                </button>
              </div>
            </form>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <Link
                href="/ai-employees"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold rounded-xl shadow-xs transition-colors text-center"
              >
                <span>Explore AI Employees</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-sm sm:text-base font-semibold rounded-xl border border-slate-200 transition-colors text-center"
              >
                <span>See how it works</span>
              </Link>
            </div>

            {/* Trust points below */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                AI Employees
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                Workflows
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                Integrations
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                Results
              </span>
            </div>

          </div>

          {/* Right Column: Hero Product Card (Live Demo Preview) */}
          <div className="lg:col-span-5">
            <DemoPreview />
          </div>

        </div>
      </div>
    </section>
  )
}
