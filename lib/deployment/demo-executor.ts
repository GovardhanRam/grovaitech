/**
 * Grovaitech AI Platform
 * lib/deployment/demo-executor.ts
 *
 * Safe Demo Execution Layer for the Grovaitech AI Employee Deployment Engine (Phase 2B).
 * Orchestrates personalized sandbox demonstrations of canonical AI Employees
 * via the unified agent runtime without overriding canonical system prompts or executing live write actions.
 */

import { runAgentTurn, resolveAuthorizedTools } from '@/lib/ai/runtime'
import { getCanonicalEmployeeBySlug } from '@/lib/employees/registry'
import { TOOL_NAMES } from '@/lib/ai/tools'
import { EMPLOYEE_WORKFLOW_MAP } from './demo-planner'
import type {
  Prospect,
  ExecuteDeploymentDemoOptions,
  DeploymentDemoResult,
} from './types'

// Whitelisted read-only tools permitted during sandbox demo execution
const SANDBOX_PERMITTED_TOOLS = new Set<string>([
  TOOL_NAMES.SEARCH_KNOWLEDGE_BASE,
])

/**
 * Safely executes an interactive deployment demo turn for a prospect and canonical employee.
 * Strictly enforces sandbox-only execution in Phase 2B.
 */
export async function executeDeploymentDemo(
  options: ExecuteDeploymentDemoOptions
): Promise<DeploymentDemoResult> {
  const {
    prospect,
    employeeSlug,
    conversationStarter,
    history = [],
    executionMode = 'sandbox',
  } = options

  // 1. Strict Phase 2 Safety Guardrail: Reject Live Execution Mode
  if (executionMode === 'live') {
    return {
      success: false,
      executionMode: 'live',
      employeeSlug: employeeSlug || '',
      employeeName: '',
      replyText: '',
      conversationStarter: conversationStarter || '',
      executedTools: [],
      simulatedActions: [],
      hasRealSideEffects: false,
      error: 'Live deployment execution is not enabled in Phase 2.',
    }
  }

  // 2. Validate Prospect Input
  if (!prospect || typeof prospect !== 'object') {
    return {
      success: false,
      executionMode: 'sandbox',
      employeeSlug: employeeSlug || '',
      employeeName: '',
      replyText: '',
      conversationStarter: conversationStarter || '',
      executedTools: [],
      simulatedActions: [],
      hasRealSideEffects: false,
      error: 'Invalid prospect input: expected a valid Prospect object.',
    }
  }

  const companyName = prospect.company_name?.trim()
  if (!companyName) {
    return {
      success: false,
      executionMode: 'sandbox',
      employeeSlug: employeeSlug || '',
      employeeName: '',
      replyText: '',
      conversationStarter: conversationStarter || '',
      executedTools: [],
      simulatedActions: [],
      hasRealSideEffects: false,
      error: 'Prospect company name is required for demo execution.',
    }
  }

  const message = conversationStarter?.trim()
  if (!message) {
    return {
      success: false,
      executionMode: 'sandbox',
      employeeSlug: employeeSlug || '',
      employeeName: '',
      replyText: '',
      conversationStarter: '',
      executedTools: [],
      simulatedActions: [],
      hasRealSideEffects: false,
      error: 'Conversation starter message is required for demo execution.',
    }
  }

  // 3. Resolve Canonical Employee & Verify Demo Enablement
  const canonicalEmployee = getCanonicalEmployeeBySlug(employeeSlug)
  if (!canonicalEmployee) {
    return {
      success: false,
      executionMode: 'sandbox',
      employeeSlug: employeeSlug || '',
      employeeName: '',
      replyText: '',
      conversationStarter: message,
      executedTools: [],
      simulatedActions: [],
      hasRealSideEffects: false,
      error: `Unknown AI Employee '${employeeSlug}'.`,
    }
  }

  if (!canonicalEmployee.demo_config || canonicalEmployee.demo_config.enabled !== true) {
    return {
      success: false,
      executionMode: 'sandbox',
      employeeSlug: canonicalEmployee.slug,
      employeeName: canonicalEmployee.name,
      replyText: '',
      conversationStarter: message,
      executedTools: [],
      simulatedActions: [],
      hasRealSideEffects: false,
      error: `AI Employee '${canonicalEmployee.name}' is not enabled for interactive demonstration.`,
    }
  }

  // 4. Pre-Execution Sandbox Tool Policy
  // Filter authorized tools BEFORE runtime invocation to guarantee no write tools reach the dispatcher
  const authorizedTools = resolveAuthorizedTools(canonicalEmployee.slug)
  const sandboxTools = authorizedTools.filter((tool) =>
    SANDBOX_PERMITTED_TOOLS.has(tool.name)
  )

  // 5. Build Deployment Demonstration User Message (Context Injected into User Message, NOT System Instruction)
  const industry = prospect.industry?.trim() || canonicalEmployee.industry
  const workflowId = EMPLOYEE_WORKFLOW_MAP[canonicalEmployee.id]

  const contextLines = [
    `[DEMO CONTEXT - PROSPECT INQUIRY]`,
    `Prospect Organization: ${companyName}`,
    `Industry: ${industry}`,
    prospect.known_problems && prospect.known_problems.length > 0
      ? `Operational Challenges: ${prospect.known_problems.join(', ')}`
      : null,
    prospect.current_channels && prospect.current_channels.length > 0
      ? `Target Channels: ${prospect.current_channels.join(', ')}`
      : null,
    workflowId ? `Target Deployment Workflow: ${workflowId}` : null,
    `[CUSTOMER INQUIRY]:\n${message}`,
  ].filter(Boolean).join('\n')

  // 6. Delegate to Unified Agent Runtime
  // Note: We do NOT pass options.systemInstruction so that the canonical employee system prompt is preserved
  try {
    const turnResult = await runAgentTurn({
      employeeSlug: canonicalEmployee.slug,
      message: contextLines,
      history,
      channel: 'web_chat',
      customerContext: {
        name: prospect.contact_name?.trim() || undefined,
        phone: prospect.phone?.trim() || undefined,
        email: prospect.email?.trim() || undefined,
      },
      tools: sandboxTools,
      maxIterations: 2,
    })

    const executedToolNames = turnResult.executedTools.map((t) => t.toolName)

    // Planned workflow descriptor without claiming live or simulated execution occurred
    const simulatedActions: string[] = []
    if (workflowId) {
      simulatedActions.push(`Planned workflow: ${workflowId}`)
    }

    return {
      success: true,
      executionMode: 'sandbox',
      employeeSlug: canonicalEmployee.slug,
      employeeName: canonicalEmployee.name,
      replyText: turnResult.replyText,
      conversationStarter: message,
      executedTools: executedToolNames,
      simulatedActions,
      workflowId,
      hasRealSideEffects: false,
    }
  } catch (error: any) {
    console.error('[Deployment Demo Execution Error]', error)
    return {
      success: false,
      executionMode: 'sandbox',
      employeeSlug: canonicalEmployee.slug,
      employeeName: canonicalEmployee.name,
      replyText: '',
      conversationStarter: message,
      executedTools: [],
      simulatedActions: [],
      workflowId,
      hasRealSideEffects: false,
      error: error?.message || 'An error occurred during sandbox demo execution.',
    }
  }
}
