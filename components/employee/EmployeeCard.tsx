'use client'

import Link from 'next/link'
import { Bot, ArrowRight, Settings, Rocket, CheckCircle2, AlertCircle } from 'lucide-react'

export interface EmployeeCardProps {
  id?: string
  name: string
  displayName?: string
  slug: string
  title: string
  department?: string | null
  category?: string
  description?: string | null
  shortDescription?: string
  status: 'live' | 'beta' | 'demo' | 'in_development' | 'planned'
  capabilities: string[]
  requiredIntegrations?: string[]
  keywords?: string[]
  configurationSchema?: Record<string, any>
  hasRecipe?: boolean
}

const statusMeta = {
  live: { label: 'Ready to Deploy', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  beta: { label: 'Beta', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  demo: { label: 'Live Demo', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  in_development: { label: 'In Development', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  planned: { label: 'Under Development', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
}

export default function EmployeeCard({
  name,
  displayName,
  slug,
  title,
  department,
  category,
  description,
  shortDescription,
  status,
  capabilities,
  requiredIntegrations = [],
  configurationSchema,
  hasRecipe = false,
}: EmployeeCardProps) {
  const meta = statusMeta[status] || statusMeta.live
  const effectiveDisplayName = displayName || name
  const effectiveDescription = shortDescription || description || ''
  const effectiveCategory = category || department || 'Operations'
  const isDeployable = status === 'live'
  const isConfigurable = hasRecipe || !!configurationSchema || slug === 'social-media-marketing'

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div className="p-6">
        {/* Header row: avatar + category + status badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                {effectiveCategory}
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {effectiveDisplayName}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{title}</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${meta.cls}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        {/* Short description */}
        <p className="mt-3.5 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {effectiveDescription}
        </p>

        {/* Capabilities */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {capabilities.slice(0, 3).map((cap, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-md border border-slate-200/80"
            >
              {cap}
            </span>
          ))}

          {capabilities.length > 3 && (
            <span className="px-1.5 py-0.5 text-slate-400 text-[10px] font-medium self-center">
              +{capabilities.length - 3} more
            </span>
          )}
        </div>

        {/* Required Integrations */}
        {requiredIntegrations.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Required Integrations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {requiredIntegrations.slice(0, 2).map((integ, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] font-semibold rounded border border-slate-200"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
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
      </div>

      {/* Action Footer: View Employee, Configure, Deploy */}
      <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* View Employee action */}
        <Link
          href={`/ai-employees/${slug}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-blue-600 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition"
        >
          <span>View Employee</span>
          <ArrowRight className="w-3 h-3" />
        </Link>

        <div className="flex items-center gap-1.5">
          {/* Configure action */}
          {isConfigurable ? (
            <Link
              href={`/ai-employees/${slug}#configure`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50/60 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition"
            >
              <Settings className="w-3 h-3" />
              <span>Configure</span>
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 cursor-not-allowed"
              title="Standard configuration applied"
            >
              <Settings className="w-3 h-3 opacity-40" />
              <span>Configure</span>
            </span>
          )}

          {/* Deploy action */}
          {isDeployable ? (
            <Link
              href={`/deploy?employee=${slug}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-xs transition"
            >
              <Rocket className="w-3 h-3" />
              <span>Deploy</span>
            </Link>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 cursor-not-allowed"
              title="Deployment ready upon pipeline validation"
            >
              <AlertCircle className="w-3 h-3 opacity-40" />
              <span>Deploy</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
