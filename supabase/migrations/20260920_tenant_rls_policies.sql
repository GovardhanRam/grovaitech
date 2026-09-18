-- Supabase Migration: 20260920_tenant_rls_policies.sql
-- Description: Phase 2 RLS Security Policies for Multi-Tenant Isolation (Hardened).
-- DO NOT APPLY TO PRODUCTION UNTIL EXPLICITLY APPROVED AND PHASE 1 AUDIT IS COMPLETED.
--
-- Security Hardening Updates:
-- 1. Helper security definer functions: is_tenant_member() and is_platform_admin()
--    - search_path = public explicitly set
--    - auth.uid() null-safety checks
--    - REVOKE ALL FROM PUBLIC; GRANT EXECUTE TO authenticated, service_role
-- 2. public.tenants:
--    - Direct INSERT restricted to is_platform_admin() only (onboarding runs via server-side admin client)
--    - UPDATE restricted to owner/admin on type = 'customer'; prevents customer admins escalating to type = 'internal'
--    - DELETE restricted to is_platform_admin() only
-- 3. public.tenant_memberships:
--    - Customer owners/admins can ONLY manage memberships within type = 'customer' tenants
--    - Customer owners/admins can ONLY assign customer roles ('owner', 'admin', 'member', 'viewer')
--    - Assignment of platform roles ('platform_super_admin', 'platform_operator') strictly prohibited via PostgREST
-- 4. public.tenant_invitations:
--    - SELECT restricted to tenant owner/admin and platform_admin (prevents raw invitation token harvesting via browser)
--    - INSERT/UPDATE/DELETE customer role boundary enforced
-- 5. Tenant-scoped isolation policies for client_deployments, client_knowledge_items, and real_estate_leads

BEGIN;

-- ============================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_tenant_member(
  lookup_tenant_id TEXT,
  required_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR lookup_tenant_id IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = lookup_tenant_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND (required_roles IS NULL OR tm.role = ANY(required_roles))
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.is_tenant_member(TEXT, TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_tenant_member(TEXT, TEXT[]) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      JOIN public.tenants t ON t.id = tm.tenant_id
      WHERE tm.user_id = auth.uid()
        AND tm.status = 'active'
        AND t.type = 'internal'
        AND tm.role IN ('platform_super_admin', 'platform_operator', 'admin', 'owner')
    )
  END;
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

-- ============================================================================
-- 1B. IDEMPOTENT INTERNAL TENANT BOOTSTRAP
-- ============================================================================
-- Establishes the canonical internal platform tenant entity required by is_platform_admin().
-- Note: No user or membership is created here; human administrators bind their auth UUID upon onboarding.
INSERT INTO public.tenants (id, name, slug, type, industry, status)
VALUES (
  'grovaitech-internal',
  'Grovaitech Internal Platform',
  'grovaitech-internal',
  'internal',
  'Technology',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  type = 'internal',
  status = 'active',
  updated_at = now();

-- ============================================================================
-- 2. POLICIES FOR public.tenants
-- ============================================================================

DROP POLICY IF EXISTS "tenants_select_member_or_admin" ON public.tenants;
-- Users can read tenants they belong to or if platform admin
CREATE POLICY "tenants_select_member_or_admin"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "tenants_insert_platform_admin_only" ON public.tenants;
-- Direct client INSERT into tenants is forbidden for regular customer users.
-- Customer onboarding is handled exclusively via verified server-side actions (createTenantWorkspace).
-- Platform admins can directly insert tenants if needed.
CREATE POLICY "tenants_insert_platform_admin_only"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
  );

DROP POLICY IF EXISTS "tenants_update_owner_or_admin" ON public.tenants;
-- Only owners/admins or platform admins can update tenant metadata.
-- Customer tenant owners/admins CANNOT update type to 'internal' (preventing privilege escalation).
CREATE POLICY "tenants_update_owner_or_admin"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(id, ARRAY['owner', 'admin'])
      AND type = 'customer'
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(id, ARRAY['owner', 'admin'])
      AND type = 'customer'
    )
  );

DROP POLICY IF EXISTS "tenants_delete_platform_admin_only" ON public.tenants;
-- Direct client DELETE on tenants is restricted to platform super admins.
CREATE POLICY "tenants_delete_platform_admin_only"
  ON public.tenants
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin()
  );

-- ============================================================================
-- 3. POLICIES FOR public.tenant_memberships
-- ============================================================================

