'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Download,
  Copy,
  Check,
  FileText,
  Image as ImageIcon,
  Film,
  File as FileIcon,
  Paperclip,
  FolderKanban,
  Clock,
  CheckCircle,
  Hourglass,
  ExternalLink,
  Link2,
  Bot,
  LayoutDashboard,
  MessageSquare,
  AlertCircle,
  Archive,
  ChevronRight,
  Sparkles,
  ClipboardCopy,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ProjectAttachment } from '@/lib/supabase/types';

// ── Types ───────────────────────────────────────────────────
type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

type ProjectData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  deadline_days: number;
  template_id: string | null;
  onedrive_link: string | null;
  created_at: string;
  created_by: string | null;
};

type ResponseData = {
  id: string;
  respondent_name: string | null;
  respondent_email: string;
  status: string;
  progress_percent: number | null;
  summary_markdown: string | null;
  submitted_at: string | null;
  created_at: string;
};

type AnswerData = {
  question_id: string;
  value: Json;
};

type SectionData = {
  id: string;
  title: Json;
  order_index: number;
};

type QuestionData = {
  id: string;
  section_id: string;
  label: Json;
  type: string;
  is_required: boolean;
  order_index: number;
};

// ── Helpers ─────────────────────────────────────────────────
function resolveLabel(json: Json, locale: string): string {
  if (typeof json === 'string') return json;
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, string>;
    return obj[locale] || obj['en'] || obj['de'] || Object.values(obj)[0] || '';
  }
  return String(json ?? '');
}

