'use client'

import Link from 'next/link'
import { Sparkles, Mail, ArrowRight, Bot, ShieldCheck } from 'lucide-react'

export default function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 text-slate-400 border-t border-slate-800/80 pt-16 pb-12 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          
          {/* Column 1: Brand & Mission (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Grovaitech</span>
            </Link>

            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Empowering global enterprises with deterministic AI solutions while teaching individuals how to master high-value AI skills to earn a secure and happy living.
            </p>

            <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Founded by Govardhanram • Built for Global Impact</span>
            </div>
          </div>

          {/* Column 2: Core Services (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Core Services</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/ai-employees" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                  <span>AI Employees & Workflows</span>
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-white transition-colors">
                  Vision AI Technology
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-white transition-colors">
                  Web & Cloud Development
                </Link>
              </li>
              <li>
                <Link href="#training" className="hover:text-white transition-colors text-emerald-400 font-medium">
                  Career AI Training Track
                </Link>
              </li>
              <li>
                <Link href="/ai-employees/realtor-lead-receptionist" className="hover:text-white transition-colors text-xs text-slate-400">
                  • Real Estate Lead Receptionist
                </Link>
              </li>
              <li>
                <Link href="/ai-employees/gbp-growth-manager" className="hover:text-white transition-colors text-xs text-slate-400">
                  • GBP Growth Manager
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Company & Trust (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="#mission" className="hover:text-white transition-colors">
                  About Us & Mission
                </Link>
              </li>
              <li>
                <Link href="#mission" className="hover:text-white transition-colors">
                  Founder&apos;s Story
                </Link>
              </li>
              <li>
                <Link href="#trust" className="hover:text-white transition-colors flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Trust & Security</span>
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog & Insights
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors">
                  Client Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact & Action (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Get in Touch</h4>
            <p className="text-xs text-slate-400">Ready to deploy AI in your business or start your AI career transformation?</p>
            
            <div className="space-y-3">
              <a
                href="mailto:contact@grovaitech.com"
                className="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900 border border-slate-800 p-2.5 rounded-lg hover:border-slate-700 transition"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <span>contact@grovaitech.com</span>
              </a>

              <Link
                href="#contact"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
              >
                <span>Schedule a Consultation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Grovaitech. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="#trust" className="hover:text-slate-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="#trust" className="hover:text-slate-400 transition-colors">
              Terms of Service
            </Link>
            <Link href="#trust" className="hover:text-slate-400 transition-colors">
              Security Standards
            </Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
