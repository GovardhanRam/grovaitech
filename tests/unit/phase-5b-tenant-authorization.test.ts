import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAuthenticatedUser,
  getActiveTenantMemberships,
  isPlatformAdmin,
  resolveAuthorizedTenant,
  requireTenantAccess,
  assertTenantAccess,
  TenantAuthorizationError,
} from '@/lib/auth'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

describe('Phase 5B: Reusable Server-Side Tenant Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  describe('1. getAuthenticatedUser()', () => {
    it('returns authenticated user when session exists', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'user-123',
                email: 'test@example.com',
                app_metadata: {},
                user_metadata: {},
              },
            },
            error: null,
          }),
        },
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const user = await getAuthenticatedUser()
      expect(user).not.toBeNull()
      expect(user?.id).toBe('user-123')
      expect(user?.email).toBe('test@example.com')
    })

    it('returns null when session does not exist or errors', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'No session' },
          }),
        },
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const user = await getAuthenticatedUser()
      expect(user).toBeNull()
    })
  })

  describe('2. getActiveTenantMemberships()', () => {
    it('returns empty array when userId is empty', async () => {
      const result = await getActiveTenantMemberships('')
      expect(result).toEqual([])
    })

    it('hydrates active memberships with active tenant records', async () => {
      const userId = 'user-456'
      const mockMemberships = [
        {
          id: 'mem-1',
          tenant_id: 'client-test-synthetic-01',
          user_id: userId,
          role: 'owner',
          status: 'active',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
      ]
      const mockTenants = [
        {
          id: 'client-test-synthetic-01',
          name: 'Grovaitech Test Synthetic',
          slug: 'grovaitech-test-synthetic',
          type: 'customer',
          industry: 'Real Estate',
          status: 'active',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
      ]

      const mockDb = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tenant_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: mockMemberships,
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: mockTenants,
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {}
        }),
      }

      vi.mocked(createServerClient).mockResolvedValue(mockDb as any)

      const result = await getActiveTenantMemberships(userId)
      expect(result).toHaveLength(1)
      expect(result[0].tenant_id).toBe('client-test-synthetic-01')
      expect(result[0].tenant?.name).toBe('Grovaitech Test Synthetic')
      expect(result[0].role).toBe('owner')
    })
  })

  describe('3. isPlatformAdmin()', () => {
    it('returns true when user has explicit platform_super_admin role', async () => {
      const mockDb = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tenant_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'mem-admin',
                        tenant_id: 'client-test-synthetic-01',
                        user_id: 'user-admin',
                        role: 'platform_super_admin',
                        status: 'active',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'client-test-synthetic-01',
                        name: 'Test Tenant',
                        slug: 'test-tenant',
                        type: 'customer',
                        status: 'active',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }
          }
        }),
      }
      vi.mocked(createServerClient).mockResolvedValue(mockDb as any)

      const result = await isPlatformAdmin('user-admin')
      expect(result).toBe(true)
    })

    it('returns true when user is owner of an internal tenant', async () => {
      const mockDb = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tenant_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'mem-internal',
                        tenant_id: 'grovaitech-internal',
                        user_id: 'operator-1',
                        role: 'owner',
                        status: 'active',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'grovaitech-internal',
                        name: 'Grovaitech Internal Corp',
                        slug: 'grovaitech-internal',
                        type: 'internal',
                        status: 'active',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }
          }
        }),
      }
      vi.mocked(createServerClient).mockResolvedValue(mockDb as any)

      const result = await isPlatformAdmin('operator-1')
      expect(result).toBe(true)
    })

    it('returns false for standard customer member or owner', async () => {
      const mockDb = {
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tenant_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'mem-cust',
                        tenant_id: 'client-cust-01',
                        user_id: 'customer-user',
                        role: 'owner',
                        status: 'active',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }
          }
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: 'client-cust-01',
                        name: 'Customer Biz',
                        slug: 'customer-biz',
                        type: 'customer',
                        status: 'active',
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }
          }
        }),
      }
      vi.mocked(createServerClient).mockResolvedValue(mockDb as any)

      const result = await isPlatformAdmin('customer-user')
      expect(result).toBe(false)
    })
  })

  describe('4. resolveAuthorizedTenant() & requireTenantAccess()', () => {
    it('returns 401 when no session exists', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const res = await resolveAuthorizedTenant()
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.status).toBe(401)
      }
    })

    it('returns 403 when authenticated user has zero active memberships', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'unassigned-user', email: 'unassigned@test.com' } },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      const res = await resolveAuthorizedTenant()
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.status).toBe(403)
        expect(res.error).toContain('no active workspace memberships')
      }
    })

    it('resolves primary active tenant when no requestedTenantId is specified', async () => {
      const mockUser = { id: 'user-primary', email: 'primary@test.com' }
      const mockMembership = {
        id: 'mem-primary',
        tenant_id: 'client-primary-01',
        user_id: 'user-primary',
        role: 'owner',
        status: 'active',
      }
      const mockTenant = {
        id: 'client-primary-01',
        name: 'Primary Corp',
        slug: 'primary-corp',
        type: 'customer',
        status: 'active',
      }

      const mockDb = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tenant_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [mockMembership], error: null }),
                }),
              }),
            }
          }
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [mockTenant], error: null }),
                }),
              }),
            }
          }
        }),
      }
      vi.mocked(createServerClient).mockResolvedValue(mockDb as any)

      const res = await resolveAuthorizedTenant()
      expect(res.success).toBe(true)
      if (res.success) {
        expect(res.tenantId).toBe('client-primary-01')
        expect(res.tenant.name).toBe('Primary Corp')
        expect(res.role).toBe('owner')
      }
    })

    it('blocks access (403) when user requests a tenant they do NOT belong to', async () => {
      const mockUser = { id: 'user-alice', email: 'alice@test.com' }
      const mockMembership = {
        id: 'mem-alice',
        tenant_id: 'tenant-alice',
        user_id: 'user-alice',
        role: 'member',
        status: 'active',
      }
      const mockTenant = {
        id: 'tenant-alice',
        name: 'Alice Workspace',
        slug: 'alice-workspace',
        type: 'customer',
        status: 'active',
      }

      const mockDb = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'tenant_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [mockMembership], error: null }),
                }),
              }),
            }
          }
          if (table === 'tenants') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockResolvedValue({ data: [mockTenant], error: null }),
                }),
              }),
            }
          }
        }),
      }
      vi.mocked(createServerClient).mockResolvedValue(mockDb as any)

      // Alice attempts to access Bob's tenant
      const res = await requireTenantAccess('tenant-bob')
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.status).toBe(403)
        expect(res.error).toContain('Forbidden: You do not have permission to access workspace "tenant-bob"')
      }
    })

    it('assertTenantAccess throws TenantAuthorizationError on failure', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)

      await expect(assertTenantAccess('some-tenant')).rejects.toThrow(TenantAuthorizationError)
    })
  })
})
