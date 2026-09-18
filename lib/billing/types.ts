/**
 * Grovaitech AI Workforce OS
 * lib/billing/types.ts
 *
 * Core TypeScript definitions for commercial billing, quotes, subscriptions,
 * invoices, usage meters, and tenant billing overviews.
 */

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'superseded'

export interface BillingQuote {
  id: string
  tenant_id: string
  deployment_id: string | null
  setup_fee_inr: number
  monthly_fee_inr: number
  included_conversations: number
  overage_rate_per_conv_inr: number
  status: QuoteStatus
  valid_until: string | null
  custom_terms: string | null
  created_at: string
  accepted_at: string | null
}

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled'

export interface BillingSubscription {
  id: string
  tenant_id: string
  deployment_id: string
  quote_id: string | null
  status: SubscriptionStatus
  billing_period_start: string
  billing_period_end: string
  monthly_fee_inr: number
  next_billing_date: string
  client_gstin: string | null
  created_at: string
  updated_at: string
}

export type InvoiceType = 'setup' | 'monthly_subscription' | 'usage_overage'
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void' | 'failed'

export interface BillingInvoice {
  id: string
  tenant_id: string
  subscription_id: string | null
  invoice_number: string
  type: InvoiceType
  amount_inr: number
  tax_inr: number
  total_inr: number
  status: InvoiceStatus
  gateway_order_id: string | null
  gateway_payment_id: string | null
  payment_method: string | null
  payment_url: string | null
  paid_at: string | null
  issued_at: string
  due_date: string
}

export interface BillingUsageMeter {
  id: string
  tenant_id: string
  deployment_id: string
  billing_month: string // YYYY-MM
  conversations_count: number
  leads_captured: number
  external_ops_count: number
  gemini_tokens_total: number
  updated_at: string
}

export interface CreateCustomQuoteInput {
  tenant_id: string
  deployment_id?: string | null
  setup_fee_inr: number
  monthly_fee_inr: number
  included_conversations?: number
  overage_rate_per_conv_inr?: number
  valid_until?: string | null
  custom_terms?: string | null
  status?: 'draft' | 'sent'
}

export interface AcceptQuoteInput {
  quote_id: string
  tenant_id?: string
}

export interface CreateSubscriptionInput {
  quote_id: string
  tenant_id?: string
  client_gstin?: string | null
}

export interface CreateInvoiceInput {
  subscription_id: string
  type: InvoiceType
  tax_rate_percent?: number // defaults to 18 (GST)
  due_days?: number // defaults to 7 days
}

export interface TenantBillingOverview {
  quotes: BillingQuote[]
  activeSubscription: BillingSubscription | null
  invoices: BillingInvoice[]
  usageMeter: BillingUsageMeter | null
  deploymentId: string | null
  nextBillingDate: string | null
  tenantName?: string
  isPlatformAdmin?: boolean
}

export interface AdminQuoteTenantOption {
  id: string
  name: string
  slug: string
}

export interface AdminQuoteDeploymentOption {
  id: string
  client_id: string
  assigned_employee_name: string
  assigned_employee_slug: string
  status: string
}

export interface AdminQuoteContext {
  tenants: AdminQuoteTenantOption[]
  deployments: AdminQuoteDeploymentOption[]
}

export interface BillingActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  status?: number
}
