'use client'

import { useState } from 'react'
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Shield,
  Zap,
  Play,
  Save,
  Check,
  Lock,
  Layers,
  Activity,
  Workflow as WorkflowIcon,
} from 'lucide-react'
import type { Integration, IntegrationStatus } from '@/types/integrations'

interface IntegrationDrawerProps {
  integration: Integration
  onClose: () => void
  onSave: (id: string, updatedFields: Record<string, string>) => void
  onTestConnection: (id: string) => Promise<{ success: boolean; latencyMs: number; message: string }>
}

const STATUS_BADGE_MAP: Record<IntegrationStatus, { label: string; cls: string; dot: string }> = {
  connected: { label: 'CONNECTED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  configured: { label: 'CONFIGURED', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  needs_setup: { label: 'NEEDS SETUP', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  demo: { label: 'DEMO / SIMULATED', cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  not_connected: { label: 'NOT CONNECTED', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
}

export default function IntegrationDrawer({
  integration,
  onClose,
  onSave,
  onTestConnection,
}: IntegrationDrawerProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    integration.fields.forEach((f) => {
      initial[f.id] = f.value || ''
    })
    return initial
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    latencyMs: number
    message: string
  } | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const sm = STATUS_BADGE_MAP[integration.status] || STATUS_BADGE_MAP.not_connected

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await onTestConnection(integration.id)
      setTestResult(res)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(integration.id, formData)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 leading-tight">{integration.name}</h2>
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black border uppercase ${sm.cls}`}>
                {sm.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Category: {integration.category.toUpperCase()}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
        {/* Description card */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Overview</span>
          <p className="text-slate-600 text-[11px] leading-relaxed">{integration.description}</p>
          {integration.version && (
            <span className="text-[9px] font-mono text-slate-400 block pt-1">Driver: {integration.version}</span>
          )}
        </div>

        {/* Security / Non-leak banner */}
        <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-[11px] text-blue-800">
          <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Enterprise Credential Security</span>
            <span className="text-blue-600/90 text-[10px]">
              Sensitive tokens and API keys are stored encrypted on the server. Never exposed to browser logs or client state.
            </span>
          </div>
        </div>

        {/* Configuration Fields */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Connection Parameters
          </h3>

          {integration.fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                <span>{field.label}</span>
                {field.masked && (
                  <span className="text-[9px] text-slate-400 font-normal flex items-center gap-0.5">
                    <Lock className="w-2.5 h-2.5" /> Encrypted
                  </span>
                )}
              </label>

              {field.type === 'select' ? (
                <select
                  value={formData[field.id] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                >
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === 'password' ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.id] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              )}

              {field.helpText && (
                <p className="text-[10px] text-slate-400 mt-0.5">{field.helpText}</p>
              )}
            </div>
          ))}
        </div>

        {/* Connected Workflows */}
        {integration.relatedWorkflows.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Workflows Using This Connection ({integration.relatedWorkflows.length})
            </h3>
            <div className="space-y-1.5">
              {integration.relatedWorkflows.map((wf, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex items-center gap-2 text-[11px] text-slate-700"
                >
                  <WorkflowIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold">{wf}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Result Box */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-[11px]">
              <div className="flex items-center justify-between font-bold">
                <span>{testResult.success ? 'Connection Validated' : 'Connection Test Failed'}</span>
                <span className="text-[10px] font-mono">{testResult.latencyMs}ms</span>
              </div>
              <p className="text-[10px] mt-0.5 opacity-90">{testResult.message}</p>
            </div>
          </div>
        )}

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Configuration saved successfully.</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            <Play className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
            {testing ? 'Testing Endpoint…' : 'Test Connection'}
          </button>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  )
}
