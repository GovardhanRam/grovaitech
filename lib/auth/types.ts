/**
 * Grovaitech AI Platform
 * lib/auth/types.ts
 *
 * Authoritative Type Definitions for Multi-Tenant Workspace Security.
 * Defines canonical structures for Tenants, Tenant Memberships, Workspace Roles,
 * and Server-Side Authorization Resolution.
 */

export type TenantType = 'customer' | 'internal'
export type TenantStatus = 'active' | 'suspended' | 'archived'

export interface Tenant {
  id: string
  name: string
  slug: string
  type: TenantType
  industry?: string | null
  status: TenantStatus
  created_at: string
  updated_at: string
}

export type TenantRole =
  | 'owner'
  | 'admin'
  | 'member'
  | 'viewer'
  | 'platform_super_admin'
  | 'platform_operator'

export type MembershipStatus = 'active' | 'suspended'

export interface TenantMembership {
  id: string
  tenant_id: string
  user_id: string
  role: TenantRole
  status: MembershipStatus
  created_at: string
  updated_at: string
  tenant?: Tenant
}

export interface AuthenticatedUser {
  id: string
  email?: string
  app_metadata?: Record<string, any>
  user_metadata?: Record<string, any>
}

export interface TenantAuthSuccess {
  success: true
  user: AuthenticatedUser
  tenant: Tenant
  tenantId: string
  membership: TenantMembership
  role: TenantRole
  isPlatformAdmin: boolean
}

export interface TenantAuthFailure {
  success: false
  error: string
  status: 401 | 403 | 500
  user?: AuthenticatedUser | null
}

export type TenantAuthResult = TenantAuthSuccess | TenantAuthFailure

export class TenantAuthorizationError extends Error {
  status: number
  constructor(message: string, status: number = 403) {
    super(message)
    this.name = 'TenantAuthorizationError'
    this.status = status
  }
}
