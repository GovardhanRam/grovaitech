'use client'

import Link from 'next/link'
import { 
  Bot, 
  PhoneCall, 
  MessageSquare, 
  Database, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  ArrowRight,
  Sparkles,
  Check,
  Building,
  Calendar,
  Globe
} from 'lucide-react'

// Custom Monogram GR Logo Component (Zero JS, Inline SVG)
function GRLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      {/* G Arc (Google Blue) */}
      <path d="M 45 35 A 21 21 0 1 0 45 65" fill="none" stroke="#1a73e8" strokeWidth="8" strokeLinecap="round" />
      {/* G Arrow (Google Blue) */}
      <path d="M 32 58 L 46 44 M 36 42 L 48 42 L 48 54" fill="none" stroke="#1a73e8" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      {/* R Stem (Google Yellow) */}
      <path d="M 62 42 L 62 68" fill="none" stroke="#fbbc05" strokeWidth="8" strokeLinecap="round" />
      {/* R Loop (Google Green) */}
      <path d="M 62 42 C 62 30, 78 30, 78 48 C 78 54, 62 55, 62 55" fill="none" stroke="#34a853" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      {/* R Leg (Google Red) */}
      <path d="M 69 53 L 80 68" fill="none" stroke="#ea4335" strokeWidth="8" strokeLinecap="round" />
    </svg>
  )
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-x-hidden">
      {/* Soft Ambient Mesh Gradients */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] left-[5%] w-[450px] h-[450px] rounded-full bg-red-500/5 blur-[110px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[130px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GRLogo className="w-8 h-8 shrink-0" />
            <div>
              <span className="text-lg font-black tracking-wider text-slate-900">
                GROVAITECH
              </span>
              {/* Google Brand Color Bar */}
              <div className="h-0.5 w-full flex rounded-full overflow-hidden mt-0.5">
                <div className="bg-[#1a73e8] w-1/4 h-full" />
                <div className="bg-[#ea4335] w-1/4 h-full" />
                <div className="bg-[#fbbc05] w-1/4 h-full" />
                <div className="bg-[#34a853] w-1/4 h-full" />
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-blue-600 transition">
              AI Employees
            </a>
            <a href="#benefits" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-blue-600 transition">
              Benefits
            </a>
            <a href="#demo" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-blue-600 transition">
              Book Demo
            </a>
            <Link href="/login" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-blue-600 transition">
              Dashboard
            </Link>
          </nav>

          {/* Call to Action Button */}
          <div className="hidden md:flex items-center gap-4">
            <a 
              href="#demo" 
              className="px-4.5 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200"
            >
              Deploy Agent
            </a>
          </div>

          {/* Pure CSS Mobile Navigation Menu Trigger */}
          <input type="checkbox" id="mobile-menu-toggle" className="peer hidden" />
          <label 
            htmlFor="mobile-menu-toggle" 
            className="md:hidden p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer select-none z-50 text-slate-600 peer-checked:text-blue-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path className="peer-checked:hidden block" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              <path className="peer-checked:block hidden" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </label>

          {/* Mobile menu drawer */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 hidden peer-checked:block md:hidden" />
          <div className="fixed top-0 right-0 h-screen w-72 bg-white shadow-2xl border-l border-slate-200 z-50 translate-x-full peer-checked:translate-x-0 transition-transform duration-300 md:hidden p-6 flex flex-col justify-between">
            <div className="space-y-6 pt-12">
              <div className="flex items-center gap-2 mb-8">
                <GRLogo className="w-7 h-7" />
                <span className="text-base font-black tracking-wider">GROVAITECH</span>
              </div>
              <nav className="flex flex-col gap-4">
                <a href="#features" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition py-2 border-b border-slate-100">
                  AI Employees
                </a>
                <a href="#benefits" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition py-2 border-b border-slate-100">
                  Benefits
                </a>
                <a href="#demo" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition py-2 border-b border-slate-100">
                  Book Demo
                </a>
                <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition py-2">
                  Dashboard
                </Link>
              </nav>
            </div>
            <div>
              <a 
                href="#demo" 
                className="w-full block text-center py-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-sm font-bold uppercase tracking-wider shadow-lg transition-colors"
              >
                Deploy AI Employee
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center">
        <div className="text-center max-w-4xl space-y-6">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-xs text-blue-600 font-bold uppercase tracking-wider select-none animate-pulse">
            <Sparkles className="w-3.5 h-3.5" /> Next-Gen AI Employees
          </span>

          {/* Slogan Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-tight">
            We Don't Sell Software.<br />
            <span className="bg-gradient-to-r from-[#1a73e8] via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              We Deploy AI Employees.
            </span>
          </h1>

          {/* Value Prop */}
          <p className="text-base sm:text-lg md:text-xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed pt-2">
            Stop managing tools you have to manage yourself. Grovaitech deploys fully autonomous AI staff that handle phone reception, qualify WhatsApp leads, and search knowledge bases 24/7.
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6 max-w-md mx-auto sm:max-w-none">
            <a 
              href="#demo" 
              className="px-8 py-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-2xl font-bold uppercase tracking-wider shadow-xl shadow-blue-500/20 hover:shadow-blue-500/35 hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 group text-xs sm:text-sm"
            >
              Hire Your AI Employee <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <Link 
              href="/login" 
              className="px-8 py-4 border-2 border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-2xl font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm"
            >
              Open Dashboard
            </Link>
          </div>

          {/* Subtext Tagline */}
          <div className="pt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-xs sm:text-sm font-semibold text-slate-400">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#34a853]" /> Smarter Automation</span>
            <span className="h-4 w-px bg-slate-200 hidden sm:inline" />
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#34a853]" /> Stronger Business</span>
            <span className="h-4 w-px bg-slate-200 hidden sm:inline" />
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#34a853]" /> Better Future</span>
          </div>
        </div>

        {/* Hero Product Visual Card (Light UI mockup with performance) */}
        <div className="mt-16 w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-emerald-500/10 rounded-3xl opacity-50 blur-xl pointer-events-none" />
          <div className="relative rounded-2xl bg-slate-900 p-4 sm:p-6 overflow-hidden border border-slate-800 text-slate-100 flex flex-col justify-between">
            {/* Header of Visual */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[#ea4335]" />
                <span className="w-3 h-3 rounded-full bg-[#fbbc05]" />
                <span className="w-3 h-3 rounded-full bg-[#34a853]" />
                <span className="text-[10px] sm:text-xs font-mono text-slate-500 ml-2">core-agent-monitoring.sh</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                ● Live active
              </span>
            </div>
            
            {/* Main Mock layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Call Receptionist</span>
                  <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-white">Apollo Dental Clinic</p>
                  <p className="text-[10px] text-slate-400">Dr. Verma's slot booked at 2:30 PM</p>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-4/5 animate-pulse" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">WhatsApp Lead Qualifier</span>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-white">Suresh Kumar</p>
                  <p className="text-[10px] text-emerald-400 font-semibold">Qualified (92% conversion match)</p>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-11/12 animate-pulse" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Document Vector Search</span>
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-bold text-white">dental_clinic_faqs.pdf</p>
                  <p className="text-[10px] text-slate-400">146 segments vectorized</p>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-3/4 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges Section */}
      <section id="benefits" className="border-y border-slate-200 bg-white py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 divide-x divide-slate-100 text-center">
            <div className="space-y-2 p-2">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-[#1a73e8] mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">24/7 Availability</h4>
              <p className="text-[10px] sm:text-xs text-slate-500">Uninterrupted operations</p>
            </div>
            
            <div className="space-y-2 p-2">
              <div className="w-10 h-10 rounded-2xl bg-[#ea4335]/10 flex items-center justify-center text-[#ea4335] mx-auto">
                <Zap className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Instant Response</h4>
              <p className="text-[10px] sm:text-xs text-slate-500">Zero response queue latency</p>
            </div>
            
            <div className="space-y-2 p-2">
              <div className="w-10 h-10 rounded-2xl bg-[#fbbc05]/10 flex items-center justify-center text-[#fbbc05] mx-auto">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Higher Conversions</h4>
              <p className="text-[10px] sm:text-xs text-slate-500">Consistent workflow conversion</p>
            </div>
            
            <div className="space-y-2 p-2">
              <div className="w-10 h-10 rounded-2xl bg-[#34a853]/10 flex items-center justify-center text-[#34a853] mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Save Time</h4>
              <p className="text-[10px] sm:text-xs text-slate-500">Automate admin tasks</p>
            </div>
            
            <div className="space-y-2 p-2">
              <div className="w-10 h-10 rounded-2xl bg-[#1a73e8]/10 flex items-center justify-center text-[#1a73e8] mx-auto">
                <DollarSign className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Reduce Costs</h4>
              <p className="text-[10px] sm:text-xs text-slate-500">Fraction of human staff costs</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid (AI Employees Options) */}
      <section id="features" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Meet Your New AI Employees</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
            Choose from our pre-configured role templates. Each employee is trained on your custom business context, guidelines, and database integration within hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
          
          {/* Card 1: AI Receptionist */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 group">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-[#1a73e8] group-hover:scale-110 transition-transform">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">AI Receptionist</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  A virtual receptionist that answers customer voice queries and books appointments instantly to Google Calendar or your CRM.
                </p>
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Key Capabilities</span>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> Multi-line concurrent answering</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> Integrates with Calendly & Zoho</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> Human secretary routing rules</li>
                </ul>
              </div>
            </div>
            
            <a 
              href="#demo" 
              className="mt-8 w-full block text-center py-3 border border-blue-600 hover:bg-[#1a73e8] hover:text-white rounded-2xl text-xs font-bold uppercase tracking-wider text-[#1a73e8] transition-colors"
            >
              Hire Receptionist
            </a>
          </div>

          {/* Card 2: WhatsApp Lead Qualifier */}
          <div className="bg-white rounded-3xl border border-slate-200/85 p-6 flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-xl transition-all duration-300 group">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-[#34a853] group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">WhatsApp Lead Agent</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Engages cold/warm leads via WhatsApp. Runs qualification playbooks, scores leads, and logs contact details into your database.
                </p>
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Key Capabilities</span>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> Official WhatsApp Meta API integration</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> Custom lead scoring models</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> Automatic client follow-up scheduling</li>
                </ul>
              </div>
            </div>
            
            <a 
              href="#demo" 
              className="mt-8 w-full block text-center py-3 border border-emerald-600 hover:bg-[#34a853] hover:text-white rounded-2xl text-xs font-bold uppercase tracking-wider text-[#34a853] transition-colors"
            >
              Hire WhatsApp Agent
            </a>
          </div>

          {/* Card 3: Document RAG Search */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-xl transition-all duration-300 group">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-[#fbbc05] group-hover:scale-110 transition-transform">
                <Database className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Document RAG Agent</h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Indexes training manuals, corporate PDFs, and FAQ files. Answers employee or client queries with source-backed evidence.
                </p>
              </div>
              
              <div className="border-t border-slate-100 pt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">Key Capabilities</span>
                <ul className="space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> High-performance semantic vector search</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> Supports PDFs, DOCX, TXT, CSV files</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#34a853] shrink-0" /> Built-in text-embedding-004 generator</li>
                </ul>
              </div>
            </div>
            
            <a 
              href="#demo" 
              className="mt-8 w-full block text-center py-3 border border-amber-600 hover:bg-[#fbbc05] hover:text-white rounded-2xl text-xs font-bold uppercase tracking-wider text-[#fbbc05] transition-colors"
            >
              Hire RAG Agent
            </a>
          </div>

        </div>
      </section>

      {/* RAG Preview / Workflow Showcase */}
      <section className="bg-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded bg-[#1a73e8]/10 text-xs font-bold text-[#1a73e8] uppercase tracking-wider">
              Autonomous Intelligence
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
              Enterprise-Ready Integrations. Zero Configuration.
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-light">
              Your AI employees connect directly to Zoho, Salesforce, Google Workspace, WhatsApp Meta, and customized Supabase databases using secure webhooks.
            </p>
            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded bg-[#34a853]/15 flex items-center justify-center text-[#34a853] shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Full-Scale Memory Context</h4>
                  <p className="text-xs text-slate-400 mt-0.5">AI staff remembers user context between multiple conversation turns.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded bg-[#34a853]/15 flex items-center justify-center text-[#34a853] shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Fast Local Mocking Engine</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Instantly prototype flows offline using our embedded mock database.</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mock integration hub styling */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-950 flex flex-col gap-4 relative">
            <div className="absolute top-0 right-0 -translate-y-4 translate-x-4 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Connected Integration Workspace</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Supabase API Hook</h4>
                    <p className="text-[10px] text-slate-500">Syncs users, chats, & document logs</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Active</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#ea4335]/10 flex items-center justify-center text-[#ea4335] border border-[#ea4335]/10">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Google Calendar Sync</h4>
                    <p className="text-[10px] text-slate-500">Auto-schedules voice reception slots</p>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Active</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 opacity-60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#fbbc05]/10 flex items-center justify-center text-[#fbbc05] border border-[#fbbc05]/10">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">CRM Webhook (n8n/Zoho)</h4>
                    <p className="text-[10px] text-slate-500">Funnels leads for workflow execution</p>
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-bold uppercase">Pending</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Request Demo Section */}
      <section id="demo" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center">
          <div className="absolute top-0 right-0 -translate-y-8 translate-x-8 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
          
          <div className="space-y-6 lg:w-1/2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 leading-tight">
              Deploy Your First AI Employee Today
            </h2>
            <p className="text-sm sm:text-base text-slate-500 leading-relaxed font-medium">
              Schedule a brief demo. Tell us what repetitive operations your business runs, and we'll blueprint an autonomous AI agent to take it over.
            </p>
            <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>● Takes ~5 minutes</span>
              <span>(= Complete mock plan</span>
            </div>
          </div>

          <div className="w-full lg:w-1/2 p-6 rounded-2xl border border-slate-200 bg-slate-50 relative">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6">Demo Application Form</h3>
            <form action="#" className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. John" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Business Email</label>
                  <input 
                    type="email" 
                    required 
                    placeholder="e.g. john@co.com" 
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500" 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested AI Role</label>
                <select className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:border-blue-500">
                  <option>AI Voice Receptionist</option>
                  <option>WhatsApp Lead Qualifier</option>
                  <option>Document RAG Knowledge Base</option>
                  <option>Custom Workflow Agent</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition-all duration-200"
              >
                Schedule Deployment Demo
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400 space-y-4">
        <div className="flex justify-center items-center gap-2">
          <GRLogo className="w-6 h-6" />
          <span className="font-extrabold tracking-wider text-slate-700">GROVAITECH</span>
        </div>
        <p className="max-w-md mx-auto">
          "We Don't Sell Software. We Deploy AI Employees."
        </p>
        <div className="flex justify-center gap-6 text-slate-400 font-semibold pt-2">
          <a href="#features" className="hover:text-blue-600 transition">Features</a>
          <a href="#benefits" className="hover:text-blue-600 transition">Benefits</a>
          <a href="#demo" className="hover:text-blue-600 transition">Contact</a>
        </div>
        <p className="pt-4">© 2026 Grovaitech. Smarter Automation. Stronger Business. Better Future.</p>
      </footer>
    </main>
  )
}
