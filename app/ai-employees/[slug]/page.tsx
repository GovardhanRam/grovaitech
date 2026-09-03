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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        <a
          href="/ai-employees"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-8"
        >
          ← Back to all employees
        </a>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {employee.name}
              </h1>

              <p className="text-lg text-gray-500 mt-1">
                {employee.title}
              </p>

              <p className="text-sm text-gray-400 mt-1">
                {employee.department} · {employee.industry}
              </p>
            </div>

            <span
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                employee.status === 'live'
                  ? 'bg-green-100 text-green-700'
                  : employee.status === 'beta'
                  ? 'bg-yellow-100 text-yellow-700'
                  : employee.status === 'demo'
                  ? 'bg-blue-100 text-blue-700'
                  : employee.status === 'in_development'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {employee.status === 'live'
                ? '🟢 Live'
                : employee.status === 'beta'
                ? '🟡 Beta'
                : employee.status === 'demo'
                ? '🔵 Demo'
                : employee.status === 'in_development'
                ? '🟣 In Development'
                : '⚪ Planned'}
            </span>
          </div>

          <p className="mt-4 text-gray-600 text-lg">
            {employee.description}
          </p>

          <div className="mt-6 flex items-center gap-6">
            <div>
              <span className="text-sm text-gray-500">Monthly</span>
              <p className="text-2xl font-bold text-gray-900">
                ₹{employee.pricing?.monthly || 0}
              </p>
            </div>

            <div>
              <span className="text-sm text-gray-500">Setup</span>
              <p className="text-2xl font-bold text-gray-900">
                ₹{employee.pricing?.setup || 0}
              </p>
            </div>

            <button className="ml-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">
              Deploy Now
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Responsibilities
          </h2>

          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {employee.responsibilities.map((resp, i) => (
              <li
                key={i}
                className="flex items-center gap-2 text-gray-600"
              >
                <span className="text-blue-500">•</span>
                {resp}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Skills & Integrations
          </h2>

          <div className="flex flex-wrap gap-2">
            {employee.capabilities.map((cap, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm"
              >
                {cap}
              </span>
            ))}
          </div>
        </div>

        <EmployeeDemo employeeSlug={employee.slug} enabled={employee.demo_config?.enabled} />

      </div>
    </div>
  )
}
