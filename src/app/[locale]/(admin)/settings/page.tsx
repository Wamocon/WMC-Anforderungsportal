'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Loader2, CheckCircle } from 'lucide-react';
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
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
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
          Manage your organization settings
        </p>
      </div>

      <Card className="border-0 shadow-md shadow-black/5 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgSlug">Slug</Label>
            <Input
              id="orgSlug"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md shadow-black/5 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
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
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              <WmcLogo size="lg" />
              <Button variant="outline" size="sm">
                Upload Logo
              </Button>
            </div>
          </div>
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
