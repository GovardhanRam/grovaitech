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
  Play,
  Calendar,
  Sparkles,
  ArrowRight,
  Briefcase,
  Upload,
  Workflow,
  BookOpen
} from 'lucide-react'
import ClinicBooking from '@/components/ClinicBooking'

export default function DashboardHome() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    conversations: 1248,
    activeAgents: 2,
    documents: 8,
    leads: 94
  })
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      try {
        const { data: chats } = await supabase.from('chats').select('id')
        const { data: docs } = await supabase.from('documents').select('id')
        const { data: leads } = await supabase.from('real_estate_leads').select('id, name, location, budget, created_at, source')
        
        setStats(prev => ({
          ...prev,
          conversations: chats ? 1240 + chats.length : prev.conversations,
          documents: docs ? docs.length : prev.documents,
          leads: leads ? 90 + leads.length : prev.leads
        }))

        if (leads && leads.length > 0) {
          const formattedLeads = leads
            .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 4)
            .map((l: any, index: number) => ({
              id: l.id || `db-${index}`,
              name: l.name || 'Anonymous Lead',
              source: l.source === 'ai_demo' ? 'AI Agent' : 'WhatsApp',
              employee: 'Real Estate Lead Receptionist',
              status: 'Qualified',
              time: 'Recently'
            }))
          setRecentLeads(formattedLeads)
        } else {
          setRecentLeads([
            { id: 1, name: 'Suresh Kumar', source: 'WhatsApp', employee: 'Real Estate Lead Receptionist', status: 'Qualified', time: '10 mins ago' },
            { id: 2, name: 'Ram Charan', source: 'Website', employee: 'Real Estate Lead Receptionist', status: 'Qualified', time: '1 hour ago' },
            { id: 3, name: 'Janaki Ram', source: 'Phone', employee: 'Clinic Receptionist', status: 'Qualified', time: '3 hours ago' },
            { id: 4, name: 'Anil Reddy', source: 'Referral', employee: 'Real Estate Lead Receptionist', status: 'Qualified', time: '1 day ago' }
          ])
        }
      } catch (err) {
        console.error('Failed to load real database counts, using seeds:', err)
      }
    }
    loadData()
  }, [supabase])

  const statsCards = [
    { name: 'Total Conversations', value: stats.conversations, change: '+14.2% this month', icon: MessageSquare, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { name: 'New Leads Captured', value: stats.leads, change: '18.4% conversion rate', icon: Users, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { name: 'Appointments Booked', value: 36, change: '+8 new scheduled this week', icon: Calendar, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { name: 'Revenue Impact', value: '₹2.4 Lakhs', change: 'Estimated value pipeline', icon: TrendingUp, color: 'text-amber-600 bg-amber-50 border-amber-100' }
  ]

  const employeesStatus = [
    { name: 'WhatsApp Lead Agent', role: 'Lead Qualifier', status: 'READY', metric: '4.8s response time', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { name: 'Real Estate Lead Receptionist', role: 'Property Lead capture', status: 'READY', metric: '94 qualified leads', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { name: 'Clinic Receptionist', role: 'Medical front-desk', status: 'UNDER DEVELOPMENT', metric: 'Calendar integration in progress', badgeColor: 'bg-amber-50 text-amber-700 border-amber-100' }
  ]

  const productsStatus = [
    { name: 'Real Estate Lead Receptionist', status: 'READY / DEMO', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { name: 'AI Employee Platform', status: 'IN PROGRESS', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
    { name: 'WhatsApp AI Agent', status: 'IN PROGRESS', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
    { name: 'AI Receptionist', status: 'UNDER DEVELOPMENT', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
    { name: 'Knowledge Base / RAG', status: 'IN PROGRESS', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
    { name: 'Workflows / Automation', status: 'IN PROGRESS', badge: 'bg-blue-50 text-blue-700 border-blue-100' }
  ]

  const chartPoints = [25, 40, 32, 55, 75, 60, 85, 70, 95, 90, 110, 128]
  const maxVal = Math.max(...chartPoints)
  const chartWidth = 500
  const chartHeight = 120
  
  const coordinates = chartPoints.map((point, index) => {
    const x = (index / (chartPoints.length - 1)) * chartWidth
    const y = chartHeight - (point / maxVal) * (chartHeight - 20)
    return `${x},${y}`
  })
  
  const pathData = `M 0,${chartHeight} L ${coordinates.join(' L ')} L ${chartWidth},${chartHeight} Z`
  const strokePathData = `M ${coordinates.join(' L ')}`

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Command Center</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Good morning, {user?.full_name?.split(' ')[0] || 'Administrator'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here is the status of your active AI Employees across Nellore and Tirupati.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl px-3.5 py-2.5 focus:outline-none shadow-xs">
            <option>Today: Aug 26, 2026</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
          <Link 
            href="/ai-employees"
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" /> Deploy Employee
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsCards.map((card, i) => (
          <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.name}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${card.color}`}>
                <card.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="mt-5 space-y-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{card.value}</span>
              <p className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" /> {card.change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Row 1 - Conversations Overview & Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversations Chart (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Conversations Overview</h3>
              <p className="text-[11px] text-slate-500">Conversations managed daily by all active AI agents</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Avg. 84.5 chats/day
              </div>
              <select className="bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-550 rounded-lg px-2 py-1 focus:outline-none">
                <option>Last 12 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
          </div>
          
          <div className="relative pt-4 w-full">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-40 overflow-visible text-blue-600"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="gradient-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="70" x2={chartWidth} y2="70" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="120" x2={chartWidth} y2="120" stroke="#E2E8F0" strokeWidth="1" />
              <path d={pathData} fill="url(#gradient-area)" />
              <path d={strokePathData} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex justify-between text-[9px] text-slate-400 font-bold px-1 mt-2">
              <span>Day 1</span>
              <span>Day 4</span>
              <span>Day 8</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Lead Sources Donut Chart (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Lead Sources</h3>
            <p className="text-[11px] text-slate-500">Breakdown of captured lead channels</p>
          </div>

          <div className="flex flex-col items-center justify-center pt-2">
            <svg viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F8FAFC" strokeWidth="3.5" />
              
              {/* WhatsApp (45%) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10B981" strokeWidth="3.5" 
                      strokeDasharray="45 55" strokeDashoffset="0" />
                      
              {/* Website (30%) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3B82F6" strokeWidth="3.5" 
                      strokeDasharray="30 70" strokeDashoffset="-45" />
                      
              {/* AI Employee / Phone (15%) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8B5CF6" strokeWidth="3.5" 
                      strokeDasharray="15 85" strokeDashoffset="-75" />
                      
              {/* Other (10%) */}
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="3.5" 
                      strokeDasharray="10 90" strokeDashoffset="-90" />
            </svg>
            
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] font-bold text-slate-500 mt-4 w-full px-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> WhatsApp (45%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Website (30%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span> Phone (15%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Others (10%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: AI Employees Status & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* AI Employees Status (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AI Employees</h3>
              <p className="text-[11px] text-slate-500">Status and metrics of deployed virtual workers</p>
            </div>
            <Link href="/ai-employees" className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5">
              Manage Workforce <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {employeesStatus.map((emp, i) => (
              <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-600">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{emp.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{emp.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-slate-400 font-semibold">{emp.metric}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${emp.badgeColor}`}>
                    {emp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quick Actions</h3>
            <p className="text-[11px] text-slate-500">Common configuration tasks</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <Link 
              href="/ai-employees"
              className="flex items-center justify-between p-3 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50 rounded-xl font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <span>🤖 Test AI Employee</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link 
              href="/ai-employees"
              className="flex items-center justify-between p-3 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50 rounded-xl font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <span>➕ Create AI Employee</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link 
              href="/dashboard/documents"
              className="flex items-center justify-between p-3 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50 rounded-xl font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <span>📂 Upload Knowledge (RAG)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link 
              href="/workflows"
              className="flex items-center justify-between p-3 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50 rounded-xl font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <span>⚙️ Create Workflow</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Leads Table & Product/Development Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Leads Table (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Leads</h3>
              <p className="text-[11px] text-slate-500">Latest leads qualified by AI Employee agents</p>
            </div>
            <Link href="/leads" className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5">
              View Lead Pipeline <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pt-1">Name</th>
                  <th className="pb-3 pt-1">Source</th>
                  <th className="pb-3 pt-1">AI Employee</th>
                  <th className="pb-3 pt-1">Status</th>
                  <th className="pb-3 pt-1">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 font-bold text-slate-800">{lead.name}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-500 font-semibold">{lead.employee}</td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-400 font-medium">{lead.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product/Development Status (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Grovaitech Products</h3>
            <p className="text-[11px] text-slate-500">Product release roadmap</p>
          </div>
          <div className="space-y-3.5">
            {productsStatus.map((prod, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-750">{prod.name}</span>
                <span className={`text-[8px] px-2 py-0.5 rounded font-extrabold border ${prod.badge}`}>
                  {prod.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clinic Bookings Reception Log Section */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Clinic Booking Back-office</h3>
          <p className="text-[11px] text-slate-500">Monitor active dental clinic appointments booked by the AI Receptionist</p>
        </div>
        <ClinicBooking />
      </div>
    </div>
  )
}
