'use client'

import { useState } from 'react'
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Bot,
  Workflow as WorkflowIcon,
  Zap,
  MessageSquare,
  Mail,
  Calendar,
  Database,
  Link as LinkIcon,
  Copy,
  Check,
  Code,
  Shield,
  Layers,
  ChevronRight,
  Activity,
  SlidersHorizontal,
} from 'lucide-react'
import type { Workflow, WorkflowExecution, WorkflowStep, StepType } from '@/types/workflows'

interface WorkflowDrawerProps {
  workflow: Workflow
  onClose: () => void
  onToggleStatus: (id: string) => void
  onRunTest: (id: string) => void
  isRunningTest: boolean
}

const STEP_ICON_MAP: Record<StepType, any> = {
  ai_action: Bot,
  whatsapp: MessageSquare,
  email: Mail,
  calendar: Calendar,
  crm_sync: Database,
  n8n_webhook: WorkflowIcon,
  slack: MessageSquare,
  database: Database,
}

const STEP_COLOR_MAP: Record<StepType, { bg: string; text: string; border: string }> = {
  ai_action: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  whatsapp: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  email: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
  calendar: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  crm_sync: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  n8n_webhook: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
  slack: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  database: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
}

export default function WorkflowDrawer({
  workflow,
  onClose,
  onToggleStatus,
  onRunTest,
  isRunningTest,
}: WorkflowDrawerProps) {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'logs' | 'n8n'>('pipeline')
  const [copiedPayload, setCopiedPayload] = useState(false)

  const samplePayload = JSON.stringify(
    {
      event: workflow.trigger_event.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      assigned_employee: workflow.assigned_employee,
      timestamp: new Date().toISOString(),
      data: {
        customer_name: 'Suresh Kumar',
        phone: '+91 94400 12345',
        location: 'Tirupati, AP',
        lead_score: 85,
        status: 'qualified',
        requirements: '3BHK Villa, Budget ₹1.2 Cr',
      },
    },
    null,
    2
  )

  const handleCopy = () => {
    navigator.clipboard.writeText(samplePayload)
    setCopiedPayload(true)
    setTimeout(() => setCopiedPayload(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <WorkflowIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight truncate max-w-[220px]">
              {workflow.name}
            </h2>
            <span className="text-[10px] text-slate-400 font-medium">ID: {workflow.id}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-slate-200 px-6 bg-slate-50/50">
        {[
          { id: 'pipeline', label: 'Pipeline Visualizer', icon: Layers },
          { id: 'logs', label: `Execution History (${workflow.executions.length})`, icon: Activity },
          { id: 'n8n', label: 'n8n Webhook', icon: Code },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 py-3 px-3 border-b-2 text-xs font-bold transition ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: PIPELINE VISUALIZER */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Workflow Summary
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                    workflow.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : workflow.status === 'paused'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : workflow.status === 'in_development'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {workflow.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-slate-600 leading-relaxed">{workflow.description}</p>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Assigned AI Worker</span>
                  <span className="font-semibold text-slate-700">{workflow.assigned_employee}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Trigger Source</span>
                  <span className="font-semibold text-slate-700">{workflow.trigger_source}</span>
                </div>
              </div>
            </div>

            {/* Visual Step-by-Step Flow */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Execution Pipeline Flow
              </h3>

              {/* 1. Trigger Node */}
              <div className="relative pl-6 pb-6 border-l-2 border-blue-500 last:border-l-0">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-100 flex items-center justify-center text-white">
                  <Zap className="w-2.5 h-2.5" />
                </div>
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider">
                      TRIGGER EVENT
                    </span>
                    <span className="text-[9px] text-blue-500 font-semibold">{workflow.trigger_source}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-1">{workflow.trigger_event}</p>
                </div>
              </div>

              {/* 2. Action Steps */}
              {workflow.steps.map((step: WorkflowStep, idx: number) => {
                const IconComponent = STEP_ICON_MAP[step.type] || Zap
                const style = STEP_COLOR_MAP[step.type] || STEP_COLOR_MAP.database
                const isLast = idx === workflow.steps.length - 1

                return (
                  <div
                    key={step.id}
                    className={`relative pl-6 ${isLast ? '' : 'pb-6 border-l-2 border-slate-200'}`}
                  >
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-300 ring-4 ring-slate-100 flex items-center justify-center text-slate-700">
                      <span className="text-[9px] font-bold">{idx + 1}</span>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${style.border} ${style.bg}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <IconComponent className={`w-3.5 h-3.5 ${style.text}`} />
                          <span className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>
                            STEP {idx + 1}: {step.type.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400">{step.target}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 mt-1">{step.name}</p>
                      {step.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: EXECUTION HISTORY & LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Recent Runs ({workflow.executions.length})
                </h3>
                <p className="text-[10px] text-slate-500">Live and simulated execution logs</p>
              </div>
              <button
                onClick={() => onRunTest(workflow.id)}
                disabled={isRunningTest}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Play className={`w-3 h-3 ${isRunningTest ? 'animate-spin' : ''}`} />
                {isRunningTest ? 'Running Test…' : 'Test Run'}
              </button>
            </div>

            {workflow.executions.length === 0 ? (
              <div className="p-8 text-center border border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-50" />
                No execution logs recorded yet. Use &ldquo;Test Run&rdquo; to simulate an execution.
              </div>
            ) : (
              <div className="space-y-2.5">
                {workflow.executions.map((exec: WorkflowExecution) => (
                  <div
                    key={exec.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {exec.status === 'success' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        ) : exec.status === 'running' ? (
                          <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                        )}
                        <span className="font-bold text-slate-800">
                          {exec.lead_name || exec.trigger_event}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">
                        {exec.duration_ms}ms · {new Date(exec.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono bg-white p-2 rounded border border-slate-200/60 leading-tight">
                      {exec.payload_summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: n8n WEBHOOK CONFIG */}
        {activeTab === 'n8n' && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold">
                <WorkflowIcon className="w-4 h-4" />
                <span>n8n Webhook Dispatch Node</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                When this workflow triggers, Grovaitech formats the event data and dispatches an HTTP POST request to your n8n workflow webhook endpoint.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Target n8n Webhook URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={workflow.n8n_webhook_url || 'https://n8n.grovaitech.ai/webhook/v1/lead-automation'}
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-3 py-2 text-xs font-mono select-all focus:outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      workflow.n8n_webhook_url || 'https://n8n.grovaitech.ai/webhook/v1/lead-automation'
                    )
                  }}
                  className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
                  title="Copy Webhook URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Sample JSON Payload Egress
                </label>
                <button
                  onClick={handleCopy}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {copiedPayload ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copiedPayload ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed max-h-64">
                {samplePayload}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="shrink-0 p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
        <button
          onClick={() => onToggleStatus(workflow.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
            workflow.status === 'active'
              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          {workflow.status === 'active' ? 'Pause Workflow' : 'Activate Workflow'}
        </button>

        <button
          onClick={() => onRunTest(workflow.id)}
          disabled={isRunningTest}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <Play className={`w-3.5 h-3.5 ${isRunningTest ? 'animate-spin' : ''}`} />
          {isRunningTest ? 'Testing…' : 'Test Run'}
        </button>
      </div>
    </div>
  )
}
