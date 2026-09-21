'use server'

/**
 * Grovaitech AI Platform
 * app/actions/gbp-sales.ts
 *
 * Revenue-First Commercial GBP Sales Funnel (Step 1).
 * Exposes server actions for running Google Business Profile (GBP) audits,
 * extracting revenue leaks, and persisting prospects into the CRM.
 */

import { dispatchToolCall } from '@/lib/ai/dispatcher'
import { TOOL_NAMES } from '@/lib/ai/tools'
import { detectRevenueLeaks } from '@/lib/deployment/revenue-leaks'
import type { RevenueLeak } from '@/lib/deployment'
import { getAdminClient } from '@/app/actions/leads'

export interface GbpProspectInput {
  business_name: string
  category?: string
  address_nap?: string
  phone?: string
  website?: string
  hours?: string
  rating_info?: string
  services_products?: string
  attributes?: string
  photos_media_info?: string
  completeness_score_info?: string

  // Optional prospect identity & CRM metadata
  contact_name?: string
  email?: string
  location?: string
  budget?: string
  timeline?: string
  client_id?: string
  user_id?: string
  prospectId?: string
}

export interface GbpAuditSummary {
  score: number
  audit_score: number
  missing_fields: string[]
  recommendations: string[]
  revenue_leak: RevenueLeak | null
  timestamp: string
  audit_timestamp: string
  business_name: string
  business_info: {
    business_name: string
    category: string | null
    address_nap: string | null
    phone: string | null
    website: string | null
    hours: string | null
    rating_info: string | null
    services_products: string | null
  }
  details: Record<string, any>
}

export interface RunGbpAuditResult {
  success: boolean
  prospectId?: string
  audit?: GbpAuditSummary
  error?: string
}

/**
 * Step 1 Server Action: Executes a deterministic GBP profile audit for a prospect,
 * detects local SEO / reputation revenue leaks, and persists/updates the prospect
 * in real_estate_leads with lead_status = 'analyzed'.
 */
