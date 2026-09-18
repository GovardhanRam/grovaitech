/**
 * Grovaitech AI Workforce OS
 * lib/billing/service.ts
 *
 * Core Server-Side Commercial Billing Engine.
 * Manages custom client quotes, deployment subscriptions, tax-calculated invoices,
 * and tenant billing overviews.
 *
 * Security Invariants:
 *   1. Identity is strictly derived from the authenticated session (auth.users).
 *   2. Platform administrative privileges are strictly database-backed (isPlatformAdmin).
 *   3. Cross-Tenant Guard: Every deployment association strictly verifies
 *      deployment.client_id === quote.tenant_id.
 *   4. Zero client-supplied pricing: subscription and invoice amounts are strictly
 *      copied from database quote records.
 *   5. Total calculations strictly enforce total_inr = amount_inr + tax_inr.
 *   6. Single active subscription invariant per deployment is enforced.
 */

import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { isPlatformAdmin, resolveAuthorizedTenant } from '@/lib/auth'
import type { AuthenticatedUser } from '@/lib/auth/types'
import type {
  BillingQuote,
  BillingSubscription,
  BillingInvoice,
  BillingUsageMeter,
  CreateCustomQuoteInput,
  AcceptQuoteInput,
  CreateSubscriptionInput,
  CreateInvoiceInput,
  TenantBillingOverview,
  BillingActionResult,
  AdminQuoteContext,
  AdminQuoteTenantOption,
  AdminQuoteDeploymentOption,
} from './types'

async function getDbClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return await createAdminClient()
    } catch {
      // Fallback to server client
    }
  }
  return await createServerClient()
}

/**
 * Cross-Tenant Guard:
 * Strictly verifies that a given deployment exists and its client_id
 * matches the target tenant_id.
 */
export async function assertDeploymentTenantAlignment(
  deploymentId: string,
  tenantId: string,
  dbClient?: any
): Promise<boolean> {
  if (!deploymentId || !tenantId) {
    throw new Error('Deployment ID and Tenant ID are both required for alignment check.')
  }

  const db = dbClient || (await getDbClient())
  const { data: deployment, error } = await db
    .from('client_deployments')
    .select('id, client_id, status')
    .eq('id', deploymentId)
    .maybeSingle()

  if (error || !deployment) {
    throw new Error(`Deployment "${deploymentId}" not found or inaccessible.`)
  }

  if (deployment.client_id !== tenantId) {
    throw new Error(
      `Cross-tenant violation: Deployment "${deploymentId}" belongs to client "${deployment.client_id}", not tenant "${tenantId}".`
    )
  }

  return true
}

/**
 * Helper to generate unique human-readable invoice numbers:
 * Format: GAI-YYYY-XXXX (e.g. GAI-2026-8492)
 */
export function generateInvoiceNumber(year?: number): string {
  const currentYear = year || new Date().getFullYear()
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  return `GAI-${currentYear}-${randomSuffix}`
}

// ============================================================================
// 1. QUOTE MANAGEMENT
// ============================================================================

/**
 * Creates a custom commercial quote for a tenant.
 * RESTRICTED: Platform Super Admin / Operator only.
 */
