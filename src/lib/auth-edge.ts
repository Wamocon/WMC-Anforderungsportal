import { createClient } from '@supabase/supabase-js';

/**
 * Verify the caller is authenticated by extracting and validating the
 * Supabase access token from request cookies.
 *
 * Works in Edge runtime (no `cookies()` import from next/headers needed).
 * Handles Supabase SSR chunked cookies (.0, .1, .2 …) and single cookies.
 * Returns the user object if valid, null otherwise.
 */
export async function verifyAuth(req: Request): Promise<{ id: string; email?: string } | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';

    // 1. Find the Supabase auth cookie prefix (e.g. "sb-acgxydrisfjbilfgatkq-auth-token")
    const prefixMatch = cookieHeader.match(/sb-[a-zA-Z0-9]+-auth-token/);
    if (!prefixMatch) return null;
    const prefix = prefixMatch[0];

    // 2. Collect all matching cookie chunks (.0, .1, .2 … or the non-chunked base)
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const chunkRegex = new RegExp(
      `(?:^|;\\s*)${escapedPrefix}(?:\\.(\\d+))?=([^;]+)`,
      'g',
    );
    const chunks: [number, string][] = [];
    let m: RegExpExecArray | null;
    while ((m = chunkRegex.exec(cookieHeader)) !== null) {
      const index = m[1] !== undefined ? parseInt(m[1], 10) : 0;
      chunks.push([index, decodeURIComponent(m[2])]);
    }
    if (chunks.length === 0) return null;

    // 3. Sort by chunk index and concatenate to get the full stored value
    chunks.sort((a, b) => a[0] - b[0]);
    const fullValue = chunks.map(([, val]) => val).join('');

    // 4. Extract the access_token from the reassembled value
    let accessToken: string | null = null;
    try {
      if (fullValue.startsWith('[') || fullValue.startsWith('{') || fullValue.startsWith('"')) {
        const parsed = JSON.parse(fullValue);
        if (typeof parsed === 'string') {
          accessToken = parsed;
        } else if (Array.isArray(parsed)) {
          // @supabase/ssr stores session as [access_token, refresh_token]
          accessToken = parsed[0] || null;
        } else if (parsed?.access_token) {
          accessToken = parsed.access_token;
        }
      } else {
        accessToken = fullValue;
      }
    } catch {
      // Not valid JSON — treat the raw value as a JWT directly
      accessToken = fullValue;
    }

    if (!accessToken || accessToken.length < 10) return null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (error || !user) return null;

    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

/**
 * Get the authenticated user from the request.
 *
 * Primary: reads `x-verified-user-id` / `x-verified-user-email` headers
 * injected by the middleware (proxy.ts) after a successful session check.
 * This avoids re-parsing (potentially stale) cookies in Edge route handlers.
 *
 * Fallback: calls verifyAuth() for local dev or non-middleware contexts.
 */
export async function getAuthUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const id = req.headers.get('x-verified-user-id');
  if (id) {
    return { id, email: req.headers.get('x-verified-user-email') || undefined };
  }
  // Fallback — direct cookie validation (e.g. local dev without middleware)
  return verifyAuth(req);
}
