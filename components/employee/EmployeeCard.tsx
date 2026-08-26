import Link from 'next/link'

interface EmployeeCardProps {
  id: string
  name: string
  slug: string
  title: string
  department: string
  description: string
  status: 'live' | 'beta' | 'demo' | 'in_development' | 'planned'
  capabilities: string[]
}

const statusColors = {
  live: 'bg-green-100 text-green-700',
  beta: 'bg-yellow-100 text-yellow-700',
  demo: 'bg-blue-100 text-blue-700',
  in_development: 'bg-purple-100 text-purple-700',
  planned: 'bg-gray-100 text-gray-500'
}

const statusLabels = {
  live: 'Live',
  beta: 'Beta',
  demo: 'Demo',
  in_development: 'In Development',
  planned: 'Planned'
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
  return (
    <div className="group bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-500">{title}</p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}
          >
            {statusLabels[status]}
          </span>
        </div>

        <p className="mt-3 text-sm text-gray-600 line-clamp-2">
          {description}
        </p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {capabilities.slice(0, 3).map((cap, i) => (
            <span
              key={i}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              {cap}
            </span>
          ))}

          {capabilities.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-400 text-xs rounded-full">
              +{capabilities.length - 3}
            </span>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-sm text-gray-500">{department}</span>

          <Link
            href={`/ai-employees/${slug}`}
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View Employee →
          </Link>
        </div>
      </div>
    </div>
  )
}
