'use client';

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { WmcLogo } from '@/components/wmc-logo';
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <UpdatePasswordForm />
    </Suspense>
  );
}

function UpdatePasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase redirects with hash fragments containing access_token and refresh_token
  // The client SDK auto-detects these on load and sets the session
  useEffect(() => {
    const supabase = createClient();

    // Listen for auth state changes - the recovery token from the URL
    // will trigger a PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      } else if (event === 'SIGNED_IN') {
        setSessionReady(true);
      }
    });

    // Also check if there's already a session (e.g. user navigated here manually)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // Check for error or code in search params
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (error) {
      setErrorMsg(errorDescription || t('auth.invalidResetLink'));
    }

    return () => subscription.unsubscribe();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg(t('auth.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(t('auth.passwordsNoMatch'));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setSuccess(true);

      // Sign out and redirect to login after 2 seconds
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/login');
      }, 2000);
    } catch {
      setErrorMsg(t('auth.unexpectedError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FE0404]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem]" />

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <WmcLogo size="xl" showTagline />
        </Link>

        <Card className="border-0 shadow-2xl shadow-black/5 bg-card/80 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">{t('auth.updatePassword')}</CardTitle>
            <CardDescription className="text-base">
              {success ? t('auth.passwordUpdated') : t('auth.updatePasswordSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {success ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {t('auth.passwordUpdated')}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{errorMsg}</p>
                  </div>
                )}

                {!sessionReady && !errorMsg && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('auth.verifyingLink')}</span>
                  </div>
                )}

                {sessionReady && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">{t('auth.newPassword')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="pl-10 h-12 rounded-xl border-border/60 focus:border-[#FE0404] focus:ring-[#FE0404]/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">{t('auth.confirmPassword')}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          autoComplete="new-password"
                          className="pl-10 h-12 rounded-xl border-border/60 focus:border-[#FE0404] focus:ring-[#FE0404]/20 transition-all"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white font-semibold shadow-lg shadow-[#FE0404]/20 hover:shadow-xl hover:shadow-[#FE0404]/30 transition-all duration-300 gap-2"
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t('auth.updatePassword')
                      )}
                    </Button>
                  </>
                )}

                <Link href="/login" className="block">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-12 rounded-xl gap-2 text-muted-foreground hover:text-foreground"
                  >
                    {t('auth.backToLogin')}
                  </Button>
                </Link>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t('common.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
}
