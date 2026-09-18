'use client'

/**
 * Grovaitech AI Workforce OS
 * app/(shell)/dashboard/billing/quotes/[id]/page.tsx
 *
 * Quote Detail & Client Acceptance Review Screen.
 * Allows clients to review and accept issued commercial proposals,
 * and allows activating subscriptions for accepted quotes.
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Calendar,
  IndianRupee,
  Bot,
  Building2,
  Zap,
  Info,
} from 'lucide-react'
import {
  getQuoteAction,
  acceptQuoteAction,
  createSubscriptionFromAcceptedQuoteAction,
} from '@/app/actions/billing'
import type { BillingQuote } from '@/lib/billing/types'

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>
}

export default function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const resolvedParams = use(params)
  const quoteId = resolvedParams.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState<BillingQuote | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)

  const [isAccepting, setIsAccepting] = useState(false)
  const [isActivating, setIsActivating] = useState(false)

  const loadQuote = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await getQuoteAction(quoteId)
      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to load commercial proposal.')
      } else {
        setQuote(res.data)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unexpected error loading proposal.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuote()
  }, [quoteId])

  const isExpired =
    quote?.valid_until ? new Date(quote.valid_until).getTime() < Date.now() : false

  const handleAccept = async () => {
    if (!quote) return
    setIsAccepting(true)
    setErrorMessage(null)
    setActionSuccessMessage(null)

    try {
      const res = await acceptQuoteAction({ quote_id: quote.id })
      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to accept proposal.')
      } else {
        setQuote(res.data)
        setActionSuccessMessage('Commercial proposal accepted successfully.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while accepting.')
    } finally {
      setIsAccepting(false)
    }
  }

  const handleActivateSubscription = async () => {
    if (!quote) return
    setIsActivating(true)
    setErrorMessage(null)
    setActionSuccessMessage(null)

    try {
      const res = await createSubscriptionFromAcceptedQuoteAction({
        quote_id: quote.id,
      })
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to activate subscription.')
      } else {
        setActionSuccessMessage('Subscription activated successfully! Redirecting to billing overview...')
        setTimeout(() => {
          router.push('/dashboard/billing')
        }, 1500)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while activating subscription.')
    } finally {
      setIsActivating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading commercial proposal...</p>
        </div>
      </div>
    )
  }

  if (errorMessage && !quote) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-red-950">Unable to Load Proposal</h2>
          <p className="text-xs text-red-700 max-w-md mx-auto">{errorMessage}</p>
          <div className="pt-2">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-900 hover:bg-red-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Billing Portal
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!quote) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/billing"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Billing Portal
        </Link>
        <span className="text-[10px] font-mono text-slate-400">Proposal ID: {quote.id.slice(0, 18)}...</span>
      </div>

      {/* Action Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {actionSuccessMessage && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Status Banners */}
      {quote.status === 'draft' && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <Info className="w-4 h-4 text-amber-600" />
            <span>Draft Proposal (Internal Staging)</span>
          </div>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            This quote is currently in draft status and cannot be accepted by the client.
            <em> Note: Dedicated proposal issuing (sendQuoteAction) is not yet available in the backend service. To issue a client-actionable proposal, create a new quote with status &quot;Sent&quot;.</em>
          </p>
        </div>
      )}

      {quote.status === 'superseded' && (
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-100 text-slate-700 text-xs flex items-center gap-2.5">
          <Info className="w-4 h-4 text-slate-500 shrink-0" />
          <span>This commercial proposal has been superseded by a newer agreement and is now read-only.</span>
        </div>
      )}

      {isExpired && quote.status === 'sent' && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-red-600 shrink-0" />
          <span>This commercial proposal expired on {new Date(quote.valid_until!).toLocaleDateString()}. Please contact Grovaitech to request a refreshed quote.</span>
        </div>
      )}

      {/* Main Quote Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Grovaitech Commercial Proposal
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              AI Workforce Agreement
            </h1>
            <p className="text-xs text-slate-500">
              Created on {new Date(quote.created_at).toLocaleDateString()}
              {quote.accepted_at && ` • Accepted on ${new Date(quote.accepted_at).toLocaleDateString()}`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {quote.status === 'accepted' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Accepted
              </span>
            )}
            {quote.status === 'sent' && !isExpired && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Awaiting Acceptance
              </span>
            )}
            {quote.status === 'sent' && isExpired && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-200 bg-red-50 text-xs font-bold text-red-700">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" /> Expired
              </span>
            )}
            {quote.status === 'draft' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-xs font-bold text-amber-700">
                Draft
              </span>
            )}
            {quote.status === 'superseded' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600">
                Superseded
              </span>
            )}
          </div>
        </div>

        {/* Pricing Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              One-Time Setup & Onboarding
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatINR(quote.setup_fee_inr)}
            </div>
            <p className="text-[11px] text-slate-500">
              One-time implementation, custom agent scripting, and integration.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/40 space-y-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
              Monthly Subscription
            </span>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatINR(quote.monthly_fee_inr)} <span className="text-xs font-normal text-slate-500">/ month</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Recurring AI Employee runtime, hosting, and updates.
            </p>
          </div>
        </div>

        {/* Usage & Overage Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Included Usage Threshold
            </span>
            <span className="text-sm font-bold text-slate-800">
              {quote.included_conversations.toLocaleString('en-IN')} conversations / month
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Messages and sessions handled by the AI Employee each billing cycle.
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Usage Overage Rate
            </span>
            <span className="text-sm font-bold text-slate-800">
              {formatINR(quote.overage_rate_per_conv_inr)} / conversation
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Billed transparently at end-of-month if included threshold is exceeded.
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Associated AI Employee Deployment
            </span>
            <span className="text-xs font-semibold text-slate-700 font-mono">
              {quote.deployment_id ? quote.deployment_id : 'Account-Level (Unassigned)'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Quote Validity
            </span>
            <span className="text-xs font-semibold text-slate-700">
              {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'Indefinite'}
            </span>
          </div>
        </div>

        {/* Custom Scope & Terms */}
        {quote.custom_terms && (
          <div className="border-t border-slate-100 pt-6 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Agreed Deliverables & SLA Scope
            </span>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {quote.custom_terms}
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-400 text-center sm:text-left">
            All fees are in Indian Rupees (INR). Applicable GST (18%) is added upon formal invoice issuance.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Sent -> Accept Action */}
            {quote.status === 'sent' && !isExpired && (
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Accepting Proposal...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept Commercial Proposal</span>
                  </>
                )}
              </button>
            )}

            {/* Accepted with Deployment -> Activate Subscription Action */}
            {quote.status === 'accepted' && quote.deployment_id && (
              <button
                onClick={handleActivateSubscription}
                disabled={isActivating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:cursor-not-allowed"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Subscription...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Activate AI Workforce Subscription</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
