'use client'

/**
 * Grovaitech AI Workforce OS
 * app/(shell)/dashboard/billing/quotes/new/page.tsx
 *
 * Internal Platform Admin Interface: Create Custom Commercial Quote.
 * Enforces server-side authorization and strict deployment-to-tenant alignment.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FileText,
  ShieldAlert,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building2,
  Bot,
  Calendar,
  IndianRupee,
} from 'lucide-react'
import {
  getAdminQuoteContextAction,
  createCustomQuoteAction,
} from '@/app/actions/billing'
import type {
  AdminQuoteTenantOption,
  AdminQuoteDeploymentOption,
} from '@/lib/billing/types'

export default function NewQuotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [tenants, setTenants] = useState<AdminQuoteTenantOption[]>([])
  const [deployments, setDeployments] = useState<AdminQuoteDeploymentOption[]>([])

  // Form State
  const [tenantId, setTenantId] = useState('')
  const [deploymentId, setDeploymentId] = useState('')
  const [setupFeeInr, setSetupFeeInr] = useState('25000')
  const [monthlyFeeInr, setMonthlyFeeInr] = useState('45000')
  const [includedConversations, setIncludedConversations] = useState('1000')
  const [overageRateInr, setOverageRateInr] = useState('5')
  const [validUntil, setValidUntil] = useState(() => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    return future.toISOString().slice(0, 10)
  })
  const [status, setStatus] = useState<'draft' | 'sent'>('sent')
  const [customTerms, setCustomTerms] = useState(
    'Includes dedicated voice/WhatsApp agent configuration, Google Calendar integration, and 99.9% uptime SLA.'
  )

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successQuoteId, setSuccessQuoteId] = useState<string | null>(null)

  useEffect(() => {
    async function loadContext() {
      setLoading(true)
      try {
        const res = await getAdminQuoteContextAction()
        if (!res.success) {
          if (res.status === 403 || res.status === 401) {
            setIsAuthorized(false)
          }
          setErrorMessage(res.error || 'Failed to authorize administrative access.')
        } else if (res.data) {
          setTenants(res.data.tenants)
          setDeployments(res.data.deployments)
          if (res.data.tenants.length > 0) {
            setTenantId(res.data.tenants[0].id)
          }
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unexpected error loading quote context.')
      } finally {
        setLoading(false)
      }
    }
    loadContext()
  }, [])

  // Filter deployments aligned with selected tenant
  const tenantDeployments = deployments.filter((d) => d.client_id === tenantId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!tenantId) {
      setErrorMessage('Please select a target client tenant.')
      return
    }

    const setupFee = parseFloat(setupFeeInr)
    const monthlyFee = parseFloat(monthlyFeeInr)
    const includedConv = parseInt(includedConversations, 10)
    const overageRate = parseFloat(overageRateInr)

    if (isNaN(setupFee) || setupFee < 0) {
      setErrorMessage('Setup fee must be a valid non-negative number.')
      return
    }
    if (isNaN(monthlyFee) || monthlyFee < 0) {
      setErrorMessage('Monthly subscription fee must be a valid non-negative number.')
      return
    }
    if (isNaN(includedConv) || includedConv < 0) {
      setErrorMessage('Included conversations must be a valid non-negative number.')
      return
    }
    if (isNaN(overageRate) || overageRate < 0) {
      setErrorMessage('Overage rate must be a valid non-negative number.')
      return
    }

    // Validate future date
    if (validUntil) {
      const expiry = new Date(validUntil).getTime()
      if (expiry <= Date.now()) {
        setErrorMessage('Validity date must be in the future.')
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await createCustomQuoteAction({
        tenant_id: tenantId,
        deployment_id: deploymentId.trim() ? deploymentId.trim() : null,
        setup_fee_inr: setupFee,
        monthly_fee_inr: monthlyFee,
        included_conversations: includedConv,
        overage_rate_per_conv_inr: overageRate,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        custom_terms: customTerms.trim() || null,
        status,
      })

      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to create commercial quote.')
      } else {
        setSuccessQuoteId(res.data.id)
        router.push(`/dashboard/billing/quotes/${res.data.id}`)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Verifying platform administrator authority...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-red-950">Administrative Access Required</h2>
          <p className="text-xs text-red-700 max-w-md mx-auto">
            Commercial quote creation is restricted to verified Grovaitech operators and platform super administrators.
            Your account does not possess commercial proposal issuing authority.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-900 hover:bg-red-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Billing
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/billing"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Billing Portal
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-semibold text-blue-600">Admin Console</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Custom Commercial Quote
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build a bespoke commercial proposal for an enterprise client. Pricing is private, customer-specific, and India-first.
          </p>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-700">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Platform Operator
        </span>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Success Notification */}
      {successQuoteId && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Quote created successfully. Redirecting to proposal review...</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-6">
        {/* Client Selection */}
        <div className="space-y-4 border-b border-slate-100 pb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-slate-500" /> 1. Client & Deployment Association
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Client Tenant <span className="text-red-500">*</span>
              </label>
              <select
                value={tenantId}
                onChange={(e) => {
                  setTenantId(e.target.value)
                  setDeploymentId('') // Reset deployment to maintain strict tenant alignment
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Workspace authorized to receive and accept this commercial quote.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                AI Employee Deployment <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={deploymentId}
                onChange={(e) => setDeploymentId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="">None / Account-Level (Unassigned)</option>
                {tenantDeployments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.assigned_employee_name} ({d.id.slice(0, 16)}...)
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {tenantDeployments.length === 0
                  ? 'No active deployments found for this client. Quote will be account-level.'
                  : 'Enforces cross-tenant alignment: only deployments belonging to this tenant are selectable.'}
              </p>
            </div>
          </div>
        </div>

        {/* Commercial Pricing Terms */}
        <div className="space-y-4 border-b border-slate-100 pb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5 text-slate-500" /> 2. Commercial Pricing & Structure
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                One-Time Setup Fee (₹ INR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={setupFeeInr}
                  onChange={(e) => setSetupFeeInr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Implementation, prompt engineering, CRM integration, and verification.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Monthly Subscription Fee (₹ INR) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={monthlyFeeInr}
                  onChange={(e) => setMonthlyFeeInr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono font-semibold"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Recurring monthly subscription fee for the active AI Workforce contract.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Included Conversations / Month
              </label>
              <input
                type="number"
                min="0"
                step="100"
                value={includedConversations}
                onChange={(e) => setIncludedConversations(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Base threshold before usage overage metering applies.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Overage Rate per Conversation (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={overageRateInr}
                  onChange={(e) => setOverageRateInr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Cost per conversation beyond the included monthly limit.
              </p>
            </div>
          </div>
        </div>

        {/* Proposal Validity & Terms */}
        <div className="space-y-4 border-b border-slate-100 pb-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" /> 3. Validity & Custom Terms
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Quote Valid Until <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Proposal expiry date. Client cannot accept an expired proposal.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Initial Proposal Status
              </label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="status"
                    value="sent"
                    checked={status === 'sent'}
                    onChange={() => setStatus('sent')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Sent (Actionable by client)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={status === 'draft'}
                    onChange={() => setStatus('draft')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Draft (Internal staging)</span>
                </label>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Note: "Sent" status allows immediate client acceptance in their portal.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Custom Terms & Scope
            </label>
            <textarea
              rows={3}
              value={customTerms}
              onChange={(e) => setCustomTerms(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Outline specific deliverables, integrations, SLA, or custom pilot terms..."
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/dashboard/billing"
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Commercial Proposal...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                <span>Issue Commercial Quote</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
