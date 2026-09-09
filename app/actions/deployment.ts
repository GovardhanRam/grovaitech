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
  type ProspectRecord,
} from '@/lib/deployment'
import { createLead, getAdminClient, type LeadData } from '@/app/actions/leads'

export interface AnalyzeProspectResult {
  success: boolean
  data?: DeploymentAnalysis
  error?: string
}

export interface SaveQualifiedProspectToCrmResult {
  success: boolean
  data?: any
  leadId?: string
  crm_status?: string
  isUpdate?: boolean
  error?: string
  missingFields?: string[]
}

export interface SaveProspectResult {
  success: boolean
  data?: any
  prospectId?: string
  error?: string
}

export interface GetProspectsResult {
  success: boolean
  data?: ProspectRecord[]
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
 * If prospectId is provided, transitions the prospect status to 'analyzed' and persists findings in CRM.
 */
export async function analyzeProspectForDeployment(
  prospect: Prospect,
  prospectId?: string
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

    if (prospectId) {
      analysis.prospect_id = prospectId
      analysis.crm_status = 'analyzed'

      try {
        const supabase = await getAdminClient()
        const { data: existing } = await supabase
          .from('real_estate_leads')
          .select('notes')
          .eq('id', prospectId)
          .single()

        let meta: any = {}
        try {
          if (existing?.notes?.startsWith('{')) {
            meta = JSON.parse(existing.notes)
          }
        } catch {
          // non-json notes
        }

        meta.company_name = prospect.company_name
        meta.industry = prospect.industry
        meta.analysis = analysis
        meta.prospect_status = 'analyzed'
        meta.updated_at = new Date().toISOString()

        await supabase
          .from('real_estate_leads')
          .update({
            lead_status: 'analyzed',
            notes: JSON.stringify(meta),
          })
          .eq('id', prospectId)
      } catch (saveErr) {
        console.warn('[Analyze Prospect CRM Status Update Notice]', saveErr)
      }
    }

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
 * Server action to persist or update a prospect in the existing CRM architecture.
 * Automatically initializes status as 'new' (or specified lifecycle status).
 */
export async function saveProspect(
  prospect: Prospect,
  status: 'new' | 'analyzed' | 'demo_ready' | 'qualified' = 'new',
  prospectId?: string
): Promise<SaveProspectResult> {
  try {
    if (!prospect || typeof prospect !== 'object') {
      return { success: false, error: 'Invalid input: prospect must be a valid object.' }
    }
    if (!prospect.company_name || !prospect.company_name.trim()) {
      return { success: false, error: 'Company name is required.' }
    }
    if (!prospect.industry || !prospect.industry.trim()) {
      return { success: false, error: 'Industry is required.' }
    }

    const supabase = await getAdminClient()
    const cleanCompanyName = prospect.company_name.trim()
    const contactName = prospect.contact_name?.trim() || cleanCompanyName
    const cleanPhone = prospect.phone?.trim() || 'Unspecified'
    const cleanLocation = prospect.location?.trim() || 'Unspecified'
    const cleanBudget = prospect.budget?.trim() || 'Unspecified'
    const cleanTimeline = prospect.timeline?.trim() || 'Unspecified'

    const prospectMetadata = {
      company_name: cleanCompanyName,
      industry: prospect.industry.trim(),
      website: prospect.website?.trim() || null,
      description: prospect.description?.trim() || null,
      known_problems: prospect.known_problems || [],
      current_channels: prospect.current_channels || [],
      contact_name: prospect.contact_name?.trim() || null,
      phone: prospect.phone?.trim() || null,
      email: prospect.email?.trim() || null,
      location: prospect.location?.trim() || null,
      budget: prospect.budget?.trim() || null,
      timeline: prospect.timeline?.trim() || null,
      prospect_status: status,
      updated_at: new Date().toISOString(),
    }

    const payload = {
      name: contactName,
      phone: cleanPhone,
      email: prospect.email?.trim() || null,
      location: cleanLocation,
      budget: cleanBudget,
      timeline: cleanTimeline,
      lead_status: status,
      source: 'ai_demo',
      notes: JSON.stringify(prospectMetadata),
    }

    if (prospectId) {
      const { data, error } = await supabase
        .from('real_estate_leads')
        .update(payload)
        .eq('id', prospectId)
        .select()
        .single()

      if (error) {
        return { success: false, error: 'Failed to update prospect in CRM: ' + error.message }
      }
      return { success: true, data, prospectId }
    }

    // Check if matching phone already exists
    let existingId: string | null = null
    if (prospect.phone && prospect.phone.trim() !== 'Unspecified') {
      const { data: matches } = await supabase
        .from('real_estate_leads')
        .select('id')
        .eq('phone', cleanPhone)

      if (Array.isArray(matches) && matches.length > 0) {
        existingId = matches[0].id
      }
    }

    if (existingId) {
      const { data, error } = await supabase
        .from('real_estate_leads')
        .update(payload)
        .eq('id', existingId)
        .select()
        .single()

      if (error) {
        return { success: false, error: 'Failed to update existing prospect in CRM: ' + error.message }
      }
      return { success: true, data, prospectId: existingId }
    }

    // Insert new prospect record
    const { data, error } = await supabase
      .from('real_estate_leads')
      .insert(payload)
      .select()
      .single()

    if (error) {
      return { success: false, error: 'Failed to save prospect to CRM: ' + error.message }
    }

    return { success: true, data, prospectId: data?.id }
  } catch (err: any) {
    console.error('[Save Prospect Error]', err)
    return { success: false, error: err?.message || 'Failed to save prospect.' }
  }
}

/**
 * Server action to retrieve persisted prospects from the CRM.
 */
export async function getProspects(): Promise<GetProspectsResult> {
  try {
    const supabase = await getAdminClient()
    const { data, error } = await supabase
      .from('real_estate_leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { success: false, error: 'Failed to fetch prospects from CRM: ' + error.message }
    }

    const records: ProspectRecord[] = (data || []).map((row: any) => {
      let metadata: any = {}
      try {
        if (row.notes && row.notes.startsWith('{')) {
          metadata = JSON.parse(row.notes)
        }
      } catch {
        // non-json notes
      }

      const status = (row.lead_status || 'new') as ProspectRecord['status']

      return {
        id: row.id,
        company_name: metadata.company_name || row.notes?.match(/prospect:\s*([^(]+)/)?.[1]?.trim() || row.name || 'Unnamed Prospect',
        industry: metadata.industry || 'General Business',
        contact_name: metadata.contact_name || row.name,
        phone: metadata.phone || (row.phone !== 'Unspecified' ? row.phone : undefined),
        email: metadata.email || row.email || undefined,
        location: metadata.location || (row.location !== 'Unspecified' ? row.location : undefined),
        budget: metadata.budget || (row.budget !== 'Unspecified' ? row.budget : undefined),
        timeline: metadata.timeline || (row.timeline !== 'Unspecified' ? row.timeline : undefined),
        known_problems: metadata.known_problems || [],
        current_channels: metadata.current_channels || [],
        status,
        analysis: metadata.analysis || undefined,
        created_at: row.created_at || new Date().toISOString(),
        updated_at: metadata.updated_at || undefined,
      }
    })

    return { success: true, data: records }
  } catch (err: any) {
    console.error('[Get Prospects Error]', err)
    return { success: false, error: err?.message || 'Failed to retrieve prospects.' }
  }
}

/**
 * Server action to transition prospect to demo_ready state upon demo generation.
 */
export async function markProspectDemoReady(
  prospectId: string,
  demoPlan?: any
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!prospectId) return { success: false, error: 'Prospect ID is required.' }
    const supabase = await getAdminClient()
    const { data: existing } = await supabase
      .from('real_estate_leads')
      .select('notes')
      .eq('id', prospectId)
      .single()

    let meta: any = {}
    try {
      if (existing?.notes?.startsWith('{')) meta = JSON.parse(existing.notes)
    } catch {}

    if (demoPlan) meta.demo_plan = demoPlan
    meta.prospect_status = 'demo_ready'
    meta.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('real_estate_leads')
      .update({
        lead_status: 'demo_ready',
        notes: JSON.stringify(meta),
      })
      .eq('id', prospectId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update prospect demo status.' }
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
  prospect: Prospect,
  prospectId?: string
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

    // If a prospectId is provided, update the existing prospect record directly in real_estate_leads
    if (prospectId) {
      const supabase = await getAdminClient()
      const { data: existing } = await supabase
        .from('real_estate_leads')
        .select('notes')
        .eq('id', prospectId)
        .single()

      let meta: any = {}
      try {
        if (existing?.notes?.startsWith('{')) meta = JSON.parse(existing.notes)
      } catch {}

      meta.prospect_status = 'qualified'
      meta.crm_status = 'qualified'
      meta.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('real_estate_leads')
        .update({
          lead_status: 'qualified',
          notes: JSON.stringify(meta),
        })
        .eq('id', prospectId)
        .select()
        .single()

      if (error) {
        return {
          success: false,
          error: 'Failed to update prospect to qualified in CRM: ' + error.message,
        }
      }

      return {
        success: true,
        data: data || { id: prospectId },
        leadId: prospectId,
        crm_status: 'qualified',
        isUpdate: true,
      }
    }

    // Otherwise forward to canonical createLead
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
      leadId: result.data?.id,
      crm_status: 'qualified',
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

