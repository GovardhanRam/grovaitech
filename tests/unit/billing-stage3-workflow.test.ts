import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCustomQuote,
  getQuote,
  acceptQuote,
  supersedeQuote,
  createSubscriptionFromAcceptedQuote,
  getTenantBillingOverview,
  getAdminQuoteContext,
  assertDeploymentTenantAlignment,
} from '@/lib/billing/service'
import {
  createCustomQuoteAction,
  getQuoteAction,
  acceptQuoteAction,
  getAdminQuoteContextAction,
  getTenantBillingOverviewAction,
} from '@/app/actions/billing'
import { isPlatformAdmin, resolveAuthorizedTenant, getAuthenticatedUser } from '@/lib/auth'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('@/lib/auth', () => ({
  isPlatformAdmin: vi.fn(),
  resolveAuthorizedTenant: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
}))

describe('Commercial Billing — Stage 3 Workflows & UI Invariants', () => {
  const mockAdminUser = { id: 'admin-001', email: 'admin@grovaitech.com' }
  const mockTenantUser = { id: 'user-001', email: 'owner@tenant-alpha.com' }
  const mockTenantBetaUser = { id: 'user-002', email: 'owner@tenant-beta.com' }

  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.SUPABASE_SERVICE_ROLE_KEY

    mockDb = {
      from: vi.fn(),
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockDb)
    vi.mocked(createServerClient).mockResolvedValue(mockDb)
  })

  // ==========================================================================
  // 1. Admin Quote Builder Authorization & Context
  // ==========================================================================
  describe('Admin Quote Context (Phase 2)', () => {
    it('rejects unauthenticated requests to getAdminQuoteContext', async () => {
      const result = await getAdminQuoteContext(null)
      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
      expect(result.error).toContain('Authentication required')
    })

    it('rejects non-platform admins from accessing admin quote context (403 Forbidden)', async () => {
      vi.mocked(isPlatformAdmin).mockResolvedValue(false)
      const result = await getAdminQuoteContext(mockTenantUser)

      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
      expect(result.error).toContain('Only platform administrators')
    })

    it('returns active tenants and active deployments for platform admins', async () => {
      vi.mocked(isPlatformAdmin).mockResolvedValue(true)

      const mockTenants = [
        { id: 'tenant-1', name: 'Alpha Dental', slug: 'alpha-dental' },
        { id: 'tenant-2', name: 'Beta Realty', slug: 'beta-realty' },
      ]
      const mockDeployments = [
        {
          id: 'dep-1',
          client_id: 'tenant-1',
          assigned_employee_name: 'Dr. Receptionist',
          assigned_employee_slug: 'receptionist',
          status: 'active',
        },
      ]

      mockDb.from.mockImplementation((tableName: string) => {
        if (tableName === 'tenants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockTenants, error: null }),
              }),
            }),
          }
        }
        if (tableName === 'client_deployments') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockDeployments, error: null }),
              }),
            }),
          }
        }
        return {}
      })

      const result = await getAdminQuoteContext(mockAdminUser)

      expect(result.success).toBe(true)
      expect(result.data?.tenants).toEqual(mockTenants)
      expect(result.data?.deployments).toEqual(mockDeployments)
    })

    it('rejects non-admin from creating quote via server action', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(mockTenantUser)
      vi.mocked(isPlatformAdmin).mockResolvedValue(false)

      const result = await createCustomQuoteAction({
        tenant_id: 'tenant-1',
        setup_fee_inr: 25000,
        monthly_fee_inr: 45000,
      })

      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
    })
  })

  // ==========================================================================
  // 2. Tenant Isolation & Quote Review (Phase 3 & Phase 4)
  // ==========================================================================
  describe('Tenant Isolation & Quote Review', () => {
    it('prevents tenant B from fetching tenant A quote (403 Forbidden)', async () => {
      const mockQuote = {
        id: 'quote-alpha',
        tenant_id: 'tenant-alpha',
        setup_fee_inr: 50000,
        monthly_fee_inr: 80000,
        status: 'sent',
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockQuote, error: null }),
          }),
        }),
      })

      // User belongs to tenant-beta
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantBetaUser,
        tenant: { id: 'tenant-beta', name: 'Beta Tenant', slug: 'beta', type: 'customer', status: 'active', created_at: '', updated_at: '' },
        tenantId: 'tenant-beta',
        membership: null as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await getQuote('quote-alpha', mockTenantBetaUser)
      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
      expect(result.error).toContain('You do not have access to this quote')
    })

    it('tenant overview delivers server-side isPlatformAdmin flag and tenantName', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser,
        tenant: { id: 'tenant-alpha', name: 'Alpha Care', slug: 'alpha', type: 'customer', status: 'active', created_at: '', updated_at: '' },
        tenantId: 'tenant-alpha',
        membership: null as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      mockDb.from.mockImplementation((tableName: string) => {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                then: (cb: any) => cb({ data: [], error: null }),
              }),
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            }),
          }),
        }
      })

      const result = await getTenantBillingOverview(mockTenantUser)
      expect(result.success).toBe(true)
      expect(result.data?.isPlatformAdmin).toBe(false)
      expect(result.data?.tenantName).toBe('Alpha Care')
    })
  })

  // ==========================================================================
  // 3. Quote Acceptance & Activation Workflow (Phase 5 & Phase 6)
  // ==========================================================================
  describe('Quote Acceptance & Activation Workflow', () => {
    it('blocks acceptance of an expired proposal', async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString()
      const mockQuote = {
        id: 'quote-expired',
        tenant_id: 'tenant-alpha',
        status: 'sent',
        valid_until: pastDate,
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockQuote, error: null }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser,
        tenant: { id: 'tenant-alpha', name: 'Alpha', slug: 'alpha', type: 'customer', status: 'active', created_at: '', updated_at: '' },
        tenantId: 'tenant-alpha',
        membership: null as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await acceptQuote({ quote_id: 'quote-expired' }, mockTenantUser)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Proposal expired')
    })

    it('blocks acceptance of a draft proposal', async () => {
      const mockQuote = {
        id: 'quote-draft',
        tenant_id: 'tenant-alpha',
        status: 'draft',
        valid_until: null,
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockQuote, error: null }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser,
        tenant: { id: 'tenant-alpha', name: 'Alpha', slug: 'alpha', type: 'customer', status: 'active', created_at: '', updated_at: '' },
        tenantId: 'tenant-alpha',
        membership: null as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await acceptQuote({ quote_id: 'quote-draft' }, mockTenantUser)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Cannot accept a quote that is still in draft state')
    })

    it('blocks acceptance of a superseded proposal', async () => {
      const mockQuote = {
        id: 'quote-super',
        tenant_id: 'tenant-alpha',
        status: 'superseded',
        valid_until: null,
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockQuote, error: null }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser,
        tenant: { id: 'tenant-alpha', name: 'Alpha', slug: 'alpha', type: 'customer', status: 'active', created_at: '', updated_at: '' },
        tenantId: 'tenant-alpha',
        membership: null as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await acceptQuote({ quote_id: 'quote-super' }, mockTenantUser)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('superseded')
    })

    it('allows subscription activation only from an accepted quote bound to a deployment', async () => {
      const mockQuote = {
        id: 'quote-accepted',
        tenant_id: 'tenant-alpha',
        deployment_id: 'dep-alpha-1',
        monthly_fee_inr: 45000,
        status: 'accepted',
      }

      const mockNewSub = {
        id: 'sub-new',
        tenant_id: 'tenant-alpha',
        deployment_id: 'dep-alpha-1',
        monthly_fee_inr: 45000,
        status: 'active',
      }

      mockDb.from.mockImplementation((tableName: string) => {
        if (tableName === 'billing_quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockQuote, error: null }),
              }),
            }),
          }
        }
        if (tableName === 'client_deployments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'dep-alpha-1', client_id: 'tenant-alpha' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (tableName === 'billing_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockNewSub, error: null }),
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser,
        tenant: { id: 'tenant-alpha', name: 'Alpha', slug: 'alpha', type: 'customer', status: 'active', created_at: '', updated_at: '' },
        tenantId: 'tenant-alpha',
        membership: null as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await createSubscriptionFromAcceptedQuote(
        { quote_id: 'quote-accepted' },
        mockTenantUser
      )

      expect(result.success).toBe(true)
      expect(result.data?.monthly_fee_inr).toBe(45000)
      expect(result.data?.status).toBe('active')
    })

    it('strictly blocks cross-tenant deployment association', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'dep-attacker', client_id: 'tenant-victim', status: 'active' },
              error: null,
            }),
          }),
        }),
      })

      await expect(
        assertDeploymentTenantAlignment('dep-attacker', 'tenant-attacker', mockDb)
      ).rejects.toThrow('Cross-tenant violation')
    })
  })

  // ==========================================================================
  // 4. Commercial Language & Removal of Legacy USD Mock Data (Phase 8)
  // ==========================================================================
  describe('UI Content & Commercial Language (Phase 8)', () => {
    const billingPagePath = path.join(
      process.cwd(),
      'app',
      '(shell)',
      'dashboard',
      'billing',
      'page.tsx'
    )
    const billingPageSource = fs.readFileSync(billingPagePath, 'utf-8')

    it('contains no legacy USD mock pricing strings ($99, $249, Starter, Growth)', () => {
      expect(billingPageSource).not.toContain('$99')
      expect(billingPageSource).not.toContain('$249')
      expect(billingPageSource).not.toContain('Starter Plan')
      expect(billingPageSource).not.toContain('Growth Plan')
      expect(billingPageSource).not.toContain('Visa ending in 4242')
      expect(billingPageSource).not.toContain('INV-2026-004')
    })

    it('contains official bespoke commercial wording', () => {
      expect(billingPageSource).toContain(
        'Custom pricing based on your business, requirements, integrations and usage.'
      )
    })

    it('contains INR currency formatting helper and no hardcoded public tiers', () => {
      expect(billingPageSource).toContain('formatINR')
      expect(billingPageSource).toContain('currency: \'INR\'')
    })
  })
})
