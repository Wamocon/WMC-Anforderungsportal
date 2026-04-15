import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createSupabaseClient<any, any, any>>;

let _client: AnySupabaseClient | null = null;

/**
 * Get a Supabase client configured from environment variables.
 * Supports both service-role (staff) and anon key (PO via their own token).
 */
export function getSupabaseClient(): AnySupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) environment variables.'
    );
  }

  _client = createSupabaseClient(url, key, {
    db: { schema: 'anforderungsportal' },
    auth: { persistSession: false },
  }) as AnySupabaseClient;

  return _client;
}

/**
 * Create an authenticated client for a specific user (PO mode).
 * Uses the user's access token to scope all queries to their RLS policies.
 */
export function getSupabaseClientForUser(accessToken: string): AnySupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }

  return createSupabaseClient(url, key, {
    db: { schema: 'anforderungsportal' },
    auth: { persistSession: false },
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  }) as AnySupabaseClient;
}
