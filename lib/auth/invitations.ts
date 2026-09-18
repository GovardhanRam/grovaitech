/**
 * Grovaitech AI Platform
 * lib/auth/invitations.ts
 *
 * Tenant Invitation Lifecycle Management.
 * Generates cryptographically secure invitation tokens, verifies validity,
 * and executes atomic acceptance into public.tenant_memberships.
 */

import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, requireTenantAccess } from './tenant'
import type { TenantRole } from './types'

export interface CreateInvitationInput {
  tenantId: string
  email: string
  role: TenantRole
  expiresInDays?: number
}

export interface CreateInvitationResult {
  success: boolean
  invitationId?: string
  token?: string
  error?: string
}

export interface AcceptInvitationResult {
  success: boolean
  tenantId?: string
  role?: string
  error?: string
}

export interface SafeInvitationDetails {
  id: string
  tenantId: string
  tenantName: string
  email: string
  role: string
  expiresAt: string
  status: string
}

export async function createTenantInvitation(
  input: CreateInvitationInput
): Promise<CreateInvitationResult> {
  const user = await getAuthenticatedUser()
  if (!user || !user.id) {
    return { success: false, error: 'Unauthorized: Authenticated caller required.' }
  }
  const callerUserId = user.id

  const { tenantId, email, role, expiresInDays = 7 } = input

  if (!email || !email.includes('@')) {
    return { success: false, error: 'Valid email address is required.' }
  }

  const cleanEmail = email.trim().toLowerCase()

  // Verify caller has admin/owner rights to the tenant
  const access = await requireTenantAccess(tenantId)
  if (!access.success) {
    return { success: false, error: access.error }
  }

  if (access.role !== 'owner' && access.role !== 'admin' && !access.isPlatformAdmin) {
    return { success: false, error: 'Forbidden: Insufficient workspace role permissions.' }
  }

  // Enforce customer role boundary: Customer tenants cannot assign platform roles
  const isInternalAdmin = access.tenant?.type === 'internal' && access.isPlatformAdmin
  const permittedCustomerRoles: TenantRole[] = ['owner', 'admin', 'member', 'viewer']

  if (!isInternalAdmin && !permittedCustomerRoles.includes(role)) {
    return {
      success: false,
      error: `Forbidden: Customer workspace administrators can only assign customer roles (${permittedCustomerRoles.join(', ')}). Platform roles cannot be assigned.`,
    }
  }

  const db = await createAdminClient()

  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from('tenant_invitations')
    .insert({
      tenant_id: tenantId,
      email: cleanEmail,
      role,
      token,
      invited_by: callerUserId,
      status: 'pending',
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: `Failed to create invitation: ${error.message}` }
  }

  return {
    success: true,
    invitationId: data?.id,
    token,
  }
}

export async function getInvitationByToken(token: string): Promise<SafeInvitationDetails | null> {
  if (!token || typeof token !== 'string') return null

  const db = await createAdminClient()
  const { data: inv, error } = await db
    .from('tenant_invitations')
    .select('id, tenant_id, email, role, status, expires_at, tenants(name)')
    .eq('token', token.trim())
    .maybeSingle()

  if (error || !inv) return null

  const isExpired = new Date(inv.expires_at).getTime() < Date.now()
  const effectiveStatus = (inv.status === 'pending' && isExpired) ? 'expired' : inv.status

  return {
    id: inv.id,
    tenantId: inv.tenant_id,
    tenantName: (inv.tenants as any)?.name || 'Unknown Workspace',
    email: inv.email,
    role: inv.role,
    expiresAt: inv.expires_at,
    status: effectiveStatus,
  }
}

export async function acceptTenantInvitation(
  token: string
): Promise<AcceptInvitationResult> {
  // 1. Authenticate user strictly from verified session
  const user = await getAuthenticatedUser()
  if (!user || !user.id) {
    return { success: false, error: 'Unauthorized: User must be signed in to accept an invitation.' }
  }

  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Invalid invitation token.' }
  }

  // 2. Validate email presence on authenticated user
  const userEmail = user.email?.trim().toLowerCase()
  if (!userEmail) {
    return {
      success: false,
      error: 'Unauthorized: Authenticated account does not have a verified email address.',
    }
  }

  const db = await createAdminClient()

  // 3. Retrieve invitation
  const { data: inv, error } = await db
    .from('tenant_invitations')
    .select('*')
    .eq('token', token.trim())
    .maybeSingle()

  if (error || !inv) {
    return { success: false, error: 'Invitation not found or invalid.' }
  }

  if (inv.status !== 'pending') {
    return { success: false, error: `Invitation has already been ${inv.status}.` }
  }

  if (new Date(inv.expires_at).getTime() < Date.now()) {
    await db
      .from('tenant_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', inv.id)
    return { success: false, error: 'Invitation has expired.' }
  }

  // 4. Strict Email Binding Check: Google user email MUST match invitation email
  const invitationEmail = inv.email?.trim().toLowerCase()
  if (userEmail !== invitationEmail) {
    return {
      success: false,
      error: `Access Denied: This invitation was issued to ${invitationEmail}, but you are signed in as ${userEmail}.`,
    }
  }

  const now = new Date().toISOString()

  // 5. Concurrency Safe Claim: Atomically transition status from pending to accepted
  const { data: claimData, error: claimError } = await db
    .from('tenant_invitations')
    .update({
      status: 'accepted',
      updated_at: now,
    })
    .eq('id', inv.id)
    .eq('status', 'pending')
    .select('id')

  if (claimError || !claimData || (Array.isArray(claimData) && claimData.length === 0)) {
    return {
      success: false,
      error: 'Invitation could not be claimed. It may have already been accepted or revoked.',
    }
  }

  // 6. Bind Membership in tenant_memberships
  const { error: memberError } = await db
    .from('tenant_memberships')
    .upsert(
      {
        tenant_id: inv.tenant_id,
        user_id: user.id,
        role: inv.role,
        status: 'active',
        updated_at: now,
      },
      { onConflict: 'tenant_id,user_id' }
    )

  if (memberError) {
    // Compensating rollback: restore invitation to pending if membership creation fails
    await db
      .from('tenant_invitations')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', inv.id)

    return { success: false, error: `Failed to join workspace: ${memberError.message}` }
  }

  return {
    success: true,
    tenantId: inv.tenant_id,
    role: inv.role,
  }
}
