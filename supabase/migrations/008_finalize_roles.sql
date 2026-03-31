-- =============================================================================
-- Migration 008: Finalize role architecture
-- =============================================================================
-- Changes:
--   1. Create dedicated super_admin system account (admin@wamocon.com)
--      — not tied to any real person; emergency/system access only
--   2. Maanik → product_owner JWT (uses Client Portal to fill own requirements)
--   3. elnay.akhverdiev → product_owner JWT (fix broken 'client' JWT role from old schema)
--
-- Final role design:
--   super_admin   → admin@wamocon.com            → Admin Dashboard (system only)
--   staff         → waleri.moretz@wamocon.com    → Admin Dashboard (CEO, reviews all)
--   product_owner → everyone else                → Client Portal (fills requirements)
--
-- The word "product_owner" now means the same thing everywhere:
--   JWT: routes user to Client Portal to fill requirement forms
--   project_members.role: labels the person who owns/drives that specific app idea
-- =============================================================================

-- 1. Create system admin account
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@wamocon.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0099-000000000001',
      'authenticated', 'authenticated',
      'admin@wamocon.com',
      crypt('Admin@WMC2026!Secure', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0099-000000000001","role":"super_admin","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"WMC System Admin"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'e0000000-0000-0000-0099-000000000001',
      'c0000000-0000-0000-0099-000000000001',
      'email',
      '{"sub":"c0000000-0000-0000-0099-000000000001","email":"admin@wamocon.com","email_verified":true,"phone_verified":false}',
      'admin@wamocon.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- 2. Maanik → product_owner (fills requirements for his own apps in Client Portal)
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"product_owner"')
WHERE email = 'maanik.garg@wamocon.com'
  AND raw_app_meta_data->>'role' = 'super_admin';

-- 3. Fix any remaining broken 'client' JWT roles → product_owner
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"product_owner"')
WHERE raw_app_meta_data->>'role' = 'client';

NOTIFY pgrst, 'reload schema';
