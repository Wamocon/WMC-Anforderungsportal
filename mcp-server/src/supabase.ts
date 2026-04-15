import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = ReturnType<typeof createSupabaseClient<any, any, any>>;

// ── Public defaults (same as NEXT_PUBLIC_* — safe to embed) ───
const DEFAULT_SUPABASE_URL = 'https://acgxydrisfjbilfgatkq.supabase.co';
const DEFAULT_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZ3h5ZHJpc2ZqYmlsZmdhdGtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2Njc4MDYsImV4cCI6MjA4OTI0MzgwNn0.' +
  'ToHAnBjatAOHGzyXf1oqS7R1-A6wBik_sHXeXtL12UI';

let _serviceClient: AnySupabaseClient | null = null;

// ── Session state ─────────────────────────────────────────────
interface Session {
  accessToken: string;
  refreshToken: string;
  email: string;
  userId: string;
  role: string;
  expiresAt: number; // Unix epoch seconds
}

let _session: Session | null = null;
let _sessionClient: AnySupabaseClient | null = null;

export function getSession(): Session | null { return _session; }

export function setSession(s: Session | null): void {
  _session = s;
  _sessionClient = null; // force re-create on next call
}

function getUrl(): string {
  return process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
}

function getAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
}

/**
 * Returns true when a service-role key is configured (admin/god mode available).
 */
export function hasServiceKey(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Get the service-role client (admin / bypass RLS).
 */
export function getServiceClient(): AnySupabaseClient {
  if (_serviceClient) return _serviceClient;
  const url = getUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  _serviceClient = createSupabaseClient(url, key, {
    db: { schema: 'anforderungsportal' },
    auth: { persistSession: false },
  }) as AnySupabaseClient;
  return _serviceClient;
}

/**
 * Get a user-scoped client using the current session JWT.
 * Falls back to anon key + access_token header.
 */
function getSessionClient(): AnySupabaseClient {
  if (_sessionClient) return _sessionClient;
  if (!_session) throw new Error('No active session. Use the login tool first.');
  const url = getUrl();
  const key = getAnonKey();
  _sessionClient = createSupabaseClient(url, key, {
    db: { schema: 'anforderungsportal' },
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${_session.accessToken}` } },
  }) as AnySupabaseClient;
  return _sessionClient;
}

/**
 * Smart client selector:
 * - If a user is logged in → return session-scoped client (RLS enforced)
 * - If service-role key exists → return admin client (RLS bypassed)
 * - Otherwise → throw (login required)
 */
export function getSupabaseClient(): AnySupabaseClient {
  if (_session) return getSessionClient();
  if (hasServiceKey()) return getServiceClient();
  throw new Error('Not logged in. Use the `login` tool first (no admin key configured).');
}

/**
 * Auth helper: sign in with email + password using the Supabase Auth API,
 * then look up the user's role in project_members.
 */
export async function signIn(email: string, password: string): Promise<Session> {
  const url = getUrl();
  const key = getAnonKey();
  const authClient = createSupabaseClient(url, key, {
    db: { schema: 'anforderungsportal' },
    auth: { persistSession: false },
  });

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login failed: ${error.message}`);
  if (!data.session) throw new Error('Login failed: no session returned');

  // Look up role — use service client if available, otherwise the user's own session
  const lookupClient = hasServiceKey()
    ? getServiceClient()
    : createSupabaseClient(url, key, {
        db: { schema: 'anforderungsportal' },
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      });
  const { data: membership } = await lookupClient
    .from('project_members')
    .select('role')
    .eq('user_id', data.user.id)
    .limit(1)
    .single();

  const role = membership?.role ?? 'authenticated';

  const session: Session = {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    email: data.user.email ?? email,
    userId: data.user.id,
    role,
    expiresAt: Math.floor(Date.now() / 1000) + (data.session.expires_in ?? 3600),
  };

  setSession(session);
  return session;
}

export function signOut(): void {
  setSession(null);
}

/**
 * @deprecated Use getSupabaseClient() instead — kept for backwards compat.
 */
export function getSupabaseClientForUser(accessToken: string): AnySupabaseClient {
  const url = getUrl();
  const key = getAnonKey();
  return createSupabaseClient(url, key, {
    db: { schema: 'anforderungsportal' },
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  }) as AnySupabaseClient;
}