export async function runGbpAudit(
  prospectData: GbpProspectInput
): Promise<RunGbpAuditResult> {
  try {
    // 1. Validate minimum required prospect information
    if (!prospectData || typeof prospectData !== 'object') {
      return {
        success: false,
        error: 'Invalid input: prospect data must be a valid object.',
      }
    }

    const cleanBusinessName = prospectData.business_name?.trim()
    if (!cleanBusinessName || cleanBusinessName.length < 2) {
      return {
        success: false,
        error: "Validation Error: 'business_name' is required for GBP profile audit and must be at least 2 characters.",
      }
    }

    // 2. Call existing GBP audit tool directly (zero algorithm duplication)
    const toolResult = await dispatchToolCall(TOOL_NAMES.AUDIT_GBP_PROFILE, {
      business_name: cleanBusinessName,
      category: prospectData.category?.trim() || undefined,
      address_nap: prospectData.address_nap?.trim() || undefined,
      phone: prospectData.phone?.trim() || undefined,
      website: prospectData.website?.trim() || undefined,
      hours: prospectData.hours?.trim() || undefined,
      rating_info: prospectData.rating_info?.trim() || undefined,
      services_products: prospectData.services_products?.trim() || undefined,
      attributes: prospectData.attributes?.trim() || undefined,
      photos_media_info: prospectData.photos_media_info?.trim() || undefined,
      completeness_score_info: prospectData.completeness_score_info?.trim() || undefined,
      clientId: prospectData.client_id || undefined,
      authorizedClientId: prospectData.client_id || undefined,
    })

    if (!toolResult.success || !toolResult.result) {
      return {
        success: false,
        error: toolResult.error || 'Failed to execute GBP profile audit.',
      }
    }

    const auditResult = toolResult.result

    // 3. Detect Revenue Leaks using existing engine
    const leaks = detectRevenueLeaks({
      company_name: cleanBusinessName,
      industry: prospectData.category?.trim() || 'Local Business',
      known_problems: [
        'google business profile',
        'gbp',
        'local seo',
        'reviews',
        ...(auditResult.missing_sections || []),
      ],
      current_channels: ['Google Business Profile', 'Google Maps'],
    })
    const gbpLeak = leaks.find((l) => l.category === 'LOCAL_SEO_REPUTATION') || leaks[0] || null

    // 4. Prepare structured audit summary for UI and storage
    const auditTimestamp = new Date().toISOString()
    const auditSummary: GbpAuditSummary = {
      score: auditResult.completeness_score ?? 0,
      audit_score: auditResult.completeness_score ?? 0,
      missing_fields: auditResult.missing_sections || [],
      recommendations: auditResult.prioritized_recommendations || [],
      revenue_leak: gbpLeak,
      timestamp: auditTimestamp,
      audit_timestamp: auditTimestamp,
      business_name: cleanBusinessName,
      business_info: {
        business_name: cleanBusinessName,
        category: prospectData.category?.trim() || null,
        address_nap: prospectData.address_nap?.trim() || null,
        phone: prospectData.phone?.trim() || null,
        website: prospectData.website?.trim() || null,
        hours: prospectData.hours?.trim() || null,
        rating_info: prospectData.rating_info?.trim() || null,
        services_products: prospectData.services_products?.trim() || null,
      },
      details: auditResult,
    }

    // 5. Connect to Supabase admin client
    const supabase = await getAdminClient()
    const targetClientId = prospectData.client_id?.trim() || null
    const targetUserId = prospectData.user_id?.trim() || null
    const cleanPhone = prospectData.phone?.trim() || 'Unspecified'
    const cleanContactName = prospectData.contact_name?.trim() || cleanBusinessName
    const cleanLocation =
      prospectData.location?.trim() || prospectData.address_nap?.trim() || 'Unspecified'
    const cleanBudget = prospectData.budget?.trim() || 'GBP Growth & Reputation Package'
    const cleanTimeline = prospectData.timeline?.trim() || 'Immediate'

    // 6. Look up existing prospect by ID or Phone (within tenant scope)
    let existingLead: any = null
    if (prospectData.prospectId) {
      const { data, error } = await supabase
        .from('real_estate_leads')
        .select('*')
        .eq('id', prospectData.prospectId)
        .single()
      if (data && !error) {
        existingLead = data
      }
    } else if (cleanPhone !== 'Unspecified') {
      let query = supabase.from('real_estate_leads').select('*').eq('phone', cleanPhone)
      if (targetClientId) {
        query = query.eq('client_id', targetClientId)
      }
      const { data: matches } = await query
      if (Array.isArray(matches) && matches.length > 0) {
        existingLead = matches[0]
      }
    }

    // 7. Preserve existing prospect metadata and merge GBP audit
    let existingMeta: Record<string, any> = {}
    if (existingLead?.notes) {
      try {
        if (typeof existingLead.notes === 'string' && existingLead.notes.startsWith('{')) {
          existingMeta = JSON.parse(existingLead.notes)
        } else {
          existingMeta = { raw_notes: existingLead.notes }
        }
      } catch {
        existingMeta = { raw_notes: existingLead.notes }
      }
    }

    const updatedMeta = {
      ...existingMeta,
      company_name: cleanBusinessName,
      industry: prospectData.category?.trim() || existingMeta.industry || 'Local Business',
      website: prospectData.website?.trim() || existingMeta.website || null,
      contact_name: cleanContactName,
      phone: cleanPhone !== 'Unspecified' ? cleanPhone : existingMeta.phone || null,
      email: prospectData.email?.trim() || existingMeta.email || null,
      location: cleanLocation !== 'Unspecified' ? cleanLocation : existingMeta.location || null,
      gbp_audit: auditSummary,
      prospect_status: 'analyzed',
      updated_at: auditTimestamp,
    }

    const payload = {
      name: cleanContactName,
      phone: cleanPhone !== 'Unspecified' ? cleanPhone : (existingLead?.phone || cleanPhone),
      email: prospectData.email?.trim() || existingLead?.email || null,
      location: cleanLocation !== 'Unspecified' ? cleanLocation : (existingLead?.location || cleanLocation),
      budget: cleanBudget !== 'GBP Growth & Reputation Package' ? cleanBudget : (existingLead?.budget || cleanBudget),
      timeline: cleanTimeline !== 'Immediate' ? cleanTimeline : (existingLead?.timeline || cleanTimeline),
      lead_status: 'analyzed',
      lead_score: (auditResult.completeness_score ?? 0) < 60 ? 'hot' : 'warm',
      source: existingLead?.source || 'ai_demo',
      notes: JSON.stringify(updatedMeta),
      client_id: targetClientId || existingLead?.client_id || null,
      user_id: targetUserId || existingLead?.user_id || null,
    }

    // 8. Execute Database Update or Insert
    let savedId: string
    if (existingLead) {
      savedId = existingLead.id
      const { error: updateError } = await supabase
        .from('real_estate_leads')
        .update(payload)
        .eq('id', existingLead.id)
        .select()
        .single()

      if (updateError) {
        return {
          success: false,
          error: `Failed to update prospect with audit results: ${updateError.message}`,
        }
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('real_estate_leads')
        .insert(payload)
        .select()
        .single()

      if (insertError) {
        return {
          success: false,
          error: `Failed to save new prospect with audit results: ${insertError.message}`,
        }
      }
      savedId = inserted?.id || inserted?.[0]?.id || `prospect-${Date.now()}`
    }

    return {
      success: true,
      prospectId: savedId,
      audit: auditSummary,
    }
  } catch (err: any) {
    console.error('[runGbpAudit Exception]', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while executing the GBP audit.',
    }
  }
}

export type OutreachChannel = 'whatsapp' | 'email' | 'call'

export type OutreachOutcome =
  | 'sent'
  | 'replied'
  | 'no_response'
  | 'interested'
  | 'not_interested'

export interface RecordProspectOutreachInput {
  channel: OutreachChannel
  outcome?: OutreachOutcome
  notes?: string
}

export interface OutreachRecord {
  channel: OutreachChannel
  outcome?: OutreachOutcome
  notes: string | null
  timestamp: string
}

export interface RecordProspectOutreachResult {
  success: boolean
  leadId?: string
  status?: string
  outreach?: OutreachRecord
  error?: string
}

const ALLOWED_CHANNELS: OutreachChannel[] = ['whatsapp', 'email', 'call']
const ALLOWED_OUTCOMES: OutreachOutcome[] = [
  'sent',
  'replied',
  'no_response',
  'interested',
  'not_interested',
]

/**
 * Step 2 Server Action: Records outreach attempt / response for a GBP prospect,
 * updates the lead lifecycle status according to outreach outcome, and preserves
 * complete structured history and existing metadata in real_estate_leads.notes.
 */
export async function recordProspectOutreach(
  leadId: string,
  outreach: RecordProspectOutreachInput
): Promise<RecordProspectOutreachResult> {
  try {
    // 1. Validate leadId
    if (!leadId || typeof leadId !== 'string' || !leadId.trim()) {
      return {
        success: false,
        error: "Validation Error: 'leadId' is required and must be a non-empty string.",
      }
    }
    const cleanLeadId = leadId.trim()

    // 2. Validate channel
    if (!outreach || typeof outreach !== 'object') {
      return {
        success: false,
        error: "Validation Error: 'outreach' must be a valid object.",
      }
    }

    if (!outreach.channel || !ALLOWED_CHANNELS.includes(outreach.channel)) {
      return {
        success: false,
        error: `Validation Error: Invalid channel '${outreach.channel}'. Allowed channels: ${ALLOWED_CHANNELS.join(', ')}.`,
      }
    }

    // 3. Validate outcome when supplied
    if (outreach.outcome !== undefined && !ALLOWED_OUTCOMES.includes(outreach.outcome)) {
      return {
        success: false,
        error: `Validation Error: Invalid outcome '${outreach.outcome}'. Allowed outcomes: ${ALLOWED_OUTCOMES.join(', ')}.`,
      }
    }

    // 4. Find existing lead using standard admin client
    const supabase = await getAdminClient()
    const { data: existingLead, error: fetchError } = await supabase
      .from('real_estate_leads')
      .select('*')
      .eq('id', cleanLeadId)
      .single()

    if (fetchError || !existingLead) {
      return {
        success: false,
        error: `Prospect not found: ${fetchError?.message || `No lead found with ID '${cleanLeadId}'`}`,
      }
    }

    // 5. Read existing notes safely (guarding against malformed JSON or raw string notes)
    let existingMeta: Record<string, any> = {}
    if (existingLead.notes) {
      try {
        if (typeof existingLead.notes === 'string' && existingLead.notes.startsWith('{')) {
          existingMeta = JSON.parse(existingLead.notes)
        } else {
          existingMeta = { raw_notes: existingLead.notes }
        }
      } catch {
        existingMeta = { raw_notes: existingLead.notes }
      }
    }

    // 6. Build outreach record with ISO timestamp
    const nowIso = new Date().toISOString()
    const newOutreachEntry: OutreachRecord = {
      channel: outreach.channel,
      ...(outreach.outcome ? { outcome: outreach.outcome } : {}),
      notes: outreach.notes?.trim() || null,
      timestamp: nowIso,
    }

    // 7. Append outreach record to outreach_history
    const history: OutreachRecord[] = Array.isArray(existingMeta.outreach_history)
      ? [...existingMeta.outreach_history]
      : []
    history.push(newOutreachEntry)

    // 8. Update lead_status according to existing lifecycle:
    // - sent / no_response -> "contacted"
    // - replied / interested -> "qualified"
    // - not_interested -> "lost"
    // Do not change status if an outcome does not require a transition.
    let targetStatus: string = existingLead.lead_status || 'analyzed'
    if (outreach.outcome === 'sent' || outreach.outcome === 'no_response') {
      targetStatus = 'contacted'
    } else if (outreach.outcome === 'replied' || outreach.outcome === 'interested') {
      targetStatus = 'qualified'
    } else if (outreach.outcome === 'not_interested') {
      targetStatus = 'lost'
    }

    // 9. Preserve all existing metadata and merge outreach
    const updatedMeta = {
      ...existingMeta,
      outreach_history: history,
      last_outreach: newOutreachEntry,
      prospect_status: targetStatus,
      updated_at: nowIso,
    }

    // 10. Persist to real_estate_leads table
    const { error: updateError } = await supabase
      .from('real_estate_leads')
      .update({
        lead_status: targetStatus,
        notes: JSON.stringify(updatedMeta),
      })
      .eq('id', cleanLeadId)

    if (updateError) {
      return {
        success: false,
        error: `Failed to record outreach: ${updateError.message}`,
      }
    }

    return {
      success: true,
      leadId: cleanLeadId,
      status: targetStatus,
      outreach: newOutreachEntry,
    }
  } catch (err: any) {
    console.error('[recordProspectOutreach Exception]', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while recording outreach.',
    }
  }
}

