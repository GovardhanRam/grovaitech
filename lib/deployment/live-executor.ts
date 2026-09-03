/**
 * Grovaitech AI Platform
 * lib/deployment/live-executor.ts
 *
 * Live Deployment Runtime Runner (Phase 3 Execution Plane).
 * Bridges activated Client Deployments into the unified Agent Runtime (GLE),
 * enforcing tenant scoping, canonical prompt composition, authorized tool whitelisting,
 * and real database side-effect attribution.
 */

import { createServerClient } from '@/lib/supabase/server'
import {
  getCanonicalEmployeeBySlug,
  getCanonicalEmployeeById,
  type AIEmployee,
} from '@/lib/employees/registry'
import {
  runAgentTurn,
  resolveAuthorizedTools,
  type ConversationTurn,
  type CustomerContext,
} from '@/lib/ai/runtime'
import type { ToolExecutionResult } from '@/lib/ai/dispatcher'
import type { ClientDeployment } from './types'

export interface ExecuteLiveDeploymentTurnOptions {
  deploymentId: string
  message: string
  history?: ConversationTurn[]
  customerContext?: CustomerContext
  channel?: 'web_chat' | 'whatsapp' | 'api'
}

export interface LiveDeploymentTurnResult {
  success: boolean
  deploymentId: string
  clientId: string
  employeeSlug: string
  employeeName: string
  replyText: string
  executedTools: ToolExecutionResult[]
  leadResult?: any
  workflowResult?: any
  error?: string
}

/**
 * Executes an authorized live conversation turn for an active Client Deployment.
 * Loads verified deployment identity from the server, composes immutable canonical
 * persona with client-scoped runtime instructions, and executes with full tenant attribution.
 */
