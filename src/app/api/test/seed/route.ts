/**
 * E2E Test Seed Endpoint
 * ─────────────────────────────────────────────────────────────────────────────
 * POST /api/test/seed
 *   { "secret": "<E2E_SEED_SECRET>" }
 *
 * Idempotently creates / fixes:
 *   1. admin@wamocon.com — super_admin JWT role, password Admin@WMC2026!Secure
 *   2. Maanik's project memberships (KLAR + LinkedIn/Instagram)
 *
 * NEVER callable in production (NODE_ENV check + secret token guard).
 * Add to .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY=<from Supabase Dashboard → Settings → API>
 *   E2E_SEED_SECRET=<any random string, e.g. openssl rand -hex 32>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL   = 'admin@wamocon.com';
const ADMIN_PASS    = 'Admin@WMC2026!Secure';
const MAANIK_EMAIL  = 'maanik.garg@wamocon.com';
const ORG_ID        = 'a0000000-0000-0000-0000-000000000001';

const MAANIK_PROJECTS = [
  { id: 'b0000000-0000-0000-0001-000000000008', name: 'LinkedIn Instagram Automation', slug: 'linkedin-instagram-automation' },
  { id: 'b0000000-0000-0000-0001-000000000009', name: 'KLAR Weiterentwicklung',         slug: 'klar-weiterentwicklung'         },
];

export async function POST(req: Request) {
  // Only allow in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  // Validate secret token
  const secret = process.env.E2E_SEED_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'E2E_SEED_SECRET not configured' }, { status: 500 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.secret !== secret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  // Build admin client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const srvKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!srvKey || srvKey === 'your-service-role-key') {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY is not set. See Supabase Dashboard → Settings → API',
    }, { status: 500 });
  }

  // Use the raw supabase-js admin client (auth schema access)
  const adminAuth = createClient(url, srvKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: Record<string, string> = {};

  // ── 1. Create / update admin@wamocon.com ───────────────────────────────────
  try {
    const { data: existingUsers } = await adminAuth.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL);

    if (existing) {
      const { error } = await adminAuth.auth.admin.updateUserById(existing.id, {
        password: ADMIN_PASS,
        email_confirm: true,
        app_metadata: { role: 'super_admin', org_id: ORG_ID },
      });
      results.adminUser = error ? `update failed: ${error.message}` : 'updated';
    } else {
      const { error } = await adminAuth.auth.admin.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        email_confirm: true,
        app_metadata: { role: 'super_admin', org_id: ORG_ID },
        user_metadata: { full_name: 'WMC System Admin' },
      });
      results.adminUser = error ? `create failed: ${error.message}` : 'created';
    }
  } catch (e: unknown) {
    results.adminUser = `error: ${String(e)}`;
  }

  // ── 2. Fix Maanik's project memberships ────────────────────────────────────
  try {
    const { data: maanikUser } = await adminAuth.auth.admin.listUsers();
    const maanik = maanikUser?.users?.find(u => u.email === MAANIK_EMAIL);
    if (!maanik) {
      results.maanikProjects = 'maanik user not found';
    } else {
      // Ensure product_owner role
      await adminAuth.auth.admin.updateUserById(maanik.id, {
        app_metadata: { role: 'product_owner', org_id: ORG_ID },
      });

      // Use admin DB client to fix memberships
      const db = createClient(url, srvKey, {
        db: { schema: 'anforderungsportal' },
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Ensure projects exist
      for (const project of MAANIK_PROJECTS) {
        const { data: tpl } = await db.from('requirement_templates').select('id').limit(1).single();
        await db.from('projects').upsert({
          id: project.id,
          org_id: ORG_ID,
          name: project.name,
          slug: project.slug,
          status: 'active',
          deadline_days: 14,
          template_id: tpl?.id,
        }, { onConflict: 'id', ignoreDuplicates: true });
      }

      // Ensure memberships
      const memberRows = MAANIK_PROJECTS.map(p => ({
        project_id: p.id,
        user_id: maanik.id,
        role: 'product_owner' as const,
      }));
      const { error: memberError } = await db
        .from('project_members')
        .upsert(memberRows, { onConflict: 'project_id,user_id', ignoreDuplicates: true });

      results.maanikProjects = memberError ? `failed: ${memberError.message}` : 'ok';
    }
  } catch (e: unknown) {
    results.maanikProjects = `error: ${String(e)}`;
  }

  return NextResponse.json({ ok: true, results });
}
