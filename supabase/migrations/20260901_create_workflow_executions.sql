-- Supabase Migration: 20260901_create_workflow_executions.sql
-- Description: Creates the workflow_executions table and least-privilege security policies for Grovaitech AI Workforce OS.

-- 1. Create workflow_executions table
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running', 'partial')),
  overall_status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER NOT NULL DEFAULT 0,
  lead_id TEXT,
  lead_name TEXT,
  payload_summary TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  n8n_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comments for documentation
COMMENT ON TABLE public.workflow_executions IS 'Stores persistent execution logs and step audits for Grovaitech AI workflows (e.g., wf-001).';
COMMENT ON COLUMN public.workflow_executions.steps IS 'JSONB array of WorkflowStepResult items containing stepId, stepName, status, target, durationMs, and payload.';
COMMENT ON COLUMN public.workflow_executions.n8n_result IS 'JSONB object containing n8n webhook status, endpoint, statusCode, and response payload.';

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions (workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_at ON public.workflow_executions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_lead_id ON public.workflow_executions (lead_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON public.workflow_executions (status);

-- 3. Row Level Security (RLS) - Least-Privilege
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view workflow execution history
CREATE POLICY "Allow authenticated read on workflow_executions"
  ON public.workflow_executions
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous read access for public demo workspace view
CREATE POLICY "Allow anon read on workflow_executions"
  ON public.workflow_executions
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated server client to insert execution logs
CREATE POLICY "Allow authenticated server insert on workflow_executions"
  ON public.workflow_executions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Direct client UPDATE/DELETE is strictly forbidden to ensure audit log immutability.
