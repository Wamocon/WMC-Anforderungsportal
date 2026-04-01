-- Migration 017: Allow staff to delete archived projects
-- Previously only super_admin could delete. Now super_admin + staff can.
-- Product owners cannot delete archives.

DROP POLICY IF EXISTS "Admin can delete archived projects" ON anforderungsportal.archived_projects;
CREATE POLICY "Admin can delete archived projects" ON anforderungsportal.archived_projects
  FOR DELETE
  USING (
    anforderungsportal.get_user_role() IN ('super_admin', 'staff')
  );

NOTIFY pgrst, 'reload schema';
