-- =============================================================================
-- Migration 010: Production auth fixes
-- =============================================================================
-- Fixes applied directly to live DB (documented here for reproducibility):
--
--   1. Email corrections (wrong domains → wamocon.com):
--      daniel.moritz@rate1.com    → daniel.moritz@wamocon.com
--      yash.bhasani@babakhan.com  → yash.bhasani@wamocon.com
--      elias.felzing@bamakon.com  → elias.felzing@wamocon.com
--
--   2. Full name fixes:
--      maanik.garg@wamocon.com   → full_name = "Maanik Garg"
--      nurzhan@wamocon.com       → full_name = "Nurzhan Kukeyev"
--
--   3. admin@wamocon.com password reset (password unchanged, hash reimported)
--
--   4. GoTrue compatibility:
--      a. instance_id = '00000000-0000-0000-0000-000000000000' required
--         (SQL INSERTs left it NULL; GoTrue query filters by this value)
--      b. raw_app_meta_data must include "provider":"email","providers":["email"]
--      c. auth.identities: id must equal user_id (new GoTrue format)
--         (old migrations used separate UUIDs for identity.id)
--
-- All these were applied live; this migration is idempotent for fresh deploys.
-- =============================================================================

-- ── 1. Email corrections ─────────────────────────────────────────────────────

UPDATE auth.users SET email = 'daniel.moritz@wamocon.com'
WHERE email = 'daniel.moritz@rate1.com';

UPDATE auth.identities
SET provider_id = 'daniel.moritz@wamocon.com',
    identity_data = jsonb_set(jsonb_set(identity_data, '{email}', '"daniel.moritz@wamocon.com"'), '{email_verified}', 'true')
WHERE provider_id = 'daniel.moritz@rate1.com';

UPDATE auth.users SET email = 'yash.bhasani@wamocon.com'
WHERE email = 'yash.bhasani@babakhan.com';

UPDATE auth.identities
SET provider_id = 'yash.bhasani@wamocon.com',
    identity_data = jsonb_set(jsonb_set(identity_data, '{email}', '"yash.bhasani@wamocon.com"'), '{email_verified}', 'true')
WHERE provider_id = 'yash.bhasani@babakhan.com';

UPDATE auth.users SET email = 'elias.felzing@wamocon.com'
WHERE email = 'elias.felzing@bamakon.com';

UPDATE auth.identities
SET provider_id = 'elias.felzing@wamocon.com',
    identity_data = jsonb_set(jsonb_set(identity_data, '{email}', '"elias.felzing@wamocon.com"'), '{email_verified}', 'true')
WHERE provider_id = 'elias.felzing@bamakon.com';

-- ── 2. Full name corrections ─────────────────────────────────────────────────

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'), '{full_name}', '"Maanik Garg"')
WHERE email = 'maanik.garg@wamocon.com';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'), '{full_name}', '"Nurzhan Kukeyev"')
WHERE email = 'nurzhan@wamocon.com';

-- ── 3. admin@wamocon.com password reset ──────────────────────────────────────

UPDATE auth.users
SET
  encrypted_password = crypt('Admin@WMC2026!Secure', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  raw_app_meta_data  = jsonb_set(COALESCE(raw_app_meta_data, '{}'), '{role}', '"super_admin"')
WHERE email = 'admin@wamocon.com';

-- ── 4a. GoTrue compatibility: instance_id ────────────────────────────────────
-- Critical: GoTrue filters users by instance_id = '00000000-...' in all queries.
-- SQL-inserted users default to NULL, making them invisible to GoTrue.

UPDATE auth.users
SET instance_id = '00000000-0000-0000-0000-000000000000'
WHERE instance_id IS NULL
  AND aud = 'authenticated';

-- ── 4b. GoTrue compatibility: provider in app_meta_data ──────────────────────
-- GoTrue sets "provider":"email","providers":["email"] on signup.
-- SQL-created users are missing these fields, causing auth to fail.

UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"provider":"email","providers":["email"]}'::jsonb
WHERE aud = 'authenticated'
  AND (raw_app_meta_data->>'provider' IS NULL OR raw_app_meta_data->>'providers' IS NULL);

-- ── 4c. GoTrue compatibility: fix identity records ───────────────────────────
-- GoTrue requires auth.identities.id = user.id for email provider (new format).
-- Delete old-format identities and recreate with correct id.

DELETE FROM auth.identities
WHERE provider = 'email'
  AND id != user_id;

INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
SELECT
  u.id,
  u.id,
  u.id::text,
  'email',
  jsonb_build_object(
    'sub',            u.id::text,
    'email',          u.email,
    'email_verified', true,
    'phone_verified', false
  ),
  NULL,
  now(),
  now()
FROM auth.users u
WHERE aud = 'authenticated'
ON CONFLICT (id) DO UPDATE SET
  provider_id   = EXCLUDED.provider_id,
  identity_data = EXCLUDED.identity_data,
  updated_at    = now();

-- ── 5. Ensure all product owners have correct JWT role ───────────────────────

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'), '{role}', '"product_owner"')
WHERE email IN (
  'daniel.moritz@wamocon.com', 'niko.scheffner@wamocon.com', 'yash.bhasani@wamocon.com',
  'erwin@wamocon.com', 'nurzhan@wamocon.com', 'leon.moritz@wamocon.com',
  'elias.felzing@wamocon.com', 'elnay.akhverdiev@gmail.com', 'maanik.garg@wamocon.com'
);

UPDATE auth.users
SET raw_app_meta_data = jsonb_set(COALESCE(raw_app_meta_data, '{}'), '{role}', '"staff"')
WHERE email = 'waleri.moretz@wamocon.com';

-- ── 6. Fix PostgREST search path (critical for custom schema access) ──────────
-- Migration 006 left pgrst.db_extra_search_path pointing to the old 'anforderungen'
-- schema which no longer exists. This causes PostgREST to fail loading its schema
-- cache with PGRST002 errors, making ALL REST API queries fail.

ALTER ROLE authenticator SET "pgrst.db_extra_search_path" TO 'public, anforderungsportal';

-- Reload PostgREST to pick up the change
NOTIFY pgrst, 'reload schema';

-- ── 7. Verification query ─────────────────────────────────────────────────────

SELECT
  u.email,
  u.raw_user_meta_data->>'full_name'  AS full_name,
  u.raw_app_meta_data->>'role'        AS jwt_role,
  u.raw_app_meta_data->>'provider'    AS provider,
  u.instance_id = '00000000-0000-0000-0000-000000000000' AS instance_ok,
  u.email_confirmed_at IS NOT NULL    AS confirmed,
  i.id = u.id                         AS identity_ok,
  COUNT(pm.project_id)                AS project_count
FROM auth.users u
LEFT JOIN auth.identities i           ON i.user_id = u.id AND i.provider = 'email'
LEFT JOIN anforderungsportal.project_members pm ON pm.user_id = u.id
WHERE u.email IN (
  'admin@wamocon.com', 'waleri.moretz@wamocon.com',
  'daniel.moritz@wamocon.com', 'niko.scheffner@wamocon.com', 'yash.bhasani@wamocon.com',
  'erwin@wamocon.com', 'nurzhan@wamocon.com', 'leon.moritz@wamocon.com',
  'elias.felzing@wamocon.com', 'elnay.akhverdiev@gmail.com', 'maanik.garg@wamocon.com'
)
GROUP BY u.email, u.raw_user_meta_data, u.raw_app_meta_data, u.instance_id, u.email_confirmed_at, i.id, u.id
ORDER BY u.raw_app_meta_data->>'role', u.email;
