import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createCustomQuote,
  getQuote,
  acceptQuote,
  supersedeQuote,
  createSubscriptionFromAcceptedQuote,
  createInvoiceForSubscription,
  getTenantBillingOverview,
  assertDeploymentTenantAlignment,
  generateInvoiceNumber,
} from '@/lib/billing/service'
import { isPlatformAdmin, resolveAuthorizedTenant } from '@/lib/auth'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'

vi.mock('@/lib/auth', () => ({
  isPlatformAdmin: vi.fn(),
  resolveAuthorizedTenant: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
}))

describe('Commercial Billing Foundation — Stage 2 Service & Actions', () => {
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
  // 1. Cross-Tenant Guard
  // ==========================================================================
  describe('assertDeploymentTenantAlignment()', () => {
    it('accepts alignment when deployment.client_id matches target tenant_id', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'dep-client-alpha-receptionist',
                client_id: 'client-alpha',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      })

      const aligned = await assertDeploymentTenantAlignment(
        'dep-client-alpha-receptionist',
        'client-alpha',
        mockDb
      )
      expect(aligned).toBe(true)
    })

    it('rejects alignment and throws when deployment.client_id belongs to a DIFFERENT tenant', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'dep-client-beta-receptionist',
                client_id: 'client-beta',
                status: 'active',
              },
              error: null,
            }),
          }),
        }),
      })

      await expect(
        assertDeploymentTenantAlignment('dep-client-beta-receptionist', 'client-alpha', mockDb)
      ).rejects.toThrow(/Cross-tenant violation/)
    })

    it('throws when deployment is not found', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      await expect(
        assertDeploymentTenantAlignment('non-existent-dep', 'client-alpha', mockDb)
      ).rejects.toThrow(/not found or inaccessible/)
    })
  })

  // ==========================================================================
  // 2. Quote Management (createCustomQuote, getQuote, acceptQuote, supersedeQuote)
  // ==========================================================================
  describe('createCustomQuote()', () => {
    it('rejects unauthenticated user with 401', async () => {
      const result = await createCustomQuote(
        {
          tenant_id: 'client-alpha',
          setup_fee_inr: 15000,
          monthly_fee_inr: 25000,
        },
        null
      )
      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
    })

    it('rejects non-admin tenant user with 403', async () => {
      vi.mocked(isPlatformAdmin).mockResolvedValue(false)

      const result = await createCustomQuote(
        {
          tenant_id: 'client-alpha',
          setup_fee_inr: 15000,
          monthly_fee_inr: 25000,
        },
        mockTenantUser
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
      expect(result.error).toContain('Only platform administrators')
    })

    it('rejects negative fees with 400', async () => {
      vi.mocked(isPlatformAdmin).mockResolvedValue(true)
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'client-alpha', status: 'active' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const result = await createCustomQuote(
        {
          tenant_id: 'client-alpha',
          setup_fee_inr: -500,
          monthly_fee_inr: 25000,
        },
        mockAdminUser
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
    })

    it('rejects cross-tenant deployment association when creating quote', async () => {
      vi.mocked(isPlatformAdmin).mockResolvedValue(true)
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'client-alpha', status: 'active' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'client_deployments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'dep-client-beta-01', client_id: 'client-beta' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const result = await createCustomQuote(
        {
          tenant_id: 'client-alpha',
          deployment_id: 'dep-client-beta-01',
          setup_fee_inr: 15000,
          monthly_fee_inr: 25000,
        },
        mockAdminUser
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Cross-tenant violation')
    })

    it('creates quote successfully when platform admin and valid inputs', async () => {
      vi.mocked(isPlatformAdmin).mockResolvedValue(true)

      const mockCreatedQuote = {
        id: 'quote-001',
        tenant_id: 'client-alpha',
        deployment_id: 'dep-client-alpha-01',
        setup_fee_inr: 15000,
        monthly_fee_inr: 25000,
        included_conversations: 1000,
        overage_rate_per_conv_inr: 5.0,
        status: 'sent',
        valid_until: null,
        custom_terms: 'Pilot custom terms',
      }

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'tenants') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'client-alpha', status: 'active' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'client_deployments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'dep-client-alpha-01', client_id: 'client-alpha' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'billing_quotes') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreatedQuote,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      const result = await createCustomQuote(
        {
          tenant_id: 'client-alpha',
          deployment_id: 'dep-client-alpha-01',
          setup_fee_inr: 15000,
          monthly_fee_inr: 25000,
          status: 'sent',
          custom_terms: 'Pilot custom terms',
        },
        mockAdminUser
      )

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe('quote-001')
      expect(result.data?.monthly_fee_inr).toBe(25000)
    })
  })

  describe('getQuote()', () => {
    it('allows tenant to read its own quote', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'quote-alpha-1', tenant_id: 'client-alpha', monthly_fee_inr: 20000 },
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await getQuote('quote-alpha-1', mockTenantUser, 'client-alpha')
      expect(result.success).toBe(true)
      expect(result.data?.tenant_id).toBe('client-alpha')
    })

    it('rejects tenant attempting to read another tenant quote', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'quote-beta-1', tenant_id: 'client-beta' },
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: false,
        error: 'Forbidden: You do not have permission to access workspace "client-beta".',
        status: 403,
        user: mockTenantUser as any,
      })

      const result = await getQuote('quote-beta-1', mockTenantUser, 'client-beta')
      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
    })
  })

  describe('acceptQuote()', () => {
    it('rejects expired quote', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'quote-exp',
                tenant_id: 'client-alpha',
                status: 'sent',
                valid_until: pastDate,
              },
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await acceptQuote({ quote_id: 'quote-exp' }, mockTenantUser)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Proposal expired')
    })

    it('rejects draft quote from being accepted (must be sent first)', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'quote-draft',
                tenant_id: 'client-alpha',
                status: 'draft',
              },
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await acceptQuote({ quote_id: 'quote-draft' }, mockTenantUser)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('draft state')
    })

    it('rejects superseded quote from being accepted', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'quote-old',
                tenant_id: 'client-alpha',
                status: 'superseded',
              },
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await acceptQuote({ quote_id: 'quote-old' }, mockTenantUser)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('superseded')
    })

    it('successfully accepts valid sent quote and records accepted_at', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const acceptedQuote = {
        id: 'quote-ok',
        tenant_id: 'client-alpha',
        status: 'accepted',
        valid_until: futureDate,
        accepted_at: new Date().toISOString(),
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'quote-ok',
                tenant_id: 'client-alpha',
                status: 'sent',
                valid_until: futureDate,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: acceptedQuote,
                error: null,
              }),
            }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await acceptQuote({ quote_id: 'quote-ok' }, mockTenantUser)
      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('accepted')
    })
  })

  describe('supersedeQuote()', () => {
    it('rejects non-admin tenant user with 403', async () => {
      vi.mocked(isPlatformAdmin).mockResolvedValue(false)
      const result = await supersedeQuote('quote-1', mockTenantUser)
      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
    })

    it('supersedes quote when platform admin', async () => {
      vi.mocked(isPlatformAdmin).mockResolvedValue(true)
      mockDb.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'quote-1', status: 'superseded' },
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await supersedeQuote('quote-1', mockAdminUser)
      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('superseded')
    })
  })

  // ==========================================================================
  // 3. Subscriptions (createSubscriptionFromAcceptedQuote)
  // ==========================================================================
  describe('createSubscriptionFromAcceptedQuote()', () => {
    it('rejects quote that is not accepted', async () => {
      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'quote-unaccepted',
                tenant_id: 'client-alpha',
                status: 'sent',
                deployment_id: 'dep-1',
              },
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await createSubscriptionFromAcceptedQuote(
        { quote_id: 'quote-unaccepted' },
        mockTenantUser
      )
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('must be "accepted"')
    })

    it('rejects cross-tenant deployment on subscription creation', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'billing_quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'quote-cross',
                    tenant_id: 'client-alpha',
                    status: 'accepted',
                    deployment_id: 'dep-beta',
                    monthly_fee_inr: 20000,
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'client_deployments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'dep-beta', client_id: 'client-beta' },
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await createSubscriptionFromAcceptedQuote(
        { quote_id: 'quote-cross' },
        mockTenantUser
      )
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Cross-tenant violation')
    })

    it('rejects duplicate active subscription for same deployment', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'billing_quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'quote-dup',
                    tenant_id: 'client-alpha',
                    status: 'accepted',
                    deployment_id: 'dep-alpha-01',
                    monthly_fee_inr: 20000,
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'client_deployments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'dep-alpha-01', client_id: 'client-alpha' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'billing_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'existing-sub-001', status: 'active' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await createSubscriptionFromAcceptedQuote(
        { quote_id: 'quote-dup' },
        mockTenantUser
      )
      expect(result.success).toBe(false)
      expect(result.status).toBe(409)
      expect(result.error).toContain('An ongoing subscription')
    })

    it('creates subscription strictly copying quote agreed pricing', async () => {
      const mockNewSubscription = {
        id: 'sub-new-1',
        tenant_id: 'client-alpha',
        deployment_id: 'dep-alpha-01',
        quote_id: 'quote-good',
        status: 'active',
        monthly_fee_inr: 35000,
      }

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'billing_quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'quote-good',
                    tenant_id: 'client-alpha',
                    status: 'accepted',
                    deployment_id: 'dep-alpha-01',
                    monthly_fee_inr: 35000, // agreed price
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'client_deployments') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'dep-alpha-01', client_id: 'client-alpha' },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'billing_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // No existing active
                    error: null,
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockNewSubscription,
                  error: null,
                }),
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await createSubscriptionFromAcceptedQuote(
        { quote_id: 'quote-good' },
        mockTenantUser
      )

      expect(result.success).toBe(true)
      expect(result.data?.monthly_fee_inr).toBe(35000)
    })
  })

  // ==========================================================================
  // 4. Invoices (createInvoiceForSubscription)
  // ==========================================================================
  describe('createInvoiceForSubscription()', () => {
    it('generates unique invoice number matching format GAI-YYYY-XXXX', () => {
      const invNum = generateInvoiceNumber(2026)
      expect(invNum).toMatch(/^GAI-2026-\d{4}$/)
    })

    it('calculates 18% GST and total arithmetic correctly from subscription fee', async () => {
      let capturedInsertPayload: any = null

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'billing_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: 'sub-active-01',
                    tenant_id: 'client-alpha',
                    monthly_fee_inr: 50000,
                  },
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === 'billing_invoices') {
          return {
            insert: vi.fn().mockImplementation((payload) => {
              capturedInsertPayload = payload
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'inv-001', ...payload },
                    error: null,
                  }),
                }),
              }
            }),
          }
        }
        return {}
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await createInvoiceForSubscription(
        {
          subscription_id: 'sub-active-01',
          type: 'monthly_subscription',
          tax_rate_percent: 18,
        },
        mockTenantUser
      )

      expect(result.success).toBe(true)
      expect(capturedInsertPayload.amount_inr).toBe(50000)
      expect(capturedInsertPayload.tax_inr).toBe(9000) // 18% of 50000
      expect(capturedInsertPayload.total_inr).toBe(59000)
      expect(capturedInsertPayload.total_inr).toBe(
        capturedInsertPayload.amount_inr + capturedInsertPayload.tax_inr
      )
    })
  })

  // ==========================================================================
  // 5. Tenant Billing Overview (getTenantBillingOverview)
  // ==========================================================================
  describe('getTenantBillingOverview()', () => {
    it('returns tenant-scoped overview and enforces tenant isolation', async () => {
      mockDb.from.mockImplementation((table: string) => {
        if (table === 'billing_quotes') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: 'q-1', tenant_id: 'client-alpha', status: 'sent' }],
                }),
              }),
            }),
          }
        }
        if (table === 'billing_subscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({
                      data: [
                        {
                          id: 'sub-1',
                          tenant_id: 'client-alpha',
                          deployment_id: 'dep-1',
                          status: 'active',
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'billing_invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [{ id: 'inv-1', total_inr: 29500 }],
                  }),
                }),
              }),
            }),
          }
        }
        if (table === 'billing_usage_meters') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: { conversations_count: 142 },
                    }),
                  }),
                }),
              }),
            }),
          }
        }
        return {}
      })

      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        user: mockTenantUser as any,
        tenant: { id: 'client-alpha' } as any,
        tenantId: 'client-alpha',
        membership: {} as any,
        role: 'owner',
        isPlatformAdmin: false,
      })

      const result = await getTenantBillingOverview(mockTenantUser, 'client-alpha')

      expect(result.success).toBe(true)
      expect(result.data?.quotes).toHaveLength(1)
      expect(result.data?.activeSubscription?.id).toBe('sub-1')
      expect(result.data?.invoices).toHaveLength(1)
      expect(result.data?.usageMeter?.conversations_count).toBe(142)
    })
  })
})
