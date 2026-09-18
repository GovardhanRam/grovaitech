-- Supabase Migration: 20260921_create_billing_foundation.sql
-- Description: Establishes the commercial billing foundation for Grovaitech AI Workforce OS.
--
-- Tables:
--   1. public.billing_quotes: Custom enterprise/client proposals with setup & subscription fees.
--   2. public.billing_subscriptions: Active deployment subscription contracts with single-active invariant.
--   3. public.billing_invoices: Immutable payment orders & invoices (setup, monthly, usage overage).
--   4. public.billing_usage_meters: Per-month usage metrics tracking (conversations, leads, external ops, tokens).
--
-- Security Posture:
--   - Row Level Security (RLS) enabled on all four tables.
--   - Authenticated tenant members can SELECT (read) only billing records for their authorized tenant.
--   - Write operations (INSERT, UPDATE, DELETE) via client API restricted to platform administrators
--     using public.is_platform_admin().
--   - Privileged server-side actions/webhooks execute via trusted service-role key.

BEGIN;

-- ============================================================================
-- 1. TABLE: public.billing_quotes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  deployment_id TEXT REFERENCES public.client_deployments(id) ON DELETE SET NULL,
  setup_fee_inr INTEGER NOT NULL DEFAULT 0 CHECK (setup_fee_inr >= 0),
  monthly_fee_inr INTEGER NOT NULL DEFAULT 0 CHECK (monthly_fee_inr >= 0),
  included_conversations INTEGER NOT NULL DEFAULT 1000 CHECK (included_conversations >= 0),
  overage_rate_per_conv_inr NUMERIC(8, 2) NOT NULL DEFAULT 0.00 CHECK (overage_rate_per_conv_inr >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'superseded')),
  valid_until TIMESTAMPTZ,
  custom_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

COMMENT ON TABLE public.billing_quotes IS 'Commercial proposals and custom pricing quotes issued to client tenants.';
COMMENT ON COLUMN public.billing_quotes.tenant_id IS 'Client workspace tenant identifier referencing public.tenants(id).';
COMMENT ON COLUMN public.billing_quotes.deployment_id IS 'Target AI employee deployment identifier (nullable if multi-agent or unassigned).';
COMMENT ON COLUMN public.billing_quotes.setup_fee_inr IS 'One-time onboarding and workflow integration fee in INR.';
COMMENT ON COLUMN public.billing_quotes.monthly_fee_inr IS 'Monthly recurring AI Employee retainer/subscription fee in INR.';
COMMENT ON COLUMN public.billing_quotes.included_conversations IS 'Monthly quota of guest/customer conversations included without overage charge.';
COMMENT ON COLUMN public.billing_quotes.overage_rate_per_conv_inr IS 'Rate in INR charged per conversation exceeding the included quota.';
COMMENT ON COLUMN public.billing_quotes.status IS 'Lifecycle state of proposal: draft, sent, accepted, or superseded.';

CREATE INDEX IF NOT EXISTS idx_billing_quotes_tenant_id ON public.billing_quotes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_quotes_deployment_id ON public.billing_quotes (deployment_id);
CREATE INDEX IF NOT EXISTS idx_billing_quotes_status ON public.billing_quotes (status);
CREATE INDEX IF NOT EXISTS idx_billing_quotes_created_at ON public.billing_quotes (created_at DESC);

ALTER TABLE public.billing_quotes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. TABLE: public.billing_subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  deployment_id TEXT NOT NULL REFERENCES public.client_deployments(id) ON DELETE RESTRICT,
  quote_id UUID REFERENCES public.billing_quotes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled')),
  billing_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  billing_period_end TIMESTAMPTZ NOT NULL,
  monthly_fee_inr INTEGER NOT NULL CHECK (monthly_fee_inr >= 0),
  next_billing_date TIMESTAMPTZ NOT NULL,
  client_gstin TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_billing_period CHECK (billing_period_end >= billing_period_start)
);

COMMENT ON TABLE public.billing_subscriptions IS 'Authoritative recurring commercial subscription contracts bound to client deployments.';
COMMENT ON COLUMN public.billing_subscriptions.tenant_id IS 'Client workspace tenant identifier referencing public.tenants(id).';
COMMENT ON COLUMN public.billing_subscriptions.deployment_id IS 'Bound AI Employee deployment identifier referencing public.client_deployments(id).';
COMMENT ON COLUMN public.billing_subscriptions.quote_id IS 'Accepted commercial quote on which this subscription is based.';
COMMENT ON COLUMN public.billing_subscriptions.status IS 'Subscription lifecycle status: trial, active, past_due, or canceled.';
COMMENT ON COLUMN public.billing_subscriptions.monthly_fee_inr IS 'Active monthly recurring fee in INR.';
COMMENT ON COLUMN public.billing_subscriptions.client_gstin IS 'Optional Indian GST Identification Number for B2B tax compliance.';

