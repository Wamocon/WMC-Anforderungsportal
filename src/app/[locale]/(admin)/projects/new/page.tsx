'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Save, Globe, AlertCircle } from 'lucide-react';
import { Link, useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

const PRIMARY_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ru', label: 'Русский' },
];

type TemplateOption = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
};

export default function NewProjectPage() {
  const t = useTranslations();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  const defaultWelcome = `Thank you for your interest in WMC and selecting us. Please provide your requirements within 5 days, so we can start analyzing and planning this app in our WMC Development Pipeline without any delay.`;

  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    status: 'draft',
    deadline_days: 5,
    template_id: '',
    welcome_texts: { en: defaultWelcome } as Record<string, string>,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('requirement_templates')
      .select('id, name, description, is_default')
      .order('is_default', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTemplates(data as TemplateOption[]);
          const defaultTmpl = data.find((t: TemplateOption) => t.is_default);
          if (defaultTmpl) {
            setForm((prev) => ({ ...prev, template_id: defaultTmpl.id }));
          }
        }
      });
  }, []);

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function handleNameChange(name: string) {
    setForm((prev) => ({ ...prev, name, slug: generateSlug(name) }));
  }

  function updateWelcomeText(lang: string, value: string) {
    setForm((prev) => ({
      ...prev,
      welcome_texts: { ...prev.welcome_texts, [lang]: value },
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Refresh session to pick up latest JWT claims (org_id, role)
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        setError('Session expired. Please log out and log back in.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to create a project. Please refresh the page.');
        return;
      }

      const orgId = user.app_metadata?.org_id;
      if (!orgId) {
        setError('Your account is not linked to any organization. Please contact an admin.');
        return;
      }

      // Filter out empty welcome texts
      const welcomeText: Record<string, string> = {};
      for (const [lang, text] of Object.entries(form.welcome_texts)) {
        if (text.trim()) welcomeText[lang] = text.trim();
      }

      const { error: insertError } = await supabase.from('projects').insert({
        org_id: orgId as string,
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        status: form.status as 'draft' | 'active' | 'archived',
        deadline_days: form.deadline_days,
        template_id: form.template_id || null,
        welcome_text: welcomeText,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('A project with this slug already exists. Please choose a different name.');
        } else if (insertError.code === '42501') {
          setError('Permission denied. Please log out and log back in, then try again.');
        } else {
          setError(`Failed to create project: ${insertError.message}`);
        }
        return;
      }

      toast.success(t('project.projectCreated'));
      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const langsToShow = PRIMARY_LANGS;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('project.newProject')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up a new requirement collection project
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-md shadow-black/5 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('project.projectName')} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Children's Club App"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">{t('project.projectSlug')}</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="childrens-club-app"
              />
              <p className="text-xs text-muted-foreground">
                URL: /form/{form.slug || 'your-project'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('project.projectDescription')}</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of what this project collects requirements for..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('project.projectStatus')}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, status: v ?? prev.status }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('common.draft')}</SelectItem>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">{t('project.deadlineDays')}</Label>
                <Input
                  id="deadline"
                  type="number"
                  min={1}
                  max={90}
                  value={form.deadline_days}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deadline_days: parseInt(e.target.value) || 5,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('project.deadlineDaysHelp')}
                </p>
              </div>
            </div>

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label>{t('project.selectTemplate')}</Label>
                <Select
                  value={form.template_id}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, template_id: v ?? '' }))}
                >
                  <SelectTrigger>
                    {(() => {
                      const sel = templates.find(tp => tp.id === form.template_id);
                      return (
                        <span className="flex flex-1 text-left truncate">
                          {sel ? `${sel.name}${sel.is_default ? ` (${t('common.default')})` : ''}` : t('project.selectTemplate')}
                        </span>
                      );
                    })()}
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tmpl) => (
                      <SelectItem key={tmpl.id} value={tmpl.id}>
                        {tmpl.name} {tmpl.is_default ? `(${t('common.default')})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t('project.templateHelp')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md shadow-black/5 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              {t('project.welcomeText')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('project.welcomeTextHelp')}
            </p>

            {langsToShow.map(({ code, label }) => (
              <div key={code} className="space-y-2">
                <Label htmlFor={`welcome_${code}`}>{label}</Label>
                <Textarea
                  id={`welcome_${code}`}
                  value={form.welcome_texts[code] || ''}
                  onChange={(e) => updateWelcomeText(code, e.target.value)}
                  rows={2}
                  placeholder={code === 'en' ? defaultWelcome : `Welcome text in ${label}...`}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/projects">
            <Button variant="outline">{t('common.cancel')}</Button>
          </Link>
          <Button
            type="submit"
            className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
            disabled={loading || !form.name}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('common.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
