'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export interface LeadData {
  name: string
  phone: string
  email?: string
  property_type?: 'apartment' | 'villa' | 'house' | 'plot' | 'commercial' | 'other'
  location: string
  budget: string
  timeline: string
  site_visit_requested?: boolean
  site_visit_date?: string
  site_visit_time?: string
  lead_score?: 'hot' | 'warm' | 'cold'
  lead_status?: 'new' | 'contacted' | 'qualified' | 'site_visit' | 'converted' | 'lost'
  notes?: string
  source?: 'ai_demo' | 'whatsapp' | 'website' | 'manual'
  user_id?: string
  client_id?: string
  deployment_id?: string
}

const ALLOWED_STATUSES = ['new', 'contacted', 'qualified', 'site_visit', 'converted', 'lost']

// Helper to get a secure administrative client on the server to bypass RLS for public demo leads
async function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const isMock = !url || url.includes('placeholder') || url === ''

  if (isMock) {
    // Local fallback/mock mode uses the mock client
    return createServerClient()
  }

  if (!serviceKey) {
    // Fall back to server client
    return createServerClient()
  }

  // Return server-only service role client bypassing RLS
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
}

export async function createLead(lead: LeadData) {
  console.log('=== createLead Action Started ===', { phone: lead.phone, name: lead.name })

  // Validate required fields
  if (!lead.name || !lead.name.trim()) {
    return { success: false, error: 'Name is required' }
  }
  if (!lead.phone || !lead.phone.trim()) {
    return { success: false, error: 'Phone number is required' }
  }
  if (!lead.location || !lead.location.trim()) {
    return { success: false, error: 'Location of interest is required' }
  }
  if (!lead.budget || !lead.budget.trim()) {
    return { success: false, error: 'Budget is required' }
  }
  if (!lead.timeline || !lead.timeline.trim()) {
    return { success: false, error: 'Timeline is required' }
  }

  try {
    const supabase = await getAdminClient()
    const cleanPhone = lead.phone.trim()

    const targetClientId = lead.client_id?.trim() || null

    // ── Idempotency Check: Prevent duplicate lead creation for same phone within the same tenant ──
    const { data: allLeadsMatchingPhone } = await supabase
      .from('real_estate_leads')
      .select('*')
      .eq('phone', cleanPhone)

    let existingLead: any = null
    if (Array.isArray(allLeadsMatchingPhone) && allLeadsMatchingPhone.length > 0) {
      if (targetClientId) {
        // Tenant-scoped deduplication: Match phone AND client_id
        existingLead = allLeadsMatchingPhone.find(
          (l: any) => l.client_id === targetClientId
        )
      } else {
        // Unscoped / Legacy deduplication: Match phone when client_id is absent/null
        existingLead = allLeadsMatchingPhone.find(
          (l: any) => !l.client_id
        ) || allLeadsMatchingPhone[0]
      }
    }

    const payload = {
      name: lead.name.trim(),
      phone: cleanPhone,
      email: lead.email?.trim() || null,
      property_type: lead.property_type || null,
      location: lead.location.trim(),
      budget: lead.budget.trim(),
      timeline: lead.timeline.trim(),
      site_visit_requested: !!lead.site_visit_requested,
      site_visit_date: lead.site_visit_date || null,
      site_visit_time: lead.site_visit_time || null,
      lead_score: lead.lead_score || (lead.site_visit_requested ? 'hot' : 'warm'),
      lead_status: lead.lead_status || (lead.site_visit_requested ? 'site_visit' : 'qualified'),
      notes: lead.notes || null,
      source: lead.source || 'ai_demo',
      user_id: lead.user_id || null,
      client_id: targetClientId,
      deployment_id: lead.deployment_id?.trim() || null,
    }

    if (existingLead) {
      const existingId = existingLead.id
      console.log(`Updating existing lead ${existingId} for phone ${cleanPhone} (tenant: ${targetClientId || 'unscoped'})`)
      const { data: updated, error: updateError } = await supabase
        .from('real_estate_leads')
        .update(payload)
        .eq('id', existingId)
        .select()
        .single()

      if (updateError) {
        console.error('Database update error:', updateError)
        return { success: false, error: 'Failed to update lead: ' + updateError.message }
      }
      return { success: true, data: updated || existingLead, isUpdate: true }
    }

    // New lead creation
    const { data, error } = await supabase
      .from('real_estate_leads')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Database insert error:', error)
      return { success: false, error: 'Failed to save lead: ' + error.message }
    }

    console.log('Lead created successfully:', data)
    return { success: true, data, isUpdate: false }
  } catch (err: any) {
    console.error('createLead Exception:', err)
    return { success: false, error: err.message || String(err) }
  }
}

export async function getLeads() {
  console.log('=== getLeads Action Started ===')

  try {
    const supabase = await createServerClient()
    
    // Attempt to get authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    let query = supabase.from('real_estate_leads').select('*')

    if (user) {
      // In authenticated mode, show leads assigned to the user or unassigned (public demo) leads
      query = query.or(`user_id.eq.${user.id},user_id.is.null`)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Database fetch error:', error)
      return { success: false, error: 'Failed to fetch leads: ' + error.message }
    }

    return { success: true, data: data || [] }
  } catch (err: any) {
    console.error('getLeads Exception:', err)
    return { success: false, error: err.message || String(err) }
  }
}

export async function updateLeadStatus(id: string, status: string) {
  console.log('=== updateLeadStatus Action Started ===', { id, status })

  if (!ALLOWED_STATUSES.includes(status)) {
    return { success: false, error: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}` }
  }

  try {
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from('real_estate_leads')
      .update({ lead_status: status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Database update error:', error)
      return { success: false, error: 'Failed to update lead status: ' + error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    console.error('updateLeadStatus Exception:', err)
    return { success: false, error: err.message || String(err) }
  }
}
