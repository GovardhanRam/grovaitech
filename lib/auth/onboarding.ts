/**
 * Grovaitech AI Platform
 * lib/auth/onboarding.ts
 *
 * Self-Serve Customer Onboarding Service.
 * Allows authenticated users without tenant memberships to create their initial tenant workspace
 * and automatically sets them as the tenant 'owner'.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from './tenant'

export interface CreateTenantOnboardingInput {
  companyName: string
  industry: string
}

export interface CreateTenantOnboardingResult {
  success: boolean
  tenantId?: string
  slug?: string
  error?: string
}

export function generateTenantSlug(companyName: string): string {
  const base = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return base || 'workspace'
}

export function generateTenantId(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).substring(2, 7)
  return `client-${ts}-${rand}`
}

export async function createTenantWorkspace(
  input: CreateTenantOnboardingInput
): Promise<CreateTenantOnboardingResult> {
  // 1. Authenticate caller strictly via verified Supabase session
  const user = await getAuthenticatedUser()
  if (!user || !user.id) {
    return {
      success: false,
      error: 'Unauthorized: Authenticated user session required for workspace onboarding.',
    }
  }
  const userId = user.id

  // 2. Validate input
  const companyName = input.companyName?.trim()
  const industry = input.industry?.trim()

  if (!companyName || companyName.length < 2) {
    return {
      success: false,
      error: 'Company name must be at least 2 characters long.',
    }
  }

  if (companyName.length > 100) {
    return {
      success: false,
      error: 'Company name must not exceed 100 characters.',
    }
  }

  if (!industry || industry.length < 2) {
    return {
      success: false,
      error: 'Industry is required.',
    }
  }

  // 3. Resolve Admin/Service Supabase Client to safely interact with RLS-guarded tables
  const db = await createAdminClient()

  // 4. Generate unique slug
  const baseSlug = generateTenantSlug(companyName)
  let candidateSlug = baseSlug
  let counter = 1

  while (counter <= 50) {
    const { data: existingSlug } = await db
      .from('tenants')
      .select('id')
      .eq('slug', candidateSlug)
      .maybeSingle()

    if (!existingSlug) break
    counter++
    candidateSlug = `${baseSlug}-${counter}`
  }

  // 5. Insert Tenant with retry on slug unique constraint collision
  let tenantId = generateTenantId()
  let finalSlug = candidateSlug
  let inserted = false
  let lastTenantError: any = null

  for (let attempt = 0; attempt < 5; attempt++) {
    tenantId = generateTenantId()
    const now = new Date().toISOString()
    const { error: tenantError } = await db.from('tenants').insert({
      id: tenantId,
      name: companyName,
      slug: finalSlug,
      type: 'customer',
      industry,
      status: 'active',
      created_at: now,
      updated_at: now,
    })

    if (!tenantError) {
      inserted = true
      break
    }

    lastTenantError = tenantError
    const isSlugCollision =
      tenantError.code === '23505' ||
      tenantError.message?.toLowerCase().includes('slug') ||
      tenantError.message?.toLowerCase().includes('duplicate') ||
      tenantError.message?.toLowerCase().includes('unique')

    if (isSlugCollision) {
      counter++
      finalSlug = `${baseSlug}-${counter}`
    } else {
      break
    }
  }

  if (!inserted) {
    return {
      success: false,
      error: `Failed to create tenant: ${lastTenantError?.message || 'Database error'}`,
    }
  }

  // 6. Insert Owner Membership with compensating rollback on failure
  const now = new Date().toISOString()
  const { error: memberError } = await db.from('tenant_memberships').insert({
    tenant_id: tenantId,
    user_id: userId,
    role: 'owner',
    status: 'active',
    created_at: now,
    updated_at: now,
  })

  if (memberError) {
    // Compensating rollback: delete orphaned tenant record to preserve database integrity
    try {
      await db.from('tenants').delete().eq('id', tenantId)
    } catch (cleanupErr) {
      console.error('[Onboarding Rollback Error] Failed to delete orphaned tenant:', cleanupErr)
    }

    return {
      success: false,
      error: `Failed to bind owner membership: ${memberError.message}`,
    }
  }

  return {
    success: true,
    tenantId,
    slug: finalSlug,
  }
}

export interface ProvisionTenantClientInput {
  name: string
  email?: string
  industry: string
  services?: string[]
}

/**
 * Server-side provisioning service for creating client tenants from the dashboard.
 * Requires authenticated user, creates customer tenant, binds caller as owner,
 * and maintains backward-compatible record in legacy clients table.
 */
export async function provisionTenantClient(
  input: ProvisionTenantClientInput
): Promise<CreateTenantOnboardingResult> {
  const user = await getAuthenticatedUser()
  if (!user || !user.id) {
    return {
      success: false,
      error: 'Unauthorized: Authenticated session required to provision a client workspace.',
    }
  }

  const workspaceResult = await createTenantWorkspace({
    companyName: input.name,
    industry: input.industry,
  })

  if (!workspaceResult.success || !workspaceResult.tenantId) {
    return workspaceResult
  }

  // Also maintain backward-compatible legacy clients record
  try {
    const db = await createAdminClient()
    await db.from('clients').insert({
      id: workspaceResult.tenantId,
      name: input.name,
      email: input.email || '',
      industry: input.industry,
      status: 'Active',
      services: input.services || [],
    })
  } catch (legacyErr) {
    console.warn('[Provisioning] Notice on legacy clients synchronization:', legacyErr)
  }

  return workspaceResult
}
