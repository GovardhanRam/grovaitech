'use client'

/**
 * components/employee/WorkforceMarketplace.tsx
 *
 * AI Employee Marketplace UI for Grovaitech AI Workforce OS.
 * "We Don't Sell Software. We Deploy AI Employees."
 *
 * Supports search, canonical category filtering (Marketing, Sales, Customer Support,
 * Operations, Finance, Healthcare), lifecycle status filtering, and actionable cards.
 */

import { useState } from 'react'
import Link from 'next/link'
import type { AIEmployee } from '@/lib/employees'
import ChatInterface from '@/components/chat/ChatInterface'
import {
  Search,
  Plus,
  Play,
  ArrowRight,
  Settings,
  Rocket,
  Bot,
  MessageSquare,
  PhoneCall,
  Globe,
  Mail,
  Zap,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pill } from '@/components/ui/Pill'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatCard } from '@/components/ui/StatCard'

// ─── Status Metadata ──────────────────────────────────────────────────────────

const STATUS_META: Record<
  AIEmployee['status'],
  { label: string; status: 'active' | 'demo' | 'in_progress' | 'planned'; strip: string }
> = {
  live: {
    label: 'READY TO DEPLOY',
    status: 'active',
    strip: 'bg-emerald-500',
  },
  beta: {
    label: 'DEMO',
    status: 'demo',
    strip: 'bg-[#0066FF]',
  },
  demo: {
    label: 'DEMO',
    status: 'demo',
    strip: 'bg-[#0066FF]',
  },
  in_development: {
    label: 'IN PROGRESS',
    status: 'in_progress',
    strip: 'bg-amber-400',
  },
  planned: {
    label: 'UNDER DEV',
    status: 'planned',
    strip: 'bg-slate-300',
  },
}

const STATUS_GROUP: Record<AIEmployee['status'], string> = {
  live: 'ready',
  beta: 'demo',
  demo: 'demo',
  in_development: 'in_progress',
  planned: 'planned',
}

const SECTION_ORDER = ['ready', 'demo', 'in_progress', 'planned'] as const
const SECTION_META: Record<string, { heading: string; sub: string }> = {
  ready: {
    heading: 'READY TO DEPLOY',
    sub: 'Production-ready AI employees available for immediate deployment.',
  },
  demo: {
    heading: 'LIVE DEMOS',
    sub: 'Working demonstrations — test conversational capability before deploying.',
  },
  in_progress: {
    heading: 'IN PROGRESS',
    sub: 'Under active development with workflow blueprints in review.',
  },
  planned: {
    heading: 'UNDER DEVELOPMENT',
    sub: 'Planned on the Grovaitech product roadmap.',
  },
}

const MARKETPLACE_CATEGORIES = [
  'All',
  'Marketing',
  'Sales',
  'Customer Support',
  'Operations',
  'Finance',
  'Healthcare',
] as const

// ─── Channel Badge ────────────────────────────────────────────────────────────

function ChannelBadge({ ch }: { ch: string }) {
  const lower = ch.toLowerCase()
  const icon =
    lower.includes('whatsapp') ? (
      <MessageSquare className="w-2.5 h-2.5" />
    ) : lower.includes('voice') || lower.includes('phone') ? (
      <PhoneCall className="w-2.5 h-2.5" />
    ) : lower.includes('web') ? (
      <Globe className="w-2.5 h-2.5" />
    ) : lower.includes('email') ? (
      <Mail className="w-2.5 h-2.5" />
    ) : (
      <Zap className="w-2.5 h-2.5" />
    )

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold bg-slate-50 text-slate-600 border-slate-200 whitespace-nowrap">
      {icon} {ch}
    </span>
  )
}

// ─── Employee Card ─────────────────────────────────────────────────────────────

