/**
 * Grovaitech AI Platform
 * lib/deployment/runtime-config.ts
 *
 * Client-Scoped Runtime Configuration Builder.
 * Constructs deterministic business context, parameters, and system instructions
 * for client-specific AI Employee deployments without exposing secrets or altering
 * the global canonical workforce registry.
 *
 * Enforces secret sanitization guards to prevent tokens/keys from being stored in configuration.
 */

import type { Prospect, ClientRuntimeConfig } from './types'

export interface BuildClientRuntimeConfigParams {
  deploymentId: string
  clientId: string
  prospect: Prospect
  employeeSlug: string
  workflowId: string
  employeeName?: string
  workflowName?: string
  whatsappPhoneNumberId?: string
}

const FORBIDDEN_SECRET_KEY_PATTERN = /^(token|access_token|refresh_token|secret|password|authorization|bearer|api_key|apikey|private_key|access_key)$/i

// Legitimate non-secret public identifier keys
const ALLOWED_PUBLIC_IDENTIFIERS = new Set([
  'phone_number_id',
  'whatsapp_phone_number_id',
  'calendar_id',
  'waba_id',
])

/**
 * Validates and sanitizes parameter records to prevent secrets from entering runtime_config.
 * Rejects or strips any key identifying credentials or secrets while preserving public channel IDs.
 */
export function sanitizeRuntimeParameters(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue

    const lowerKey = key.toLowerCase()

    // Explicitly allow legitimate public identifiers
    if (ALLOWED_PUBLIC_IDENTIFIERS.has(lowerKey)) {
      sanitized[key] = typeof value === 'string' ? value.trim() : value
      continue
    }

    // Block/reject forbidden secret keys
    if (FORBIDDEN_SECRET_KEY_PATTERN.test(key) || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('password')) {
      console.warn(`[RuntimeConfig Guard] Stripped forbidden secret parameter key: "${key}"`)
      continue
    }

    sanitized[key] = value
  }

  return sanitized
}

/**
 * Builds a sanitized, client-scoped runtime configuration object for an activated AI Employee.
 * Pure and deterministic. Strictly contains zero secrets, tokens, or private credentials.
 */
export function buildClientRuntimeConfig(
  params: BuildClientRuntimeConfigParams
): ClientRuntimeConfig {
  const {
    deploymentId,
    clientId,
    prospect,
    employeeSlug,
    workflowId,
    employeeName = 'AI Employee',
    workflowName = 'Autonomous Workflow',
    whatsappPhoneNumberId,
  } = params

  const companyName = prospect.company_name?.trim() || 'Client Business'
  const industry = prospect.industry?.trim() || 'General Business'
  const location = prospect.location?.trim() || 'India / Global'
  const channels = Array.isArray(prospect.current_channels) && prospect.current_channels.length > 0
    ? prospect.current_channels
    : ['Web Chat', 'WhatsApp']
  const problems = Array.isArray(prospect.known_problems) && prospect.known_problems.length > 0
    ? prospect.known_problems
    : ['Inbound lead qualification', 'Response latency optimization']

  const systemContextInstruction = [
    `[Client Deployment Context]`,
    `Organization: "${companyName}"`,
    `Industry: "${industry}"`,
    `Location / Territory: "${location}"`,
    `Authorized Channels: ${channels.join(', ')}`,
    `Assigned Workforce Agent: "${employeeName}" (${employeeSlug})`,
    `Bound Automation Workflow: "${workflowName}" (${workflowId})`,
    `Key Business Priorities: ${problems.join('; ')}`,
    `Guardrail: Strictly represent "${companyName}" with truthful, verified operational data.`,
  ].join('\n')

  const rawOperatingParameters = {
    channels,
    known_problems: problems,
    budget: prospect.budget?.trim() || undefined,
    timeline: prospect.timeline?.trim() || undefined,
    contact_name: prospect.contact_name?.trim() || undefined,
    contact_phone: prospect.phone?.trim() || undefined,
    whatsapp_phone_number_id: whatsappPhoneNumberId?.trim() || undefined,
  }

  return {
    deployment_id: deploymentId,
    client_id: clientId,
    company_name: companyName,
    industry,
    location,
    operating_parameters: sanitizeRuntimeParameters(rawOperatingParameters),
    assigned_employee_slug: employeeSlug,
    assigned_workflow_id: workflowId,
    system_context_instruction: systemContextInstruction,
    created_at: new Date().toISOString(),
  }
}
