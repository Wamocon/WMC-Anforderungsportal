'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Loader2, CheckCircle, AlertCircle, User, Mail, Shield, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ClientSettingsPage() {
  const t = useTranslations();

  const [userInfo, setUserInfo] = useState<{
    email: string; fullName: string; role: string; createdAt: string; lastSignIn: string | null;
  } | null>(null);

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fullName = user.user_metadata?.full_name
        || user.email?.split('@')[0]?.replace(/[._-]/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase())
        || '';
      setUserInfo({
        email: user.email ?? '',
        fullName,
        role: user.app_metadata?.role || 'product_owner',
        createdAt: user.created_at,
        lastSignIn: user.last_sign_in_at ?? null,
      });
    }
    loadUser();
  }, []);

  async function handlePasswordChange() {
    setPwError(null);
    setPwSuccess(false);

    if (pwForm.newPw.length < 6) {
      setPwError(t('auth.passwordTooShort'));
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError(t('auth.passwordsNoMatch'));
      return;
    }

    setPwSaving(true);
    try {
      const supabase = createClient();

      // Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error('No user');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwForm.current,
      });

      if (signInError) {
        setPwError(t('settings.currentPasswordWrong'));
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
      if (error) {
        setPwError(error.message);
        return;
      }

      setPwSuccess(true);
      setPwForm({ current: '', newPw: '', confirm: '' });
      toast.success(t('settings.passwordChanged'));
    } catch {
      setPwError(t('auth.unexpectedError'));
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('client.account')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('settings.manageAccount')}
        </p>
      </div>

      {/* Profile Card */}
      {userInfo && (
        <Card className="border-0 shadow-md shadow-black/5 bg-card/80 backdrop-blur-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-[#FE0404]/80 to-[#D00303]/60" />
          <CardContent className="relative pt-0 pb-6 px-6">
            <div className="flex items-end gap-4 -mt-8">
              <div className="h-16 w-16 rounded-2xl bg-white dark:bg-card shadow-lg border-4 border-white dark:border-card flex items-center justify-center text-xl font-bold text-[#FE0404] shrink-0">
                {userInfo.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="pb-1 min-w-0">
                <h2 className="text-lg font-semibold truncate">{userInfo.fullName}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs bg-[#FE0404]/10 text-[#FE0404] border-[#FE0404]/20">
                    <Shield className="h-3 w-3 mr-1" />
                    {t(`client.role_${userInfo.role}`, { defaultMessage: userInfo.role.replace('_', ' ') })}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3.5 py-2.5">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('auth.email')}</p>
                  <p className="text-sm font-medium truncate">{userInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3.5 py-2.5">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{t('client.memberSince')}</p>
                  <p className="text-sm font-medium">
                    {new Date(userInfo.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
              {userInfo.lastSignIn && (
                <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3.5 py-2.5 sm:col-span-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{t('client.lastLogin')}</p>
                    <p className="text-sm font-medium">
                      {new Date(userInfo.lastSignIn).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-md shadow-black/5 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('settings.changePassword')}
          </CardTitle>
          <CardDescription>{t('settings.changePasswordDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pwSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3">
              <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700 dark:text-green-400">{t('settings.passwordChanged')}</p>
            </div>
          )}
          {pwError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{pwError}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t('settings.currentPassword')}</Label>
            <Input
              id="currentPassword"
              type="password"
              value={pwForm.current}
              onChange={(e) => setPwForm(prev => ({ ...prev, current: e.target.value }))}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('auth.newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={pwForm.newPw}
              onChange={(e) => setPwForm(prev => ({ ...prev, newPw: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmNewPassword">{t('auth.confirmPassword')}</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              value={pwForm.confirm}
              onChange={(e) => setPwForm(prev => ({ ...prev, confirm: e.target.value }))}
              autoComplete="new-password"
            />
          </div>
          <Button
            onClick={handlePasswordChange}
            disabled={pwSaving || !pwForm.current || !pwForm.newPw || !pwForm.confirm}
            className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
          >
            {pwSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {t('settings.changePassword')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