function MarketplaceCard({ emp }: { emp: AIEmployee }) {
  const [demoOpen, setDemoOpen] = useState(false)
  const sm = STATUS_META[emp.status]
  const hasDemo = emp.demo_config?.enabled === true
  const displayName = emp.displayName || emp.name
  const shortDescription = emp.shortDescription || emp.description || ''
  const category = emp.category || emp.department || 'Operations'
  const isDeployable = emp.status === 'live'
  const isConfigurable = emp.slug === 'social-media-marketing' || !!emp.configurationSchema
  const requiredIntegrations = emp.requiredIntegrations || []

  return (
    <>
      <div className="flex flex-col bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden">
        {/* Status colour strip */}
        <div className={`h-1 w-full ${sm.strip}`} />

        <div className="flex flex-col flex-1 p-5">
          {/* Header row: avatar + category + status badge */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0 shadow-2xs">
                <Bot className="w-5 h-5 text-[#0066FF]" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#0066FF] uppercase tracking-wider block">
                  {category}
                </span>
                <h3 className="font-extrabold text-sm text-[#00142E] leading-snug">
                  {displayName}
                </h3>
              </div>
            </div>
            <StatusBadge
              status={sm.status}
              label={sm.label}
              size="sm"
            />
          </div>

          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            {emp.title} · {emp.industry || category}
          </p>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed mt-2.5 flex-1 line-clamp-3">
            {shortDescription}
          </p>

          {/* Capabilities */}
          {emp.capabilities?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {emp.capabilities.slice(0, 3).map((cap) => (
                <span
                  key={cap}
                  className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  {cap}
                </span>
              ))}
              {emp.capabilities.length > 3 && (
                <span className="text-[10px] text-slate-400 font-bold px-1 self-center">
                  +{emp.capabilities.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Required Integrations */}
          {requiredIntegrations.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Required Integrations
              </span>
              <div className="flex flex-wrap gap-1.5">
                {requiredIntegrations.slice(0, 2).map((integ, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-medium rounded-md border border-slate-200"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {integ}
                  </span>
                ))}
                {requiredIntegrations.length > 2 && (
                  <span className="text-[10px] text-slate-400 font-semibold self-center">
                    +{requiredIntegrations.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action buttons: View Employee, Configure, Deploy */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            {/* View Employee */}
            <Link
              href={`/ai-employees/${emp.slug}`}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-white border border-slate-200 hover:border-[#0066FF] hover:text-[#0066FF] text-[#00142E] text-xs font-bold rounded-xl transition cursor-pointer"
            >
              <span>Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {/* Configure Action */}
            {isConfigurable ? (
              <Link
                href={`/ai-employees/${emp.slug}#configure`}
                className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-white border border-slate-200 hover:border-blue-300 hover:text-[#0066FF] text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                title="Configure brand parameters"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Configure</span>
              </Link>
            ) : (
              <span
                className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-slate-50 border border-slate-200/60 text-slate-400 text-xs font-medium rounded-xl cursor-not-allowed"
                title="Default configuration applied"
              >
                <Settings className="w-3.5 h-3.5 opacity-40" />
                <span className="hidden sm:inline">Configure</span>
              </span>
            )}

            {/* Deploy Action */}
            {isDeployable ? (
              <Link
                href={`/deploy?employee=${emp.slug}`}
                className="flex items-center justify-center gap-1.5 px-4 min-h-[44px] bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Deploy</span>
              </Link>
            ) : hasDemo ? (
              <button
                onClick={() => setDemoOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3.5 min-h-[44px] bg-blue-50 text-[#0066FF] border border-blue-200 hover:bg-blue-100 active:scale-95 text-xs font-bold rounded-xl transition cursor-pointer"
                title="Try interactive demonstration"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Demo</span>
              </button>
            ) : (
              <span
                className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-slate-50 border border-slate-200/60 text-slate-400 text-xs font-medium rounded-xl cursor-not-allowed"
                title="Pipeline validation pending"
              >
                <AlertCircle className="w-3.5 h-3.5 opacity-40" />
                <span>Deploy</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Demo modal */}
      {demoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full max-w-3xl h-[100dvh] sm:h-[600px] sm:max-h-[85dvh] rounded-none sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border border-slate-200 flex flex-col pb-[env(safe-area-inset-bottom,0px)]">
            <div className="flex items-center justify-between px-6 py-4 pt-[max(1rem,env(safe-area-inset-top,0px))] sm:pt-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <h3 className="font-bold text-sm text-slate-900">{displayName} — Live Demo</h3>
              </div>
              <button
                onClick={() => setDemoOpen(false)}
                className="min-h-[44px] px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatInterface employeeSlug={emp.slug} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ group, employees }: { group: string; employees: AIEmployee[] }) {
  if (employees.length === 0) return null
  const meta = SECTION_META[group]
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{meta.heading}</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">{meta.sub}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {employees.map((emp) => (
          <MarketplaceCard key={emp.id} emp={emp} />
        ))}
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface WorkforceProps {
  employees: AIEmployee[]
  isDemo: boolean
}

export function WorkforceMarketplace({ employees, isDemo }: WorkforceProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')

  const filtered = employees.filter((emp) => {
    const q = search.toLowerCase().trim()
    const nameMatch = (emp.displayName || emp.name).toLowerCase().includes(q)
    const descMatch = (emp.shortDescription || emp.description || '').toLowerCase().includes(q)
    const catMatch = (emp.category || emp.department || '').toLowerCase().includes(q)
    const indMatch = (emp.industry || '').toLowerCase().includes(q)
    const capMatch = (emp.capabilities || []).some((c) => c.toLowerCase().includes(q))
    const keyMatch = (emp.keywords || []).some((k) => k.toLowerCase().includes(q))

    const matchSearch = !q || nameMatch || descMatch || catMatch || indMatch || capMatch || keyMatch
    const matchStatus = statusFilter === 'all' || STATUS_GROUP[emp.status] === statusFilter

    const empCategory = (emp.category || emp.department || '').toLowerCase()
    const matchCategory =
      categoryFilter === 'All' || empCategory.includes(categoryFilter.toLowerCase())

    return matchSearch && matchStatus && matchCategory
  })

  const grouped = Object.fromEntries(
    SECTION_ORDER.map((key) => [key, filtered.filter((emp) => STATUS_GROUP[emp.status] === key)])
  )

  const kpis = [
    { label: 'Total Workforce', value: employees.length, cls: 'text-slate-800' },
    {
      label: 'Ready to Deploy',
      value: employees.filter((e) => e.status === 'live').length,
      cls: 'text-emerald-600',
    },
    {
      label: 'Live Demos',
      value: employees.filter((e) => e.status === 'demo' || e.status === 'beta').length,
      cls: 'text-blue-600',
    },
    {
      label: 'In Progress',
      value: employees.filter((e) => e.status === 'in_development').length,
      cls: 'text-amber-600',
    },
    {
      label: 'Under Development',
      value: employees.filter((e) => e.status === 'planned').length,
      cls: 'text-slate-500',
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── Header & Positioning ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold text-[#0066FF] uppercase tracking-widest">
            Grovaitech AI Workforce OS
          </span>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#00142E]">
              We Don&apos;t Sell Software. We Deploy AI Employees.
            </h1>
            {isDemo && (
              <span className="text-[9px] px-2.5 py-0.5 rounded-full font-black border bg-amber-50 text-amber-700 border-amber-200 uppercase tracking-wide">
                Demo Registry
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Autonomous digital employees engineered for specialized business operations with verified human-in-the-loop governance.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/deploy"
            className="flex items-center justify-center gap-2 px-5 min-h-[44px] bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy AI Employee</span>
          </Link>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 sm:gap-6 px-4 py-3 bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-baseline gap-2 shrink-0">
            <span className={`text-xl font-black ${k.cls}`}>{k.value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── Product flow ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0 mr-1">
          Execution Lifecycle:
        </span>
        {[
          'AI Employee Recipe',
          'Workflow Spec',
          'Execution Adapter',
          'Human Approval',
          'CRM / Integration Sync',
          'Business Outcome',
        ].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                i === 0 ? 'bg-[#0066FF] text-white' : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {step}
            </span>
            {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* ── Search & Filter Row ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch('')}
              placeholder="Search AI employees, keywords, capabilities..."
            />
          </div>
          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: 'All Statuses' },
              { key: 'ready', label: 'Ready' },
              { key: 'demo', label: 'Demo' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'planned', label: 'Under Dev' },
            ].map((f) => (
              <Pill
                key={f.key}
                label={f.label}
                selected={statusFilter === f.key}
                onClick={() => setStatusFilter(f.key)}
                variant={statusFilter === f.key ? 'default' : 'subtle'}
                size="sm"
              />
            ))}
          </div>
        </div>

        {/* ── Categories Bar ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Category:
          </span>
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <Pill
              key={cat}
              label={cat}
              selected={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              variant={categoryFilter === cat ? 'primary' : 'outline'}
              size="sm"
            />
          ))}
        </div>
      </div>

      {/* ── Sectioned Grid ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-xs gap-3 bg-white border border-dashed border-slate-200 rounded-2xl">
          <Bot className="w-10 h-10 opacity-30 text-slate-400" />
          <p className="text-sm font-semibold text-slate-600">No AI Employees match your search or filter.</p>
          <button
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
              setCategoryFilter('All')
            }}
            className="min-h-[44px] px-4 py-2 text-xs font-bold text-[#0066FF] bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {SECTION_ORDER.map((key) => (
            <Section key={key} group={key} employees={grouped[key] ?? []} />
          ))}
        </div>
      )}
    </div>
  )
}
