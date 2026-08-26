'use client'

/**
 * app/(shell)/layout.tsx
 *
 * Thin Next.js layout wrapper for the (shell) route group.
 * All layout logic lives in components/shell/ShellLayout.tsx so it can be
 * reused outside the route group (e.g. app/ai-employees/page.tsx).
 */

import ShellLayout from '@/components/shell/ShellLayout'

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ShellLayout>{children}</ShellLayout>
}
