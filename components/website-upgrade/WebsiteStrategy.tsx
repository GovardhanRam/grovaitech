'use client'

/**
 * Grovaitech AI Platform
 * components/website-upgrade/WebsiteStrategy.tsx
 *
 * Full Conversion Blueprint & Canonical AI Workforce Opportunities.
 */

import React from 'react'
import type { WebsiteStrategy as WebsiteStrategyType } from '@/lib/website-upgrade/types'
import {
  Sparkles,
  Target,
  Compass,
  CheckCircle2,
  Bot,
  Workflow,
  ArrowRight,
  ShieldCheck,
  Map,
  Layers,
  PhoneCall,
  MessageSquare,
} from 'lucide-react'

interface WebsiteStrategyProps {
  strategy: WebsiteStrategyType
}

export default function WebsiteStrategy({ strategy }: WebsiteStrategyProps) {
  return (
    <div className="space-y-8">
      {/* Target Audience & Intent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Target className="w-5 h-5" />
            <h4 className="font-bold text-slate-900">Primary Audience</h4>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{strategy.primary_audience}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <Compass className="w-5 h-5" />
            <h4 className="font-bold text-slate-900">Customer Intent & Objective</h4>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{strategy.customer_intent}</p>
        </div>
      </div>

      {/* Value Proposition & CTA Strategy */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Value Proposition & Call-To-Action Architecture
        </h3>

        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6 space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Hero Headline & Subheadline
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">{strategy.value_proposition.headline}</h2>
          <p className="text-slate-600 text-sm max-w-3xl leading-relaxed">
            {strategy.value_proposition.subheadline}
          </p>

          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {strategy.value_proposition.supporting_points.map((pt, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Pairing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-sm mb-1">
              <PhoneCall className="w-4 h-4" />
              Primary CTA
            </div>
            <p className="text-base font-extrabold text-blue-700">{strategy.primary_cta.label}</p>
            <p className="text-xs text-blue-800/80 mt-1">Placement: {strategy.primary_cta.placement}</p>
          </div>

          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-1">
              <MessageSquare className="w-4 h-4" />
              Secondary Low-Friction CTA
            </div>
            <p className="text-base font-extrabold text-emerald-700">{strategy.secondary_cta.label}</p>
            <p className="text-xs text-emerald-800/80 mt-1">Placement: {strategy.secondary_cta.placement}</p>
          </div>
        </div>
      </div>

      {/* Canonical AI Employee Opportunities */}
      <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600" />
              Matched Canonical AI Workforce Opportunities
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Directly mapped to the canonical Grovaitech workforce registry without creating duplicate concepts.
            </p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200">
            {strategy.ai_employee_opportunities.length} Canonical Agents Matched
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {strategy.ai_employee_opportunities.map((opp) => (
            <div
              key={opp.employee_id}
              className="p-5 rounded-xl border border-indigo-100 bg-linear-to-b from-indigo-50/40 to-white shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-medium text-indigo-600 bg-indigo-100/60 px-2 py-0.5 rounded">
                    {opp.employee_id}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{opp.department}</span>
                </div>
                <h4 className="font-bold text-base text-slate-900 mb-1">{opp.employee_name}</h4>
                <p className="text-xs text-indigo-700 font-semibold mb-3">{opp.role}</p>

                <div className="bg-white p-3 rounded-lg border border-slate-200/80 space-y-2 mb-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                      Matched Need
                    </span>
                    <p className="text-slate-800">{opp.matched_need}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-400 block uppercase text-[10px]">
                      Integration Touchpoint
                    </span>
                    <p className="text-slate-700">{opp.integration_point}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1 font-medium">
                  <Workflow className="w-3.5 h-3.5 text-indigo-500" />
                  {opp.workflow_name}
                </span>
                <span className="font-mono text-[10px] text-slate-400">{opp.workflow_id}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Strategy & Sitemap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trust Strategy */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Trust & Proof Strategy
          </h4>

          <div className="space-y-4 text-xs">
            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Recommended Proof Types
              </span>
              <ul className="space-y-1 text-slate-700">
                {strategy.trust_strategy.recommended_proof_types.map((rp, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{rp}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Verified Customer Proof
              </span>
              {strategy.trust_strategy.verified_proof_items.length > 0 ? (
                <ul className="space-y-1 text-emerald-800">
                  {strategy.trust_strategy.verified_proof_items.map((vp, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{vp}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic">No verified proof files supplied during intake.</p>
              )}
            </div>

            <div>
              <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Evidence Gaps Requiring Client Sign-off
              </span>
              <ul className="space-y-1 text-amber-800">
                {strategy.trust_strategy.missing_proof_items.map((mp, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold shrink-0">•</span>
                    <span>{mp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Proposed Sitemap */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Map className="w-5 h-5 text-blue-600" />
            Recommended Information Architecture (Sitemap)
          </h4>

          <div className="space-y-2.5">
            {strategy.sitemap.map((page, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600">{page.path}</span>
                    <span className="font-semibold text-slate-900">{page.title}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5">{page.purpose}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                    page.priority === 'high' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {page.priority}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
