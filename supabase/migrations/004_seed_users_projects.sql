-- =============================================================================
-- Migration 004: Seed project owners, projects, and member assignments
-- =============================================================================
-- ROLE DESIGN:
--   super_admin   → admin@wamocon.com          → Admin Dashboard (system account)
--   staff         → waleri.moretz@wamocon.com  → Admin Dashboard (CEO/reviewer)
--   product_owner → everyone else              → Client Portal (fill requirements)
--
-- Projects (project_members.role = product_owner on their own app idea):
--   WedBudget              → Daniel Moritz       (product_owner)
--   TRACE V2               → Niko Scheffner      (product_owner)
--   AWAY V2                → Niko Scheffner      (product_owner)
--   Social Hub Weiterentw. → Maanik Garg         (product_owner, already exists)
--   Meine Wohnung V2       → Yash Bhasani        (product_owner)
--   Energiekosten KMU      → Erwin               (product_owner)
--   KfBM                   → Nurzhan + Leon + Elias (all product_owner)
--
-- Waleri → project_members role = 'client' on ALL projects (he is the reviewer/recipient)
--
-- ⚠️  EMAIL VERIFICATION REQUIRED before deploying to production:
--   daniel.moritz@rate1.com  — confirm domain "rate1.com"
--   niko.scheffner@wamocon.com — unconfirmed (update if different)
--   yash.bhasani@babakhan.com  — from verbal instruction
--   erwin@wamocon.com          — last name unknown; update full email
--   nurzhan@wamocon.com        — update if different domain
--   elias.felzing@bamakon.com  — confirm domain "bamakon.com"
-- =============================================================================

-- ─────────────────────────────────────────────────
-- PART 0: Ensure WMC org exists
-- ─────────────────────────────────────────────────
INSERT INTO anforderungsportal.organizations (id, name, slug)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Wamocon GmbH', 'wamocon')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────
-- PART 1: Create auth users
-- Pattern: empty strings for nullable token/change columns (GoTrue requirement)
--          phone = NULL (UNIQUE constraint; '' would conflict)
--          email_confirmed_at = now() (no email verification flow needed)
-- ─────────────────────────────────────────────────

