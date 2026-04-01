import { createClient } from '@supabase/supabase-js';

/**
 * Verify the caller is authenticated by extracting and validating the
 * Supabase access token from request cookies.
 *
 * Works in Edge runtime (no `cookies()` import from next/headers needed).
 * Returns the user object if valid, null otherwise.
 */
export async function verifyAuth(req: Request): Promise<{ id: string; email?: string } | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    // Supabase stores the access token in a cookie like sb-<ref>-auth-token
    const tokenMatch = cookieHeader.match(/sb-[^=]+-auth-token(?:\.0)?=([^;]+)/);
    if (!tokenMatch) return null;

    // The token cookie may be URL-encoded JSON — try to parse the access_token from it
    let accessToken: string | null = null;
    try {
      const decoded = decodeURIComponent(tokenMatch[1]);
      // Supabase SSR stores the token as a JSON string with base64url segments
      // or as a plain JWT. Try JSON parse first.
      if (decoded.startsWith('[') || decoded.startsWith('{') || decoded.startsWith('"')) {
        const parsed = JSON.parse(decoded.startsWith('"') ? decoded : decoded);
        if (typeof parsed === 'string') {
          // It's a JWT string directly
          accessToken = parsed;
        } else if (Array.isArray(parsed)) {
          // Chunked storage — reassemble
          accessToken = parsed.join('');
        } else if (parsed?.access_token) {
          accessToken = parsed.access_token;
        }
      } else {
        accessToken = decoded;
      }
    } catch {
      // Not JSON — use raw value as JWT
      accessToken = decodeURIComponent(tokenMatch[1]);
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