export async function createCustomQuote(
  input: CreateCustomQuoteInput,
  user: AuthenticatedUser | null
): Promise<BillingActionResult<BillingQuote>> {
  if (!user) {
    return { success: false, error: 'Authentication required.', status: 401 }
  }

  const hasAdmin = await isPlatformAdmin(user.id)
  if (!hasAdmin) {
    return {
      success: false,
      error: 'Forbidden: Only platform administrators can create custom quotes.',
      status: 403,
    }
  }

  // Validate tenant existence
  const cleanTenantId = input.tenant_id?.trim()
  if (!cleanTenantId) {
    return { success: false, error: 'Target tenant ID is required.', status: 400 }
  }

  const db = await getDbClient()
  const { data: tenant, error: tenantErr } = await db
    .from('tenants')
    .select('id, status')
    .eq('id', cleanTenantId)
    .maybeSingle()

  if (tenantErr || !tenant) {
    return { success: false, error: `Tenant "${cleanTenantId}" does not exist.`, status: 404 }
  }

  // Validate monetary and quota values
  if (input.setup_fee_inr < 0 || input.monthly_fee_inr < 0) {
    return { success: false, error: 'Setup and monthly fees must be non-negative.', status: 400 }
  }

  const includedConversations = input.included_conversations ?? 1000
  if (includedConversations < 0) {
    return { success: false, error: 'Included conversations must be non-negative.', status: 400 }
  }

  const overageRate = input.overage_rate_per_conv_inr ?? 0
  if (overageRate < 0) {
    return { success: false, error: 'Overage rate must be non-negative.', status: 400 }
  }

  // Validate deployment association if provided
  const cleanDeploymentId = input.deployment_id?.trim() || null
  if (cleanDeploymentId) {
    try {
      await assertDeploymentTenantAlignment(cleanDeploymentId, cleanTenantId, db)
    } catch (err: any) {
      return { success: false, error: err.message, status: 400 }
    }
  }

  // Validate valid_until if provided
  let validUntilIso: string | null = null
  if (input.valid_until) {
    const validDate = new Date(input.valid_until)
    if (isNaN(validDate.getTime())) {
      return { success: false, error: 'Invalid valid_until date format.', status: 400 }
    }
    if (validDate.getTime() <= Date.now()) {
      return { success: false, error: 'valid_until must be in the future.', status: 400 }
    }
    validUntilIso = validDate.toISOString()
  }

  const status = input.status || 'draft'

  const { data: quote, error: insertErr } = await db
    .from('billing_quotes')
    .insert({
      tenant_id: cleanTenantId,
      deployment_id: cleanDeploymentId,
      setup_fee_inr: Math.round(input.setup_fee_inr),
      monthly_fee_inr: Math.round(input.monthly_fee_inr),
      included_conversations: Math.round(includedConversations),
      overage_rate_per_conv_inr: overageRate,
      status,
      valid_until: validUntilIso,
      custom_terms: input.custom_terms?.trim() || null,
    })
    .select('*')
    .single()

  if (insertErr || !quote) {
    return {
      success: false,
      error: `Failed to create quote: ${insertErr?.message || 'Database error'}`,
      status: 500,
    }
  }

  return { success: true, data: quote as BillingQuote, status: 201 }
}

/**
 * Retrieves a quote by ID.
 * Authorized for: Tenant members belonging to the quote's tenant, or Platform Admin.
 */
export async function getQuote(
  quoteId: string,
  user: AuthenticatedUser | null,
  requestedTenantId?: string
): Promise<BillingActionResult<BillingQuote>> {
  if (!user) {
    return { success: false, error: 'Authentication required.', status: 401 }
  }

  const cleanQuoteId = quoteId?.trim()
  if (!cleanQuoteId) {
    return { success: false, error: 'Quote ID is required.', status: 400 }
  }

  const db = await getDbClient()
  const { data: quote, error } = await db
    .from('billing_quotes')
    .select('*')
    .eq('id', cleanQuoteId)
    .maybeSingle()

  if (error || !quote) {
    return { success: false, error: 'Quote not found.', status: 404 }
  }

  // Authorize tenant access
  const authResult = await resolveAuthorizedTenant({
    requestedTenantId: requestedTenantId || quote.tenant_id,
  })

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  // Ensure the authorized workspace matches the quote's tenant
  if (!authResult.isPlatformAdmin && authResult.tenantId !== quote.tenant_id) {
    return {
      success: false,
      error: 'Forbidden: You do not have access to this quote.',
      status: 403,
    }
  }

  return { success: true, data: quote as BillingQuote }
}

/**
 * Accepts an issued quote.
 * Authorized for: Tenant owner/admin or Platform Admin.
 */
