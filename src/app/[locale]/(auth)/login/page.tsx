'use client';

import { useState, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { WmcLogo } from '@/components/wmc-logo';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');
  const authError = searchParams.get('error');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [errorMsg, setErrorMsg] = useState<string | null>(
    authError === 'auth_failed' ? t('auth.authFailed') : null
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const supabase = createClient();

      if (mode === 'magic') {
        const callbackUrl = new URL('/api/auth/callback', window.location.origin);
        if (redirectTo) callbackUrl.searchParams.set('next', redirectTo);
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: callbackUrl.toString(),
          },
        });
        if (error) throw error;
        toast.success(t('auth.magicLinkSent'));
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login')) {
            setErrorMsg(t('auth.invalidCredentials'));
          } else {
            setErrorMsg(error.message);
          }
          return;
        }
        // Redirect based on role: admin roles → dashboard, client roles → my-projects
        if (redirectTo) {
          window.location.href = redirectTo;
        } else {
          const role = data.user?.app_metadata?.role || 'client';
          const adminRoles = ['super_admin', 'staff'];
          if (adminRoles.includes(role)) {
            router.push('/dashboard');
          } else {
            router.push('/my-projects');
          }
        }
      }
    } catch {
      setErrorMsg(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 overflow-hidden aurora-bg grain-overlay">
      {/* Mesh gradient orbs */}
      <div className="mesh-orb mesh-orb-1 w-[400px] h-[400px] top-[5%] right-[5%]" />
      <div className="mesh-orb mesh-orb-2 w-[350px] h-[350px] bottom-[10%] left-[5%]" />
      <div className="mesh-orb mesh-orb-3 w-[300px] h-[300px] top-[50%] left-[40%]" />
      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid" />

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 w-full max-w-md animate-page-enter">
        {/* Logo */}
        <Link href="/" className="flex justify-center mb-8">
          <WmcLogo size="xl" showTagline />
        </Link>

        {/* Card */}
        <Card className="border-0 shadow-2xl shadow-black/5 glass-v2 glow-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">{t('auth.loginTitle')}</CardTitle>
            <CardDescription className="text-base">{t('auth.loginSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3 mb-4">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{errorMsg}</p>
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="pl-10 h-12 rounded-xl border-border/60 focus:border-[#FE0404] focus:ring-[#FE0404]/20 transition-all"
                  />
                </div>
              </div>

              {mode === 'password' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                    <Link href="/reset-password" className="text-xs text-[#FE0404] hover:text-[#D00303] font-medium transition-colors">
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-10 pr-10 h-12 rounded-xl border-border/60 focus:border-[#FE0404] focus:ring-[#FE0404]/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white font-semibold shadow-lg shadow-[#FE0404]/20 hover:shadow-xl hover:shadow-[#FE0404]/30 transition-all duration-300 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {t('auth.login')}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card/80 px-3 text-muted-foreground">{t('auth.or')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMode(mode === 'password' ? 'magic' : 'password')}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-border/60 h-12 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-[#FE0404]/30 hover:bg-[#FE0404]/5 transition-all duration-300"
              >
                {mode === 'password' ? (
                  <>
                    <Mail className="h-4 w-4" />
                    {t('auth.useMagicLink')}
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    {t('auth.usePassword')}
                  </>
                )}
              </button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {t('common.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </div>
  );
}
