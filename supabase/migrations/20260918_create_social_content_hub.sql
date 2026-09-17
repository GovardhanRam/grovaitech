-- Supabase Migration: 20260918_create_social_content_hub.sql
-- Description: Creates the social_content_packages and social_posts tables for Grovaitech AI Workforce OS Content Hub.

-- 1. Create social_content_packages table
CREATE TABLE IF NOT EXISTS public.social_content_packages (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  deployment_id TEXT,
  workflow_execution_id TEXT,
  employee_slug TEXT NOT NULL DEFAULT 'social-media-marketing',
  status TEXT NOT NULL CHECK (status IN ('pending_approval', 'approved', 'rejected', 'partially_approved', 'scheduled', 'published')),
  research_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_ideas JSONB NOT NULL DEFAULT '{}'::jsonb,
  qa_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  average_qa_score NUMERIC NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for documentation
COMMENT ON TABLE public.social_content_packages IS 'Stores generated multi-platform content packages from Social Media Marketing AI Employee recipe runs.';
COMMENT ON COLUMN public.social_content_packages.status IS 'Lifecycle state: pending_approval, approved, rejected, partially_approved, scheduled, published.';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_social_packages_client_id ON public.social_content_packages (client_id);
CREATE INDEX IF NOT EXISTS idx_social_packages_status ON public.social_content_packages (status);
CREATE INDEX IF NOT EXISTS idx_social_packages_created_at ON public.social_content_packages (created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE public.social_content_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on social_content_packages"
  ON public.social_content_packages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon read on social_content_packages"
  ON public.social_content_packages
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated server insert on social_content_packages"
  ON public.social_content_packages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated server update on social_content_packages"
  ON public.social_content_packages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Create social_posts table
CREATE TABLE IF NOT EXISTS public.social_posts (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES public.social_content_packages(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  deployment_id TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'x', 'instagram', 'facebook', 'youtube')),
  original_content TEXT NOT NULL,
  edited_content TEXT,
  character_count INTEGER NOT NULL DEFAULT 0,
  hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
  call_to_action TEXT,
  suggested_visual_brief TEXT,
  hook TEXT,
  format TEXT,
  qa_score INTEGER NOT NULL DEFAULT 0,
  qa_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  qa_violations JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending_approval', 'approved', 'rejected', 'scheduled', 'published')),
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  published_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for documentation
COMMENT ON TABLE public.social_posts IS 'Stores individual platform-tailored social media draft posts, edited versions, QA scores, and human approval states.';

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_social_posts_package_id ON public.social_posts (package_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_client_id ON public.social_posts (client_id);
CREATE INDEX IF NOT EXISTS idx_social_posts_platform ON public.social_posts (platform);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts (status);
CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON public.social_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled_at ON public.social_posts (scheduled_at);

-- Row Level Security (RLS)
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read on social_posts"
  ON public.social_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow anon read on social_posts"
  ON public.social_posts
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow authenticated server insert on social_posts"
  ON public.social_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated server update on social_posts"
  ON public.social_posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
