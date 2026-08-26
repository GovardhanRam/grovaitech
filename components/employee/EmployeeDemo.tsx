'use client'

import { useState } from 'react'
import { X, MessageSquare } from 'lucide-react'
import ChatInterface from '@/components/chat/ChatInterface'

interface EmployeeDemoProps {
  employeeSlug: string
  enabled?: boolean
}

export default function EmployeeDemo({ employeeSlug, enabled = false }: EmployeeDemoProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!enabled) return null

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Live Demo
        </h2>

        <p className="text-gray-500">
          Try the employee in action.
        </p>

        <button
          onClick={() => setIsOpen(true)}
          className="mt-4 px-6 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" /> Try Demo
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] h-[600px] rounded-2xl overflow-hidden shadow-2xl border border-gray-200 flex flex-col relative">
            
            {/* Header bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50 text-slate-900">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="font-bold text-sm uppercase tracking-wider text-slate-900">AI Employee Simulator</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-700 transition p-1 hover:bg-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Frame Container */}
            <div className="flex-1 overflow-hidden">
              <ChatInterface employeeSlug={employeeSlug} />
            </div>
            
          </div>
        </div>
      )}
    </>
  )
}
