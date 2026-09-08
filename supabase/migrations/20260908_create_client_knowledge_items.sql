-- Supabase Migration: 20260908_create_client_knowledge_items.sql
-- Description: Creates the client_knowledge_items table for tenant-scoped, verified business knowledge,
-- supporting deterministic retrieval for WhatsApp AI Employees and eliminating hallucinated answers.

-- 1. Create client_knowledge_items table
CREATE TABLE IF NOT EXISTS public.client_knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  question_or_topic TEXT NOT NULL,
  verified_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documentation comments
COMMENT ON TABLE public.client_knowledge_items IS 'Tenant-scoped verified business facts, FAQs, policies, pricing, and operating hours for deterministic retrieval by AI employees.';
COMMENT ON COLUMN public.client_knowledge_items.client_id IS 'Tenant identifier (e.g. client-apex-101) ensuring strict multi-tenant isolation.';
COMMENT ON COLUMN public.client_knowledge_items.category IS 'Knowledge category (e.g., hours, pricing, policies, services, general).';
COMMENT ON COLUMN public.client_knowledge_items.question_or_topic IS 'Canonical question, topic, or heading representing this verified fact.';
COMMENT ON COLUMN public.client_knowledge_items.verified_content IS 'Actual verified business truth. Deployed AI Employees must strictly ground on this content.';

-- 2. Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_client_knowledge_items_client_id ON public.client_knowledge_items (client_id);
CREATE INDEX IF NOT EXISTS idx_client_knowledge_items_category ON public.client_knowledge_items (client_id, category);
CREATE INDEX IF NOT EXISTS idx_client_knowledge_items_created_at ON public.client_knowledge_items (created_at DESC);

-- 3. Row Level Security (RLS) - Server-Only Access Boundary
-- Exclusively accessible by trusted server/service-role processes.
-- Zero client-facing policies created for anon or untrusted roles.
ALTER TABLE public.client_knowledge_items ENABLE ROW LEVEL SECURITY;
