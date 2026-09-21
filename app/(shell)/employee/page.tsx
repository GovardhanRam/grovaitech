/**
 * Grovaitech AI Platform
 * app/(shell)/employee/page.tsx
 *
 * Employee / Team Member Workspace.
 * Surfaces assigned tasks, shift status, break tracker, and EOD reporting.
 */

import { getDashboardData } from '@/app/actions/dashboard'
import EmployeeWorkspace from '@/components/employee/EmployeeWorkspace'

export const dynamic = 'force-dynamic'

export default async function EmployeePage() {
  const dashboardData = await getDashboardData()

  return <EmployeeWorkspace initialData={dashboardData} />
}
