-- =============================================================================
-- Migration 005: Project Attachments
-- Allows admins to attach documents (PDFs, images, videos, Word, etc.) when
-- creating or editing a project. Clients (product owners) can view them.
-- =============================================================================

-- ─────────────────────────────────────────────────
-- PART 1: Storage bucket for project attachments
-- ─────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  false,
  52428800, -- 50 MB per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/*',
    'video/mp4', 'video/webm', 'video/ogg', 'video/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for project-attachments bucket
-- Read: any authenticated user who can discover the path via DB RLS
CREATE POLICY "project_attachments_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
  );

-- Write: staff (WMC employees) only
CREATE POLICY "project_attachments_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'staff')
  );

-- Delete: uploader or super_admin
CREATE POLICY "project_attachments_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'staff')
  );

-- ─────────────────────────────────────────────────
-- PART 2: project_attachments table
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anforderungsportal.project_attachments (
  id           uuid         PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   uuid         NOT NULL REFERENCES anforderungsportal.projects(id) ON DELETE CASCADE,
  uploaded_by  uuid         NOT NULL,  -- auth.users.id of uploader
  file_name    text         NOT NULL,  -- original filename shown to users
  file_size    bigint,                 -- bytes
  mime_type    text,                   -- MIME type for icon selection
  storage_path text         NOT NULL,  -- path in 'project-attachments' bucket
  description  text,                   -- optional admin note about the file
  created_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id
  ON anforderungsportal.project_attachments(project_id);

CREATE INDEX IF NOT EXISTS idx_project_attachments_uploaded_by
  ON anforderungsportal.project_attachments(uploaded_by);

ALTER TABLE anforderungsportal.project_attachments ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────
-- PART 3: RLS for project_attachments table
-- ─────────────────────────────────────────────────

-- SELECT: org members (admin dashboard) OR explicit project members (client portal)
CREATE POLICY "project_attachments_select"
  ON anforderungsportal.project_attachments FOR SELECT
  USING (
    -- Admin/manager with matching org sees all projects' attachments
    EXISTS (
      SELECT 1 FROM anforderungsportal.projects p
      WHERE p.id = project_attachments.project_id
        AND p.org_id = (SELECT anforderungsportal.get_user_org_id())
    )
    -- Project members (product owners / clients) see their project's attachments
    OR EXISTS (
      SELECT 1 FROM anforderungsportal.project_members pm
      WHERE pm.project_id = project_attachments.project_id
        AND pm.user_id = (SELECT auth.uid())
    )
  );

-- INSERT: only admin-level auth roles (enforced server-side; storage policy mirrors this)
CREATE POLICY "project_attachments_insert"
  ON anforderungsportal.project_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
  );

-- DELETE: uploader or super_admin
CREATE POLICY "project_attachments_delete"
  ON anforderungsportal.project_attachments FOR DELETE
  USING (
    uploaded_by = (SELECT auth.uid())
    OR (SELECT anforderungsportal.get_user_role()) = 'super_admin'
  );

-- ─────────────────────────────────────────────────
-- PART 4: Notify PostgREST to reload schema
-- ─────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
