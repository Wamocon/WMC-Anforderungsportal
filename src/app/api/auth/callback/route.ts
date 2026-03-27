import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next');

    // Detect locale from cookie, referer header, or default to 'de'
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    const referer = request.headers.get('referer') || '';
    const refererMatch = referer.match(/\/([a-z]{2})(\/|$)/);
    const locale = localeCookie || refererMatch?.[1] || 'de';

    const redirectTo = next || `/${locale}/dashboard`;

    if (code) {
      const supabase = await createClient();
      const { error, data } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // If this is a password recovery flow, redirect to update-password page
        const type = searchParams.get('type');
        if (type === 'recovery') {
          return NextResponse.redirect(`${origin}/${locale}/update-password`);
        }

        // Role-based redirect when no explicit next URL
        if (!next && data.user) {
          const role = data.user.app_metadata?.role || 'user';
          const adminRoles = ['super_admin', 'admin', 'manager'];
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
