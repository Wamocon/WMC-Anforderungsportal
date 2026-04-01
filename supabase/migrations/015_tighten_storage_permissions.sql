-- Migration 015: Tighten storage bucket permissions
-- Fixes: project_attachments_storage_select was too broad (any authenticated user could access)
-- Now: Only project members can read files from their project's folder

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "project_attachments_storage_select" ON storage.objects;

-- Create a restrictive policy: user must be a member of the project
-- whose folder the file belongs to. Folder structure: {project_id}/...
CREATE POLICY "project_attachments_storage_select" ON storage.objects FOR SELECT
USING (
  bucket_id = 'project-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- Super admins and staff can read all attachments
    (auth.jwt()->'app_metadata'->>'role') IN ('super_admin', 'staff')
    OR
    -- Project members can only read files from their project folders
    EXISTS (
      SELECT 1 FROM anforderungsportal.project_members pm
      WHERE pm.user_id = auth.uid()
        AND (storage.foldername(name))[1] = pm.project_id::text
    )
  )
);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
