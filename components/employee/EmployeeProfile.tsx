import { AIEmployee } from '@/lib/employees'

interface EmployeeProfileProps {
  employee: AIEmployee
}

const statusColors = {
  live: 'bg-green-100 text-green-700',
  beta: 'bg-yellow-100 text-yellow-700',
  demo: 'bg-blue-100 text-blue-700',
  in_development: 'bg-purple-100 text-purple-700',
  planned: 'bg-gray-100 text-gray-500'
}

const statusLabels = {
  live: '🟢 Live',
  beta: '🟡 Beta',
  demo: '🔵 Demo',
  in_development: '🟣 In Development',
  planned: '⚪ Planned'
}

export default function EmployeeProfile({ employee }: EmployeeProfileProps) {
  return (
    <div className="space-y-8">
      {/* Header & Basic Info Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
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
            className={`self-start px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[employee.status]}`}
          >
            {statusLabels[employee.status]}
          </span>
        </div>

        <p className="mt-4 text-gray-600 text-lg leading-relaxed">
          {employee.description}
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex gap-8">
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
          </div>

          <div className="flex items-center gap-3">
            {employee.demo_config?.enabled && (
              <button className="px-6 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium text-sm">
                Try Demo
              </button>
            )}

            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm">
              Deploy Now
            </button>
          </div>
        </div>
      </div>

      {/* Responsibilities Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Responsibilities
        </h2>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {employee.responsibilities.map((resp, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-gray-600 leading-relaxed text-sm"
            >
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{resp}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Capabilities / Skills Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Capabilities
        </h2>

        <div className="flex flex-wrap gap-2">
          {employee.capabilities.map((cap, i) => (
            <span
              key={i}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Integrations Card */}
      {employee.integrations && employee.integrations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Integrations
          </h2>

          <div className="flex flex-wrap gap-2">
            {employee.integrations.map((integration, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium"
              >
                {integration}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Channels Card */}
      {employee.channels && employee.channels.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Supported Channels
          </h2>

          <div className="flex flex-wrap gap-2">
            {employee.channels.map((channel, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium"
              >
                {channel}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
