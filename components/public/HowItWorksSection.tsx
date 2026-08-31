import {
  Layers,
  Cpu,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  PhoneCall,
  GitBranch,
} from 'lucide-react'
import Link from 'next/link'

export default function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Select Role & Provide Context',
      description:
        'Choose from ready-to-deploy AI Employees or customize instructions with your business pricing, FAQs, and service catalog.',
      icon: Database,
    },
    {
      step: '02',
      title: 'Connect Channels & Workflows',
      description:
        'Hook up Web Chat, WhatsApp, or API endpoints. Configure automated tool actions like lead qualification and site-visit scheduling.',
      icon: PhoneCall,
    },
    {
      step: '03',
      title: 'Deploy with Human Escalation',
      description:
        'Your AI Employee handles customer conversations around the clock, writes verified records to your CRM, and escalates complex requests to your team.',
      icon: ShieldCheck,
    },
  ]

  const techHighlights = [
    {
      title: 'Deterministic Tool Calling',
      desc: 'AI Employees invoke strict CRM and booking tools only when parameters are fully verified.',
      icon: GitBranch,
    },
    {
      title: 'Gemini-Powered Intelligence',
      desc: 'Fast, natural, multi-turn conversations grounded in your business data without hallucinating false confirmations.',
      icon: Cpu,
    },
    {
      title: 'Zero-Disruption Architecture',
      desc: 'Seamlessly works alongside your existing CRM, calendars, and support channels.',
      icon: Zap,
    },
  ]

  return (
    <section id="how-it-works" className="py-16 sm:py-24 bg-slate-50/70 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-3">
            <Layers className="w-3.5 h-3.5" />
            <span>Deployment Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How Grovaitech Deploys AI Employees
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            A three-step architecture designed for zero friction and complete operational reliability.
          </p>
        </div>

        {/* 3 Step Process Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {steps.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.step}
                className="relative bg-white rounded-2xl border border-slate-200/90 p-7 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="font-mono text-2xl font-black text-slate-200">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Technology Highlights Anchor */}
        <div id="technology" className="pt-12 border-t border-slate-200/70">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Enterprise-Grade AI Architecture
            </h3>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Engineered with deterministic tool contracts and strict safety constraints.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {techHighlights.map((tech) => {
              const Icon = tech.icon
              return (
                <div
                  key={tech.title}
                  className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 text-blue-600 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-2">
                    {tech.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {tech.desc}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/ai-employees"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              <span>Explore full AI Employee catalog</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  )
}
