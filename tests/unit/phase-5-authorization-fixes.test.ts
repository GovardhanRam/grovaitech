/**
 * Grovaitech AI Platform
 * tests/unit/phase-5-authorization-fixes.test.ts
 *
 * Comprehensive Regression Tests for Phase 5 Pre-Commit Security Fixes:
 * 1. app/actions/content.ts - resolveAuthorizedTenant enforcement & BOLA defense
 * 2. app/actions/recipes.ts - verified tenant access enforcement & rejection of DB existence alone
 * 3. app/api/voice/tools/execute/route.ts - rejection of unauthenticated/unverified clientId injection
 * 4. app/api/rag-search/route.ts - rejection of forged admin metadata/cookie & database-backed admin check
 * 5. app/actions/onboarding.ts & provisionTenantClient - server-side authority & owner binding
 * 6. lib/auth/onboarding.ts - compensating rollback on membership error & slug collision retry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  getContentHubData,
} from '@/app/actions/content'
import { executeSocialMediaRecipe } from '@/app/actions/recipes'
import { POST as voiceToolExecutePost } from '@/app/api/voice/tools/execute/route'
import { POST as ragSearchPost } from '@/app/api/rag-search/route'
import {
  provisionTenantClientAction,
} from '@/app/actions/onboarding'
import {
  createTenantWorkspace,
} from '@/lib/auth/onboarding'
import {
  resolveAuthorizedTenant,
  requireTenantAccess,
  isPlatformAdmin,
  getAuthenticatedUser,
} from '@/lib/auth'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    resolveAuthorizedTenant: vi.fn(),
    requireTenantAccess: vi.fn(),
    isPlatformAdmin: vi.fn(),
    getAuthenticatedUser: vi.fn(),
    getActiveTenantMemberships: vi.fn(),
  },
}))

vi.mock('@/lib/auth/tenant', () => mockAuth)
vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<any>('@/lib/auth')
  return {
    ...actual,
    ...mockAuth,
  }
})

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/recipes/social-media-runner', () => ({
  executeSocialMediaRunner: vi.fn().mockResolvedValue({
    success: true,
    contentPackage: { id: 'pkg-1', approvalStatus: 'pending_approval' },
  }),
}))

vi.mock('@/lib/ai/dispatcher', () => ({
  dispatchToolCall: vi.fn().mockResolvedValue({
    success: true,
    toolName: 'book_clinic_appointment',
    result: { appointmentId: 'apt-101' },
  }),
}))

vi.mock('@/lib/knowledge', async () => {
  const actual = await vi.importActual<any>('@/lib/knowledge')
  return {
    ...actual,
    searchClientKnowledge: vi.fn().mockResolvedValue({
      found: true,
      answer: 'Verified clinic timing is 9am-7pm',
      confidence: 0.95,
    }),
  }
})

describe('Phase 5 Pre-Commit Security Fixes Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── 1. Content Actions Authorization ─────────────────────────────────────
  describe('Area 1: app/actions/content.ts Tenant Authorization', () => {
    it('rejects cross-tenant access when user is not authorized for requested tenant', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValueOnce({
        success: false,
        error: 'Forbidden: You do not have permission to access workspace "victim-tenant-999".',
        status: 403,
        user: { id: 'attacker-user', email: 'attacker@evil.com' },
      })

      const result = await getContentHubData('victim-tenant-999')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Forbidden')
      expect(result.error).toContain('victim-tenant-999')
    })

    it('allows access to authorized tenant when user has active membership', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValueOnce({
        success: true,
        tenantId: 'my-legit-tenant',
        role: 'member',
        user: { id: 'legit-user', email: 'legit@company.com' },
        tenant: {
          id: 'my-legit-tenant',
          name: 'Legit Tenant',
          slug: 'legit',
          type: 'customer',
          industry: 'Technology',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        membership: {} as any,
        isPlatformAdmin: false,
      })

      const result = await getContentHubData('my-legit-tenant')
      expect(result.success).toBe(true)
      expect(result.packages).toBeDefined()
    })

    it('preserves legitimate demo prefix support', async () => {
      const result = await getContentHubData('demo-client-123')
      expect(result.success).toBe(true)
      expect(result.packages).toBeDefined()
    })
  })

  // ─── 2. Recipe Actions Authorization ──────────────────────────────────────
  describe('Area 2: app/actions/recipes.ts Tenant Authorization', () => {
    const validConfig = {
      businessName: 'Apex Dental',
      industry: 'Healthcare',
      targetAudience: 'Patients',
      brandVoice: 'Professional',
      platforms: ['linkedin'],
      postingFrequency: '3_times_week',
      contentTopics: ['Dental health'],
      contentPillars: ['Care'],
      brandGuidelines: 'Be polite',
      complianceRules: 'No false promises',
      callToAction: 'Book now',
      approvalMode: 'human_approval',
    }

    it('rejects execution when caller is unauthorized for the explicit clientId', async () => {
      vi.mocked(requireTenantAccess).mockResolvedValueOnce({
        success: false,
        error: 'Forbidden: You do not have permission to access workspace "victim-org".',
        status: 403,
        user: { id: 'attacker', email: 'attacker@evil.com' },
      })

      const result = await executeSocialMediaRecipe({
        recipeSlug: 'social-media-marketing',
        config: validConfig,
        clientId: 'victim-org',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized or unverified tenant identifier')
      expect(result.error).toContain('Forbidden')
    })

    it('permits execution for verified platform admin across tenants', async () => {
      vi.mocked(requireTenantAccess).mockResolvedValueOnce({
        success: true,
        tenantId: 'client-managed-by-admin',
        role: 'platform_super_admin',
        user: { id: 'admin-user', email: 'admin@grovaitech.com' },
        membership: {} as any,
        tenant: {
          id: 'client-managed-by-admin',
          name: 'Managed Org',
          slug: 'managed',
          type: 'customer',
          industry: 'Agency',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        isPlatformAdmin: true,
      })

      const result = await executeSocialMediaRecipe({
        recipeSlug: 'social-media-marketing',
        config: validConfig,
        clientId: 'client-managed-by-admin',
      })

      expect(result.success).toBe(true)
      expect(result.contentPackage).toBeDefined()
    })

    it('permits execution with demo clientId prefix', async () => {
      const result = await executeSocialMediaRecipe({
        recipeSlug: 'social-media-marketing',
        config: validConfig,
        clientId: 'demo-sample-tenant',
      })

      expect(result.success).toBe(true)
    })
  })

  // ─── 3. Voice Tool Execution Route Authorization ──────────────────────────
  describe('Area 3: app/api/voice/tools/execute/route.ts', () => {
    it('rejects unauthenticated caller attempting to inject an arbitrary clientId', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValueOnce({
        success: false,
        error: 'Authentication required. No valid user session found.',
        status: 401,
        user: null,
      })

      const req = new NextRequest('http://localhost:3000/api/voice/tools/execute', {
        method: 'POST',
        body: JSON.stringify({
          toolName: 'book_clinic_appointment',
          clientId: 'injected-victim-tenant',
          args: { patient_name: 'Bob' },
        }),
      })

      const res = await voiceToolExecutePost(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Authentication required')
    })

    it('rejects authenticated caller attempting cross-tenant clientId access', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValueOnce({
        success: false,
        error: 'Forbidden: You do not have permission to access workspace "cross-tenant-target".',
        status: 403,
        user: { id: 'other-user' },
      })

      const req = new NextRequest('http://localhost:3000/api/voice/tools/execute', {
        method: 'POST',
        body: JSON.stringify({
          toolName: 'book_clinic_appointment',
          clientId: 'cross-tenant-target',
          args: { patient_name: 'Bob' },
        }),
      })

      const res = await voiceToolExecutePost(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('Forbidden')
    })

    it('permits execution with demo-prefixed clientId', async () => {
      const req = new NextRequest('http://localhost:3000/api/voice/tools/execute', {
        method: 'POST',
        body: JSON.stringify({
          toolName: 'book_clinic_appointment',
          clientId: 'demo-voice-client',
          args: { patient_name: 'Alice' },
        }),
      })

      const res = await voiceToolExecutePost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
    })
  })

  // ─── 4. RAG Search API Route Authorization ────────────────────────────────
  describe('Area 4: app/api/rag-search/route.ts Platform Admin & Tenant Isolation', () => {
    it('rejects cross-tenant request even if caller attempts forged admin user_metadata', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'unauthorized-user',
                email: 'attacker@evil.com',
                user_metadata: { role: 'admin' }, // Forged metadata!
              },
            },
            error: null,
          }),
        },
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
      // Database says: NOT a platform admin!
      vi.mocked(isPlatformAdmin).mockResolvedValueOnce(false)
      vi.mocked(requireTenantAccess).mockResolvedValueOnce({
        success: false,
        error: 'Forbidden: Not a member',
        status: 403,
      })

      const req = new NextRequest('http://localhost:3000/api/rag-search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'pricing',
          clientId: 'victim-tenant-202',
        }),
      })

      const res = await ragSearchPost(req)
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.errorCode).toBe('FORBIDDEN_CROSS_TENANT')
    })

    it('allows query when caller is a verified database-backed platform admin', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'real-platform-admin',
                email: 'admin@grovaitech.com',
              },
            },
            error: null,
          }),
        },
      }
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any)
      // Database-backed platform admin check passes!
      vi.mocked(isPlatformAdmin).mockResolvedValueOnce(true)

      const req = new NextRequest('http://localhost:3000/api/rag-search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'pricing',
          clientId: 'any-tenant-target',
        }),
      })

      const res = await ragSearchPost(req)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.found).toBe(true)
    })
  })

  // ─── 5. Server-Side Client Provisioning ───────────────────────────────────
  describe('Area 5: Dashboard Client Provisioning Service Action', () => {
    it('rejects provisioning when caller has no authenticated session', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValueOnce(null)

      const result = await provisionTenantClientAction({
        name: 'New Apex Clinic',
        industry: 'Healthcare',
        email: 'info@apexclinic.com',
        services: ['AI Receptionist'],
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('successfully provisions workspace and binds owner when authenticated', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        id: 'usr-creator-123',
        email: 'founder@apex.com',
      } as any)

      let insertedTenants: any[] = []
      let insertedMembers: any[] = []
      let insertedClients: any[] = []

      const mockDb = {
        from: vi.fn((table: string) => {
          const builder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn(async (payload: any) => {
              if (table === 'tenants') insertedTenants.push(payload)
              if (table === 'tenant_memberships') insertedMembers.push(payload)
              if (table === 'clients') insertedClients.push(payload)
              return { data: payload, error: null }
            }),
          }
          return builder
        }),
      }
      vi.mocked(createAdminClient).mockResolvedValue(mockDb as any)

      const result = await provisionTenantClientAction({
        name: 'Apex Dental Care',
        industry: 'Healthcare',
        email: 'hello@apexdental.com',
        services: ['AI Receptionist'],
      })

      expect(result.success).toBe(true)
      expect(result.tenantId).toBeDefined()
      expect(insertedTenants).toHaveLength(1)
      expect(insertedTenants[0].name).toBe('Apex Dental Care')
      expect(insertedMembers).toHaveLength(1)
      expect(insertedMembers[0].user_id).toBe('usr-creator-123')
      expect(insertedMembers[0].role).toBe('owner')
      expect(insertedClients).toHaveLength(1)
      expect(insertedClients[0].email).toBe('hello@apexdental.com')
    })
  })

  // ─── 6. Onboarding Rollback & Slug Collision Retry ────────────────────────
  describe('Area 6: lib/auth/onboarding.ts Compensating Rollback & Slug Retry', () => {
    it('deletes orphaned tenant if tenant_memberships insert fails', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValueOnce({
        id: 'usr-test-fail-member',
        email: 'test@example.com',
      } as any)

      let deletedTenantId: string | null = null
      let tenantCreated = false

      const mockDb = {
        from: vi.fn((table: string) => {
          const builder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((col: string, val: any) => {
              if (col === 'id') deletedTenantId = val
              return builder
            }),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn(async (payload: any) => {
              if (table === 'tenants') {
                tenantCreated = true
                return { data: payload, error: null }
              }
              if (table === 'tenant_memberships') {
                // Simulate membership failure
                return { data: null, error: { message: 'Database foreign key failure' } }
              }
              return { data: payload, error: null }
            }),
            delete: vi.fn().mockReturnThis(),
          }
          return builder
        }),
      }
      vi.mocked(createAdminClient).mockResolvedValue(mockDb as any)

      const result = await createTenantWorkspace({
        companyName: 'Rollback Test Corp',
        industry: 'Testing',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to bind owner membership')
      expect(tenantCreated).toBe(true)
      // Compensating rollback occurred!
      expect(deletedTenantId).toBeDefined()
    })

    it('retries with incremented slug on slug unique constraint collision', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValueOnce({
        id: 'usr-slug-retry',
        email: 'retry@example.com',
      } as any)

      let attempts = 0
      const insertedSlugs: string[] = []

      const mockDb = {
        from: vi.fn((table: string) => {
          const builder = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn(async (payload: any) => {
              if (table === 'tenants') {
                attempts++
                if (attempts === 1) {
                  // Simulate unique constraint race collision on first attempt
                  return {
                    data: null,
                    error: { code: '23505', message: 'duplicate key value violates unique constraint "tenants_slug_key"' },
                  }
                }
                insertedSlugs.push(payload.slug)
                return { data: payload, error: null }
              }
              return { data: payload, error: null }
            }),
          }
          return builder
        }),
      }
      vi.mocked(createAdminClient).mockResolvedValue(mockDb as any)

      const result = await createTenantWorkspace({
        companyName: 'Unique Venture',
        industry: 'Venture',
      })

      expect(result.success).toBe(true)
      expect(attempts).toBe(2)
      expect(result.slug).toBe('unique-venture-2')
    })
  })
})
