'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateLeadStatus } from '@/app/actions/leads'
import type { LeadData } from '@/app/actions/leads'
import {
  runGbpAudit,
  recordProspectOutreach,
  type OutreachChannel,
  type OutreachOutcome,
} from '@/app/actions/gbp-sales'
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
  AlertCircle,
  Building2,
  Sparkles,
  Loader2,
  RefreshCw,
  Send,
  AlertTriangle,
} from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pill } from '@/components/ui/Pill'

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

const OUTCOME_META: Record<OutreachOutcome, { label: string; cls: string }> = {
  sent:           { label: 'Sent',          cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  replied:        { label: 'Replied',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  no_response:    { label: 'No response',   cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  interested:     { label: 'Interested',    cls: 'bg-teal-50 text-teal-700 border-teal-100' },
  not_interested: { label: 'Not interested',cls: 'bg-red-50 text-red-600 border-red-100' },
}

export function formatOutreachTime(iso?: string) {
  if (!iso) return 'Recently'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export interface ParsedLeadNotes {
  company_name?: string
  industry?: string
  gbp_audit?: {
    score?: number
    audit_score?: number
    missing_fields?: string[]
    recommendations?: string[]
    revenue_leak?: {
      title?: string
      problem?: string
      likely_impact?: string
      opportunity?: string
    }
    timestamp?: string
    audit_timestamp?: string
    business_name?: string
    business_info?: {
      business_name?: string
      category?: string | null
      address_nap?: string | null
      phone?: string | null
      website?: string | null
      hours?: string | null
      rating_info?: string | null
      services_products?: string | null
    }
    details?: Record<string, any>
  }
  outreach_history?: Array<{
    channel: OutreachChannel
    outcome?: OutreachOutcome
    notes?: string | null
    timestamp: string
  }>
  raw_notes?: string
  [key: string]: any
}

export function parseLeadNotes(notes?: string): { meta: ParsedLeadNotes | null; rawText: string | null } {
  if (!notes) return { meta: null, rawText: null }
  try {
    if (notes.startsWith('{')) {
      const parsed = JSON.parse(notes)
      return { meta: parsed, rawText: parsed.raw_notes || null }
    }
  } catch {
    // Malformed JSON fallback
  }
  return { meta: null, rawText: notes }
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function LeadDrawer({
  lead,
  onClose,
  onStatusChange,
  onLeadUpdate,
}: {
  lead: Lead
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
  onLeadUpdate?: (lead: Lead) => void
}) {
  const [isPending, startTransition] = useTransition()
  const score = SCORE_META[lead.lead_score ?? 'warm']
  const status = STATUS_META[lead.lead_status ?? 'new']
  const source = SOURCE_META[lead.source ?? 'ai_demo']

  const { meta, rawText } = parseLeadNotes(lead.notes)

  // GBP Audit State
  const [isRunningAudit, setIsRunningAudit] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  // Outreach Form State
  const [outreachChannel, setOutreachChannel] = useState<OutreachChannel>('whatsapp')
  const [outreachOutcome, setOutreachOutcome] = useState<OutreachOutcome>('sent')
  const [outreachNotes, setOutreachNotes] = useState('')
  const [isRecordingOutreach, setIsRecordingOutreach] = useState(false)
  const [outreachNotice, setOutreachNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const result = await updateLeadStatus(lead.id, newStatus)
      if (result.success) {
        onStatusChange(lead.id, newStatus)
        if (onLeadUpdate) {
          onLeadUpdate({ ...lead, lead_status: newStatus as Lead['lead_status'] })
        }
      }
    })
  }

  const handleRunAudit = async () => {
    setIsRunningAudit(true)
    setAuditError(null)
    try {
      const res = await runGbpAudit({
        prospectId: lead.id,
        business_name: meta?.company_name || lead.name,
        phone: lead.phone && lead.phone !== 'Unspecified' ? lead.phone : undefined,
        location: lead.location && lead.location !== 'Unspecified' ? lead.location : undefined,
        category: meta?.industry,
        client_id: lead.client_id,
        user_id: lead.user_id,
      })

      if (!res.success || !res.audit) {
        setAuditError(res.error || 'Failed to complete GBP audit.')
      } else {
        const currentMeta = meta || {}
        const updatedMeta = {
          ...currentMeta,
          company_name: meta?.company_name || lead.name,
          gbp_audit: res.audit,
          prospect_status: 'analyzed',
          updated_at: res.audit.timestamp,
        }
        const updatedLead: Lead = {
          ...lead,
          lead_status: 'analyzed',
          lead_score: res.audit.score < 60 ? 'hot' : 'warm',
          notes: JSON.stringify(updatedMeta),
        }
        onLeadUpdate?.(updatedLead)
        onStatusChange(lead.id, 'analyzed')
      }
    } catch (err: any) {
      setAuditError(err?.message || 'An error occurred while running GBP audit.')
    } finally {
      setIsRunningAudit(false)
    }
  }

  const handleRecordOutreach = async () => {
    setIsRecordingOutreach(true)
    setOutreachNotice(null)
    try {
      const res = await recordProspectOutreach(lead.id, {
        channel: outreachChannel,
        outcome: outreachOutcome,
        notes: outreachNotes.trim() || undefined,
      })

      if (!res.success || !res.outreach) {
        setOutreachNotice({ type: 'error', message: res.error || 'Failed to record outreach.' })
      } else {
        const newStatus = (res.status || lead.lead_status) as Lead['lead_status']
        const currentHistory = Array.isArray(meta?.outreach_history) ? meta!.outreach_history : []
        const updatedHistory = [...currentHistory, res.outreach]
        const updatedMeta = {
          ...(meta || {}),
          outreach_history: updatedHistory,
          last_outreach: res.outreach,
          prospect_status: newStatus,
          updated_at: res.outreach.timestamp,
        }
        const updatedLead: Lead = {
          ...lead,
          lead_status: newStatus,
          notes: JSON.stringify(updatedMeta),
        }
        onLeadUpdate?.(updatedLead)
        if (res.status) {
          onStatusChange(lead.id, res.status)
        }
        setOutreachNotes('')
        setOutreachNotice({ type: 'success', message: 'Outreach recorded successfully.' })
      }
    } catch (err: any) {
      setOutreachNotice({ type: 'error', message: err?.message || 'Error recording outreach.' })
    } finally {
      setIsRecordingOutreach(false)
    }
  }

  const gbpAudit = meta?.gbp_audit
  const auditScore = gbpAudit?.score ?? gbpAudit?.audit_score
  const bizInfo = gbpAudit?.business_info || {}
  const history = Array.isArray(meta?.outreach_history)
    ? [...meta.outreach_history].reverse()
    : []

  return (
    <div className="flex flex-col h-full">
      {/* Drawer header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Detail</h3>
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close lead detail"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28 lg:pb-6 space-y-5 text-xs">

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

        {/* SECTION 4: Status (Authoritative) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Status</h4>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${status.cls}`}>{status.label}</span>
          </div>
          <select
            value={lead.lead_status ?? 'new'}
            onChange={e => handleStatusChange(e.target.value)}
            disabled={isPending}
            className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 disabled:opacity-60"
          >
            <option value="new">New</option>
            <option value="analyzed">Analyzed (Audit Done)</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="site_visit">Site Visit</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
          {isPending && <p className="text-[9px] text-blue-500 font-semibold">Saving…</p>}
        </div>

        <hr className="border-slate-100" />

        {/* SECTION 1: GBP AUDIT */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Google Business Profile Audit</h4>
            {gbpAudit && (
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Active Audit
              </span>
            )}
          </div>

          {gbpAudit && typeof auditScore === 'number' ? (
            <div className="space-y-2.5">
              {/* Score Card */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200">
                <div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profile Completeness</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-2xl font-black ${auditScore >= 70 ? 'text-emerald-600' : auditScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {auditScore}
                    </span>
                    <span className="text-slate-400 font-bold text-xs">/100</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${auditScore >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : auditScore >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {auditScore >= 70 ? 'Good Visibility' : auditScore >= 50 ? 'Needs Fixes' : 'High Drop-Off'}
                </span>
              </div>

              {/* Business Info */}
              {(bizInfo.business_name || meta?.company_name || bizInfo.category || bizInfo.address_nap) && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>{bizInfo.business_name || meta?.company_name || lead.name}</span>
                  </div>
                  {bizInfo.category && <p className="text-slate-500 text-[10px]">Category: {bizInfo.category}</p>}
                  {bizInfo.address_nap && <p className="text-slate-500 text-[10px]">NAP: {bizInfo.address_nap}</p>}
                  {bizInfo.hours && <p className="text-slate-500 text-[10px]">Hours: {bizInfo.hours}</p>}
                  {bizInfo.rating_info && <p className="text-slate-500 text-[10px]">Rating: {bizInfo.rating_info}</p>}
                </div>
              )}

              {/* Revenue Leak / Problem & Opportunity */}
              {gbpAudit.revenue_leak && (
                <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{gbpAudit.revenue_leak.title || 'Revenue Leak Detected'}</span>
                  </div>
                  {gbpAudit.revenue_leak.problem && (
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      <strong className="text-slate-700">Problem:</strong> {gbpAudit.revenue_leak.problem}
                    </p>
                  )}
                  {gbpAudit.revenue_leak.likely_impact && (
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      <strong className="text-slate-700">Impact:</strong> {gbpAudit.revenue_leak.likely_impact}
                    </p>
                  )}
                  {gbpAudit.revenue_leak.opportunity && (
                    <p className="text-emerald-700 text-[11px] leading-relaxed">
                      <strong className="text-emerald-800">Opportunity:</strong> {gbpAudit.revenue_leak.opportunity}
                    </p>
                  )}
                </div>
              )}

              {/* Missing Fields */}
              {gbpAudit.missing_fields && gbpAudit.missing_fields.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Missing Profile Sections</span>
                  <div className="flex flex-wrap gap-1">
                    {gbpAudit.missing_fields.map((mf, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] font-medium">
                        {mf}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {gbpAudit.recommendations && gbpAudit.recommendations.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Top Recommendations</span>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    {gbpAudit.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timestamp & Re-run */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[9px] text-slate-400">
                  Audited: {formatOutreachTime(gbpAudit.timestamp || gbpAudit.audit_timestamp)}
                </span>
                <button
                  type="button"
                  onClick={handleRunAudit}
                  disabled={isRunningAudit}
                  className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRunningAudit ? 'animate-spin' : ''}`} />
                  Re-run Audit
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-center">
              <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
              <p className="font-bold text-slate-700 text-xs">GBP audit not completed</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Run an automated Google Business Profile audit to identify profile gaps and revenue leaks for this lead.
              </p>
              <button
                type="button"
                onClick={handleRunAudit}
                disabled={isRunningAudit}
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition text-xs disabled:opacity-60"
              >
                {isRunningAudit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Running Audit…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Run GBP Audit
                  </>
                )}
              </button>
              {auditError && <p className="text-[10px] text-red-500 font-medium">{auditError}</p>}
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* SECTION 2: OUTREACH FORM */}
        <div className="space-y-2.5">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Record Outreach</h4>

          {/* Channel Selector */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Channel</label>
            <div className="grid grid-cols-3 gap-1">
              {(['whatsapp', 'email', 'call'] as const).map(ch => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setOutreachChannel(ch)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition capitalize ${
                    outreachChannel === ch
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome Selector */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Outcome</label>
            <select
              value={outreachOutcome}
              onChange={e => setOutreachOutcome(e.target.value as OutreachOutcome)}
              className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-blue-400"
            >
              <option value="sent">Sent</option>
              <option value="replied">Replied</option>
              <option value="no_response">No response</option>
              <option value="interested">Interested</option>
              <option value="not_interested">Not interested</option>
            </select>
          </div>

          {/* Notes Input */}
          <div>
            <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Notes (Optional)</label>
            <textarea
              rows={2}
              placeholder="e.g. Sent free GBP audit on WhatsApp, prospect requested review call..."
              value={outreachNotes}
              onChange={e => setOutreachNotes(e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:border-blue-400 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleRecordOutreach}
            disabled={isRecordingOutreach}
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition text-xs disabled:opacity-60"
          >
            {isRecordingOutreach ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Recording…
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Record Outreach
              </>
            )}
          </button>
          {outreachNotice && (
            <p className={`text-[10px] font-semibold ${outreachNotice.type === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>
              {outreachNotice.message}
            </p>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* SECTION 3: OUTREACH HISTORY */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Outreach History</h4>
            {history.length > 0 && (
              <span className="text-[9px] font-bold text-slate-400">
                {history.length} {history.length === 1 ? 'touch' : 'touches'}
              </span>
            )}
          </div>

          {history.length === 0 ? (
            <p className="text-slate-400 italic text-center py-2 text-xs bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              No outreach recorded yet.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {history.map((entry, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 capitalize text-[10px] flex items-center gap-1">
                      {entry.channel === 'whatsapp' ? 'WhatsApp' : entry.channel === 'email' ? 'Email' : 'Phone Call'}
                    </span>
                    {entry.outcome && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${OUTCOME_META[entry.outcome]?.cls || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {OUTCOME_META[entry.outcome]?.label || entry.outcome}
                      </span>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-slate-600 text-[11px] leading-snug">
                      {entry.notes}
                    </p>
                  )}
                  <p className="text-[9px] text-slate-400">
                    {formatOutreachTime(entry.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <hr className="border-slate-100" />

        {/* SECTION 5: COMMERCIAL NEXT STEP */}
        <div className="space-y-1.5 pt-1">
          <button
            disabled
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold rounded-xl cursor-not-allowed text-[11px]"
            title="Commercial Next Step: Issue paid fix offer to customer after audit review"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Prepare Paid GBP Fix Offer
          </button>
          <p className="text-[9px] text-slate-400 text-center">
            Commercial Next Step: Generates proposal & invoice upon customer review.
          </p>
        </div>

        <hr className="border-slate-100" />

        {/* Lead metadata */}
        <div className="space-y-2.5">
          <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lead Information</h4>
          {[
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

        {/* Property / Requirement (if present) */}
        {(lead.property_type || (lead.budget && lead.budget !== 'GBP Growth & Reputation Package') || (lead.timeline && lead.timeline !== 'Immediate')) && (
          <>
            <hr className="border-slate-100" />
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
          </>
        )}

        {/* Raw Plain-Text Notes (Never exposes raw JSON) */}
        {rawText && (
          <>
            <hr className="border-slate-100" />
            <div className="space-y-1.5">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</h4>
              <p className="text-slate-600 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                {rawText}
              </p>
            </div>
          </>
        )}

        <hr className="border-slate-100" />

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

  const handleLeadUpdate = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l))
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
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-[calc(100vh-0px)] -m-4 sm:-m-6 lg:-m-8 bg-slate-50 overflow-hidden">

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
            <div className="w-full sm:w-64">
              <SearchInput
                placeholder="Search leads…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClear={() => setSearch('')}
              />
            </div>
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 min-h-[44px] focus:outline-none cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="website">Website</option>
              <option value="ai_demo">AI Demo</option>
              <option value="manual">Manual</option>
            </select>
            <button className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5" /> <span>Filter</span>
            </button>
            <button className="flex items-center justify-center gap-1.5 px-3 min-h-[44px] bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer" title="Export — coming soon">
              <Download className="w-3.5 h-3.5" /> <span>Export</span>
            </button>
            <button className="flex items-center justify-center gap-1.5 px-4 min-h-[44px] bg-[#0066FF] hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> <span>Add Lead</span>
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
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
          {STATUS_TABS.map(tab => {
            const count = tab === 'all' ? leads.length : leads.filter(l => l.lead_status === tab).length
            const isSelected = activeTab === tab
            return (
              <Pill
                key={tab}
                label={`${STATUS_META[tab]?.label ?? 'All'} (${count})`}
                selected={isSelected}
                onClick={() => setActiveTab(tab)}
                variant={isSelected ? 'primary' : 'subtle'}
                size="sm"
              />
            )
          })}
        </div>
      </div>

      {/* ── Body: table + drawer ──────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Table / Cards area */}
        <div className={`flex-1 overflow-auto ${selectedLead ? 'hidden lg:block' : 'block'}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs gap-2">
              <User className="w-8 h-8 opacity-40" />
              No leads match your filter.
            </div>
          ) : (
            <>
              {/* ── Mobile Stacked Cards (< lg) ───────────────────────── */}
              <div className="block lg:hidden p-3 sm:p-4 space-y-3 pb-28">
                {filtered.map((lead) => {
                  const score  = SCORE_META[lead.lead_score ?? 'warm']
                  const status = STATUS_META[lead.lead_status ?? 'new']
                  const source = SOURCE_META[lead.source ?? 'ai_demo']
                  const isSelected = selectedId === lead.id
                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleSelect(lead.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs active:scale-[0.99] ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Top row: Avatar, Name, Phone & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                            {initials(lead.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-900 truncate">{lead.name}</p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">{lead.phone || 'No phone'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Middle row: Badges (Source, Score, AI Employee) */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100 text-[10px]">
                        <span className={`px-2 py-0.5 rounded border font-bold ${source.cls}`}>
                          {source.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-black ${score.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${score.dot}`} />
                          {score.label}
                        </span>
                        {lead.assigned_employee && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-semibold truncate max-w-[180px]">
                            <Bot className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate">{lead.assigned_employee}</span>
                          </span>
                        )}
                      </div>

                      {/* Requirement & Budget */}
                      {(lead.property_type || lead.budget || lead.location) && (
                        <div className="flex items-center justify-between text-xs mt-2.5 pt-2 border-t border-slate-100 text-slate-600">
                          <span className="font-semibold text-slate-800 truncate mr-2">
                            {PROPERTY_LABEL[lead.property_type ?? 'other']} {lead.location ? `• ${lead.location}` : ''}
                          </span>
                          {lead.budget && (
                            <span className="font-bold text-slate-900 shrink-0">
                              {lead.budget}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer row: relative time and View Details tap target */}
                      <div className="flex items-center justify-between mt-3 pt-2 text-[11px] text-slate-400">
                        <span>{relativeTime(lead.created_at)}</span>
                        <span className="inline-flex items-center gap-1 font-bold text-blue-600">
                          <span>Inspect Lead</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Desktop Table View (>= lg) ─────────────────────────── */}
              <table className="hidden lg:table w-full text-xs border-separate border-spacing-0">
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
            </>
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
              fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-xl z-40 border-l border-slate-200 overflow-hidden
              lg:relative lg:w-96 lg:shrink-0 lg:shadow-none lg:z-auto lg:border-l lg:border-slate-200
              ${mobileDrawer ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
              transition-transform
            `}>
              <LeadDrawer
                lead={selectedLead}
                onClose={handleClose}
                onStatusChange={handleStatusChange}
                onLeadUpdate={handleLeadUpdate}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