export async function acceptQuote(
  input: AcceptQuoteInput,
  user: AuthenticatedUser | null
): Promise<BillingActionResult<BillingQuote>> {
  if (!user) {
    return { success: false, error: 'Authentication required.', status: 401 }
  }

  const cleanQuoteId = input.quote_id?.trim()
  if (!cleanQuoteId) {
    return { success: false, error: 'Quote ID is required.', status: 400 }
  }

  const db = await getDbClient()
  const { data: quote, error: fetchErr } = await db
    .from('billing_quotes')
    .select('*')
    .eq('id', cleanQuoteId)
    .maybeSingle()

  if (fetchErr || !quote) {
    return { success: false, error: 'Quote not found.', status: 404 }
  }

  // Authorize access: Must be member of target tenant or platform admin
  const authResult = await resolveAuthorizedTenant({
    requestedTenantId: input.tenant_id || quote.tenant_id,
  })

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  if (!authResult.isPlatformAdmin && authResult.tenantId !== quote.tenant_id) {
    return {
      success: false,
      error: 'Forbidden: You do not have access to accept this quote.',
      status: 403,
    }
  }

  // Only tenant owners/admins or platform admins can accept quotes
  if (!authResult.isPlatformAdmin && authResult.role !== 'owner' && authResult.role !== 'admin') {
    return {
      success: false,
      error: 'Forbidden: Only workspace owners and admins can accept commercial proposals.',
      status: 403,
    }
  }

  // Check state transitions
  if (quote.status === 'accepted') {
    return { success: true, data: quote as BillingQuote } // Idempotent
  }

  if (quote.status === 'superseded') {
    return {
      success: false,
      error: 'Cannot accept a quote that has been superseded by a newer proposal.',
      status: 400,
    }
  }

  if (quote.status === 'draft') {
    return {
      success: false,
      error: 'Cannot accept a quote that is still in draft state. The quote must be issued first.',
      status: 400,
    }
  }

  // Verify valid_until has not passed
  if (quote.valid_until) {
    const expiry = new Date(quote.valid_until).getTime()
    if (Date.now() > expiry) {
      return {
        success: false,
        error: `Proposal expired on ${new Date(quote.valid_until).toLocaleDateString()}. Please request a refreshed quote.`,
        status: 400,
      }
    }
  }

  const acceptedAt = new Date().toISOString()
  const { data: updatedQuote, error: updateErr } = await db
    .from('billing_quotes')
    .update({
      status: 'accepted',
      accepted_at: acceptedAt,
    })
    .eq('id', cleanQuoteId)
    .select('*')
    .single()

  if (updateErr || !updatedQuote) {
    return {
      success: false,
      error: `Failed to accept quote: ${updateErr?.message || 'Database error'}`,
      status: 500,
    }
  }

  return { success: true, data: updatedQuote as BillingQuote }
}

/**
 * Marks an existing quote as superseded.
 * RESTRICTED: Platform Admin only.
 */
export async function supersedeQuote(
  quoteId: string,
  user: AuthenticatedUser | null
): Promise<BillingActionResult<BillingQuote>> {
  if (!user) {
    return { success: false, error: 'Authentication required.', status: 401 }
  }

  const hasAdmin = await isPlatformAdmin(user.id)
  if (!hasAdmin) {
    return {
      success: false,
      error: 'Forbidden: Only platform administrators can supersede quotes.',
      status: 403,
    }
  }

  const cleanQuoteId = quoteId?.trim()
  if (!cleanQuoteId) {
    return { success: false, error: 'Quote ID is required.', status: 400 }
  }

  const db = await getDbClient()
  const { data: updatedQuote, error } = await db
    .from('billing_quotes')
    .update({ status: 'superseded' })
    .eq('id', cleanQuoteId)
    .select('*')
    .single()

  if (error || !updatedQuote) {
    return {
      success: false,
      error: `Failed to supersede quote: ${error?.message || 'Quote not found'}`,
      status: error ? 500 : 404,
    }
  }

  return { success: true, data: updatedQuote as BillingQuote }
}

// ============================================================================
// 2. SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Creates an active subscription contract from an accepted quote.
 * Copies agreed pricing verbatim from the quote (preventing client manipulation).
 * Enforces single active subscription invariant per deployment.
 */
