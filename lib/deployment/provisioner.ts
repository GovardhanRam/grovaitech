/**
 * Grovaitech AI Platform
 * lib/deployment/provisioner.ts
 *
 * Core Deterministic Provisioning Service.
 * Bridges qualified CRM leads/prospects to persistent Client Accounts,
 * durable Client Deployment records, canonical AI Employee bindings,
 * and canonical workflow bindings.
 *
 * Strictly idempotent, tenant-scoped, and free of external side effects.
 */

import { createServerClient } from '@/lib/supabase/server'
import {
  getCanonicalEmployeeBySlug,
  getCanonicalEmployeeById,
  type AIEmployee,
} from '@/lib/employees/registry'
import { CANONICAL_DEMO_WORKFLOWS } from '@/lib/workflows/utils'
import { EMPLOYEE_WORKFLOW_MAP } from './demo-planner'
import { matchEmployeesForProspect } from './matcher'
import { detectRevenueLeaks } from './revenue-leaks'
import { evaluateCrmReadiness } from './index'
import { buildClientRuntimeConfig } from './runtime-config'
import type {
  Prospect,
  ProvisionClientOptions,
  ProvisionClientResult,
  ClientDeployment,
} from './types'

/**
 * Deterministically provisions or updates a Client Account and AI Employee Deployment record.
 */
