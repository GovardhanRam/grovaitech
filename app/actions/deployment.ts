'use server'

/**
 * Grovaitech AI Platform
 * app/actions/deployment.ts
 *
 * Server Actions for AI Employee Deployment Engine (Phase 1).
 * Executes deterministic prospect analysis, leak detection, workforce matching,
 * and personalized demo planning.
 */

import {
  analyzeProspect,
  type Prospect,
  type DeploymentAnalysis,
} from '@/lib/deployment'

export interface AnalyzeProspectResult {
  success: boolean
  data?: DeploymentAnalysis
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
