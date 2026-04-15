'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Link } from '@/i18n/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Mail,
  Users,
  Clock,
  Loader2,
  Eye,
  Send,
  AlertCircle,
  Pencil,
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Image as ImageIcon,
  Film,
  File as FileIcon,
  Download,
  CheckCircle2,
  XCircle,
  MessageSquarePlus,
  ShieldCheck,
  UserCircle2,
  CalendarDays,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ProjectAttachment } from '@/lib/supabase/types';

// ── Attachment helpers ──────────────────────────────────────────
function getMimeIcon(mime: string | null) {
  if (!mime) return <FileIcon className="h-5 w-5 text-muted-foreground" />;
  if (mime.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (mime.startsWith('video/')) return <Film className="h-5 w-5 text-purple-500" />;
  if (mime === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (mime.includes('word') || mime.includes('document')) return <FileText className="h-5 w-5 text-blue-700" />;
  if (mime.includes('excel') || mime.includes('spreadsheet')) return <FileText className="h-5 w-5 text-green-600" />;
  if (mime.includes('powerpoint') || mime.includes('presentation')) return <FileText className="h-5 w-5 text-orange-500" />;
  if (mime === 'text/csv') return <FileText className="h-5 w-5 text-green-600" />;
  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50 MB

type ProjectData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  deadline_days: number;
  template_id: string | null;
  onedrive_link: string | null;
  welcome_text: Record<string, string> | null;
  created_at: string;
  created_by: string | null;
};

type TemplateOption = {
  id: string;
  name: string;
  is_default: boolean;
};

type ResponseData = {
  id: string;
  respondent_name: string | null;
  respondent_email: string;
  status: string;
  progress_percent: number;
};

type MagicLinkData = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  created_at: string;
};

export default function ProjectDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [invitations, setInvitations] = useState<MagicLinkData[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const attachFileRef = useRef<HTMLInputElement>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'draft' as 'draft' | 'active' | 'archived', deadline_days: 5, template_id: '' as string });
  const [savingEdit, setSavingEdit] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  // Approval & follow-up state
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [staffNote, setStaffNote] = useState('');
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [proposerInfo, setProposerInfo] = useState<{ email: string; full_name: string } | null>(null);
  const [proposalFeedback, setProposalFeedback] = useState<Array<{
    id: string; question: string; answer: string | null; status: string;
    created_at: string; answered_at: string | null;
  }>>([]);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.refreshSession();
    const [{ data: projData }, { data: respData }, { data: linkData }] = await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).single(),
      supabase.from('responses').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      supabase.from('magic_links').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
    ]);
    setProject(projData as ProjectData | null);
    setResponses((respData ?? []) as ResponseData[]);
    setInvitations((linkData ?? []) as MagicLinkData[]);

    // Load available templates
    const { data: tmplData } = await supabase
      .from('requirement_templates')
      .select('id, name, is_default')
      .order('is_default', { ascending: false });
    setTemplates((tmplData ?? []) as TemplateOption[]);

    // Load attachments via API (provides signed URLs)
    try {
      const attRes = await fetch(`/api/project/${projectId}/upload`);
      if (attRes.ok) {
        const { attachments: attData } = await attRes.json();
        setAttachments(attData ?? []);
      }
    } catch {
      // Non-critical — attachments tab will show empty state
    }

    // For pending_review projects: load proposer info and feedback history
    if (projData && (projData as ProjectData).status === 'pending_review') {
      try {
        const { data: membersData } = await supabase.rpc('get_project_members_info');
        const projectMembers = ((membersData ?? []) as Array<{ project_id: string; role: string; email: string; full_name: string }>)
          .filter((m) => m.project_id === projectId && m.role === 'product_owner');
        if (projectMembers.length > 0) {
          setProposerInfo({ email: projectMembers[0].email, full_name: projectMembers[0].full_name });
        }
      } catch { /* non-critical */ }

      try {
        const { data: fbData } = await supabase
          .from('feedback_requests')
          .select('id, question, answer, status, created_at, answered_at')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
        setProposalFeedback((fbData ?? []) as typeof proposalFeedback);
      } catch { /* non-critical */ }
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Attachment management ──────────────────────────────────
  async function uploadAttachments(files: FileList | File[]) {
    const arr = Array.from(files);
    setUploadingAttachment(true);
    let successCount = 0;
    for (const file of arr) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast.error(`"${file.name}" exceeds 50 MB limit.`);
        continue;
      }
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await fetch(`/api/project/${projectId}/upload`, {
          method: 'POST',
          body: fd,
        });
        if (res.ok) {
          const { attachment } = await res.json();
          setAttachments((prev) => [attachment, ...prev]);
          successCount++;
        } else {
          const body = await res.json();
          toast.error(`"${file.name}": ${body.error}`);
        }
      } catch {
        toast.error(`"${file.name}": upload failed`);
      }
    }
    if (successCount > 0) toast.success(t('project.attachmentUploaded'));
    setUploadingAttachment(false);
  }

  async function deleteAttachment(attachmentId: string) {
    try {
      const res = await fetch(`/api/project/${projectId}/upload`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachmentId }),
      });
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
        toast.success(t('project.attachmentDeleted'));
      } else {
        toast.error(t('project.attachmentDeleteFailed'));
      }
    } catch {
      toast.error(t('project.attachmentDeleteFailed'));
    }
  }

  function openEditDialog() {
    if (!project) return;
    setEditForm({
      name: project.name,
      description: project.description || '',
      status: project.status as 'draft' | 'active' | 'archived',
      deadline_days: project.deadline_days,
      template_id: project.template_id || '',
    });
    setEditDialogOpen(true);
  }

  async function saveProjectEdit() {
    if (!editForm.name.trim()) return;
    setSavingEdit(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      // Warn if changing template on a project with existing responses
      if (editForm.template_id !== (project?.template_id || '') && responses.length > 0) {
        const confirmed = window.confirm(
          'This project has existing responses. Changing the template may make those answers incompatible with the new questions. Continue?'
        );
        if (!confirmed) { setSavingEdit(false); return; }
      }
      const { error } = await supabase
        .from('projects')
        .update({
          name: editForm.name.trim(),
          description: editForm.description.trim() || null,
          status: editForm.status,
          deadline_days: Math.max(1, Math.min(90, editForm.deadline_days)),
          template_id: editForm.template_id || null,
        })
        .eq('id', projectId);
      if (error) { toast.error(error.message); return; }
      toast.success(t('project.projectUpdated'));
      setEditDialogOpen(false);
      loadData();
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Approval workflow ──────────────────────────────────────
  async function handleApprove() {
    if (!project) return;
    setApproving(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { error } = await supabase.rpc('approve_project', { p_project_id: project.id });
      if (error) { toast.error(`${t('admin.approveFailed')}: ${error.message}`); return; }
      toast.success(t('admin.projectApproved'));
      loadData();
    } catch {
      toast.error(t('admin.approveFailed'));
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    if (!project) return;
    setRejecting(true);
    setRejectDialogOpen(false);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { error } = await supabase.rpc('reject_project', {
        p_project_id: project.id,
        p_reason: staffNote.trim() || 'Rejected by staff',
      });
      if (error) { toast.error(`${t('admin.rejectFailed')}: ${error.message}`); return; }
      toast.success(t('admin.projectRejected'));
      loadData();
    } catch {
      toast.error(t('admin.rejectFailed'));
    } finally {
      setRejecting(false);
    }
  }

  async function sendProposalFollowUp() {
    if (!followUpMessage.trim() || !project) return;
    setSendingFollowUp(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(t('admin.followUpSendFailed')); return; }

      // Find the PO who proposed this project
      let assignedTo: string | null = null;
      if (project.created_by) {
        assignedTo = project.created_by;
      } else if (proposerInfo?.email) {
        // Fallback: look up user by email from project members
        const { data: membersData } = await supabase.rpc('get_project_members_info');
        const po = ((membersData ?? []) as Array<{ project_id: string; role: string; user_id?: string }>)
          .find((m) => m.project_id === projectId && m.role === 'product_owner');
        if (po && 'user_id' in po) assignedTo = po.user_id as string;
      }
      if (!assignedTo) { toast.error(t('admin.followUpSendFailed')); return; }

      const { error } = await supabase.from('feedback_requests').insert({
        project_id: project.id,
        requested_by: user.id,
        assigned_to: assignedTo,
        question: followUpMessage.trim(),
        status: 'pending',
      });
      if (error) { toast.error(`${t('admin.followUpSendFailed')}: ${error.message}`); return; }
      toast.success(t('admin.followUpSentToOwner'));
      setFollowUpMessage('');
      setShowFollowUpForm(false);
      loadData();
    } catch {
      toast.error(t('admin.followUpSendFailed'));
    } finally {
      setSendingFollowUp(false);
    }
  }

  async function sendInvitation() {
    if (!inviteEmail.trim() || !project) return;
    setSending(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const token = crypto.randomUUID();
      const encoder = new TextEncoder();
      const hash = await crypto.subtle.digest('SHA-256', encoder.encode(token));
      const tokenHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase.from('magic_links').insert({
        project_id: project.id,
        email: inviteEmail.trim().toLowerCase(),
        token_hash: tokenHash,
        role: 'client',
        status: 'sent',
        expires_at: new Date(Date.now() + project.deadline_days * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) { toast.error(error.message); setSending(false); return; }

      const magicUrl = `${window.location.origin}/${locale}/magic/${tokenHash}`;
      try {
        await navigator.clipboard.writeText(magicUrl);
        toast.success(t('admin.magicLinkCopied', { email: inviteEmail }));
      } catch {
        // Clipboard API failed (e.g. permissions) — show the link in a toast so admin can copy manually
        toast(magicUrl, { duration: 15000, description: t('admin.magicLinkCopied', { email: inviteEmail }) });
      }
      setInviteDialogOpen(false);
      setInviteEmail('');
      loadData();
    } catch { toast.error(t('admin.failedInvitation')); }
    finally { setSending(false); }
  }

  function copyFormLink() {
    if (!project) return;
    const url = `${window.location.origin}/${locale}/form/${project.slug}`;
    try {
      navigator.clipboard.writeText(url);
      toast.success(t('admin.linkCopied'));
    } catch {
      toast(url, { duration: 10000, description: t('admin.linkCopied') });
    }
  }

  const statusColor: Record<string, string> = { active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', archived: 'bg-muted text-muted-foreground', pending_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' };
  const respStatusColor: Record<string, string> = { submitted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', reviewed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' };
  const invStatusColor: Record<string, string> = { sent: 'bg-yellow-100 text-yellow-800', opened: 'bg-blue-100 text-blue-800', in_progress: 'bg-blue-100 text-blue-800', submitted: 'bg-green-100 text-green-800', expired: 'bg-muted text-muted-foreground', revoked: 'bg-red-100 text-red-800' };

  function statusLabel(status: string): string {
    const map: Record<string, string> = {
      draft: t('common.draft'),
      active: t('common.active'),
      archived: t('common.archived'),
      pending_review: t('common.pendingReview'),
      approved: t('client.approvedStatus'),
      in_progress: t('common.inProgress'),
      submitted: t('common.submitted'),
      reviewed: t('common.reviewed'),
    };
    return map[status] || status;
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!project) return <div className="flex flex-col items-center justify-center py-24"><AlertCircle className="h-12 w-12 text-muted-foreground mb-4" /><h2 className="text-xl font-semibold mb-2">{t('admin.projectNotFound')}</h2><Link href="/projects"><Button variant="outline">{t('admin.backToProjects')}</Button></Link></div>;

  const formUrl = `${window.location.origin}/${locale}/form/${project.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link href="/projects"><Button variant="ghost" size="icon" className="mt-1"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge className={statusColor[project.status] || ''}>{statusLabel(project.status)}</Badge>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openEditDialog}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground mt-1">{project.description || t('admin.noDescription')}</p>
          {project.onedrive_link && (
            <a
              href={project.onedrive_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('admin.oneDriveLink')}
            </a>
          )}
        </div>
      </div>

      {/* ── Pending Review: Approval Panel ─────────────────────── */}
      {project.status === 'pending_review' && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2">
                <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('admin.proposalReviewTitle')}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{t('admin.proposalReviewDesc')}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Proposer info */}
            {proposerInfo && (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('admin.proposedBy')}:</span>
                  <span className="font-medium">{proposerInfo.full_name}</span>
                  <span className="text-muted-foreground">({proposerInfo.email})</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t('admin.proposedOn')}:</span>
                  <span className="font-medium">{new Date(project.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            )}

            {/* Existing follow-up messages */}
            {proposalFeedback.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('admin.feedbackRequests')} ({proposalFeedback.length})</p>
                {proposalFeedback.map((fb) => (
                  <div key={fb.id} className="rounded-lg border border-border/50 bg-background/50 p-3 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <MessageSquarePlus className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{fb.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(fb.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {fb.status === 'pending' ? t('admin.feedbackPending') : fb.status === 'answered' ? t('admin.feedbackAnsweredStatus') : fb.status}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    {fb.answer && (
                      <div className="ml-6 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30 p-2.5">
                        <p className="text-sm text-green-800 dark:text-green-300">{fb.answer}</p>
                        {fb.answered_at && (
                          <p className="text-xs text-green-600/70 dark:text-green-400/70 mt-1">
                            {new Date(fb.answered_at).toLocaleDateString(locale, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Follow-up form */}
            {showFollowUpForm ? (
              <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t('admin.followUpMessageLabel')}</Label>
                  <Textarea
                    value={followUpMessage}
                    onChange={(e) => setFollowUpMessage(e.target.value)}
                    placeholder={t('admin.followUpMessagePlaceholder')}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">{t('admin.followUpToOwnerDesc')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={sendProposalFollowUp}
                    disabled={!followUpMessage.trim() || sendingFollowUp}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
                  >
                    {sendingFollowUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {t('admin.sendFollowUpToOwner')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setShowFollowUpForm(false); setFollowUpMessage(''); }}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFollowUpForm(true)}
                className="gap-2"
              >
                <MessageSquarePlus className="h-4 w-4" />
                {t('admin.askBeforeApproving')}
              </Button>
            )}

            {/* Staff note */}
            <div className="space-y-2">
              <Label className="text-sm">{t('admin.staffNoteLabel')}</Label>
              <Textarea
                value={staffNote}
                onChange={(e) => setStaffNote(e.target.value)}
                placeholder={t('admin.staffNotePlaceholder')}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleApprove}
                disabled={approving || rejecting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1 sm:flex-initial"
              >
                {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {t('admin.approveAndActivate')}
              </Button>
              <Button
                onClick={() => setRejectDialogOpen(true)}
                disabled={approving || rejecting}
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-2 flex-1 sm:flex-initial"
              >
                {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                {t('admin.rejectAndArchive')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {project.status === 'active' && (
        <Card className="border-[#FE0404]/20 bg-[#FE0404]/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <a href={formUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 min-w-0 group">
              <ExternalLink className="h-5 w-5 text-[#FE0404] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium group-hover:text-[#FE0404] transition-colors">{t('admin.openClientForm')}</p>
                <p className="text-xs text-muted-foreground">{t('admin.previewFormTooltip')}</p>
              </div>
            </a>
            <Button variant="outline" size="sm" className="gap-2 shrink-0 w-full sm:w-auto" onClick={copyFormLink}><Copy className="h-3.5 w-3.5" />{t('admin.copyLink')}</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-blue-50 p-2"><Mail className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{invitations.length}</p><p className="text-xs text-muted-foreground">{t('admin.invitationsSent')}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-green-50 p-2"><Users className="h-5 w-5 text-green-600" /></div><div><p className="text-2xl font-bold">{responses.length}</p><p className="text-xs text-muted-foreground">{t('admin.responsesReceived')}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-purple-50 p-2"><Clock className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{project.deadline_days}</p><p className="text-xs text-muted-foreground">{t('admin.daysDeadline')}</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="responses">
        <TabsList>
          <TabsTrigger value="responses">{t('admin.responses')}</TabsTrigger>
          <TabsTrigger value="invitations">{t('admin.invitations')}</TabsTrigger>
          <TabsTrigger value="attachments" className="gap-1.5">
            <Paperclip className="h-3.5 w-3.5" />
            {t('project.attachmentsTab')}
            {attachments.length > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                {attachments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="mt-4 space-y-3">
          {responses.length === 0
            ? <Card><CardContent className="p-6 text-center text-muted-foreground">{t('admin.noResponsesInvite')}</CardContent></Card>
            : responses.map((resp) => (
              <Card key={resp.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FE0404]/10 text-[#FE0404] font-semibold text-sm">
                      {(resp.respondent_name || resp.respondent_email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{resp.respondent_name || resp.respondent_email}</p>
                      <p className="text-xs text-muted-foreground truncate">{resp.respondent_email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-medium shrink-0">{resp.progress_percent}%</p>
                      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-[#FE0404] rounded-full" style={{ width: `${resp.progress_percent}%` }} /></div>
                    </div>
                    <Badge variant="secondary" className={respStatusColor[resp.status] || ''}>{statusLabel(resp.status)}</Badge>
                    <Link href={`/responses/${resp.id}`} className="ml-auto"><Button variant="ghost" size="sm" className="gap-1 h-8"><Eye className="h-3.5 w-3.5" />{t('admin.view')}</Button></Link>
                  </div>
                </CardContent>
              </Card>
            ))
          }
        </TabsContent>

        <TabsContent value="invitations" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg">{t('admin.inviteClient')}</CardTitle>
                <Button className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2 w-full sm:w-auto" size="sm" onClick={() => setInviteDialogOpen(true)}>
                  <Mail className="h-4 w-4" />{t('admin.sendInvitation')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {invitations.length === 0
                ? <p className="text-muted-foreground text-sm">{t('admin.noInvitations')}</p>
                : <div className="space-y-3">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{inv.email}</p>
                            <p className="text-xs text-muted-foreground">{t('admin.expires')}: {new Date(inv.expires_at).toLocaleDateString(locale)}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className={invStatusColor[inv.status] || ''}>{statusLabel(inv.status)}</Badge>
                      </div>
                    ))}
                  </div>
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Attachments Tab ───────────────────────── */}
        <TabsContent value="attachments" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-lg">{t('project.projectAttachments')}</CardTitle>
                <Button
                  size="sm"
                  className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2 w-full sm:w-auto"
                  onClick={() => attachFileRef.current?.click()}
                  disabled={uploadingAttachment}
                >
                  {uploadingAttachment ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {t('project.addAttachments')}
                </Button>
                <input
                  ref={attachFileRef}
                  type="file"
                  multiple
                  className="sr-only"
                  accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={(e) => e.target.files && uploadAttachments(e.target.files)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`mb-4 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer
                  ${isDragging ? 'border-[#FE0404] bg-[#FE0404]/5' : 'border-border hover:border-[#FE0404]/40 hover:bg-muted/20'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); uploadAttachments(e.dataTransfer.files); }}
                onClick={() => attachFileRef.current?.click()}
              >
                <Paperclip className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('form.dropFilesHere')}</p>
                <p className="text-xs text-muted-foreground/60">PDF, Word, Excel, PowerPoint, Images, Videos — max 50 MB</p>
              </div>

              {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('project.noAttachments')}</p>
              ) : (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 p-3"
                    >
                      <div className="shrink-0">{getMimeIcon(att.mime_type)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.file_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {att.file_size && (
                            <span className="text-xs text-muted-foreground">{formatBytes(att.file_size)}</span>
                          )}
                          {att.description && (
                            <span className="text-xs text-muted-foreground/70 truncate">· {att.description}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {att.url && (
                          <a href={att.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={t('project.viewAttachment')}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteAttachment(att.id)}
                          title={t('project.deleteAttachment')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.inviteDialogTitle')}</DialogTitle>
            <DialogDescription>{t('admin.inviteDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('admin.clientEmailLabel')}</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder={t('admin.clientEmailPlaceholder')} />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              {t('admin.magicLinkDescription')} <strong>{project.deadline_days} {t('admin.days')}</strong>.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={sendInvitation} disabled={!inviteEmail.trim() || sending} className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('admin.createCopyLink')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('project.editProject')}</DialogTitle>
            <DialogDescription>{t('admin.manageProjects')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('project.projectName')} *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('project.placeholderName')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('project.projectDescription')}</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t('project.descPlaceholder')}
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('project.projectStatus')}</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm((prev) => ({ ...prev, status: (v ?? prev.status) as 'draft' | 'active' | 'archived' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('common.draft')}</SelectItem>
                    <SelectItem value="active">{t('common.active')}</SelectItem>
                    <SelectItem value="archived">{t('common.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('project.deadlineDays')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={editForm.deadline_days}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, deadline_days: Math.max(1, Math.min(90, Number(e.target.value) || 1)) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('admin.template')}</Label>
              <Select
                value={editForm.template_id}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, template_id: v ?? prev.template_id }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.selectTemplate')} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tmpl) => (
                    <SelectItem key={tmpl.id} value={tmpl.id}>
                      {tmpl.name}{tmpl.is_default ? ' (Default)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editForm.template_id !== (project?.template_id || '') && responses.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('admin.templateChangeWarning')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={saveProjectEdit} disabled={!editForm.name.trim() || savingEdit} className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2">
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {t('common.confirmAction')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.rejectProjectConfirm', { name: project?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting}
              className="gap-2"
            >
              {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              {t('admin.rejectAndArchive')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
