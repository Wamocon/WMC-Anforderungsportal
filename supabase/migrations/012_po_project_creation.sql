-- ============================================
-- Migration 012: Product Owner Project Creation
-- Allows product owners to propose projects (pending_review status)
-- Staff can approve or reject them
-- ============================================

-- 1) Expand status CHECK constraint to include 'pending_review'
ALTER TABLE anforderungsportal.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE anforderungsportal.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'active', 'archived', 'pending_review'));

-- 2) Add created_by column to track who created the project
ALTER TABLE anforderungsportal.projects
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 3) RLS policy: product_owner can INSERT projects with status='pending_review'
CREATE POLICY "po_project_insert" ON anforderungsportal.projects
  FOR INSERT
  WITH CHECK (
    (select anforderungsportal.get_user_role()) = 'product_owner'
    AND status = 'pending_review'
    AND created_by = (select auth.uid())
  );

-- 4) RLS policy: product_owner can view their own created projects
CREATE POLICY "po_project_select_own" ON anforderungsportal.projects
  FOR SELECT
  USING (
    created_by = (select auth.uid())
    AND (select anforderungsportal.get_user_role()) = 'product_owner'
  );

-- 5) RPC: staff approves a project (sets status to 'active', auto-adds PO as member)
CREATE OR REPLACE FUNCTION anforderungsportal.approve_project(
  p_project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'anforderungsportal'
AS $$
DECLARE
  v_creator uuid;
  v_role text;
BEGIN
  -- Only staff/super_admin can approve
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Get the project creator
  SELECT created_by INTO v_creator
  FROM anforderungsportal.projects
  WHERE id = p_project_id AND status = 'pending_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not pending review';
  END IF;

  -- Update status to active
  UPDATE anforderungsportal.projects
  SET status = 'active', updated_at = now()
  WHERE id = p_project_id;

  -- Auto-add creator as product_owner member if not already
  INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
  VALUES (p_project_id, v_creator, 'product_owner')
  ON CONFLICT DO NOTHING;
END;
$$;

-- 6) RPC: staff rejects a project (deletes it or archives it)
CREATE OR REPLACE FUNCTION anforderungsportal.reject_project(
  p_project_id uuid,
  p_reason text DEFAULT 'Rejected by staff'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'anforderungsportal'
AS $$
DECLARE
  v_role text;
BEGIN
  -- Only staff/super_admin can reject
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Verify status
  IF NOT EXISTS (
    SELECT 1 FROM anforderungsportal.projects
    WHERE id = p_project_id AND status = 'pending_review'
  ) THEN
    RAISE EXCEPTION 'Project not found or not pending review';
  END IF;

  -- Archive the rejected project
  PERFORM anforderungsportal.archive_project(p_project_id, p_reason);
END;
$$;

GRANT EXECUTE ON FUNCTION anforderungsportal.approve_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION anforderungsportal.reject_project(uuid, text) TO authenticated;
