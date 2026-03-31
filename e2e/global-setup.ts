/**
 * Playwright Global Setup
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs once before all tests. Calls /api/test/seed to ensure:
 *   - admin@wamocon.com exists with correct password
 *   - Maanik's project memberships are in place
 *
 * Requires in .env.local / .env.test.local:
 *   E2E_SEED_SECRET=<random string, same as on server>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { config as loadDotenv } from 'dotenv';
import path from 'path';

loadDotenv({ path: path.resolve(__dirname, '../.env.test.local') });
loadDotenv({ path: path.resolve(__dirname, '../.env.local') });

async function globalSetup() {
  const base   = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
  const secret = process.env.E2E_SEED_SECRET;

  if (!secret) {
    console.warn('\n⚠️  E2E_SEED_SECRET not set — skipping DB seed. Tests may fail.\n');
    return;
  }

  console.log('\n🔧 Running E2E seed via /api/test/seed ...');

  try {
    const res = await fetch(`${base}/api/test/seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
      signal: AbortSignal.timeout(30_000),
    });

    const json = await res.json();

    if (!res.ok) {
      console.warn(`⚠️  Seed endpoint returned ${res.status}: ${JSON.stringify(json)}`);
      if (json.error?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.warn(
          '\n📋 ACTION REQUIRED:\n' +
          '   1. Go to https://supabase.com/dashboard/project/acgxydrisfjbilfgatkq/settings/api\n' +
          '   2. Copy the "service_role" key\n' +
          '   3. Add to .env.local:  SUPABASE_SERVICE_ROLE_KEY=<your-key>\n' +
          '   4. Also add:           E2E_SEED_SECRET=any-random-string\n' +
          '   5. Re-run:             npm run build && npm start\n' +
          '   OR: paste supabase/migrations/009_fix_e2e_auth.sql into Supabase Dashboard → SQL Editor\n'
        );
      }
    } else {
      console.log('✅ Seed results:', JSON.stringify(json.results, null, 2));
    }
  } catch (e) {
    console.warn(`⚠️  Could not reach seed endpoint: ${e}. Proceeding anyway.`);
  }

  console.log('');
}

export default globalSetup;
