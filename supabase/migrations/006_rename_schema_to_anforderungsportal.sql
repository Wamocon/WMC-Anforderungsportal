-- =============================================================================
-- Migration 006: Rename schema → anforderungsportal
--
-- Context: This Supabase project is SHARED between multiple WMC products.
-- Each product has its own dedicated schema to keep data isolated:
--
--   anforderungsportal  ← Requirement Collection Portal (this app)
--   ki_manager          ← KI Manager (separate app on same DB)
--   public              ← Shared utilities, pg functions, auth extensions only
--
-- This migration handles TWO scenarios for existing databases:
--
--   Scenario A: Tables are in the 'anforderungen' schema (the old name)
--     → Rename 'anforderungen' to 'anforderungsportal'
--
--   Scenario B: Tables are in 'public' due to migration 001-002 running
--     against public schema instead of anforderungen
--     → Create 'anforderungsportal', move all app tables out of public
--
-- After this migration:
--   • All Anforderungsportal tables are in 'anforderungsportal' schema
--   • Helper functions (get_user_org_id, etc.) remain in 'public'
--   • PostgREST is configured to expose 'anforderungsportal'
--   • App clients pointing to db.schema='anforderungsportal' work correctly
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Handle Scenario A — rename 'anforderungen' if it exists
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'anforderungen') THEN
    EXECUTE 'ALTER SCHEMA anforderungen RENAME TO anforderungsportal';
    RAISE NOTICE 'Schema renamed: anforderungen → anforderungsportal';
  ELSE
    RAISE NOTICE 'Schema ''anforderungen'' not found, skipping rename.';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Create schema if still missing (covers Scenario B or fresh start)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS anforderungsportal;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Handle Scenario B — move tables from public → anforderungsportal
-- Only runs for tables that exist in public but are missing from anforderungsportal
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  app_tables TEXT[] := ARRAY[
    'organizations',
    'projects',
    'project_members',
    'requirement_templates',
    'template_sections',
    'template_questions',
    'responses',
    'response_answers',
    'magic_links',
    'ai_conversations',
    'audit_log',
    'project_attachments'
  ];
BEGIN
  FOREACH t IN ARRAY app_tables LOOP
    -- Move table only if it's in public but NOT yet in anforderungsportal
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'anforderungsportal' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA anforderungsportal', t);
      RAISE NOTICE 'Moved table public.% → anforderungsportal.%', t, t;
    END IF;
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: Move helper functions from public → anforderungsportal
-- Note: RLS policies reference these as public.fn(), so we keep them in public
-- AND create aliases in anforderungsportal for convenience.
-- ─────────────────────────────────────────────────────────────────────────────
-- Functions stay in public (referenced in RLS as public.get_user_org_id() etc.)
-- No action needed here — public functions remain accessible.

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Grant permissions on anforderungsportal schema
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA anforderungsportal TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA anforderungsportal TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA anforderungsportal TO authenticated, service_role;
-- Ensure future tables get the same grants automatically
ALTER DEFAULT PRIVILEGES IN SCHEMA anforderungsportal
  GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA anforderungsportal
  GRANT ALL ON SEQUENCES TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Update PostgREST configuration to expose anforderungsportal
-- This replaces the old 'anforderungen' in the schemas list if present
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  current_schemas TEXT;
BEGIN
  -- Read current pgrst.db_schemas setting
  BEGIN
    SELECT current_setting('pgrst.db_schemas') INTO current_schemas;
  EXCEPTION WHEN OTHERS THEN
    current_schemas := 'public';
  END;

  -- Replace 'anforderungen' with 'anforderungsportal'
  current_schemas := replace(current_schemas, 'anforderungen', 'anforderungsportal');

  -- Ensure 'anforderungsportal' is included
  IF position('anforderungsportal' IN current_schemas) = 0 THEN
    current_schemas := current_schemas || ', anforderungsportal';
  END IF;

  PERFORM set_config('pgrst.db_schemas', current_schemas, false);
  RAISE NOTICE 'PostgREST db_schemas updated to: %', current_schemas;
END $$;

-- Persist the PostgREST schema config on the authenticator role
DO $$
DECLARE
  current_schemas TEXT;
BEGIN
  BEGIN
    SELECT current_setting('pgrst.db_schemas') INTO current_schemas;
  EXCEPTION WHEN OTHERS THEN
    current_schemas := 'public, anforderungsportal';
  END;

  IF position('anforderungsportal' IN current_schemas) = 0 THEN
    current_schemas := 'public, anforderungsportal';
  END IF;

  EXECUTE format(
    'ALTER ROLE authenticator SET pgrst.db_schemas TO %L',
    current_schemas
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update authenticator role settings (may need superuser). Run manually: ALTER ROLE authenticator SET pgrst.db_schemas TO ''public, anforderungsportal'';';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: Verify the result
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
  expected_tables TEXT[] := ARRAY[
    'organizations', 'projects', 'project_members',
    'requirement_templates', 'template_sections', 'template_questions',
    'responses', 'response_answers', 'magic_links',
    'ai_conversations', 'audit_log'
  ];
  missing TEXT[] := '{}';
BEGIN
  FOREACH t IN ARRAY expected_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'anforderungsportal' AND table_name = t
    ) THEN
      missing := array_append(missing, t);
    END IF;
  END LOOP;

  IF array_length(missing, 1) IS NULL THEN
    RAISE NOTICE '✓ All core Anforderungsportal tables confirmed in anforderungsportal schema.';
  ELSE
    RAISE WARNING 'Missing tables in anforderungsportal: %', missing;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 8: Reload PostgREST schema cache
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
