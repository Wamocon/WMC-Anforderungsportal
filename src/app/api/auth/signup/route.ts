import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse, type NextRequest } from 'next/server';

// WMC Organization ID (the sole org in anforderungsportal.organizations)
const WMC_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: 'Email, password, and full name are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailRedirectTo = `${origin}/api/auth/callback`;

    // Collect PKCE verifier cookies to forward to the browser
    const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

    // Use the SSR client (anon key) for signUp so Supabase generates a proper
    // PKCE code verifier and sends a confirmation email with a ?code= link.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(items) {
            items.forEach(({ name, value, options }) => {
              cookiesToSet.push({ name, value, options: options as Record<string, unknown> });
            });
          },
        },
      }
    );

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo,
      },
    });

    if (signUpError) {
      if (
        signUpError.message.toLowerCase().includes('already registered') ||
        signUpError.message.toLowerCase().includes('user already registered')
      ) {
        return NextResponse.json({ error: 'email_already_used' }, { status: 409 });
      }
      return NextResponse.json({ error: signUpError.message }, { status: 500 });
    }

    if (!signUpData?.user) {
      return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 });
    }

    // Immediately stamp app_metadata (role + org_id) so the first JWT
    // already has the correct role when the user confirms their email.
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(signUpData.user.id, {
        app_metadata: {
          role: 'product_owner',
          org_id: WMC_ORG_ID,
          provider: 'email',
          providers: ['email'],
        },
      });
    } catch (metaErr) {
      // Non-fatal: user still gets created; role defaults to 'client' on first login.
      console.warn('[signup] Could not set app_metadata:', metaErr);
    }

    // Return PKCE verifier cookies so the browser can use them when the
    // confirmation link is clicked and /api/auth/callback exchanges the code.
    const response = NextResponse.json({ success: true }, { status: 201 });
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });

    return response;
  } catch (err) {
    console.error('[signup] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}


