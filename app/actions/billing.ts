'use server'

/**
 * Grovaitech AI Workforce OS
 * app/actions/billing.ts
 *
 * Next.js Server Actions for Commercial Billing.
 * Exposes type-safe, authenticated actions for quotes, subscriptions, invoices,
 * and tenant billing overviews.
 */

import { getAuthenticatedUser } from '@/lib/auth'
import {
  createCustomQuote,
  getQuote,
  acceptQuote,
  supersedeQuote,
  createSubscriptionFromAcceptedQuote,
  createInvoiceForSubscription,
  getTenantBillingOverview,
  getAdminQuoteContext,
} from '@/lib/billing/service'
import type {
  CreateCustomQuoteInput,
  AcceptQuoteInput,
  CreateSubscriptionInput,
  CreateInvoiceInput,
  BillingActionResult,
  BillingQuote,
  BillingSubscription,
  BillingInvoice,
  TenantBillingOverview,
  AdminQuoteContext,
} from '@/lib/billing/types'

/**
 * Platform Admin Action: Create a custom commercial quote for a tenant.
 */
export async function createCustomQuoteAction(
  input: CreateCustomQuoteInput
): Promise<BillingActionResult<BillingQuote>> {
  try {
    const user = await getAuthenticatedUser()
    return await createCustomQuote(input, user)
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while creating the quote.',
      status: 500,
    }
  }
}

/**
 * Tenant / Admin Action: Fetch a quote by ID.
 */
export async function getQuoteAction(
  quoteId: string,
  tenantId?: string
): Promise<BillingActionResult<BillingQuote>> {
  try {
    const user = await getAuthenticatedUser()
    return await getQuote(quoteId, user, tenantId)
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while fetching the quote.',
      status: 500,
    }
  }
}

/**
 * Tenant Owner/Admin Action: Accept an issued commercial proposal.
 */
export async function acceptQuoteAction(
  input: AcceptQuoteInput
): Promise<BillingActionResult<BillingQuote>> {
  try {
    const user = await getAuthenticatedUser()
    return await acceptQuote(input, user)
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while accepting the quote.',
      status: 500,
    }
  }
}

/**
 * Platform Admin Action: Mark a quote as superseded.
 */
export async function supersedeQuoteAction(
  quoteId: string
): Promise<BillingActionResult<BillingQuote>> {
  try {
    const user = await getAuthenticatedUser()
    return await supersedeQuote(quoteId, user)
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while superseding the quote.',
      status: 500,
    }
  }
}

/**
 * Tenant / Admin Action: Create an active subscription from an accepted quote.
 */
export async function createSubscriptionFromAcceptedQuoteAction(
  input: CreateSubscriptionInput
): Promise<BillingActionResult<BillingSubscription>> {
  try {
    const user = await getAuthenticatedUser()
    return await createSubscriptionFromAcceptedQuote(input, user)
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while creating the subscription.',
      status: 500,
    }
  }
}

/**
 * Platform Admin Action: Generate an invoice for an active subscription.
 */
export async function createInvoiceForSubscriptionAction(
  input: CreateInvoiceInput
): Promise<BillingActionResult<BillingInvoice>> {
  try {
    const user = await getAuthenticatedUser()
    return await createInvoiceForSubscription(input, user)
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while generating the invoice.',
      status: 500,
    }
  }
}

/**
 * Tenant / Admin Action: Retrieve tenant billing overview.
 */
export async function getTenantBillingOverviewAction(
  tenantId?: string
): Promise<BillingActionResult<TenantBillingOverview>> {
  try {
    const user = await getAuthenticatedUser()
    return await getTenantBillingOverview(user, tenantId)
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while loading billing overview.',
      status: 500,
    }
  }
}

/**
 * Platform Admin Action: Retrieve available tenants and deployments for quote builder.
 */
export async function getAdminQuoteContextAction(): Promise<
  BillingActionResult<AdminQuoteContext>
> {
  try {
    const user = await getAuthenticatedUser()
    return await getAdminQuoteContext(user)
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'An unexpected error occurred while loading quote context.',
      status: 500,
    }
  }
}