-- 1a. Valerie (WMC manager / admin - accesses admin dashboard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'valerie@wamocon.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0001-000000000008',
      'authenticated', 'authenticated',
      'valerie@wamocon.com',
      crypt('REDACTED', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0001-000000000008","role":"staff","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"Valerie"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd0000000-0000-0000-0001-000000000008',
      'c0000000-0000-0000-0001-000000000008',
      'email',
      '{"sub":"c0000000-0000-0000-0001-000000000008","email":"valerie@wamocon.com","email_verified":false,"phone_verified":false}',
      'valerie@wamocon.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- 1b. Daniel Moritz (client portal — product_owner on WedBudget)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'daniel.moritz@rate1.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0001-000000000001',
      'authenticated', 'authenticated',
      'daniel.moritz@rate1.com',
      crypt('REDACTED', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0001-000000000001","role":"client","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"Daniel Moritz"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd0000000-0000-0000-0001-000000000001',
      'c0000000-0000-0000-0001-000000000001',
      'email',
      '{"sub":"c0000000-0000-0000-0001-000000000001","email":"daniel.moritz@rate1.com","email_verified":false,"phone_verified":false}',
      'daniel.moritz@rate1.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- 1c. Niko Scheffner (client portal — product_owner on TRACE V2 + AWAY V2)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'niko.scheffner@wamocon.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0001-000000000002',
      'authenticated', 'authenticated',
      'niko.scheffner@wamocon.com',
      crypt('Niko2026!', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0001-000000000002","role":"client","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"Niko Scheffner"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd0000000-0000-0000-0001-000000000002',
      'c0000000-0000-0000-0001-000000000002',
      'email',
      '{"sub":"c0000000-0000-0000-0001-000000000002","email":"niko.scheffner@wamocon.com","email_verified":false,"phone_verified":false}',
      'niko.scheffner@wamocon.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- 1d. Yash Bhasani (client portal — product_owner on Meine Wohnung V2)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'yash.bhasani@babakhan.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0001-000000000003',
      'authenticated', 'authenticated',
      'yash.bhasani@babakhan.com',
      crypt('Yash2026!', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0001-000000000003","role":"client","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"Yash Bhasani"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd0000000-0000-0000-0001-000000000003',
      'c0000000-0000-0000-0001-000000000003',
      'email',
      '{"sub":"c0000000-0000-0000-0001-000000000003","email":"yash.bhasani@babakhan.com","email_verified":false,"phone_verified":false}',
      'yash.bhasani@babakhan.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- 1e. Erwin (client portal — product_owner on Energiekosten KMU)
--     ⚠️  Update email and full_name once last name is confirmed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'erwin@wamocon.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0001-000000000004',
      'authenticated', 'authenticated',
      'erwin@wamocon.com',
      crypt('Erwin2026!', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0001-000000000004","role":"client","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"Erwin"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd0000000-0000-0000-0001-000000000004',
      'c0000000-0000-0000-0001-000000000004',
      'email',
      '{"sub":"c0000000-0000-0000-0001-000000000004","email":"erwin@wamocon.com","email_verified":false,"phone_verified":false}',
      'erwin@wamocon.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- 1f. Nurzhan (client portal — product_owner on KfBM, supervisor of Azubis)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'nurzhan@wamocon.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0001-000000000005',
      'authenticated', 'authenticated',
      'nurzhan@wamocon.com',
      crypt('Nurzhan2026!', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0001-000000000005","role":"client","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"Nurzhan"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd0000000-0000-0000-0001-000000000005',
      'c0000000-0000-0000-0001-000000000005',
      'email',
      '{"sub":"c0000000-0000-0000-0001-000000000005","email":"nurzhan@wamocon.com","email_verified":false,"phone_verified":false}',
      'nurzhan@wamocon.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- 1g. Leon Moritz (client portal — product_owner on KfBM, Azubi)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'leon.moritz@wamocon.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0001-000000000006',
      'authenticated', 'authenticated',
      'leon.moritz@wamocon.com',
      crypt('Leon2026!', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0001-000000000006","role":"client","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"Leon Moritz"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd0000000-0000-0000-0001-000000000006',
      'c0000000-0000-0000-0001-000000000006',
      'email',
      '{"sub":"c0000000-0000-0000-0001-000000000006","email":"leon.moritz@wamocon.com","email_verified":false,"phone_verified":false}',
      'leon.moritz@wamocon.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- 1h. Elias Felzing (client portal — product_owner on KfBM, Azubi)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'elias.felzing@bamakon.com') THEN
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, created_at, updated_at,
      confirmation_token, recovery_token,
      email_change, email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      'c0000000-0000-0000-0001-000000000007',
      'authenticated', 'authenticated',
      'elias.felzing@bamakon.com',
      crypt('Elias2026!', gen_salt('bf')),
      now(),
      '{"sub":"c0000000-0000-0000-0001-000000000007","role":"client","org_id":"a0000000-0000-0000-0000-000000000001"}',
      '{"full_name":"Elias Felzing"}',
      false, now(), now(),
      '', '', '', '', '', '', '', ''
    );
    INSERT INTO auth.identities (
      id, user_id, provider, identity_data, provider_id, last_sign_in_at, created_at, updated_at
    ) VALUES (
      'd0000000-0000-0000-0001-000000000007',
      'c0000000-0000-0000-0001-000000000007',
      'email',
      '{"sub":"c0000000-0000-0000-0001-000000000007","email":"elias.felzing@bamakon.com","email_verified":false,"phone_verified":false}',
      'elias.felzing@bamakon.com',
      NULL, now(), now()
    );
  END IF;
END $$;

-- ─────────────────────────────────────────────────
-- PART 2: Create projects
-- All assigned to WMC org, using the default App Requirements template
-- Status: active so they're immediately visible to members
-- ─────────────────────────────────────────────────

INSERT INTO anforderungsportal.projects (id, org_id, name, slug, description, status, deadline_days, template_id, welcome_text)
VALUES
  (
    'b0000000-0000-0000-0001-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'WedBudget',
    'wedbudget',
    'A wedding budget planning and management application.',
    'active',
    14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome to WMC! Please describe your WedBudget project requirements so we can start planning your app.","de":"Willkommen bei WMC! Bitte beschreiben Sie Ihre WedBudget-Projektanforderungen, damit wir mit der Planung Ihrer App beginnen können."}'
  ),
  (
    'b0000000-0000-0000-0001-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'TRACE V2',
    'trace-v2',
    'Second version of the TRACE tracking application.',
    'active',
    14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome to WMC! Please describe your TRACE V2 requirements so we can plan the next version of your app.","de":"Willkommen bei WMC! Bitte beschreiben Sie Ihre TRACE V2 Anforderungen für die nächste Version Ihrer App."}'
  ),
  (
    'b0000000-0000-0000-0001-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'AWAY V2',
    'away-v2',
    'Second version of the AWAY travel application.',
    'active',
    14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome to WMC! Please describe your AWAY V2 requirements for the next version of your travel app.","de":"Willkommen bei WMC! Bitte beschreiben Sie Ihre AWAY V2 Anforderungen für die nächste Version Ihrer Reise-App."}'
  ),
  (
    'b0000000-0000-0000-0001-000000000004',
    'a0000000-0000-0000-0000-000000000001',
    'Social Hub Weiterentwicklung',
    'social-hub-weiterentwicklung',
    'Further development of the Social Hub platform.',
    'active',
    14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome! Please describe the next development phase requirements for Social Hub.","de":"Willkommen! Bitte beschreiben Sie die Anforderungen für die nächste Entwicklungsphase des Social Hub."}'
  ),
  (
    'b0000000-0000-0000-0001-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    'Meine Wohnung V2',
    'meine-wohnung-v2',
    'Second version of the apartment management application.',
    'active',
    14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome to WMC! Please describe your Meine Wohnung V2 requirements for the new version.","de":"Willkommen bei WMC! Bitte beschreiben Sie Ihre Anforderungen für Meine Wohnung V2."}'
  ),
  (
    'b0000000-0000-0000-0001-000000000006',
    'a0000000-0000-0000-0000-000000000001',
    'Energiekosten KMU',
    'energiekosten-kmu',
    'Energy cost management application for small and medium enterprises.',
    'active',
    14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome to WMC! Please describe your Energiekosten KMU app requirements.","de":"Willkommen bei WMC! Bitte beschreiben Sie Ihre Anforderungen für die Energiekosten KMU App."}'
  ),
  (
    'b0000000-0000-0000-0001-000000000007',
    'a0000000-0000-0000-0000-000000000001',
    'KfBM',
    'kfbm',
    'Kaufmann für Büromanagement — business management training project.',
    'active',
    14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome to WMC! Please describe your KfBM project requirements.","de":"Willkommen bei WMC! Bitte beschreiben Sie Ihre KfBM Projektanforderungen."}'
  )
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────
-- PART 3: Project member assignments
-- product_owner = the person who brought/owns the idea
-- client = Valerie (WMC consultant assigned to each project)
-- Note: unique(project_id, user_id) — one role per project per user
-- ─────────────────────────────────────────────────

-- WedBudget: Daniel (product_owner)
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
VALUES ('b0000000-0000-0000-0001-000000000001', 'c0000000-0000-0000-0001-000000000001', 'product_owner')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- TRACE V2: Niko (product_owner)
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
VALUES ('b0000000-0000-0000-0001-000000000002', 'c0000000-0000-0000-0001-000000000002', 'product_owner')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- AWAY V2: Niko (product_owner)
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
VALUES ('b0000000-0000-0000-0001-000000000003', 'c0000000-0000-0000-0001-000000000002', 'product_owner')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Social Hub Weiterentwicklung: Maanik (product_owner)
-- Maanik already exists in auth.users — resolved by email subquery
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
SELECT 'b0000000-0000-0000-0001-000000000004', u.id, 'product_owner'
FROM auth.users u
WHERE u.email = 'maanik.garg@wamocon.com'
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Meine Wohnung V2: Yash (product_owner)
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
VALUES ('b0000000-0000-0000-0001-000000000005', 'c0000000-0000-0000-0001-000000000003', 'product_owner')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Energiekosten KMU: Erwin (product_owner)
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
VALUES ('b0000000-0000-0000-0001-000000000006', 'c0000000-0000-0000-0001-000000000004', 'product_owner')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- KfBM: Nurzhan (product_owner / supervisor)
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
VALUES ('b0000000-0000-0000-0001-000000000007', 'c0000000-0000-0000-0001-000000000005', 'product_owner')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- KfBM: Leon Moritz (product_owner / Azubi)
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
VALUES ('b0000000-0000-0000-0001-000000000007', 'c0000000-0000-0000-0001-000000000006', 'product_owner')
ON CONFLICT (project_id, user_id) DO NOTHING;

-- KfBM: Elias Felzing (product_owner / Azubi)
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
VALUES ('b0000000-0000-0000-0001-000000000007', 'c0000000-0000-0000-0001-000000000007', 'product_owner')
ON CONFLICT (project_id, user_id) DO NOTHING;


-- =============================================================================
-- PART 4: Assign Waleri as client on ALL 9 projects
-- Waleri (waleri.moretz@wamocon.com) is the WMC consultant assigned to all projects.
-- JWT role = 'staff' -> admin dashboard access (WMC employees)
-- project_members role = 'client' -> visible in each project
-- NOTE: Waleri already exists in auth.users. Resolved by email subquery.
-- =============================================================================

INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
SELECT p.project_id, u.id, 'client'
FROM (VALUES
  ('b0000000-0000-0000-0001-000000000001'::uuid),
  ('b0000000-0000-0000-0001-000000000002'::uuid),
  ('b0000000-0000-0000-0001-000000000003'::uuid),
  ('b0000000-0000-0000-0001-000000000004'::uuid),
  ('b0000000-0000-0000-0001-000000000005'::uuid),
  ('b0000000-0000-0000-0001-000000000006'::uuid),
  ('b0000000-0000-0000-0001-000000000007'::uuid),
  ('b0000000-0000-0000-0001-000000000008'::uuid),
  ('b0000000-0000-0000-0001-000000000009'::uuid)
) AS p(project_id)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'waleri.moretz@wamocon.com') AS u
ON CONFLICT (project_id, user_id) DO NOTHING;

-- =============================================================================
-- PART 5: Maanik's 2 additional projects (Social Hub already in PART 2)
-- =============================================================================

INSERT INTO anforderungsportal.projects (id, org_id, name, slug, description, status, deadline_days, template_id, welcome_text)
VALUES
  (
    'b0000000-0000-0000-0001-000000000008',
    'a0000000-0000-0000-0000-000000000001',
    'Linkedin & Instagram Automation Weiterentwicklung',
    'linkedin-instagram-automation',
    'Further development of LinkedIn and Instagram automation tools.',
    'active', 14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome! Please describe the next development phase requirements for the LinkedIn & Instagram Automation project.","de":"Willkommen! Bitte beschreiben Sie die Anforderungen fuer die naechste Phase."}'
  ),
  (
    'b0000000-0000-0000-0001-000000000009',
    'a0000000-0000-0000-0000-000000000001',
    'KLAR Weiterentwicklung',
    'klar-weiterentwicklung',
    'Further development of the KLAR application.',
    'active', 14,
    'b0000000-0000-0000-0000-000000000001',
    '{"en":"Welcome! Please describe the next development phase requirements for KLAR.","de":"Willkommen! Bitte beschreiben Sie die Anforderungen fuer die naechste Phase von KLAR."}'
  )
ON CONFLICT (id) DO NOTHING;

-- Maanik as product_owner on both new projects
INSERT INTO anforderungsportal.project_members (project_id, user_id, role)
SELECT p.project_id, u.id, 'product_owner'
FROM (VALUES
  ('b0000000-0000-0000-0001-000000000008'::uuid),
  ('b0000000-0000-0000-0001-000000000009'::uuid)
) AS p(project_id)
CROSS JOIN (SELECT id FROM auth.users WHERE email = 'maanik.garg@wamocon.com') AS u
ON CONFLICT (project_id, user_id) DO NOTHING;

-- =============================================================================
-- SUMMARY: Credentials
-- =============================================================================
-- WMC STAFF (jwt role=staff/super_admin -> admin dashboard):
--   Waleri Moretz   waleri.moretz@wamocon.com   (existing account, password unchanged)
--   Maanik Garg     maanik.garg@wamocon.com     (existing account, password unchanged)
--
-- PRODUCT OWNERS (jwt role=product_owner -> /my-projects -> fill requirement forms):
--   Daniel Moritz   daniel.moritz@rate1.com      REDACTED   -> WedBudget (product_owner)
--   Niko Scheffner  niko.scheffner@wamocon.com   Niko2026!     -> TRACE V2, AWAY V2 (product_owner)
--   Yash Bhasani    yash.bhasani@babakhan.com    Yash2026!     -> Meine Wohnung V2 (product_owner)
--   Erwin           erwin@wamocon.com            Erwin2026!    -> Energiekosten KMU (product_owner)
--   Nurzhan         nurzhan@wamocon.com          Nurzhan2026!  -> KfBM (product_owner)
--   Leon Moritz     leon.moritz@wamocon.com      Leon2026!     -> KfBM (product_owner)
--   Elias Felzing   elias.felzing@bamakon.com    Elias2026!    -> KfBM (product_owner)
