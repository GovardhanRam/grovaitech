'use server'

/**
 * Grovaitech AI Workforce OS
 * app/actions/auth-routing.ts
 *
 * Server-side route destination resolver for application entry.
 * Evaluates authenticated Supabase session, tenant memberships,
 * and database-backed roles to route to:
 *   - /dashboard (Founder Command Center)
 *   - /dashboard/customer (Customer Home)
 *   - /employee (Employee Home)
 *   - /onboarding (Unassigned Workspace)
 *   - /login (Unauthenticated)
 */

import { getAuthenticatedUser, getActiveTenantMemberships, isPlatformAdmin } from '@/lib/auth/tenant'

export interface AppEntryDestinationResult {
  destination: '/dashboard' | '/dashboard/customer' | '/employee' | '/onboarding' | '/login'
  isAuthenticated: boolean
  role?: string
  tenantType?: string
}

export async function resolveAppEntryDestination(userId?: string): Promise<AppEntryDestinationResult> {
  try {
    let resolvedUserId = userId

    if (!resolvedUserId) {
      const user = await getAuthenticatedUser()
      if (!user) {
        return {
          destination: '/login',
          isAuthenticated: false,
        }
      }
      resolvedUserId = user.id
    }

    // 1. Check platform administrative authority (Founder / Super Admin / Platform Operator)
    const isAdmin = await isPlatformAdmin(resolvedUserId)
    if (isAdmin) {
      return {
        destination: '/dashboard',
        isAuthenticated: true,
        role: 'platform_super_admin',
        tenantType: 'internal',
      }
    }

    // 2. Fetch authoritative database memberships
    const memberships = await getActiveTenantMemberships(resolvedUserId)

    if (!memberships || memberships.length === 0) {
      return {
        destination: '/onboarding',
        isAuthenticated: true,
      }
    }

    // 3. Inspect primary membership role and tenant type
    const primary = memberships[0]
    const role = primary.role
    const tenantType = primary.tenant?.type

    // Internal tenant owner/admin -> Founder Command Center
    if (tenantType === 'internal' && (role === 'owner' || role === 'admin')) {
      return {
        destination: '/dashboard',
        isAuthenticated: true,
        role,
        tenantType,
      }
    }

    // Internal tenant team member / operator -> Employee Home
    if (tenantType === 'internal' && (role === 'member' || role === 'platform_operator')) {
      return {
        destination: '/employee',
        isAuthenticated: true,
        role,
        tenantType,
      }
    }

    // Customer tenant owner/admin/member/viewer -> Customer Home
    if (tenantType === 'customer') {
      return {
        destination: '/dashboard/customer',
        isAuthenticated: true,
        role,
        tenantType,
      }
    }

    // Fallback: If role is owner or admin, send to founder dashboard
    if (role === 'owner' || role === 'admin') {
      return {
        destination: '/dashboard',
        isAuthenticated: true,
        role,
        tenantType,
      }
    }

    // Default authenticated destination
    return {
      destination: '/dashboard',
      isAuthenticated: true,
      role,
      tenantType,
    }
  } catch (error) {
    console.error('[resolveAppEntryDestination] Error resolving destination:', error)
    return {
      destination: '/login',
      isAuthenticated: false,
    }
  }
}
