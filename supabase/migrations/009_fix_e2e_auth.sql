-- =============================================================================
-- Migration 009: Fix E2E test accounts
-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor to fix:
--   1. admin@wamocon.com — reset password so E2E tests can log in
--   2. Maanik's project memberships — ensure he can see his projects
-- =============================================================================

-- ─── 1. Ensure admin@wamocon.com exists with correct password ──────────────

DO $$
DECLARE v_uid uuid := 'c0000000-0000-0000-0099-000000000001';
BEGIN
  -- If user already exists, just update the password
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@wamocon.com') THEN
    UPDATE auth.users
    SET
      encrypted_password = crypt('Admin@WMC2026!Secure', gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data  = jsonb_set(
        COALESCE(raw_app_meta_data, '{}'),
        '{role}', '"super_admin"'
      )
    WHERE email = 'admin@wamocon.com';
    RAISE NOTICE 'Updated admin@wamocon.com password';

  ELSE
    -- Create from scratch
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token
    ) VALUES (
      v_uid,
      'authenticated', 'authenticated',
      'admin@wamocon.com',
      crypt('Admin@WMC2026!Secure', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0099-000000000001","role":"super_admin","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"WMC System Admin"}',
      false, now(), now(),
      '', '', '', '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'e0000000-0000-0000-0099-000000000001',
      v_uid,
      'email',
      jsonb_build_object(
        'sub', v_uid::text,
        'email', 'admin@wamocon.com',
        'email_verified', true,
        'phone_verified', false
      ),
      'admin@wamocon.com',
      NULL, now(), now()
    );

    INSERT INTO anforderungsportal.profiles (id, org_id, full_name)
    VALUES (v_uid, 'a0000000-0000-0000-0000-000000000001', 'WMC System Admin')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'Created admin@wamocon.com';
  END IF;
END $$;

-- ─── 2. Ensure Maanik's project memberships exist ─────────────────────────

DO $$
DECLARE v_maanik_id uuid;
BEGIN
  SELECT id INTO v_maanik_id FROM auth.users WHERE email = 'maanik.garg@wamocon.com';
  IF v_maanik_id IS NULL THEN
    RAISE WARNING 'maanik.garg@wamocon.com not found in auth.users — skipping';
    RETURN;
  END IF;

  -- Ensure org exists
  INSERT INTO anforderungsportal.organizations (id, name, slug)
  VALUES ('a0000000-0000-0000-0000-000000000001', 'Wamocon GmbH', 'wamocon')
  ON CONFLICT (id) DO NOTHING;

  -- Ensure Maanik's profile exists
  INSERT INTO anforderungsportal.profiles (id, org_id, full_name)
  VALUES (v_maanik_id, 'a0000000-0000-0000-0000-000000000001', 'Maanik Garg')
  ON CONFLICT (id) DO NOTHING;

  -- Fix JWT role → product_owner
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'), '{role}', '"product_owner"'
  )
  WHERE id = v_maanik_id
    AND (raw_app_meta_data->>'role') IS DISTINCT FROM 'product_owner';

  -- Ensure KLAR project exists
  INSERT INTO anforderungsportal.projects
    (id, org_id, name, slug, description, status, deadline_days, template_id)
  SELECT
    'b0000000-0000-0000-0001-000000000009',
    'a0000000-0000-0000-0000-000000000001',
    'KLAR Weiterentwicklung',
    'klar-weiterentwicklung',
    'Further development of the KLAR application.',
    'active', 14,
    t.id
  FROM anforderungsportal.requirement_templates t
  LIMIT 1
  ON CONFLICT (id) DO NOTHING;

  -- Ensure LinkedIn/Instagram project exists
  INSERT INTO anforderungsportal.projects
    (id, org_id, name, slug, description, status, deadline_days, template_id)
  SELECT
    'b0000000-0000-0000-0001-000000000008',
    'a0000000-0000-0000-0000-000000000001',
    'LinkedIn Instagram Automation',
    'linkedin-instagram-automation',
    'Further development of automation tools.',
    'active', 14,
    t.id
  FROM anforderungsportal.requirement_templates t
  LIMIT 1
  ON CONFLICT (id) DO NOTHING;

  -- Re-create project_member entries for Maanik
  INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
  VALUES
    ('b0000000-0000-0000-0001-000000000008', v_maanik_id, 'product_owner'),
    ('b0000000-0000-0000-0001-000000000009', v_maanik_id, 'product_owner')
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RAISE NOTICE 'Maanik project memberships fixed for user %', v_maanik_id;
END $$;

-- ─── 3. Verify ─────────────────────────────────────────────────────────────

SELECT
  u.email,
  u.raw_app_meta_data->>'role' AS jwt_role,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  COUNT(pm.project_id) AS project_memberships
FROM auth.users u
LEFT JOIN anforderungsportal.project_members pm ON pm.user_id = u.id
WHERE u.email IN ('admin@wamocon.com', 'maanik.garg@wamocon.com')
GROUP BY u.email, u.raw_app_meta_data, u.email_confirmed_at;
