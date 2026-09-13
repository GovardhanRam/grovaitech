'use client'

import Link from 'next/link'
import { Sparkles, Users, Award, Zap, CheckCircle2, ArrowRight } from 'lucide-react'

export default function MissionSection() {
  const pillars = [
    {
      title: 'Enterprise AI Solutions',
      description: 'Deploying autonomous AI employees, Vision AI systems, and cloud infrastructure engineered for zero-hallucination accuracy.',
    },
    {
      title: 'Career AI Skill Training',
      description: 'Empowering individuals to earn a secure and happy living by mastering high-value AI capabilities that did not exist in the past.',
    },
    {
      title: 'Ethical Human-AI Synergy',
      description: 'Building technology that amplifies human creativity, streamlines workflow operations, and creates sustainable economic growth.',
    },
  ]

  const stats = [
    { label: 'Deterministic Execution', value: '100%' },
    { label: 'Operational Speedup', value: '10x' },
    { label: 'Active Workflows', value: '24/7' },
    { label: 'Career Trainees', value: '500+' },
  ]

  return (
    <section id="mission" className="py-20 lg:py-28 bg-slate-950 text-white border-b border-slate-800/80 relative overflow-hidden">
      {/* Background glow graphics */}
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Founder Message & Story */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Our Purpose & Mission</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
              Empowering Businesses with AI & Teaching People Skills for a <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Secure, Happy Living</span>
            </h2>

            <div className="space-y-4 text-slate-300 text-base sm:text-lg leading-relaxed">
              <p className="border-l-2 border-blue-500 pl-4 italic text-slate-200">
                &ldquo;Technology should empower every human being. At Grovaitech, our mission is twofold: to deliver reliable, enterprise-grade AI solutions to global businesses while teaching individuals how to master high-value AI skills to earn a secure and prosperous living in the modern economy.&rdquo;
              </p>
              <div className="pt-1 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md">
                  G
                </div>
                <div>
                  <h4 className="text-white font-semibold text-base">Govardhanram</h4>
                  <p className="text-xs text-slate-400">Founder & CEO, Grovaitech</p>
                </div>
              </div>
            </div>

            {/* Pillars */}
            <div className="pt-4 space-y-4">
              {pillars.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm sm:text-base">{item.title}</h4>
                    <p className="text-slate-400 text-xs sm:text-sm mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="#training"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
              >
                <span>Explore AI Training Programs</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="#services"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-all"
              >
                <span>View Enterprise Services</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Visual Tech Card & Impact Metrics */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono font-medium text-slate-300">Grovaitech Intelligence Engine</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md">v2.4 Active</span>
              </div>

              {/* Stat Grid */}
              <div className="grid grid-cols-2 gap-4">
                {stats.map((s, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-center space-y-1">
                    <div className="text-2xl sm:text-3xl font-extrabold text-blue-400 font-mono">{s.value}</div>
                    <div className="text-[11px] sm:text-xs text-slate-400 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Visual Card Feature highlights */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 space-y-3">
                <div className="flex items-center gap-2 text-blue-300 font-semibold text-sm">
                  <Award className="w-4 h-4 text-blue-400" />
                  <span>Dual Impact Framework</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Combining high-precision enterprise AI deployment with practical skill enablement so that businesses grow efficiently while individuals achieve income security.
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-400" /> B2B Enterprise Solutions</span>
                  <span className="text-emerald-400 font-medium">Deployed</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full w-full" />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-indigo-400" /> Career AI Training Track</span>
                  <span className="text-indigo-400 font-medium">Enrolling</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full w-[85%]" />
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
