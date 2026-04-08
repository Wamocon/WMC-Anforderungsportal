'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  ArrowLeft,
  Loader2,
  Save,
  Globe,
  AlertCircle,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  File as FileIcon,
  Upload,
  Smartphone,
  Brain,
  Check,
} from 'lucide-react';
import type { RequirementType } from '@/lib/supabase/types';
import { Link, useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

// ── Attachment helpers ─────────────────────────────────────────
type PendingFile = {
  id: string; // local temp id
  file: File;
  description: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
};

function getMimeIcon(mime: string) {
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mime.startsWith('video/')) return <Film className="h-4 w-4 text-purple-500" />;
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50 MB

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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultWelcome = t('project.defaultWelcome', { days: '5' });

  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    status: 'draft',
    requirement_types: ['web_application'] as RequirementType[],
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

  // ── File attachment handlers ────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: PendingFile[] = [];
    for (const file of arr) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`"${file.name}" exceeds 50 MB limit.`);
        continue;
      }
      valid.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        description: '',
        status: 'pending',
      });
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  }, []);

  function removeFile(id: string) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function updateDescription(id: string, description: string) {
    setPendingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, description } : f))
    );
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
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
        setError(t('auth.sessionExpired'));
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(t('auth.notLoggedIn'));
        return;
      }

      const orgId = user.app_metadata?.org_id;
      if (!orgId) {
        setError(t('auth.noOrganization'));
        return;
      }

      // Filter out empty welcome texts
      const welcomeText: Record<string, string> = {};
      for (const [lang, text] of Object.entries(form.welcome_texts)) {
        if (text.trim()) welcomeText[lang] = text.trim();
      }

      // Insert project and capture the new ID for file uploads
      const { data: newProject, error: insertError } = await supabase
        .from('projects')
        .insert({
          org_id: orgId as string,
          name: form.name,
          slug: form.slug,
          description: form.description || null,
          status: form.status as 'draft' | 'active' | 'archived',
          requirement_type: form.requirement_types,
          deadline_days: form.deadline_days,
          template_id: form.template_id || null,
          welcome_text: welcomeText,
        })
        .select('id')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError(t('auth.slugExists'));
        } else if (insertError.code === '42501') {
          setError(t('auth.permissionDenied'));
        } else {
          setError(`Failed to create project: ${insertError.message}`);
        }
        return;
      }

      // Upload pending attachments sequentially
      if (pendingFiles.length > 0 && newProject?.id) {
        for (const pf of pendingFiles) {
          setPendingFiles((prev) =>
            prev.map((f) => (f.id === pf.id ? { ...f, status: 'uploading' } : f))
          );
          const fd = new FormData();
          fd.append('file', pf.file);
          if (pf.description) fd.append('description', pf.description);

          try {
            const res = await fetch(`/api/project/${newProject.id}/upload`, {
              method: 'POST',
              body: fd,
            });
            if (res.ok) {
              setPendingFiles((prev) =>
                prev.map((f) => (f.id === pf.id ? { ...f, status: 'done' } : f))
              );
            } else {
              const body = await res.json();
              setPendingFiles((prev) =>
                prev.map((f) =>
                  f.id === pf.id ? { ...f, status: 'error', errorMsg: body.error } : f
                )
              );
            }
          } catch {
            setPendingFiles((prev) =>
              prev.map((f) =>
                f.id === pf.id ? { ...f, status: 'error', errorMsg: 'Network error' } : f
              )
            );
          }
        }

        const failedCount = pendingFiles.filter((f) => f.status === 'error').length;
        if (failedCount > 0) {
          toast.warning(
            `Project created, but ${failedCount} file(s) failed to upload. You can retry from the project detail page.`
          );
        }
      }

      toast.success(t('project.projectCreated'));
      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unexpectedError'));
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
            {t('admin.setUpProject')}
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
        <Card className="border-0 shadow-md shadow-black/5 glass-v2">
          <CardHeader>
            <CardTitle>{t('admin.projectDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('project.projectName')} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('project.placeholderName')}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">{t('project.projectSlug')}</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder={t('project.slugPlaceholder')}
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
                placeholder={t('project.descPlaceholder')}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('requirements.type')} *</Label>
              <p className="text-xs text-muted-foreground">{t('requirements.typeMultiHint')}</p>
              <div className="flex flex-wrap gap-2">
                {([
                  { key: 'web_application' as RequirementType, icon: Globe, label: t('requirements.webApplication'), color: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
                  { key: 'mobile_application' as RequirementType, icon: Smartphone, label: t('requirements.mobileApplication'), color: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
                  { key: 'ai_application' as RequirementType, icon: Brain, label: t('requirements.aiApplication'), color: 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
                ]).map(({ key, icon: Icon, label, color }) => {
                  const selected = form.requirement_types.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setForm(prev => {
                          const types = prev.requirement_types.includes(key)
                            ? prev.requirement_types.filter(t => t !== key)
                            : [...prev.requirement_types, key];
                          // Ensure at least one is selected
                          if (types.length === 0) return prev;
                          return { ...prev, requirement_types: types };
                        });
                      }}
                      className={`inline-flex items-center gap-2 rounded-lg border-2 px-3.5 py-2 text-sm font-medium transition-all ${
                        selected
                          ? `${color} border-current shadow-sm`
                          : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
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

        <Card className="border-0 shadow-md shadow-black/5 glass-v2">
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

        {/* ── Project Attachments ───────────────────────────────── */}
        <Card className="border-0 shadow-md shadow-black/5 glass-v2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              {t('project.projectAttachments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('project.attachmentsHelp')}
            </p>

            {/* Drop zone */}
            <div
              className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer
                ${isDragging ? 'border-[#FE0404] bg-[#FE0404]/5' : 'border-border hover:border-[#FE0404]/50 hover:bg-muted/30'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">{t('form.dropFilesHere')}</p>
              <p className="text-xs text-muted-foreground">
                PDF, Word, Excel, Images, Videos (max 50 MB each)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.*,application/vnd.ms-excel,application/vnd.ms-powerpoint,text/plain,text/csv"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {/* Pending files list */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                {pendingFiles.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
                  >
                    <div className="mt-0.5 shrink-0">{getMimeIcon(pf.file.type)}</div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{pf.file.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatBytes(pf.file.size)}
                        </span>
                      </div>
                      <Input
                        value={pf.description}
                        onChange={(e) => updateDescription(pf.id, e.target.value)}
                        placeholder={t('project.attachmentDescriptionPlaceholder')}
                        className="h-7 text-xs"
                      />
                      {pf.status === 'error' && (
                        <p className="text-xs text-destructive">{pf.errorMsg}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeFile(pf.id)}
                      disabled={pf.status === 'uploading'}
                    >
                      {pf.status === 'uploading' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
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
            {pendingFiles.length > 0
              ? `${t('common.create')} + ${t('project.attachmentsCount', { count: pendingFiles.length })}`
              : t('common.create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
