/**
 * Grovaitech AI Platform
 * lib/auth/tenant.ts
 *
 * Core Reusable Server-Side Tenant Authorization Service.
 * Authoritatively resolves authenticated users, database-backed tenant memberships,
 * workspace permissions, and platform administrative privileges.
 *
 * Security Invariants:
 *   1. Identity is strictly resolved server-side from auth.users (via cookies).
 *   2. Tenant memberships are strictly queried from public.tenant_memberships.
 *   3. Never trust user_metadata.client_id, app_metadata.client_id, or client-supplied tenant IDs.
 *   4. Platform admin privileges are strictly derived from database membership roles,
 *      never from email addresses, domain names, or JWT claims.
 */

import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import type {
  Tenant,
  TenantMembership,
  AuthenticatedUser,
  TenantAuthResult,
  TenantAuthSuccess,
} from './types'
import { TenantAuthorizationError } from './types'

/**
 * Returns an internal database client with appropriate privileges.
 * Uses createAdminClient (service role) if SUPABASE_SERVICE_ROLE_KEY is present
 * to query across default-deny RLS tables safely server-side, falling back to createServerClient.
 */
async function getDbClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return await createAdminClient()
    } catch {
      // Fallback
    }
  }
  return await createServerClient()
}

/**
 * Retrieves the currently authenticated user from the active session.
 * Does not trust any caller-supplied user identifiers.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    }
  } catch {
    return null
  }
}

/**
 * Retrieves all active workspace memberships for a user from public.tenant_memberships,
 * hydrating each membership with its associated public.tenants record.
 */
export async function getActiveTenantMemberships(
  userId: string
): Promise<TenantMembership[]> {
  if (!userId) return []

  const db = await getDbClient()

  const { data: memberships, error: memError } = await db
    .from('tenant_memberships')
    .select('id, tenant_id, user_id, role, status, created_at, updated_at')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (memError || !memberships || memberships.length === 0) {
    return []
  }

  // Fetch corresponding tenant entities
  const tenantIds = Array.from(new Set(memberships.map((m: any) => m.tenant_id)))
  const { data: tenants, error: tenantError } = await db
    .from('tenants')
    .select('id, name, slug, type, industry, status, created_at, updated_at')
    .in('id', tenantIds)
    .eq('status', 'active')

  if (tenantError || !tenants) {
    return []
  }

  const tenantMap = new Map<string, Tenant>()
  for (const t of tenants) {
    tenantMap.set(t.id, t as Tenant)
  }

  // Bind active tenant entities to memberships (filter out archived/missing tenants)
  const activeHydratedMemberships: TenantMembership[] = []
  for (const mem of memberships) {
    const tenant = tenantMap.get(mem.tenant_id)
    if (tenant) {
      activeHydratedMemberships.push({
        ...mem,
        tenant,
      })
    }
  }

  return activeHydratedMemberships
}

/**
 * Determines whether a user holds platform administrative authority.
 * Privileges must be database-backed via explicit role or internal tenant membership.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  if (!userId) return false

  const memberships = await getActiveTenantMemberships(userId)

  for (const m of memberships) {
    // 1. Explicit global platform super admin or operator role
    if (m.role === 'platform_super_admin' || m.role === 'platform_operator') {
      return true
    }
    // 2. Owner or Admin of an internal (Grovaitech operator) tenant
    if (m.tenant?.type === 'internal' && (m.role === 'owner' || m.role === 'admin')) {
      return true
    }
  }

  return false
}

export interface ResolveTenantOptions {
  requestedTenantId?: string | null
}

/**
 * Resolves and validates an authorized tenant workspace for the current session.
 * If requestedTenantId is specified, verifies the user has active membership in that tenant
 * or possesses verified platform administrative privileges.
 */
export async function resolveAuthorizedTenant(
  options: ResolveTenantOptions = {}
): Promise<TenantAuthResult> {
  // 1. Authenticate user strictly server-side
  const user = await getAuthenticatedUser()
  if (!user) {
    return {
      success: false,
      error: 'Authentication required. No valid user session found.',
      status: 401,
      user: null,
    }
  }

  // 2. Query active memberships from database
  const memberships = await getActiveTenantMemberships(user.id)
  const userIsPlatformAdmin = await isPlatformAdmin(user.id)

  const requested = options.requestedTenantId?.trim()

  // 3. Handle explicit tenant request
  if (requested) {
    const directMembership = memberships.find((m) => m.tenant_id === requested)
    if (directMembership && directMembership.tenant) {
      return {
        success: true,
        user,
        tenant: directMembership.tenant,
        tenantId: directMembership.tenant_id,
        membership: directMembership,
        role: directMembership.role,
        isPlatformAdmin: userIsPlatformAdmin,
      }
    }

    // If not a direct member, permit access ONLY if verified platform admin
    if (userIsPlatformAdmin) {
      const db = await getDbClient()
      const { data: targetTenant, error: targetError } = await db
        .from('tenants')
        .select('id, name, slug, type, industry, status, created_at, updated_at')
        .eq('id', requested)
        .eq('status', 'active')
        .maybeSingle()

      if (targetTenant && !targetError) {
        const syntheticMembership: TenantMembership = {
          id: `platform-admin-override-${user.id}`,
          tenant_id: targetTenant.id,
          user_id: user.id,
          role: 'platform_super_admin',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          tenant: targetTenant as Tenant,
        }

        return {
          success: true,
          user,
          tenant: targetTenant as Tenant,
          tenantId: targetTenant.id,
          membership: syntheticMembership,
          role: 'platform_super_admin',
          isPlatformAdmin: true,
        }
      }
    }

    // Access to the requested tenant is forbidden
    return {
      success: false,
      error: `Forbidden: You do not have permission to access workspace "${requested}".`,
      status: 403,
      user,
    }
  }

  // 4. Default to user's primary active tenant if no specific tenant requested
  if (memberships.length === 0) {
    return {
      success: false,
      error: 'User has no active workspace memberships. Workspace setup or invitation required.',
      status: 403,
      user,
    }
  }

  const primaryMembership = memberships[0]
  if (!primaryMembership.tenant) {
    return {
      success: false,
      error: 'Active tenant entity could not be retrieved for workspace membership.',
      status: 500,
      user,
    }
  }

  return {
    success: true,
    user,
    tenant: primaryMembership.tenant,
    tenantId: primaryMembership.tenant_id,
    membership: primaryMembership,
    role: primaryMembership.role,
    isPlatformAdmin: userIsPlatformAdmin,
  }
}

/**
 * Guard utility for server actions and route handlers.
 * Returns TenantAuthResult for branching logic.
 */
export async function requireTenantAccess(
  requestedTenantId?: string | null
): Promise<TenantAuthResult> {
  return resolveAuthorizedTenant({ requestedTenantId })
}

/**
 * Assertive guard utility for server actions.
 * Returns TenantAuthSuccess or throws a TenantAuthorizationError.
 */
export async function assertTenantAccess(
  requestedTenantId?: string | null
): Promise<TenantAuthSuccess> {
  const result = await resolveAuthorizedTenant({ requestedTenantId })
  if (!result.success) {
    throw new TenantAuthorizationError(result.error, result.status)
  }
  return result
}
