'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Download,
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
  LayoutDashboard,
  MessageSquare,
  AlertCircle,
  Archive,
  ChevronRight,
  Send,
  Bell,
  Shield,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { ProjectAttachment } from '@/lib/supabase/types';

/* ── Types ─────────────────────────────────────────────────── */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

type ProjectData = {
  id: string; name: string; slug: string; description: string | null;
  status: string; deadline_days: number; template_id: string | null;
  onedrive_link: string | null; created_at: string; created_by: string | null;
};
type ResponseData = {
  id: string; respondent_name: string | null; respondent_email: string;
  status: string; progress_percent: number | null; summary_markdown: string | null;
  submitted_at: string | null; created_at: string;
};
type AnswerData = { question_id: string; value: Json };
type SectionData = { id: string; title: Json; order_index: number };
type QuestionData = { id: string; section_id: string; label: Json; type: string; is_required: boolean; order_index: number };
type FeedbackItem = {
  id: string; question: string; answer: string | null;
  status: string; created_at: string; answered_at: string | null;
};

/* ── Helpers ───────────────────────────────────────────────── */
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
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}
function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_STEPS = ['draft', 'pending_review', 'approved', 'active'] as const;

/* ── Component ─────────────────────────────────────────────── */
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
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);

  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ── Load data ────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push(`/${locale}/login`); return; }

        const { data: proj, error: projErr } = await supabase
          .from('projects')
          .select('id, name, slug, description, status, deadline_days, template_id, onedrive_link, created_at, created_by')
          .eq('id', projectId)
          .single();

        if (projErr || !proj) { if (!cancelled) { setError(t('errors.notFound')); setLoading(false); } return; }
        if (proj.created_by !== user.id) { if (!cancelled) { setError(t('errors.unauthorized')); setLoading(false); } return; }
        if (cancelled) return;
        setProject(proj);

        // Parallel fetches
        const [respsP, attsP, fbP] = await Promise.all([
          supabase.from('responses')
            .select('id, respondent_name, respondent_email, status, progress_percent, summary_markdown, submitted_at, created_at')
            .eq('project_id', projectId).order('created_at', { ascending: true }),
          supabase.from('project_attachments')
            .select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
          supabase.from('feedback_requests')
            .select('id, question, answer, status, created_at, answered_at')
            .eq('project_id', projectId).eq('assigned_to', user.id)
            .order('created_at', { ascending: false }),
        ]);
        if (cancelled) return;

        const resps = respsP.data ?? [];
        setResponses(resps);

        // Signed URLs for attachments
        const withUrls = await Promise.all(
          (attsP.data ?? []).map(async (att) => {
            const { data: urlData } = await supabase.storage.from('project-attachments').createSignedUrl(att.storage_path, 3600);
            return { ...att, url: urlData?.signedUrl ?? null } as ProjectAttachment;
          })
        );
        if (cancelled) return;
        setAttachments(withUrls);

        // Mark pending feedback as seen
        const fbItems = (fbP.data ?? []) as FeedbackItem[];
        const unseenIds = fbItems.filter(f => f.status === 'pending').map(f => f.id);
        if (unseenIds.length > 0) {
          await supabase.from('feedback_requests')
            .update({ status: 'seen', seen_at: new Date().toISOString() })
            .in('id', unseenIds);
        }
        if (cancelled) return;
        setFeedbackItems(fbItems);

        // Sections + questions + answers
        if (proj.template_id) {
          const { data: sects } = await supabase.from('template_sections')
            .select('id, title, order_index').eq('template_id', proj.template_id)
            .order('order_index', { ascending: true });
          if (cancelled) return;
          setSections(sects ?? []);

          if (sects && sects.length > 0) {
            const { data: qs } = await supabase.from('template_questions')
              .select('id, section_id, label, type, is_required, order_index')
              .in('section_id', sects.map(s => s.id))
              .order('order_index', { ascending: true });
            if (cancelled) return;
            setQuestions(qs ?? []);
          }
        }

        const responseIds = resps.map(r => r.id);
        if (responseIds.length > 0) {
          const { data: answers } = await supabase.from('response_answers')
            .select('response_id, question_id, value').in('response_id', responseIds);
          if (cancelled) return;
          const byResp: Record<string, AnswerData[]> = {};
          (answers ?? []).forEach(a => {
            if (!byResp[a.response_id]) byResp[a.response_id] = [];
            byResp[a.response_id].push({ question_id: a.question_id, value: a.value });
          });
          setAnswersByResponse(byResp);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to load project:', err);
        if (!cancelled) { setError(t('errors.loadFailed')); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [projectId]);

  /* ── Reply to staff follow-up ─────────────────────────────── */
  async function submitFeedbackAnswer(feedbackId: string) {
    if (!answerText.trim()) return;
    setSubmittingAnswer(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from('feedback_requests')
        .update({ answer: answerText.trim(), status: 'answered', answered_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', feedbackId);
      if (err) { toast.error(t('admin.feedbackAnswerFailed')); return; }
      toast.success(t('admin.feedbackAnswered'));
      setFeedbackItems(prev => prev.map(f => f.id === feedbackId ? { ...f, answer: answerText.trim(), status: 'answered', answered_at: new Date().toISOString() } : f));
      setAnsweringId(null);
      setAnswerText('');
    } catch { toast.error(t('admin.feedbackAnswerFailed')); }
    finally { setSubmittingAnswer(false); }
  }

  /* ── Submit / Re-submit for review ────────────────────────── */
  async function handleSubmitForReview() {
    if (!project || submitting) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { error: err } = await supabase.rpc('submit_for_review', { p_project_id: project.id });
      if (err) { toast.error(err.message || t('errors.generic')); return; }
      toast.success(t('client.submittedForReview'));
      setProject(prev => prev ? { ...prev, status: 'pending_review' } : null);
    } catch { toast.error(t('errors.generic')); }
    finally { setSubmitting(false); }
  }

  /* ── Loading / Error states ───────────────────────────────── */
  if (loading) return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-64" /><Skeleton className="h-20 w-full" /><Skeleton className="h-48 w-full" />
    </div>
  );
  if (error || !project) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-2xl bg-destructive/10 p-4 mb-4"><AlertCircle className="h-10 w-10 text-destructive" /></div>
      <h3 className="text-lg font-semibold mb-2">{t('errors.somethingWentWrong')}</h3>
      <p className="text-muted-foreground max-w-md mb-4">{error}</p>
      <a href={`/${locale}/my-projects`}><Button variant="outline">{t('common.back')}</Button></a>
    </div>
  );

  /* ── Derived ──────────────────────────────────────────────── */
  const currentStepIndex = STATUS_STEPS.indexOf(project.status as typeof STATUS_STEPS[number]);
  const isArchived = project.status === 'archived';
  const isDraft = project.status === 'draft';
  const isPendingReview = project.status === 'pending_review';
  const isApproved = project.status === 'approved';
  const isActive = project.status === 'active';
  const pendingFeedback = feedbackItems.filter(f => f.status !== 'answered' && f.status !== 'dismissed');
  const answeredFeedback = feedbackItems.filter(f => f.status === 'answered');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <a href={`/${locale}/my-projects`}>
            <Button variant="ghost" size="icon" className="mt-0.5"><ArrowLeft className="h-4 w-4" /></Button>
          </a>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
            {project.description && <p className="text-muted-foreground mt-1 text-sm line-clamp-2">{project.description}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {new Date(project.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              {project.onedrive_link && (
                <a href={project.onedrive_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Link2 className="h-3 w-3" /> OneDrive <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {!isArchived && (
            <a href={`/${locale}/my-projects/${project.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5"><Pencil className="h-3.5 w-3.5" />{t('common.edit')}</Button>
            </a>
          )}
          {project.template_id && (
            <a href={`/${locale}/form/${project.slug}/fill`}>
              <Button size="sm" className="gap-1.5 bg-gradient-to-r from-[#FE0404] to-[#D00303] hover:from-[#E00303] hover:to-[#BB0000] text-white">
                <FileText className="h-3.5 w-3.5" />{t('client.fillRequirements')}
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* ── Status Timeline ─────────────────────────────────── */}
      <Card className="border-0 shadow-md glass-v2 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-semibold">{t('client.projectTimeline')}</p>
          </div>

          {isArchived ? (
            <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-4">
              <Archive className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t('client.projectArchived')}</p>
            </div>
          ) : (
            <div className="flex items-center gap-0 w-full">
              {STATUS_STEPS.map((step, i) => {
                const isCompleted = currentStepIndex > i;
                const isCurrent = currentStepIndex === i;
                const StepIcon = { draft: FileText, pending_review: Hourglass, approved: Shield, active: FolderKanban }[step];
                const stepLabels: Record<string, string> = {
                  draft: t('common.draft'), pending_review: t('common.pendingReview'),
                  approved: t('client.approvedStatus'), active: t('common.active'),
                };
                return (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1.5 min-w-0">
                      <div className={`rounded-full p-2 transition-all shrink-0 ${isCompleted ? 'bg-green-100 dark:bg-green-900/30' : isCurrent ? 'bg-[#FE0404]/10 ring-2 ring-[#FE0404]/30' : 'bg-muted/50'}`}>
                        {isCompleted ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> : <StepIcon className={`h-4 w-4 ${isCurrent ? 'text-[#FE0404]' : 'text-muted-foreground/50'}`} />}
                      </div>
                      <span className={`text-[11px] text-center leading-tight ${isCurrent ? 'font-semibold text-foreground' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/50'}`}>
                        {stepLabels[step]}
                      </span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mt-[-18px] rounded-full transition-colors ${isCompleted ? 'bg-green-400 dark:bg-green-600' : 'bg-border/50'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Status-specific banners */}
          {isDraft && (
            <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/30 p-4">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-2 shrink-0"><FileText className="h-4 w-4 text-blue-600" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{t('client.draftMessage')}</p>
                <p className="text-xs text-blue-700/70 dark:text-blue-400/70 mt-0.5">{t('client.draftMessageDesc')}</p>
              </div>
              <Button onClick={handleSubmitForReview} disabled={submitting} size="sm" className="gap-1.5 bg-[#FE0404] hover:bg-[#E00303] text-white shrink-0">
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {t('client.submitForReview')}
              </Button>
            </div>
          )}
          {isPendingReview && (
            <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30 p-4">
              <div className="flex items-center gap-2 mb-1"><Hourglass className="h-4 w-4 text-amber-600" /><p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t('client.pendingReviewMessage')}</p></div>
              <p className="text-xs text-amber-700/70 dark:text-amber-400/70">{t('client.pendingReviewMessageDesc')}</p>
            </div>
          )}
          {isApproved && (
            <div className="mt-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200/40 dark:border-green-800/30 p-4">
              <div className="flex items-center gap-2 mb-1"><CheckCircle className="h-4 w-4 text-green-600" /><p className="text-sm font-medium text-green-900 dark:text-green-200">{t('client.approvedMessage')}</p></div>
              <p className="text-xs text-green-700/70 dark:text-green-400/70">{t('client.approvedMessageDesc')}</p>
            </div>
          )}
          {isActive && (
            <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30 p-4">
              <div className="flex items-center gap-2 mb-1"><FolderKanban className="h-4 w-4 text-emerald-600" /><p className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{t('client.activeMessage')}</p></div>
              <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">{t('client.activeMessageDesc')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pending Follow-ups (urgent, always visible above tabs) */}
      {pendingFeedback.length > 0 && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 animate-pulse"><Bell className="h-5 w-5 text-amber-600" /></div>
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">{t('client.staffFollowUp')}</h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">{t('client.staffFollowUpDesc', { count: String(pendingFeedback.length) })}</p>
              </div>
            </div>
            <div className="space-y-3">
              {pendingFeedback.map((fb) => (
                <div key={fb.id} className="rounded-xl bg-white/80 dark:bg-card/60 backdrop-blur-sm border border-border/50 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{fb.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(fb.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {answeringId === fb.id ? (
                    <div className="space-y-2 ml-7">
                      <Textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder={t('admin.feedbackAnswerPlaceholder')} rows={2} className="text-sm" autoFocus />
                      <div className="flex items-center gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setAnsweringId(null); setAnswerText(''); }}>{t('common.cancel')}</Button>
                        <Button size="sm" className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-1.5" onClick={() => submitFeedbackAnswer(fb.id)} disabled={!answerText.trim() || submittingAnswer}>
                          {submittingAnswer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          {t('common.submit')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="ml-7">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400" onClick={() => { setAnsweringId(fb.id); setAnswerText(''); }}>
                        <MessageSquare className="h-3 w-3" />{t('client.replyToStaff')}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabs ────────────────────────────────────────────── */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-11 bg-muted/50 rounded-xl p-1">
          <TabsTrigger value="overview" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
            <LayoutDashboard className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('common.overview')}</span>
          </TabsTrigger>
          <TabsTrigger value="responses" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
            <MessageSquare className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('admin.responses')}</span>
            {responses.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">{responses.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
            <Paperclip className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('admin.attachments')}</span>
            {attachments.length > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-1">{attachments.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ──────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-0 shadow-sm glass-v2"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{responses.length}</p><p className="text-xs text-muted-foreground mt-0.5">{t('admin.responses')}</p></CardContent></Card>
            <Card className="border-0 shadow-sm glass-v2"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{attachments.length}</p><p className="text-xs text-muted-foreground mt-0.5">{t('admin.attachments')}</p></CardContent></Card>
            <Card className="border-0 shadow-sm glass-v2"><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{feedbackItems.length}</p><p className="text-xs text-muted-foreground mt-0.5">{t('client.staffMessages')}</p></CardContent></Card>
          </div>

          {/* Answered follow-ups history */}
          {answeredFeedback.length > 0 && (
            <Card className="border-0 shadow-sm glass-v2">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" />{t('client.feedbackHistory')}</p>
                {answeredFeedback.map((fb) => (
                  <div key={fb.id} className="rounded-lg border border-border/40 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-sm">{fb.question}</p><p className="text-xs text-muted-foreground">{new Date(fb.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</p></div>
                    </div>
                    <div className="ml-5 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200/40 dark:border-green-800/30 p-2.5">
                      <p className="text-sm text-green-800 dark:text-green-300">{fb.answer}</p>
                      {fb.answered_at && <p className="text-xs text-green-600/60 mt-1">{t('client.youReplied')} · {new Date(fb.answered_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</p>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Responses ─────────────────────────────────────── */}
        <TabsContent value="responses" className="mt-6 space-y-4">
          {responses.length === 0 ? (
            <Card className="border-0 shadow-md glass-v2">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">{t('client.noResponses')}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('client.noResponsesDesc')}</p>
                {project.template_id && (
                  <a href={`/${locale}/form/${project.slug}/fill`} className="mt-4">
                    <Button size="sm" className="gap-1.5 bg-gradient-to-r from-[#FE0404] to-[#D00303] text-white"><FileText className="h-3.5 w-3.5" />{t('client.fillRequirements')}</Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ) : responses.map((resp) => {
            const answers = answersByResponse[resp.id] ?? [];
            const answerMap = new Map(answers.map(a => [a.question_id, a.value]));
            return (
              <Card key={resp.id} className="border-0 shadow-md glass-v2 overflow-hidden">
                <div className="border-b border-border/40 bg-muted/30 px-5 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full bg-gradient-to-br from-[#FE0404]/20 to-[#FE0404]/5 p-2 shrink-0"><MessageSquare className="h-4 w-4 text-[#FE0404]" /></div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{resp.respondent_name || resp.respondent_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {resp.status === 'submitted'
                          ? <>{t('client.submittedOn')} {resp.submitted_at ? new Date(resp.submitted_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</>
                          : <>{resp.progress_percent ?? 0}% {t('common.progress').toLowerCase()}</>}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={resp.status === 'submitted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0' : resp.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0' : 'bg-muted text-muted-foreground border-0'}>
                    {resp.status === 'submitted' ? <CheckCircle className="h-3 w-3 mr-1" /> : resp.status === 'in_progress' ? <Clock className="h-3 w-3 mr-1" /> : null}
                    {resp.status}
                  </Badge>
                </div>
                <CardContent className="p-5 space-y-6">
                  {resp.summary_markdown && (
                    <div className="rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 dark:from-violet-950/20 dark:to-blue-950/20 border border-violet-200/40 dark:border-violet-800/30 p-4">
                      <div className="flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4 text-violet-600" /><p className="text-sm font-semibold text-violet-900 dark:text-violet-200">AI Summary</p></div>
                      <p className="text-sm text-violet-800/90 dark:text-violet-300/90 whitespace-pre-wrap leading-relaxed">{resp.summary_markdown}</p>
                    </div>
                  )}
                  {sections.map((section) => {
                    const sq = questions.filter(q => q.section_id === section.id);
                    if (!sq.some(q => answerMap.has(q.id))) return null;
                    return (
                      <div key={section.id}>
                        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><ChevronRight className="h-4 w-4 text-muted-foreground" />{resolveLabel(section.title, locale)}</h3>
                        <div className="space-y-3 ml-6">
                          {sq.map((q) => {
                            const val = answerMap.get(q.id);
                            if (val === undefined) return null;
                            const display = formatValue(val);
                            return (
                              <div key={q.id}>
                                <p className="text-xs font-medium text-muted-foreground mb-0.5">{resolveLabel(q.label, locale)}{q.is_required && <span className="text-red-500 ml-0.5">*</span>}</p>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words bg-muted/30 rounded-lg px-3 py-2">{display === '—' ? <span className="text-muted-foreground italic">{display}</span> : display}</p>
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
          })}
        </TabsContent>

        {/* ── Files ─────────────────────────────────────────── */}
        <TabsContent value="files" className="mt-6 space-y-4">
          {attachments.length === 0 ? (
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
                    <div className="shrink-0 rounded-xl bg-muted/50 p-3">{getMimeIcon(att.mime_type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{att.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {att.file_size && <span>{formatBytes(att.file_size)}</span>}
                        {att.mime_type && <><span>·</span><span>{att.mime_type.split('/').pop()?.toUpperCase()}</span></>}
                        <span>·</span>
                        <span>{new Date(att.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                    {att.url && (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        <Button variant="outline" size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" />{t('common.download')}</Button>
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