export async function createSubscriptionFromAcceptedQuote(
  input: CreateSubscriptionInput,
  user: AuthenticatedUser | null
): Promise<BillingActionResult<BillingSubscription>> {
  if (!user) {
    return { success: false, error: 'Authentication required.', status: 401 }
  }

  const cleanQuoteId = input.quote_id?.trim()
  if (!cleanQuoteId) {
    return { success: false, error: 'Quote ID is required.', status: 400 }
  }

  const db = await getDbClient()
  const { data: quote, error: quoteErr } = await db
    .from('billing_quotes')
    .select('*')
    .eq('id', cleanQuoteId)
    .maybeSingle()

  if (quoteErr || !quote) {
    return { success: false, error: 'Quote not found.', status: 404 }
  }

  // Authorize access
  const authResult = await resolveAuthorizedTenant({
    requestedTenantId: input.tenant_id || quote.tenant_id,
  })

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  if (!authResult.isPlatformAdmin && authResult.tenantId !== quote.tenant_id) {
    return {
      success: false,
      error: 'Forbidden: You do not have access to this quote.',
      status: 403,
    }
  }

  // Quote must be in accepted state
  if (quote.status !== 'accepted') {
    return {
      success: false,
      error: `Cannot create subscription: Quote is in "${quote.status}" state, but must be "accepted".`,
      status: 400,
    }
  }

  // Deployment association is mandatory for activating an AI Employee subscription
  if (!quote.deployment_id) {
    return {
      success: false,
      error: 'Cannot create subscription: Quote does not have an assigned deployment_id.',
      status: 400,
    }
  }

  // Cross-tenant guard
  try {
    await assertDeploymentTenantAlignment(quote.deployment_id, quote.tenant_id, db)
  } catch (err: any) {
    return { success: false, error: err.message, status: 400 }
  }

  // Enforce single active subscription per deployment
  const { data: existingActive, error: activeErr } = await db
    .from('billing_subscriptions')
    .select('id, status')
    .eq('deployment_id', quote.deployment_id)
    .in('status', ['trial', 'active', 'past_due'])
    .maybeSingle()

  if (!activeErr && existingActive) {
    return {
      success: false,
      error: `An ongoing subscription (ID: ${existingActive.id}, Status: ${existingActive.status}) already exists for deployment "${quote.deployment_id}".`,
      status: 409,
    }
  }

  // Define 30-day billing period
  const startDate = new Date()
  const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { data: subscription, error: insertErr } = await db
    .from('billing_subscriptions')
    .insert({
      tenant_id: quote.tenant_id,
      deployment_id: quote.deployment_id,
      quote_id: quote.id,
      status: 'active',
      billing_period_start: startDate.toISOString(),
      billing_period_end: endDate.toISOString(),
      monthly_fee_inr: quote.monthly_fee_inr, // Copied strictly from quote!
      next_billing_date: endDate.toISOString(),
      client_gstin: input.client_gstin?.trim() || null,
    })
    .select('*')
    .single()

  if (insertErr || !subscription) {
    return {
      success: false,
      error: `Failed to create subscription: ${insertErr?.message || 'Database error'}`,
      status: 500,
    }
  }

  return { success: true, data: subscription as BillingSubscription, status: 201 }
}

// ============================================================================
// 3. INVOICE MANAGEMENT
// ============================================================================

/**
 * Creates an invoice for an active subscription or setup fee.
 * Mathematically validates amount, tax (GST), and total.
 */
export async function createInvoiceForSubscription(
  input: CreateInvoiceInput,
  user: AuthenticatedUser | null
): Promise<BillingActionResult<BillingInvoice>> {
  if (!user) {
    return { success: false, error: 'Authentication required.', status: 401 }
  }

  const cleanSubId = input.subscription_id?.trim()
  if (!cleanSubId) {
    return { success: false, error: 'Subscription ID is required.', status: 400 }
  }

  const db = await getDbClient()
  const { data: subscription, error: subErr } = await db
    .from('billing_subscriptions')
    .select('*, billing_quotes(*)')
    .eq('id', cleanSubId)
    .maybeSingle()

  if (subErr || !subscription) {
    return { success: false, error: 'Subscription not found.', status: 404 }
  }

  // Authorize tenant access
  const authResult = await resolveAuthorizedTenant({
    requestedTenantId: subscription.tenant_id,
  })

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  // Derive base amount strictly from subscription / quote
  let baseAmountInr = 0
  if (input.type === 'monthly_subscription') {
    baseAmountInr = subscription.monthly_fee_inr
  } else if (input.type === 'setup') {
    const quote = subscription.billing_quotes
    if (!quote || quote.setup_fee_inr === undefined) {
      return {
        success: false,
        error: 'Cannot generate setup invoice: No quote with setup fee linked to subscription.',
        status: 400,
      }
    }
    baseAmountInr = quote.setup_fee_inr
  } else if (input.type === 'usage_overage') {
    return {
      success: false,
      error: 'Usage overage invoices must be generated through the usage billing engine.',
      status: 400,
    }
  }

  // Calculate GST (default 18%)
  const taxRate = input.tax_rate_percent !== undefined ? input.tax_rate_percent : 18
  const taxInr = Math.round(baseAmountInr * (taxRate / 100))
  const totalInr = baseAmountInr + taxInr

  const invoiceNumber = generateInvoiceNumber()
  const issueDate = new Date()
  const dueDays = input.due_days ?? 7
  const dueDate = new Date(issueDate.getTime() + dueDays * 24 * 60 * 60 * 1000)

  const { data: invoice, error: insertErr } = await db
    .from('billing_invoices')
    .insert({
      tenant_id: subscription.tenant_id,
      subscription_id: subscription.id,
      invoice_number: invoiceNumber,
      type: input.type,
      amount_inr: baseAmountInr,
      tax_inr: taxInr,
      total_inr: totalInr,
      status: 'issued',
      issued_at: issueDate.toISOString(),
      due_date: dueDate.toISOString(),
    })
    .select('*')
    .single()

  if (insertErr || !invoice) {
    return {
      success: false,
      error: `Failed to create invoice: ${insertErr?.message || 'Database error'}`,
      status: 500,
    }
  }

  return { success: true, data: invoice as BillingInvoice, status: 201 }
}

