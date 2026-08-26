'use client'

import { useState } from 'react'
import { 
  CreditCard, 
  CheckCircle, 
  Download, 
  Sparkles
} from 'lucide-react'

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<'Starter' | 'Growth'>('Starter')

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$99',
      period: 'month',
      desc: 'Ideal for local clinics and salons starting automation.',
      features: [
        '1 Active AI Employee (Receptionist)',
        'Up to 1,000 call/chat minutes/mo',
        'Google Calendar Integration',
        'Document RAG (up to 5 PDFs)',
        'Email Support'
      ],
      cta: 'Current Plan',
      popular: false
    },
    {
      name: 'Growth',
      price: '$249',
      period: 'month',
      desc: 'Perfect for growing businesses with WhatsApp & Voice needs.',
      features: [
        '3 Active AI Employees',
        'Up to 5,000 call/chat minutes/mo',
        'WhatsApp Business API Setup',
        'n8n & CRM Webhook integrations',
        'Document RAG (Unlimited PDFs)',
        'Priority Slack Support'
      ],
      cta: 'Upgrade to Growth',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      desc: 'Tailored for multi-branch clinics and firms needing custom agent scripts.',
      features: [
        'Unlimited AI Employees',
        'Custom Voice Agent training',
        'Multi-language local accent setup',
        'Dedicated server hosting support',
        'SLA Guaranteed Uptime',
        '1-on-1 Developer support'
      ],
      cta: 'Contact Sales',
      popular: false
    }
  ]

  const invoiceHistory = [
    { id: 'INV-2026-004', date: 'Jul 15, 2026', amount: '$99.00', status: 'Paid' },
    { id: 'INV-2026-003', date: 'Jun 15, 2026', amount: '$99.00', status: 'Paid' },
    { id: 'INV-2026-002', date: 'May 15, 2026', amount: '$99.00', status: 'Paid' },
    { id: 'INV-2026-001', date: 'Apr 15, 2026', amount: '$99.00', status: 'Paid' }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white">Billing & Subscriptions</h1>
        <p className="text-xs text-[#94A3B8] mt-1">
          Review subscription package details, manage payment methods, and download past invoice records.
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white font-sans">
        {/* Active plan card */}
        <div className="md:col-span-2 p-6 rounded-2xl border border-[#1E293B] bg-gradient-to-tr from-[#1E293B]/70 to-[#0F172A]/10 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/5 text-[10px] font-bold text-[#60A5FA] uppercase tracking-wider">
              Active Package
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-xl font-bold text-white">{currentPlan} Plan</h2>
              <span className="text-xs text-[#94A3B8] font-semibold">$99/month</span>
            </div>
            <p className="text-xs text-[#94A3B8] leading-relaxed max-w-md">
              Your billing period renews on **August 15, 2026**. Deployed to Tirupati branch (Apollo Dental Clinic receptionist active).
            </p>
          </div>

          <div className="flex gap-4 items-center pt-6 mt-6 border-t border-[#1E293B] text-xs">
            <div>
              <span className="text-[#94A3B8] font-semibold text-[10px] uppercase">Usage This Month</span>
              <p className="text-slate-200 mt-1 font-bold">428 / 1,000 mins</p>
            </div>
            <div className="w-px h-8 bg-[#1E293B]"></div>
            <div>
              <span className="text-[#94A3B8] font-semibold text-[10px] uppercase">RAG Capacity</span>
              <p className="text-slate-200 mt-1 font-bold">2 / 5 files</p>
            </div>
          </div>
        </div>

        {/* Payment details card */}
        <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Payment Details</h3>
            
            <div className="p-3.5 rounded-xl border border-[#1E293B] bg-[#0F172A] flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-white">Visa ending in 4242</p>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Expires 12/28</p>
              </div>
            </div>
          </div>

          <button className="w-full mt-6 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white rounded-lg transition-colors">
            Update Card Details
          </button>
        </div>
      </div>

      {/* Pricing packages comparison grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Upgrade Packages</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white font-sans">
          {pricingPlans.map((plan, i) => (
            <div key={i} className={`p-6 rounded-2xl border ${
              plan.popular ? 'border-[#3B82F6] bg-gradient-to-b from-[#1E293B]/60 to-[#3B82F6]/5' : 'border-[#1E293B] bg-[#1E293B]/30'
            } backdrop-blur-xl flex flex-col justify-between relative group hover:border-[#3B82F6]/30 transition-all duration-300`}>
              
              {plan.popular && (
                <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#3B82F6] text-[9px] font-bold text-white uppercase tracking-wider">
                  <Sparkles className="w-2.5 h-2.5" /> Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white">{plan.name}</h4>
                  <p className="text-[10px] text-[#94A3B8] mt-1 leading-normal">{plan.desc}</p>
                </div>

                <div className="flex items-baseline gap-1 pt-2">
                  <span className="text-3xl font-extrabold text-white tracking-tight">{plan.price}</span>
                  <span className="text-[10px] text-[#94A3B8] font-semibold">/{plan.period}</span>
                </div>

                {/* Features list */}
                <ul className="space-y-2 text-[10px] text-slate-400 border-t border-[#1E293B] pt-4">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button 
                onClick={() => plan.name !== 'Starter' && plan.name !== 'Enterprise' && setCurrentPlan(plan.name as any)}
                disabled={plan.name === currentPlan}
                className={`w-full mt-6 py-2.5 text-xs font-semibold rounded-xl transition-all ${
                  plan.name === currentPlan 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-[#3B82F6] hover:bg-[#2563EB] text-white shadow-lg shadow-blue-600/15'
                    : 'bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 hover:text-white'
                }`}
              >
                {plan.name === currentPlan ? 'Active Package' : plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
        <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Invoice History</h3>
        
        <div className="overflow-x-auto text-[11px] text-white">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1E293B] text-[#94A3B8] font-semibold">
                <th className="pb-3">Invoice ID</th>
                <th className="pb-3">Billing Date</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B]/50">
              {invoiceHistory.map((invoice) => (
                <tr key={invoice.id} className="text-slate-300 hover:bg-[#1E293B]/20">
                  <td className="py-3.5 font-semibold text-white font-mono">{invoice.id}</td>
                  <td className="py-3.5">{invoice.date}</td>
                  <td className="py-3.5 font-semibold">{invoice.amount}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                      {invoice.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
