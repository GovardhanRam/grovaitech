'use client'

import Link from 'next/link'
import { Bot, Eye, Cloud, GraduationCap, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'

export default function ServicesSection() {
  const services = [
    {
      id: 'ai-employees',
      title: 'AI Employees & Workflow Automation',
      badge: 'Autonomous Workforce',
      icon: Bot,
      color: 'from-blue-600 to-cyan-500',
      borderColor: 'group-hover:border-blue-500/50',
      description: 'Deploy specialized AI employees that handle real customer conversations, automate lead qualification, and execute business tasks deterministically 24/7.',
      features: [
        'Real Estate Lead Receptionist',
        'Google Business Profile (GBP) Manager',
        'Customer Support & Booking Agents',
        'Multi-channel WhatsApp & Web Integration',
      ],
      link: '/ai-employees',
      cta: 'Explore AI Workforce',
    },
    {
      id: 'vision-ai',
      title: 'Vision AI Technology',
      badge: 'Visual Intelligence',
      icon: Eye,
      color: 'from-indigo-600 to-purple-500',
      borderColor: 'group-hover:border-indigo-500/50',
      description: 'Computer vision and visual AI models that analyze image data, automate document OCR, inspect quality, and perform real-time visual recognition.',
      features: [
        'Automated OCR & Document Parsing',
        'Industrial Quality Inspection',
        'Real-time Object & Anomaly Detection',
        'Spatial Video & Image Data Extraction',
      ],
      link: '#contact',
      cta: 'Discover Vision AI',
    },
    {
      id: 'cloud-web',
      title: 'Cloud Computing & Web Development',
      badge: 'Scalable Architecture',
      icon: Cloud,
      color: 'from-cyan-600 to-blue-500',
      borderColor: 'group-hover:border-cyan-500/50',
      description: 'High-performance Next.js web applications and robust cloud infrastructure built to scale seamlessly with zero downtime and enterprise security.',
      features: [
        'Modern Next.js & React Web Applications',
        'Cloud Infrastructure & Microservices',
        'API Architecture & Database Design',
        'CI/CD & Serverless Deployment',
      ],
      link: '#contact',
      cta: 'Build Web & Cloud Apps',
    },
    {
      id: 'ai-training',
      title: 'Career-Oriented AI Training',
      badge: 'High-Income Skills',
      icon: GraduationCap,
      color: 'from-emerald-600 to-teal-500',
      borderColor: 'group-hover:border-emerald-500/50',
      description: 'Transformative education designed to teach individuals practical, creative AI skills so they can earn a secure and prosperous living in the AI era.',
      features: [
        'Hands-on AI Agent Building & Workflows',
        'Prompt Engineering & LLM Orchestration',
        'Career Transition & Freelance Guidance',
        'Real-world Portfolio Projects',
      ],
      link: '#training',
      cta: 'Join Career Training',
    },
  ]

  return (
    <section id="services" className="py-20 lg:py-28 bg-slate-900 text-white relative overflow-hidden border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Full-Scope Solutions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Comprehensive AI Services & Skill Enablement
          </h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
            From autonomous AI employees and visual recognition tech to cloud engineering and career training, Grovaitech delivers total digital capability.
          </p>
        </div>

        {/* Services Grid (4 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-8">
          {services.map((service) => {
            const Icon = service.icon
            return (
              <div
                key={service.id}
                className={`group relative rounded-2xl bg-slate-950 p-8 border border-slate-800/90 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between hover:shadow-2xl hover:shadow-blue-500/5 ${service.borderColor}`}
              >
                <div className="space-y-6">
                  {/* Top Badge & Icon */}
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${service.color} flex items-center justify-center text-white shadow-lg`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
                      {service.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">
                      {service.title}
                    </h3>
                    <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5 pt-2">
                    {service.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="pt-8 mt-6 border-t border-slate-900">
                  <Link
                    href={service.link}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 group-hover:text-blue-300 transition-colors"
                  >
                    <span>{service.cta}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
