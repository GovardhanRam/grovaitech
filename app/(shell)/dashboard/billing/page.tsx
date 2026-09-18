'use client'

/**
 * Grovaitech AI Workforce OS
 * app/(shell)/dashboard/billing/page.tsx
 *
 * Commercial Billing Portal (Customer & Operator Facing).
 * Fully server-backed via getTenantBillingOverviewAction.
 * Renders custom quotes, active AI Employee subscriptions, real invoices,
 * and usage meters. All pricing is INR and customer-specific.
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Loader2,
  Calendar,
  IndianRupee,
  Bot,
  Zap,
  ShieldCheck,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { getTenantBillingOverviewAction } from '@/app/actions/billing'
import type { TenantBillingOverview, BillingQuote } from '@/lib/billing/types'

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<TenantBillingOverview | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadBillingOverview = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const res = await getTenantBillingOverviewAction()
      if (!res.success || !res.data) {
        setErrorMessage(res.error || 'Failed to retrieve billing records.')
      } else {
        setOverview(res.data)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while loading billing.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBillingOverview()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading commercial billing overview...</p>
        </div>
      </div>
    )
  }

  if (errorMessage && !overview) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-red-950">Billing Error</h2>
          <p className="text-xs text-red-700 max-w-md mx-auto">{errorMessage}</p>
          <div className="pt-2">
            <button
              onClick={loadBillingOverview}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-red-200 text-xs font-semibold text-red-900 hover:bg-red-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const activeSub = overview?.activeSubscription
  const quotes = overview?.quotes || []
  const latestQuote: BillingQuote | null = quotes.length > 0 ? quotes[0] : null
  const invoices = overview?.invoices || []
  const meter = overview?.usageMeter
  const isPlatformAdmin = overview?.isPlatformAdmin

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Billing & Commercial Contracts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Custom pricing based on your business, requirements, integrations and usage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadBillingOverview}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh billing data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {isPlatformAdmin && (
            <Link
              href="/dashboard/billing/quotes/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Quote</span>
            </Link>
          )}
        </div>
      </div>

      {/* Commercial Policy Notice Banner */}
      <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Bespoke Enterprise Billing:</strong> Every Grovaitech AI Workforce deployment is custom-configured. Invoices and subscription contracts reflect mutually agreed terms.
          </span>
        </div>
        <span className="text-[11px] font-semibold text-blue-700 shrink-0">
          GST (18%) Compliant • India-First
        </span>
      </div>

      {/* Primary Overview Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Subscription Contract (2 Cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-blue-200 bg-blue-50 text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                <Bot className="w-3 h-3 text-blue-600" /> Active Subscription
              </span>

              {activeSub ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {activeSub.status}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400">
                  No Active Contract
                </span>
              )}
            </div>

            {activeSub ? (
              <div>
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {formatINR(activeSub.monthly_fee_inr)}
                  </h2>
                  <span className="text-xs text-slate-500 font-semibold">/ month</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Bound AI Employee Deployment:{' '}
                  <span className="font-mono text-slate-700 font-semibold">{activeSub.deployment_id}</span>
                </p>
                {activeSub.next_billing_date && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Next billing date: <strong>{new Date(activeSub.next_billing_date).toLocaleDateString()}</strong>
                  </p>
                )}
              </div>
            ) : (
              <div className="py-2">
                <h2 className="text-lg font-bold text-slate-800">No active AI Workforce subscription</h2>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  Review and accept your custom commercial proposal below to activate your AI Employee deployment.
                </p>
              </div>
            )}
          </div>

          {/* Usage Meter in Active Contract */}
          <div className="border-t border-slate-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Conversations
              </span>
              <span className="text-sm font-black text-slate-800 mt-0.5 block">
                {meter ? meter.conversations_count.toLocaleString('en-IN') : '0'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Leads Captured
              </span>
              <span className="text-sm font-black text-emerald-600 mt-0.5 block">
                {meter ? meter.leads_captured.toLocaleString('en-IN') : '0'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                External Ops
              </span>
              <span className="text-sm font-black text-purple-600 mt-0.5 block">
                {meter ? meter.external_ops_count.toLocaleString('en-IN') : '0'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Billing Month
              </span>
              <span className="text-xs font-semibold text-slate-700 mt-0.5 block font-mono">
                {meter ? meter.billing_month : new Date().toISOString().slice(0, 7)}
              </span>
            </div>
          </div>
        </div>

        {/* Latest Commercial Proposal Card (1 Col) */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Commercial Proposal
              </span>
              {latestQuote && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                    latestQuote.status === 'accepted'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : latestQuote.status === 'sent'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {latestQuote.status}
                </span>
              )}
            </div>

            {latestQuote ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Setup & Implementation</span>
                  <span className="text-base font-bold text-slate-900">{formatINR(latestQuote.setup_fee_inr)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Monthly Retainer</span>
                  <span className="text-base font-bold text-slate-900">
                    {formatINR(latestQuote.monthly_fee_inr)} <span className="text-xs font-normal text-slate-500">/mo</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Usage Threshold</span>
                  <span className="font-semibold text-slate-700">
                    {latestQuote.included_conversations.toLocaleString('en-IN')} conversations / mo
                  </span>
                </div>
                {latestQuote.valid_until && (
                  <div>
                    <span className="text-[10px] text-slate-400 block">Valid Until</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(latestQuote.valid_until).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No active proposal</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Custom quotes prepared by your account team will appear here for review.
                </p>
              </div>
            )}
          </div>

          {latestQuote && (
            <Link
              href={`/dashboard/billing/quotes/${latestQuote.id}`}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
            >
              <span>{latestQuote.status === 'sent' ? 'Review & Accept Proposal' : 'View Proposal Details'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Proposals History Section (if multiple quotes exist) */}
      {quotes.length > 1 && (
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Proposal History
          </h3>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                  <th className="pb-3">Proposal ID</th>
                  <th className="pb-3">Setup Fee</th>
                  <th className="pb-3">Monthly Fee</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70">
                    <td className="py-3 font-mono text-slate-700 font-semibold">{q.id.slice(0, 16)}...</td>
                    <td className="py-3 font-semibold text-slate-900">{formatINR(q.setup_fee_inr)}</td>
                    <td className="py-3 font-semibold text-slate-900">{formatINR(q.monthly_fee_inr)}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{new Date(q.created_at).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/dashboard/billing/quotes/${q.id}`}
                        className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1"
                      >
                        View <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice History Section */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tax Invoices & Billing Records
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Official GST tax invoices issued under your commercial agreement.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            {invoices.length} {invoices.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="py-8 text-center border-t border-slate-100">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">No invoices issued yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Invoices are generated upon subscription activation and billing cycle renewal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                  <th className="pb-3">Invoice Number</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Issued Date</th>
                  <th className="pb-3">Due Date</th>
                  <th className="pb-3">Amount (INR)</th>
                  <th className="pb-3">GST (18%)</th>
                  <th className="pb-3">Total (INR)</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="py-3 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 text-slate-600 capitalize">{inv.type.replace('_', ' ')}</td>
                    <td className="py-3 text-slate-500">{new Date(inv.issued_at).toLocaleDateString()}</td>
                    <td className="py-3 text-slate-500">{new Date(inv.due_date).toLocaleDateString()}</td>
                    <td className="py-3 font-semibold text-slate-800">{formatINR(inv.amount_inr)}</td>
                    <td className="py-3 text-slate-500">{formatINR(inv.tax_inr)}</td>
                    <td className="py-3 font-black text-slate-900">{formatINR(inv.total_inr)}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                          inv.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.status === 'issued'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
