'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  MessageSquare, 
  Users, 
  FileText, 
  TrendingUp, 
  ArrowUpRight, 
  Activity, 
  Bot, 
  ChevronRight,
  Plus,
  Play
} from 'lucide-react'
import ClinicBooking from '@/components/ClinicBooking'

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    conversations: 1248,
    activeAgents: 4,
    documents: 8,
    leads: 236
  })
  const [recentClients, setRecentClients] = useState<any[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Fetch mock clients to display on home
      const { data: clients } = await supabase.from('clients').select().limit(3)
      if (clients) setRecentClients(clients)
      
      // Load actual counts from mockDb if any
      const { data: chats } = await supabase.from('chats').select()
      const { data: docs } = await supabase.from('documents').select()
      
      setStats(prev => ({
        ...prev,
        conversations: chats ? 1240 + chats.length : prev.conversations,
        documents: docs ? docs.length : prev.documents
      }))
    }
    loadData()
  }, [supabase])

  const statsCards = [
    { name: 'Total Chats Answering', value: stats.conversations, change: '+14% this month', icon: MessageSquare, color: 'from-blue-500/20 to-indigo-500/20', textcolor: 'text-blue-400' },
    { name: 'Active AI Employees', value: stats.activeAgents, change: '24/7 Monitoring', icon: Bot, color: 'from-purple-500/20 to-pink-500/20', textcolor: 'text-purple-400' },
    { name: 'Uploaded Documents', value: stats.documents, change: 'Vector Index Ready', icon: FileText, color: 'from-emerald-500/20 to-teal-500/20', textcolor: 'text-emerald-400' },
    { name: 'WhatsApp Qualified Leads', value: stats.leads, change: '18.4% Conv. Rate', icon: TrendingUp, color: 'from-amber-500/20 to-orange-500/20', textcolor: 'text-amber-400' }
  ]

  const mockActivities = [
    { id: 1, type: 'call', title: 'AI Receptionist handled booking', desc: 'Apollo Dental - Dr. Verma (2:30 PM slot booked)', time: '10 mins ago', status: 'success' },
    { id: 2, type: 'lead', title: 'New Whatsapp Lead Qualified', desc: 'Suresh Kumar - salon booking query scored 92/100', time: '45 mins ago', status: 'success' },
    { id: 3, type: 'doc', title: 'Document RAG vectorized', desc: 'dental_clinic_faqs.pdf compiled into 146 segments', time: '3 hours ago', status: 'info' },
    { id: 4, type: 'agent', title: 'Custom AI Employee deployed', desc: 'Vector search initialized for Reddy Law Chambers', time: '1 day ago', status: 'success' }
  ]

  // SVG Area Chart Data Points (Simulating daily conversations)
  const chartPoints = [20, 35, 28, 45, 60, 52, 70, 65, 85, 78, 95, 110]
  const maxVal = Math.max(...chartPoints)
  const chartWidth = 500
  const chartHeight = 120
  
  // Convert data points to SVG path coordinates
  const coordinates = chartPoints.map((point, index) => {
    const x = (index / (chartPoints.length - 1)) * chartWidth
    const y = chartHeight - (point / maxVal) * (chartHeight - 20)
    return `${x},${y}`
  })
  
  const pathData = `M 0,${chartHeight} L ${coordinates.join(' L ')} L ${chartWidth},${chartHeight} Z`
  const strokePathData = `M ${coordinates.join(' L ')}`

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl border border-[#1E293B] bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 rounded-full bg-[#3B82F6]/10 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 space-y-2.5 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/5 text-xs text-[#60A5FA] font-medium">
            <Bot className="w-3.5 h-3.5" /> GROVAITECH Agent Core Active
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight pt-1">
            Welcome back, <span className="text-[#3B82F6]">{user?.full_name || 'Administrator'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] font-bold leading-relaxed pt-1">
            "We Don't Sell Software. We Deploy AI Employees."
          </p>
          <p className="text-[11px] text-[#94A3B8] leading-relaxed pt-0.5">
            Your active AI employees are working 24/7 in Tirupati, Nellore, and Chennai to book appointments and qualify leads.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, i) => (
          <div key={i} className="p-5 rounded-2xl border border-[#1E293B] bg-[#1E293B]/70 hover:bg-[#1E293B] transition-all duration-300 relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-tr from-transparent to-[#0F172A]/20 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#94A3B8] tracking-wide uppercase">{card.name}</span>
              <div className={`p-2 rounded-xl bg-[#3B82F6]/10 ${card.textcolor} group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <span className="text-2xl font-bold text-white tracking-tight">{card.value}</span>
              <p className="text-[10px] font-semibold text-[#60A5FA]">{card.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Graph + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Graph (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Daily Traffic Overview</h3>
              <p className="text-[11px] text-[#94A3B8]">Conversations managed daily by all AI agents</p>
            </div>
            <select className="bg-[#0F172A] border border-[#1E293B] text-[10px] font-medium text-[#94A3B8] rounded-lg px-2 py-1 focus:outline-none">
              <option>Last 12 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          
          {/* Custom SVG Graph */}
          <div className="relative pt-4 w-full">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-40 overflow-visible text-[#3B82F6]"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Grid lines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="70" x2={chartWidth} y2="70" stroke="#1E293B" strokeWidth="0.5" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2={chartWidth} y2="120" stroke="#1E293B" strokeWidth="0.5" />

              {/* Area path */}
              <path d={pathData} fill="url(#gradient-area)" />
              {/* Stroke line */}
              <path d={strokePathData} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex justify-between text-[9px] text-[#94A3B8] font-medium px-1 mt-2">
              <span>Day 1</span>
              <span>Day 4</span>
              <span>Day 8</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Recent Activity (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Live Agents Activity</h3>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            
            <div className="space-y-4">
              {mockActivities.map((act) => (
                <div key={act.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#0F172A] flex items-center justify-center shrink-0 border border-[#1E293B]">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{act.title}</p>
                    <p className="text-[10px] text-[#94A3B8] truncate mt-0.5">{act.desc}</p>
                  </div>
                  <span className="text-[9px] text-[#94A3B8] shrink-0">{act.time}</span>
                </div>
              ))}
            </div>
          </div>

          <Link 
            href="/dashboard/chat" 
            className="w-full mt-4 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] text-[11px] font-semibold text-white rounded-xl transition-all"
          >
            Launch Chat Workspace <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Row 3: Recent Clients + Quick Setup shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Clients List */}
        <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Client Integrations</h3>
              <p className="text-[11px] text-[#94A3B8]">Overview of client platforms active on Grovaitech</p>
            </div>
            <Link href="/dashboard/clients" className="text-[10px] text-[#3B82F6] hover:text-[#60A5FA] font-bold flex items-center gap-1">
              Manage Clients <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentClients.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">No client integrations found.</div>
            ) : (
              recentClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0F172A]/50 border border-[#1E293B]/60 hover:border-[#1E293B] transition-colors">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">{client.name}</h4>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{client.industry} • {client.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      client.status === 'Active' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {client.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Employee Template cards */}
        <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/30 backdrop-blur-xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Deploy AI Employees</h3>
            <p className="text-[11px] text-[#94A3B8]">Pick a pre-configured workflow agent template to launch immediately</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link 
              href="/dashboard/chat" 
              className="p-4 rounded-xl border border-[#1E293B]/80 bg-[#0F172A]/40 hover:bg-[#1E293B]/60 hover:border-[#3B82F6]/60 transition-all duration-200 group text-left"
            >
              <Bot className="w-5 h-5 text-[#3B82F6] mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-semibold text-slate-200">AI Receptionist</h4>
              <p className="text-[10px] text-[#94A3B8] mt-1 leading-normal">
                Handles voice calls and schedules appointments to Google Calendar.
              </p>
            </Link>

            <Link 
              href="/dashboard/documents" 
              className="p-4 rounded-xl border border-[#1E293B]/80 bg-[#0F172A]/40 hover:bg-[#1E293B]/60 hover:border-[#3B82F6]/60 transition-all duration-200 group text-left"
            >
              <FileText className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
              <h4 className="text-xs font-semibold text-slate-200">Document RAG Agent</h4>
              <p className="text-[10px] text-[#94A3B8] mt-1 leading-normal">
                Indexes business policy and FAQs to answer customer inquiries.
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* Clinic Bookings Reception Section */}
      <div className="p-6 rounded-2xl border border-[#1E293B] bg-[#1E293B]/20 backdrop-blur-xl">
        <ClinicBooking />
      </div>
    </div>
  )
}
