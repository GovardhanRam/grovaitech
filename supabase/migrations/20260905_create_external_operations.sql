-- Supabase Migration: 20260905_create_external_operations.sql
-- Description: Creates the external_operations table for durable external side-effect idempotency,
-- atomic claiming, and deduplication across Grovaitech external adapters (WhatsApp, Google Calendar, n8n).

-- 1. Create external_operations table
CREATE TABLE IF NOT EXISTS public.external_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL,
  client_id TEXT NOT NULL,
  deployment_id TEXT NOT NULL,
  business_operation_id TEXT NOT NULL,
  workflow_execution_id TEXT NOT NULL,
  workflow_step_id TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('claimed', 'processing', 'succeeded', 'failed', 'unknown')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  request_fingerprint TEXT NOT NULL,
  provider_operation_id TEXT,
  result_payload JSONB,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT uq_external_operations_key UNIQUE (idempotency_key)
);

-- Documentation comments
COMMENT ON TABLE public.external_operations IS 'Durable persistence for atomic external side-effect claims, status transitions, and deterministic replay.';
COMMENT ON COLUMN public.external_operations.idempotency_key IS 'Deterministic SHA256 idempotency key derived from stable businessOperationId + step + operation.';
COMMENT ON COLUMN public.external_operations.request_fingerprint IS 'SHA256 digest of canonicalized JSON request payload to detect payload mutation on duplicate key.';
COMMENT ON COLUMN public.external_operations.status IS 'Finite state machine: claimed (reserved), processing (dispatched), succeeded (terminal), failed (terminal), unknown (unverified outcome).';
COMMENT ON COLUMN public.external_operations.result_payload IS 'Sanitized provider outcome metadata for deterministic duplicate replay (zero secrets/tokens).';

-- 2. Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_external_ops_client_deployment ON public.external_operations (client_id, deployment_id);
CREATE INDEX IF NOT EXISTS idx_external_ops_business_op ON public.external_operations (business_operation_id);
CREATE INDEX IF NOT EXISTS idx_external_ops_status ON public.external_operations (status);
CREATE INDEX IF NOT EXISTS idx_external_ops_created_at ON public.external_operations (created_at DESC);

-- 3. Row Level Security (RLS) - Server-Only Boundary
-- This table is exclusively accessed by trusted server/service-role processes.
-- Direct access by anonymous or browser authenticated clients is strictly blocked.
ALTER TABLE public.external_operations ENABLE ROW LEVEL SECURITY;

-- Explicitly zero policies for anon and authenticated client roles.
-- Service-role client automatically bypasses RLS on the server.
