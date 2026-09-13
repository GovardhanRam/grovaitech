'use client'

import { ShieldCheck, Lock, Cpu, Layers, CheckCircle2, Sparkles } from 'lucide-react'

export default function TrustSection() {
  const trustPoints = [
    {
      title: 'End-to-End Encryption',
      badge: 'AES-256 / TLS 1.3',
      icon: Lock,
      description: 'Bank-grade encryption at rest and in transit ensures all client chats, lead records, and proprietary data remain strictly isolated and protected.',
    },
    {
      title: 'GDPR & CCPA Compliant',
      badge: 'Privacy Sovereignty',
      icon: ShieldCheck,
      description: 'Zero model training on proprietary client data. Full compliance with global privacy regulations, data retention controls, and right-to-forget standards.',
    },
    {
      title: 'Deterministic Tool Calling',
      badge: 'Zero Hallucinations',
      icon: Cpu,
      description: 'Eliminates wild AI outputs. All AI employee actions follow strict, typed function schema contracts verified by runtime assertion checks.',
    },
    {
      title: 'Zero-Disruption Integration',
      badge: 'Turnkey Connectivity',
      icon: Layers,
      description: 'Integrates natively into your existing CRMs, WhatsApp, Twilio, Google Business Profiles, and cloud infrastructure without code refactoring.',
    },
  ]

  return (
    <section id="trust" className="py-20 lg:py-28 bg-slate-950 text-white relative overflow-hidden border-b border-slate-800/80">
      
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Security & Reliability</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Built for Enterprise Trust & Zero Risk
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            Deploy AI solutions with total confidence. We prioritize data sovereignty, deterministic execution, and security compliance above all else.
          </p>
        </div>

        {/* 4 Trust Badges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPoints.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between space-y-4 hover:shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">
                    {item.title}
                  </h3>

                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center gap-2 text-xs font-medium text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Verified Security Standard</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-lg font-bold text-white">Need custom enterprise security compliance?</h4>
            <p className="text-sm text-slate-400">We support custom SOC 2 Type II controls, dedicated cloud deployments, and custom SLAs.</p>
          </div>
          <a
            href="#contact"
            className="shrink-0 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md"
          >
            Request Security Whitepaper
          </a>
        </div>

      </div>
    </section>
  )
}
