'use server'

/**
 * Grovaitech AI Platform
 * app/actions/deployment.ts
 *
 * Server Actions for AI Employee Deployment Engine (Phase 1 & Phase 2B).
 * Executes deterministic prospect analysis, leak detection, workforce matching,
 * and safe sandbox demonstration runs via the unified agent runtime.
 */

import {
  analyzeProspect,
  evaluateCrmReadiness,
  executeDeploymentDemo,
  provisionClientDeployment,
  executeLiveDeploymentTurn,
  type Prospect,
  type DeploymentAnalysis,
  type ExecuteDeploymentDemoOptions,
  type DeploymentDemoResult,
  type ProvisionClientOptions,
  type ProvisionClientResult,
  type ClientDeployment,
  type ExecuteLiveDeploymentTurnOptions,
  type LiveDeploymentTurnResult,
} from '@/lib/deployment'
import { createLead, type LeadData } from '@/app/actions/leads'

export interface AnalyzeProspectResult {
  success: boolean
  data?: DeploymentAnalysis
  error?: string
}

export interface SaveQualifiedProspectToCrmResult {
  success: boolean
  data?: any
  isUpdate?: boolean
  error?: string
  missingFields?: string[]
}

export interface ExecuteDeploymentDemoActionResult {
  success: boolean
  data?: DeploymentDemoResult
  error?: string
}

/**
 * Server action to evaluate a prospect and produce a structured deployment plan.
 * Validates input, runs deterministic pipeline, and returns sanitized result.
 */
export async function analyzeProspectForDeployment(
  prospect: Prospect
): Promise<AnalyzeProspectResult> {
  try {
    if (!prospect || typeof prospect !== 'object') {
      return {
        success: false,
        error: 'Invalid input: prospect must be a valid object.',
      }
    }

    if (!prospect.company_name || !prospect.company_name.trim()) {
      return {
        success: false,
        error: 'Company name is required for deployment analysis.',
      }
    }

    if (!prospect.industry || !prospect.industry.trim()) {
      return {
        success: false,
        error: 'Industry is required for deployment analysis.',
      }
    }

    const analysis = analyzeProspect(prospect)

    return {
      success: true,
      data: analysis,
    }
  } catch (err: any) {
    console.error('[Deployment Engine Action Error]', err)
    return {
      success: false,
      error: err?.message || 'Failed to complete prospect deployment analysis.',
    }
  }
}

/**
 * Server action to safely execute a personalized sandbox demonstration of an AI Employee.
 * Strictly enforces sandbox-only execution with zero database writes, CRM leads, bookings, or notifications.
 */
export async function executeDeploymentDemoAction(
  options: ExecuteDeploymentDemoOptions
): Promise<ExecuteDeploymentDemoActionResult> {
  try {
    if (!options || typeof options !== 'object') {
      return {
        success: false,
        error: 'Invalid input: options must be a valid object.',
      }
    }

    const result = await executeDeploymentDemo({
      ...options,
      executionMode: 'sandbox', // Strictly enforce sandbox mode in server action
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to execute deployment demo.',
        data: result,
      }
    }

    return {
      success: true,
      data: result,
    }
  } catch (err: any) {
    console.error('[Deployment Demo Server Action Exception]', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred during demo execution.',
    }
  }
}

/**
 * Server action to save a CRM-ready qualified prospect to the CRM/database.
 * Strictly re-verifies CRM readiness server-side and forwards to createLead().
 */
export async function saveQualifiedProspectToCrm(
  prospect: Prospect
): Promise<SaveQualifiedProspectToCrmResult> {
  try {
    if (!prospect || typeof prospect !== 'object') {
      return {
        success: false,
        error: 'Invalid input: prospect must be a valid object.',
      }
    }

    const crmReadiness = evaluateCrmReadiness(prospect)

    if (!crmReadiness.ready_for_lead_creation || !crmReadiness.lead_payload) {
      return {
        success: false,
        error: `Prospect is not CRM-ready. Missing required fields: ${crmReadiness.missing_fields.join(', ')}`,
        missingFields: crmReadiness.missing_fields,
      }
    }

    // Explicitly call createLead with the prepared lead_payload
    const result = await createLead(crmReadiness.lead_payload as LeadData)

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to save qualified prospect to CRM.',
      }
    }

    return {
      success: true,
      data: result.data,
      isUpdate: !!result.isUpdate,
    }
  } catch (err: any) {
    console.error('[Save Prospect To CRM Error]', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while saving to CRM.',
    }
  }
}

/**
 * Server action to provision an active Client Workspace and AI Employee Deployment record.
 * Re-validates prospect and CRM readiness server-side, resolves canonical employee and workflow,
 * and creates/updates the client account and deployment configuration idempotently.
 */
export async function provisionClientDeploymentFromLead(
  options: ProvisionClientOptions
): Promise<ProvisionClientResult> {
  try {
    if (!options || typeof options !== 'object' || !options.prospect) {
      return {
        success: false,
        error: 'Invalid input: options with a valid prospect object are required.',
      }
    }

    return await provisionClientDeployment(options)
  } catch (err: any) {
    console.error('[Provision Client Deployment Server Action Exception]', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred during client workspace provisioning.',
    }
  }
}

/**
 * Server action to execute an authorized live customer conversation turn
 * for an activated Client Deployment.
 * Enforces server-side deployment resolution and tenant-scoped lead creation.
 */
export async function runLiveDeploymentTurnAction(
  options: ExecuteLiveDeploymentTurnOptions
): Promise<LiveDeploymentTurnResult> {
  try {
    if (!options || typeof options !== 'object' || !options.deploymentId || !options.message) {
      return {
        success: false,
        deploymentId: options?.deploymentId || '',
        clientId: '',
        employeeSlug: '',
        employeeName: '',
        replyText: '',
        executedTools: [],
        error: 'Invalid input: options with deploymentId and message are required.',
      }
    }

    return await executeLiveDeploymentTurn(options)
  } catch (err: any) {
    console.error('[Run Live Deployment Turn Action Exception]', err)
    return {
      success: false,
      deploymentId: options?.deploymentId || '',
      clientId: '',
      employeeSlug: '',
      employeeName: '',
      replyText: '',
      executedTools: [],
      error: err?.message || 'An unexpected error occurred during live turn execution.',
    }
  }
}

