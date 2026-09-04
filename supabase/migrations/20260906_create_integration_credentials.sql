-- Supabase Migration: 20260906_create_integration_credentials.sql
-- Description: Creates the integration_credentials table for tenant-scoped, encrypted credential storage,
-- lifecycle tracking, and provider certification for Grovaitech Client Deployments.

-- 1. Create integration_credentials table
CREATE TABLE IF NOT EXISTS public.integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  encrypted_secret TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('active', 'revoked', 'expired', 'suspended')),
  certification_status TEXT NOT NULL CHECK (certification_status IN ('NOT_CONFIGURED', 'CONFIGURED', 'CERTIFIED', 'REVOKED', 'ERROR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  CONSTRAINT uq_integration_credentials_tenant_provider UNIQUE (client_id, deployment_id, provider)
);

-- Documentation comments
COMMENT ON TABLE public.integration_credentials IS 'Tenant-scoped encrypted credentials and certification states for external integrations (Meta, Google Calendar, n8n).';
COMMENT ON COLUMN public.integration_credentials.encrypted_secret IS 'AES-256-GCM encrypted envelope containing raw credentials. Never logged or exposed.';
COMMENT ON COLUMN public.integration_credentials.metadata IS 'Non-secret public identifiers such as phone_number_id, waba_id, calendar_id.';
COMMENT ON COLUMN public.integration_credentials.certification_status IS 'Certification gate: only CERTIFIED allows live adapter execution.';

-- 2. Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_int_cred_lookup ON public.integration_credentials (client_id, deployment_id, provider);
CREATE INDEX IF NOT EXISTS idx_int_cred_status ON public.integration_credentials (status, certification_status);

-- 3. Row Level Security (RLS) - Server-Only Access
-- Exclusively accessible by trusted server/service-role processes.
-- Zero client-facing policies created for anon or authenticated roles.
ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;
