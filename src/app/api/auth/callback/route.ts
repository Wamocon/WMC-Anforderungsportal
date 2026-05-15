import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = searchParams.get('next');

    // Detect locale from cookie, referer header, or default to 'de'
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    const referer = request.headers.get('referer') || '';
    const refererMatch = referer.match(/\/([a-z]{2})(\/|$)/);
    const locale = localeCookie || refererMatch?.[1] || 'de';

    const redirectTo = next || `/${locale}/dashboard`;
    const supabase = await createClient();

    // ── PKCE code flow (signUp / signInWithOtp with PKCE) ────────────────────
    if (code) {
      const { error, data } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        if (type === 'recovery') {
          return NextResponse.redirect(`${origin}/${locale}/update-password`);
        }
        if (!next && data.user) {
          const role = data.user.app_metadata?.role || 'client';
          const adminRoles = ['super_admin', 'staff'];
          const dest = adminRoles.includes(role) ? `/${locale}/dashboard` : `/${locale}/my-projects`;
          return NextResponse.redirect(`${origin}${dest}`);
        }
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }

    // ── Token-hash flow (OTP / admin.createUser / older email templates) ─────
    if (tokenHash && type) {
      const { error, data } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (!error) {
        if (type === 'recovery') {
          return NextResponse.redirect(`${origin}/${locale}/update-password`);
        }
        if (!next && data.user) {
          const role = data.user.app_metadata?.role || 'client';
          const adminRoles = ['super_admin', 'staff'];
          const dest = adminRoles.includes(role) ? `/${locale}/dashboard` : `/${locale}/my-projects`;
          return NextResponse.redirect(`${origin}${dest}`);
        }
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }

    return NextResponse.redirect(`${origin}/${locale}/login?error=auth_failed`);
  } catch {
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/de/login?error=auth_failed`);
  }
}

