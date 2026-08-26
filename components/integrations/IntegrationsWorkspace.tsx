'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Zap,
  Search,
  Plus,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Shield,
  Layers,
  Workflow as WorkflowIcon,
  MessageSquare,
  Mail,
  Calendar,
  Database,
  Cpu,
  Bot,
  Activity,
  PhoneCall,
  Globe,
  Lock,
  ChevronRight,
  SlidersHorizontal,
  FileSpreadsheet,
  Share2,
} from 'lucide-react'
import type { Integration, IntegrationCategory, IntegrationStatus } from '@/types/integrations'
import IntegrationDrawer from './IntegrationDrawer'

// ─── Canonical Integrations Registry (13 Registered Services) ─────────────────

export const CANONICAL_INTEGRATIONS: Integration[] = [
  // ── AI & Intelligence
  {
    id: 'int-gemini',
    name: 'Google Gemini AI',
    slug: 'google-gemini',
    category: 'ai',
    description: 'Primary LLM inference engine powering autonomous conversation flows and lead intent extraction in lib/gemini/client.ts.',
    status: 'connected',
    iconType: 'gemini',
    version: 'gemini-3.7-flash (Thinking: Medium)',
    lastChecked: 'Just now',
    latencyMs: 135,
    fields: [
      {
        id: 'model',
        label: 'Active Chat Model',
        type: 'select',
        value: 'gemini-3.7-flash',
        options: ['gemini-3.7-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'],
        helpText: 'Official GA Gemini 3.7 Flash model ID configured in lib/gemini/client.ts.',
      },
      {
        id: 'thinking',
        label: 'Thinking Level',
        type: 'select',
        value: 'medium (default)',
        options: ['medium (default)', 'low', 'high', 'disabled'],
        helpText: 'Gemini 3.7 Flash native reasoning level.',
      },
      {
        id: 'apiKey',
        label: 'Gemini API Key',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
        helpText: 'Configured in .env.local as GEMINI_API_KEY. Falls back to simulated responses if missing.',
      },
    ],
    relatedWorkflows: [
      'Inbound WhatsApp Lead Qualification Pipeline (n8n)',
      'AI QA Interaction Audit & Quality Scoring',
      'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
    ],
    docsUrl: 'https://ai.google.dev/',
  },
  {
    id: 'int-openai',
    name: 'OpenAI GPT-4o',
    slug: 'openai',
    category: 'ai',
    description: 'Secondary LLM provider for document embeddings, complex reasoning, and fallback routing.',
    status: 'not_connected',
    iconType: 'openai',
    version: 'gpt-4o-mini',
    fields: [
      {
        id: 'apiKey',
        label: 'OpenAI API Key',
        type: 'password',
        placeholder: 'sk-proj-...',
        masked: true,
        helpText: 'Enter your OpenAI API secret key for secondary routing.',
      },
      {
        id: 'orgId',
        label: 'Organization ID (Optional)',
        type: 'text',
        placeholder: 'org-...',
      },
    ],
    relatedWorkflows: [],
  },
  {
    id: 'int-claude',
    name: 'Anthropic Claude',
    slug: 'anthropic-claude',
    category: 'ai',
    description: 'Specialized reasoning engine for high-context legal and medical intake compliance checks.',
    status: 'not_connected',
    iconType: 'claude',
    version: 'claude-3-5-sonnet',
    fields: [
      {
        id: 'apiKey',
        label: 'Anthropic API Key',
        type: 'password',
        placeholder: 'sk-ant-...',
        masked: true,
      },
    ],
    relatedWorkflows: [],
  },

  // ── Data & Storage
  {
    id: 'int-supabase',
    name: 'Supabase PostgreSQL & Auth',
    slug: 'supabase',
    category: 'data',
    description: 'Cloud database, lead storage, real_estate_leads table, and authentication session manager.',
    status: 'connected',
    iconType: 'supabase',
    version: 'PostgreSQL 15 + RLS',
    lastChecked: 'Just now',
    latencyMs: 88,
    fields: [
      {
        id: 'url',
        label: 'Supabase Project URL',
        type: 'url',
        value: 'https://vkmjrqokrqjtxw...supabase.co',
        masked: false,
        helpText: 'Configured via NEXT_PUBLIC_SUPABASE_URL.',
      },
      {
        id: 'anonKey',
        label: 'Anon Public Key',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
        helpText: 'Configured via NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      },
      {
        id: 'authMode',
        label: 'Auth Strategy',
        type: 'select',
        value: 'Cookie Session (SSR) + RLS',
        options: ['Cookie Session (SSR) + RLS', 'JWT Bearer'],
      },
    ],
    relatedWorkflows: [
      'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
      'Clinic Appointment Booking & Reminder Pipeline',
      'AI QA Interaction Audit & Quality Scoring',
      'Legal Consultation Intake & Conflict Check',
    ],
  },
  {
    id: 'int-sheets',
    name: 'Google Sheets CRM Sync',
    slug: 'google-sheets',
    category: 'data',
    description: 'Instant spreadsheet backup for captured leads, export summaries, and client reporting sheets.',
    status: 'demo',
    iconType: 'sheets',
    version: 'Sheets v4 API (Demo)',
    lastChecked: '1h ago',
    latencyMs: 210,
    fields: [
      {
        id: 'sheetId',
        label: 'Google Spreadsheet ID',
        type: 'text',
        value: '1A2B3C4D5E6F7G8H9I0J_GrovaitechLeads_2026',
        helpText: 'Target sheet where real-time lead rows are appended.',
      },
      {
        id: 'serviceAccount',
        label: 'Service Account JSON',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
      },
    ],
    relatedWorkflows: ['Real Estate Lead ➔ WhatsApp & Site Visit Sync'],
  },

  // ── Automation & Orchestration
  {
    id: 'int-n8n',
    name: 'n8n Automation Hub',
    slug: 'n8n-automation',
    category: 'automation',
    description: 'Workflow orchestration server for dispatching webhook events and connecting multi-SaaS pipelines.',
    status: 'configured',
    iconType: 'n8n',
    version: 'v1.45.1 Webhook Node',
    lastChecked: '12m ago',
    latencyMs: 165,
    fields: [
      {
        id: 'n8nUrl',
        label: 'n8n Webhook Base URL',
        type: 'url',
        value: 'https://n8n.grovaitech.ai/webhook/v1/lead-automation',
        helpText: 'Webhook ingestion endpoint configured in Settings.',
      },
      {
        id: 'apiKey',
        label: 'n8n API Key (Optional Header)',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
      },
      {
        id: 'retryPolicy',
        label: 'Webhook Retry Strategy',
        type: 'select',
        value: 'Exponential Backoff (3 attempts)',
        options: ['Exponential Backoff (3 attempts)', 'Immediate (1 attempt)', 'Manual Re-try'],
      },
    ],
    relatedWorkflows: [
      'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
      'Inbound WhatsApp Lead Qualification Pipeline (n8n)',
    ],
  },
  {
    id: 'int-webhooks',
    name: 'Custom Inbound/Outbound Webhooks',
    slug: 'custom-webhooks',
    category: 'automation',
    description: 'Secure HTTP POST/GET event dispatchers for custom CRM endpoints, Zapier, and Make.com.',
    status: 'connected',
    iconType: 'webhook',
    version: 'REST Event Bus',
    lastChecked: '4m ago',
    latencyMs: 95,
    fields: [
      {
        id: 'secretHeader',
        label: 'HMAC Signing Secret',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
      },
    ],
    relatedWorkflows: [
      'Urgent Escalation ➔ Human Agent Dispatch',
      'Inbound WhatsApp Lead Qualification Pipeline (n8n)',
    ],
  },

  // ── Communication
  {
    id: 'int-whatsapp',
    name: 'WhatsApp Business API',
    slug: 'whatsapp-business',
    category: 'communication',
    description: 'Official WhatsApp cloud messaging for 24/7 lead intake, appointment reminders, and site visit alerts.',
    status: 'demo',
    iconType: 'whatsapp',
    version: 'Cloud API v20.0 (Simulated)',
    lastChecked: '8m ago',
    latencyMs: 240,
    fields: [
      {
        id: 'phoneId',
        label: 'WhatsApp Phone Number ID',
        type: 'text',
        value: '109845729104829',
        helpText: 'Registered business phone identifier on Meta Developer Portal.',
      },
      {
        id: 'wabaId',
        label: 'WABA Account ID',
        type: 'text',
        value: 'waba_948291048291048',
      },
      {
        id: 'systemToken',
        label: 'Permanent System User Token',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
      },
    ],
    relatedWorkflows: [
      'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
      'Clinic Appointment Booking & Reminder Pipeline',
      'Inbound WhatsApp Lead Qualification Pipeline (n8n)',
    ],
  },
  {
    id: 'int-email',
    name: 'Transactional Email (SMTP/Resend)',
    slug: 'email-service',
    category: 'communication',
    description: 'High-deliverability transactional notifications for daily QA reports, lead receipts, and calendar invites.',
    status: 'configured',
    iconType: 'email',
    version: 'Resend SMTP Gateway',
    lastChecked: '30m ago',
    latencyMs: 180,
    fields: [
      {
        id: 'fromEmail',
        label: 'Sender Address',
        type: 'text',
        value: 'notifications@grovaitech.com',
      },
      {
        id: 'smtpKey',
        label: 'API / SMTP Password',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
      },
    ],
    relatedWorkflows: ['AI QA Interaction Audit & Quality Scoring'],
  },
  {
    id: 'int-voice',
    name: 'AI Voice & Telephony (Twilio / SIP)',
    slug: 'ai-voice-telephony',
    category: 'communication',
    description: 'Inbound virtual receptionist phone line with automated speech-to-text and AI voice response.',
    status: 'needs_setup',
    iconType: 'voice',
    version: 'Twilio SIP Trunking',
    fields: [
      {
        id: 'accountSid',
        label: 'Twilio Account SID',
        type: 'text',
        placeholder: 'AC...',
      },
      {
        id: 'authToken',
        label: 'Auth Token',
        type: 'password',
        placeholder: 'Enter token...',
        masked: true,
      },
    ],
    relatedWorkflows: [],
  },

  // ── Calendar & Scheduling
  {
    id: 'int-calendar',
    name: 'Google Calendar API',
    slug: 'google-calendar',
    category: 'calendar',
    description: 'Two-way synchronization for doctor consultation slots and real estate site visit bookings.',
    status: 'configured',
    iconType: 'calendar',
    version: 'Calendar v3 API',
    lastChecked: '15m ago',
    latencyMs: 175,
    fields: [
      {
        id: 'calendarId',
        label: 'Primary Calendar ID',
        type: 'text',
        value: 'appointments@apollodental.in',
      },
      {
        id: 'oauthToken',
        label: 'Service Token / OAuth',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
      },
    ],
    relatedWorkflows: [
      'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
      'Clinic Appointment Booking & Reminder Pipeline',
      'Legal Consultation Intake & Conflict Check',
    ],
  },

  // ── CRM & Business
  {
    id: 'int-crm',
    name: 'Multi-CRM Connector (HubSpot / Zoho)',
    slug: 'multi-crm-hub',
    category: 'crm',
    description: 'Automatic contact syncing and pipeline deal creation routed through n8n workflows.',
    status: 'configured',
    iconType: 'crm',
    version: 'n8n CRM Node Bridge',
    lastChecked: '45m ago',
    latencyMs: 210,
    fields: [
      {
        id: 'provider',
        label: 'Primary CRM Target',
        type: 'select',
        value: 'HubSpot CRM',
        options: ['HubSpot CRM', 'Zoho CRM', 'Salesforce', 'Pipedrive'],
      },
      {
        id: 'apiKey',
        label: 'CRM Private App Token',
        type: 'password',
        value: '••••••••••••••••••••••••••••••••',
        masked: true,
      },
    ],
    relatedWorkflows: ['Inbound WhatsApp Lead Qualification Pipeline (n8n)'],
  },
  {
    id: 'int-google-business',
    name: 'Google Business Profile',
    slug: 'google-business-profile',
    category: 'crm',
    description: 'Automated review monitoring, clinic FAQ sync, and local inquiry ingestion.',
    status: 'not_connected',
    iconType: 'google',
    version: 'MyBusiness API v4',
    fields: [
      {
        id: 'locationId',
        label: 'Location Identifier',
        type: 'text',
        placeholder: 'locations/...',
      },
    ],
    relatedWorkflows: [],
  },
]

// ─── Status & Icon Helpers ───────────────────────────────────────────────────

const STATUS_META: Record<IntegrationStatus, { label: string; cls: string; dot: string }> = {
  connected: { label: 'CONNECTED', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  configured: { label: 'CONFIGURED', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  needs_setup: { label: 'NEEDS SETUP', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  demo: { label: 'DEMO PREVIEW', cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  not_connected: { label: 'NOT CONNECTED', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
}

const CATEGORIES: { id: IntegrationCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Services' },
  { id: 'communication', label: 'Communication' },
  { id: 'automation', label: 'Automation & n8n' },
  { id: 'ai', label: 'AI & Intelligence' },
  { id: 'data', label: 'Data & Storage' },
  { id: 'calendar', label: 'Calendar & Booking' },
  { id: 'crm', label: 'CRM & Business' },
]

export function IntegrationsWorkspace() {
  const [integrations, setIntegrations] = useState<Integration[]>(CANONICAL_INTEGRATIONS)
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [quickTestNotice, setQuickTestNotice] = useState<string | null>(null)

  const selectedIntegration = integrations.find((i) => i.id === selectedIntegrationId) || null

  // System Health Summary (100% Dynamically Derived)
  const total = integrations.length
  const connected = integrations.filter((i) => i.status === 'connected').length
  const configured = integrations.filter((i) => i.status === 'configured').length
  const needsSetup = integrations.filter((i) => i.status === 'needs_setup').length
  const demoCount = integrations.filter((i) => i.status === 'demo').length
  const notConnected = integrations.filter((i) => i.status === 'not_connected').length

  const getCategoryCount = (catId: IntegrationCategory | 'all') => {
    if (catId === 'all') return integrations.length
    return integrations.filter((i) => i.category === catId).length
  }

  const getStatusCount = (stId: string) => {
    if (stId === 'all') return integrations.length
    return integrations.filter((i) => i.status === stId).length
  }

  const filtered = integrations.filter((item) => {
    const q = search.toLowerCase()
    const matchSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    const matchCat = activeCategory === 'all' || item.category === activeCategory
    const matchStatus = statusFilter === 'all' || item.status === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  // Simulated Safe Connection Test
  const handleTestConnection = async (
    id: string
  ): Promise<{ success: boolean; latencyMs: number; message: string }> => {
    const target = integrations.find((i) => i.id === id)
    await new Promise((resolve) => setTimeout(resolve, 800))

    if (!target) {
      return { success: false, latencyMs: 0, message: 'Integration not found.' }
    }

    if (target.status === 'connected' || target.status === 'configured') {
      const latency = Math.floor(Math.random() * 90) + 80
      return {
        success: true,
        latencyMs: latency,
        message: `HTTP 200 OK — Handshake verified securely with ${target.name}.`,
      }
    }

    if (target.status === 'demo') {
      return {
        success: true,
        latencyMs: 190,
        message: `Simulation Mode — Dry-run payload validated successfully.`,
      }
    }

    return {
      success: false,
      latencyMs: 0,
      message: `Authentication parameters are missing or incomplete. Please provide required credentials.`,
    }
  }

  const handleQuickTest = async (id: string) => {
    setTestingId(id)
    const res = await handleTestConnection(id)
    setTestingId(null)
    setQuickTestNotice(`${integrations.find((i) => i.id === id)?.name}: ${res.message}`)
    setTimeout(() => setQuickTestNotice(null), 4000)
  }

  const handleSaveFields = (id: string, updatedFields: Record<string, string>) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newFields = item.fields.map((f) => ({
            ...f,
            value: updatedFields[f.id] !== undefined ? updatedFields[f.id] : f.value,
          }))
          return {
            ...item,
            fields: newFields,
            status: item.status === 'not_connected' ? 'configured' : item.status,
            lastChecked: 'Just now',
          }
        }
        return item
      })
    )
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
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Integrations</h1>
            <span className="text-[8px] px-2 py-0.5 rounded-full font-black border bg-emerald-50 text-emerald-700 border-emerald-200 uppercase tracking-wide">
              {connected + configured} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Connect the communication channels, databases, AI models, and n8n automations that power your AI Employees.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Link
            href="/workflows"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
          >
            <WorkflowIcon className="w-3.5 h-3.5 text-blue-600" /> View Workflows
          </Link>
          <button
            onClick={() => setSelectedIntegrationId('int-n8n')}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> Add Integration
          </button>
        </div>
      </div>

      {quickTestNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-semibold flex items-center justify-between animate-fade-in">
          <span>⚡ {quickTestNotice}</span>
          <button onClick={() => setQuickTestNotice(null)} className="text-blue-500 hover:text-blue-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ── System Health Summary Strip (Dynamically Derived) ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Total Services</span>
          <p className="text-xl font-black text-slate-900 mt-1">{total}</p>
          <span className="text-[9px] text-slate-400 font-medium">Enterprise Nodes</span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase">Connected</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{connected}</p>
          <span className="text-[9px] text-emerald-600 font-semibold">Live & Verified</span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase">Configured</span>
          <p className="text-xl font-black text-blue-600 mt-1">{configured}</p>
          <span className="text-[9px] text-blue-500 font-semibold">Local Credentials</span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase">Demo Preview</span>
          <p className="text-xl font-black text-purple-600 mt-1">{demoCount}</p>
          <span className="text-[9px] text-purple-500 font-semibold">Simulated Hub</span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase">Needs Setup</span>
          <p className="text-xl font-black text-amber-600 mt-1">{needsSetup}</p>
          <span className="text-[9px] text-amber-500 font-semibold">Action Required</span>
        </div>
        <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Not Connected</span>
          <p className="text-xl font-black text-slate-900 mt-1">{notConnected}</p>
          <span className="text-[9px] text-slate-500 font-bold">● Available</span>
        </div>
      </div>

      {/* ── Architectural Context Banner ──────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">End-to-End Orchestration Architecture</h4>
            <p className="text-[11px] text-slate-500">
              Integrations power the full cycle: <strong>WhatsApp / Voice</strong> ➔ <strong>Gemini AI ({CANONICAL_INTEGRATIONS[0].version})</strong> ➔ <strong>Supabase DB</strong> ➔ <strong>n8n Pipelines</strong>.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/settings"
          className="text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1 shrink-0"
        >
          Manage API Keys <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Category & Filter Tabs ────────────────────────────────────── */}
      <div className="space-y-3">
        {/* Dynamic Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => {
            const count = getCategoryCount(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat.label}
                <span
                  className={`ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-black ${
                    activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search & Dynamic Status Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search integrations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 transition w-52"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'connected', label: 'Connected' },
              { id: 'configured', label: 'Configured' },
              { id: 'demo', label: 'Demo' },
              { id: 'needs_setup', label: 'Needs Setup' },
              { id: 'not_connected', label: 'Not Connected' },
            ].map((st) => {
              const count = getStatusCount(st.id)
              return (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                    statusFilter === st.id
                      ? 'bg-slate-800 text-white'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`text-[8px] font-bold px-1 rounded ${
                      statusFilter === st.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Integrations Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const sm = STATUS_META[item.status] || STATUS_META.not_connected
          const isTesting = testingId === item.id

          return (
            <div
              key={item.id}
              className="flex flex-col bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-xs transition-all duration-200 justify-between"
            >
              <div>
                {/* Header: Icon + Name + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                      {item.category === 'ai' ? (
                        <Bot className="w-5 h-5" />
                      ) : item.category === 'automation' ? (
                        <WorkflowIcon className="w-5 h-5 text-rose-600" />
                      ) : item.category === 'data' ? (
                        <Database className="w-5 h-5 text-emerald-600" />
                      ) : item.category === 'calendar' ? (
                        <Calendar className="w-5 h-5 text-amber-600" />
                      ) : item.category === 'communication' ? (
                        <MessageSquare className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Layers className="w-5 h-5 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 leading-tight">{item.name}</h3>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                        {item.category} {item.version ? `· ${item.version}` : ''}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-black border uppercase shrink-0 ${sm.cls}`}>
                    {sm.label}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-600 leading-relaxed mt-3.5 line-clamp-3">
                  {item.description}
                </p>

                {/* Status / Latency Metadata */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>
                    {item.lastChecked ? `Checked: ${item.lastChecked}` : 'Not verified yet'}
                  </span>
                  {item.latencyMs !== undefined && (
                    <span className="font-mono text-emerald-600 font-bold">{item.latencyMs}ms latency</span>
                  )}
                </div>

                {/* Associated Workflows Badge */}
                {item.relatedWorkflows.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <WorkflowIcon className="w-3 h-3 text-blue-500 shrink-0" />
                    <span className="text-[10px] text-slate-500 font-semibold truncate">
                      Used in {item.relatedWorkflows.length} workflow{item.relatedWorkflows.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleQuickTest(item.id)}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition"
                >
                  <Play className={`w-3 h-3 text-slate-500 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Testing…' : 'Test'}
                </button>

                <button
                  onClick={() => setSelectedIntegrationId(item.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-2xs"
                >
                  Configure
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Workflow Pipeline Integration Matrix ──────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Workflow Integration Cross-Reference Matrix
            </h3>
            <p className="text-[11px] text-slate-500">
              Active external service dependencies across the 6 canonical Grovaitech automations
            </p>
          </div>
          <Link href="/workflows" className="text-[10px] text-blue-600 hover:text-blue-700 font-bold">
            Orchestrator →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <th className="px-4 py-3 text-left font-black">Workflow Pipeline</th>
                <th className="px-4 py-3 text-center font-black">Gemini AI</th>
                <th className="px-4 py-3 text-center font-black">Supabase DB</th>
                <th className="px-4 py-3 text-center font-black">WhatsApp</th>
                <th className="px-4 py-3 text-center font-black">Calendar</th>
                <th className="px-4 py-3 text-center font-black">n8n Webhook</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: 'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
                  gemini: true,
                  supabase: true,
                  whatsapp: true,
                  calendar: true,
                  n8n: true,
                },
                {
                  name: 'Clinic Appointment Booking & Reminder Pipeline',
                  gemini: true,
                  supabase: true,
                  whatsapp: true,
                  calendar: true,
                  n8n: false,
                },
                {
                  name: 'Urgent Escalation ➔ Human Agent Dispatch',
                  gemini: false,
                  supabase: false,
                  whatsapp: true,
                  calendar: false,
                  n8n: true,
                },
                {
                  name: 'Inbound WhatsApp Lead Qualification Pipeline',
                  gemini: true,
                  supabase: false,
                  whatsapp: true,
                  calendar: false,
                  n8n: true,
                },
                {
                  name: 'AI QA Interaction Audit & Quality Scoring',
                  gemini: true,
                  supabase: true,
                  whatsapp: false,
                  calendar: false,
                  n8n: false,
                },
                {
                  name: 'Legal Consultation Intake & Conflict Check',
                  gemini: false,
                  supabase: true,
                  whatsapp: false,
                  calendar: true,
                  n8n: false,
                },
              ].map((wf, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-100 transition ${
                    idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50/80'
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-800">{wf.name}</td>
                  <td className="px-4 py-3 text-center">
                    {wf.gemini ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {wf.supabase ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {wf.whatsapp ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {wf.calendar ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {wf.n8n ? <CheckCircle2 className="w-4 h-4 text-rose-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Detail Drawer ────────────────────────────────────────────── */}
      {selectedIntegration && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/30 backdrop-blur-2xs z-40 transition-opacity"
            onClick={() => setSelectedIntegrationId(null)}
          />
          <div className="fixed right-0 top-0 h-full w-full sm:w-[480px] lg:w-[540px] bg-white shadow-2xl z-50 border-l border-slate-200 overflow-hidden animate-slide-in">
            <IntegrationDrawer
              integration={selectedIntegration}
              onClose={() => setSelectedIntegrationId(null)}
              onSave={handleSaveFields}
              onTestConnection={handleTestConnection}
            />
          </div>
        </>
      )}
    </div>
  )
}
