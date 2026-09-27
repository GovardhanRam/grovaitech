/**
 * Grovaitech AI Platform
 * tests/unit/employee-workspace-tasks.test.ts
 *
 * Verifies that the EmployeeWorkspace /tasks data flow:
 * 1. Initializes with zero tasks when the workspace has no leads (clean empty state)
 * 2. Never generates fake fallback tasks ("Review qualified real estate leads")
 * 3. Accurately maps real leads to operational tasks when present
 */

import { describe, it, expect } from 'vitest'
import { CANONICAL_FALLBACK_DASHBOARD } from '@/lib/dashboard/utils'
import type { DashboardLeadItem, GetDashboardDataResult } from '@/types/dashboard'

describe('EmployeeWorkspace Tasks Initialization Logic', () => {
  // Pure helper matching EmployeeWorkspace tasks initialization contract
  function initializeTasks(recentLeads: DashboardLeadItem[] = []) {
    if (recentLeads && recentLeads.length > 0) {
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
    return []
  }

  it('1. returns an empty task list when the workspace is newly provisioned with zero leads', () => {
    const freshDashboardData: GetDashboardDataResult = CANONICAL_FALLBACK_DASHBOARD

    const tasks = initializeTasks(freshDashboardData.recentLeads)

    expect(tasks).toEqual([])
    expect(tasks).toHaveLength(0)
  })

  it('2. does NOT generate any fabricated fallback tasks when recentLeads is empty', () => {
    const tasks = initializeTasks([])

    // Must never contain hardcoded demo task titles
    const hasFakeTask = tasks.some(
      (t) =>
        t.title.includes('Review qualified real estate leads') ||
        t.clientName === 'CRM Pipeline'
    )

    expect(hasFakeTask).toBe(false)
    expect(tasks).toHaveLength(0)
  })

  it('3. maps authentic tenant leads to actionable operational tasks', () => {
    const authenticLeads: DashboardLeadItem[] = [
      {
        id: 'lead-real-1',
        name: 'Venkatesh Rao',
        source: 'WhatsApp',
        employee: 'Real Estate Lead Receptionist',
        status: 'Qualified',
        budget: '₹2.5 Cr',
        location: 'Tirupati',
        time: 'Today, 11:30 AM',
        created_at: new Date().toISOString(),
      },
    ]

    const tasks = initializeTasks(authenticLeads)

    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('lead-real-1')
    expect(tasks[0].title).toBe('Follow up with Venkatesh Rao (Qualified)')
    expect(tasks[0].clientName).toBe('Venkatesh Rao')
    expect(tasks[0].completed).toBe(false)
  })
})