// ============================================================================
// 4. TENANT BILLING OVERVIEW
// ============================================================================

/**
 * Retrieves the comprehensive tenant billing overview for the dashboard.
 * Includes active quotes, current subscription, recent invoices, and usage meters.
 * Enforces strict tenant isolation.
 */
export async function getTenantBillingOverview(
  user: AuthenticatedUser | null,
  requestedTenantId?: string
): Promise<BillingActionResult<TenantBillingOverview>> {
  if (!user) {
    return { success: false, error: 'Authentication required.', status: 401 }
  }

  const authResult = await resolveAuthorizedTenant({
    requestedTenantId,
  })

  if (!authResult.success) {
    return { success: false, error: authResult.error, status: authResult.status }
  }

  const tenantId = authResult.tenantId
  const db = await getDbClient()

  // 1. Fetch quotes
  const { data: quotes } = await db
    .from('billing_quotes')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  // 2. Fetch active subscription
  const { data: subscriptions } = await db
    .from('billing_subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['trial', 'active', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)

  const activeSubscription = subscriptions && subscriptions.length > 0 ? (subscriptions[0] as BillingSubscription) : null

  // 3. Fetch recent invoices
  const { data: invoices } = await db
    .from('billing_invoices')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('issued_at', { ascending: false })
    .limit(12)

  // 4. Fetch current month usage meter
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  let usageMeter: BillingUsageMeter | null = null
  if (activeSubscription?.deployment_id) {
    const { data: meter } = await db
      .from('billing_usage_meters')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('deployment_id', activeSubscription.deployment_id)
      .eq('billing_month', currentMonth)
      .maybeSingle()

    if (meter) {
      usageMeter = meter as BillingUsageMeter
    }
  }

  const overview: TenantBillingOverview = {
    quotes: (quotes as BillingQuote[]) || [],
    activeSubscription,
    invoices: (invoices as BillingInvoice[]) || [],
    usageMeter,
    deploymentId: activeSubscription?.deployment_id || null,
    nextBillingDate: activeSubscription?.next_billing_date || null,
    tenantName: authResult.tenant?.name || 'Your Workspace',
    isPlatformAdmin: authResult.isPlatformAdmin,
  }

  return { success: true, data: overview }
}

// ============================================================================
// 5. ADMIN QUOTE CONTEXT
// ============================================================================

/**
 * Retrieves available tenants and deployments for platform admins creating custom quotes.
 * RESTRICTED: Platform Super Admin / Operator only.
 */
export async function getAdminQuoteContext(
  user: AuthenticatedUser | null
): Promise<BillingActionResult<AdminQuoteContext>> {
  if (!user) {
    return { success: false, error: 'Authentication required.', status: 401 }
  }

  const hasAdmin = await isPlatformAdmin(user.id)
  if (!hasAdmin) {
    return {
      success: false,
      error: 'Forbidden: Only platform administrators can access quote context.',
      status: 403,
    }
  }

  const db = await getDbClient()

  // 1. Fetch active tenants
  const { data: tenants, error: tenantErr } = await db
    .from('tenants')
    .select('id, name, slug')
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (tenantErr) {
    return {
      success: false,
      error: `Failed to load tenants: ${tenantErr.message}`,
      status: 500,
    }
  }

  // 2. Fetch active deployments
  const { data: deployments, error: depErr } = await db
    .from('client_deployments')
    .select('id, client_id, assigned_employee_name, assigned_employee_slug, status')
    .in('status', ['active', 'paused', 'pending', 'provisioning'])
    .order('created_at', { ascending: false })

  if (depErr) {
    return {
      success: false,
      error: `Failed to load deployments: ${depErr.message}`,
      status: 500,
    }
  }

  return {
    success: true,
    data: {
      tenants: (tenants || []) as AdminQuoteTenantOption[],
      deployments: (deployments || []) as AdminQuoteDeploymentOption[],
    },
  }
}
