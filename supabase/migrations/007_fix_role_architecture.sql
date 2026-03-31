-- =============================================================================
-- Migration 007: Fix role architecture — product_owner / staff / super_admin
-- =============================================================================
-- Root problem fixed:
--   "product_owner" was used in JWT to mean "WMC staff with admin access" AND
--   in project_members to mean "person who owns the app idea" → same word,
--   opposite people.
--
-- New clean design (3 JWT roles only):
--   super_admin    → Admin Dashboard  — Maanik (full org control)
--   staff          → Admin Dashboard  — Waleri (WMC account manager)
--   product_owner  → Client Portal    — Daniel, Niko, etc. (they OWN their product)
--
-- project_members.role is UNCHANGED — it already used product_owner correctly
--   to describe the app idea owner versus Waleri's 'client' role.
--
-- This migration updates all RLS policies that checked JWT role = 'product_owner'
-- to instead check for JWT role = 'staff'. The project_members CHECK constraint
-- (role IN ('super_admin','product_owner','client')) is deliberately NOT changed.
-- =============================================================================

-- ─── anforderungsportal schema policies ───────────────────────────────────

ALTER POLICY "project_manage" ON anforderungsportal.projects
  USING (
    org_id = (select anforderungsportal.get_user_org_id())
    and (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "members_manage" ON anforderungsportal.project_members
  USING (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "templates_manage" ON anforderungsportal.requirement_templates
  USING (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "sections_manage" ON anforderungsportal.template_sections
  USING (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "questions_manage" ON anforderungsportal.template_questions
  USING (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "responses_insert" ON anforderungsportal.responses
  WITH CHECK (
    respondent_id = (select auth.uid())
    or (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "responses_update" ON anforderungsportal.responses
  USING (
    respondent_id = (select auth.uid())
    or (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "answers_upsert" ON anforderungsportal.response_answers
  USING (
    exists (
      select 1 from anforderungsportal.responses r
      where r.id = response_answers.response_id
        and (
          r.respondent_id = (select auth.uid())
          or (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
        )
    )
  );

ALTER POLICY "magic_links_manage" ON anforderungsportal.magic_links
  USING (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "audit_log_select" ON anforderungsportal.audit_log
  USING (
    (select anforderungsportal.get_user_role()) in ('super_admin', 'staff')
  );

ALTER POLICY "project_attachments_insert" ON anforderungsportal.project_attachments
  WITH CHECK (
    uploaded_by = (SELECT auth.uid())
    AND (SELECT anforderungsportal.get_user_role()) IN ('super_admin', 'staff')
  );

-- ─── storage.objects policies (must DROP + recreate — no ALTER support) ───

DROP POLICY IF EXISTS "project_attachments_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "project_attachments_storage_delete" ON storage.objects;

CREATE POLICY "project_attachments_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'staff')
  );

CREATE POLICY "project_attachments_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IS NOT NULL
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('super_admin', 'staff')
  );

NOTIFY pgrst, 'reload schema';
