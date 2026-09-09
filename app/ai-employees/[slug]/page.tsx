import { notFound } from 'next/navigation'
import { getEmployeeBySlug, getCanonicalEmployees } from '@/lib/employees'
import EmployeeDemo from '@/components/employee/EmployeeDemo'

export async function generateStaticParams() {
  const employees = getCanonicalEmployees()

  return employees.map((employee) => ({
    slug: employee.slug
  }))
}

interface EmployeeProfilePageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({
  params
}: EmployeeProfilePageProps) {
  const { slug } = await params
  const employee = await getEmployeeBySlug(slug)

  if (!employee) {
    return {
      title: 'Employee Not Found'
    }
  }

  return {
    title: `${employee.name} | Grovaitech AI Employees`,
    description: employee.description
  }
}

export default async function EmployeeProfilePage({
  params
}: EmployeeProfilePageProps) {
  const { slug } = await params
  const employee = await getEmployeeBySlug(slug)

  if (!employee) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back navigation */}
        <a
          href="/ai-employees"
          className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-800 mb-8 transition"
        >
          ← Back to all employees
        </a>

        {/* ── 1. Hero ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 mb-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {employee.name}
                </h1>
              </div>

              <p className="text-base sm:text-lg text-slate-600 font-medium mt-1">
                {employee.title}
              </p>

              <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1">
                {employee.industry} · {employee.department}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  employee.status === 'live'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : employee.status === 'beta'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : employee.status === 'demo'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : employee.status === 'in_development'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    employee.status === 'live'
                      ? 'bg-emerald-500'
                      : employee.status === 'beta' || employee.status === 'demo'
                      ? 'bg-blue-500'
                      : employee.status === 'in_development'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
                {employee.status === 'live'
                  ? 'Live'
                  : employee.status === 'beta'
                  ? 'Beta'
                  : employee.status === 'demo'
                  ? 'Demo'
                  : employee.status === 'in_development'
                  ? 'In Development'
                  : 'Planned'}
              </span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-slate-500 font-medium">Monthly Retainer</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900">
                  ₹{employee.pricing?.monthly || 0}
                </p>
              </div>

              <div className="h-8 w-px bg-slate-200" />

              <div>
                <span className="text-xs text-slate-500 font-medium">Deployment Setup</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900">
                  ₹{employee.pricing?.setup || 0}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={employee.slug === 'clinic-receptionist' ? '/dashboard/chat' : '#demo-section'}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-blue-700 transition shadow-sm text-center"
              >
                Try Employee
              </a>
            </div>
          </div>
        </div>

        {/* ── 2. What this employee does ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 mb-6 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
            What this employee does
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            {employee.description}
          </p>
        </div>

        {/* ── 3. Responsibilities ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 mb-6 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4">
            Responsibilities
          </h2>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {employee.responsibilities?.map((resp, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-600 leading-normal"
              >
                <span className="text-blue-600 font-black text-base leading-none">•</span>
                <span>{resp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 4. Capabilities ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 mb-6 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-4">
            Capabilities
          </h2>

          <div className="flex flex-wrap gap-2">
            {employee.capabilities?.map((cap, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl text-xs font-semibold"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* ── 5. Integrations & Channels Grid ─────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Verified Integrations */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
              Verified Integrations
            </h2>
            <div className="flex flex-wrap gap-2">
              {employee.integrations && employee.integrations.length > 0 ? (
                employee.integrations.map((item, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    {item}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">No external integrations required.</span>
              )}
            </div>
          </div>

          {/* Operational Channels */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">
              Channels
            </h2>
            <div className="flex flex-wrap gap-2">
              {employee.channels && employee.channels.length > 0 ? (
                employee.channels.map((ch, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    {ch}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400">Web Chat</span>
              )}
            </div>
          </div>
        </div>

        {/* ── 6. How it works (Visual Workflow) ────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 mb-6 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
            How it works
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Standard operating procedure executed by this AI employee across customer touchpoints.
          </p>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-center">
            {[
              { step: 'Customer', desc: 'Inquiry arrives via chat' },
              { step: 'AI Employee', desc: 'Receives context' },
              { step: 'Understand request', desc: 'Discovers needs & intent' },
              { step: 'Complete task', desc: 'Bookings or CRM records' },
              { step: 'Human escalation', desc: 'Routes when necessary' },
            ].map((node, idx, arr) => (
              <div key={idx} className="flex-1 flex flex-col md:flex-row items-center gap-3">
                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-900">{node.step}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{node.desc}</span>
                </div>
                {idx < arr.length - 1 && (
                  <span className="hidden md:block text-slate-300 font-bold text-lg">→</span>
                )}
                {idx < arr.length - 1 && (
                  <span className="md:hidden text-slate-300 font-bold text-base">↓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── 7. Interactive Demo ─────────────────────────────────────────── */}
        <div id="demo-section">
          <EmployeeDemo employeeSlug={employee.slug} enabled={employee.demo_config?.enabled} />
        </div>
      </div>
    </div>
  )
}
