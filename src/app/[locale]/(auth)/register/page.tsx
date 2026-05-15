'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { WmcLogo } from '@/components/wmc-logo';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function RegisterPage() {
  const t = useTranslations();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
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
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'email_already_used') {
          setErrorMsg(t('auth.emailAlreadyUsed'));
        } else {
          setErrorMsg(data.error || t('auth.registrationFailed'));
        }
        return;
      }

      setSuccess(true);
      toast.success(t('auth.registerSuccess'));
    } catch {
      setErrorMsg(t('auth.registrationFailed'));
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

        <Card className="border-0 shadow-2xl shadow-black/5 glass-v2 glow-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">{t('auth.registerTitle')}</CardTitle>
            <CardDescription className="text-base">{t('auth.registerSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {success ? (
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 p-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-semibold text-foreground">{t('auth.registerSuccessTitle')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('auth.registerSuccessMessage', { email })}
                  </p>
                </div>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full h-12 rounded-xl">
                    {t('auth.backToLogin')}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3 mb-4">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">{errorMsg}</p>
                  </div>
                )}
                <form onSubmit={handleRegister} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium">{t('auth.fullName')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder={t('auth.fullNamePlaceholder')}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        autoComplete="name"
                        className="pl-10 h-12 rounded-xl border-border/60 focus:border-[#FE0404] focus:ring-[#FE0404]/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
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

                  {/* Password */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">{t('auth.password')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
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

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">{t('auth.confirmPassword')}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                        className="pl-10 pr-10 h-12 rounded-xl border-border/60 focus:border-[#FE0404] focus:ring-[#FE0404]/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-[#FE0404] hover:bg-[#D00303] text-white font-semibold transition-all duration-300 shadow-lg shadow-[#FE0404]/20 hover:shadow-[#FE0404]/30"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t('auth.createAccount')
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {t('auth.alreadyHaveAccount')}{' '}
                  <Link href="/login" className="text-[#FE0404] hover:text-[#D00303] font-medium transition-colors">
                    {t('auth.login')}
                  </Link>
                </p>
              </>
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
