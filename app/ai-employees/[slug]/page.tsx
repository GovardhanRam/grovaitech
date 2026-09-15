import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  getEmployeeBySlug,
  getCanonicalEmployees,
  getMarketplaceEmployees,
} from '@/lib/employees'
import { getRecipeBySlug } from '@/lib/recipes'
import EmployeeDemo from '@/components/employee/EmployeeDemo'
import EmployeeConfigurationForm from '@/components/employee/EmployeeConfigurationForm'
import {
  Bot,
  Rocket,
  Settings,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldCheck,
  Layers,
  ArrowRight,
} from 'lucide-react'

export async function generateStaticParams() {
  const employees = [...getMarketplaceEmployees(), ...getCanonicalEmployees()]
  const uniqueSlugs = [...new Set(employees.map((e) => e.slug))]

  return uniqueSlugs.map((slug) => ({
    slug,
  }))
}

interface EmployeeProfilePageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: EmployeeProfilePageProps) {
  const { slug } = await params
  const employee = await getEmployeeBySlug(slug)

  if (!employee) {
    return {
      title: 'Employee Not Found | Grovaitech',
    }
  }

  const displayName = employee.displayName || employee.name
  const description = employee.shortDescription || employee.description || ''

  return {
    title: `${displayName} — AI Employee | Grovaitech`,
    description,
    keywords: employee.keywords?.join(', '),
  }
}

export default async function EmployeeProfilePage({
  params,
}: EmployeeProfilePageProps) {
  const { slug } = await params
  const employee = await getEmployeeBySlug(slug)

  if (!employee) {
    notFound()
  }

  const recipe = getRecipeBySlug(slug)
  const displayName = employee.displayName || employee.name
  const description = employee.description || employee.shortDescription || ''
  const category = employee.category || employee.department || 'Operations'
  const isDeployable = employee.status === 'live'

  // Human-readable status mapping
  const statusBadge =
    employee.status === 'live'
      ? { label: 'Available', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' }
      : employee.status === 'beta'
      ? { label: 'Beta', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
      : employee.status === 'demo'
      ? { label: 'Demo', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
      : { label: 'Coming Soon', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back navigation */}
        <Link
          href="/ai-employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-8 transition"
        >
          <span>← Back to AI Employee Marketplace</span>
        </Link>

        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 mb-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <Bot className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                  {category} · {employee.industry || 'Enterprise'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {displayName}
                </h1>
                <p className="text-sm sm:text-base text-slate-600 font-medium mt-1">
                  {employee.title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.cls}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                {statusBadge.label}
              </span>
            </div>
          </div>

          {/* Pricing & Primary CTAs */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-slate-500 font-medium">Monthly Retainer</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900">
                  ₹{employee.pricing?.monthly?.toLocaleString() || 0}
                </p>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <div>
                <span className="text-xs text-slate-500 font-medium">Deployment Setup</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900">
                  ₹{employee.pricing?.setup?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isDeployable ? (
                <Link
                  href={`/deploy?employee=${employee.slug}`}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 transition shadow-xs flex items-center gap-1.5"
                >
                  <Rocket className="w-3.5 h-3.5" />
                  <span>Deploy AI Employee</span>
                </Link>
              ) : null}

              {employee.demo_config?.enabled ? (
                <a
                  href="#demo-section"
                  className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs sm:text-sm font-bold transition"
                >
                  Try Interactive Demo
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── 2. What this AI Employee does ────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 mb-6 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
            What this employee does
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {description}
          </p>

          {/* Keywords / Discovery tags */}
          {employee.keywords && employee.keywords.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Keywords:
              </span>
              {employee.keywords.map((kw, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-md text-[11px] font-medium"
                >
                  {kw}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. Workflow Stages (Recipe Specification) ─────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 mb-6 shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Workflow Specification</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard operating stages executed autonomously with human-in-the-loop governance.
              </p>
            </div>
            {recipe && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                Recipe v{recipe.version}
              </span>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {recipe ? (
              recipe.workflowSpec.stages.map((stage) => (
                <div
                  key={stage.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      {stage.order}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{stage.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{stage.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        stage.implementationStatus === 'implemented'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : stage.implementationStatus === 'planned'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {stage.implementationStatus === 'implemented'
                        ? 'Implemented'
                        : stage.implementationStatus === 'planned'
                        ? 'Planned'
                        : 'Requires Integration'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
                {[
                  { step: '1. Inbound Touchpoint', desc: 'Inquiry arrives via chat or messaging' },
                  { step: '2. Context Retrieval', desc: 'Discovers needs & queries grounded knowledge' },
                  { step: '3. Intent Qualification', desc: 'Validates buyer budget and timeline' },
                  { step: '4. Action Execution', desc: 'Books calendar slots & writes to CRM' },
                  { step: '5. Human Escalation', desc: 'Routes to human operator when requested' },
                ].map((node, idx) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-xs font-bold text-slate-900 block">{node.step}</span>
                    <span className="text-[10px] text-slate-500 mt-1 block">{node.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 4. Real Configuration UI (Recipe Schema Form) ────────────────── */}
        {recipe && recipe.configurationSchema && (
          <div id="configure" className="mb-6">
            <EmployeeConfigurationForm recipeSlug={recipe.slug} />
          </div>
        )}

        {/* ── 5. Capabilities & Responsibilities ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Capabilities */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3">Capabilities</h2>
            <div className="flex flex-wrap gap-1.5">
              {employee.capabilities?.map((cap, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-semibold"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Responsibilities */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3">Job Responsibilities</h2>
            <ul className="space-y-2">
              {employee.responsibilities?.map((resp, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── 6. Integrations & Channels ───────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3">Integrations</h2>
            <div className="flex flex-wrap gap-1.5">
              {(employee.requiredIntegrations || employee.integrations || []).map((item, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3">Operational Channels</h2>
            <div className="flex flex-wrap gap-1.5">
              {(employee.channels || ['Web Chat']).map((ch, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── 7. Interactive Demo ─────────────────────────────────────────── */}
        <div id="demo-section">
          <EmployeeDemo
            employeeSlug={employee.slug}
            enabled={employee.demo_config?.enabled}
          />
        </div>
      </div>
    </div>
  )
}
