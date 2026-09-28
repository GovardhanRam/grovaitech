'use client'

/**
 * Grovaitech AI Platform
 * components/website-upgrade/WebsiteAudit.tsx
 *
 * Audit Findings & 8-Stage Revenue Leak Funnel Visualization.
 * Strict rules: P0 only for broken/inaccessible/unsafe; non-fabricated revenue language.
 */

import React, { useState } from 'react'
import type { WebsiteAuditFinding, WebsiteRevenueLeak } from '@/lib/website-upgrade/types'
import {
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface WebsiteAuditProps {
  findings: WebsiteAuditFinding[]
  revenueLeaks: WebsiteRevenueLeak[]
}

export default function WebsiteAudit({ findings, revenueLeaks }: WebsiteAuditProps) {
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL')
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null)

  const filteredFindings = findings.filter((f) => {
    if (selectedPriority === 'ALL') return true
    return f.priority === selectedPriority
  })

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'P0':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-100 text-red-800 border border-red-200">P0 - Blocking/Unsafe</span>
      case 'P1':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">P1 - High Impact</span>
      case 'P2':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800 border border-blue-200">P2 - Improvement</span>
      case 'P3':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">P3 - Low Impact</span>
      default:
        return null
    }
  }

  const getEvidenceStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED_FACT':
        return <span className="px-2 py-0.5 text-xs rounded bg-emerald-100 text-emerald-800 font-medium">Verified Fact</span>
      case 'OBSERVATION':
        return <span className="px-2 py-0.5 text-xs rounded bg-sky-100 text-sky-800 font-medium">Observation</span>
      case 'INFERENCE':
        return <span className="px-2 py-0.5 text-xs rounded bg-indigo-100 text-indigo-800 font-medium">Inference</span>
      case 'UNKNOWN':
        return <span className="px-2 py-0.5 text-xs rounded bg-rose-100 text-rose-800 font-medium">Unknown / Gated</span>
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700">{status}</span>
    }
  }

  return (
    <div className="space-y-10">
      {/* 8-Stage Revenue Leak Funnel */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-amber-500" />
              Website Journey Revenue Leak Model
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              8-stage friction and drop-off analysis. Strict non-fabrication standard: no invented revenue losses.
            </p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-semibold rounded-full border border-amber-200">
            {revenueLeaks.length} Friction Points Identified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {revenueLeaks.map((leak, idx) => (
            <div
              key={leak.id}
              className="p-4 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300 transition-all shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Stage {idx + 1}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    leak.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {leak.severity}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1.5 line-clamp-1">{leak.title}</h4>
                <p className="text-xs text-slate-600 mb-2 leading-relaxed">{leak.friction_point}</p>
                <div className="bg-white p-2 rounded border border-slate-200/80 mb-2">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Operational Impact</span>
                  <p className="text-xs text-slate-700 italic">{leak.impact_language}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-xs text-blue-700 font-medium">
                Fix: {leak.recommended_fix}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 15-Category Structured Audit */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              15-Category Structured Audit Findings
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Architecture, accessibility targets, UX conversion barriers, and AI Employee integration opportunities.
            </p>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Priority:</span>
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
              {['ALL', 'P0', 'P1', 'P2', 'P3'].map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPriority(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedPriority === p
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredFindings.map((finding) => {
            const isExpanded = expandedFindingId === finding.id
            return (
              <div
                key={finding.id}
                className="border border-slate-200 rounded-lg overflow-hidden transition-all hover:border-slate-300"
              >
                <div
                  onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                  className="p-4 bg-slate-50/60 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {getPriorityBadge(finding.priority)}
                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                      {finding.category}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-900">{finding.title}</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    {getEvidenceStatusBadge(finding.evidence_status)}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-3 text-sm">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Observation
                      </span>
                      <p className="text-slate-800">{finding.observation}</p>
                    </div>

                    {finding.evidence && finding.evidence.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Evidence Grounding
                        </span>
                        <ul className="list-disc pl-5 space-y-0.5 text-xs text-slate-600">
                          {finding.evidence.map((ev, i) => (
                            <li key={i}>{ev}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="bg-blue-50/60 p-3 rounded border border-blue-100">
                      <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider block mb-0.5">
                        Recommendation
                      </span>
                      <p className="text-xs text-blue-800">{finding.recommendation}</p>
                    </div>

                    {finding.uncertainty && (
                      <div className="bg-amber-50 p-2.5 rounded border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <span>{finding.uncertainty}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
