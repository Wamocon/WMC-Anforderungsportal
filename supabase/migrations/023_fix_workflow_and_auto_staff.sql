-- Migration 023: Fix workflow — auto-add staff on activate, fix approve→activate flow
-- Issues fixed:
--   1. Staff not auto-assigned to projects on activation
--   2. activate_project RPC was missing (only existed as raw update in MCP)
--   3. approve_project correctly sets 'approved' status (not 'active')
--   4. activate_project transitions approved→active and auto-adds org staff

SET search_path TO anforderungsportal, public;

-- 1) Create activate_project RPC: transitions approved → active, auto-adds org staff
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
  v_org_id uuid;
  v_project_status text;
  v_staff_user record;
BEGIN
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT status, org_id INTO v_project_status, v_org_id
  FROM anforderungsportal.projects
  WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project_status <> 'approved' THEN
    RAISE EXCEPTION 'Project must be in approved status to activate (current: %)', v_project_status;
  END IF;

  -- Activate the project
  UPDATE anforderungsportal.projects
  SET status = 'active', updated_at = now()
  WHERE id = p_project_id;

  -- Auto-add all staff and super_admin users from the same org as project members
  -- Staff are identified by app_metadata->>'role' IN ('staff', 'super_admin')
  -- and app_metadata->>'org_id' matching the project's org
  INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
  SELECT p_project_id, u.id, 'staff'
  FROM auth.users u
  WHERE u.raw_app_meta_data->>'role' IN ('staff', 'super_admin')
    AND (
      v_org_id IS NULL  -- if no org_id, add all staff
      OR u.raw_app_meta_data->>'org_id' = v_org_id::text
    )
  ON CONFLICT DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION anforderungsportal.activate_project(uuid) TO authenticated;

-- 2) Also update approve_project to auto-add the approving staff member
--    (so they can immediately see the project even before activation)
CREATE OR REPLACE FUNCTION anforderungsportal.approve_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'anforderungsportal', 'public'
AS $$
DECLARE
  v_role text;
  v_user_id uuid;
  v_project_status text;
  v_created_by uuid;
  v_template_id uuid;
  v_default_template uuid;
BEGIN
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_user_id := auth.uid();

  SELECT status, created_by, template_id
  INTO v_project_status, v_created_by, v_template_id
  FROM anforderungsportal.projects WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project_status <> 'pending_review' THEN
    RAISE EXCEPTION 'Project is not in pending_review status';
  END IF;

  -- If the project has no template assigned, assign the default one
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

  -- Set status to approved (not active — activation is a separate step)
  UPDATE anforderungsportal.projects
  SET status = 'approved',
      template_id = v_default_template,
      approved_at = now(),
      approved_by = v_user_id,
      updated_at = now()
  WHERE id = p_project_id;

  -- Auto-add the PO creator as product_owner member
  IF v_created_by IS NOT NULL THEN
    INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_created_by, 'product_owner')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Auto-add the approving staff member
  IF v_user_id IS NOT NULL THEN
    INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_user_id, 'staff')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
