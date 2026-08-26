'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateLeadStatus } from '@/app/actions/leads'
import type { LeadData } from '@/app/actions/leads'
import {
  Search,
  SlidersHorizontal,
  Download,
  Plus,
  ChevronRight,
  X,
  Bot,
  PhoneCall,
  Mail,
  MapPin,
  Calendar,
  Tag,
  ExternalLink,
  User,
  MessageSquare,
  CheckCircle2,
  Clock,
  TrendingUp,
  Home,
  MoreHorizontal,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

// Extends LeadData with the db-generated fields (id, created_at, user_id)
export interface Lead extends LeadData {
  id: string
  created_at: string
  user_id?: string
  // Augmented UI-only field (not stored in DB)
  assigned_employee?: string
}

// ─── Demo data — exact same shape as real_estate_leads schema.
//     Replace with live Supabase data by passing it in as a prop from the
//     Server Component parent. All field names match LeadData exactly.
export const DEMO_LEADS: Lead[] = [
  {
    id: 'demo-lead-1',
    created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    name: 'Suresh Kumar',
    phone: '+91 94400 12345',
    email: 'suresh.k@gmail.com',
    property_type: 'villa',
    location: 'Tirupati, AP',
    budget: '₹1.2 Crore',
    timeline: '3 months',
    site_visit_requested: true,
    site_visit_date: '2026-08-30',
    site_visit_time: '11:00 AM',
    lead_score: 'hot',
    lead_status: 'qualified',
    notes: 'Very interested. Looking for a corner villa near Renigunta Road. Has pre-approval for loan.',
    source: 'whatsapp',
    assigned_employee: 'Real Estate Lead Receptionist',
  },
  {
    id: 'demo-lead-2',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    name: 'Ram Charan',
    phone: '+91 90000 88771',
    email: undefined,
    property_type: 'apartment',
    location: 'Nellore, AP',
    budget: '₹85 Lakhs',
    timeline: '6 months',
    site_visit_requested: true,
    site_visit_date: '2026-08-31',
    site_visit_time: '10:00 AM',
    lead_score: 'hot',
    lead_status: 'site_visit',
    notes: 'Referred by existing client. Looking for 2BHK flat. Site visit confirmed Saturday.',
    source: 'whatsapp',
    assigned_employee: 'Real Estate Lead Receptionist',
  },
  {
    id: 'demo-lead-3',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    name: 'Janaki Ram',
    phone: '+91 98800 55432',
    email: 'janaki.r@gmail.com',
    property_type: 'villa',
    location: 'Chennai, TN',
    budget: '₹2.1 Crore',
    timeline: '12 months',
    site_visit_requested: false,
    lead_score: 'warm',
    lead_status: 'contacted',
    notes: 'Early-stage enquiry. Wants luxury villa. Needs more info on amenities and legal status.',
    source: 'website',
    assigned_employee: 'Real Estate Lead Receptionist',
  },
  {
    id: 'demo-lead-4',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    name: 'Anil Reddy',
    phone: '+91 98765 43210',
    email: 'anil.r@outlook.com',
    property_type: 'house',
    location: 'Tirupati, AP',
    budget: '₹65 Lakhs',
    timeline: '2 months',
    site_visit_requested: false,
    lead_score: 'warm',
    lead_status: 'new',
    notes: 'Interested in BRTS Road area. Called via phone. Wants RERA documents.',
    source: 'ai_demo',
    assigned_employee: 'Real Estate Lead Receptionist',
  },
  {
    id: 'demo-lead-5',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    name: 'Lakshmi Devi',
    phone: '+91 99000 44321',
    email: 'lakshmi.d@gmail.com',
    property_type: 'plot',
    location: 'Tirupati, AP',
    budget: '₹40 Lakhs',
    timeline: '9 months',
    site_visit_requested: false,
    lead_score: 'cold',
    lead_status: 'lost',
    notes: 'Was interested in a plot but found another property elsewhere. Mark as lost.',
    source: 'website',
    assigned_employee: 'Real Estate Lead Receptionist',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_META: Record<string, { label: string; cls: string; dot: string }> = {
  hot:  { label: 'HOT',  cls: 'bg-red-50 text-red-600 border-red-100',       dot: 'bg-red-500' },
  warm: { label: 'WARM', cls: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-400' },
  cold: { label: 'COLD', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  new:        { label: 'New',         cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  contacted:  { label: 'Contacted',   cls: 'bg-purple-50 text-purple-700 border-purple-100' },
  qualified:  { label: 'Qualified',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  site_visit: { label: 'Site Visit',  cls: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
  negotiation:{ label: 'Negotiation', cls: 'bg-orange-50 text-orange-700 border-orange-100' },
  converted:  { label: 'Converted',   cls: 'bg-teal-50 text-teal-700 border-teal-100' },
  lost:       { label: 'Lost',        cls: 'bg-slate-100 text-slate-400 border-slate-200' },
}

const SOURCE_META: Record<string, { label: string; cls: string }> = {
  whatsapp: { label: 'WhatsApp', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  website:  { label: 'Website',  cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  manual:   { label: 'Manual',   cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  ai_demo:  { label: 'AI Demo',  cls: 'bg-amber-50 text-amber-700 border-amber-100' },
}

const PROPERTY_LABEL: Record<string, string> = {
  apartment: 'Apartment', villa: 'Villa', house: 'House',
  plot: 'Plot', commercial: 'Commercial', other: 'Other',
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

const STATUS_TABS = ['all', 'new', 'contacted', 'qualified', 'site_visit', 'converted', 'lost'] as const

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function LeadDrawer({ lead, onClose, onStatusChange }: {
  lead: Lead
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const [isPending, startTransition] = useTransition()
  const score = SCORE_META[lead.lead_score ?? 'warm']
  const status = STATUS_META[lead.lead_status ?? 'new']
  const source = SOURCE_META[lead.source ?? 'ai_demo']

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const result = await updateLeadStatus(lead.id, newStatus)
      if (result.success) {
        onStatusChange(lead.id, newStatus)
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Drawer header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Detail</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-xs">

        {/* Identity */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-black shrink-0">
            {initials(lead.name)}
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">{lead.name}</p>
            <span className={`inline-flex mt-0.5 text-[9px] px-2 py-0.5 rounded-full font-bold border ${score.cls}`}>
              {score.label}
            </span>
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-slate-600">
            <PhoneCall className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium">{lead.phone}</span>
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium truncate">{lead.email}</span>
            </div>
          )}
          {lead.location && (
            <div className="flex items-center gap-2 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium">{lead.location}</span>
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* Lead metadata */}
        <div className="space-y-2.5">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Information</h4>
          {[
            { label: 'Status',   value: <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${status.cls}`}>{status.label}</span> },
            { label: 'Source',   value: <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${source.cls}`}>{source.label}</span> },
            { label: 'Created',  value: <span className="text-slate-600 font-medium">{new Date(lead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
            { label: 'AI Employee', value: <span className="text-slate-700 font-semibold text-right">{lead.assigned_employee ?? '—'}</span> },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <span className="text-slate-500 shrink-0">{row.label}</span>
              {row.value}
            </div>
          ))}
        </div>

        <hr className="border-slate-100" />

        {/* Property / Requirement */}
        <div className="space-y-2.5">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Requirement</h4>
          {[
            { label: 'Type',     value: PROPERTY_LABEL[lead.property_type ?? 'other'] },
            { label: 'Location', value: lead.location },
            { label: 'Budget',   value: lead.budget },
            { label: 'Timeline', value: lead.timeline },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <span className="text-slate-500">{row.label}</span>
              <span className="text-slate-700 font-semibold">{row.value}</span>
            </div>
          ))}
          {lead.site_visit_requested && (
            <div className="mt-1 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 space-y-1">
              <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wider">Site Visit Requested</p>
              {lead.site_visit_date && (
                <p className="text-slate-700 font-semibold">{lead.site_visit_date} {lead.site_visit_time && `at ${lead.site_visit_time}`}</p>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {lead.notes && (
          <>
            <hr className="border-slate-100" />
            <div className="space-y-1.5">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI-Generated Notes</h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                {lead.notes}
              </p>
            </div>
          </>
        )}

        <hr className="border-slate-100" />

        {/* Update status */}
        <div className="space-y-2">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Update Status</h4>
          <select
            defaultValue={lead.lead_status ?? 'new'}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={isPending}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 disabled:opacity-60"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="site_visit">Site Visit</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
          {isPending && <p className="text-[9px] text-blue-500 font-semibold">Saving…</p>}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</h4>
          <Link
            href="/conversations"
            className="flex items-center justify-between w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition text-[11px]"
          >
            View Conversation <MessageSquare className="w-3.5 h-3.5" />
          </Link>
          <button className="flex items-center justify-between w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition text-[11px]">
            Schedule Site Visit <Calendar className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center justify-between w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 transition text-[11px]">
            Mark Qualified <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center justify-between w-full px-3 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition text-[11px]">
            Assign Employee <Bot className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

interface LeadsWorkspaceProps {
  /** Pass result of getLeads() from the server parent. Falls back to DEMO_LEADS if empty. */
  serverLeads: Lead[]
}

export function LeadsWorkspace({ serverLeads }: LeadsWorkspaceProps) {
  const initialLeads: Lead[] = serverLeads.length > 0 ? serverLeads : DEMO_LEADS
  const isDemo = serverLeads.length === 0

  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mobileDrawer, setMobileDrawer] = useState(false)

  const selectedLead = leads.find(l => l.id === selectedId) ?? null

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      l.name.toLowerCase().includes(q) ||
      l.phone.includes(q) ||
      (l.email ?? '').toLowerCase().includes(q) ||
      (l.location ?? '').toLowerCase().includes(q)
    const matchTab = activeTab === 'all' || l.lead_status === activeTab
    const matchSource = sourceFilter === 'all' || l.source === sourceFilter
    return matchSearch && matchTab && matchSource
  })

  const kpis = [
    { label: 'Total',            value: leads.length,                                               cls: 'text-slate-800' },
    { label: 'New',              value: leads.filter(l => l.lead_status === 'new').length,          cls: 'text-blue-600' },
    { label: 'Qualified',        value: leads.filter(l => l.lead_status === 'qualified').length,    cls: 'text-emerald-600' },
    { label: 'Site Visit',       value: leads.filter(l => l.lead_status === 'site_visit').length,   cls: 'text-indigo-600' },
    { label: 'Converted',        value: leads.filter(l => l.lead_status === 'converted').length,    cls: 'text-teal-600' },
  ]

  const handleStatusChange = (id: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, lead_status: newStatus as Lead['lead_status'] } : l))
  }

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setMobileDrawer(true)
  }

  const handleClose = () => {
    setSelectedId(null)
    setMobileDrawer(false)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] -m-6 bg-slate-50 overflow-hidden">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-6 pb-4 bg-white border-b border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Workforce OS</span>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Leads</h1>
              {isDemo && (
                <span className="text-[8px] px-2 py-0.5 rounded-full font-black border bg-amber-50 text-amber-600 border-amber-200 uppercase tracking-wide">
                  Demo Data
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage, qualify, and convert leads captured by your AI Employees.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search leads…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400 focus:bg-white transition w-44"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">Website</option>
              <option value="ai_demo">AI Demo</option>
              <option value="manual">Manual</option>
            </select>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition" title="Export — coming soon">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition">
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-100 overflow-x-auto">
          {kpis.map(k => (
            <div key={k.label} className="flex items-baseline gap-1.5 shrink-0">
              <span className={`text-xl font-black ${k.cls}`}>{k.value}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</span>
            </div>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 mt-3 overflow-x-auto">
          {STATUS_TABS.map(tab => {
            const count = tab === 'all' ? leads.length : leads.filter(l => l.lead_status === tab).length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {STATUS_META[tab]?.label ?? 'All'}
                <span className={`ml-1.5 px-1 py-0.5 rounded text-[8px] font-black ${
                  activeTab === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                }`}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Body: table + drawer ──────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Table area */}
        <div className={`flex-1 overflow-auto ${selectedLead ? 'hidden lg:block' : 'block'}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs gap-2">
              <User className="w-8 h-8 opacity-40" />
              No leads match your filter.
            </div>
          ) : (
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-white border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {['Lead', 'Source', 'AI Employee', 'Requirement', 'Budget', 'Score', 'Status', 'Activity', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-black whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => {
                  const score  = SCORE_META[lead.lead_score ?? 'warm']
                  const status = STATUS_META[lead.lead_status ?? 'new']
                  const source = SOURCE_META[lead.source ?? 'ai_demo']
                  const isSelected = selectedId === lead.id
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => handleSelect(lead.id)}
                      className={`cursor-pointer border-b border-slate-100 transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-l-2 border-l-blue-600'
                          : i % 2 === 0
                            ? 'bg-white hover:bg-slate-50'
                            : 'bg-slate-50/40 hover:bg-slate-50'
                      }`}
                    >
                      {/* Lead */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black shrink-0">
                            {initials(lead.name)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{lead.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{lead.phone}</p>
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${source.cls}`}>
                          {source.label}
                        </span>
                      </td>

                      {/* AI Employee */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                          <Bot className="w-3 h-3 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[120px]">{lead.assigned_employee ?? '—'}</span>
                        </div>
                      </td>

                      {/* Requirement */}
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-700">{PROPERTY_LABEL[lead.property_type ?? 'other']}</p>
                        <p className="text-[10px] text-slate-400">{lead.location}</p>
                      </td>

                      {/* Budget */}
                      <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">
                        {lead.budget}
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3.5">
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black w-fit ${score.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${score.dot}`} />
                          {score.label}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>

                      {/* Activity */}
                      <td className="px-4 py-3.5 text-slate-400 font-medium whitespace-nowrap">
                        {relativeTime(lead.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5">
                        <button
                          onClick={e => { e.stopPropagation(); handleSelect(lead.id) }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail drawer — shown on right for lg+, full screen on mobile */}
        {selectedLead && (
          <>
            {/* Mobile overlay */}
            <div
              className={`fixed inset-0 bg-black/30 z-30 lg:hidden ${mobileDrawer ? 'block' : 'hidden'}`}
              onClick={handleClose}
            />
            {/* Drawer panel */}
            <div className={`
              fixed right-0 top-0 h-full w-80 bg-white shadow-xl z-40 border-l border-slate-200 overflow-hidden
              lg:relative lg:w-80 lg:shrink-0 lg:shadow-none lg:z-auto lg:border-l lg:border-slate-200
              ${mobileDrawer ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
              transition-transform
            `}>
              <LeadDrawer
                lead={selectedLead}
                onClose={handleClose}
                onStatusChange={handleStatusChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
