'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/customer/CustomerHomeWorkspace.tsx
 *
 * Dedicated Business-Owner / Customer Home Experience.
 * Surfaces customer-scoped operational activity: inbound leads, appointments,
 * active conversations, GBP/website health, and follow-up alerts without
 * exposing administrative or founder-only levers.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Calendar,
  MessageSquare,
  Sparkles,
  Phone,
  Clock,
  ArrowRight,
  Globe,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Bot,
  ChevronRight,
} from 'lucide-react'
import type { GetDashboardDataResult } from '@/types/dashboard'
import {
  PageHeader,
  SectionHeader,
  StatCard,
  ListCard,
  StatusBadge,
  ActionCard,
  EmptyState,
  PrimaryButton,
  SecondaryButton,
} from '@/components/ui'

export interface CustomerHomeWorkspaceProps {
  initialData: GetDashboardDataResult
  businessName?: string
}

export function CustomerHomeWorkspace({
  initialData,
  businessName = 'My Business',
}: CustomerHomeWorkspaceProps) {
  const { stats, recentLeads, employeesStatus, isFallback } = initialData

  const activeEmployees = employeesStatus.filter(
    (e) => e.status.toLowerCase() === 'active' || e.status.toLowerCase() === 'live'
  )

  // Follow-ups requiring business owner attention
  const pendingFollowUps = recentLeads.filter(
    (l) => l.status.toLowerCase().includes('site') || l.status.toLowerCase().includes('qualified')
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`${businessName} Overview`}
        subtitle="Real-time inbound activity, appointments, and AI employee operations."
        badge={
          isFallback ? (
            <StatusBadge status="warning" label="Demo Sandbox Mode" />
          ) : (
            <StatusBadge status="active" label="Live Business Mode" pulse />
          )
        }
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              href="/conversations"
              leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
              size="sm"
            >
              Open Inbox
            </SecondaryButton>
            <PrimaryButton
              href="/leads"
              leftIcon={<Users className="w-3.5 h-3.5" />}
              size="sm"
            >
              View All Leads
            </PrimaryButton>
          </div>
        }
      />

      {/* Growth & KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Inbound Leads"
          value={stats.totalLeads}
          subtext="Captured by AI Employees"
          icon={Users}
          iconColor="green"
          trend={{ value: '+14%', isPositive: true }}
          href="/leads"
        />
        <StatCard
          title="Appointments Scheduled"
          value={stats.totalAppointments}
          subtext="Patient & customer slots"
          icon={Calendar}
          iconColor="purple"
          href="/dashboard/bookings"
        />
        <StatCard
          title="Customer Conversations"
          value={stats.totalConversations}
          subtext="Threads handled 24/7"
          icon={MessageSquare}
          iconColor="blue"
          href="/conversations"
        />
        <StatCard
          title="Autonomous Response Rate"
          value={`${stats.workflowSuccessRate}%`}
          subtext="Zero customer drop-off"
          icon={CheckCircle2}
          iconColor="green"
        />
      </div>

      {/* Business Channel & GBP Health Strip */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-soft-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#00142E]">
                  Customer Touchpoint Health
                </h3>
                <StatusBadge status="active" label="Operational" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                AI receptionist and qualification widgets connected across your channels
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00A859]" />
              <span>Google Business Profile: Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00A859]" />
              <span>WhatsApp Qualifier: Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Leads & AI Employee Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Inbound Leads & Follow-ups (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <SectionHeader
            title="Inbound Customer Inquiries"
            subtitle="Recent inquiries requiring confirmation or attention"
            badge={recentLeads.length}
            actionLabel="CRM Pipeline"
            actionHref="/leads"
          />

          {recentLeads.length === 0 ? (
            <EmptyState
              title="No Inquiries Yet"
              description="Your AI Employees are actively listening across web and WhatsApp channels. Inbound inquiries will appear here automatically."
              actionLabel="View Channels"
              actionHref="/integrations"
            />
          ) : (
            <div className="space-y-2.5">
              {recentLeads.slice(0, 5).map((lead) => (
                <ListCard
                  key={lead.id}
                  title={lead.name}
                  subtitle={lead.location ? `Location: ${lead.location}` : `Channel: ${lead.source}`}
                  meta={lead.time}
                  href={`/leads`}
                  badge={
                    <StatusBadge
                      status={
                        lead.status.toLowerCase().includes('site')
                          ? 'warning'
                          : 'active'
                      }
                      label={lead.status}
                    />
                  }
                  avatar={
                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-[#0066FF] text-xs">
                      {lead.name[0]?.toUpperCase() || 'L'}
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Active AI Employees & Activity (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <SectionHeader
            title="Your Active AI Employees"
            subtitle="Virtual team members currently servicing customers"
            badge={employeesStatus.length}
            actionLabel="Workforce"
            actionHref="/ai-employees"
          />

          <div className="space-y-3">
            {employeesStatus.map((emp, i) => (
              <div
                key={i}
                className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#00142E] truncate">
                      {emp.name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {emp.role}
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                      {emp.metric}
                    </span>
                  </div>
                </div>

                <StatusBadge
                  status={emp.status.toLowerCase() === 'active' ? 'active' : 'beta'}
                  label={emp.status}
                  size="sm"
                />
              </div>
            ))}
          </div>

          {/* Business Owner Fast Action */}
          <ActionCard
            title="Need Custom Lead Workflow?"
            description="Request a specialized workflow or appointment schedule trigger"
            variant="subtle"
            href="/workflows"
            icon={<Sparkles className="w-5 h-5" />}
          />
        </div>
      </div>
    </div>
  )
}

export default CustomerHomeWorkspace
