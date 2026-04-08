-- Migration 019: Add requirement types, approval tracking, checklist support, and AI config
-- Requested by Nurzhan: filter by type (App/KI), status tracking, approval dates, checklist mode

SET search_path TO anforderungsportal, public;

-- 1) Add requirement_type to projects (App Development vs KI Development)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'anforderungsportal' AND table_name = 'projects' AND column_name = 'requirement_type'
  ) THEN
    ALTER TABLE anforderungsportal.projects
      ADD COLUMN requirement_type text NOT NULL DEFAULT 'app_development'
      CHECK (requirement_type IN ('app_development', 'ai_development'));
  END IF;
END $$;

-- 2) Add approval tracking columns to projects
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'anforderungsportal' AND table_name = 'projects' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE anforderungsportal.projects ADD COLUMN approved_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'anforderungsportal' AND table_name = 'projects' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE anforderungsportal.projects ADD COLUMN approved_by uuid DEFAULT NULL REFERENCES auth.users(id);
  END IF;
END $$;

-- 3) Create wave_reviews table for checklist/presentation mode
CREATE TABLE IF NOT EXISTS anforderungsportal.wave_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES anforderungsportal.projects(id) ON DELETE CASCADE,
  wave_name text NOT NULL,               -- e.g. "Sprint 2026-W15", "Welle 3"
  reviewer_id uuid REFERENCES auth.users(id),
  reviewed_at timestamptz DEFAULT now(),
  total_requirements int NOT NULL DEFAULT 0,
  fulfilled_count int NOT NULL DEFAULT 0,
  goal_reached boolean GENERATED ALWAYS AS (fulfilled_count >= total_requirements) STORED,
  failure_reason text DEFAULT NULL,       -- reason if goals not reached
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4) Create wave_review_items for individual checklist items
CREATE TABLE IF NOT EXISTS anforderungsportal.wave_review_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wave_review_id uuid NOT NULL REFERENCES anforderungsportal.wave_reviews(id) ON DELETE CASCADE,
  question_id uuid REFERENCES anforderungsportal.template_questions(id),
  requirement_text text NOT NULL,         -- the actual requirement text
  is_fulfilled boolean NOT NULL DEFAULT false,
  notes text DEFAULT NULL,
  checked_by uuid REFERENCES auth.users(id),
  checked_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5) AI configuration per organization (store API keys, model preferences)
CREATE TABLE IF NOT EXISTS anforderungsportal.ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES anforderungsportal.organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google' CHECK (provider IN ('google', 'openai', 'anthropic')),
  api_key_encrypted text DEFAULT NULL,    -- encrypted API key
  model_name text DEFAULT NULL,           -- e.g. 'gemini-2.0-flash', 'gpt-4o'
  project_name text DEFAULT NULL,         -- Google AI Studio project name
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, provider)
);

-- 6) RLS policies for new tables
ALTER TABLE anforderungsportal.wave_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE anforderungsportal.wave_review_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE anforderungsportal.ai_config ENABLE ROW LEVEL SECURITY;

-- wave_reviews: admin/staff can manage
CREATE POLICY wave_reviews_admin_all ON anforderungsportal.wave_reviews
  FOR ALL USING (
    anforderungsportal.get_user_role() IN ('super_admin', 'staff')
  );

-- wave_reviews: product_owner can read own project reviews
CREATE POLICY wave_reviews_po_read ON anforderungsportal.wave_reviews
  FOR SELECT USING (
    anforderungsportal.is_project_member(project_id)
  );

-- wave_review_items: admin/staff can manage
CREATE POLICY wave_review_items_admin_all ON anforderungsportal.wave_review_items
  FOR ALL USING (
    anforderungsportal.get_user_role() IN ('super_admin', 'staff')
  );

-- wave_review_items: product_owner can read
CREATE POLICY wave_review_items_po_read ON anforderungsportal.wave_review_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM anforderungsportal.wave_reviews wr
      WHERE wr.id = wave_review_items.wave_review_id
      AND anforderungsportal.is_project_member(wr.project_id)
    )
  );

-- ai_config: only super_admin can manage
CREATE POLICY ai_config_admin_all ON anforderungsportal.ai_config
  FOR ALL USING (
    anforderungsportal.get_user_role() = 'super_admin'
  );

-- ai_config: staff can read
CREATE POLICY ai_config_staff_read ON anforderungsportal.ai_config
  FOR SELECT USING (
    anforderungsportal.get_user_role() IN ('super_admin', 'staff')
  );

-- 7) Update approve_project function to track approval date and approver
CREATE OR REPLACE FUNCTION anforderungsportal.approve_project(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anforderungsportal, public
AS $$
DECLARE
  v_role text;
  v_user_id uuid;
  v_project_status text;
  v_created_by uuid;
BEGIN
  v_role := anforderungsportal.get_user_role();
  IF v_role NOT IN ('super_admin', 'staff') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  v_user_id := auth.uid();

  SELECT status, created_by INTO v_project_status, v_created_by
  FROM anforderungsportal.projects WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF v_project_status <> 'pending_review' THEN
    RAISE EXCEPTION 'Project is not in pending_review status';
  END IF;

  -- Activate the project and record approval
  UPDATE anforderungsportal.projects
  SET status = 'active',
      approved_at = now(),
      approved_by = v_user_id,
      updated_at = now()
  WHERE id = p_project_id;

  -- Auto-add the proposer as product_owner member if not already
  IF v_created_by IS NOT NULL THEN
    INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
    VALUES (p_project_id, v_created_by, 'product_owner')
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- 8) Index for faster requirement_type filtering
CREATE INDEX IF NOT EXISTS idx_projects_requirement_type
  ON anforderungsportal.projects(requirement_type);

CREATE INDEX IF NOT EXISTS idx_projects_approved_at
  ON anforderungsportal.projects(approved_at);

CREATE INDEX IF NOT EXISTS idx_wave_reviews_project_id
  ON anforderungsportal.wave_reviews(project_id);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
