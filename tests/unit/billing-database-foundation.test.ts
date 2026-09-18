import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('Commercial Billing Foundation — Stage 1 Migration & Schema Invariants', () => {
  const migrationPath = path.resolve(
    process.cwd(),
    'supabase/migrations/20260921_create_billing_foundation.sql'
  )

  it('verifies the migration file exists and is accessible', () => {
    expect(fs.existsSync(migrationPath)).toBe(true)
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    expect(sql.length).toBeGreaterThan(500)
  })

  it('enforces transactional migration structure (BEGIN / COMMIT)', () => {
    const sql = fs.readFileSync(migrationPath, 'utf-8')
    expect(sql).toMatch(/^BEGIN;/m)
    expect(sql).toMatch(/COMMIT;\s*$/m)
  })

  describe('1. billing_quotes table specifications', () => {
    it('defines public.billing_quotes with all required columns and constraints', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.billing_quotes')
      expect(sql).toContain('tenant_id TEXT NOT NULL REFERENCES public.tenants(id)')
      expect(sql).toContain('deployment_id TEXT REFERENCES public.client_deployments(id)')
      expect(sql).toContain('setup_fee_inr INTEGER NOT NULL DEFAULT 0')
      expect(sql).toContain('monthly_fee_inr INTEGER NOT NULL DEFAULT 0')
      expect(sql).toContain('included_conversations INTEGER NOT NULL DEFAULT 1000')
      expect(sql).toContain('overage_rate_per_conv_inr NUMERIC(8, 2)')
      expect(sql).toContain(
        "status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'superseded'))"
      )
      expect(sql).toContain('valid_until TIMESTAMPTZ')
      expect(sql).toContain('custom_terms TEXT')
      expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT now()')
      expect(sql).toContain('accepted_at TIMESTAMPTZ')
    })

    it('enables RLS and defines tenant read + platform admin write policies for billing_quotes', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('ALTER TABLE public.billing_quotes ENABLE ROW LEVEL SECURITY;')
      expect(sql).toContain('CREATE POLICY "billing_quotes_select_tenant_or_admin"')
      expect(sql).toContain('public.is_tenant_member(tenant_id)')
      expect(sql).toContain('CREATE POLICY "billing_quotes_insert_platform_admin_only"')
      expect(sql).toContain('CREATE POLICY "billing_quotes_update_platform_admin_only"')
      expect(sql).toContain('CREATE POLICY "billing_quotes_delete_platform_admin_only"')
    })
  })

  describe('2. billing_subscriptions table specifications', () => {
    it('defines public.billing_subscriptions with all required columns and constraints', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.billing_subscriptions')
      expect(sql).toContain('tenant_id TEXT NOT NULL REFERENCES public.tenants(id)')
      expect(sql).toContain('deployment_id TEXT NOT NULL REFERENCES public.client_deployments(id)')
      expect(sql).toContain('quote_id UUID REFERENCES public.billing_quotes(id)')
      expect(sql).toContain(
        "status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled'))"
      )
      expect(sql).toContain('billing_period_start TIMESTAMPTZ NOT NULL DEFAULT now()')
      expect(sql).toContain('billing_period_end TIMESTAMPTZ NOT NULL')
      expect(sql).toContain('monthly_fee_inr INTEGER NOT NULL')
      expect(sql).toContain('next_billing_date TIMESTAMPTZ NOT NULL')
      expect(sql).toContain('client_gstin TEXT')
      expect(sql).toContain('created_at TIMESTAMPTZ NOT NULL DEFAULT now()')
      expect(sql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT now()')
    })

    it('enforces single active commercial subscription per deployment via partial unique index', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_subscriptions_active_deployment')
      expect(sql).toContain('ON public.billing_subscriptions (deployment_id)')
      expect(sql).toContain("WHERE status IN ('trial', 'active', 'past_due')")
    })

    it('enables RLS and defines tenant read + platform admin write policies for billing_subscriptions', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;')
      expect(sql).toContain('CREATE POLICY "billing_subscriptions_select_tenant_or_admin"')
      expect(sql).toContain('CREATE POLICY "billing_subscriptions_insert_platform_admin_only"')
      expect(sql).toContain('CREATE POLICY "billing_subscriptions_update_platform_admin_only"')
      expect(sql).toContain('CREATE POLICY "billing_subscriptions_delete_platform_admin_only"')
    })
  })

  describe('3. billing_invoices table specifications', () => {
    it('defines public.billing_invoices with all required columns and constraints', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.billing_invoices')
      expect(sql).toContain('tenant_id TEXT NOT NULL REFERENCES public.tenants(id)')
      expect(sql).toContain('subscription_id UUID REFERENCES public.billing_subscriptions(id)')
      expect(sql).toContain('invoice_number TEXT NOT NULL UNIQUE')
      expect(sql).toContain(
        "type TEXT NOT NULL CHECK (type IN ('setup', 'monthly_subscription', 'usage_overage'))"
      )
      expect(sql).toContain('amount_inr INTEGER NOT NULL')
      expect(sql).toContain('tax_inr INTEGER NOT NULL DEFAULT 0')
      expect(sql).toContain('total_inr INTEGER NOT NULL')
      expect(sql).toContain(
        "status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void', 'failed'))"
      )
      expect(sql).toContain('gateway_order_id TEXT')
      expect(sql).toContain('gateway_payment_id TEXT')
      expect(sql).toContain('payment_method TEXT')
      expect(sql).toContain('payment_url TEXT')
      expect(sql).toContain('paid_at TIMESTAMPTZ')
      expect(sql).toContain('issued_at TIMESTAMPTZ NOT NULL DEFAULT now()')
      expect(sql).toContain('due_date TIMESTAMPTZ NOT NULL')
      expect(sql).toContain('CONSTRAINT chk_invoice_total CHECK (total_inr = amount_inr + tax_inr)')
    })

    it('enables RLS and defines tenant read + platform admin write policies for billing_invoices', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;')
      expect(sql).toContain('CREATE POLICY "billing_invoices_select_tenant_or_admin"')
      expect(sql).toContain('CREATE POLICY "billing_invoices_insert_platform_admin_only"')
      expect(sql).toContain('CREATE POLICY "billing_invoices_update_platform_admin_only"')
      expect(sql).toContain('CREATE POLICY "billing_invoices_delete_platform_admin_only"')
    })
  })

  describe('4. billing_usage_meters table specifications', () => {
    it('defines public.billing_usage_meters with all required columns and constraints', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.billing_usage_meters')
      expect(sql).toContain('tenant_id TEXT NOT NULL REFERENCES public.tenants(id)')
      expect(sql).toContain('deployment_id TEXT NOT NULL REFERENCES public.client_deployments(id)')
      expect(sql).toContain("billing_month TEXT NOT NULL CHECK (billing_month ~ '^\\d{4}-(0[1-9]|1[0-2])$')")
      expect(sql).toContain('conversations_count INTEGER NOT NULL DEFAULT 0')
      expect(sql).toContain('leads_captured INTEGER NOT NULL DEFAULT 0')
      expect(sql).toContain('external_ops_count INTEGER NOT NULL DEFAULT 0')
      expect(sql).toContain('gemini_tokens_total BIGINT NOT NULL DEFAULT 0')
      expect(sql).toContain('updated_at TIMESTAMPTZ NOT NULL DEFAULT now()')
      expect(sql).toContain(
        'CONSTRAINT uq_billing_usage_meters_tenant_deployment_month UNIQUE (tenant_id, deployment_id, billing_month)'
      )
    })

    it('enables RLS and defines tenant read + platform admin write policies for billing_usage_meters', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('ALTER TABLE public.billing_usage_meters ENABLE ROW LEVEL SECURITY;')
      expect(sql).toContain('CREATE POLICY "billing_usage_meters_select_tenant_or_admin"')
      expect(sql).toContain('CREATE POLICY "billing_usage_meters_insert_platform_admin_only"')
      expect(sql).toContain('CREATE POLICY "billing_usage_meters_update_platform_admin_only"')
      expect(sql).toContain('CREATE POLICY "billing_usage_meters_delete_platform_admin_only"')
    })
  })

  describe('5. Security & Isolation Verification', () => {
    it('does not contain any permissive allow-all policies', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).not.toMatch(/USING\s*\(\s*true\s*\)/i)
      expect(sql).not.toMatch(/WITH\s*CHECK\s*\(\s*true\s*\)/i)
      expect(sql).not.toMatch(/allow_all/i)
    })

    it('reuses existing security-definer helper functions is_tenant_member and is_platform_admin', () => {
      const sql = fs.readFileSync(migrationPath, 'utf-8')
      expect(sql).toContain('public.is_tenant_member(tenant_id)')
      expect(sql).toContain('public.is_platform_admin()')
    })
  })
})
