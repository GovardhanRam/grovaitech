/**
 * Grovaitech AI Platform
 * app/(shell)/dashboard/customer/page.tsx
 *
 * Customer / Business Owner Home Experience.
 * Surfaces customer-scoped operational metrics, inbound leads, and active AI employees.
 */

import { getDashboardData } from '@/app/actions/dashboard'
import CustomerHomeWorkspace from '@/components/customer/CustomerHomeWorkspace'

export const dynamic = 'force-dynamic'

export default async function CustomerDashboardPage() {
  const dashboardData = await getDashboardData()

  return <CustomerHomeWorkspace initialData={dashboardData} />
}
