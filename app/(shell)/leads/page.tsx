// app/(shell)/leads/page.tsx
// Server Component — calls getLeads() securely on the server, then renders the
// client-side LeadsWorkspace. No credentials or server keys touch the client.

import { getLeads } from '@/app/actions/leads'
import { LeadsWorkspace } from '@/components/leads/LeadsWorkspace'
import type { Lead } from '@/components/leads/LeadsWorkspace'

export default async function LeadsPage() {
  // Fetch leads server-side. Falls back gracefully if Supabase is unavailable.
  const result = await getLeads()
  const serverLeads: Lead[] = result.success ? (result.data as Lead[]) : []

  return <LeadsWorkspace serverLeads={serverLeads} />
}
