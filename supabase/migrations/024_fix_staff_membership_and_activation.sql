-- Migration 024: Fix staff membership architecture
--
-- ROOT CAUSE ANALYSIS:
--   Migration 023 created activate_project to auto-insert staff into project_members
--   with role='staff'. BUT project_members_role_check only allows:
--   'super_admin', 'product_owner', 'client' — 'staff' is NOT in that list.
--
--   This means activate_project and approve_project BOTH fail via CHECK constraint
--   violation for any new project where the staff user is not already in project_members.
--
-- CORRECT ARCHITECTURE:
--   - project_members is for CLIENTS and PRODUCT OWNERS (project-scoped access)
--   - Staff/super_admin have ORG-LEVEL access via RLS policy `project_manage`:
--       qual: "org_id = get_user_org_id() AND get_user_role() IN ('super_admin','staff')"
--   - Waleri (staff) does NOT need to be in project_members — she already has full access
--   - Seed migration 004 incorrectly added her as 'client' to some projects
--
-- FIXES:
--   1. Rewrite activate_project — remove broken staff INSERT
--   2. Rewrite approve_project — remove broken staff INSERT
--   3. Clean up Waleri's incorrect 'client' memberships from seed data

SET search_path TO anforderungsportal, public;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix activate_project: remove staff auto-insert (staff have org-level access)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION anforderungsportal.activate_project(
  p_project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'anforderungsportal', 'public'
AS $$
DECLARE
  v_role text;
  v_project_status text;
BEGIN
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT status INTO v_project_status
  FROM anforderungsportal.projects
  WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project_status <> 'approved' THEN
    RAISE EXCEPTION 'Project must be in approved status to activate (current: %)', v_project_status;
  END IF;

  UPDATE anforderungsportal.projects
  SET status = 'active', updated_at = now()
  WHERE id = p_project_id;

  -- NOTE: Staff users do NOT need project_members entries.
  -- They have full org-level access via the 'project_manage' RLS policy
  -- which checks get_user_role() in ('super_admin', 'staff').
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix approve_project: remove broken staff self-insert
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION anforderungsportal.approve_project(
  p_project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'anforderungsportal', 'public'
AS $$
DECLARE
  v_role text;
  v_project_status text;
  v_created_by uuid;
  v_template_id uuid;
  v_default_template uuid;
BEGIN
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT status, created_by, template_id
  INTO v_project_status, v_created_by, v_template_id
  FROM anforderungsportal.projects WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project_status <> 'pending_review' THEN
    RAISE EXCEPTION 'Project is not in pending_review status';
  END IF;

  -- Resolve template
  IF v_template_id IS NULL THEN
    SELECT id INTO v_default_template
    FROM anforderungsportal.requirement_templates
    WHERE is_default = true
    LIMIT 1;

    IF v_default_template IS NULL THEN
      SELECT id INTO v_default_template
      FROM anforderungsportal.requirement_templates
      ORDER BY created_at
      LIMIT 1;
    END IF;
  ELSE
    v_default_template := v_template_id;
  END IF;

  UPDATE anforderungsportal.projects
  SET status = 'approved',
      template_id = v_default_template,
      approved_at = now(),
      approved_by = auth.uid(),
      updated_at = now()
  WHERE id = p_project_id;

  -- Ensure the project creator (PO) is a project member
  IF v_created_by IS NOT NULL THEN
    INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_created_by, 'product_owner')
    ON CONFLICT DO NOTHING;
  END IF;

  -- NOTE: The approving staff member does NOT need a project_members entry.
  -- Staff have org-level access via the 'project_manage' RLS policy.
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Remove Waleri's incorrect 'client' memberships injected by seed data
--    She is staff — her access comes from app_metadata, not project_members.
--    Leaving her as 'client' is misleading and was causing the old MCP
--    signIn to incorrectly report her role as 'client'.
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM anforderungsportal.project_members
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'waleri.moretz@wamocon.com'
)
AND role = 'client';

-- Same cleanup for admin@wamocon.com if wrongly in project_members as client
DELETE FROM anforderungsportal.project_members
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'admin@wamocon.com'
)
AND role = 'client';
