import { NextResponse, type NextRequest } from 'next/server';

/**
 * Fallback handler for locale-prefixed callback URLs like /en/api/auth/callback.
 *
 * This happens when the Supabase dashboard "Site URL" is configured with a locale
 * prefix (e.g. http://localhost:3000/en) instead of the bare origin.
 * Rather than breaking with a 404, we strip the locale prefix and redirect
 * to the canonical /api/auth/callback, preserving all query parameters.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const callbackUrl = new URL('/api/auth/callback', origin);
  searchParams.forEach((value, key) => callbackUrl.searchParams.set(key, value));
  return NextResponse.redirect(callbackUrl.toString());
}
