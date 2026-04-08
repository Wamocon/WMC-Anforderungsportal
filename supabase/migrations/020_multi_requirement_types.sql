-- Migration 020: Convert requirement_type to multi-select array
-- ─────────────────────────────────────────────────────────────────────────────
-- Modern projects (April 2026) span multiple platforms:
--   • Web Application
--   • Mobile Application
--   • AI Application
-- A project can be any combination (e.g. Web + AI, Mobile + Web + AI, etc.).
--
-- Changes:
--   1. Drop old CHECK constraint (single text value)
--   2. Convert column from text → text[] (array)
--   3. Migrate 'app_development' → ARRAY['web_application']
--   4. Migrate 'ai_development' → ARRAY['ai_application']
--   5. Add new CHECK: values ⊆ {web_application, mobile_application, ai_application}
--   6. Recreate GIN index for array containment queries
-- ─────────────────────────────────────────────────────────────────────────────

SET search_path TO anforderungsportal, public;

-- 1) Drop the old CHECK constraint
DO $$ BEGIN
  -- The constraint may be named differently depending on how it was created
  ALTER TABLE anforderungsportal.projects
    DROP CONSTRAINT IF EXISTS projects_requirement_type_check;

  -- Also try the auto-generated name pattern
  ALTER TABLE anforderungsportal.projects
    DROP CONSTRAINT IF EXISTS projects_check;
EXCEPTION WHEN undefined_object THEN
  NULL; -- constraint doesn't exist, that's fine
END $$;

-- 2) Drop old btree index
DROP INDEX IF EXISTS anforderungsportal.idx_projects_requirement_type;

-- 3) Drop old default before type conversion
ALTER TABLE anforderungsportal.projects
  ALTER COLUMN requirement_type DROP DEFAULT;

-- 4) Convert column from text to text[]
ALTER TABLE anforderungsportal.projects
  ALTER COLUMN requirement_type TYPE text[]
  USING ARRAY[requirement_type];

-- 4) Migrate old values to new naming
UPDATE anforderungsportal.projects
  SET requirement_type = ARRAY['web_application']
  WHERE requirement_type = ARRAY['app_development'];

UPDATE anforderungsportal.projects
  SET requirement_type = ARRAY['ai_application']
  WHERE requirement_type = ARRAY['ai_development'];

-- 5) Set proper default for new projects
ALTER TABLE anforderungsportal.projects
  ALTER COLUMN requirement_type SET DEFAULT ARRAY['web_application']::text[];

-- 6) Add CHECK constraint: at least one type, all values must be valid
ALTER TABLE anforderungsportal.projects
  ADD CONSTRAINT projects_requirement_type_check
  CHECK (
    requirement_type <@ ARRAY['web_application', 'mobile_application', 'ai_application']::text[]
    AND array_length(requirement_type, 1) > 0
  );

-- 7) Create GIN index for efficient array queries
CREATE INDEX IF NOT EXISTS idx_projects_requirement_type
  ON anforderungsportal.projects USING GIN (requirement_type);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
