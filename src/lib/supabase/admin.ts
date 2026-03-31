import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Admin / service-role Supabase client — bypasses RLS.
 * Only use in server-side code (API routes, scripts). Never expose to the client.
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === 'your-service-role-key') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Go to Supabase Dashboard → Settings → API → service_role key and add it to .env.local'
    );
  }
  return createClient<Database, 'anforderungsportal'>(url, key, {
    db: { schema: 'anforderungsportal' },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
