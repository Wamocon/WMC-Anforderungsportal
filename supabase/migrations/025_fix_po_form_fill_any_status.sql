-- Migration 025: Fix PO form-fill access at any project status
--
-- PROBLEM: POs could only fill forms on 'draft' and 'active' projects.
-- The pending_review and approved states blocked form filling entirely.
-- This was wrong — a PO should be able to fill their own project form at
-- any point in the workflow, including while waiting for staff review.
--
-- FIXES:
--   1. RLS policy po_response_insert: remove status restriction for PO
--   2. App code changes (in same commit):
--      - form fill page: allow owner/staff at any status
--      - form welcome page: allow owner/staff at any status
--      - upload route: allow owner/staff at any status
--      - my-projects: show fill link during pending_review

SET search_path TO anforderungsportal, public;

-- Remove old policy and create new one without project status restriction
DROP POLICY IF EXISTS po_response_insert ON anforderungsportal.responses;

CREATE POLICY po_response_insert ON anforderungsportal.responses
FOR INSERT
WITH CHECK (
  -- PO who created the project can insert response at any project status
  EXISTS (
    SELECT 1 FROM anforderungsportal.projects p
    WHERE p.id = responses.project_id
      AND p.created_by = auth.uid()
  )
  -- OR any project member (invited clients, etc.)
  OR EXISTS (
    SELECT 1 FROM anforderungsportal.project_members pm
    WHERE pm.project_id = responses.project_id
      AND pm.user_id = auth.uid()
  )
  -- OR staff/admin always have access
  OR anforderungsportal.get_user_role() IN ('super_admin', 'staff')
);
