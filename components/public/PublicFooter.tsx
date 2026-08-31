import Link from 'next/link'
import Image from 'next/image'
import { Bot, Mail, ArrowUpRight } from 'lucide-react'

export default function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand & Mission Statement */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                <Image
                  src="/images/Grovaitech_Logo_Optimized.png"
                  alt="Grovaitech Logo"
                  width={26}
                  height={26}
                  className="w-6 h-6 object-contain"
                />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white uppercase">
                Grovaitech
              </span>
            </Link>
            <p className="text-slate-300 font-semibold text-sm max-w-sm">
              “We Don’t Sell Software. We Deploy AI Employees.”
            </p>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Empowering real estate firms, healthcare practices, and high-velocity businesses with autonomous conversational agents and workflow automation.
            </p>
          </div>

          {/* Column 1: Product */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Product
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/ai-employees"
                  className="hover:text-white transition-colors"
                >
                  AI Employees
                </Link>
              </li>
              <li>
                <Link
                  href="/workflows"
                  className="hover:text-white transition-colors"
                >
                  Solutions & Workflows
                </Link>
              </li>
              <li>
                <Link
                  href="#how-it-works"
                  className="hover:text-white transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/ai-employees/real-estate-lead-receptionist"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>Live Receptionist Demo</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Resources & Company */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/blog"
                  className="hover:text-white transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@grovaitech.com?subject=Grovaitech%20Inquiry"
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <span>Contact Support</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Access */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 mb-4">
              Account
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/login"
                  className="hover:text-white transition-colors"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="hover:text-white transition-colors"
                >
                  Create Account
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/billing"
                  className="hover:text-white transition-colors"
                >
                  Billing & Plans
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-10 mt-10 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Grovaitech. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-slate-600">Enterprise AI Workforce Platform</span>
            <span>•</span>
            <span className="text-slate-600">Strict Data Privacy</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
