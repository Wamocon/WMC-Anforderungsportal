-- Migration 011: Archive system (soft-delete) + Feedback/Notification system
-- ============================================
-- 1. ARCHIVED PROJECTS TABLE
-- When staff/PO deletes a project, it moves here as a safety record.
-- ============================================

CREATE TABLE IF NOT EXISTS anforderungsportal.archived_projects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  original_project_id uuid NOT NULL,
  org_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  status text NOT NULL,
  welcome_text jsonb DEFAULT '{}',
  deadline_days integer DEFAULT 5,
  template_id uuid,
  -- Snapshot of related data at time of archival
  members_snapshot jsonb DEFAULT '[]',     -- [{user_id, email, full_name, role}]
  responses_snapshot jsonb DEFAULT '[]',   -- [{id, respondent_email, status, progress_percent, summary}]
  attachments_snapshot jsonb DEFAULT '[]', -- [{file_name, file_size, mime_type, storage_path}]
  -- Archival metadata
  archived_by uuid REFERENCES auth.users(id),
  archived_reason text,
  original_created_at timestamptz,
  archived_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_archived_projects_org ON anforderungsportal.archived_projects(org_id);
CREATE INDEX idx_archived_projects_archived_at ON anforderungsportal.archived_projects(archived_at DESC);

ALTER TABLE anforderungsportal.archived_projects ENABLE ROW LEVEL SECURITY;

-- RLS: Only super_admin and staff can see/manage archived projects
CREATE POLICY "Admin can view archived projects"
  ON anforderungsportal.archived_projects FOR SELECT
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('super_admin', 'staff')
  );

CREATE POLICY "Admin can insert archived projects"
  ON anforderungsportal.archived_projects FOR INSERT
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('super_admin', 'staff')
  );

CREATE POLICY "Admin can delete archived projects"
  ON anforderungsportal.archived_projects FOR DELETE
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'super_admin'
  );


-- ============================================
-- 2. FEEDBACK REQUESTS TABLE
-- Staff sends feedback requests to product_owners.
-- Product owners see notifications and can respond.
-- ============================================

CREATE TABLE IF NOT EXISTS anforderungsportal.feedback_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES anforderungsportal.projects(id) ON DELETE CASCADE NOT NULL,
  response_id uuid REFERENCES anforderungsportal.responses(id) ON DELETE CASCADE,
  -- Who created & who should respond
  requested_by uuid REFERENCES auth.users(id) NOT NULL,
  assigned_to uuid REFERENCES auth.users(id) NOT NULL,
  -- Content
  question text NOT NULL,
  answer text,
  -- Status tracking
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'seen', 'answered', 'dismissed')),
  -- Timestamps
  seen_at timestamptz,
  answered_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_feedback_requests_assigned ON anforderungsportal.feedback_requests(assigned_to, status);
CREATE INDEX idx_feedback_requests_project ON anforderungsportal.feedback_requests(project_id);
CREATE INDEX idx_feedback_requests_created ON anforderungsportal.feedback_requests(created_at DESC);

ALTER TABLE anforderungsportal.feedback_requests ENABLE ROW LEVEL SECURITY;

-- Staff can create feedback requests
CREATE POLICY "Staff can create feedback requests"
  ON anforderungsportal.feedback_requests FOR INSERT
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('super_admin', 'staff')
  );

-- Staff can view all feedback requests
CREATE POLICY "Staff can view all feedback requests"
  ON anforderungsportal.feedback_requests FOR SELECT
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('super_admin', 'staff')
  );

-- Product owners can view their own assigned feedback requests
CREATE POLICY "PO can view assigned feedback"
  ON anforderungsportal.feedback_requests FOR SELECT
  USING (
    assigned_to = auth.uid()
  );

-- Product owners can update (answer) their assigned feedback
CREATE POLICY "PO can answer assigned feedback"
  ON anforderungsportal.feedback_requests FOR UPDATE
  USING (
    assigned_to = auth.uid()
  )
  WITH CHECK (
    assigned_to = auth.uid()
  );

-- Staff can update feedback status
CREATE POLICY "Staff can update feedback"
  ON anforderungsportal.feedback_requests FOR UPDATE
  USING (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('super_admin', 'staff')
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') IN ('super_admin', 'staff')
  );


-- ============================================
-- 3. RPC: Archive a project (soft-delete)
-- Snapshots all related data, then deletes the project.
-- ============================================

CREATE OR REPLACE FUNCTION anforderungsportal.archive_project(
  p_project_id uuid,
  p_reason text DEFAULT 'Archived by user'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = anforderungsportal, public
AS $$
DECLARE
  v_project anforderungsportal.projects%ROWTYPE;
  v_archive_id uuid;
  v_members jsonb;
  v_responses jsonb;
  v_attachments jsonb;
BEGIN
  -- Get the project
  SELECT * INTO v_project FROM anforderungsportal.projects WHERE id = p_project_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  -- Snapshot members
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', pm.user_id,
    'email', u.email,
    'full_name', u.raw_user_meta_data->>'full_name',
    'role', pm.role
  )), '[]'::jsonb)
  INTO v_members
  FROM anforderungsportal.project_members pm
  JOIN auth.users u ON u.id = pm.user_id
  WHERE pm.project_id = p_project_id;

  -- Snapshot responses
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'respondent_email', r.respondent_email,
    'respondent_name', r.respondent_name,
    'status', r.status,
    'progress_percent', r.progress_percent,
    'summary_markdown', r.summary_markdown,
    'submitted_at', r.submitted_at
  )), '[]'::jsonb)
  INTO v_responses
  FROM anforderungsportal.responses r
  WHERE r.project_id = p_project_id;

  -- Snapshot attachments
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'file_name', pa.file_name,
    'file_size', pa.file_size,
    'mime_type', pa.mime_type,
    'storage_path', pa.storage_path
  )), '[]'::jsonb)
  INTO v_attachments
  FROM anforderungsportal.project_attachments pa
  WHERE pa.project_id = p_project_id;

  -- Insert archive record
  INSERT INTO anforderungsportal.archived_projects (
    original_project_id, org_id, name, slug, description, status,
    welcome_text, deadline_days, template_id,
    members_snapshot, responses_snapshot, attachments_snapshot,
    archived_by, archived_reason, original_created_at
  )
  VALUES (
    v_project.id, v_project.org_id, v_project.name, v_project.slug,
    v_project.description, v_project.status,
    v_project.welcome_text, v_project.deadline_days, v_project.template_id,
    v_members, v_responses, v_attachments,
    auth.uid(), p_reason, v_project.created_at
  )
  RETURNING id INTO v_archive_id;

  -- Delete the project (cascades to members, responses, answers, etc.)
  DELETE FROM anforderungsportal.projects WHERE id = p_project_id;

  RETURN v_archive_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION anforderungsportal.archive_project(uuid, text) TO authenticated;
