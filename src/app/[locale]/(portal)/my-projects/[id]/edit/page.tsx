'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Link, useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  File as FileIcon,
  Upload,
  Download,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ProjectAttachment } from '@/lib/supabase/types';

// ── Helpers ─────────────────────────────────────────────────
type PendingFile = {
  id: string;
  file: File;
  description: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
};

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50 MB

function getMimeIcon(mime: string | null) {
  if (!mime) return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mime.startsWith('video/')) return <Film className="h-4 w-4 text-purple-500" />;
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
  if (mime.includes('word') || mime.includes('document')) return <FileText className="h-4 w-4 text-blue-700" />;
  if (mime.includes('excel') || mime.includes('spreadsheet')) return <FileText className="h-4 w-4 text-green-600" />;
  if (mime.includes('powerpoint') || mime.includes('presentation')) return <FileText className="h-4 w-4 text-orange-500" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EditProjectPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    deadline_days: 5,
    onedrive_link: '',
  });

  // Existing attachments from DB
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);

  // New file uploads
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track initial form state to detect unsaved changes
  const initialFormRef = useRef<typeof form | null>(null);
  const isDirty = initialFormRef.current !== null && (
    form.name !== initialFormRef.current.name ||
    form.description !== initialFormRef.current.description ||
    form.deadline_days !== initialFormRef.current.deadline_days ||
    form.onedrive_link !== initialFormRef.current.onedrive_link ||
    pendingFiles.length > 0
  );

  // Warn on navigation away with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Load project data
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // Fetch project
        const { data: project, error: projErr } = await supabase
          .from('projects')
          .select('id, name, description, status, deadline_days, created_by, onedrive_link')
          .eq('id', projectId)
          .single();

        if (projErr || !project) {
          setError(t('errors.notFound'));
          setLoading(false);
          return;
        }

        // Only the creator can edit
        if (project.created_by !== user.id) {
          setError(t('errors.unauthorized'));
          setLoading(false);
          return;
        }

        // Archived projects cannot be edited
        if (project.status === 'archived') {
          setError(t('client.cannotEditArchived'));
          setLoading(false);
          return;
        }

        setIsOwner(true);
        const initialForm = {
          name: project.name,
          description: project.description || '',
          deadline_days: project.deadline_days,
          onedrive_link: project.onedrive_link || '',
        };
        setForm(initialForm);
        initialFormRef.current = initialForm;

        // Load attachments
        const res = await fetch(`/api/project/${projectId}/upload`);
        if (res.ok) {
          const data = await res.json();
          setAttachments(data.attachments ?? []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError(t('errors.loadFailed'));
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // ── File handlers ────────────────────────────────────────
  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    const valid: PendingFile[] = [];
    for (const file of arr) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(t('errors.fileTooLarge', { size: '50' }));
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
  }, [t]);

  function removeFile(id: string) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function deleteAttachment(attachmentId: string) {
    setDeletingAttachment(attachmentId);
    try {
      const res = await fetch(`/api/project/${projectId}/upload`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId }),
      });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        toast.success(t('client.attachmentDeleted'));
      } else {
        const body = await res.json();
        toast.error(body.error || t('errors.generic'));
      }
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setDeletingAttachment(null);
    }
  }

  // ── Save handler ─────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t('errors.requiredField'));
      return;
    }

    // Validate OneDrive link if provided
    const link = form.onedrive_link.trim();
    if (link) {
      try {
        const url = new URL(link);
        if (!['http:', 'https:'].includes(url.protocol)) {
          setError(t('client.invalidLink'));
          return;
        }
      } catch {
        setError(t('client.invalidLink'));
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const supabase = createClient();

      // Update project fields
      const { error: updateErr } = await supabase
        .from('projects')
        .update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          deadline_days: Math.max(1, Math.min(90, form.deadline_days)),
          onedrive_link: form.onedrive_link.trim() || null,
        })
        .eq('id', projectId);

      if (updateErr) {
        if (updateErr.code === '42501') {
          setError(t('errors.permissionDenied'));
        } else {
          setError(updateErr.message);
        }
        return;
      }

      // Upload pending files
      if (pendingFiles.length > 0) {
        for (const pf of pendingFiles) {
          setPendingFiles((prev) =>
            prev.map((f) => (f.id === pf.id ? { ...f, status: 'uploading' } : f))
          );
          const fd = new FormData();
          fd.append('file', pf.file);
          if (pf.description) fd.append('description', pf.description);

          try {
            const res = await fetch(`/api/project/${projectId}/upload`, {
              method: 'POST',
              body: fd,
            });
            if (res.ok) {
              const body = await res.json();
              setPendingFiles((prev) =>
                prev.map((f) => (f.id === pf.id ? { ...f, status: 'done' } : f))
              );
              // Add to existing attachments list
              if (body.attachment) {
                setAttachments((prev) => [body.attachment, ...prev]);
              }
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
        // Clear completed uploads
        setPendingFiles((prev) => prev.filter((f) => f.status === 'error'));
      }

      setSaveSuccess(true);
      // Reset dirty tracking to current saved state
      initialFormRef.current = { ...form, name: form.name.trim(), description: form.description.trim(), onedrive_link: form.onedrive_link.trim() };
      toast.success(t('client.projectUpdated'));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError(t('errors.generic'));
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !isOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('errors.somethingWentWrong')}</h3>
        <p className="text-muted-foreground max-w-md mb-4">{error}</p>
        <Link href="/my-projects">
          <Button variant="outline">{t('common.back')}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/my-projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('client.editProject')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('client.editProjectDesc')}</p>
        </div>
        {saveSuccess && (
          <Badge className="bg-green-100 text-green-700 gap-1 shrink-0">
            <CheckCircle className="h-3 w-3" />
            {t('common.save')}
          </Badge>
        )}
      </div>

      {error && isOwner && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Project Details */}
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
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('project.placeholderName')}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('project.projectDescription')}</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t('project.descPlaceholder')}
                rows={4}
              />
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
                    deadline_days: Math.max(1, Math.min(90, parseInt(e.target.value) || 5)),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                {t('project.deadlineDaysHelp')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="onedrive_link">{t('form.projectLinkTitle')}</Label>
              <Input
                id="onedrive_link"
                type="url"
                value={form.onedrive_link}
                onChange={(e) => setForm((prev) => ({ ...prev, onedrive_link: e.target.value }))}
                placeholder="https://onedrive.live.com/..."
              />
              <p className="text-xs text-muted-foreground">
                {t('form.projectLinkDescription')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Existing Attachments */}
        <Card className="border-0 shadow-md shadow-black/5 glass-v2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5 text-muted-foreground" />
              {t('admin.attachments')} ({attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing files */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                  >
                    <div className="shrink-0">{getMimeIcon(att.mime_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{att.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(att.file_size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {att.url && (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteAttachment(att.id)}
                        disabled={deletingAttachment === att.id}
                      >
                        {deletingAttachment === att.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drag-and-drop upload zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#FE0404] bg-[#FE0404]/5'
                  : 'border-border/60 hover:border-[#FE0404]/40 hover:bg-muted/30'
              }`}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('form.dropFilesHere')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('form.allowedFileTypes')}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp,.zip,image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {/* Pending files list */}
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('client.newAttachments')}
                </p>
                {pendingFiles.map((pf) => (
                  <div
                    key={pf.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/10 p-3"
                  >
                    <div className="shrink-0">{getMimeIcon(pf.file.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pf.file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(pf.file.size)}
                        {pf.status === 'uploading' && (
                          <span className="ml-2 text-blue-600">{t('form.uploading')}</span>
                        )}
                        {pf.status === 'done' && (
                          <span className="ml-2 text-green-600">✓</span>
                        )}
                        {pf.status === 'error' && (
                          <span className="ml-2 text-destructive">{pf.errorMsg || 'Error'}</span>
                        )}
                      </p>
                    </div>
                    {pf.status === 'pending' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => removeFile(pf.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {pf.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Link href="/my-projects">
            <Button type="button" variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="gap-2 bg-[#FE0404] hover:bg-[#E00303] text-white"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