DROP POLICY IF EXISTS "tenant_memberships_select_tenant" ON public.tenant_memberships;
-- Members can view memberships within their authorized tenant, or see their own record
CREATE POLICY "tenant_memberships_select_tenant"
  ON public.tenant_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_tenant_member(tenant_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "tenant_memberships_manage_owner_or_admin" ON public.tenant_memberships;
DROP POLICY IF EXISTS "tenant_memberships_insert_owner_or_admin" ON public.tenant_memberships;
-- Customer workspace owners/admins can INSERT memberships ONLY in customer tenants,
-- and ONLY for customer roles ('owner', 'admin', 'member', 'viewer').
-- Platform roles ('platform_super_admin', 'platform_operator') are strictly prohibited.
CREATE POLICY "tenant_memberships_insert_owner_or_admin"
  ON public.tenant_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
      AND role IN ('owner', 'admin', 'member', 'viewer')
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_memberships.tenant_id
          AND t.type = 'customer'
      )
    )
  );

DROP POLICY IF EXISTS "tenant_memberships_update_owner_or_admin" ON public.tenant_memberships;
-- Customer workspace owners/admins can UPDATE memberships ONLY in customer tenants,
-- and CANNOT escalate any user to a platform role.
CREATE POLICY "tenant_memberships_update_owner_or_admin"
  ON public.tenant_memberships
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_memberships.tenant_id
          AND t.type = 'customer'
      )
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
      AND role IN ('owner', 'admin', 'member', 'viewer')
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_memberships.tenant_id
          AND t.type = 'customer'
      )
    )
  );

DROP POLICY IF EXISTS "tenant_memberships_delete_owner_or_admin" ON public.tenant_memberships;
-- Customer workspace owners/admins can DELETE memberships ONLY in customer tenants.
CREATE POLICY "tenant_memberships_delete_owner_or_admin"
  ON public.tenant_memberships
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_memberships.tenant_id
          AND t.type = 'customer'
      )
    )
  );

-- ============================================================================
-- 4. POLICIES FOR public.tenant_invitations
-- ============================================================================

DROP POLICY IF EXISTS "tenant_invitations_select" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_select_admin" ON public.tenant_invitations;
-- Invitations can ONLY be viewed by workspace owners/admins or platform admins.
-- Raw tokens are NEVER exposed to arbitrary queries by non-admin authenticated users.
-- Invitation verification and acceptance is handled exclusively via server-side action.
CREATE POLICY "tenant_invitations_select_admin"
  ON public.tenant_invitations
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "tenant_invitations_manage" ON public.tenant_invitations;
DROP POLICY IF EXISTS "tenant_invitations_insert_owner_or_admin" ON public.tenant_invitations;
-- Customer workspace owners/admins can INSERT invitations ONLY for customer roles
-- ('owner', 'admin', 'member', 'viewer') within customer tenants.
CREATE POLICY "tenant_invitations_insert_owner_or_admin"
  ON public.tenant_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
      AND role IN ('owner', 'admin', 'member', 'viewer')
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_invitations.tenant_id
          AND t.type = 'customer'
      )
    )
  );

DROP POLICY IF EXISTS "tenant_invitations_update_owner_or_admin" ON public.tenant_invitations;
-- Customer workspace owners/admins can UPDATE invitations in customer tenants,
-- and cannot escalate roles.
CREATE POLICY "tenant_invitations_update_owner_or_admin"
  ON public.tenant_invitations
  FOR UPDATE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_invitations.tenant_id
          AND t.type = 'customer'
      )
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
      AND role IN ('owner', 'admin', 'member', 'viewer')
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_invitations.tenant_id
          AND t.type = 'customer'
      )
    )
  );

DROP POLICY IF EXISTS "tenant_invitations_delete_owner_or_admin" ON public.tenant_invitations;
-- Customer workspace owners/admins can DELETE invitations in customer tenants.
CREATE POLICY "tenant_invitations_delete_owner_or_admin"
  ON public.tenant_invitations
  FOR DELETE
  TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      public.is_tenant_member(tenant_id, ARRAY['owner', 'admin'])
      AND EXISTS (
        SELECT 1 FROM public.tenants t
        WHERE t.id = tenant_invitations.tenant_id
          AND t.type = 'customer'
      )
    )
  );

-- ============================================================================
-- 5. POLICIES FOR public.client_deployments
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.client_deployments ENABLE ROW LEVEL SECURITY;

-- Explicitly drop legacy permissive policies that allowed any authenticated user full access
DROP POLICY IF EXISTS "allow_all_for_now" ON public.client_deployments;
DROP POLICY IF EXISTS "Allow authenticated read on client_deployments" ON public.client_deployments;
DROP POLICY IF EXISTS "Allow authenticated insert on client_deployments" ON public.client_deployments;
DROP POLICY IF EXISTS "Allow authenticated update on client_deployments" ON public.client_deployments;

