// app/ai-employees/page.tsx
//
// AI Employees Marketplace Page.
// Renders the full catalog of AI Employees sourced from the canonical workforce registry
// (and Supabase ai_employees table if populated).

import { getAllEmployees, CANONICAL_EMPLOYEES, type AIEmployee } from '@/lib/employees'
import { WorkforceMarketplace } from '@/components/employee/WorkforceMarketplace'
import ShellLayout from '@/components/shell/ShellLayout'

export const metadata = {
  title: 'AI Employees Marketplace | Grovaitech',
  description: 'Deploy specialized AI Employees across conversations, leads, and business operations.',
}

export default async function EmployeesPage() {
  const dbEmployees = await getAllEmployees()

  // Use DB data if populated with full workforce, otherwise use the canonical registry
  const employees: AIEmployee[] =
    dbEmployees.length >= CANONICAL_EMPLOYEES.length ? dbEmployees : CANONICAL_EMPLOYEES
  const isDemo = dbEmployees.length < CANONICAL_EMPLOYEES.length

  return (
    <ShellLayout>
      <WorkforceMarketplace employees={employees} isDemo={isDemo} />
    </ShellLayout>
  )
}
