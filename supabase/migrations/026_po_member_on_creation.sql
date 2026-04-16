-- Migration 026: PO gets project_members entry immediately on creation
-- ────────────────────────────────────────────────────────────────────
-- Problem: PO creates project but has no project_members entry until approve_project.
-- This blocks:
--   1. Storage signed URL generation (storage SELECT policy requires project_members match)
--   2. Form fill page membership queries
-- Fix: 
--   1. Storage SELECT policy for PO creator (safety net for projects before member added)
--   2. Backfill missing PO members for existing projects
--   3. MCP + Web UI now insert project_members on create (code change)

-- 1. Storage SELECT policy: PO creator can view their own project's attachments
CREATE POLICY "project_attachments_storage_select_po_creator"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'product_owner'
    AND EXISTS (
      SELECT 1 FROM anforderungsportal.projects p
      WHERE p.created_by = auth.uid()
        AND (storage.foldername(name))[1] = p.id::text
    )
  );

-- 2. Backfill missing PO members
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
SELECT p.id, p.created_by, 'product_owner'
FROM anforderungsportal.projects p
WHERE p.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM anforderungsportal.project_members pm
    WHERE pm.project_id = p.id AND pm.user_id = p.created_by AND pm.role = 'product_owner'
  )
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
