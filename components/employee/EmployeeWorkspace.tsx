'use client'

/**
 * Grovaitech Mobile & Web Design System
 * components/employee/EmployeeWorkspace.tsx
 *
 * Team Member / Employee Operational Workspace.
 * Provides task prioritization, working status & break tracking,
 * work time session logs, GOVA assistance, and End-of-Day wrap-up.
 */

import React, { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  Coffee,
  Play,
  Pause,
  AlertCircle,
  Calendar,
  Sparkles,
  Send,
  Users,
  CheckSquare,
  Square,
  ArrowRight,
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
  Tabs,
  ProgressBar,
  Pill,
} from '@/components/ui'

export interface EmployeeWorkspaceProps {
  initialData: GetDashboardDataResult
  employeeName?: string
}

interface AssignedTask {
  id: string
  title: string
  clientName: string
  priority: 'urgent' | 'high' | 'normal'
  dueTime: string
  completed: boolean
  category: string
}

export function EmployeeWorkspace({
  initialData,
  employeeName = 'Team Member',
}: EmployeeWorkspaceProps) {
  const { recentLeads, recentWorkflows, isFallback } = initialData

  // Working shift status
  const [shiftStatus, setShiftStatus] = useState<'active' | 'break' | 'off'>('active')
  const [activeTab, setActiveTab] = useState<'today' | 'completed'>('today')
  const [eodSubmitted, setEodSubmitted] = useState(false)

  // Seed tasks from real leads or workflows requiring team attention
  const [tasks, setTasks] = useState<AssignedTask[]>(() => {
    if (recentLeads.length > 0) {
      return recentLeads.map((l, idx) => ({
        id: l.id || `task-${idx}`,
        title: `Follow up with ${l.name} (${l.status})`,
        clientName: l.name,
        priority: idx === 0 ? 'urgent' : idx === 1 ? 'high' : 'normal',
        dueTime: l.time || 'Today, 3:00 PM',
        completed: false,
        category: l.source || 'Inbound Lead',
      }))
    }
    return [
      {
        id: 'task-1',
        title: 'Review qualified real estate leads',
        clientName: 'CRM Pipeline',
        priority: 'high',
        dueTime: 'Today, 2:30 PM',
        completed: false,
        category: 'Lead Review',
      },
    ]
  })

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const activeTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)
  const completionPercentage = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0

  const priorityMeta = {
    urgent: { label: 'Urgent', status: 'error' },
    high: { label: 'High', status: 'warning' },
    normal: { label: 'Normal', status: 'neutral' },
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title={`My Work — ${employeeName}`}
        subtitle="Manage assigned operational tasks, shift status, and daily workflow deliverables."
        badge={
          shiftStatus === 'active' ? (
            <StatusBadge status="active" label="On Shift" pulse />
          ) : shiftStatus === 'break' ? (
            <StatusBadge status="warning" label="On Break" />
          ) : (
            <StatusBadge status="neutral" label="Off Shift" />
          )
        }
        actions={
          <div className="flex items-center gap-2">
            {shiftStatus === 'active' ? (
              <SecondaryButton
                onClick={() => setShiftStatus('break')}
                leftIcon={<Coffee className="w-3.5 h-3.5" />}
                size="sm"
              >
                Take Break
              </SecondaryButton>
            ) : shiftStatus === 'break' ? (
              <PrimaryButton
                onClick={() => setShiftStatus('active')}
                leftIcon={<Play className="w-3.5 h-3.5" />}
                size="sm"
              >
                Resume Work
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={() => setShiftStatus('active')}
                leftIcon={<Play className="w-3.5 h-3.5" />}
                size="sm"
              >
                Start Shift
              </PrimaryButton>
            )}

            <PrimaryButton
              href="/conversations"
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              size="sm"
            >
              Ask GOVA
            </PrimaryButton>
          </div>
        }
      />

      {/* Shift & Time Tracking Bar */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-soft-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#00142E]">
              Work Time &amp; Shift Monitor
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Current Session: 4 hrs 12 mins logged • 0 active pauses
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Pill
            label="On Shift"
            selected={shiftStatus === 'active'}
            onClick={() => setShiftStatus('active')}
            size="sm"
          />
          <Pill
            label="Break"
            selected={shiftStatus === 'break'}
            onClick={() => setShiftStatus('break')}
            size="sm"
          />
          <Pill
            label="End Shift"
            selected={shiftStatus === 'off'}
            onClick={() => setShiftStatus('off')}
            size="sm"
          />
        </div>
      </div>

      {/* Progress & Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assigned Tasks"
          value={activeTasks.length}
          subtext="Pending completion today"
          icon={CheckSquare}
          iconColor="blue"
        />
        <StatCard
          title="Completed Today"
          value={completedTasks.length}
          subtext="Verified actions"
          icon={CheckCircle2}
          iconColor="green"
        />
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-soft-card flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Daily Goal Completion
          </span>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-2xl font-extrabold text-[#00142E]">
                {completionPercentage}%
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {completedTasks.length} of {tasks.length} tasks
              </span>
            </div>
            <ProgressBar value={completionPercentage} color="blue" size="md" />
          </div>
        </div>
      </div>

      {/* Task Tabs & List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Tabs
            tabs={[
              { id: 'today', label: "Today's Work", count: activeTasks.length },
              { id: 'completed', label: 'Completed', count: completedTasks.length },
            ]}
            activeTab={activeTab}
            onChange={(id) => setActiveTab(id as 'today' | 'completed')}
          />
        </div>

        {activeTab === 'today' ? (
          activeTasks.length === 0 ? (
            <EmptyState
              title="All Caught Up!"
              description="You have completed all assigned tasks for today. Check GOVA recommendations or review customer pipelines."
              actionLabel="Explore Leads"
              actionHref="/leads"
            />
          ) : (
            <div className="space-y-2.5">
              {activeTasks.map((task) => {
                const meta = priorityMeta[task.priority]
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:border-blue-300 flex items-center justify-between gap-3 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <button
                        type="button"
                        aria-label="Toggle task completion"
                        className="text-slate-400 hover:text-[#0066FF] transition-colors shrink-0"
                      >
                        <Square className="w-5 h-5" />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-[#00142E] truncate">
                            {task.title}
                          </h4>
                          <StatusBadge
                            status={meta.status}
                            label={meta.label}
                            size="sm"
                            dot={false}
                          />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-normal">
                          <span>{task.clientName}</span>
                          <span>•</span>
                          <span className="text-[#0066FF] font-medium">{task.dueTime}</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                )
              })}
            </div>
          )
        ) : completedTasks.length === 0 ? (
          <EmptyState
            title="No Completed Tasks Yet"
            description="Complete assigned tasks above to build your daily work log."
          />
        ) : (
          <div className="space-y-2.5">
            {completedTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 opacity-75 cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-[#00A859] shrink-0" />
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-600 line-through truncate">
                      {task.title}
                    </h4>
                    <span className="text-xs text-slate-400 font-normal">
                      Completed • {task.clientName}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* End of Day (EOD) Wrap-up Card */}
      <div className="p-5 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-soft-card">
        <SectionHeader
          title="End of Day (EOD) Wrap-up"
          subtitle="Submit your verified deliverables and activity report to the command center"
        />

        {eodSubmitted ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#00A859] shrink-0" />
            <div>
              <h4 className="text-xs font-bold">EOD Report Submitted</h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Your daily deliverables have been recorded and synced with the team log.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <p className="text-xs text-slate-600">
              {completedTasks.length} task{completedTasks.length === 1 ? '' : 's'} completed today. Ready to submit daily progress?
            </p>
            <PrimaryButton
              onClick={() => setEodSubmitted(true)}
              size="sm"
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit EOD Summary
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployeeWorkspace
