/**
 * Grovaitech AI Platform
 * tests/unit/phase-5h-tenant-invitations.test.ts
 *
 * Unit tests for Phase 5H: Internal Workspace Invitations.
 * Validates invitation creation, RBAC permissions, cryptographically secure token generation,
 * expiration handling, token retrieval, and atomic membership acceptance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTenantInvitation,
  getInvitationByToken,
  acceptTenantInvitation,
} from '@/lib/auth/invitations'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthenticatedUser, requireTenantAccess } from '@/lib/auth/tenant'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/auth/tenant', () => ({
  getAuthenticatedUser: vi.fn(),
  requireTenantAccess: vi.fn(),
  getActiveTenantMemberships: vi.fn(),
}))

describe('Phase 5H: Internal Workspace Invitations', () => {
  let mockInvitations: any[] = []
  let mockMemberships: any[] = []
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockInvitations = []
    mockMemberships = []

    mockDb = {
      from: vi.fn((table: string) => {
        let filterCol: string | null = null
        let filterVal: any = null

        const builder = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn((col: string, val: any) => {
            filterCol = col
            filterVal = val
            return builder
          }),
          maybeSingle: vi.fn(async () => {
            const list = table === 'tenant_invitations' ? mockInvitations : mockMemberships
            const match = filterCol
              ? list.find((item) => item[filterCol!] === filterVal)
              : list[0]
            return { data: match || null, error: null }
          }),
          single: vi.fn(async () => {
            const list = table === 'tenant_invitations' ? mockInvitations : mockMemberships
            const match = filterCol
              ? list.find((item) => item[filterCol!] === filterVal)
              : list[0]
            return { data: match || null, error: null }
          }),
          insert: vi.fn((payload: any) => {
            const item = { id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, ...payload }
            if (table === 'tenant_invitations') {
              mockInvitations.push(item)
            } else if (table === 'tenant_memberships') {
              mockMemberships.push(item)
            }
            return {
              select: () => ({
                single: async () => ({ data: item, error: null }),
              }),
              data: item,
              error: null,
            }
          }),
          update: vi.fn((payload: any) => {
            const filters: Record<string, any> = {}
            const updateBuilder: any = {
              eq: (col: string, val: any) => {
                filters[col] = val
                return updateBuilder
              },
              select: () => updateBuilder,
              then: (resolve: any) => {
                let updatedItems: any[] = []
                if (table === 'tenant_invitations') {
                  mockInvitations = mockInvitations.map((inv) => {
                    const matches = Object.entries(filters).every(
                      ([k, v]) => inv[k] === v
                    )
                    if (matches) {
                      const updated = { ...inv, ...payload }
                      updatedItems.push(updated)
                      return updated
                    }
                    return inv
                  })
                }
                return resolve({ data: updatedItems, error: null })
              },
            }
            return updateBuilder
          }),
          upsert: vi.fn((payload: any) => {
            if (table === 'tenant_memberships') {
              const existingIdx = mockMemberships.findIndex(
                (m) => m.tenant_id === payload.tenant_id && m.user_id === payload.user_id
              )
              if (existingIdx >= 0) {
                mockMemberships[existingIdx] = { ...mockMemberships[existingIdx], ...payload }
              } else {
                mockMemberships.push({ id: `mem-${Date.now()}`, ...payload })
              }
            }
            return { error: null }
          }),
        }
        return builder
      }),
    }

    vi.mocked(createAdminClient).mockResolvedValue(mockDb as any)
  })

  describe('createTenantInvitation', () => {
    it('1. rejects invitation creation if caller is unauthenticated', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null)

      const res = await createTenantInvitation({
        tenantId: 'client-apex-01',
        email: 'teammate@apex.com',
        role: 'member',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain('Unauthorized')
    })

    it('2. rejects invitation creation if caller is not an owner or admin of the tenant', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-regular-member',
        email: 'viewer@apex.com',
      } as any)

      vi.mocked(requireTenantAccess).mockResolvedValue({
        success: false,
        error: 'Forbidden: Insufficient workspace role permissions.',
        status: 403,
      } as any)

      const res = await createTenantInvitation({
        tenantId: 'client-apex-01',
        email: 'newbie@apex.com',
        role: 'member',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain('Forbidden')
    })

    it('3. validates destination email format', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-admin-01',
        email: 'admin@apex.com',
      } as any)

      vi.mocked(requireTenantAccess).mockResolvedValue({
        success: true,
        tenantId: 'client-apex-01',
        role: 'owner',
      } as any)

      const res = await createTenantInvitation({
        tenantId: 'client-apex-01',
        email: 'invalid-email-no-at',
        role: 'member',
      })

      expect(res.success).toBe(false)
      expect(res.error).toContain('Valid email')
    })

    it('4. successfully generates a secure token and creates pending invitation', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-admin-01',
        email: 'admin@apex.com',
      } as any)

      vi.mocked(requireTenantAccess).mockResolvedValue({
        success: true,
        tenantId: 'client-apex-01',
        role: 'owner',
      } as any)

      const res = await createTenantInvitation({
        tenantId: 'client-apex-01',
        email: 'colleague@apex.com',
        role: 'member',
      })

      expect(res.success).toBe(true)
      expect(res.token).toBeDefined()
      expect(res.token).toHaveLength(64) // 32 bytes hex
      expect(mockInvitations).toHaveLength(1)
      expect(mockInvitations[0].email).toBe('colleague@apex.com')
      expect(mockInvitations[0].status).toBe('pending')
      expect(mockInvitations[0].role).toBe('member')
    })

    it('4b. rejects customer workspace admin attempting to assign platform roles', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-admin-01',
        email: 'admin@apex.com',
      } as any)

      vi.mocked(requireTenantAccess).mockResolvedValue({
        success: true,
        tenantId: 'client-apex-01',
        role: 'owner',
        isPlatformAdmin: false,
        tenant: { id: 'client-apex-01', type: 'customer' },
      } as any)

      const resSuperAdmin = await createTenantInvitation({
        tenantId: 'client-apex-01',
        email: 'attacker@apex.com',
        role: 'platform_super_admin' as any,
      })

      expect(resSuperAdmin.success).toBe(false)
      expect(resSuperAdmin.error).toContain('Forbidden: Customer workspace administrators can only assign customer roles')

      const resOperator = await createTenantInvitation({
        tenantId: 'client-apex-01',
        email: 'attacker2@apex.com',
        role: 'platform_operator' as any,
      })

      expect(resOperator.success).toBe(false)
      expect(resOperator.error).toContain('Forbidden: Customer workspace administrators can only assign customer roles')
      expect(mockInvitations).toHaveLength(0)
    })

    it('4c. allows internal platform admin to assign platform roles in internal workspace', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-super-admin',
        email: 'root@grovaitech.internal',
      } as any)

      vi.mocked(requireTenantAccess).mockResolvedValue({
        success: true,
        tenantId: 'tenant-internal-ops',
        role: 'owner',
        isPlatformAdmin: true,
        tenant: { id: 'tenant-internal-ops', type: 'internal' },
      } as any)

      const res = await createTenantInvitation({
        tenantId: 'tenant-internal-ops',
        email: 'operator@grovaitech.internal',
        role: 'platform_operator',
      })

      expect(res.success).toBe(true)
      expect(res.token).toBeDefined()
      expect(mockInvitations).toHaveLength(1)
      expect(mockInvitations[0].role).toBe('platform_operator')
    })
  })

  describe('getInvitationByToken', () => {
    it('5. retrieves safe invitation details for pending valid token', async () => {
      mockInvitations.push({
        id: 'inv-101',
        tenant_id: 'client-apex-01',
        email: 'colleague@apex.com',
        role: 'member',
        token: 'token-abc-123',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        tenants: { name: 'Apex Horizon Realty' },
      })

      const details = await getInvitationByToken('token-abc-123')
      expect(details).not.toBeNull()
      expect(details?.email).toBe('colleague@apex.com')
      expect(details?.tenantName).toBe('Apex Horizon Realty')
      expect(details?.status).toBe('pending')
    })

    it('6. flags invitation as expired if expires_at has passed', async () => {
      mockInvitations.push({
        id: 'inv-102',
        tenant_id: 'client-apex-01',
        email: 'late@apex.com',
        role: 'member',
        token: 'token-expired-456',
        status: 'pending',
        expires_at: new Date(Date.now() - 10000).toISOString(), // in the past
        tenants: { name: 'Apex Horizon Realty' },
      })

      const details = await getInvitationByToken('token-expired-456')
      expect(details).not.toBeNull()
      expect(details?.status).toBe('expired')
    })

    it('7. returns null for non-existent token', async () => {
      const details = await getInvitationByToken('non-existent-token')
      expect(details).toBeNull()
    })
  })

  describe('acceptTenantInvitation', () => {
    it('8. rejects acceptance if user is unauthenticated', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null)

      const res = await acceptTenantInvitation('token-abc-123')
      expect(res.success).toBe(false)
      expect(res.error).toContain('Unauthorized')
    })

    it('9. rejects expired invitations', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-invitee-999',
        email: 'invitee@apex.com',
      } as any)

      mockInvitations.push({
        id: 'inv-103',
        tenant_id: 'client-apex-01',
        email: 'invitee@apex.com',
        token: 'token-old',
        status: 'pending',
        expires_at: new Date(Date.now() - 5000).toISOString(),
      })

      const res = await acceptTenantInvitation('token-old')
      expect(res.success).toBe(false)
      expect(res.error).toContain('expired')
      expect(mockMemberships).toHaveLength(0)
    })

    it('10. rejects already accepted or revoked invitations', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-invitee-999',
        email: 'invitee@apex.com',
      } as any)

      mockInvitations.push({
        id: 'inv-104',
        tenant_id: 'client-apex-01',
        email: 'invitee@apex.com',
        token: 'token-accepted',
        status: 'accepted',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })

      const res = await acceptTenantInvitation('token-accepted')
      expect(res.success).toBe(false)
      expect(res.error).toContain('already been accepted')
      expect(mockMemberships).toHaveLength(0)
    })

    it('11. rejects acceptance when authenticated user has no email', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-no-email-123',
        email: undefined,
      } as any)

      mockInvitations.push({
        id: 'inv-105',
        tenant_id: 'client-apex-01',
        email: 'colleague@apex.com',
        token: 'token-no-email',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })

      const res = await acceptTenantInvitation('token-no-email')
      expect(res.success).toBe(false)
      expect(res.error).toContain('verified email address')
      expect(mockMemberships).toHaveLength(0)
    })

    it('12. rejects acceptance when authenticated email does not match invitation destination email', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-eavesdropper-666',
        email: 'attacker@evilcorp.com',
      } as any)

      mockInvitations.push({
        id: 'inv-106',
        tenant_id: 'client-apex-01',
        email: 'intended.recipient@apex.com',
        token: 'token-secret-invitation-999',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })

      const res = await acceptTenantInvitation('token-secret-invitation-999')

      // Must be rejected
      expect(res.success).toBe(false)
      expect(res.error).toContain('Access Denied')
      expect(res.error).toContain('intended.recipient@apex.com')
      expect(res.error).toContain('attacker@evilcorp.com')

      // Zero memberships created
      expect(mockMemberships).toHaveLength(0)

      // Invitation status must remain pending (not accepted)
      const targetInv = mockInvitations.find((i) => i.id === 'inv-106')
      expect(targetInv?.status).toBe('pending')
    })

    it('13. accepts invitation when email matches (case-insensitively), binds membership, and marks invitation accepted', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-invitee-777',
        email: 'COLLEAGUE@Apex.COM', // uppercase to verify normalization
      } as any)

      mockInvitations.push({
        id: 'inv-107',
        tenant_id: 'client-apex-01',
        email: 'colleague@apex.com',
        role: 'member',
        token: 'token-valid-777',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      })

      const res = await acceptTenantInvitation('token-valid-777')
      expect(res.success).toBe(true)
      expect(res.tenantId).toBe('client-apex-01')
      expect(res.role).toBe('member')

      // Check membership created
      expect(mockMemberships).toHaveLength(1)
      expect(mockMemberships[0].tenant_id).toBe('client-apex-01')
      expect(mockMemberships[0].user_id).toBe('usr-invitee-777')
      expect(mockMemberships[0].role).toBe('member')

      // Check invitation marked accepted
      const targetInv = mockInvitations.find((i) => i.id === 'inv-107')
      expect(targetInv?.status).toBe('accepted')
    })
  })
})
