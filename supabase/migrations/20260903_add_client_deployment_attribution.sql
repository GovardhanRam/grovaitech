-- Supabase Migration: 20260903_add_client_deployment_attribution.sql
-- Description: Adds nullable client_id and deployment_id columns to real_estate_leads table and provisions the client_deployments table for Grovaitech AI Workforce OS.

-- 1. Safely add nullable attribution columns to real_estate_leads (if not exists)
ALTER TABLE IF EXISTS public.real_estate_leads
  ADD COLUMN IF NOT EXISTS client_id TEXT,
  ADD COLUMN IF NOT EXISTS deployment_id TEXT;

-- Create indexes for efficient tenant query filtering
CREATE INDEX IF NOT EXISTS idx_real_estate_leads_client_id ON public.real_estate_leads (client_id);
CREATE INDEX IF NOT EXISTS idx_real_estate_leads_deployment_id ON public.real_estate_leads (deployment_id);

-- 2. Create client_deployments table if not exists (durable deployment state)
CREATE TABLE IF NOT EXISTS public.client_deployments (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  assigned_employee_id TEXT NOT NULL,
  assigned_employee_name TEXT NOT NULL,
  assigned_employee_slug TEXT NOT NULL,
  assigned_workflow_id TEXT NOT NULL,
  assigned_workflow_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  runtime_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for documentation
COMMENT ON TABLE public.client_deployments IS 'Canonical persistent deployment records for activated AI Employees bound to client accounts.';
COMMENT ON COLUMN public.client_deployments.runtime_config IS 'Sanitized client-scoped runtime instructions and operational context (zero credentials/secrets).';

-- Indexes on client_deployments
CREATE INDEX IF NOT EXISTS idx_client_deployments_client_id ON public.client_deployments (client_id);
CREATE INDEX IF NOT EXISTS idx_client_deployments_status ON public.client_deployments (status);

-- 3. Row Level Security (Least-Privilege)
ALTER TABLE public.client_deployments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated operators/users to view deployment state
CREATE POLICY "Allow authenticated read on client_deployments"
  ON public.client_deployments
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated operators to insert/provision deployments
CREATE POLICY "Allow authenticated insert on client_deployments"
  ON public.client_deployments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated operators to update deployment state
CREATE POLICY "Allow authenticated update on client_deployments"
  ON public.client_deployments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Public / Anonymous direct access is strictly blocked.
-- Server-side live runtime functions query via trusted server/service role.
