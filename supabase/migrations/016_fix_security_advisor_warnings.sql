-- Migration 016: Fix Supabase Security Advisor Warnings
-- Fixes: redundant always-true RLS policies, mutable search_path on functions

-- ============================================================
-- 1. DROP REDUNDANT ALWAYS-TRUE RLS POLICIES
-- ============================================================

-- response_answers: anf_answers_insert (always true) is redundant
-- because answers_upsert (ALL cmd) already covers INSERT with proper check
DROP POLICY IF EXISTS "anf_answers_insert" ON anforderungsportal.response_answers;

-- response_answers: anf_answers_delete (always true) is redundant
-- because answers_upsert (ALL cmd) already covers DELETE with proper check
DROP POLICY IF EXISTS "anf_answers_delete" ON anforderungsportal.response_answers;

-- responses: anf_responses_insert (always true) overrides the proper
-- responses_insert policy that checks respondent_id = auth.uid() OR staff
DROP POLICY IF EXISTS "anf_responses_insert" ON anforderungsportal.responses;

-- audit_log: restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "anf_audit_insert" ON anforderungsportal.audit_log;
CREATE POLICY "anf_audit_insert" ON anforderungsportal.audit_log
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. FIX FUNCTION SEARCH_PATH (anforderungsportal schema)
-- ============================================================

-- get_user_role
CREATE OR REPLACE FUNCTION anforderungsportal.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt()->'app_metadata'->>'role', 'client');
$$;

-- get_user_org_id
CREATE OR REPLACE FUNCTION anforderungsportal.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'org_id')::UUID;
$$;

-- get_project_org_id
CREATE OR REPLACE FUNCTION anforderungsportal.get_project_org_id(p_project_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT org_id FROM anforderungsportal.projects WHERE id = p_project_id;
$$;

-- update_updated_at
CREATE OR REPLACE FUNCTION anforderungsportal.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- can_access_response
CREATE OR REPLACE FUNCTION anforderungsportal.can_access_response(p_response_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM anforderungsportal.responses r
    WHERE r.id = p_response_id
      AND (
        r.respondent_id = auth.uid()
        OR anforderungsportal.get_project_org_id(r.project_id) = anforderungsportal.get_user_org_id()
      )
  );
$$;

-- ============================================================
-- 3. FIX FUNCTION SEARCH_PATH (public schema)
-- ============================================================

-- Only fix if function exists (these are from Supabase default triggers)
DO $$
BEGIN
  -- handle_new_user
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_new_user') THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_user() SET search_path = ''''';
  END IF;

  -- update_updated_at_column
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = ''''';
  END IF;

  -- handle_invitation_accept
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_invitation_accept') THEN
    EXECUTE 'ALTER FUNCTION public.handle_invitation_accept() SET search_path = ''''';
  END IF;

  -- update_org_seat_count
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_org_seat_count') THEN
    EXECUTE 'ALTER FUNCTION public.update_org_seat_count() SET search_path = ''''';
  END IF;

  -- handle_new_gamification
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'handle_new_gamification') THEN
    EXECUTE 'ALTER FUNCTION public.handle_new_gamification() SET search_path = ''''';
  END IF;
END;
$$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
