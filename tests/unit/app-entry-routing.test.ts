import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveAppEntryDestination } from '@/app/actions/auth-routing'
import * as tenantAuth from '@/lib/auth/tenant'

vi.mock('@/lib/auth/tenant', () => ({
  getAuthenticatedUser: vi.fn(),
  getActiveTenantMemberships: vi.fn(),
  isPlatformAdmin: vi.fn(),
}))

describe('App Entry Role-Aware Routing (resolveAppEntryDestination)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes unauthenticated sessions to /login', async () => {
    vi.mocked(tenantAuth.getAuthenticatedUser).mockResolvedValue(null)

    const result = await resolveAppEntryDestination()
    expect(result.destination).toBe('/login')
    expect(result.isAuthenticated).toBe(false)
  })

  it('routes platform super admin / founder to /dashboard (Founder Command Center)', async () => {
    vi.mocked(tenantAuth.getAuthenticatedUser).mockResolvedValue({
      id: 'founder-001',
      email: 'founder@grovaitech.com',
    })
    vi.mocked(tenantAuth.isPlatformAdmin).mockResolvedValue(true)

    const result = await resolveAppEntryDestination('founder-001')
    expect(result.destination).toBe('/dashboard')
    expect(result.isAuthenticated).toBe(true)
    expect(result.role).toBe('platform_super_admin')
  })

  it('routes internal tenant owner/admin to /dashboard (Founder Command Center)', async () => {
    vi.mocked(tenantAuth.getAuthenticatedUser).mockResolvedValue({
      id: 'admin-001',
      email: 'admin@grovaitech.com',
    })
    vi.mocked(tenantAuth.isPlatformAdmin).mockResolvedValue(false)
    vi.mocked(tenantAuth.getActiveTenantMemberships).mockResolvedValue([
      {
        id: 'mem-1',
        tenant_id: 'tenant-grova-internal',
        user_id: 'admin-001',
        role: 'owner',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant: {
          id: 'tenant-grova-internal',
          name: 'Grovaitech Internal',
          slug: 'grovaitech-internal',
          type: 'internal',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ])

    const result = await resolveAppEntryDestination('admin-001')
    expect(result.destination).toBe('/dashboard')
    expect(result.isAuthenticated).toBe(true)
    expect(result.role).toBe('owner')
  })

  it('routes customer tenant members to /dashboard/customer (Customer Home)', async () => {
    vi.mocked(tenantAuth.getAuthenticatedUser).mockResolvedValue({
      id: 'customer-001',
      email: 'client@business.com',
    })
    vi.mocked(tenantAuth.isPlatformAdmin).mockResolvedValue(false)
    vi.mocked(tenantAuth.getActiveTenantMemberships).mockResolvedValue([
      {
        id: 'mem-2',
        tenant_id: 'tenant-client-101',
        user_id: 'customer-001',
        role: 'member',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant: {
          id: 'tenant-client-101',
          name: 'Apex Real Estate',
          slug: 'apex-real-estate',
          type: 'customer',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ])

    const result = await resolveAppEntryDestination('customer-001')
    expect(result.destination).toBe('/dashboard/customer')
    expect(result.isAuthenticated).toBe(true)
    expect(result.tenantType).toBe('customer')
  })

  it('routes internal operators/employees to /employee (Employee Home)', async () => {
    vi.mocked(tenantAuth.getAuthenticatedUser).mockResolvedValue({
      id: 'emp-001',
      email: 'employee@grovaitech.com',
    })
    vi.mocked(tenantAuth.isPlatformAdmin).mockResolvedValue(false)
    vi.mocked(tenantAuth.getActiveTenantMemberships).mockResolvedValue([
      {
        id: 'mem-3',
        tenant_id: 'tenant-grova-internal',
        user_id: 'emp-001',
        role: 'member',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant: {
          id: 'tenant-grova-internal',
          name: 'Grovaitech Internal',
          slug: 'grovaitech-internal',
          type: 'internal',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
    ])

    const result = await resolveAppEntryDestination('emp-001')
    expect(result.destination).toBe('/employee')
    expect(result.isAuthenticated).toBe(true)
  })

  it('routes unassigned authenticated users without memberships to /onboarding', async () => {
    vi.mocked(tenantAuth.getAuthenticatedUser).mockResolvedValue({
      id: 'newbie-001',
      email: 'newbie@gmail.com',
    })
    vi.mocked(tenantAuth.isPlatformAdmin).mockResolvedValue(false)
    vi.mocked(tenantAuth.getActiveTenantMemberships).mockResolvedValue([])

    const result = await resolveAppEntryDestination('newbie-001')
    expect(result.destination).toBe('/onboarding')
    expect(result.isAuthenticated).toBe(true)
  })
})
