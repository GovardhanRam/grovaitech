/**
 * Grovaitech AI Platform
 * lib/dashboard/utils.ts
 *
 * Pure utilities and canonical empty-state for Grovaitech Operational Dashboard.
 *
 * PRODUCTION RULE: This fallback MUST NOT contain invented business metrics,
 * fake lead names, fake appointment counts, or fabricated revenue figures.
 * It represents an honest "no data yet" state only.
 */

import type { GetDashboardDataResult } from '@/types/dashboard'

/**
 * EMPTY_STATE_DASHBOARD
 *
 * Returned when the production database has no records yet.
 * All counts are zero, all arrays are empty.
 * This is the honest representation of a newly provisioned account.
 */
export const CANONICAL_FALLBACK_DASHBOARD: GetDashboardDataResult = {
  success: true,
  isFallback: true,
  stats: {
    totalConversations: 0,
    totalLeads: 0,
    totalAppointments: 0,
    totalWorkflowRuns: 0,
    workflowSuccessRate: 0,
    activeAgentsCount: 0,
    documentsCount: 0,
    revenuePipelineEstimate: undefined,
  },
  recentLeads: [],
  recentWorkflows: [],
  employeesStatus: [],
  leadSources: [],
  activityTrend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}
