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
import { PrimaryButton, SecondaryButton, Pill } from '@/components/ui'

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
    <section className="relative overflow-hidden pt-6 pb-14 md:pt-12 md:pb-24 bg-white">
      {/* Subtle background ambient touch */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Left Column: Hero Copy & Actions */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-8 text-left">
            
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-[#0066FF] text-xs font-semibold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-[#00A859] animate-pulse" />
              <span>AI Employees for Business</span>
            </div>

            {/* Headline */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#00142E] tracking-tight leading-[1.12]">
                We Don’t Sell Software.{' '}
                <span className="block text-[#0066FF] mt-1.5">
                  We Deploy AI Employees.
                </span>
              </h1>
            </div>

            {/* Supporting Copy */}
            <p className="text-sm sm:text-lg lg:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
              Specialized AI Employees that handle real conversations, automate workflows, and deliver measurable business results.
            </p>

            {/* Primary Command / Search Interaction */}
            <form onSubmit={handleSearchSubmit} className="max-w-xl w-full">
              <div className="relative flex items-center bg-white border border-slate-300 hover:border-slate-400 focus-within:border-[#0066FF] focus-within:ring-4 focus-within:ring-blue-500/10 rounded-2xl p-1.5 shadow-2xs transition-all w-full min-h-[48px]">
                <div className="pl-3 pr-2 text-slate-400 shrink-0">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="What should an AI Employee handle?"
                  className="w-full min-w-0 bg-transparent text-xs sm:text-base text-[#00142E] placeholder:text-slate-400 focus:outline-none py-1.5 sm:py-2"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-semibold px-4 py-2 sm:py-2.5 min-h-[40px] rounded-xl transition shadow-xs cursor-pointer shrink-0"
                >
                  <span>Search</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 pl-0.5">
                <span className="text-slate-400 font-medium shrink-0">Popular:</span>
                <Pill
                  label="Receptionist"
                  size="sm"
                  onClick={() => router.push('/ai-employees?search=receptionist')}
                />
                <Pill
                  label="Lead Qualification"
                  size="sm"
                  onClick={() => router.push('/ai-employees?search=leads')}
                />
                <Pill
                  label="WhatsApp Agent"
                  size="sm"
                  onClick={() => router.push('/ai-employees?search=whatsapp')}
                />
              </div>
            </form>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <PrimaryButton
                href="/ai-employees"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full sm:w-auto"
              >
                Explore AI Employees
              </PrimaryButton>
              <SecondaryButton
                href="#how-it-works"
                size="lg"
                className="w-full sm:w-auto"
              >
                See how it works
              </SecondaryButton>
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
