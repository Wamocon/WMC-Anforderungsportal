import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Admin routes that require authentication
const PROTECTED_PATHS = ['/dashboard', '/projects', '/templates', '/responses', '/settings', '/my-projects', '/account'];

function isProtectedPath(pathname: string): boolean {
  // Strip locale prefix (e.g. /en/dashboard -> /dashboard)
  const segments = pathname.split('/');
  // segments: ['', 'en', 'dashboard', ...] or ['', 'dashboard', ...]
  const pathWithoutLocale = segments.length > 2 ? '/' + segments.slice(2).join('/') : pathname;
  return PROTECTED_PATHS.some((p) => pathWithoutLocale.startsWith(p));
}

function getLocaleFromPath(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  return match?.[1] || 'de';
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/landing' || pathname === '/landing/') {
    return NextResponse.next();
  }

  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Refresh Supabase session
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
  intlResponse.headers.set('X-Frame-Options', 'DENY');
  intlResponse.headers.set('X-Content-Type-Options', 'nosniff');
  intlResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  intlResponse.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)');
  intlResponse.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com wss://*.supabase.co",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  return intlResponse;
}

export const config = {
  matcher: [
    // Match all pathnames except static files
    '/((?!_next|api|.*\\..*).*)',
  ],
};
