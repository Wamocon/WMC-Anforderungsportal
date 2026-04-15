-- ============================================
-- Migration 022: PO Self-Service Upgrade
-- Product Owners can now:
--   1. Create projects directly in 'draft' status (no approval needed to start)
--   2. Create/edit their own templates
--   3. Fill requirements themselves
--   4. Submit completed requirements for CEO review
--   5. After approval → everything becomes read-only
-- ============================================

-- 1) Add 'approved' status to projects
ALTER TABLE anforderungsportal.projects
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE anforderungsportal.projects
  ADD CONSTRAINT projects_status_check
  CHECK (status IN ('draft', 'active', 'archived', 'pending_review', 'approved'));

-- 2) Add created_by column to templates so POs own their templates
ALTER TABLE anforderungsportal.requirement_templates
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 3) RLS: Update PO project insert — POs can now create in 'draft' status too
DROP POLICY IF EXISTS "po_project_insert" ON anforderungsportal.projects;
CREATE POLICY "po_project_insert" ON anforderungsportal.projects
  FOR INSERT
  WITH CHECK (
    (select anforderungsportal.get_user_role()) = 'product_owner'
    AND status IN ('draft', 'pending_review')
    AND created_by = (select auth.uid())
  );

-- 4) RLS: PO can UPDATE their own draft/pending_review projects
DROP POLICY IF EXISTS "po_project_update_own" ON anforderungsportal.projects;
CREATE POLICY "po_project_update_own" ON anforderungsportal.projects
  FOR UPDATE
  USING (
    created_by = (select auth.uid())
    AND (select anforderungsportal.get_user_role()) = 'product_owner'
    AND status IN ('draft', 'pending_review')
  )
  WITH CHECK (
    created_by = (select auth.uid())
    AND status IN ('draft', 'pending_review')
  );

-- 5) RLS: PO can also view their draft projects (previously only pending_review)
DROP POLICY IF EXISTS "po_project_select_own" ON anforderungsportal.projects;
CREATE POLICY "po_project_select_own" ON anforderungsportal.projects
  FOR SELECT
  USING (
    created_by = (select auth.uid())
    AND (select anforderungsportal.get_user_role()) = 'product_owner'
  );

-- 6) RLS: PO can INSERT templates they own
DROP POLICY IF EXISTS "po_template_insert" ON anforderungsportal.requirement_templates;
CREATE POLICY "po_template_insert" ON anforderungsportal.requirement_templates
  FOR INSERT
  WITH CHECK (
    (select anforderungsportal.get_user_role()) = 'product_owner'
    AND created_by = (select auth.uid())
  );

-- 7) RLS: PO can SELECT templates (their own + is_default ones)
DROP POLICY IF EXISTS "po_template_select" ON anforderungsportal.requirement_templates;
CREATE POLICY "po_template_select" ON anforderungsportal.requirement_templates
  FOR SELECT
  USING (
    (select anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
    OR is_default = true
    OR created_by = (select auth.uid())
  );

-- 8) RLS: PO can UPDATE their own templates (only if template's projects are NOT approved)
DROP POLICY IF EXISTS "po_template_update" ON anforderungsportal.requirement_templates;
CREATE POLICY "po_template_update" ON anforderungsportal.requirement_templates
  FOR UPDATE
  USING (
    created_by = (select auth.uid())
    AND (select anforderungsportal.get_user_role()) = 'product_owner'
    AND NOT EXISTS (
      SELECT 1 FROM anforderungsportal.projects p
      WHERE p.template_id = anforderungsportal.requirement_templates.id
      AND p.status = 'approved'
    )
  );

-- 9) RLS: PO can manage sections of templates they own
DROP POLICY IF EXISTS "po_section_insert" ON anforderungsportal.template_sections;
CREATE POLICY "po_section_insert" ON anforderungsportal.template_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM anforderungsportal.requirement_templates t
      WHERE t.id = template_id
      AND (
        t.created_by = (select auth.uid())
        OR (select anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
      )
    )
  );

DROP POLICY IF EXISTS "po_section_update" ON anforderungsportal.template_sections;
CREATE POLICY "po_section_update" ON anforderungsportal.template_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM anforderungsportal.requirement_templates t
      WHERE t.id = template_id
      AND t.created_by = (select auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM anforderungsportal.projects p
        WHERE p.template_id = t.id AND p.status = 'approved'
      )
    )
    OR (select anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
  );

DROP POLICY IF EXISTS "po_section_delete" ON anforderungsportal.template_sections;
CREATE POLICY "po_section_delete" ON anforderungsportal.template_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM anforderungsportal.requirement_templates t
      WHERE t.id = template_id
      AND t.created_by = (select auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM anforderungsportal.projects p
        WHERE p.template_id = t.id AND p.status = 'approved'
      )
    )
    OR (select anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
  );

