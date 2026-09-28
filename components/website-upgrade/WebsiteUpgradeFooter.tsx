import Link from 'next/link'
import Image from 'next/image'

export default function WebsiteUpgradeFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-6 px-4 sm:px-6 lg:px-8 mt-12">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-block">
            <Image
              src="/images/Grovaitech_Logo_Optimized.png"
              alt="Grovaitech"
              width={120}
              height={40}
              className="h-8 w-auto object-contain bg-white/95 rounded-lg p-1 border border-slate-800"
            />
          </Link>
          <div className="border-l border-slate-800 pl-3">
            <p className="text-slate-300 font-semibold">
              “We Don’t Sell Software. We Deploy AI Employees.”
            </p>
            <p className="text-[11px] text-slate-500">Autonomous workforce platform</p>
          </div>
        </div>

        {/* Essential Links */}
        <div className="flex flex-wrap items-center gap-4 text-slate-400">
          <Link href="/ai-employees" className="hover:text-white transition-colors">
            AI Employees
          </Link>
          <Link href="/workflows" className="hover:text-white transition-colors">
            Workflows
          </Link>
          <Link href="/deploy" className="hover:text-white transition-colors">
            Deployment Engine
          </Link>
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <a
            href="mailto:support@grovaitech.com?subject=Website%20Upgrade%20Inquiry"
            className="hover:text-white transition-colors text-blue-400 hover:text-blue-300"
          >
            Support & Privacy
          </a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
        <p>© {new Date().getFullYear()} Grovaitech. All rights reserved.</p>
        <span className="text-slate-600">Enterprise AI Workforce OS</span>
      </div>
    </footer>
  )
}
