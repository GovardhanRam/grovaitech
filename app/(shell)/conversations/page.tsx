// app/(shell)/conversations/page.tsx
// Server Component — calls getConversations() securely on the server, then renders
// the client-side ConversationsWorkspace with live Supabase data and isolated fallback.

import { getConversations } from '@/app/actions/conversations'
import { ConversationsWorkspace } from '@/components/conversations/ConversationsWorkspace'

export const metadata = {
  title: 'Conversations & Unified Inbox | Grovaitech',
  description: 'Monitor, filter, and inspect AI Employee customer conversations across Web and WhatsApp channels.',
}

export default async function ConversationsPage() {
  const result = await getConversations()

  return (
    <ConversationsWorkspace
      initialConversations={result.conversations}
      isFallback={result.isFallback}
    />
  )
}
