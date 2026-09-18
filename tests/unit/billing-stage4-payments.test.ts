import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createPaymentForInvoice,
  reconcilePaymentForInvoice,
  processRazorpayWebhookEvent,
} from '@/lib/billing/service'
import {
  createPaymentForInvoiceAction,
  reconcilePaymentForInvoiceAction,
} from '@/app/actions/billing'
import {
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  createRazorpayOrder,
} from '@/lib/billing/razorpay'
import { POST } from '@/app/api/webhooks/razorpay/route'
import { isPlatformAdmin, resolveAuthorizedTenant, getAuthenticatedUser } from '@/lib/auth'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import * as crypto from 'node:crypto'

vi.mock('@/lib/auth', () => ({
  isPlatformAdmin: vi.fn(),
  resolveAuthorizedTenant: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
  createServerClient: vi.fn(),
}))

describe('Commercial Billing — Stage 4 Payments & Razorpay Integration', () => {
  const mockTenantA = { id: 'tenant-a', name: 'Tenant Alpha' }
  const mockTenantB = { id: 'tenant-b', name: 'Tenant Beta' }
  const mockUserA = { id: 'user-001', email: 'owner@alpha.com' }
  const mockUserB = { id: 'user-002', email: 'owner@beta.com' }

  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key123'
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_456'
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret_789'

    mockDb = {
      from: vi.fn(),
    }
    vi.mocked(createAdminClient).mockResolvedValue(mockDb)
    vi.mocked(createServerClient).mockResolvedValue(mockDb)
  })

  afterEach(() => {
    delete process.env.RAZORPAY_KEY_ID
    delete process.env.RAZORPAY_KEY_SECRET
    delete process.env.RAZORPAY_WEBHOOK_SECRET
  })

  // ==========================================================================
  // 1. Razorpay Cryptographic Verification & Adapter Tests
  // ==========================================================================
  describe('Razorpay Signature Verification (lib/billing/razorpay.ts)', () => {
    it('verifies valid checkout payment signature using HMAC-SHA256', () => {
      const orderId = 'order_test_123'
      const paymentId = 'pay_test_456'
      const secret = 'test_secret_456'

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex')

      const result = verifyRazorpayPaymentSignature({
        orderId,
        paymentId,
        signature: expectedSignature,
        overrideSecret: secret,
      })

      expect(result.isValid).toBe(true)
    })

    it('rejects tampered payment signature', () => {
      const result = verifyRazorpayPaymentSignature({
        orderId: 'order_test_123',
        paymentId: 'pay_test_456',
        signature: 'a'.repeat(64),
        overrideSecret: 'test_secret_456',
      })

      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('Signature mismatch')
    })

    it('rejects signature if payload is altered', () => {
      const secret = 'test_secret_456'
      const validSig = crypto
        .createHmac('sha256', secret)
        .update('order_test_123|pay_test_456')
        .digest('hex')

      const result = verifyRazorpayPaymentSignature({
        orderId: 'order_test_OTHER',
        paymentId: 'pay_test_456',
        signature: validSig,
        overrideSecret: secret,
      })

      expect(result.isValid).toBe(false)
    })

    it('verifies valid inbound webhook signature', () => {
      const rawBody = JSON.stringify({ event: 'payment.captured', entity: 'event' })
      const secret = 'test_webhook_secret_789'

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')

      const result = verifyRazorpayWebhookSignature(rawBody, expectedSignature, secret)
      expect(result.isValid).toBe(true)
    })

    it('rejects tampered inbound webhook payload', () => {
      const secret = 'test_webhook_secret_789'
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update('original payload')
        .digest('hex')

      const result = verifyRazorpayWebhookSignature('altered payload', expectedSignature, secret)
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('Signature mismatch')
    })

    it('creates Razorpay order via Basic Auth fetch', async () => {
      const mockOrderResponse = {
        id: 'order_rzp_mock_999',
        amount: 2950000,
        currency: 'INR',
        status: 'created',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockOrderResponse),
      }) as any

      const res = await createRazorpayOrder({
        amount_paise: 2950000,
        receipt: 'INV-2026-0001',
        notes: { tenant_id: 'tenant-a', invoice_id: 'inv-123' },
      })

      expect(res.success).toBe(true)
      expect(res.data?.id).toBe('order_rzp_mock_999')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.razorpay.com/v1/orders',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      )
    })
  })

  // ==========================================================================
  // 2. Server-side Payment Creation
  // ==========================================================================
  describe('createPaymentForInvoice', () => {
    it('rejects unauthenticated requests (401)', async () => {
      const result = await createPaymentForInvoice({ invoice_id: 'inv-123' }, null)
      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
      expect(result.error).toContain('Authentication required')
    })

    it('rejects cross-tenant invoice access (403 Forbidden)', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        tenantId: 'tenant-b',
        tenantRole: 'owner',
        isPlatformAdmin: false,
      } as any)

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'inv-123',
          tenant_id: 'tenant-a', // Belongs to Tenant A
          invoice_number: 'INV-2026-0001',
          total_inr: 29500,
          status: 'issued',
          gateway_order_id: null,
        },
        error: null,
      })

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockSingle,
          }),
        }),
      })

      const result = await createPaymentForInvoice({ invoice_id: 'inv-123' }, mockUserB)
      expect(result.success).toBe(false)
      expect(result.status).toBe(403)
      expect(result.error).toContain('Forbidden')
    })

    it('rejects payment for already paid invoice (400)', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        tenantId: 'tenant-a',
        tenantRole: 'owner',
        isPlatformAdmin: false,
      } as any)

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'inv-123',
          tenant_id: 'tenant-a',
          invoice_number: 'INV-2026-0001',
          total_inr: 29500,
          status: 'paid', // Already paid
          gateway_order_id: 'order_existing_123',
        },
        error: null,
      })

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockSingle,
          }),
        }),
      })

      const result = await createPaymentForInvoice({ invoice_id: 'inv-123' }, mockUserA)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('already been paid')
    })

    it('rejects payment for void invoice (400)', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        tenantId: 'tenant-a',
        tenantRole: 'owner',
        isPlatformAdmin: false,
      } as any)

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'inv-123',
          tenant_id: 'tenant-a',
          invoice_number: 'INV-2026-0001',
          total_inr: 29500,
          status: 'void',
          gateway_order_id: null,
        },
        error: null,
      })

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockSingle,
          }),
        }),
      })

      const result = await createPaymentForInvoice({ invoice_id: 'inv-123' }, mockUserA)
      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Cannot pay a void invoice')
    })

    it('strictly derives amount from database total_inr in paise and creates order', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        tenantId: 'tenant-a',
        tenantRole: 'owner',
        isPlatformAdmin: false,
      } as any)

      const invoiceData = {
        id: 'inv-123',
        tenant_id: 'tenant-a',
        invoice_number: 'INV-2026-0001',
        total_inr: 29500, // Rs 29,500 = 2,950,000 paise
        status: 'issued',
        gateway_order_id: null,
      }

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'billing_invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: invoiceData, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        return { select: vi.fn() }
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'order_rzp_mock_123',
          amount: 2950000,
          currency: 'INR',
          status: 'created',
        }),
      }) as any

      const result = await createPaymentForInvoice({ invoice_id: 'inv-123' }, mockUserA)

      expect(result.success).toBe(true)
      expect(result.data?.order_id).toBe('order_rzp_mock_123')
      expect(result.data?.amount_paise).toBe(2950000)
      expect(result.data?.currency).toBe('INR')
      expect(result.data?.key_id).toBe('rzp_test_key123')
      expect(result.data?.invoice_number).toBe('INV-2026-0001')
    })

    it('reuses existing gateway_order_id without re-calling Razorpay order creation', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        tenantId: 'tenant-a',
        tenantRole: 'owner',
        isPlatformAdmin: false,
      } as any)

      const invoiceData = {
        id: 'inv-123',
        tenant_id: 'tenant-a',
        invoice_number: 'INV-2026-0001',
        total_inr: 29500,
        status: 'issued',
        gateway_order_id: 'order_already_created_888',
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: invoiceData, error: null }),
          }),
        }),
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'order_already_created_888',
          status: 'created',
          amount: 2950000,
        }),
      }) as any

      const result = await createPaymentForInvoice({ invoice_id: 'inv-123' }, mockUserA)

      expect(result.success).toBe(true)
      expect(result.data?.order_id).toBe('order_already_created_888')
      expect(result.data?.amount_paise).toBe(2950000)
    })
  })

  // ==========================================================================
  // 3. Payment Reconciliation & Subscription Activation
  // ==========================================================================
  describe('reconcilePaymentForInvoice', () => {
    it('rejects unauthenticated requests (401)', async () => {
      const result = await reconcilePaymentForInvoice(
        {
          invoice_id: 'inv-123',
          gateway_order_id: 'order_123',
          gateway_payment_id: 'pay_123',
          gateway_signature: 'sig_123',
        },
        null
      )
      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
    })

    it('rejects reconciliation with invalid signature (400)', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        tenantId: 'tenant-a',
        tenantRole: 'owner',
        isPlatformAdmin: false,
      } as any)

      const invoiceData = {
        id: 'inv-123',
        tenant_id: 'tenant-a',
        invoice_number: 'INV-2026-0001',
        total_inr: 29500,
        status: 'issued',
        gateway_order_id: 'order_123',
        subscription_id: 'sub-123',
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: invoiceData, error: null }),
          }),
        }),
      })

      const result = await reconcilePaymentForInvoice(
        {
          invoice_id: 'inv-123',
          gateway_order_id: 'order_123',
          gateway_payment_id: 'pay_123',
          gateway_signature: 'invalid_forged_sig',
        },
        mockUserA
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Cryptographic signature verification failed')
    })

    it('rejects reconciliation when gateway_order_id does not match invoice (400)', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        tenantId: 'tenant-a',
        tenantRole: 'owner',
        isPlatformAdmin: false,
      } as any)

      const invoiceData = {
        id: 'inv-123',
        tenant_id: 'tenant-a',
        invoice_number: 'INV-2026-0001',
        total_inr: 29500,
        status: 'issued',
        gateway_order_id: 'order_expected_123',
        subscription_id: 'sub-123',
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: invoiceData, error: null }),
          }),
        }),
      })

      const secret = 'test_secret_456'
      const validSig = crypto
        .createHmac('sha256', secret)
        .update('order_DIFFERENT_999|pay_123')
        .digest('hex')

      const result = await reconcilePaymentForInvoice(
        {
          invoice_id: 'inv-123',
          gateway_order_id: 'order_DIFFERENT_999',
          gateway_payment_id: 'pay_123',
          gateway_signature: validSig,
        },
        mockUserA
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Gateway order ID does not match invoice records')
    })

    it('successfully marks invoice paid and activates incomplete subscription', async () => {
      vi.mocked(resolveAuthorizedTenant).mockResolvedValue({
        success: true,
        tenantId: 'tenant-a',
        tenantRole: 'owner',
        isPlatformAdmin: false,
      } as any)

      const invoiceData = {
        id: 'inv-123',
        tenant_id: 'tenant-a',
        invoice_number: 'INV-2026-0001',
        total_inr: 29500,
        status: 'issued',
        gateway_order_id: 'order_123',
        subscription_id: 'sub-123',
      }

      let invoiceUpdatePayload: any = null
      let subUpdatePayload: any = null

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'billing_invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: invoiceData, error: null }),
              }),
            }),
            update: vi.fn().mockImplementation((payload) => {
              invoiceUpdatePayload = payload
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...invoiceData, ...payload, status: 'paid' },
                      error: null,
                    }),
                  }),
                }),
              }
            }),
          }
        }
        if (table === 'billing_subscriptions') {
          return {
            update: vi.fn().mockImplementation((payload) => {
              subUpdatePayload = payload
              return {
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({ error: null }),
                }),
              }
            }),
          }
        }
        return { select: vi.fn() }
      })

      const secret = 'test_secret_456'
      const validSig = crypto
        .createHmac('sha256', secret)
        .update('order_123|pay_test_777')
        .digest('hex')

      const result = await reconcilePaymentForInvoice(
        {
          invoice_id: 'inv-123',
          gateway_order_id: 'order_123',
          gateway_payment_id: 'pay_test_777',
          gateway_signature: validSig,
        },
        mockUserA
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('paid')
      expect(result.data?.invoice_number).toBe('INV-2026-0001')

      // Verify invoice was updated to paid with gateway metadata
      expect(invoiceUpdatePayload).toMatchObject({
        status: 'paid',
        gateway_payment_id: 'pay_test_777',
        payment_method: 'razorpay',
      })
      expect(invoiceUpdatePayload.paid_at).toBeDefined()

      // Verify subscription was transitioned to active with cycle dates
      expect(subUpdatePayload).toMatchObject({
        status: 'active',
      })
      expect(subUpdatePayload.current_period_start).toBeDefined()
      expect(subUpdatePayload.current_period_end).toBeDefined()
    })
  })

  // ==========================================================================
  // 4. Inbound Webhook Processing (processRazorpayWebhookEvent)
  // ==========================================================================
  describe('processRazorpayWebhookEvent', () => {
    it('rejects webhook with invalid signature (401)', async () => {
      const result = await processRazorpayWebhookEvent(
        '{"event":"payment.captured"}',
        'invalid_webhook_sig'
      )

      expect(result.success).toBe(false)
      expect(result.status).toBe(401)
      expect(result.error).toContain('Webhook signature verification failed')
    })

    it('rejects malformed webhook JSON (400)', async () => {
      const secret = 'test_webhook_secret_789'
      const rawBody = 'NOT_JSON'
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

      const result = await processRazorpayWebhookEvent(rawBody, validSig)

      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Malformed JSON payload')
    })

    it('ignores webhook events with no order_id gracefully (200)', async () => {
      const secret = 'test_webhook_secret_789'
      const rawBody = JSON.stringify({ event: 'subscription.charged', payload: {} })
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

      const result = await processRazorpayWebhookEvent(rawBody, validSig)

      expect(result.success).toBe(true)
      expect(result.data?.action).toBe('ignored')
      expect(result.data?.message).toContain('No order_id present')
    })

    it('handles payment.captured with unknown order ID (404)', async () => {
      const secret = 'test_webhook_secret_789'
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_999',
              order_id: 'order_nonexistent_000',
              amount: 2950000,
              currency: 'INR',
              method: 'upi',
            },
          },
        },
      }
      const rawBody = JSON.stringify(payload)
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      })

      const result = await processRazorpayWebhookEvent(rawBody, validSig)

      expect(result.success).toBe(false)
      expect(result.status).toBe(404)
      expect(result.error).toContain('No invoice found')
    })

    it('rejects payment.captured with amount mismatch (400)', async () => {
      const secret = 'test_webhook_secret_789'
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_999',
              order_id: 'order_123',
              amount: 100000, // 1,000 INR instead of 29,500 INR
              currency: 'INR',
              method: 'card',
            },
          },
        },
      }
      const rawBody = JSON.stringify(payload)
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

      const invoiceData = {
        id: 'inv-123',
        tenant_id: 'tenant-a',
        invoice_number: 'INV-2026-0001',
        total_inr: 29500, // Expected 2,950,000 paise
        status: 'issued',
        gateway_order_id: 'order_123',
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: invoiceData, error: null }),
          }),
        }),
      })

      const result = await processRazorpayWebhookEvent(rawBody, validSig)

      expect(result.success).toBe(false)
      expect(result.status).toBe(400)
      expect(result.error).toContain('Amount mismatch')
    })

    it('is idempotent when invoice is already marked paid (200)', async () => {
      const secret = 'test_webhook_secret_789'
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_999',
              order_id: 'order_123',
              amount: 2950000,
              currency: 'INR',
              method: 'netbanking',
            },
          },
        },
      }
      const rawBody = JSON.stringify(payload)
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

      const invoiceData = {
        id: 'inv-123',
        tenant_id: 'tenant-a',
        invoice_number: 'INV-2026-0001',
        total_inr: 29500,
        status: 'paid', // Already paid
        gateway_order_id: 'order_123',
      }

      mockDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: invoiceData, error: null }),
          }),
        }),
      })

      const result = await processRazorpayWebhookEvent(rawBody, validSig)

      expect(result.success).toBe(true)
      expect(result.data?.action).toBe('already_processed')
      expect(result.data?.message).toContain('already marked as paid')
    })

    it('successfully processes payment.captured, settles invoice, and activates subscription', async () => {
      const secret = 'test_webhook_secret_789'
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_captured_888',
              order_id: 'order_123',
              amount: 2950000,
              currency: 'INR',
              method: 'upi',
            },
          },
        },
      }
      const rawBody = JSON.stringify(payload)
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

      const invoiceData = {
        id: 'inv-123',
        tenant_id: 'tenant-a',
        invoice_number: 'INV-2026-0001',
        total_inr: 29500,
        status: 'issued',
        gateway_order_id: 'order_123',
        subscription_id: 'sub-123',
      }

      let invoiceUpdatePayload: any = null
      let subUpdatePayload: any = null

      mockDb.from.mockImplementation((table: string) => {
        if (table === 'billing_invoices') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: invoiceData, error: null }),
              }),
            }),
            update: vi.fn().mockImplementation((payload) => {
              invoiceUpdatePayload = payload
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }
        if (table === 'billing_subscriptions') {
          return {
            update: vi.fn().mockImplementation((payload) => {
              subUpdatePayload = payload
              return {
                eq: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({ error: null }),
                }),
              }
            }),
          }
        }
        return { select: vi.fn() }
      })

      const result = await processRazorpayWebhookEvent(rawBody, validSig)

      expect(result.success).toBe(true)
      expect(result.data?.action).toBe('paid')
      expect(result.data?.payment_id).toBe('pay_captured_888')

      expect(invoiceUpdatePayload.status).toBe('paid')
      expect(invoiceUpdatePayload.gateway_payment_id).toBe('pay_captured_888')
      expect(invoiceUpdatePayload.payment_method).toBe('upi')
      expect(subUpdatePayload.status).toBe('active')
      expect(subUpdatePayload.current_period_start).toBeDefined()
    })
  })

  // ==========================================================================
  // 5. Inbound Webhook HTTP Route Handler (app/api/webhooks/razorpay/route.ts)
  // ==========================================================================
  describe('Inbound Webhook HTTP Handler (app/api/webhooks/razorpay/route.ts)', () => {
    it('returns 400 when x-razorpay-signature header is missing', async () => {
      const mockRequest = new Request('https://grovaitech.com/api/webhooks/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'payment.captured' }),
      })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Missing x-razorpay-signature header')
    })

    it('returns 401 when signature verification fails', async () => {
      const mockRequest = new Request('https://grovaitech.com/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': 'invalid_forged_sig',
        },
        body: JSON.stringify({ event: 'payment.captured' }),
      })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toContain('Webhook signature verification failed')
    })

    it('returns 200 with JSON result on valid webhook event', async () => {
      const secret = 'test_webhook_secret_789'
      const rawBody = JSON.stringify({ event: 'subscription.charged', payload: {} })
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

      const mockRequest = new Request('https://grovaitech.com/api/webhooks/razorpay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': validSig,
        },
        body: rawBody,
      })

      const response = await POST(mockRequest as any)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.received).toBe(true)
    })
  })

  // ==========================================================================
  // 6. Next.js Server Actions Interface
  // ==========================================================================
  describe('Next.js Server Actions (app/actions/billing.ts)', () => {
    it('createPaymentForInvoiceAction verifies authentication via getAuthenticatedUser', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null)
      const res = await createPaymentForInvoiceAction({ invoice_id: 'inv-123' })
      expect(res.success).toBe(false)
      expect(res.error).toContain('Authentication required')
    })

    it('reconcilePaymentForInvoiceAction verifies authentication via getAuthenticatedUser', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue(null)
      const res = await reconcilePaymentForInvoiceAction({
        invoice_id: 'inv-123',
        gateway_order_id: 'order_123',
        gateway_payment_id: 'pay_123',
        gateway_signature: 'sig_123',
      })
      expect(res.success).toBe(false)
      expect(res.error).toContain('Authentication required')
    })
  })
})
