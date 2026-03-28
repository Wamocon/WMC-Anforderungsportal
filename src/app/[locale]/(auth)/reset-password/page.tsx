'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/language-switcher';
import { WmcLogo } from '@/components/wmc-logo';
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from '@/i18n/navigation';

export default function ResetPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/api/auth/callback?type=recovery`;

      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      // Always show success to prevent email enumeration
      setSent(true);
    } catch {
      setSent(true);
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
            <CardTitle className="text-2xl font-bold">{t('auth.resetPassword')}</CardTitle>
            <CardDescription className="text-base">
              {sent ? t('auth.resetPasswordSent') : t('auth.resetPasswordSubtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {sent ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {t('auth.resetPasswordSent')}
                </p>
                <Link href="/login" className="block">
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('auth.backToLogin')}
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
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
                    t('auth.sendResetLink')
                  )}
                </Button>

                <Link href="/login" className="block">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full h-12 rounded-xl gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
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
