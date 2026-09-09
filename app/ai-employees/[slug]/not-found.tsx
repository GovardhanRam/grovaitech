import Link from 'next/link'
import { Bot, ArrowRight } from 'lucide-react'

export default function EmployeeNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto mb-4">
          <Bot className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          AI employee not found.
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          The requested AI employee profile does not exist or may have been moved.
        </p>
        <Link
          href="/ai-employees"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition shadow-sm"
        >
          <span>Explore all AI employees</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