-- Enforce single active commercial subscription per deployment (trial, active, past_due)
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_subscriptions_active_deployment
  ON public.billing_subscriptions (deployment_id)
  WHERE status IN ('trial', 'active', 'past_due');

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_tenant_id ON public.billing_subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_deployment_id ON public.billing_subscriptions (deployment_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_quote_id ON public.billing_subscriptions (quote_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_status ON public.billing_subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_next_billing_date ON public.billing_subscriptions (next_billing_date);

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. TABLE: public.billing_invoices
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  subscription_id UUID REFERENCES public.billing_subscriptions(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('setup', 'monthly_subscription', 'usage_overage')),
  amount_inr INTEGER NOT NULL CHECK (amount_inr >= 0),
  tax_inr INTEGER NOT NULL DEFAULT 0 CHECK (tax_inr >= 0),
  total_inr INTEGER NOT NULL CHECK (total_inr >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'void', 'failed')),
  gateway_order_id TEXT,
  gateway_payment_id TEXT,
  payment_method TEXT,
  payment_url TEXT,
  paid_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date TIMESTAMPTZ NOT NULL,
  CONSTRAINT chk_invoice_total CHECK (total_inr = amount_inr + tax_inr)
);

COMMENT ON TABLE public.billing_invoices IS 'Immutable financial invoices and payment orders for setup fees, subscriptions, and overages.';
COMMENT ON COLUMN public.billing_invoices.tenant_id IS 'Client workspace tenant identifier referencing public.tenants(id).';
COMMENT ON COLUMN public.billing_invoices.subscription_id IS 'Associated recurring subscription (nullable for standalone setup fees).';
COMMENT ON COLUMN public.billing_invoices.invoice_number IS 'Human-readable unique invoice code (e.g. GAI-2026-0001).';
COMMENT ON COLUMN public.billing_invoices.type IS 'Invoice classification: setup, monthly_subscription, or usage_overage.';
COMMENT ON COLUMN public.billing_invoices.amount_inr IS 'Base taxable amount in INR.';
COMMENT ON COLUMN public.billing_invoices.tax_inr IS 'GST / tax amount in INR.';
COMMENT ON COLUMN public.billing_invoices.total_inr IS 'Total payable amount in INR (base + tax).';
COMMENT ON COLUMN public.billing_invoices.gateway_order_id IS 'Upstream payment gateway order or payment link identifier.';
COMMENT ON COLUMN public.billing_invoices.gateway_payment_id IS 'Upstream payment transaction identifier upon confirmation.';

CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant_id ON public.billing_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription_id ON public.billing_invoices (subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices (status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_due_date ON public.billing_invoices (due_date);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_gateway_order_id ON public.billing_invoices (gateway_order_id) WHERE gateway_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_billing_invoices_gateway_payment_id ON public.billing_invoices (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;

ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. TABLE: public.billing_usage_meters
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.billing_usage_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  deployment_id TEXT NOT NULL REFERENCES public.client_deployments(id) ON DELETE RESTRICT,
  billing_month TEXT NOT NULL CHECK (billing_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  conversations_count INTEGER NOT NULL DEFAULT 0 CHECK (conversations_count >= 0),
  leads_captured INTEGER NOT NULL DEFAULT 0 CHECK (leads_captured >= 0),
  external_ops_count INTEGER NOT NULL DEFAULT 0 CHECK (external_ops_count >= 0),
  gemini_tokens_total BIGINT NOT NULL DEFAULT 0 CHECK (gemini_tokens_total >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_billing_usage_meters_tenant_deployment_month UNIQUE (tenant_id, deployment_id, billing_month)
);

COMMENT ON TABLE public.billing_usage_meters IS 'Aggregated monthly consumption meters for conversations, leads, operations, and LLM tokens.';
COMMENT ON COLUMN public.billing_usage_meters.tenant_id IS 'Client workspace tenant identifier referencing public.tenants(id).';
COMMENT ON COLUMN public.billing_usage_meters.deployment_id IS 'Target AI Employee deployment identifier referencing public.client_deployments(id).';
COMMENT ON COLUMN public.billing_usage_meters.billing_month IS 'Billing cycle month in YYYY-MM format (e.g. 2026-09).';
COMMENT ON COLUMN public.billing_usage_meters.conversations_count IS 'Total customer/guest chat sessions handled in the billing month.';
COMMENT ON COLUMN public.billing_usage_meters.leads_captured IS 'Total qualified leads captured and attributed in the billing month.';
COMMENT ON COLUMN public.billing_usage_meters.external_ops_count IS 'Total external API side-effects executed in the billing month.';
COMMENT ON COLUMN public.billing_usage_meters.gemini_tokens_total IS 'Cumulative Gemini LLM tokens consumed in the billing month.';

CREATE INDEX IF NOT EXISTS idx_billing_usage_meters_tenant_month ON public.billing_usage_meters (tenant_id, billing_month);
CREATE INDEX IF NOT EXISTS idx_billing_usage_meters_deployment_month ON public.billing_usage_meters (deployment_id, billing_month);

ALTER TABLE public.billing_usage_meters ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5A. Policies for public.billing_quotes
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "billing_quotes_select_tenant_or_admin" ON public.billing_quotes;
CREATE POLICY "billing_quotes_select_tenant_or_admin"
  ON public.billing_quotes
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_quotes_insert_platform_admin_only" ON public.billing_quotes;
CREATE POLICY "billing_quotes_insert_platform_admin_only"
  ON public.billing_quotes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_quotes_update_platform_admin_only" ON public.billing_quotes;
CREATE POLICY "billing_quotes_update_platform_admin_only"
  ON public.billing_quotes
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_quotes_delete_platform_admin_only" ON public.billing_quotes;
CREATE POLICY "billing_quotes_delete_platform_admin_only"
  ON public.billing_quotes
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin()
  );

-- ----------------------------------------------------------------------------
-- 5B. Policies for public.billing_subscriptions
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "billing_subscriptions_select_tenant_or_admin" ON public.billing_subscriptions;
CREATE POLICY "billing_subscriptions_select_tenant_or_admin"
  ON public.billing_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_subscriptions_insert_platform_admin_only" ON public.billing_subscriptions;
CREATE POLICY "billing_subscriptions_insert_platform_admin_only"
  ON public.billing_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_subscriptions_update_platform_admin_only" ON public.billing_subscriptions;
CREATE POLICY "billing_subscriptions_update_platform_admin_only"
  ON public.billing_subscriptions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_subscriptions_delete_platform_admin_only" ON public.billing_subscriptions;
CREATE POLICY "billing_subscriptions_delete_platform_admin_only"
  ON public.billing_subscriptions
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin()
  );

-- ----------------------------------------------------------------------------
-- 5C. Policies for public.billing_invoices
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "billing_invoices_select_tenant_or_admin" ON public.billing_invoices;
CREATE POLICY "billing_invoices_select_tenant_or_admin"
  ON public.billing_invoices
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_invoices_insert_platform_admin_only" ON public.billing_invoices;
CREATE POLICY "billing_invoices_insert_platform_admin_only"
  ON public.billing_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_invoices_update_platform_admin_only" ON public.billing_invoices;
CREATE POLICY "billing_invoices_update_platform_admin_only"
  ON public.billing_invoices
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_invoices_delete_platform_admin_only" ON public.billing_invoices;
CREATE POLICY "billing_invoices_delete_platform_admin_only"
  ON public.billing_invoices
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin()
  );

-- ----------------------------------------------------------------------------
-- 5D. Policies for public.billing_usage_meters
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "billing_usage_meters_select_tenant_or_admin" ON public.billing_usage_meters;
CREATE POLICY "billing_usage_meters_select_tenant_or_admin"
  ON public.billing_usage_meters
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_usage_meters_insert_platform_admin_only" ON public.billing_usage_meters;
CREATE POLICY "billing_usage_meters_insert_platform_admin_only"
  ON public.billing_usage_meters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_usage_meters_update_platform_admin_only" ON public.billing_usage_meters;
CREATE POLICY "billing_usage_meters_update_platform_admin_only"
  ON public.billing_usage_meters
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
  )
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "billing_usage_meters_delete_platform_admin_only" ON public.billing_usage_meters;
CREATE POLICY "billing_usage_meters_delete_platform_admin_only"
  ON public.billing_usage_meters
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin()
  );

COMMIT;
