'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Zap, Bot, Layers, CheckCircle } from 'lucide-react'
import type { Workflow, WorkflowStep, StepType } from '@/types/workflows'

interface CreateWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (workflow: Workflow) => void
}

const AI_EMPLOYEES_LIST = [
  'Real Estate Lead Receptionist',
  'Clinic Receptionist',
  'WhatsApp Lead Agent',
  'Salon & Spa Receptionist',
  'Customer Support Agent',
  'AI QA Inspector',
  'Legal Intake Agent',
  'E-Commerce Support Agent',
  'HR Onboarding Agent',
  'Financial Advisory Agent',
]

const TRIGGER_OPTIONS = [
  'Lead Qualified (Score >= 80)',
  'Site Visit Requested',
  'Appointment Booked by Patient',
  'Customer Requests Human Agent',
  'New WhatsApp Inbound Message',
  'Conversation Completed',
  'New Legal Inquiry Submitted',
]

export default function CreateWorkflowModal({
  isOpen,
  onClose,
  onCreate,
}: CreateWorkflowModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerEvent, setTriggerEvent] = useState(TRIGGER_OPTIONS[0])
  const [assignedEmployee, setAssignedEmployee] = useState(AI_EMPLOYEES_LIST[0])
  const [n8nUrl, setN8nUrl] = useState('https://n8n.grovaitech.ai/webhook/v1/custom-pipeline')
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: 'st-1',
      name: 'Sync Lead Record',
      type: 'database',
      target: 'Supabase CRM',
      description: 'Store verified lead parameters in database.',
    },
    {
      id: 'st-2',
      name: 'Send WhatsApp Notification',
      type: 'whatsapp',
      target: 'Customer Phone',
      description: 'Send instant confirmation message.',
    },
    {
      id: 'st-3',
      name: 'Trigger n8n Webhook',
      type: 'n8n_webhook',
      target: 'n8n Automation Hub',
      description: 'Dispatch payload to n8n for multi-service routing.',
    },
  ])

  if (!isOpen) return null

  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `st-${Date.now()}`,
      name: 'Custom Action Step',
      type: 'ai_action',
      target: 'Target Service',
      description: 'Action execution description.',
    }
    setSteps([...steps, newStep])
  }

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s: WorkflowStep) => s.id !== id))
  }

  const handleUpdateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map((s: WorkflowStep) => (s.id === id ? { ...s, ...updates } : s)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const newWorkflow: Workflow = {
      id: `wf-${Date.now().toString(36)}`,
      name: name.trim(),
      description: description.trim() || 'Custom automated business pipeline.',
      status: 'active',
      trigger_event: triggerEvent,
      trigger_source: assignedEmployee,
      assigned_employee: assignedEmployee,
      assigned_employee_slug: assignedEmployee.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      steps: steps,
      n8n_webhook_url: n8nUrl,
      total_executions: 0,
      success_rate: 100,
      last_executed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      executions: [],
    }

    onCreate(newWorkflow)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col animate-scale-in">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Create Automation Workflow</h2>
              <p className="text-[11px] text-slate-500">
                Configure event triggers, AI worker logic, and downstream n8n pipelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Workflow Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Workflow Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., High-Value Lead WhatsApp & Calendar Orchestration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Describe what this workflow automates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Trigger Event */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Trigger Event
              </label>
              <select
                value={triggerEvent}
                onChange={(e) => setTriggerEvent(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
              >
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned AI Employee */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Source AI Employee
              </label>
              <select
                value={assignedEmployee}
                onChange={(e) => setAssignedEmployee(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
              >
                {AI_EMPLOYEES_LIST.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Steps */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Action Steps ({steps.length})
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>

            <div className="space-y-2.5">
              {steps.map((step: WorkflowStep, idx: number) => (
                <div
                  key={step.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                      placeholder="Step Title"
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                    />
                    <select
                      value={step.type}
                      onChange={(e) =>
                        handleUpdateStep(step.id, { type: e.target.value as StepType })
                      }
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      <option value="database">Database / Supabase</option>
                      <option value="whatsapp">WhatsApp Dispatch</option>
                      <option value="email">Email Notification</option>
                      <option value="calendar">Calendar Booking</option>
                      <option value="crm_sync">CRM Sync</option>
                      <option value="n8n_webhook">n8n Webhook</option>
                      <option value="slack">Slack Alert</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(step.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* n8n Webhook Egress */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              n8n Target Webhook URL (Optional)
            </label>
            <input
              type="text"
              placeholder="https://n8n.yourdomain.com/webhook/..."
              value={n8nUrl}
              onChange={(e) => setN8nUrl(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm"
            >
              Create Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
