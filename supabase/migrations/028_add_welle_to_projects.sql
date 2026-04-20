-- Migration 028: Add "Welle" (Wave/Phase) to projects
-- A Welle tracks which development wave/sprint a project belongs to.
-- Welle 1 = MVP, Welle 2 = Extension, Welle 3 = Integration, Welle 4+ = Scale

ALTER TABLE anforderungsportal.projects
  ADD COLUMN IF NOT EXISTS welle smallint CHECK (welle >= 1 AND welle <= 10),
  ADD COLUMN IF NOT EXISTS welle_notes text;

COMMENT ON COLUMN anforderungsportal.projects.welle IS
  'Development wave/sprint number. Set by product owner on creation.';

COMMENT ON COLUMN anforderungsportal.projects.welle_notes IS
  'Optional notes about what should be included/excluded in this wave.';

NOTIFY pgrst, 'reload schema';
