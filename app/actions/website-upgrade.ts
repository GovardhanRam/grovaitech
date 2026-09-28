'use server'

/**
 * Grovaitech AI Platform
 * app/actions/website-upgrade.ts
 *
 * Typed Server Actions for the GOVA Website Upgrade Employee.
 * Fully deterministic analysis, audit, strategy, and preview generation.
 * Zero database writes or side effects during preview.
 * Production deployment handoff requires explicit human approval and delegates
 * directly to the existing Grovaitech Deployment Engine (`provisionClientDeploymentFromLead`).
 */

import {
  analyzeWebsiteForUpgrade,
  executeWebsiteAudit,
  analyzeWebsiteRevenueLeaks,
  generateWebsiteStrategy,
  generateUIUXPlan,
  generatePreviewPlan,
  scanClaims,
  type WebsiteUpgradeInput,
  type WebsiteUpgradeResult,
  type WebsiteAuditFinding,
  type WebsiteRevenueLeak,
  type WebsiteStrategy,
  type WebsitePreviewPlan,
  type DeploymentHandoffPayload,
} from '@/lib/website-upgrade'
import { provisionClientDeploymentFromLead } from '@/app/actions/deployment'
import { evaluateCrmReadiness, type ProvisionClientResult } from '@/lib/deployment'

export interface UpgradeActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface DeploymentHandoffActionResult {
  success: boolean
  handoffStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
  deploymentResult?: ProvisionClientResult
  error?: string
}

/**
 * Server action to execute the full deterministic Website Upgrade analysis.
 * Zero DB side-effects.
 */
export async function analyzeWebsiteUpgradeAction(
  input: WebsiteUpgradeInput
): Promise<UpgradeActionResult<WebsiteUpgradeResult>> {
  try {
    if (!input || typeof input !== 'object') {
      return { success: false, error: 'Invalid input: expected WebsiteUpgradeInput.' }
    }
    if (!input.business_name?.trim()) {
      return { success: false, error: 'Business name is required.' }
    }
    if (!input.industry?.trim()) {
      return { success: false, error: 'Industry is required.' }
    }

    const result = analyzeWebsiteForUpgrade(input)
    return { success: true, data: result }
  } catch (err: any) {
    console.error('[Website Upgrade Action Error]', err)
    return { success: false, error: err?.message || 'Failed to analyze website.' }
  }
}

/**
 * Server action to generate standalone website audit findings.
 */
export async function generateWebsiteAuditAction(
  input: WebsiteUpgradeInput
): Promise<UpgradeActionResult<{ auditFindings: WebsiteAuditFinding[]; revenueLeaks: WebsiteRevenueLeak[] }>> {
  try {
    if (!input || !input.business_name?.trim()) {
      return { success: false, error: 'Business name is required.' }
    }
    const analyzedClaims = scanClaims(
      [input.raw_site_text || '', input.current_description || ''],
      input.supplied_evidence
    )
    const auditFindings = executeWebsiteAudit(input, analyzedClaims)
    const revenueLeaks = analyzeWebsiteRevenueLeaks(input, auditFindings)

    return {
      success: true,
      data: { auditFindings, revenueLeaks },
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to generate website audit.' }
  }
}

/**
 * Server action to generate standalone website strategy.
 */
export async function generateWebsiteStrategyAction(
  input: WebsiteUpgradeInput
): Promise<UpgradeActionResult<WebsiteStrategy>> {
  try {
    if (!input || !input.business_name?.trim()) {
      return { success: false, error: 'Business name is required.' }
    }
    const analyzedClaims = scanClaims(
      [input.raw_site_text || '', input.current_description || ''],
      input.supplied_evidence
    )
    const auditFindings = executeWebsiteAudit(input, analyzedClaims)
    const revenueLeaks = analyzeWebsiteRevenueLeaks(input, auditFindings)
    const strategy = generateWebsiteStrategy(input, auditFindings, revenueLeaks)

    return { success: true, data: strategy }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to generate website strategy.' }
  }
}

/**
 * Server action to generate standalone preview plan.
 */
export async function generateWebsitePreviewAction(
  input: WebsiteUpgradeInput
): Promise<UpgradeActionResult<WebsitePreviewPlan>> {
  try {
    if (!input || !input.business_name?.trim()) {
      return { success: false, error: 'Business name is required.' }
    }
    const analyzedClaims = scanClaims(
      [input.raw_site_text || '', input.current_description || ''],
      input.supplied_evidence
    )
    const auditFindings = executeWebsiteAudit(input, analyzedClaims)
    const revenueLeaks = analyzeWebsiteRevenueLeaks(input, auditFindings)
    const strategy = generateWebsiteStrategy(input, auditFindings, revenueLeaks)
    const uiPlan = generateUIUXPlan(input)
    const preview = generatePreviewPlan(input, strategy, uiPlan, analyzedClaims)

    return { success: true, data: preview }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to generate preview plan.' }
  }
}

/**
 * Server action to execute human-approved deployment handoff.
 * Strictly verifies human approval before invoking the canonical deployment engine.
 */
export async function approveAndHandoffToDeploymentAction(
  payload: DeploymentHandoffPayload,
  approverName: string,
  approvalDecision: 'APPROVED' | 'REJECTED'
): Promise<DeploymentHandoffActionResult> {
  try {
    if (!payload || !payload.prospect) {
      return {
        success: false,
        handoffStatus: 'REJECTED',
        error: 'Invalid handoff payload: prospect is required.',
      }
    }

    if (!approverName?.trim()) {
      return {
        success: false,
        handoffStatus: 'REJECTED',
        error: 'Human approver name or credential is required for deployment authorization.',
      }
    }

    if (approvalDecision !== 'APPROVED') {
      return {
        success: false,
        handoffStatus: 'REJECTED',
        error: 'Deployment handoff was rejected by the reviewer.',
      }
    }

    // Verify CRM Readiness before calling provisioning
    const readiness = evaluateCrmReadiness(payload.prospect)
    if (!readiness.ready_for_lead_creation) {
      return {
        success: false,
        handoffStatus: 'PENDING_APPROVAL',
        error: `Cannot provision deployment: Prospect is missing required CRM qualification fields: ${readiness.missing_fields.join(', ')}`,
      }
    }

    // Hand off to existing Grovaitech Deployment Engine
    const provisionResult = await provisionClientDeploymentFromLead({
      prospect: payload.prospect,
      employeeSlug: payload.primary_employee_slug,
      workflowId: payload.assigned_workflow_id,
    })

    if (!provisionResult.success) {
      return {
        success: false,
        handoffStatus: 'APPROVED',
        deploymentResult: provisionResult,
        error: provisionResult.error || 'Deployment engine failed to provision client deployment.',
      }
    }

    return {
      success: true,
      handoffStatus: 'APPROVED',
      deploymentResult: provisionResult,
    }
  } catch (err: any) {
    console.error('[Approve and Handoff Error]', err)
    return {
      success: false,
      handoffStatus: 'REJECTED',
      error: err?.message || 'An unexpected error occurred during deployment handoff.',
    }
  }
}
