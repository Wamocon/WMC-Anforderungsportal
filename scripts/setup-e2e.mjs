#!/usr/bin/env node
/**
 * E2E Environment Setup Script
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage:
 *   node scripts/setup-e2e.mjs
 *
 * Requirements (add to .env.local):
 *   SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard → Settings → API>
 *   E2E_SEED_SECRET=e2e-secret-replace-me
 *
 * Alternatively: paste supabase/migrations/009_fix_e2e_auth.sql into the
 * Supabase Dashboard → SQL Editor and click "Run".
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env.local manually (no dotenv dependency needed in scripts)
function loadEnv(filePath) {
  try {
    const text = readFileSync(filePath, 'utf-8');
    for (const line of text.split('\n')) {
      const stripped = line.trim();
      if (!stripped || stripped.startsWith('#')) continue;
      const eq = stripped.indexOf('=');
      if (eq === -1) continue;
      const key = stripped.slice(0, eq).trim();
      const val = stripped.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* file may not exist */ }
}

loadEnv(resolve(root, '.env.local'));
loadEnv(resolve(root, '.env.test.local'));

const SUPABASE_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORG_ID          = 'a0000000-0000-0000-0000-000000000001';
const ADMIN_EMAIL     = 'admin@wamocon.com';
const ADMIN_PASS      = process.env.E2E_SUPER_ADMIN_PASS || 'Admin2026!';
const MAANIK_EMAIL    = process.env.E2E_PRODUCT_OWNER_EMAIL || 'maanik.garg@wamocon.com';

if (!SUPABASE_URL) { console.error('❌ NEXT_PUBLIC_SUPABASE_URL not set'); process.exit(1); }
if (!SERVICE_KEY || SERVICE_KEY === 'your-service-role-key') {
  console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY is not set or still has the placeholder value.\n');
  console.error('   Steps to fix:');
  console.error('   1. Open https://supabase.com/dashboard/project/acgxydrisfjbilfgatkq/settings/api');
  console.error('   2. Copy the "service_role" key (click "Reveal")');
  console.error('   3. Replace "your-service-role-key" in .env.local with the real key');
  console.error('   4. Re-run: node scripts/setup-e2e.mjs\n');
  console.error('   OR: paste supabase/migrations/009_fix_e2e_auth.sql into');
  console.error('       Supabase Dashboard → SQL Editor and click Run.\n');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  console.log('\n🔧 Setting up E2E test accounts...\n');

  // ── 1. admin@wamocon.com ─────────────────────────────────────────────────
  console.log(`[1/3] Fixing ${ADMIN_EMAIL}...`);
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });

  const existingAdmin = users?.find(u => u.email === ADMIN_EMAIL);
  if (existingAdmin) {
    const { error } = await admin.auth.admin.updateUserById(existingAdmin.id, {
      password: ADMIN_PASS,
      email_confirm: true,
      app_metadata: { role: 'super_admin', org_id: ORG_ID },
    });
    console.log(error ? `  ❌ Update failed: ${error.message}` : `  ✅ Updated (id: ${existingAdmin.id})`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASS,
      email_confirm: true,
      app_metadata: { role: 'super_admin', org_id: ORG_ID },
      user_metadata: { full_name: 'WMC System Admin' },
    });
    console.log(error ? `  ❌ Create failed: ${error.message}` : `  ✅ Created (id: ${data.user?.id})`);
  }

  // ── 2. Maanik project memberships ────────────────────────────────────────
  console.log(`\n[2/3] Fixing ${MAANIK_EMAIL} project memberships...`);
  const maanik = users?.find(u => u.email === MAANIK_EMAIL);
  if (!maanik) {
    console.log(`  ⚠️  User ${MAANIK_EMAIL} not found in auth.users — skipping`);
  } else {
    // Ensure product_owner role
    await admin.auth.admin.updateUserById(maanik.id, {
      app_metadata: { role: 'product_owner', org_id: ORG_ID },
    });

    const db = createClient(SUPABASE_URL, SERVICE_KEY, {
      db: { schema: 'anforderungsportal' },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Ensure org
    await db.from('organizations').upsert({ id: ORG_ID, name: 'Wamocon GmbH', slug: 'wamocon' }, { ignoreDuplicates: true });

    // Ensure profile
    await db.from('profiles').upsert({ id: maanik.id, org_id: ORG_ID, full_name: 'Maanik Garg' }, { ignoreDuplicates: true });

    // Get a template
    const { data: tpl } = await db.from('requirement_templates').select('id').limit(1).maybeSingle();
    const templateId = tpl?.id;

    const projects = [
      { id: 'b0000000-0000-0000-0001-000000000008', name: 'LinkedIn Instagram Automation', slug: 'linkedin-instagram-automation' },
      { id: 'b0000000-0000-0000-0001-000000000009', name: 'KLAR Weiterentwicklung',         slug: 'klar-weiterentwicklung'         },
    ];

    for (const p of projects) {
      await db.from('projects').upsert({
        id: p.id, org_id: ORG_ID, name: p.name, slug: p.slug,
        status: 'active', deadline_days: 14, template_id: templateId,
      }, { onConflict: 'id', ignoreDuplicates: true });

      const { error: me } = await db.from('project_members').upsert(
        { project_id: p.id, user_id: maanik.id, role: 'product_owner' },
        { onConflict: 'project_id,user_id', ignoreDuplicates: true }
      );
      console.log(`  ${me ? '❌' : '✅'} ${p.name}${me ? ': ' + me.message : ''}`);
    }
  }

  // ── 3. Verify ────────────────────────────────────────────────────────────
  console.log('\n[3/3] Verification:');
  const { data: { users: fresh } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const email of [ADMIN_EMAIL, MAANIK_EMAIL]) {
    const u = fresh?.find(x => x.email === email);
    if (u) {
      console.log(`  ✅ ${email} — role: ${u.app_metadata?.role ?? '(none)'}`);
    } else {
      console.log(`  ❌ ${email} — NOT FOUND`);
    }
  }

  console.log('\n✅ Setup complete. You can now run: npx playwright test\n');
}

run().catch(err => { console.error('\n❌ Fatal error:', err); process.exit(1); });
