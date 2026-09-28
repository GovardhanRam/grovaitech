import { Suspense } from 'react'
import PublicNav from '@/components/public/PublicNav'
import WebsiteUpgradeFooter from '@/components/website-upgrade/WebsiteUpgradeFooter'
import WebsiteUpgradeWorkspace from '@/components/website-upgrade/WebsiteUpgradeWorkspace'

export const metadata = {
  title: 'Website Upgrade Employee | Grovaitech',
  description:
    'Evidence-backed website intelligence, 15-category conversion audit, revenue leak modeling, and AI Employee workforce integration.',
}

export default function WebsiteUpgradePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <PublicNav />
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <Suspense
          fallback={
            <div className="p-12 text-center text-slate-400">
              Loading Website Upgrade Workspace...
            </div>
          }
        >
          <WebsiteUpgradeWorkspace />
        </Suspense>
      </main>
      <WebsiteUpgradeFooter />
    </div>
  )
}