export async function provisionClientDeployment(
  options: ProvisionClientOptions
): Promise<ProvisionClientResult> {
  const { prospect, employeeSlug, workflowId } = options

  // 1. Validate Prospect Boundary
  if (!prospect || typeof prospect !== 'object') {
    return {
      success: false,
      error: 'Invalid input: prospect must be a valid object.',
    }
  }

  const companyName = prospect.company_name?.trim()
  const industry = prospect.industry?.trim()

  if (!companyName) {
    return {
      success: false,
      error: 'Company/Business name is required to provision a client workspace.',
    }
  }

  if (!industry) {
    return {
      success: false,
      error: 'Industry is required to provision a client workspace.',
    }
  }

  // 2. Re-verify CRM Qualification
  const crmReadiness = evaluateCrmReadiness(prospect)
  if (!crmReadiness.ready_for_lead_creation) {
    return {
      success: false,
      error: `Cannot provision client workspace: Prospect is not CRM-qualified. Missing fields: ${crmReadiness.missing_fields.join(', ')}`,
    }
  }

  // 3. Resolve AI Employee Binding
  let assignedEmployee: AIEmployee | null = null

  if (employeeSlug) {
    assignedEmployee = getCanonicalEmployeeBySlug(employeeSlug) || null
    if (!assignedEmployee) {
      return {
        success: false,
        error: `Unrecognized AI Employee slug "${employeeSlug}". Must match a valid canonical workforce agent.`,
      }
    }
  } else {
    const leaks = detectRevenueLeaks(prospect)
    const matches = matchEmployeesForProspect(prospect, leaks)
    if (matches.recommended_employee) {
      assignedEmployee = getCanonicalEmployeeBySlug(matches.recommended_employee.employee_slug) || null
    }
  }

  if (!assignedEmployee) {
    return {
      success: false,
      error: 'Could not resolve a matching AI Employee for this prospect profile.',
    }
  }

  // 4. Resolve Workflow Binding
  const resolvedWorkflowId =
    workflowId ||
    EMPLOYEE_WORKFLOW_MAP[assignedEmployee.id] ||
    'wf-001'

  const canonicalWorkflow =
    CANONICAL_DEMO_WORKFLOWS.find((w) => w.id === resolvedWorkflowId) ||
    CANONICAL_DEMO_WORKFLOWS[0]

  const assignedWorkflowName = canonicalWorkflow.name

  try {
    const supabase = await createServerClient()

    // 5. Idempotent Client Account Resolution
    const cleanCompanyName = companyName.toLowerCase()
    const cleanEmail = prospect.email?.trim().toLowerCase() || ''

    let existingClient: any = null

    // Search by company name
    const { data: nameMatches } = await supabase
      .from('clients')
      .select('*')

    if (Array.isArray(nameMatches)) {
      existingClient = nameMatches.find(
        (c: any) =>
          c.name?.trim().toLowerCase() === cleanCompanyName ||
          (cleanEmail && c.email?.trim().toLowerCase() === cleanEmail)
      )
    }

    const clientId =
      existingClient?.id ||
      `client-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`

    const isExisting = !!existingClient

    // Construct service tags
    const currentServices: string[] = Array.isArray(existingClient?.services)
      ? existingClient.services
      : []

    const targetServiceTitle = assignedEmployee.title || assignedEmployee.name
    const mergedServices = Array.from(
      new Set([...currentServices, targetServiceTitle, assignedWorkflowName])
    )

    const clientRecord = {
      id: clientId,
      name: companyName,
      email:
        prospect.email?.trim() ||
        existingClient?.email ||
        `contact@${companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}.com`,
      industry,
      status: 'Active' as const,
      services: mergedServices,
      phone: prospect.phone?.trim() || existingClient?.phone || null,
      assigned_employee_slug: assignedEmployee.slug,
      assigned_employee_name: assignedEmployee.name,
      assigned_workflow_id: resolvedWorkflowId,
      deployment_id: `dep-${clientId}-${assignedEmployee.slug}`,
      deployment_status: 'active',
      deployed_at: existingClient?.deployed_at || new Date().toISOString(),
      created_at: existingClient?.created_at || new Date().toISOString(),
    }

    // Upsert / Insert Client record
    if (existingClient) {
      await supabase
        .from('clients')
        .update(clientRecord)
        .eq('id', clientId)
    } else {
      await supabase
        .from('clients')
        .insert(clientRecord)
    }

    // 6. Build Client Runtime Configuration
    const deploymentId = `dep-${clientId}-${assignedEmployee.slug}`
    const runtimeConfig = buildClientRuntimeConfig({
      deploymentId,
      clientId,
      prospect,
      employeeSlug: assignedEmployee.slug,
      workflowId: resolvedWorkflowId,
      employeeName: assignedEmployee.name,
      workflowName: assignedWorkflowName,
      whatsappPhoneNumberId: options.whatsappPhoneNumberId,
    })

    // 7. Construct Durable Deployment Entity
    const deploymentRecord: ClientDeployment = {
      id: deploymentId,
      client_id: clientId,
      company_name: companyName,
      industry,
      contact_name: prospect.contact_name?.trim() || '',
      contact_phone: prospect.phone?.trim() || '',
      contact_email: prospect.email?.trim() || undefined,
      assigned_employee_id: assignedEmployee.id,
      assigned_employee_name: assignedEmployee.name,
      assigned_employee_slug: assignedEmployee.slug,
      assigned_workflow_id: resolvedWorkflowId,
      assigned_workflow_name: assignedWorkflowName,
      status: 'active',
      runtime_config: runtimeConfig,
      created_at: existingClient?.deployed_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Record in client_deployments table
    try {
      const { data: existingDeps } = await supabase
        .from('client_deployments')
        .select('*')
        .eq('id', deploymentId)

      if (Array.isArray(existingDeps) && existingDeps.length > 0) {
        await supabase
          .from('client_deployments')
          .update(deploymentRecord)
          .eq('id', deploymentId)
      } else {
        await supabase
          .from('client_deployments')
          .insert(deploymentRecord)
      }
    } catch (depErr) {
      // client_deployments table is auxiliary; clients record is primary
      console.warn('[Provisioner] client_deployments logging notice:', depErr)
    }

    return {
      success: true,
      deployment: deploymentRecord,
      client: clientRecord,
      isExisting,
    }
  } catch (err: any) {
    console.error('[Provisioner Exception]', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred during client workspace provisioning.',
    }
  }
}
