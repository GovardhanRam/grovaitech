'use client'

/**
 * Grovaitech AI Platform
 * components/dashboard/DashboardWorkspace.tsx
 *
 * Operational Command Center Client Component for Grovaitech AI Workforce OS.
 * Surfaces live operational metrics, real-time workflow logs, and CRM pipeline activity.
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  MessageSquare,
  Users,
  Calendar,
  Workflow,
  ArrowUpRight,
  Bot,
  ChevronRight,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight,
  Database,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import type { GetDashboardDataResult } from '@/types/dashboard'
import { getDashboardData } from '@/app/actions/dashboard'
import ClinicBooking from '@/components/ClinicBooking'
import {
  PageHeader,
  SectionHeader,
  StatCard,
  GovaCard,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  Tabs,
} from '@/components/ui'
import CustomerHomeWorkspace from '@/components/customer/CustomerHomeWorkspace'

interface DashboardWorkspaceProps {
  initialData: GetDashboardDataResult
}

export default function DashboardWorkspace({ initialData }: DashboardWorkspaceProps) {
  const [data, setData] = useState<GetDashboardDataResult>(initialData)
  const [activeView, setActiveView] = useState<'founder' | 'customer'>('founder')
  const [isPending, startTransition] = useTransition()

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const fresh = await getDashboardData()
        setData(fresh)
      } catch (err) {
        console.error('Failed to refresh dashboard data:', err)
      }
    })
  }

  const { stats, recentLeads, recentWorkflows, employeesStatus, leadSources, activityTrend, isFallback } = data

  const dashboardTabs = [
    { id: 'founder', label: 'Founder Command Center' },
    { id: 'customer', label: 'Customer Portal View' },
  ]

  if (activeView === 'customer') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Tabs
            tabs={dashboardTabs}
            activeTab={activeView}
            onChange={(id) => setActiveView(id as 'founder' | 'customer')}
          />
        </div>
        <CustomerHomeWorkspace initialData={data} />
      </div>
    )
  }

  // Chart coordinate calculations
  const chartPoints = activityTrend.length > 0 ? activityTrend : [20, 35, 50, 45, 65, 80, 95, 110, 100, 120, 135, 150]
  const maxVal = Math.max(...chartPoints, 10)
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
      {/* Top View Switcher */}
      <div className="flex items-center justify-between">
        <Tabs
          tabs={dashboardTabs}
          activeTab={activeView}
          onChange={(id) => setActiveView(id as 'founder' | 'customer')}
        />
      </div>

      {/* Page Header */}
      <PageHeader
        title="Founder Command Center"
        subtitle="Live operational telemetry across AI employees, CRM pipelines, and autonomous workflows."
        badge={
          isFallback ? (
            <StatusBadge status="warning" label="Demo Sandbox Mode" />
          ) : (
            <StatusBadge status="live" label="Live Operational Mode" pulse />
          )
        }
        actions={
          <div className="flex items-center gap-2.5">
            <SecondaryButton
              onClick={handleRefresh}
              disabled={isPending}
              isLoading={isPending}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              size="sm"
            >
              Refresh
            </SecondaryButton>
            <PrimaryButton
              href="/ai-employees"
              leftIcon={<Plus className="w-4 h-4" />}
              size="sm"
            >
              Deploy Employee
            </PrimaryButton>
          </div>
        }
      />

      {/* GOVA AI Briefing Card */}
      <GovaCard
        statusText={isFallback ? 'Demo Mode Active' : 'Online & Orchestrating'}
        prompts={[
          'Which leads require follow-up today?',
          'Audit autonomous workflow execution health',
          'Deploy a new specialized AI Employee',
        ]}
        onPromptClick={(p) => {
          if (p.includes('leads')) window.location.href = '/leads'
          else if (p.includes('workflow')) window.location.href = '/workflows'
          else window.location.href = '/ai-employees'
        }}
        onChatClick={() => {
          window.location.href = '/conversations'
        }}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total Conversations"
          value={stats.totalConversations}
          subtext="Active conversation threads"
          icon={MessageSquare}
          iconColor="blue"
          href="/conversations"
        />
        <StatCard
          title="New Leads Captured"
          value={stats.totalLeads}
          subtext="Live CRM qualified leads"
          icon={Users}
          iconColor="green"
          trend={{ value: '+18%', isPositive: true }}
          href="/leads"
        />
        <StatCard
          title="Appointments Booked"
          value={stats.totalAppointments}
          subtext="Clinic patient slots scheduled"
          icon={Calendar}
          iconColor="purple"
          href="/dashboard/bookings"
        />
        <StatCard
          title="Workflow Executions"
          value={stats.totalWorkflowRuns}
          subtext={`${stats.workflowSuccessRate}% Success Rate`}
          icon={Workflow}
          iconColor="amber"
          href="/workflows"
        />
      </div>

      {/* Main Grid: Row 1 - Conversations Activity Trend & Lead Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Conversations Activity Chart (8 cols) */}
        <div className="lg:col-span-8 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Conversations Activity Trend</h3>
              <p className="text-[11px] text-slate-500">Daily message exchange volume managed by active AI employees</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Live Message Density
              </div>
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
            <p className="text-[11px] text-slate-500">Live breakdown of lead acquisition channels</p>
          </div>

          <div className="flex flex-col items-center justify-center pt-2">
            <div className="space-y-3 w-full">
              {leadSources.map((source, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                      {source.label}
                    </span>
                    <span className="text-slate-500">
                      {source.count} ({source.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(source.percentage, 4)}%`,
                        backgroundColor: source.color,
                      }}
                    />
                  </div>
                </div>
              ))}
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
              <p className="text-[11px] text-slate-500">Status and execution activity of deployed virtual workers</p>
            </div>
            <Link
              href="/ai-employees"
              className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
            >
              Manage Workforce <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {employeesStatus.map((emp, i) => {
              const slug = emp.name.toLowerCase().includes('real estate')
                ? 'real-estate-lead-receptionist'
                : emp.name.toLowerCase().includes('clinic')
                ? 'clinic-receptionist'
                : 'whatsapp-lead-qualifier'
              return (
                <div
                  key={i}
                  className="p-4.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 shrink-0">
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{emp.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{emp.role}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border shrink-0 ${emp.badgeColor}`}
                    >
                      {emp.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">{emp.metric}</span>
                    <Link
                      href={`/ai-employees/${slug}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition"
                    >
                      <span>View</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions (4 cols) */}
        <div className="lg:col-span-4 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Quick Actions</h3>
            <p className="text-[11px] text-slate-500">Autonomous workflow operations</p>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <Link
              href="/ai-employees/real-estate-lead-receptionist"
              className="flex items-center justify-between p-3 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50 rounded-xl font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <span>🤖 Test Real Estate Receptionist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/ai-employees/clinic-receptionist"
              className="flex items-center justify-between p-3 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50 rounded-xl font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <span>🏥 Test Clinic Receptionist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/conversations"
              className="flex items-center justify-between p-3 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50 rounded-xl font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <span>💬 Unified Inbox</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/workflows"
              className="flex items-center justify-between p-3 border border-slate-100 hover:border-blue-500/20 hover:bg-blue-50 rounded-xl font-bold text-slate-700 hover:text-blue-600 transition"
            >
              <span>⚙️ Live Workflow Pipelines</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Leads Table & Live Workflow Runs Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Leads Table (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Leads</h3>
              <p className="text-[11px] text-slate-500">Latest CRM prospects captured by AI employees</p>
            </div>
            <Link
              href="/leads"
              className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
            >
              View Lead Pipeline <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pt-1">Name</th>
                  <th className="pb-3 pt-1">Source</th>
                  <th className="pb-3 pt-1">Status</th>
                  <th className="pb-3 pt-1">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-bold text-slate-800">
                      <div>{lead.name}</div>
                      {lead.location && <span className="text-[10px] text-slate-400 font-normal">{lead.location}</span>}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          lead.status === 'Site Visit'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 font-medium">{lead.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Workflow Runs Feed (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Live Workflow Executions</h3>
              <p className="text-[11px] text-slate-500">Audit trail of automated execution runs</p>
            </div>
            <Link
              href="/workflows"
              className="text-[10px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
            >
              All Workflows <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentWorkflows.map((run) => (
              <div
                key={run.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                    {run.workflowName}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                      run.status === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : run.status === 'partial'
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}
                  >
                    {run.status === 'success' && <CheckCircle2 className="w-2.5 h-2.5" />}
                    {run.status === 'partial' && <AlertTriangle className="w-2.5 h-2.5" />}
                    {run.status === 'failed' && <XCircle className="w-2.5 h-2.5" />}
                    {run.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">{run.payloadSummary}</p>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                  <span>{run.leadName ? `For: ${run.leadName}` : 'Automated Run'}</span>
                  <span>{run.durationMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clinic Bookings Back-office Log Section */}
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
