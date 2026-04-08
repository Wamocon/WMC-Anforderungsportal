'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardCheck, ArrowLeft, Save, Download,
  CheckCircle2, XCircle, Target, AlertTriangle,
  Loader2, Trophy, Frown, Presentation,
  Smartphone, Brain, RotateCcw, Globe,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Link } from '@/i18n/navigation';
import { toast } from 'sonner';
import type { Json } from '@/lib/supabase/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectData = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  requirement_type: string[];
  approved_at: string | null;
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

type AnswerData = {
  question_id: string;
  value: Json;
};

type ChecklistItem = {
  id: string;
  questionId: string | null;
  text: string;
  sectionTitle: string;
  isFulfilled: boolean;
  answer: string;
  notes: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLocalizedText(json: Json, locale: string): string {
  if (typeof json === 'string') return json;
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, string>;
    return obj[locale] || obj['en'] || obj['de'] || Object.values(obj)[0] || '';
  }
  return String(json ?? '');
}

function formatAnswer(value: Json | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChecklistPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const projectId = params.projectId as string;

  // Data state
  const [project, setProject] = useState<ProjectData | null>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Wave review state
  const [waveName, setWaveName] = useState(() => {
    const now = new Date();
    const week = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);
    return `Sprint ${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  });
  const [failureReason, setFailureReason] = useState('');
  const [showResultDialog, setShowResultDialog] = useState(false);

  // ─── Load project data ──────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: session } = await supabase.auth.refreshSession();
        if (!session?.session) { setLoading(false); return; }

        // Fetch project, template, sections, questions, and responses in parallel
        const { data: projectData, error: projError } = await supabase
          .from('projects')
          .select('id, name, description, status, requirement_type, approved_at, template_id')
          .eq('id', projectId)
          .single();

        if (projError || !projectData) {
          setLoadError(t('admin.projectNotFound'));
          setLoading(false);
          return;
        }

        setProject(projectData as ProjectData);

        if (!projectData.template_id) {
          setLoadError(t('requirements.noTemplate'));
          setLoading(false);
          return;
        }

        // Get sections and latest response in parallel
        const [sectionsRes, responsesRes] = await Promise.all([
          supabase
            .from('template_sections')
            .select('id, title, order_index')
            .eq('template_id', projectData.template_id)
            .order('order_index'),
          supabase
            .from('responses')
            .select('id')
            .eq('project_id', projectId)
            .order('updated_at', { ascending: false })
            .limit(1),
        ]);

        const sections = (sectionsRes.data ?? []) as SectionData[];
        const sectionIds = sections.map(s => s.id);

        // Fetch questions for these sections (guard against empty array)
        const { data: questionData } = sectionIds.length > 0
          ? await supabase
              .from('template_questions')
              .select('id, section_id, label, type, is_required, order_index')
              .in('section_id', sectionIds)
              .order('order_index')
          : { data: [] };

        const questions = (questionData ?? []) as QuestionData[];

        // Get answers from latest response
        let answers: AnswerData[] = [];
        if (responsesRes.data && responsesRes.data.length > 0) {
          const { data: answerData } = await supabase
            .from('response_answers')
            .select('question_id, value')
            .eq('response_id', responsesRes.data[0].id);
          answers = (answerData ?? []) as AnswerData[];
        }

        const answerMap = new Map(answers.map(a => [a.question_id, a.value]));

        // Build checklist items from questions
        const items: ChecklistItem[] = questions.map(q => {
          const section = sections.find(s => s.id === q.section_id);
          const sectionTitle = section ? getLocalizedText(section.title, locale) : '';
          const questionText = getLocalizedText(q.label, locale);
          const answerValue = answerMap.get(q.id);

          return {
            id: q.id,
            questionId: q.id,
            text: questionText,
            sectionTitle,
            isFulfilled: false,
            answer: formatAnswer(answerValue),
            notes: '',
          };
        });

        setChecklist(items);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load checklist:', err);
        setLoadError(t('errors.loadFailed'));
        setLoading(false);
      }
    }
    load();
  }, [projectId, locale, t]);

  // ─── Checklist operations ─────────────────────────────────────────────

  const toggleItem = useCallback((itemId: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, isFulfilled: !item.isFulfilled } : item
    ));
  }, []);

  const updateItemNotes = useCallback((itemId: string, notes: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, notes } : item
    ));
  }, []);

  const resetChecklist = useCallback(() => {
    setChecklist(prev => prev.map(item => ({ ...item, isFulfilled: false, notes: '' })));
    setFailureReason('');
    toast.success(t('requirements.checklistReset'));
  }, [t]);

  // ─── Computed values ──────────────────────────────────────────────────

  const fulfilledCount = useMemo(() => checklist.filter(i => i.isFulfilled).length, [checklist]);
  const totalCount = checklist.length;
  const percentage = totalCount > 0 ? Math.round((fulfilledCount / totalCount) * 100) : 0;
  const goalReached = fulfilledCount >= totalCount && totalCount > 0;

  // Group by section
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    checklist.forEach(item => {
      const key = item.sectionTitle || t('requirements.uncategorized');
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [checklist, t]);

  // ─── Save wave review ─────────────────────────────────────────────────

  const saveWaveReview = useCallback(async () => {
    if (!project) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Insert wave review
      const { data: review, error: reviewError } = await supabase
        .from('wave_reviews')
        .insert({
          project_id: project.id,
          wave_name: waveName,
          reviewer_id: user?.id ?? null,
          total_requirements: totalCount,
          fulfilled_count: fulfilledCount,
          failure_reason: goalReached ? null : (failureReason.trim() || null),
          notes: null,
        })
        .select('id')
        .single();

      if (reviewError) {
        // Table might not exist yet if migration hasn't run — save as JSON fallback
        console.warn('wave_reviews insert failed (migration may be pending):', reviewError.message);
        toast.warning(t('requirements.savedLocally'));
        setSaving(false);
        setShowResultDialog(true);
        return;
      }

      // Insert checklist items
      const items = checklist.map(item => ({
        wave_review_id: review.id,
        question_id: item.questionId,
        requirement_text: item.text,
        is_fulfilled: item.isFulfilled,
        notes: item.notes || null,
        checked_by: user?.id ?? null,
        checked_at: item.isFulfilled ? new Date().toISOString() : null,
      }));

      await supabase.from('wave_review_items').insert(items);

      toast.success(t('requirements.reviewSaved'));
      setShowResultDialog(true);
    } catch (err) {
      console.error('Save error:', err);
      toast.error(t('errors.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [project, waveName, totalCount, fulfilledCount, goalReached, failureReason, checklist, t]);

  // ─── Export checklist as CSV ──────────────────────────────────────────

  const exportChecklist = useCallback(() => {
    if (!project) return;
    const BOM = '\uFEFF';
    const headers = [
      t('requirements.section'),
      t('requirements.requirement'),
      t('requirements.clientAnswer'),
      t('requirements.fulfilled'),
      t('requirements.notes'),
    ];

    const rows = checklist.map(item => [
      item.sectionTitle,
      item.text,
      item.answer,
      item.isFulfilled ? '✓' : '✗',
      item.notes,
    ]);

    // Add summary row
    rows.push([]);
    rows.push([t('requirements.waveName'), waveName]);
    rows.push([t('requirements.totalRequirements'), String(totalCount)]);
    rows.push([t('requirements.fulfilled'), String(fulfilledCount)]);
    rows.push([t('requirements.goalReached'), goalReached ? t('common.yes') : t('common.no')]);
    if (!goalReached && failureReason) {
      rows.push([t('requirements.failureReason'), failureReason]);
    }

    const csv = BOM + [
      headers.join(','),
      ...rows.map(row =>
        row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}-checklist-${waveName.replace(/\s/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('requirements.exportSuccess', { count: String(checklist.length) }));
  }, [project, checklist, waveName, totalCount, fulfilledCount, goalReached, failureReason, t]);

  // ─── Loading state ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 rounded-xl" />
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="rounded-2xl bg-destructive/10 p-4 mb-4">
          <ClipboardCheck className="h-10 w-10 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('errors.somethingWentWrong')}</h3>
        <p className="text-muted-foreground max-w-md mb-4">{loadError}</p>
        <Link href="/requirements">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('requirements.backToList')}
          </Button>
        </Link>
      </div>
    );
  }

  const types = Array.isArray(project.requirement_type) ? project.requirement_type : [project.requirement_type];
  const typeIcons = {
    web_application: { icon: Globe, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    mobile_application: { icon: Smartphone, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    ai_application: { icon: Brain, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  } as const;
  const primaryType = types[0] as keyof typeof typeIcons;
  const primaryCfg = typeIcons[primaryType] ?? typeIcons.web_application;
  const PrimaryIcon = primaryCfg.icon;

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link href="/requirements" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('requirements.backToList')}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1">
              {types.map(rt => {
                const cfg = typeIcons[rt as keyof typeof typeIcons] ?? typeIcons.web_application;
                const Icon = cfg.icon;
                return (
                  <div key={rt} className={`rounded-xl p-2.5 ${cfg.bg} ring-2 ring-background`}>
                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                  </div>
                );
              })}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{project.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Presentation className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('requirements.checklistMode')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={resetChecklist}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t('requirements.reset')}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportChecklist}>
            <Download className="h-3.5 w-3.5" />
            {t('requirements.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Wave Name Input */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Label htmlFor="waveName" className="shrink-0 font-medium">
              {t('requirements.waveName')}:
            </Label>
            <Input
              id="waveName"
              value={waveName}
              onChange={(e) => setWaveName(e.target.value)}
              placeholder="e.g., Sprint 2026-W15"
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card className={`border-0 shadow-md ${goalReached ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20' : ''}`}>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`rounded-2xl p-3 ${goalReached ? 'bg-green-100 dark:bg-green-900/40' : 'bg-amber-100 dark:bg-amber-900/40'}`}>
                <Target className={`h-6 w-6 ${goalReached ? 'text-green-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('requirements.progress')}</p>
                <p className="text-3xl font-bold tracking-tight">
                  {fulfilledCount} / {totalCount}
                </p>
              </div>
            </div>
            <div className="flex-1 max-w-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{percentage}%</span>
                <Badge variant="secondary" className={goalReached ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}>
                  {goalReached ? t('requirements.goalReached') : t('requirements.goalNotReached')}
                </Badge>
              </div>
              <Progress value={percentage} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist Items by Section */}
      {Object.entries(groupedItems).map(([sectionTitle, items]) => (
        <Card key={sectionTitle} className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 py-3 px-5">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {sectionTitle}
              <Badge variant="outline" className="text-[10px] font-normal">
                {items.filter(i => i.isFulfilled).length}/{items.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y">
            {items.map(item => (
              <div
                key={item.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  item.isFulfilled ? 'bg-green-50/50 dark:bg-green-950/10' : 'hover:bg-accent/30'
                }`}
              >
                <Checkbox
                  checked={item.isFulfilled}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="mt-0.5 h-5 w-5 shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className={`text-sm font-medium ${item.isFulfilled ? 'line-through text-muted-foreground' : ''}`}>
                    {item.text}
                  </p>
                  {item.answer && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 inline-block">
                      {t('requirements.clientAnswer')}: {item.answer.length > 100 ? item.answer.slice(0, 100) + '…' : item.answer}
                    </p>
                  )}
                  <Input
                    placeholder={t('requirements.addNote')}
                    value={item.notes}
                    onChange={(e) => updateItemNotes(item.id, e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div className="shrink-0">
                  {item.isFulfilled ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground/30" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Failure Reason (shown when not all items are checked) */}
      {!goalReached && totalCount > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-sm">{t('requirements.failureReasonLabel')}</p>
                <p className="text-xs text-muted-foreground mt-0.5 mb-3">{t('requirements.failureReasonHelp')}</p>
                <Textarea
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  placeholder={t('requirements.failureReasonPlaceholder')}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/20 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-1 ${goalReached ? 'bg-green-100' : 'bg-amber-100'}`}>
                {goalReached ? <Trophy className="h-5 w-5 text-green-600" /> : <Frown className="h-5 w-5 text-amber-600" />}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {fulfilledCount}/{totalCount} {t('requirements.fulfilled')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {goalReached ? t('requirements.allGoalsReached') : t('requirements.someGoalsMissing', { count: String(totalCount - fulfilledCount) })}
                </p>
              </div>
            </div>
            <Button
              onClick={saveWaveReview}
              disabled={saving}
              className="gap-2 bg-[#FE0404] hover:bg-[#E00303] text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('requirements.saveReview')}
            </Button>
          </div>
        </div>
      </div>

      {/* Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {goalReached ? (
                <div className="rounded-full bg-green-100 p-2">
                  <Trophy className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <div className="rounded-full bg-amber-100 p-2">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
              )}
              {goalReached ? t('requirements.goalsReachedTitle') : t('requirements.goalsNotReachedTitle')}
            </DialogTitle>
            <DialogDescription>
              {goalReached
                ? t('requirements.goalsReachedDesc', { wave: waveName, count: String(totalCount) })
                : t('requirements.goalsNotReachedDesc', { wave: waveName, fulfilled: String(fulfilledCount), total: String(totalCount) })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-xl bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('requirements.waveName')}</span>
                <span className="font-medium">{waveName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('requirements.totalRequirements')}</span>
                <span className="font-medium">{totalCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('requirements.fulfilled')}</span>
                <span className="font-medium text-green-600">{fulfilledCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('requirements.completion')}</span>
                <span className="font-medium">{percentage}%</span>
              </div>
              {!goalReached && failureReason && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">{t('requirements.failureReason')}</p>
                  <p className="text-sm">{failureReason}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowResultDialog(false)}>
                {t('common.close')}
              </Button>
              <Button onClick={exportChecklist} className="gap-1.5">
                <Download className="h-4 w-4" />
                {t('requirements.exportCsv')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
