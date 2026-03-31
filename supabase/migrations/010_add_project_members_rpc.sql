-- =============================================================================
-- Migration 010: Add get_project_members_info() RPC for admin projects page
-- =============================================================================
-- Purpose: Allows the admin dashboard to fetch project members with full_name
--          and email in a single call (auth.users is not directly queryable
--          by the JS client; this SECURITY DEFINER function exposes it safely).
-- Access:  Only admin roles (super_admin, staff) can call this function.
-- =============================================================================

CREATE OR REPLACE FUNCTION anforderungsportal.get_project_members_info()
RETURNS TABLE(project_id UUID, role TEXT, email TEXT, full_name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = anforderungsportal, auth, public
AS $$
  SELECT 
    pm.project_id,
    pm.role,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email) AS full_name
  FROM anforderungsportal.project_members pm
  JOIN auth.users u ON u.id = pm.user_id
  WHERE anforderungsportal.get_user_role() = ANY(ARRAY['super_admin', 'staff']);
$$;

GRANT EXECUTE ON FUNCTION anforderungsportal.get_project_members_info() TO authenticated;