export async function executeLiveDeploymentTurn(
  options: ExecuteLiveDeploymentTurnOptions
): Promise<LiveDeploymentTurnResult> {
  const { deploymentId, message, history = [], customerContext = {}, channel = 'web_chat' } = options

  // 1. Validate Input Parameters
  if (!deploymentId || typeof deploymentId !== 'string' || !deploymentId.trim()) {
    return {
      success: false,
      deploymentId: '',
      clientId: '',
      employeeSlug: '',
      employeeName: '',
      replyText: '',
      executedTools: [],
      error: 'Validation Error: A valid deploymentId is required for live execution.',
    }
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    return {
      success: false,
      deploymentId: deploymentId.trim(),
      clientId: '',
      employeeSlug: '',
      employeeName: '',
      replyText: '',
      executedTools: [],
      error: 'Validation Error: A non-empty message is required for live execution.',
    }
  }

  try {
    const supabase = await createServerClient()
    const cleanDeploymentId = deploymentId.trim()

    // 2. Server-Side Lookup: Fetch Client Deployment Record from canonical client_deployments table
    let deploymentRecord: ClientDeployment | null = null
    const { data: depData, error: depError } = await supabase
      .from('client_deployments')
      .select('*')
      .eq('id', cleanDeploymentId)
      .single()

    if (depData && !depError) {
      deploymentRecord = depData as ClientDeployment
    }

    // 3. Reject Missing Deployment
    if (!deploymentRecord) {
      return {
        success: false,
        deploymentId: cleanDeploymentId,
        clientId: '',
        employeeSlug: '',
        employeeName: '',
        replyText: '',
        executedTools: [],
        error: `Security / Lookup Error: Deployment with ID "${cleanDeploymentId}" was not found.`,
      }
    }

    // 4. Enforce Active Status Boundary
    if (deploymentRecord.status !== 'active') {
      return {
        success: false,
        deploymentId: cleanDeploymentId,
        clientId: deploymentRecord.client_id,
        employeeSlug: deploymentRecord.assigned_employee_slug,
        employeeName: deploymentRecord.assigned_employee_name,
        replyText: '',
        executedTools: [],
        error: `Authorization Error: Deployment "${cleanDeploymentId}" is in status "${deploymentRecord.status}" and cannot execute live turns. Must be "active".`,
      }
    }

    // 5. Resolve Canonical AI Employee (Immutable Master Registry)
    const employeeSlug = deploymentRecord.assigned_employee_slug
    const canonicalEmployee =
      getCanonicalEmployeeBySlug(employeeSlug) ||
      getCanonicalEmployeeById(deploymentRecord.assigned_employee_id)

    if (!canonicalEmployee) {
      return {
        success: false,
        deploymentId: cleanDeploymentId,
        clientId: deploymentRecord.client_id,
        employeeSlug,
        employeeName: deploymentRecord.assigned_employee_name,
        replyText: '',
        executedTools: [],
        error: `Configuration Error: Canonical AI Employee "${employeeSlug}" is not registered in the workforce registry.`,
      }
    }

    // 6. Compose Persona: Canonical Master Prompt + Client-Specific Runtime Instructions
    const clientInstruction = deploymentRecord.runtime_config?.system_context_instruction || ''
    const compositeSystemPrompt = clientInstruction
      ? `${canonicalEmployee.system_prompt}\n\n${clientInstruction}`
      : canonicalEmployee.system_prompt

    // 7. Authorize Tools: Narrow Live Execution Allowlist for Phase 4 Slice
    // Restricts the first live slice strictly to safe knowledge retrieval and verified lead creation.
    const canonicalTools = resolveAuthorizedTools(canonicalEmployee.slug)
    const LIVE_EXECUTION_TOOL_ALLOWLIST = new Set(['create_lead', 'search_knowledge_base'])
    const authorizedTools = canonicalTools.filter((t) => LIVE_EXECUTION_TOOL_ALLOWLIST.has(t.name))

    // 8. Execute Live Multi-Turn Turn via Unified Agent Runtime (GLE)
    const turnResult = await runAgentTurn({
      employeeSlug: canonicalEmployee.slug,
      message: message.trim(),
      history,
      channel,
      systemInstruction: compositeSystemPrompt,
      tools: authorizedTools, // Strict whitelist containment
      customerContext: {
        ...customerContext,
        clientId: deploymentRecord.client_id,
        deploymentId: deploymentRecord.id,
      },
      executionMode: 'live', // Authoritative Live Execution Mode
    })

    return {
      success: true,
      deploymentId: deploymentRecord.id,
      clientId: deploymentRecord.client_id,
      employeeSlug: canonicalEmployee.slug,
      employeeName: canonicalEmployee.name,
      replyText: turnResult.replyText,
      executedTools: turnResult.executedTools,
      leadResult: turnResult.leadResult,
      workflowResult: turnResult.workflowResult,
    }
  } catch (err: any) {
    console.error('[Live Deployment Runner Exception]', err)
    return {
      success: false,
      deploymentId: options.deploymentId || '',
      clientId: '',
      employeeSlug: '',
      employeeName: '',
      replyText: '',
      executedTools: [],
      error: err?.message || 'An unexpected error occurred during live turn execution.',
    }
  }
}

/**
 * Resolves an active ClientDeployment by exact Meta WhatsApp phone_number_id binding.
 * Searches client_deployments records for matching operating_parameters.whatsapp_phone_number_id.
 * Strictly requires active deployment status. Does NOT perform unsafe cross-tenant fallbacks.
 */
export async function resolveDeploymentByPhoneNumberId(phoneNumberId: string): Promise<ClientDeployment | null> {
  const cleanPhoneId = phoneNumberId?.trim()
  if (!cleanPhoneId) return null

  try {
    const supabase = await createServerClient()
    const { data: deployments, error } = await supabase
      .from('client_deployments')
      .select('*')
      .eq('status', 'active')

    if (error || !deployments || !Array.isArray(deployments)) {
      return null
    }

    const matched = deployments.find((d: any) => {
      const opParams = d.runtime_config?.operating_parameters
      if (!opParams || typeof opParams !== 'object') return false
      return (
        opParams.whatsapp_phone_number_id === cleanPhoneId ||
        opParams.phone_number_id === cleanPhoneId ||
        d.id === cleanPhoneId
      )
    })

    return (matched as ClientDeployment) || null
  } catch (err) {
    console.error('[resolveDeploymentByPhoneNumberId Error]', err)
    return null
  }
}
