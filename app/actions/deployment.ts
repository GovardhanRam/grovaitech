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
  executeDeploymentDemo,
  type Prospect,
  type DeploymentAnalysis,
  type ExecuteDeploymentDemoOptions,
  type DeploymentDemoResult,
} from '@/lib/deployment'

export interface AnalyzeProspectResult {
  success: boolean
  data?: DeploymentAnalysis
  error?: string
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
