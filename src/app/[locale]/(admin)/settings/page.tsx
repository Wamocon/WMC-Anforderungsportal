'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, CheckCircle, Lock, AlertCircle } from 'lucide-react';
import { WmcLogo } from '@/components/wmc-logo';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

type Org = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export default function SettingsPage() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<Org | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', primaryColor: '#FE0404' });

  // Password change state
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single();
      if (data) {
        setOrg(data as Org);
        setForm({ name: data.name, slug: data.slug, primaryColor: '#FE0404' });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('organizations')
        .update({ name: form.name, slug: form.slug })
        .eq('id', org.id);
      if (error) throw error;
      toast.success(t('admin.settingsSaved'));
    } catch {
      toast.error(t('admin.failedSaveSettings'));
    } finally {
      setSaving(false);
    }
  }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('admin.settings')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.manageSettings')}
        </p>
      </div>

      <Card className="border-0 shadow-md shadow-black/5 glass-v2">
        <CardHeader>
          <CardTitle>{t('admin.organization')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">{t('admin.organizationName')}</Label>
            <Input
              id="orgName"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgSlug">{t('admin.slug')}</Label>
            <Input
              id="orgSlug"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md shadow-black/5 glass-v2">
        <CardHeader>
          <CardTitle>{t('admin.branding')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('admin.primaryColor')}</Label>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-[#FE0404] border" />
              <Input
                value={form.primaryColor}
                onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))}
                className="max-w-32"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('admin.logo')}</Label>
            <div className="flex items-center gap-4">
              <WmcLogo size="lg" />
              <Button variant="outline" size="sm">
                {t('admin.uploadLogo')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Password Change Card */}
      <Card className="border-0 shadow-md shadow-black/5 glass-v2">
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

      <Separator />

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}