function formatValue(value: Json): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(v => String(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getMimeIcon(mime: string | null) {
  if (!mime) return <FileIcon className="h-5 w-5 text-muted-foreground" />;
  if (mime.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (mime.startsWith('video/')) return <Film className="h-5 w-5 text-purple-500" />;
  if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (mime.includes('word') || mime.includes('document')) return <FileText className="h-5 w-5 text-blue-700" />;
  if (mime.includes('excel') || mime.includes('spreadsheet')) return <FileText className="h-5 w-5 text-green-600" />;
  if (mime.includes('powerpoint') || mime.includes('presentation')) return <FileText className="h-5 w-5 text-orange-500" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string }> = {
  draft: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Draft' },
  pending_review: { icon: Hourglass, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Pending Review' },
  approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Approved' },
  active: { icon: FolderKanban, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Active' },
  archived: { icon: Archive, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800/30', label: 'Archived' },
};

// ── Component ───────────────────────────────────────────────
export default function ProjectDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [answersByResponse, setAnswersByResponse] = useState<Record<string, AnswerData[]>>({});
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const [copiedReport, setCopiedReport] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push(`/${locale}/login`); return; }

        // Fetch project
        const { data: proj, error: projErr } = await supabase
          .from('projects')
          .select('id, name, slug, description, status, deadline_days, template_id, onedrive_link, created_at, created_by')
          .eq('id', projectId)
          .single();

        if (projErr || !proj) { setError(t('errors.notFound')); setLoading(false); return; }

        // Only owner or staff
        const role = user.app_metadata?.role;
        const owner = proj.created_by === user.id;
        const staff = role === 'staff' || role === 'super_admin';
        if (!owner && !staff) { setError(t('errors.unauthorized')); setLoading(false); return; }

        setIsOwner(owner);
        setProject(proj);

        // Fetch responses
        const { data: resps } = await supabase
          .from('responses')
          .select('id, respondent_name, respondent_email, status, progress_percent, summary_markdown, submitted_at, created_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });
        setResponses(resps ?? []);

        // Fetch sections + questions
        if (proj.template_id) {
          const { data: sects } = await supabase
            .from('template_sections')
            .select('id, title, order_index')
            .eq('template_id', proj.template_id)
            .order('order_index', { ascending: true });
          setSections(sects ?? []);

          if (sects && sects.length > 0) {
            const { data: qs } = await supabase
              .from('template_questions')
              .select('id, section_id, label, type, is_required, order_index')
              .in('section_id', sects.map(s => s.id))
              .order('order_index', { ascending: true });
            setQuestions(qs ?? []);
          }
        }

        // Fetch answers for all responses
        const responseIds = (resps ?? []).map(r => r.id);
        if (responseIds.length > 0) {
          const { data: answers } = await supabase
            .from('response_answers')
            .select('response_id, question_id, value')
            .in('response_id', responseIds);

          const byResp: Record<string, AnswerData[]> = {};
          (answers ?? []).forEach(a => {
            if (!byResp[a.response_id]) byResp[a.response_id] = [];
            byResp[a.response_id].push({ question_id: a.question_id, value: a.value });
          });
          setAnswersByResponse(byResp);
        }

        // Fetch attachments
        const { data: atts } = await supabase
          .from('project_attachments')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        // Generate signed URLs
        const withUrls = await Promise.all(
          (atts ?? []).map(async (att) => {
            const { data: urlData } = await supabase.storage
              .from('project-attachments')
              .createSignedUrl(att.storage_path, 3600);
            return { ...att, url: urlData?.signedUrl ?? null } as ProjectAttachment;
          })
        );
        setAttachments(withUrls);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError(t('errors.loadFailed'));
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // ── Export helpers ────────────────────────────────────────
  async function copyForAI() {
    setCopiedReport(true);
    try {
      const res = await fetch(`/api/project/${projectId}/export?format=markdown&locale=${locale}`);
      if (!res.ok) throw new Error('Export failed');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      toast.success(t('client.copiedForAI'));
    } catch {
      toast.error(t('errors.generic'));
      setCopiedReport(false);
    }
    setTimeout(() => setCopiedReport(false), 2500);
  }

  async function downloadReport() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/project/${projectId}/export?format=markdown&locale=${locale}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || 'report'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setDownloading(false);
    }
  }

  function copySectionText(sectionId: string, responseId: string) {
    const resp = responses.find(r => r.id === responseId);
    const section = sections.find(s => s.id === sectionId);
    if (!section || !resp) return;

    const sectionQuestions = questions.filter(q => q.section_id === sectionId);
    const answers = answersByResponse[responseId] ?? [];
    const answerMap = new Map(answers.map(a => [a.question_id, a.value]));

    let text = `## ${resolveLabel(section.title, locale)}\n\n`;
    for (const q of sectionQuestions) {
      const val = answerMap.get(q.id);
      if (val === undefined) continue;
      text += `**${resolveLabel(q.label, locale)}**\n${formatValue(val)}\n\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedSection(`${sectionId}-${responseId}`);
    setTimeout(() => setCopiedSection(null), 2000);
  }

  // ── Loading / Error states ───────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('errors.somethingWentWrong')}</h3>
        <p className="text-muted-foreground max-w-md mb-4">{error}</p>
        <a href={`/${locale}/my-projects`}>
          <Button variant="outline">{t('common.back')}</Button>
        </a>
      </div>
    );
  }

  const cfg = statusConfig[project.status] || statusConfig.draft;
  const StatusIcon = cfg.icon;
  const hasResponses = responses.length > 0;
  const hasAttachments = attachments.length > 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <a href={`/${locale}/my-projects`}>
            <Button variant="ghost" size="icon" className="mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </a>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <Badge className={`${cfg.bg} ${cfg.color} border-0 gap-1.5`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {cfg.label}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(project.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              {project.onedrive_link && (
                <a href={project.onedrive_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Link2 className="h-3 w-3" />
                  OneDrive
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {isOwner && project.status !== 'archived' && (
            <a href={`/${locale}/my-projects/${project.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" />
                {t('common.edit')}
              </Button>
            </a>
          )}
          {project.template_id && (
            <a href={`/${locale}/form/${project.slug}/fill`}>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white">
                <FileText className="h-3.5 w-3.5" />
                {t('client.fillRequirements')}
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Tabs defaultValue="responses" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-11 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="overview" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('common.overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="responses" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('admin.responses')}</span>
            {hasResponses && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">{responses.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
            <Paperclip className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('admin.attachments')}</span>
            {hasAttachments && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">{attachments.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ──────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Quick stats */}
            <Card className="border-0 shadow-md glass-v2">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${cfg.bg}`}>
                    <StatusIcon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('admin.projectStatus')}</p>
                    <p className="font-semibold">{cfg.label}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{responses.length}</p>
                    <p className="text-xs text-muted-foreground">{t('admin.responses')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{attachments.length}</p>
                    <p className="text-xs text-muted-foreground">{t('admin.attachments')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export card */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-100 dark:bg-violet-900/40 p-2.5">
                    <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">{t('client.aiExport')}</p>
                    <p className="text-xs text-violet-600/80 dark:text-violet-400/80">{t('client.aiExportDesc')}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={copyForAI}
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                    disabled={copiedReport}
                  >
                    {copiedReport ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                    {copiedReport ? t('common.copied') : t('client.copyForAI')}
                  </Button>
                  <Button
                    onClick={downloadReport}
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={downloading}
                  >
                    {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {t('client.downloadReport')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Responses Tab ─────────────────────────────────── */}
        <TabsContent value="responses" className="mt-6 space-y-4">
          {/* Export bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              {t('client.responsesCount', { count: String(responses.length) })}
            </p>
            <div className="flex gap-2">
              <Button onClick={copyForAI} variant="outline" size="sm" className="gap-1.5" disabled={copiedReport} title={t('client.copyForAITooltip')}>
                {copiedReport ? <Check className="h-3.5 w-3.5 text-green-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                {copiedReport ? t('common.copied') : t('client.copyForAI')}
              </Button>
              <Button onClick={downloadReport} variant="outline" size="sm" className="gap-1.5" disabled={downloading}>
                {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {t('client.downloadReport')}
              </Button>
            </div>
          </div>

          {!hasResponses ? (
            <Card className="border-0 shadow-md glass-v2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">{t('client.noResponses')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('client.noResponsesDesc')}</p>
              </CardContent>
            </Card>
          ) : (
            responses.map((resp) => {
              const answers = answersByResponse[resp.id] ?? [];
              const answerMap = new Map(answers.map(a => [a.question_id, a.value]));

              return (
                <Card key={resp.id} className="border-0 shadow-md glass-v2 overflow-hidden">
                  {/* Response header */}
                  <div className="border-b border-border/40 bg-muted/30 px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-full bg-gradient-to-br from-[#FE0404]/20 to-[#FE0404]/5 p-2 shrink-0">
                        <MessageSquare className="h-4 w-4 text-[#FE0404]" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {resp.respondent_name || resp.respondent_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {resp.status === 'submitted' ? (
                            <>{t('client.submittedOn')} {resp.submitted_at ? new Date(resp.submitted_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</>
                          ) : (
                            <>{resp.progress_percent ?? 0}% {t('common.progress').toLowerCase()}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      resp.status === 'submitted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0' :
                      resp.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0' :
                      'bg-muted text-muted-foreground border-0'
                    }>
                      {resp.status === 'submitted' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                       resp.status === 'in_progress' ? <Clock className="h-3 w-3 mr-1" /> : null}
                      {resp.status}
                    </Badge>
                  </div>

                  <CardContent className="p-5 space-y-6">
                    {/* AI Summary */}
                    {resp.summary_markdown && (
                      <div className="rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20 border border-violet-200/40 dark:border-violet-800/30 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-violet-600" />
                          <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">AI Summary</p>
                        </div>
                        <p className="text-sm text-violet-800/90 dark:text-violet-300/90 whitespace-pre-wrap leading-relaxed">
                          {resp.summary_markdown}
                        </p>
                      </div>
                    )}

                    {/* Sections & Answers */}
                    {sections.map((section) => {
                      const sectionQuestions = questions.filter(q => q.section_id === section.id);
                      const hasAnyAnswer = sectionQuestions.some(q => answerMap.has(q.id));
                      if (!hasAnyAnswer) return null;

                      const sectionKey = `${section.id}-${resp.id}`;
                      return (
                        <div key={section.id}>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              {resolveLabel(section.title, locale)}
                            </h3>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={t('common.copy')}
                              onClick={() => copySectionText(section.id, resp.id)}
                            >
                              {copiedSection === sectionKey ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>

                          <div className="space-y-3 ml-6">
                            {sectionQuestions.map((q) => {
                              const val = answerMap.get(q.id);
                              if (val === undefined) return null;
                              const display = formatValue(val);
                              return (
                                <div key={q.id} className="group">
                                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                                    {resolveLabel(q.label, locale)}
                                    {q.is_required && <span className="text-red-500 ml-0.5">*</span>}
                                  </p>
                                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words bg-muted/30 rounded-lg px-3 py-2">
                                    {display === '—' ? (
                                      <span className="text-muted-foreground italic">{display}</span>
                                    ) : display}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* ── Files Tab ─────────────────────────────────────── */}
        <TabsContent value="files" className="mt-6 space-y-4">
          {!hasAttachments ? (
            <Card className="border-0 shadow-md glass-v2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Paperclip className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">{t('client.noAttachments')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('client.noAttachmentsDesc')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {attachments.map((att) => (
                <Card key={att.id} className="border-0 shadow-sm glass-v2 hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="shrink-0 rounded-xl bg-muted/50 p-3">
                      {getMimeIcon(att.mime_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{att.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {att.file_size && <span>{formatBytes(att.file_size)}</span>}
                        {att.mime_type && (
                          <>
                            <span>·</span>
                            <span>{att.mime_type.split('/').pop()?.toUpperCase()}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{new Date(att.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</span>
                      </div>
                      {att.description && (
                        <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{att.description}</p>
                      )}
                    </div>
                    {att.url && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="outline" size="sm" className="gap-1.5">
                          <Download className="h-3.5 w-3.5" />
                          {t('common.download')}
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