-- 10) RLS: PO can manage questions of sections they own
DROP POLICY IF EXISTS "po_question_insert" ON anforderungsportal.template_questions;
CREATE POLICY "po_question_insert" ON anforderungsportal.template_questions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM anforderungsportal.template_sections s
      JOIN anforderungsportal.requirement_templates t ON t.id = s.template_id
      WHERE s.id = section_id
      AND (
        t.created_by = (select auth.uid())
        OR (select anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
      )
    )
  );

DROP POLICY IF EXISTS "po_question_update" ON anforderungsportal.template_questions;
CREATE POLICY "po_question_update" ON anforderungsportal.template_questions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM anforderungsportal.template_sections s
      JOIN anforderungsportal.requirement_templates t ON t.id = s.template_id
      WHERE s.id = section_id
      AND t.created_by = (select auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM anforderungsportal.projects p
        WHERE p.template_id = t.id AND p.status = 'approved'
      )
    )
    OR (select anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
  );

DROP POLICY IF EXISTS "po_question_delete" ON anforderungsportal.template_questions;
CREATE POLICY "po_question_delete" ON anforderungsportal.template_questions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM anforderungsportal.template_sections s
      JOIN anforderungsportal.requirement_templates t ON t.id = s.template_id
      WHERE s.id = section_id
      AND t.created_by = (select auth.uid())
      AND NOT EXISTS (
        SELECT 1 FROM anforderungsportal.projects p
        WHERE p.template_id = t.id AND p.status = 'approved'
      )
    )
    OR (select anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
  );

-- 11) RPC: PO submits project for CEO review
CREATE OR REPLACE FUNCTION anforderungsportal.submit_for_review(
  p_project_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'anforderungsportal'
AS $$
DECLARE
  v_role text;
  v_project record;
BEGIN
  v_role := anforderungsportal.get_user_role();

  SELECT * INTO v_project
  FROM anforderungsportal.projects
  WHERE id = p_project_id
    AND created_by = (select auth.uid())
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not in draft status';
  END IF;

  -- Verify the project has a template with at least one section
  IF v_project.template_id IS NULL THEN
    RAISE EXCEPTION 'Project must have a template assigned';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM anforderungsportal.template_sections
    WHERE template_id = v_project.template_id
  ) THEN
    RAISE EXCEPTION 'Template must have at least one section';
  END IF;

  -- Update status to pending_review
  UPDATE anforderungsportal.projects
  SET status = 'pending_review', updated_at = now()
  WHERE id = p_project_id;

  -- Ensure creator is a project member
  INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
  VALUES (p_project_id, (select auth.uid()), 'product_owner')
  ON CONFLICT DO NOTHING;
END;
$$;

-- 12) Update approve_project to set status to 'approved' instead of 'active'
--     and lock the template
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
  v_template_id uuid;
BEGIN
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT created_by, template_id INTO v_creator, v_template_id
  FROM anforderungsportal.projects
  WHERE id = p_project_id AND status = 'pending_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found or not pending review';
  END IF;

  -- Assign default template if none set
  IF v_template_id IS NULL THEN
    SELECT id INTO v_template_id
    FROM anforderungsportal.requirement_templates
    WHERE is_default = true
    LIMIT 1;

    IF v_template_id IS NOT NULL THEN
      UPDATE anforderungsportal.projects
      SET template_id = v_template_id
      WHERE id = p_project_id;
    END IF;
  END IF;

  -- Update status to approved (locked)
  UPDATE anforderungsportal.projects
  SET status = 'approved',
      approved_at = now(),
      approved_by = (select auth.uid()),
      updated_at = now()
  WHERE id = p_project_id;

  -- Auto-add creator as product_owner member
  IF v_creator IS NOT NULL THEN
    INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_creator, 'product_owner')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 13) RPC: Reject project back to draft (not archive)
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
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM anforderungsportal.projects
    WHERE id = p_project_id AND status = 'pending_review'
  ) THEN
    RAISE EXCEPTION 'Project not found or not pending review';
  END IF;

  -- Move back to draft so PO can edit
  UPDATE anforderungsportal.projects
  SET status = 'draft', updated_at = now()
  WHERE id = p_project_id;
END;
$$;

-- 14) RLS: PO can create responses for their own draft projects
DROP POLICY IF EXISTS "po_response_insert" ON anforderungsportal.responses;
CREATE POLICY "po_response_insert" ON anforderungsportal.responses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM anforderungsportal.projects p
      WHERE p.id = project_id
      AND p.created_by = (select auth.uid())
      AND p.status IN ('draft', 'active')
    )
    OR EXISTS (
      SELECT 1 FROM anforderungsportal.project_members pm
      WHERE pm.project_id = project_id
      AND pm.user_id = (select auth.uid())
    )
    OR (select anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
  );
