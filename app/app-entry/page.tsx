'use client'

/**
 * Grovaitech AI Workforce OS
 * app/app-entry/page.tsx
 *
 * Dedicated Authenticated Application Entry Route.
 * Used as the primary entry point for the Android Native Shell and authenticated app sessions:
 *   Android APK -> /app-entry -> Inspect Supabase Session -> Determine Authorized Role -> Application Home
 *
 * Routing Targets:
 *   - Founder / Super Admin -> /dashboard (Founder Command Center)
 *   - Customer -> /dashboard/customer (Customer Home)
 *   - Employee -> /employee (Employee Home)
 *   - Unassigned -> /onboarding
 *   - Unauthenticated -> /login
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveAppEntryDestination } from '@/app/actions/auth-routing'
import { BrandLogo } from '@/components/ui'
import { Loader2 } from 'lucide-react'

export default function AppEntryPage() {
  const router = useRouter()
  const [statusMessage, setStatusMessage] = useState('Verifying session...')

  useEffect(() => {
    let isMounted = true

    async function evaluateEntry() {
      try {
        const supabase = createClient()
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          if (isMounted) {
            setStatusMessage('Directing to sign in...')
            router.replace('/login')
          }
          return
        }

        if (isMounted) {
          setStatusMessage('Resolving workspace...')
        }

        const result = await resolveAppEntryDestination(user.id)

        if (isMounted) {
          if (result.destination === '/dashboard') {
            setStatusMessage('Opening Founder Command Center...')
          } else if (result.destination === '/dashboard/customer') {
            setStatusMessage('Opening Customer Portal...')
          } else if (result.destination === '/employee') {
            setStatusMessage('Opening Employee Workspace...')
          } else {
            setStatusMessage('Loading application...')
          }

          router.replace(result.destination)
        }
      } catch (err) {
        console.error('[AppEntry] Failed to resolve entry route:', err)
        if (isMounted) {
          router.replace('/login')
        }
      }
    }

    evaluateEntry()

    return () => {
      isMounted = false
    }
  }, [router])

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#00142E] text-white px-6">
      <div className="flex flex-col items-center gap-6 max-w-xs text-center animate-in fade-in duration-300">
        <BrandLogo variant="horizontal" size="lg" inverted={true} />

        <div className="flex items-center gap-2.5 text-xs font-semibold text-blue-200 mt-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#0066FF]" />
          <span>{statusMessage}</span>
        </div>

        <p className="text-[11px] text-slate-400 font-medium">
          Grovaitech AI Workforce OS
        </p>
      </div>
    </div>
  )
}
