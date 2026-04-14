import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Page routes that require authentication
const PROTECTED_PATHS = ['/dashboard', '/projects', '/templates', '/responses', '/settings', '/my-projects', '/account'];

function isProtectedPath(pathname: string): boolean {
  // Strip locale prefix (e.g. /en/dashboard -> /dashboard)
  const segments = pathname.split('/');
  const pathWithoutLocale = segments.length > 2 ? '/' + segments.slice(2).join('/') : pathname;
  return PROTECTED_PATHS.some((p) => pathWithoutLocale.startsWith(p));
}

function getLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  return match?.[1] || 'de';
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files
  if (
    pathname.startsWith('/_next') ||
    pathname.includes('.') // static files like favicon.svg
  ) {
    return NextResponse.next();
  }

  // ── Protect AI API routes: require authenticated user ──────────────
  if (pathname.startsWith('/api/ai/')) {
    const { supabaseResponse: aiSessionResponse, user } = await updateSession(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Inject verified user info into request headers so route handlers
    // don't need to re-parse cookies (which may be stale after a refresh).
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-verified-user-id', user.id);
    requestHeaders.set('x-verified-user-email', user.email || '');

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Propagate refreshed session cookies back to the browser so the
    // access token stays fresh on subsequent requests.
    aiSessionResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
  }

  // Skip middleware for other API routes (auth callbacks, form saves, etc.)
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Refresh Supabase session for page routes
  const { supabaseResponse, user } = await updateSession(request);

  // Auth guard: redirect unauthenticated users from admin routes to login
  if (isProtectedPath(pathname) && !user) {
    const locale = getLocaleFromPath(pathname);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Apply i18n middleware
  const intlResponse = intlMiddleware(request);

  // Merge cookies from Supabase into i18n response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  // Security headers
  intlResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
  intlResponse.headers.set('X-Content-Type-Options', 'nosniff');
  intlResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  intlResponse.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  intlResponse.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com wss://*.supabase.co",
      "frame-ancestors 'self'",
    ].join('; ')
  );

  return intlResponse;
}

export const config = {
  matcher: [
    // Match all pathnames except static files
    '/((?!_next|.*\\..*).*)',
    // Also match AI API routes for auth protection
    '/api/ai/:path*',
  ],
};