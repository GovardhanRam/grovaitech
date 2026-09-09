-- Supabase Migration: 20260909_create_ai_employees.sql
-- Description: Creates the public.ai_employees table for AI Employee Marketplace + AI Workforce Platform
-- with safe public read access and server-only administrative write access.

-- 1. Create public.ai_employees table
CREATE TABLE IF NOT EXISTS public.ai_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  department TEXT,
  industry TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('live', 'beta', 'demo', 'in_development', 'planned')),
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  integrations JSONB NOT NULL DEFAULT '[]'::jsonb,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  avatar_url TEXT,
  version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documentation comments
COMMENT ON TABLE public.ai_employees IS 'Marketplace and catalog records for AI Employees in Grovaitech AI Workforce OS.';
COMMENT ON COLUMN public.ai_employees.slug IS 'Unique URL-friendly slug used for public profile routing (e.g. clinic-receptionist).';
COMMENT ON COLUMN public.ai_employees.status IS 'Lifecycle state: live, beta, demo, in_development, or planned.';
COMMENT ON COLUMN public.ai_employees.capabilities IS 'JSONB array of public capability tags.';
COMMENT ON COLUMN public.ai_employees.responsibilities IS 'JSONB array of job responsibilities.';
COMMENT ON COLUMN public.ai_employees.integrations IS 'JSONB array of verified integrated systems.';
COMMENT ON COLUMN public.ai_employees.channels IS 'JSONB array of operational communication channels.';

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_ai_employees_slug ON public.ai_employees (slug);
CREATE INDEX IF NOT EXISTS idx_ai_employees_status ON public.ai_employees (status);
CREATE INDEX IF NOT EXISTS idx_ai_employees_created_at ON public.ai_employees (created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.ai_employees ENABLE ROW LEVEL SECURITY;

-- Allow public read access (anon and authenticated) for marketplace discovery
CREATE POLICY "Allow public read on ai_employees"
  ON public.ai_employees
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow server service-role administrative write access
CREATE POLICY "Allow service_role write on ai_employees"
  ON public.ai_employees
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Seed Employee #1: Clinic Receptionist
INSERT INTO public.ai_employees (
  name,
  slug,
  title,
  department,
  industry,
  description,
  status,
  capabilities,
  responsibilities,
  integrations,
  channels,
  avatar_url,
  version
) VALUES (
  'Clinic Receptionist',
  'clinic-receptionist',
  'AI Front Desk Employee',
  'Customer Support / Operations',
  'Healthcare',
  'Handles patient appointment requests, answers clinic FAQs, and manages booking confirmations. Integrates with Google Calendar, Supabase clinic bookings, and supports patient follow-ups.',
  'live',
  '[
    Patient enquiries,
    Appointment assistance,
    FAQ handling,
    Booking support,
    Follow-up assistance,
    Human escalation
  ]'::jsonb,
  '[
    Answer common patient questions,
    Help patients understand available services,
    Assist with appointment requests,
    Collect relevant booking information,
    Support appointment workflows,
    Escalate situations requiring human attention
  ]'::jsonb,
  '[
    Google Gemini,
    Supabase,
    Calendar/booking workflow
  ]'::jsonb,
  '[
    Chat
  ]'::jsonb,
  NULL,
  '1.0'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  department = EXCLUDED.department,
  industry = EXCLUDED.industry,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  capabilities = EXCLUDED.capabilities,
  responsibilities = EXCLUDED.responsibilities,
  integrations = EXCLUDED.integrations,
  channels = EXCLUDED.channels,
  version = EXCLUDED.version,
  updated_at = now();
