-- Migration: Fix approve_project RPC to assign default template
-- Problem: PO-proposed projects had template_id = null after approval,
--          causing 404 on the form fill page.

CREATE OR REPLACE FUNCTION anforderungsportal.approve_project(p_project_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'anforderungsportal', 'public'
AS $function$
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

    -- Fallback: use the first available template
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
  SET status = 'active',
      template_id = v_default_template,
      approved_at = now(),
      approved_by = v_user_id,
      updated_at = now()
  WHERE id = p_project_id;

  IF v_created_by IS NOT NULL THEN
    INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_created_by, 'product_owner')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;

-- Backfill: assign default template to any active projects missing one
UPDATE anforderungsportal.projects
SET template_id = (
  SELECT id FROM anforderungsportal.requirement_templates
  WHERE is_default = true LIMIT 1
), updated_at = now()
WHERE template_id IS NULL AND status = 'active';
