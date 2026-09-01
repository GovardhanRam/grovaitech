/**
 * Grovaitech AI Platform
 * types/dashboard.ts
 *
 * Domain types for Live Dashboard Operational Command Center.
 */

export interface DashboardStats {
  totalConversations: number
  totalLeads: number
  totalAppointments: number
  totalWorkflowRuns: number
  workflowSuccessRate: number
  activeAgentsCount: number
  documentsCount: number
  revenuePipelineEstimate: string
}

export interface DashboardLeadItem {
  id: string
  name: string
  source: string
  employee: string
  status: string
  budget?: string
  location?: string
  time: string
  created_at: string
}

export interface DashboardWorkflowItem {
  id: string
  workflowId: string
  workflowName: string
  leadName?: string
  status: 'success' | 'partial' | 'failed'
  durationMs: number
  startedAt: string
  payloadSummary: string
}

export interface DashboardEmployeeStatus {
  name: string
  slug: string
  role: string
  status: 'READY' | 'ACTIVE' | 'IN_DEVELOPMENT'
  metric: string
  totalActions: number
  lastActive?: string
  badgeColor: string
}

export interface DashboardSourceBreakdown {
  label: string
  percentage: number
  color: string
  count: number
}

export interface GetDashboardDataResult {
  success: boolean
  stats: DashboardStats
  recentLeads: DashboardLeadItem[]
  recentWorkflows: DashboardWorkflowItem[]
  employeesStatus: DashboardEmployeeStatus[]
  leadSources: DashboardSourceBreakdown[]
  activityTrend: number[]
  isFallback: boolean
  error?: string
}
