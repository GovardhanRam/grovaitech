/**
 * Grovaitech AI Workforce OS
 * app/(shell)/tasks/page.tsx
 *
 * My Work & Task Execution Center.
 * Surfaces assigned tasks, operational shift tracker, break controls,
 * and EOD reporting powered by real dashboard telemetry and GOVA insights.
 */

import { getDashboardData } from '@/app/actions/dashboard'
import EmployeeWorkspace from '@/components/employee/EmployeeWorkspace'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Work & Tasks | Grovaitech OS',
  description: 'Manage active operational tasks, track shift time, and submit EOD summaries.',
}

export default async function TasksPage() {
  const dashboardData = await getDashboardData()

  return <EmployeeWorkspace initialData={dashboardData} />
}