DROP POLICY IF EXISTS "client_deployments_select_tenant" ON public.client_deployments;
CREATE POLICY "client_deployments_select_tenant"
  ON public.client_deployments
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(client_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "client_deployments_manage_tenant" ON public.client_deployments;
CREATE POLICY "client_deployments_manage_tenant"
  ON public.client_deployments
  FOR ALL
  TO authenticated
  USING (
    public.is_tenant_member(client_id, ARRAY['owner', 'admin'])
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.is_tenant_member(client_id, ARRAY['owner', 'admin'])
    OR public.is_platform_admin()
  );

-- ============================================================================
-- 6. POLICIES FOR public.client_knowledge_items
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.client_knowledge_items') IS NOT NULL THEN
    ALTER TABLE public.client_knowledge_items ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "client_knowledge_select_tenant" ON public.client_knowledge_items;
    CREATE POLICY "client_knowledge_select_tenant"
      ON public.client_knowledge_items
      FOR SELECT
      TO authenticated
      USING (
        public.is_tenant_member(client_id)
        OR public.is_platform_admin()
      );

    DROP POLICY IF EXISTS "client_knowledge_manage_tenant" ON public.client_knowledge_items;
    CREATE POLICY "client_knowledge_manage_tenant"
      ON public.client_knowledge_items
      FOR ALL
      TO authenticated
      USING (
        public.is_tenant_member(client_id, ARRAY['owner', 'admin', 'member'])
        OR public.is_platform_admin()
      )
      WITH CHECK (
        public.is_tenant_member(client_id, ARRAY['owner', 'admin', 'member'])
        OR public.is_platform_admin()
      );
  END IF;
END;
$$;

-- ============================================================================
-- 7. POLICIES FOR public.real_estate_leads
-- ============================================================================

ALTER TABLE IF EXISTS public.real_estate_leads ENABLE ROW LEVEL SECURITY;

-- Explicitly drop legacy permissive policies that allowed any authenticated user full access
DROP POLICY IF EXISTS "allow_all_for_now" ON public.real_estate_leads;
DROP POLICY IF EXISTS "Allow authenticated read on real_estate_leads" ON public.real_estate_leads;
DROP POLICY IF EXISTS "Allow authenticated insert on real_estate_leads" ON public.real_estate_leads;
DROP POLICY IF EXISTS "Allow authenticated update on real_estate_leads" ON public.real_estate_leads;
DROP POLICY IF EXISTS "Allow authenticated delete on real_estate_leads" ON public.real_estate_leads;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.real_estate_leads;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.real_estate_leads;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.real_estate_leads;
DROP POLICY IF EXISTS "Enable all for users based on user_id" ON public.real_estate_leads;

DROP POLICY IF EXISTS "real_estate_leads_select_tenant" ON public.real_estate_leads;
CREATE POLICY "real_estate_leads_select_tenant"
  ON public.real_estate_leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_tenant_member(client_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "real_estate_leads_update_tenant" ON public.real_estate_leads;
CREATE POLICY "real_estate_leads_update_tenant"
  ON public.real_estate_leads
  FOR UPDATE
  TO authenticated
  USING (
    public.is_tenant_member(client_id)
    OR public.is_platform_admin()
  )
  WITH CHECK (
    public.is_tenant_member(client_id)
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "real_estate_leads_insert_tenant" ON public.real_estate_leads;
-- Authenticated workspace members (owner, admin, member) and platform admins can insert leads
CREATE POLICY "real_estate_leads_insert_tenant"
  ON public.real_estate_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_tenant_member(client_id, ARRAY['owner', 'admin', 'member'])
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "real_estate_leads_delete_tenant" ON public.real_estate_leads;
-- Workspace owners/admins and platform admins can delete leads
CREATE POLICY "real_estate_leads_delete_tenant"
  ON public.real_estate_leads
  FOR DELETE
  TO authenticated
  USING (
    public.is_tenant_member(client_id, ARRAY['owner', 'admin'])
    OR public.is_platform_admin()
  );

-- ----------------------------------------------------------------------------
-- NOTE ON LEGACY NULL client_id LEADS:
-- In legacy migrations (20260903_add_client_deployment_attribution.sql), client_id
-- was nullable. Any historical leads where client_id IS NULL are NOT visible to
-- regular tenant members because public.is_tenant_member(NULL) evaluates to FALSE.
-- Platform admins can inspect unscoped leads. A production data backfill must be
-- performed prior to or alongside RLS application to map historical leads to their
-- canonical tenant identifiers without inventing unverified associations.
-- ----------------------------------------------------------------------------

COMMIT;
