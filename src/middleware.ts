import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Admin routes that require authentication
const PROTECTED_PATHS = ['/dashboard', '/projects', '/templates', '/responses', '/settings', '/my-projects'];

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

  return intlResponse;
}

export const config = {
  matcher: [
    // Match all pathnames except static files
    '/((?!_next|api|.*\\..*).*)',
  ],
};
