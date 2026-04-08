'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  ArrowRight,
  Clock,
  CheckCircle,
  FileEdit,
  Loader2,
  Inbox,
  Paperclip,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  Film,
  File as FileIcon,
  Download,
  Bell,
  MessageSquare,
  Send,
  Plus,
  Hourglass,
  Pencil,
  Upload,
  Trash2,
  Link2,
  ExternalLink,
  X,
  Globe,
  Smartphone,
  Brain,
  Check,
} from 'lucide-react';
import type { RequirementType } from '@/lib/supabase/types';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ProjectAttachment } from '@/lib/supabase/types';

type ClientProject = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  deadline_days: number;
  created_at: string;
  created_by: string | null;
  onedrive_link: string | null;
  response_status: string | null;
  response_progress: number | null;
  response_id: string | null;
};

function getMimeIcon(mime: string | null) {
  if (!mime) return <FileIcon className="h-4 w-4 text-muted-foreground" />;
  if (mime.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (mime.startsWith('video/')) return <Film className="h-4 w-4 text-purple-500" />;
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
  if (mime.includes('word') || mime.includes('document')) return <FileText className="h-4 w-4 text-blue-700" />;
  if (mime.includes('excel') || mime.includes('spreadsheet')) return <FileText className="h-4 w-4 text-green-600" />;
  if (mime.includes('powerpoint') || mime.includes('presentation')) return <FileText className="h-4 w-4 text-orange-500" />;
  if (mime === 'text/csv') return <FileText className="h-4 w-4 text-green-600" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MyProjectsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [attachmentsByProject, setAttachmentsByProject] = useState<Record<string, ProjectAttachment[]>>({});
  const [expandedAttachments, setExpandedAttachments] = useState<Set<string>>(new Set());
  const [feedbackRequests, setFeedbackRequests] = useState<Array<{
    id: string; project_id: string; question: string; answer: string | null;
    status: string; created_at: string; project_name?: string;
  }>>([]);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Propose project dialog state
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposeForm, setProposeForm] = useState({ name: '', description: '', onedriveLink: '', requirementTypes: ['web_application'] as RequirementType[] });
  const [proposing, setProposing] = useState(false);
  const [proposeFiles, setProposeFiles] = useState<File[]>([]);
  const proposeFileRef = useRef<HTMLInputElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function load() {
      try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Display name: prefer full_name, then format email prefix nicely
      const fullName = user.user_metadata?.full_name;
      if (fullName) {
        setUserName(fullName);
      } else {
        const prefix = user.email?.split('@')[0] || '';
        setUserName(
          prefix
            .replace(/[._-]/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        );
      }

      // Get projects where this user has a response, a magic link, or a membership
      const [{ data: responses }, { data: magicLinks }, { data: memberships }] = await Promise.all([
        supabase
          .from('responses')
          .select('id, project_id, status, progress_percent')
          .or(`respondent_id.eq.${user.id},respondent_email.eq.${user.email}`),
        supabase
          .from('magic_links')
          .select('project_id')
          .eq('email', user.email!),
        supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id),
      ]);

      // Collect unique project IDs
      const projectIds = new Set<string>();
      responses?.forEach(r => projectIds.add(r.project_id));
      magicLinks?.forEach(ml => projectIds.add(ml.project_id));
      memberships?.forEach(m => projectIds.add(m.project_id));

      if (projectIds.size === 0) {
        setLoading(false);
        return;
      }

      // Fetch project details (active + pending_review from memberships)
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name, slug, description, status, deadline_days, created_at, created_by, onedrive_link')
        .in('id', Array.from(projectIds))
        .in('status', ['active', 'pending_review']);

      // Also fetch any pending_review projects created by this user (may not have membership yet)
      const { data: ownPending } = await supabase
        .from('projects')
        .select('id, name, slug, description, status, deadline_days, created_at, created_by, onedrive_link')
        .eq('created_by', user.id)
        .eq('status', 'pending_review');

      // Merge, deduplicate by id
      const allProjects = [...(projectData ?? [])];
      (ownPending ?? []).forEach(p => {
        if (!allProjects.find(ep => ep.id === p.id)) allProjects.push(p);
      });

      const merged: ClientProject[] = allProjects.map(p => {
        const resp = responses?.find(r => r.project_id === p.id);
        return {
          ...p,
          response_status: resp?.status ?? null,
          response_progress: resp?.progress_percent ?? null,
          response_id: resp?.id ?? null,
        };
      });

      setProjects(merged);

      // Fetch attachments for all projects (RLS ensures client only sees their project attachments)
      if (projectIds.size > 0) {
        const { data: attData } = await supabase
          .from('project_attachments')
          .select('*')
          .in('project_id', Array.from(projectIds))
          .order('created_at', { ascending: false });

        // Generate signed URLs for each attachment (1 hour validity)
        const withUrls = await Promise.all(
          (attData ?? []).map(async (att) => {
            const { data: urlData } = await supabase.storage
              .from('project-attachments')
              .createSignedUrl(att.storage_path, 3600);
            return { ...att, url: urlData?.signedUrl ?? null } as ProjectAttachment;
          })
        );

        // Group by project_id
        const byProject: Record<string, ProjectAttachment[]> = {};
        withUrls.forEach(att => {
          if (!byProject[att.project_id]) byProject[att.project_id] = [];
          byProject[att.project_id].push(att);
        });
        setAttachmentsByProject(byProject);
      }

      // Load pending feedback requests assigned to this user
      try {
        const { data: fbData } = await supabase
          .from('feedback_requests')
          .select('id, project_id, question, answer, status, created_at')
          .eq('assigned_to', user.id)
          .in('status', ['pending', 'seen'])
          .order('created_at', { ascending: false });

        // Mark unseen ones as seen
        const unseenIds = (fbData ?? []).filter(f => f.status === 'pending').map(f => f.id);
        if (unseenIds.length > 0) {
          await supabase
            .from('feedback_requests')
            .update({ status: 'seen', seen_at: new Date().toISOString() })
            .in('id', unseenIds);
        }

        // Enrich with project names
        const enriched = (fbData ?? []).map(fb => {
          const proj = merged.find(p => p.id === fb.project_id);
          return { ...fb, project_name: proj?.name ?? '' };
        });
        setFeedbackRequests(enriched);
      } catch { /* non-critical */ }

      setLoading(false);
      } catch (err) {
        console.error('Failed to load projects:', err);
        setLoadError(t('errors.loadFailed'));
        setLoading(false);
      }
    }
    load();
  }, [reloadKey]);

  function toggleAttachments(projectId: string) {
    setExpandedAttachments(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  async function submitFeedbackAnswer(feedbackId: string) {
    if (!answerText.trim()) return;
    setSubmittingAnswer(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('feedback_requests')
        .update({
          answer: answerText.trim(),
          status: 'answered',
          answered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackId);
      if (error) {
        toast.error(t('admin.feedbackAnswerFailed'));
        return;
      }
      toast.success(t('admin.feedbackAnswered'));
      setFeedbackRequests(prev => prev.filter(f => f.id !== feedbackId));
      setAnsweringId(null);
      setAnswerText('');
    } catch {
      toast.error(t('admin.feedbackAnswerFailed'));
    } finally {
      setSubmittingAnswer(false);
    }
  }

  async function dismissFeedback(feedbackId: string) {
    try {
      const supabase = createClient();
      await supabase
        .from('feedback_requests')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', feedbackId);
      setFeedbackRequests(prev => prev.filter(f => f.id !== feedbackId));
      toast.success(t('admin.feedbackDismissed'));
    } catch {
      toast.error(t('errors.generic'));
    }
  }

  async function proposeProject() {
    if (!proposeForm.name.trim()) return;

    // Validate OneDrive link if provided
    const link = proposeForm.onedriveLink.trim();
    if (link) {
      try {
        const url = new URL(link);
        if (!['http:', 'https:'].includes(url.protocol)) {
          toast.error(t('client.invalidLink'));
          return;
        }
      } catch {
        toast.error(t('client.invalidLink'));
        return;
      }
    }

    // Validate at least one type selected
    if (proposeForm.requirementTypes.length === 0) {
      toast.error(t('requirements.typeMultiHint'));
      return;
    }

    // Validate file sizes
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const oversized = proposeFiles.find(f => f.size > MAX_FILE_SIZE);
    if (oversized) {
      toast.error(t('errors.fileTooLarge', { size: 50 }));
      return;
    }

    setProposing(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const orgId = user.app_metadata?.org_id;
      const slug = proposeForm.name.trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 60);

      const { data: newProject, error } = await supabase.from('projects').insert({
        org_id: orgId,
        name: proposeForm.name.trim(),
        slug: slug + '-' + Date.now().toString(36),
        description: proposeForm.description.trim() || null,
        status: 'pending_review' as const,
        requirement_type: proposeForm.requirementTypes,
        created_by: user.id,
        onedrive_link: link || null,
        deadline_days: 5,
      }).select('id').single();

      if (error || !newProject) {
        console.error('Propose error:', error);
        toast.error(t('client.proposeFailed'));
        return;
      }

      // Upload attachments to the newly created project
      let uploadCount = 0;
      for (const file of proposeFiles) {
        const fd = new FormData();
        fd.append('file', file);
        try {
          const res = await fetch(`/api/project/${newProject.id}/upload`, {
            method: 'POST',
            body: fd,
          });
          if (res.ok) uploadCount++;
          else {
            const body = await res.json().catch(() => ({ error: 'Upload failed' }));
            console.error(`Upload failed for ${file.name}:`, body.error);
          }
        } catch {
          console.error(`Upload failed for ${file.name}`);
        }
      }

      if (proposeFiles.length > 0 && uploadCount < proposeFiles.length) {
        toast.warning(t('client.partialUpload', { uploaded: String(uploadCount), total: String(proposeFiles.length) }));
      }

      toast.success(t('client.proposeSuccess'));
      setProposeOpen(false);
      setProposeForm({ name: '', description: '', onedriveLink: '', requirementTypes: ['web_application'] as RequirementType[] });
      setProposeFiles([]);
      setLoading(true);
      setReloadKey(k => k + 1);
    } catch {
      toast.error(t('client.proposeFailed'));
    } finally {
      setProposing(false);
    }
  }

  const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    draft: { icon: FileEdit, color: 'text-gray-600', bg: 'bg-muted' },
    in_progress: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100' },
    submitted: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
    reviewed: { icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
          <FolderKanban className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('errors.somethingWentWrong')}</h3>
        <p className="text-muted-foreground max-w-md mb-4">{loadError}</p>
        <Button onClick={() => window.location.reload()}>{t('errors.tryAgain')}</Button>
      </div>
    );
  }

  const totalProjects = projects.length;
  const completedProjects = projects.filter(p => p.response_status === 'submitted' || p.response_status === 'reviewed').length;
  const inProgressProjects = projects.filter(p => p.response_status === 'in_progress' || p.response_status === 'draft').length;
  const pendingProjects = projects.filter(p => !p.response_status).length;

  const pendingReviewProjects = projects.filter(p => p.status === 'pending_review').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('client.welcome', { name: userName })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('client.myProjectsDescription')}
          </p>
        </div>
        <Dialog open={proposeOpen} onOpenChange={setProposeOpen}>
          <Button onClick={() => setProposeOpen(true)} className="gap-2 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white shadow-sm shrink-0">
            <Plus className="h-4 w-4" />
            {t('client.proposeProject')}
          </Button>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('client.proposeProject')}</DialogTitle>
              <DialogDescription>{t('client.proposeProjectDesc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="proposeName">{t('client.projectName')} *</Label>
                <Input
                  id="proposeName"
                  value={proposeForm.name}
                  onChange={(e) => setProposeForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('project.placeholderName')}
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="proposeDesc">{t('client.projectDescription')}</Label>
                <Textarea
                  id="proposeDesc"
                  value={proposeForm.description}
                  onChange={(e) => setProposeForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('project.descPlaceholder')}
                  rows={3}
                />
                {proposeForm.name.trim() && !proposeForm.description.trim() && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Bell className="h-3 w-3" />
                    {t('common.descriptionRecommended')}
                  </p>
                )}
              </div>

              {/* Requirement Type – Multi-select chips */}
              <div className="space-y-2">
                <Label>{t('requirements.type')} *</Label>
                <p className="text-xs text-muted-foreground">{t('requirements.typeMultiHint')}</p>
                <div className="flex flex-wrap gap-2">
                  {([
                    { key: 'web_application' as RequirementType, icon: Globe, label: t('requirements.webApplication'), color: 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
                    { key: 'mobile_application' as RequirementType, icon: Smartphone, label: t('requirements.mobileApplication'), color: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
                    { key: 'ai_application' as RequirementType, icon: Brain, label: t('requirements.aiApplication'), color: 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
                  ]).map(({ key, icon: Icon, label, color }) => {
                    const selected = proposeForm.requirementTypes.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setProposeForm(prev => {
                            const types = prev.requirementTypes.includes(key)
                              ? prev.requirementTypes.filter(t => t !== key)
                              : [...prev.requirementTypes, key];
                            if (types.length === 0) return prev;
                            return { ...prev, requirementTypes: types };
                          });
                        }}
                        className={`inline-flex items-center gap-2 rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all ${
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

              {/* OneDrive / SharePoint Link */}
              <div className="space-y-2">
                <Label htmlFor="proposeLink" className="flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  {t('client.oneDriveLink')}
                </Label>
                <Input
                  id="proposeLink"
                  type="url"
                  value={proposeForm.onedriveLink}
                  onChange={(e) => setProposeForm(prev => ({ ...prev, onedriveLink: e.target.value }))}
                  placeholder={t('client.oneDriveLinkPlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('client.oneDriveLinkHelp')}</p>
              </div>

              {/* File Attachments */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  {t('client.attachments')}
                </Label>
                <div
                  className="flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border hover:border-[#FE0404]/40 hover:bg-muted/20 p-4 transition-colors cursor-pointer"
                  onClick={() => proposeFileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files);
                    setProposeFiles(prev => [...prev, ...files]);
                  }}
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground text-center">{t('client.dropOrClick')}</p>
                  <p className="text-[10px] text-muted-foreground/60">{t('client.allowedFileTypes')}</p>
                </div>
                <input
                  ref={proposeFileRef}
                  type="file"
                  multiple
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm"
                  onChange={(e) => {
                    if (e.target.files) {
                      setProposeFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                      e.target.value = '';
                    }
                  }}
                />

                {/* Selected files list */}
                {proposeFiles.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {proposeFiles.map((file, idx) => (
                      <div key={`${file.name}-${idx}`} className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-1.5 text-sm">
                        <div className="shrink-0">{getMimeIcon(file.type)}</div>
                        <span className="flex-1 truncate text-xs">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                        <button
                          type="button"
                          onClick={() => setProposeFiles(prev => prev.filter((_, i) => i !== idx))}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <Hourglass className="h-3 w-3 inline mr-1" />
                  {t('client.proposeNote')}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => { setProposeOpen(false); setProposeFiles([]); }}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={proposeProject}
                  disabled={!proposeForm.name.trim() || proposing}
                  className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-1.5"
                >
                  {proposing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t('client.submitProposal')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Summary */}
      {totalProjects > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl glass-v2 border border-border/30 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold">{totalProjects}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('client.totalProjects')}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/30 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{inProgressProjects}</p>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">{t('client.inProgress')}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingProjects}</p>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">{t('client.notStarted')}</p>
          </div>
          <div className="rounded-2xl bg-green-50 dark:bg-green-950/20 border border-green-200/40 dark:border-green-800/30 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedProjects}</p>
            <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-0.5">{t('client.completed')}</p>
          </div>
        </div>
      )}

      {/* Feedback Notifications */}
      {feedbackRequests.length > 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-l-amber-500">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2">
                <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                  {t('admin.feedbackRequests')}
                </h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                  {t('admin.feedbackNotifications', { count: String(feedbackRequests.length) })}
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {feedbackRequests.map((fb) => (
                <div key={fb.id} className="rounded-xl bg-white/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{fb.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {fb.project_name && <span className="font-medium">{fb.project_name}</span>}
                        {' · '}
                        {new Date(fb.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {answeringId === fb.id ? (
                    <div className="space-y-2 ml-7">
                      <Textarea
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                        placeholder={t('admin.feedbackAnswerPlaceholder')}
                        rows={2}
                        className="text-sm"
                        autoFocus
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setAnsweringId(null); setAnswerText(''); }}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-1.5"
                          onClick={() => submitFeedbackAnswer(fb.id)}
                          disabled={!answerText.trim() || submittingAnswer}
                        >
                          {submittingAnswer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          {t('common.submit')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 ml-7">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={() => { setAnsweringId(fb.id); setAnswerText(''); }}
                      >
                        <MessageSquare className="h-3 w-3" />
                        {t('admin.answerFeedback')}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => dismissFeedback(fb.id)}
                      >
                        {t('admin.dismissFeedback')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects */}
      {projects.length === 0 ? (
        <Card className="border-0 shadow-md glass-v2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">{t('client.noProjects')}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {t('client.noProjectsDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => {
            const isPendingReview = project.status === 'pending_review';
            const resp = project.response_status;
            const cfg = statusConfig[resp ?? 'draft'] ?? statusConfig.draft;
            const StatusIcon = isPendingReview ? Hourglass : cfg.icon;
            const isSubmitted = resp === 'submitted' || resp === 'reviewed';
            const projectAttachments = attachmentsByProject[project.id] ?? [];
            const isAttachmentsExpanded = expandedAttachments.has(project.id);

            return (
              <Card
                key={project.id}
                className={`border-0 shadow-md shadow-black/5 glass-v2 spotlight-card hover:shadow-lg transition-all duration-300 ${isPendingReview ? 'border-l-4 border-l-amber-400' : ''}`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                      <div className={`rounded-xl p-2.5 sm:p-3 shrink-0 ${isPendingReview ? 'bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-950/20' : 'bg-gradient-to-br from-[#FE0404]/10 to-[#FE0404]/5'}`}>
                        <FolderKanban className={`h-5 w-5 sm:h-6 sm:w-6 ${isPendingReview ? 'text-amber-600' : 'text-[#FE0404]'}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold truncate">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                        {/* OneDrive link for pending_review */}
                        {isPendingReview && project.onedrive_link && (
                          <a
                            href={project.onedrive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link2 className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[200px]">{t('client.oneDriveLink')}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        )}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {isPendingReview ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
                              <Hourglass className="h-3 w-3" />
                              {t('client.pendingReview')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={`${cfg.bg} ${cfg.color} border-0 gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {resp ? t(`response.status.${resp}`) : t('client.notStarted')}
                            </Badge>
                          )}
                          {project.response_progress !== null && project.response_progress > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {project.response_progress}% {t('common.progress').toLowerCase()}
                            </span>
                          )}
                          {/* Attachment count badge */}
                          {projectAttachments.length > 0 && (
                            <button
                              onClick={() => toggleAttachments(project.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Paperclip className="h-3 w-3" />
                              {t('client.projectFiles', { count: projectAttachments.length })}
                              {isAttachmentsExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 self-start sm:self-center w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                      {/* Edit button — only for projects the user created and that are draft/pending_review */}
                      {project.created_by === currentUserId && ['draft', 'pending_review'].includes(project.status) && (
                        <a href={`/${locale}/my-projects/${project.id}/edit`}>
                          <Button variant="outline" size="sm" className="gap-1 w-full sm:w-auto">
                            <Pencil className="h-3.5 w-3.5" />
                            {t('common.edit')}
                          </Button>
                        </a>
                      )}
                      {isPendingReview ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1 py-1.5 px-3">
                          <Hourglass className="h-3.5 w-3.5" />
                          {t('client.awaitingApproval')}
                        </Badge>
                      ) : isSubmitted ? (
                        <Button variant="outline" size="sm" disabled className="gap-1 w-full sm:w-auto">
                          <CheckCircle className="h-4 w-4" />
                          {t('client.submitted')}
                        </Button>
                      ) : (
                        <a href={`/${locale}/form/${project.slug}${resp === 'in_progress' || resp === 'draft' ? '/fill' : ''}`}>
                          <Button
                            size="sm"
                            className="gap-1 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white shadow-sm w-full sm:w-auto"
                          >
                            {resp === 'in_progress' || resp === 'draft'
                              ? t('form.continueForm')
                              : t('form.startForm')}
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  {project.response_progress !== null && project.response_progress > 0 && !isSubmitted && (
                    <div className="mt-4">
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FE0404] to-[#D00303] rounded-full transition-all duration-500"
                          style={{ width: `${project.response_progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expandable attachments section */}
                  {isAttachmentsExpanded && projectAttachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/40 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {t('client.projectFiles', { count: projectAttachments.length })}
                      </p>
                      {projectAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2"
                        >
                          <div className="shrink-0">{getMimeIcon(att.mime_type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{att.file_name}</p>
                            {att.description && (
                              <p className="text-xs text-muted-foreground truncate">{att.description}</p>
                            )}
                            {att.file_size && (
                              <p className="text-xs text-muted-foreground/60">{formatBytes(att.file_size)}</p>
                            )}
                          </div>
                          {att.url && (
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={t('client.viewFiles')}>
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
