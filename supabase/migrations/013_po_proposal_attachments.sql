-- ============================================
-- Migration 013: PO Proposal Attachments & OneDrive Link
-- Adds onedrive_link column so POs can include a OneDrive link in proposals.
-- Updates storage + table RLS so POs can attach files to their own
-- pending_review projects.
-- ============================================

-- 1) Add onedrive_link column to projects
ALTER TABLE anforderungsportal.projects
  ADD COLUMN IF NOT EXISTS onedrive_link text;

-- 2) Allow product_owners to upload to storage bucket for their own projects
CREATE POLICY "project_attachments_storage_insert_po"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'product_owner'
  );

-- 3) Allow product_owners to INSERT into project_attachments table
--    only for projects they created with pending_review status
CREATE POLICY "po_project_attachments_insert"
  ON anforderungsportal.project_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT anforderungsportal.get_user_role()) = 'product_owner'
    AND EXISTS (
      SELECT 1 FROM anforderungsportal.projects p
      WHERE p.id = project_attachments.project_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status = 'pending_review'
    )
  );

-- 4) Allow POs to SELECT attachments on projects they created
CREATE POLICY "po_project_attachments_select_own"
  ON anforderungsportal.project_attachments FOR SELECT
  USING (
    (SELECT anforderungsportal.get_user_role()) = 'product_owner'
    AND EXISTS (
      SELECT 1 FROM anforderungsportal.projects p
      WHERE p.id = project_attachments.project_id
        AND p.created_by = (SELECT auth.uid())
    )
  );

-- 5) Allow POs to DELETE their own attachments on pending_review projects
CREATE POLICY "po_project_attachments_delete_own"
  ON anforderungsportal.project_attachments FOR DELETE
  USING (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT anforderungsportal.get_user_role()) = 'product_owner'
    AND EXISTS (
      SELECT 1 FROM anforderungsportal.projects p
      WHERE p.id = project_attachments.project_id
        AND p.created_by = (SELECT auth.uid())
        AND p.status = 'pending_review'
    )
  );

-- 6) Allow POs to delete their own files from storage
CREATE POLICY "project_attachments_storage_delete_po"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') = 'product_owner'
    AND owner = auth.uid()
  );

-- 7) Allow PO to UPDATE their own pending_review projects (for onedrive_link)
CREATE POLICY "po_project_update_own_pending"
  ON anforderungsportal.projects FOR UPDATE
  USING (
    created_by = (SELECT auth.uid())
    AND status = 'pending_review'
    AND (SELECT anforderungsportal.get_user_role()) = 'product_owner'
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND status = 'pending_review'
    AND (SELECT anforderungsportal.get_user_role()) = 'product_owner'
  );

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
