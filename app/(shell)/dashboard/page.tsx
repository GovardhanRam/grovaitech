/**
 * Grovaitech AI Platform
 * app/(shell)/dashboard/page.tsx
 *
 * Operational Command Center Server Component.
 * Fetches live operational telemetry from Supabase and passes to DashboardWorkspace.
 */

import { getDashboardData } from '@/app/actions/dashboard'
import DashboardWorkspace from '@/components/dashboard/DashboardWorkspace'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const dashboardData = await getDashboardData()

  return <DashboardWorkspace initialData={dashboardData} />
}
