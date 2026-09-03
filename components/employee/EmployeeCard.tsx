import Link from 'next/link'
import { Bot, ArrowRight, Sparkles } from 'lucide-react'

interface EmployeeCardProps {
  id?: string
  name: string
  slug: string
  title: string
  department: string
  description: string
  status: 'live' | 'beta' | 'demo' | 'in_development' | 'planned'
  capabilities: string[]
}

const statusMeta = {
  live: { label: 'Live', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  beta: { label: 'Beta', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  demo: { label: 'Demo', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  in_development: { label: 'In Dev', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  planned: { label: 'Planned', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' }
}

export default function EmployeeCard({
  name,
  slug,
  title,
  department,
  description,
  status,
  capabilities
}: EmployeeCardProps) {
  const meta = statusMeta[status] || statusMeta.live

  return (
    <div className="group bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between">
      <div className="p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 group-hover:scale-105 transition-transform">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">{name}</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{title}</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${meta.cls}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {capabilities.slice(0, 3).map((cap, i) => (
            <span
              key={i}
              className="px-2.5 py-1 bg-slate-50 text-slate-600 text-xs font-medium rounded-lg border border-slate-200/80"
            >
              {cap}
            </span>
          ))}

          {capabilities.length > 3 && (
            <span className="px-2 py-1 text-slate-400 text-xs font-medium self-center">
              +{capabilities.length - 3} more
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">{department}</span>

        <Link
          href={`/ai-employees/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-3.5 py-1.5 rounded-xl border border-blue-200 hover:border-blue-600 transition shadow-2xs"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
