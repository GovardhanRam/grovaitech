// app/ai-employees/page.tsx
//
// AI Employees Marketplace Page.
// Renders the canonical 15 AI Employees sourced from the workforce registry.

import {
  getAllEmployees,
  getMarketplaceEmployees,
  type AIEmployee,
} from '@/lib/employees'
import { WorkforceMarketplace } from '@/components/employee/WorkforceMarketplace'
import ShellLayout from '@/components/shell/ShellLayout'

export const metadata = {
  title: 'AI Employees Marketplace | Grovaitech',
  description:
    'Explore and deploy specialized AI Employees across marketing, sales, customer support, operations, finance, and healthcare.',
}

export default async function EmployeesPage() {
  const dbEmployees = await getAllEmployees()
  const marketplaceEmployees = getMarketplaceEmployees()

  // Prefer database records if populated with full workforce, otherwise use the canonical marketplace definitions
  const employees: AIEmployee[] =
    dbEmployees.length >= marketplaceEmployees.length ? dbEmployees : marketplaceEmployees
  const isDemo = dbEmployees.length < marketplaceEmployees.length

  return (
    <ShellLayout>
      <WorkforceMarketplace employees={employees} isDemo={isDemo} />
    </ShellLayout>
  )
}
