import { Suspense } from 'react'
import PublicNav from '@/components/public/PublicNav'
import PublicFooter from '@/components/public/PublicFooter'
import DeploymentEngineWorkspace from '@/components/deployment/DeploymentEngineWorkspace'

export const metadata = {
  title: 'Deploy AI Employees | Grovaitech',
  description:
    'Scan operational bottlenecks, detect revenue leaks, match canonical AI Employees, and test interactively in an isolated sandbox.',
}

export default function DeployPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <PublicNav />
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Deployment Workspace...</div>}>
          <DeploymentEngineWorkspace />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  )
}
