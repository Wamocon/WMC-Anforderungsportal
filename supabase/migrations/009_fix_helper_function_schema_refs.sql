-- =============================================================================
-- Migration 009: Fix SECURITY DEFINER helper functions referencing old schema
-- =============================================================================
-- Root cause: Migration 006 renamed schema 'anforderungen' → 'anforderungsportal'
-- but the three SECURITY DEFINER helper functions were NOT updated and kept
-- referencing the old 'anforderungen' schema, causing them to always return
-- NULL / false → RLS anf_responses_org policy always failed for org members.
--
-- Fix: update get_project_org_id, is_project_member, can_access_response
-- to reference 'anforderungsportal' schema.
-- =============================================================================

CREATE OR REPLACE FUNCTION anforderungsportal.get_project_org_id(p_project_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = anforderungsportal
AS $$
  SELECT org_id FROM anforderungsportal.projects WHERE id = p_project_id;
$$;

CREATE OR REPLACE FUNCTION anforderungsportal.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = anforderungsportal
AS $$
  SELECT EXISTS (
    SELECT 1 FROM anforderungsportal.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION anforderungsportal.can_access_response(p_response_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = anforderungsportal
AS $$
  SELECT EXISTS (
    SELECT 1 FROM anforderungsportal.responses r
    WHERE r.id = p_response_id
      AND (
        r.respondent_id = auth.uid()
        OR anforderungsportal.get_project_org_id(r.project_id) = anforderungsportal.get_user_org_id()
      )
  );
$$;
