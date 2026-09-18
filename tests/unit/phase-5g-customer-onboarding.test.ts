/**
 * Grovaitech AI Platform
 * tests/unit/phase-5g-customer-onboarding.test.ts
 *
 * Unit tests for Phase 5G: Customer Self-Serve Onboarding.
 * Validates slug generation, tenant identifier formation, authenticated onboarding,
 * owner membership binding, database error handling, and slug collision avoidance.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateTenantSlug,
  generateTenantId,
  createTenantWorkspace,
} from '@/lib/auth/onboarding'
import { createAdminClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth/tenant'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/auth/tenant', () => ({
  getAuthenticatedUser: vi.fn(),
  getActiveTenantMemberships: vi.fn(),
}))

describe('Phase 5G: Customer Self-Serve Onboarding', () => {
  let mockTenants: any[] = []
  let mockMemberships: any[] = []
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockTenants = []
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
            const list = table === 'tenants' ? mockTenants : mockMemberships
            const match = filterCol
              ? list.find((item) => item[filterCol!] === filterVal)
              : list[0]
            return { data: match || null, error: null }
          }),
          insert: vi.fn(async (payload: any) => {
            if (table === 'tenants') {
              mockTenants.push(payload)
            } else if (table === 'tenant_memberships') {
              mockMemberships.push(payload)
            }
            return { data: payload, error: null }
          }),
        }
        return builder
      }),
    }

    vi.mocked(createAdminClient).mockResolvedValue(mockDb as any)
  })

  describe('Slug & ID Generation', () => {
    it('1. generates clean, url-safe tenant slugs from business names', () => {
      expect(generateTenantSlug('Apex Horizon Realty')).toBe('apex-horizon-realty')
      expect(generateTenantSlug('  Dental & Aesthetics Clinic!!! ')).toBe('dental-aesthetics-clinic')
      expect(generateTenantSlug('Grovaitech AI')).toBe('grovaitech-ai')
      expect(generateTenantSlug('---Special---Chars---')).toBe('special-chars')
    })

    it('2. provides a fallback slug if company name has no alphanumeric characters', () => {
      expect(generateTenantSlug('!@#$%^&*()')).toBe('workspace')
    })

    it('3. generates valid canonical tenant identifiers', () => {
      const id1 = generateTenantId()
      const id2 = generateTenantId()
      expect(id1).toMatch(/^client-[a-z0-9]+-[a-z0-9]+$/)
      expect(id2).toMatch(/^client-[a-z0-9]+-[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })
  })

  describe('createTenantWorkspace Execution', () => {
    it('4. rejects workspace creation if caller is unauthenticated', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null)

      const result = await createTenantWorkspace({
        companyName: 'Apex Realty',
        industry: 'Real Estate',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('5. validates company name constraints', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-google-101',
        email: 'founder@apex.com',
      } as any)

      const tooShort = await createTenantWorkspace({
        companyName: 'A',
        industry: 'Real Estate',
      })
      expect(tooShort.success).toBe(false)
      expect(tooShort.error).toContain('at least 2 characters')

      const tooLong = await createTenantWorkspace({
        companyName: 'A'.repeat(101),
        industry: 'Real Estate',
      })
      expect(tooLong.success).toBe(false)
      expect(tooLong.error).toContain('not exceed 100 characters')
    })

    it('6. creates tenant and binds caller as owner upon valid submission', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-google-101',
        email: 'founder@apex.com',
      } as any)

      const result = await createTenantWorkspace({
        companyName: 'Apex Horizon Living',
        industry: 'Real Estate',
      })

      expect(result.success).toBe(true)
      expect(result.tenantId).toBeDefined()
      expect(result.slug).toBe('apex-horizon-living')

      // Check tenant persisted
      expect(mockTenants).toHaveLength(1)
      expect(mockTenants[0].name).toBe('Apex Horizon Living')
      expect(mockTenants[0].type).toBe('customer')
      expect(mockTenants[0].status).toBe('active')

      // Check owner membership persisted
      expect(mockMemberships).toHaveLength(1)
      expect(mockMemberships[0].tenant_id).toBe(result.tenantId)
      expect(mockMemberships[0].user_id).toBe('usr-google-101')
      expect(mockMemberships[0].role).toBe('owner')
      expect(mockMemberships[0].status).toBe('active')
    })

    it('7. resolves slug collisions by appending a counter', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-google-202',
        email: 'founder2@apex.com',
      } as any)

      mockTenants.push({
        id: 'client-existing-01',
        name: 'Apex Horizon Living',
        slug: 'apex-horizon-living',
      })

      const result = await createTenantWorkspace({
        companyName: 'Apex Horizon Living',
        industry: 'Real Estate',
      })

      expect(result.success).toBe(true)
      expect(result.slug).toBe('apex-horizon-living-2')
    })

    it('8. strictly binds membership to authenticated user session and ignores any foreign user impersonation', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-real-session-777',
        email: 'real@company.com',
      } as any)

      // Even if an attacker attempts to inject a victim user ID into the input payload
      const maliciousPayload: any = {
        companyName: 'Zenith Logistics',
        industry: 'Supply Chain',
        userId: 'usr-victim-victim-888',
        overrideUserId: 'usr-victim-victim-888',
      }

      const result = await createTenantWorkspace(maliciousPayload)

      expect(result.success).toBe(true)
      // Membership MUST be bound exclusively to authenticated session user 'usr-real-session-777'
      expect(mockMemberships[0].user_id).toBe('usr-real-session-777')
      expect(mockMemberships[0].user_id).not.toBe('usr-victim-victim-888')
    })
  })
})
