'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  MessageSquare,
  Users,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Bot,
  Workflow as WorkflowIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Zap,
  Globe,
  PhoneCall,
  Activity,
  Layers,
  Award,
} from 'lucide-react'

// ─── Data Models & Registries ────────────────────────────────────────────────

interface EmployeeMetric {
  name: string
  slug: string
  role: string
  status: 'DEMO' | 'IN PROGRESS' | 'UNDER DEVELOPMENT'
  statusCls: string
  conversations: number
  leads: number
  appointments: number
  conversionRate: number
  impactScore: number
}

interface WorkflowMetric {
  name: string
  status: 'ACTIVE' | 'IN PROGRESS' | 'DRAFT'
  statusCls: string
  totalRuns: number
  successRate: number
  failedRuns: number
  assignedEmployee: string
}

interface ActivityEvent {
  id: string
  type: 'lead' | 'appointment' | 'workflow' | 'conversation' | 'escalation'
  title: string
  description: string
  time: string
  metric?: string
  statusCls?: string
}

export function AnalyticsWorkspace() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [chartMetric, setChartMetric] = useState<'total' | 'ai' | 'human'>('total')
  const [exportNotice, setExportNotice] = useState(false)

  // 1. KPI Summary Data
  const kpis = [
    {
      label: 'Total Conversations',
      value: '1,428',
      change: '+18.4%',
      isPositive: true,
      sub: '94.2% AI automated',
      icon: MessageSquare,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      label: 'Leads Captured',
      value: '264',
      change: '+24.1%',
      isPositive: true,
      sub: '18.5% of total chats',
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Appointments Booked',
      value: '48',
      change: '+12.5%',
      isPositive: true,
      sub: 'Direct calendar locks',
      icon: Calendar,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      label: 'Conversion Rate',
      value: '18.5%',
      change: '+3.2%',
      isPositive: true,
      sub: 'Visitor to qualified lead',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
    },
    {
      label: 'Estimated Pipeline Value',
      value: '₹3.42 Cr',
      change: '+₹45L this mo.',
      isPositive: true,
      sub: 'Demo estimated value',
      icon: DollarSign,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
  ]

  // 2. Conversation Chart Points (12 interval series)
  const totalSeries = [45, 62, 58, 80, 110, 95, 125, 140, 130, 160, 175, 190]
  const aiSeries = [42, 58, 55, 76, 104, 90, 118, 134, 124, 152, 166, 180]
  const humanSeries = [3, 4, 3, 4, 6, 5, 7, 6, 6, 8, 9, 10]

  const activeSeries = chartMetric === 'ai' ? aiSeries : chartMetric === 'human' ? humanSeries : totalSeries
  const maxVal = Math.max(...activeSeries)
  const chartWidth = 600
  const chartHeight = 160

  const coordinates = activeSeries.map((point, index) => {
    const x = (index / (activeSeries.length - 1)) * chartWidth
    const y = chartHeight - (point / maxVal) * (chartHeight - 30)
    return `${x},${y}`
  })

  const pathData = `M 0,${chartHeight} L ${coordinates.join(' L ')} L ${chartWidth},${chartHeight} Z`
  const strokePathData = `M ${coordinates.join(' L ')}`

  // 3. Lead Funnel Data
  const funnelSteps = [
    { step: 'New Inquiries', count: 1428, pct: 100, color: 'bg-blue-500' },
    { step: 'Contacted & Engaged', count: 890, pct: 62.3, color: 'bg-indigo-500' },
    { step: 'AI Qualified', count: 264, pct: 18.5, color: 'bg-purple-500' },
    { step: 'Site Visit / Appt.', count: 48, pct: 3.4, color: 'bg-amber-500' },
    { step: 'Converted Client', count: 18, pct: 1.3, color: 'bg-emerald-500' },
  ]

  // 4. Canonical 10 AI Employees Metrics
  const employeeMetrics: EmployeeMetric[] = [
    {
      name: 'Real Estate Lead Receptionist',
      slug: 'real-estate-lead-receptionist',
      role: 'Sales / Lead Capture',
      status: 'DEMO',
      statusCls: 'bg-blue-50 text-blue-700 border-blue-200',
      conversations: 642,
      leads: 142,
      appointments: 28,
      conversionRate: 22.1,
      impactScore: 96,
    },
    {
      name: 'Clinic Receptionist',
      slug: 'clinic-receptionist',
      role: 'Operations / Bookings',
      status: 'IN PROGRESS',
      statusCls: 'bg-amber-50 text-amber-700 border-amber-200',
      conversations: 384,
      leads: 58,
      appointments: 20,
      conversionRate: 15.1,
      impactScore: 84,
    },
    {
      name: 'WhatsApp Lead Agent',
      slug: 'whatsapp-lead-agent',
      role: 'Sales / WhatsApp',
      status: 'IN PROGRESS',
      statusCls: 'bg-amber-50 text-amber-700 border-amber-200',
      conversations: 265,
      leads: 48,
      appointments: 0,
      conversionRate: 18.1,
      impactScore: 78,
    },
    {
      name: 'Salon & Spa Receptionist',
      slug: 'salon-spa-receptionist',
      role: 'Operations / Appointments',
      status: 'IN PROGRESS',
      statusCls: 'bg-amber-50 text-amber-700 border-amber-200',
      conversations: 82,
      leads: 12,
      appointments: 0,
      conversionRate: 14.6,
      impactScore: 52,
    },
    {
      name: 'Customer Support Agent',
      slug: 'customer-support-agent',
      role: 'Support / Tier-1',
      status: 'UNDER DEVELOPMENT',
      statusCls: 'bg-slate-100 text-slate-500 border-slate-200',
      conversations: 45,
      leads: 4,
      appointments: 0,
      conversionRate: 8.8,
      impactScore: 40,
    },
    {
      name: 'AI QA Inspector',
      slug: 'ai-qa-inspector',
      role: 'Operations / Quality',
      status: 'UNDER DEVELOPMENT',
      statusCls: 'bg-slate-100 text-slate-500 border-slate-200',
      conversations: 10,
      leads: 0,
      appointments: 0,
      conversionRate: 0,
      impactScore: 30,
    },
    {
      name: 'Legal Intake Agent',
      slug: 'legal-intake-agent',
      role: 'Sales / Legal Intake',
      status: 'UNDER DEVELOPMENT',
      statusCls: 'bg-slate-100 text-slate-500 border-slate-200',
      conversations: 0,
      leads: 0,
      appointments: 0,
      conversionRate: 0,
      impactScore: 0,
    },
    {
      name: 'E-Commerce Support Agent',
      slug: 'ecommerce-support-agent',
      role: 'Support / Orders',
      status: 'UNDER DEVELOPMENT',
      statusCls: 'bg-slate-100 text-slate-500 border-slate-200',
      conversations: 0,
      leads: 0,
      appointments: 0,
      conversionRate: 0,
      impactScore: 0,
    },
    {
      name: 'HR Onboarding Agent',
      slug: 'hr-onboarding-agent',
      role: 'Operations / HR',
      status: 'UNDER DEVELOPMENT',
      statusCls: 'bg-slate-100 text-slate-500 border-slate-200',
      conversations: 0,
      leads: 0,
      appointments: 0,
      conversionRate: 0,
      impactScore: 0,
    },
    {
      name: 'Financial Advisory Agent',
      slug: 'financial-advisory-agent',
      role: 'Sales / KYC Intake',
      status: 'UNDER DEVELOPMENT',
      statusCls: 'bg-slate-100 text-slate-500 border-slate-200',
      conversations: 0,
      leads: 0,
      appointments: 0,
      conversionRate: 0,
      impactScore: 0,
    },
  ]

  // 5. Canonical 6 Workflows Metrics
  const workflowMetrics: WorkflowMetric[] = [
    {
      name: 'Real Estate Lead ➔ WhatsApp & Site Visit Sync',
      status: 'ACTIVE',
      statusCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      totalRuns: 48,
      successRate: 100,
      failedRuns: 0,
      assignedEmployee: 'Real Estate Lead Receptionist',
    },
    {
      name: 'Clinic Appointment Booking & Reminder Pipeline',
      status: 'ACTIVE',
      statusCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      totalRuns: 62,
      successRate: 98.4,
      failedRuns: 1,
      assignedEmployee: 'Clinic Receptionist',
    },
    {
      name: 'Urgent Escalation ➔ Human Agent Dispatch',
      status: 'ACTIVE',
      statusCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      totalRuns: 14,
      successRate: 100,
      failedRuns: 0,
      assignedEmployee: 'Customer Support Agent',
    },
    {
      name: 'Inbound WhatsApp Lead Qualification Pipeline (n8n)',
      status: 'IN PROGRESS',
      statusCls: 'bg-blue-50 text-blue-700 border-blue-200',
      totalRuns: 18,
      successRate: 94.4,
      failedRuns: 1,
      assignedEmployee: 'WhatsApp Lead Agent',
    },
    {
      name: 'AI QA Interaction Audit & Quality Scoring',
      status: 'IN PROGRESS',
      statusCls: 'bg-blue-50 text-blue-700 border-blue-200',
      totalRuns: 0,
      successRate: 100,
      failedRuns: 0,
      assignedEmployee: 'AI QA Inspector',
    },
    {
      name: 'Legal Consultation Intake & Conflict Check',
      status: 'DRAFT',
      statusCls: 'bg-slate-100 text-slate-500 border-slate-200',
      totalRuns: 0,
      successRate: 100,
      failedRuns: 0,
      assignedEmployee: 'Legal Intake Agent',
    },
  ]

  // 6. Recent Activity Stream
  const activityEvents: ActivityEvent[] = [
    {
      id: 'ev-1',
      type: 'lead',
      title: 'High-Value Lead Captured',
      description: 'Suresh Kumar qualified for 3BHK Villa (₹1.2 Cr) in Tirupati.',
      time: '12m ago',
      metric: 'Score: 85',
      statusCls: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'ev-2',
      type: 'appointment',
      title: 'Site Visit Confirmed',
      description: 'Saturday 11:00 AM slot booked for Ram Charan at Fortune Gardens.',
      time: '45m ago',
      metric: 'Calendar Blocked',
      statusCls: 'text-purple-600 bg-purple-50 border-purple-100',
    },
    {
      id: 'ev-3',
      type: 'workflow',
      title: 'Workflow Executed: Real Estate Sync',
      description: 'Dispatched WhatsApp template & synced lead record to CRM.',
      time: '1h ago',
      metric: 'Latency: 320ms',
      statusCls: 'text-blue-600 bg-blue-50 border-blue-100',
    },
    {
      id: 'ev-4',
      type: 'conversation',
      title: 'Conversation Resolved',
      description: 'Patient Priya Sharma booked Dr. Verma dental appointment.',
      time: '2h ago',
      metric: 'AI Automated',
      statusCls: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
    {
      id: 'ev-5',
      type: 'escalation',
      title: 'Human Escalation Dispatched',
      description: 'Lakshmi Devi requested live agent. Slack alert sent to team.',
      time: '4h ago',
      metric: 'Escalated',
      statusCls: 'text-amber-600 bg-amber-50 border-amber-100',
    },
  ]

  const handleExport = () => {
    setExportNotice(true)
    setTimeout(() => setExportNotice(false), 3000)
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            AI Workforce OS
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Analytics</h1>
            <span className="text-[8px] px-2 py-0.5 rounded-full font-black border bg-amber-50 text-amber-600 border-amber-200 uppercase tracking-wide">
              Demo Simulation
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Real-time performance console measuring AI Employee conversations, lead qualification, and workflow execution.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {/* Time Range Selector */}
          <div className="flex rounded-xl bg-white border border-slate-200 p-0.5 shadow-2xs">
            {(['7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  timeRange === r ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r === '7d' ? 'Last 7 Days' : r === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </button>
            ))}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 font-semibold flex items-center justify-between animate-fade-in">
          <span>📊 Analytics report exported successfully (Simulated CSV download).</span>
          <button onClick={() => setExportNotice(false)} className="text-blue-500 hover:text-blue-700 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* ── 2. Top KPI Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between hover:shadow-xs transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${kpi.color}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 space-y-0.5">
              <span className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</span>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" /> {kpi.change}
                </span>
                <span className="text-[9px] text-slate-400 font-medium">{kpi.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. Row: Conversation Volume Chart + Lead Source Donut ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversation Performance Chart (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Conversation Volume & Automation
              </h3>
              <p className="text-[11px] text-slate-500">
                Daily conversations handled autonomously by AI Employees vs. Human Escalations
              </p>
            </div>
            {/* Metric Filter Tabs */}
            <div className="flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
              {[
                { id: 'total', label: 'All Chats' },
                { id: 'ai', label: 'AI Automated (94%)' },
                { id: 'human', label: 'Human Handled (6%)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setChartMetric(m.id as any)}
                  className={`px-2.5 py-1 rounded-md transition ${
                    chartMetric === m.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 overflow-visible text-blue-600">
              <defs>
                <linearGradient id="analytics-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Gridlines */}
              <line x1="0" y1="20" x2={chartWidth} y2="20" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="80" x2={chartWidth} y2="80" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2={chartWidth} y2="140" stroke="#E2E8F0" strokeWidth="1" />
              <path d={pathData} fill="url(#analytics-area-grad)" />
              <path
                d={strokePathData}
                fill="none"
                stroke="#2563EB"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex justify-between text-[9px] text-slate-400 font-bold px-1 mt-2">
              <span>Day 1</span>
              <span>Day 6</span>
              <span>Day 12</span>
              <span>Day 18</span>
              <span>Day 24</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Lead Source Breakdown Donut (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Lead Acquisition Sources</h3>
            <p className="text-[11px] text-slate-500">Breakdown of 264 qualified leads</p>
          </div>

          <div className="flex flex-col items-center justify-center pt-2">
            <svg viewBox="0 0 36 36" className="w-28 h-28 transform -rotate-90">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F8FAFC" strokeWidth="3.5" />
              {/* WhatsApp (45%) */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#10B981"
                strokeWidth="3.5"
                strokeDasharray="45 55"
                strokeDashoffset="0"
              />
              {/* Website (30%) */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3.5"
                strokeDasharray="30 70"
                strokeDashoffset="-45"
              />
              {/* AI Demo (15%) */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="3.5"
                strokeDasharray="15 85"
                strokeDashoffset="-75"
              />
              {/* Other (10%) */}
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3.5"
                strokeDasharray="10 90"
                strokeDashoffset="-90"
              />
            </svg>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] font-bold text-slate-600 mt-4 w-full px-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> WhatsApp (45%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> Website (30%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" /> AI Demo (15%)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Other (10%)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Row: Lead Funnel & Revenue Impact Card ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lead Qualification Funnel (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Autonomous Lead Funnel
              </h3>
              <p className="text-[11px] text-slate-500">
                Conversion stages from inbound inquiry to closed transaction
              </p>
            </div>
            <Link href="/leads" className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5">
              View CRM <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {funnelSteps.map((f, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[10px] flex items-center justify-center font-black">
                      {idx + 1}
                    </span>
                    {f.step}
                  </span>
                  <span className="text-slate-900 font-extrabold">
                    {f.count} <span className="text-[10px] text-slate-400 font-medium">({f.pct}%)</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${f.color} rounded-full transition-all duration-500`} style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Impact & Business Results (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 bg-white shadow-2xl space-y-4 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Business Revenue Impact</h3>
              <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                Simulated
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Pipeline generated by deployed AI workforce</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Estimated Pipeline</span>
              <p className="text-xl font-black text-slate-900 mt-1">₹3.42 Cr</p>
              <span className="text-[9px] text-emerald-600 font-bold">+18.5% MoM</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Converted Revenue</span>
              <p className="text-xl font-black text-emerald-600 mt-1">₹34.5 Lakhs</p>
              <span className="text-[9px] text-slate-500 font-bold">18 Closed Sales</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">AI Influenced</span>
              <p className="text-xl font-black text-blue-600 mt-1">88.4%</p>
              <span className="text-[9px] text-slate-500 font-bold">Touchpoints</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Site Visits Booked</span>
              <p className="text-xl font-black text-purple-600 mt-1">48</p>
              <span className="text-[9px] text-slate-500 font-bold">Direct Calendar</span>
            </div>
          </div>

          <p className="text-[9px] text-slate-400 italic">
            * Revenue and pipeline calculations are based on verified qualified lead budgets captured across Real Estate & Clinic workers.
          </p>
        </div>
      </div>

      {/* ── 5. Row: Top 3 Performing AI Workers ───────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Top Performing AI Employees
            </h3>
            <p className="text-[11px] text-slate-500">Highest business impact by qualified leads & conversion rate</p>
          </div>
          <Link href="/ai-employees" className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5">
            View All 10 Employees <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {employeeMetrics.slice(0, 3).map((emp, rank) => (
            <div
              key={emp.slug}
              className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs transition relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">{emp.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold">{emp.role}</p>
                  </div>
                </div>
                <span className="w-6 h-6 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-black flex items-center justify-center">
                  #{rank + 1}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Chats</span>
                  <p className="text-sm font-black text-slate-800">{emp.conversations}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Leads</span>
                  <p className="text-sm font-black text-emerald-600">{emp.leads}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Conv. %</span>
                  <p className="text-sm font-black text-blue-600">{emp.conversionRate}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. Row: AI Employee Workforce Performance Table ──────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Canonical AI Workforce Performance Table (10 Employees)
            </h3>
            <p className="text-[11px] text-slate-500">Cross-channel throughput metrics</p>
          </div>
          <Link href="/ai-employees" className="text-[10px] text-blue-600 hover:text-blue-700 font-bold">
            Manage Workforce →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {['AI Employee', 'Role & Dept', 'Status', 'Chats', 'Leads', 'Appts', 'Conv. Rate', 'Impact'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-black whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employeeMetrics.map((emp, i) => (
                <tr
                  key={emp.slug}
                  className={`border-b border-slate-100 transition ${
                    i % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/30 hover:bg-slate-50/80'
                  }`}
                >
                  <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{emp.name}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{emp.role}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${emp.statusCls}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{emp.conversations}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{emp.leads}</td>
                  <td className="px-4 py-3 font-bold text-purple-600">{emp.appointments}</td>
                  <td className="px-4 py-3 font-bold text-blue-600">{emp.conversionRate}%</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${emp.impactScore}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">{emp.impactScore}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 7. Row: Workflow Performance Table & Recent Activity ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Workflow Reliability (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
          <div>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Automation & Workflow Health
                </h3>
                <p className="text-[11px] text-slate-500">Execution statistics of 6 registered pipelines</p>
              </div>
              <Link href="/workflows" className="text-[10px] text-blue-600 hover:text-blue-700 font-bold">
                Workflows →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {['Workflow Pipeline', 'Status', 'Runs', 'Reliability'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-black whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workflowMetrics.map((wf, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-800 max-w-xs truncate">{wf.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full border text-[8px] font-bold ${wf.statusCls}`}>
                          {wf.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">{wf.totalRuns} runs</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-bold text-emerald-600">{wf.successRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Real-time Activity Stream (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent System Events</h3>
            <p className="text-[11px] text-slate-500">Live feed across conversations, leads, and workflows</p>
          </div>

          <div className="space-y-3">
            {activityEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 truncate">{ev.title}</h5>
                    <span className="text-[9px] text-slate-400 font-semibold">{ev.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
