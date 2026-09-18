-- Supabase Migration: 20260919_create_tenant_foundation.sql
-- Description: Establishes the canonical multi-tenant foundation, user-to-tenant memberships,
-- and tenant invitation tracking for Grovaitech AI Workforce OS.
--
-- Security posture: Row Level Security (RLS) is enabled on all three tables with default-deny
-- (zero permissive policies; exclusively accessible via server/service-role).
-- Tenant-scoped policies and triggers will be introduced in subsequent phases.

-- 1. Create public.tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'customer' CHECK (type IN ('customer', 'internal')),
  industry TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documentation comments
COMMENT ON TABLE public.tenants IS 'Canonical tenant/client workspace entity for Grovaitech AI Workforce OS.';
COMMENT ON COLUMN public.tenants.id IS 'Canonical tenant identifier (e.g. client-test-synthetic-01, grovaitech-internal, or client-<base36_ts>-<random>).';
COMMENT ON COLUMN public.tenants.name IS 'Display name or legal business entity name of the tenant.';
COMMENT ON COLUMN public.tenants.slug IS 'Unique URL-friendly workspace slug.';
COMMENT ON COLUMN public.tenants.type IS 'Tenant classification: customer (client workspace) or internal (Grovaitech operator organization).';
COMMENT ON COLUMN public.tenants.industry IS 'Operating industry vertical (e.g. Real Estate, Healthcare, Financial Services).';
COMMENT ON COLUMN public.tenants.status IS 'Lifecycle status: active, suspended, or archived.';

-- Performance Indexes for public.tenants
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants (status);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON public.tenants (type);

-- Row Level Security (RLS) - Default Deny
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;


-- 2. Create public.tenant_memberships table
CREATE TABLE IF NOT EXISTS public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_tenant_memberships_tenant_user UNIQUE (tenant_id, user_id)
);

-- Documentation comments
COMMENT ON TABLE public.tenant_memberships IS 'Authoritative user-to-tenant membership bindings with assigned workspace roles.';
COMMENT ON COLUMN public.tenant_memberships.tenant_id IS 'Target tenant identifier referencing public.tenants(id).';
COMMENT ON COLUMN public.tenant_memberships.user_id IS 'Authenticated user UUID referencing auth.users(id).';
COMMENT ON COLUMN public.tenant_memberships.role IS 'Assigned workspace role (e.g. owner, admin, member, viewer, platform_super_admin, platform_operator).';
COMMENT ON COLUMN public.tenant_memberships.status IS 'Membership lifecycle status: active or suspended.';

-- Performance Indexes for public.tenant_memberships
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_id ON public.tenant_memberships (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_id ON public.tenant_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_status ON public.tenant_memberships (user_id, status);

-- Row Level Security (RLS) - Default Deny
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;


-- 3. Create public.tenant_invitations table
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- Documentation comments
COMMENT ON TABLE public.tenant_invitations IS 'Tokenized invitations for internal Grovaitech team members and customer workspace collaborators.';
COMMENT ON COLUMN public.tenant_invitations.tenant_id IS 'Target tenant identifier referencing public.tenants(id).';
COMMENT ON COLUMN public.tenant_invitations.email IS 'Normalized email address of the invited user.';
COMMENT ON COLUMN public.tenant_invitations.role IS 'Role to be granted upon successful acceptance.';
COMMENT ON COLUMN public.tenant_invitations.is_internal IS 'Flag indicating whether this invitation grants internal Grovaitech platform operator roles.';
COMMENT ON COLUMN public.tenant_invitations.invited_by IS 'User UUID of the administrator who issued the invitation.';
COMMENT ON COLUMN public.tenant_invitations.token IS 'Cryptographically secure invitation token used for verification and acceptance.';
COMMENT ON COLUMN public.tenant_invitations.status IS 'Invitation status: pending, accepted, revoked, or expired.';

-- Performance Indexes for public.tenant_invitations
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant_id ON public.tenant_invitations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_email_status ON public.tenant_invitations (email, status);

-- Row Level Security (RLS) - Default Deny
ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;
