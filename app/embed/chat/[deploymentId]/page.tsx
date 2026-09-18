/**
 * Grovaitech AI Platform
 * app/embed/chat/[deploymentId]/page.tsx
 *
 * Public Embeddable AI Receptionist Route.
 * Server Component executing outside the internal dashboard (shell) group.
 * Resolves active Client Deployment records securely server-side,
 * enforces tenant boundaries, and renders standalone customer-facing chat UI.
 */

import React from 'react'
import { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/server'
import EmbedChatInterface from '@/components/chat/EmbedChatInterface'
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react'
import type { ClientDeployment } from '@/lib/deployment/types'

interface EmbedChatPageProps {
  params: Promise<{
    deploymentId: string
  }>
}

export async function generateMetadata({ params }: EmbedChatPageProps): Promise<Metadata> {
  const { deploymentId } = await params
  if (!deploymentId) {
    return { title: 'AI Receptionist | Grovaitech' }
  }

  try {
    const supabase = await createAdminClient()
    const { data: deployment } = await supabase
      .from('client_deployments')
      .select('company_name, assigned_employee_name, status')
      .eq('id', deploymentId.trim())
      .single()

    if (deployment && deployment.status === 'active') {
      return {
        title: `${deployment.company_name} — AI Receptionist`,
        description: `Live AI Real Estate Receptionist for ${deployment.company_name}, powered by Grovaitech.`,
      }
    }
  } catch {
    // Fall back gracefully
  }

  return {
    title: 'AI Receptionist | Grovaitech',
    description: 'Grovaitech AI Workforce Real Estate Receptionist',
  }
}

export default async function EmbedChatPage({ params }: EmbedChatPageProps) {
  const { deploymentId } = await params

  // 1. Validate parameter format
  const cleanId = typeof deploymentId === 'string' ? deploymentId.trim() : ''
  if (!cleanId) {
    return <InvalidDeploymentState message="No deployment identifier provided in URL." />
  }

  // 2. Fetch deployment securely via server-only admin client
  let deployment: ClientDeployment | null = null
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('client_deployments')
      .select('*')
      .eq('id', cleanId)
      .single()

    if (!error && data) {
      deployment = data as ClientDeployment
    }
  } catch (err) {
    console.error('[Embed Route Error] Database query exception:', err)
    return <InvalidDeploymentState message="Unable to load the requested receptionist deployment." />
  }

  // 3. Reject missing deployment
  if (!deployment) {
    return (
      <InvalidDeploymentState
        message={`Deployment "${cleanId}" was not found. Please verify the URL or contact your property administrator.`}
      />
    )
  }

  // 4. Enforce active deployment status boundary
  if (deployment.status !== 'active') {
    return (
      <InactiveDeploymentState
        companyName={deployment.company_name}
        status={deployment.status}
      />
    )
  }

  // 5. Render customer-facing experience with sanitized public metadata
  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50">
      <EmbedChatInterface
        deploymentId={deployment.id}
        companyName={deployment.company_name}
        employeeName={deployment.assigned_employee_name || 'AI Receptionist'}
        employeeSlug={deployment.assigned_employee_slug}
        location={deployment.runtime_config?.location}
      />
    </div>
  )
}

/**
 * Clean user-facing 404 / Invalid Deployment State
 * Zero internal tokens, debug stacks, or database schemas exposed.
 */
function InvalidDeploymentState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-base font-semibold text-slate-900">
            Receptionist Unavailable
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {message}
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
          Powered by <span className="font-medium text-slate-600">Grovaitech AI</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Clean user-facing Inactive Deployment State (e.g. paused, suspended, or inactive)
 */
function InactiveDeploymentState({
  companyName,
  status,
}: {
  companyName: string
  status: string
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-base font-semibold text-slate-900">
            Receptionist Currently Offline
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            The AI Real Estate Receptionist for <span className="font-semibold text-slate-700">{companyName}</span> is temporarily offline ({status}). Please contact the sales office directly or visit again later.
          </p>
        </div>
        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
          Powered by <span className="font-medium text-slate-600">Grovaitech AI</span>
        </div>
      </div>
    </div>
  )
}
