'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Workflow as WorkflowIcon,
  Search,
  SlidersHorizontal,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Bot,
  Zap,
  MessageSquare,
  Mail,
  Calendar,
  Database,
  Link as LinkIcon,
  Activity,
  Layers,
  ChevronRight,
  Pause,
  Filter,
  RefreshCw,
} from 'lucide-react'
import type { Workflow, WorkflowStatus, StepType } from '@/types/workflows'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'
import { getWorkflows, triggerTestWorkflow } from '@/app/actions/workflows'
import WorkflowDrawer from './WorkflowDrawer'
import CreateWorkflowModal from './CreateWorkflowModal'

// ─── Status Badge Metadata ───────────────────────────────────────────────────

const STATUS_META: Record<WorkflowStatus, { label: string; cls: string; dot: string }> = {
  active: { label: 'ACTIVE', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  paused: { label: 'PAUSED', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  in_development: { label: 'IN PROGRESS', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
  draft: { label: 'DRAFT', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
}

const STEP_TYPE_BADGE: Record<StepType, { label: string; cls: string }> = {
  ai_action: { label: 'AI Worker', cls: 'bg-blue-50 text-blue-600 border-blue-100' },
  whatsapp: { label: 'WhatsApp', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  email: { label: 'Email', cls: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
  calendar: { label: 'Calendar', cls: 'bg-amber-50 text-amber-600 border-amber-100' },
  crm_sync: { label: 'CRM Sync', cls: 'bg-purple-50 text-purple-600 border-purple-100' },
  n8n_webhook: { label: 'n8n Webhook', cls: 'bg-rose-50 text-rose-600 border-rose-100' },
  slack: { label: 'Slack', cls: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  database: { label: 'Supabase', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
}

interface WorkflowsWorkspaceProps {
  initialWorkflows?: Workflow[]
  isFallback?: boolean
}

export function WorkflowsWorkspace({
  initialWorkflows,
  isFallback = true,
}: WorkflowsWorkspaceProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows || CANONICAL_DEMO_WORKFLOWS)
  const [isLiveMode, setIsLiveMode] = useState<boolean>(!isFallback)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<WorkflowStatus | 'all'>('all')
  const [triggerFilter, setTriggerFilter] = useState('all')
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [runningTestId, setRunningTestId] = useState<string | null>(null)

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId) || null

  // Dynamic KPI Stats
  const kpis = [
    { label: 'Total Workflows', value: workflows.length, cls: 'text-slate-800' },
    { label: 'Active', value: workflows.filter((w) => w.status === 'active').length, cls: 'text-emerald-600' },
    { label: 'Paused', value: workflows.filter((w) => w.status === 'paused').length, cls: 'text-amber-600' },
    { label: 'In Progress', value: workflows.filter((w) => w.status === 'in_development').length, cls: 'text-blue-600' },
    { label: 'Draft', value: workflows.filter((w) => w.status === 'draft').length, cls: 'text-slate-500' },
    {
      label: 'Executions (24h)',
      value: workflows.reduce((acc, w) => acc + w.total_executions, 0),
      cls: 'text-indigo-600',
    },
  ]

  const filteredWorkflows = workflows.filter((w) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      w.name.toLowerCase().includes(q) ||
      w.description.toLowerCase().includes(q) ||
      w.assigned_employee.toLowerCase().includes(q)
    const matchTab = activeTab === 'all' || w.status === activeTab
    const matchTrigger = triggerFilter === 'all' || w.trigger_event.toLowerCase().includes(triggerFilter.toLowerCase())
    return matchSearch && matchTab && matchTrigger
  })

  const handleToggleStatus = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const nextStatus: WorkflowStatus = w.status === 'active' ? 'paused' : 'active'
          return { ...w, status: nextStatus }
        }
        return w
      })
    )
  }

  const handleRunTest = async (id: string) => {
    setRunningTestId(id)
    try {
      const res = await triggerTestWorkflow(id)
      if (res.success) {
        const fresh = await getWorkflows()
        if (fresh.success) {
          setWorkflows(fresh.workflows)
          setIsLiveMode(!fresh.isFallback)
        }
      }
    } catch (err) {
      console.error('[handleRunTest Error]', err)
    } finally {
      setRunningTestId(null)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await getWorkflows()
      if (res.success) {
        setWorkflows(res.workflows)
        setIsLiveMode(!res.isFallback)
      }
    } catch (err) {
      console.error('[handleRefresh Error]', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleCreateWorkflow = (newWf: Workflow) => {
    setWorkflows([newWf, ...workflows])
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            AI Workforce OS
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Workflows</h1>
            {isLiveMode ? (
              <span className="text-[8px] px-2 py-0.5 rounded-full font-black border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-wide flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Executions
              </span>
            ) : (
              <span className="text-[8px] px-2 py-0.5 rounded-full font-black border bg-slate-100 text-slate-600 border-slate-200 uppercase tracking-wide">
                Demo Sandbox Mode
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Design, orchestrate, and monitor autonomous business automations and n8n pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 disabled:opacity-50 transition"
            title="Refresh execution logs from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </button>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
            title="Configure n8n integration"
          >
            <WorkflowIcon className="w-3.5 h-3.5 text-rose-500" /> n8n Settings
          </Link>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> Create Workflow
          </button>
        </div>
      </div>

      {/* ── KPI Summary Strip ─────────────────────────────────────────── */}
      <div className="flex items-center gap-6 px-5 py-3.5 bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        {kpis.map((k) => (
          <div key={k.label} className="flex items-baseline gap-1.5 shrink-0">
            <span className={`text-xl font-black ${k.cls}`}>{k.value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
          </div>
        ))}
      </div>

      {/* ── Architectural Context Row ─────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl overflow-x-auto">
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0 mr-1">
          Orchestration Layer:
        </span>
        {['AI Employee', 'Conversation', 'Lead', 'Workflow & n8n', 'Analytics', 'Business Result'].map((step, i, arr) => (
          <div key={step} className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                i === 3 ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-500'
              }`}
            >
              {step}
            </span>
            {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300" />}
          </div>
        ))}
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search workflows…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 transition w-48"
          />
        </div>

        {/* Status Tabs */}
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'paused', label: 'Paused' },
          { key: 'in_development', label: 'In Progress' },
          { key: 'draft', label: 'Draft' },
        ].map((f) => {
          const count =
            f.key === 'all'
              ? workflows.length
              : workflows.filter((w) => w.status === f.key).length
          return (
            <button
              key={f.key}
              onClick={() => setActiveTab(f.key as any)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                activeTab === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 px-1 py-0.5 rounded text-[8px] font-black ${
                  activeTab === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}

        {/* Trigger Filter Dropdown */}
        <select
          value={triggerFilter}
          onChange={(e) => setTriggerFilter(e.target.value)}
          className="ml-auto text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
        >
          <option value="all">All Triggers</option>
          <option value="lead">Lead Qualified</option>
          <option value="site visit">Site Visit Booked</option>
          <option value="appointment">Appointment Booked</option>
          <option value="whatsapp">WhatsApp Inbound</option>
          <option value="human">Human Escalation</option>
        </select>
      </div>

      {/* ── Main Workflows Table ─────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {filteredWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-xs gap-2">
            <WorkflowIcon className="w-10 h-10 opacity-30" />
            No workflows match your search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {['Workflow Name & Role', 'Trigger Event', 'AI Worker', 'Pipeline Steps', 'Runs', 'Status', 'Actions'].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left font-black whitespace-nowrap">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredWorkflows.map((wf, idx) => {
                  const sm = STATUS_META[wf.status] || STATUS_META.draft
                  const isSelected = selectedWorkflowId === wf.id

                  return (
                    <tr
                      key={wf.id}
                      onClick={() => setSelectedWorkflowId(wf.id)}
                      className={`cursor-pointer border-b border-slate-100 transition-colors ${
                        isSelected
                          ? 'bg-blue-50/60 border-l-2 border-l-blue-600'
                          : idx % 2 === 0
                          ? 'bg-white hover:bg-slate-50/80'
                          : 'bg-slate-50/30 hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Workflow Name */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                            <WorkflowIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-snug">{wf.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                              {wf.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Trigger */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{wf.trigger_event}</span>
                        </div>
                      </td>

                      {/* AI Worker */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Bot className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{wf.assigned_employee}</span>
                        </div>
                      </td>

                      {/* Pipeline Steps Sequence */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {wf.steps.map((st, sIdx) => {
                            const badge = STEP_TYPE_BADGE[st.type] || STEP_TYPE_BADGE.database
                            return (
                              <span
                                key={st.id}
                                className="inline-flex items-center gap-1"
                              >
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${badge.cls}`}>
                                  {badge.label}
                                </span>
                                {sIdx < wf.steps.length - 1 && (
                                  <span className="text-[8px] text-slate-300 font-bold">➔</span>
                                )}
                              </span>
                            )
                          })}
                        </div>
                      </td>

                      {/* Executions / Metrics */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-800">{wf.total_executions} runs</span>
                        <span className="block text-[10px] text-emerald-600 font-semibold">
                          {wf.success_rate}% success
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide ${sm.cls}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
                          {sm.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRunTest(wf.id)}
                            disabled={runningTestId === wf.id}
                            title="Simulate Test Run"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition"
                          >
                            <Play className={`w-3 h-3 ${runningTestId === wf.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(wf.id)}
                            title={wf.status === 'active' ? 'Pause' : 'Activate'}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200 transition"
                          >
                            {wf.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 text-emerald-500" />}
                          </button>
                          <button
                            onClick={() => setSelectedWorkflowId(wf.id)}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:border-blue-400 text-slate-600 hover:text-blue-600 text-[10px] font-bold transition"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Slide-Over Detail Drawer ─────────────────────────────────── */}
      {selectedWorkflow && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/30 backdrop-blur-2xs z-40 transition-opacity"
            onClick={() => setSelectedWorkflowId(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] lg:w-[540px] bg-white shadow-2xl z-50 border-l border-slate-200 overflow-hidden animate-slide-in">
            <WorkflowDrawer
              workflow={selectedWorkflow}
              onClose={() => setSelectedWorkflowId(null)}
              onToggleStatus={handleToggleStatus}
              onRunTest={handleRunTest}
              isRunningTest={runningTestId === selectedWorkflow.id}
            />
          </div>
        </>
      )}

      {/* ── Create Workflow Modal ────────────────────────────────────── */}
      <CreateWorkflowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateWorkflow}
      />
    </div>
  )
}
