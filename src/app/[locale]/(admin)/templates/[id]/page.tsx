'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Switch } from '@/components/ui/switch';
import { Link } from '@/i18n/navigation';
import {
  ArrowLeft,
  Plus,
  Loader2,
  GripVertical,
  Trash2,
  Layers,
  HelpCircle,
  Save,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';
import type { QuestionType } from '@/lib/supabase/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SectionRow = {
  id: string;
  template_id: string;
  title: Record<string, string>;
  description: Record<string, string> | null;
  order_index: number;
  is_required: boolean;
};

type QuestionRow = {
  id: string;
  section_id: string;
  type: string;
  label: Record<string, string>;
  placeholder: Record<string, string> | null;
  help_text: Record<string, string> | null;
  options: string[] | null;
  validation: Record<string, unknown> | null;
  order_index: number;
  is_required: boolean;
  conditional_logic: unknown;
};

const QUESTION_TYPES = [
  { value: 'text', labelKey: 'shortText' },
  { value: 'textarea', labelKey: 'longText' },
  { value: 'radio', labelKey: 'singleChoice' },
  { value: 'multi_select', labelKey: 'multipleChoice' },
  { value: 'checkbox', labelKey: 'checkbox' },
  { value: 'select', labelKey: 'dropdown' },
  { value: 'date', labelKey: 'dateField' },
  { value: 'file', labelKey: 'fileUpload' },
  { value: 'rating', labelKey: 'ratingField' },
];

function SortableQuestion({
  q,
  getLabel,
  onDelete,
}: {
  q: QuestionRow;
  getLabel: (obj: Record<string, string> | string | null) => string;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 px-3 sm:px-4 py-3 hover:bg-muted/20 group">
      <button type="button" className="cursor-grab active:cursor-grabbing shrink-0 hidden sm:block touch-none" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium break-words">{getLabel(q.label)}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-xs">{q.type}</Badge>
          {q.is_required && (
            <Badge variant="outline" className="text-xs text-[#FE0404] border-[#FE0404]/30">Required</Badge>
          )}
          {q.options && Array.isArray(q.options) && q.options.length > 0 && (
            <span className="text-xs text-muted-foreground">{q.options.length} options</span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
        onClick={() => onDelete(q.id)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function TemplateDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const params = useParams();
  const templateId = params.id as string;

  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialogs
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  const [newQuestionLabel, setNewQuestionLabel] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('text');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [newQuestionOptions, setNewQuestionOptions] = useState('');

  const loadTemplate = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.refreshSession();

    const [
      { data: tmplData },
      { data: secData },
      { data: qData },
    ] = await Promise.all([
      supabase.from('requirement_templates').select('*').eq('id', templateId).single(),
      supabase.from('template_sections').select('*').eq('template_id', templateId).order('order_index'),
      supabase.from('template_questions').select('*'),
    ]);

    if (tmplData) {
      setTemplateName(tmplData.name || '');
      setTemplateDesc(tmplData.description || '');
      setIsDefault(tmplData.is_default ?? false);
    }

    const secs = (secData ?? []) as SectionRow[];
    setSections(secs);

    const sectionIds = new Set(secs.map((s) => s.id));
    setQuestions(
      ((qData ?? []) as QuestionRow[])
        .filter((q) => sectionIds.has(q.section_id))
        .sort((a, b) => a.order_index - b.order_index)
    );

    setLoading(false);
  }, [templateId]);

  useEffect(() => { loadTemplate(); }, [loadTemplate]);

  function getLabel(obj: Record<string, string> | string | null): string {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[locale] || obj['en'] || obj['de'] || Object.values(obj)[0] || '';
  }

  async function saveTemplate() {
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { error } = await supabase
        .from('requirement_templates')
        .update({ name: templateName, description: templateDesc })
        .eq('id', templateId);

      if (error) toast.error(error.message);
      else toast.success(t('admin.templateSaved'));
    } finally {
      setSaving(false);
    }
  }

  async function addSection() {
    if (!newSectionTitle.trim()) return;
    const supabase = createClient();
    await supabase.auth.refreshSession();

    const { error } = await supabase.from('template_sections').insert({
      template_id: templateId,
      title: { en: newSectionTitle.trim(), de: newSectionTitle.trim() },
      description: newSectionDesc.trim() ? { en: newSectionDesc.trim(), de: newSectionDesc.trim() } : null,
      order_index: sections.length,
      is_required: true,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t('admin.sectionAdded'));
    setSectionDialogOpen(false);
    setNewSectionTitle('');
    setNewSectionDesc('');
    loadTemplate();
  }

  async function addQuestion() {
    if (!newQuestionLabel.trim() || !activeSectionId) return;
    const supabase = createClient();
    await supabase.auth.refreshSession();

    const sectionQuestions = questions.filter((q) => q.section_id === activeSectionId);
    const options = newQuestionOptions.trim()
      ? newQuestionOptions.split('\n').map((o) => o.trim()).filter(Boolean)
      : null;

    const { error } = await supabase.from('template_questions').insert({
      section_id: activeSectionId,
      type: newQuestionType,
      label: { en: newQuestionLabel.trim(), de: newQuestionLabel.trim() },
      is_required: newQuestionRequired,
      order_index: sectionQuestions.length,
      options,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(t('admin.questionAdded'));
    setQuestionDialogOpen(false);
    setNewQuestionLabel('');
    setNewQuestionType('text');
    setNewQuestionRequired(false);
    setNewQuestionOptions('');
    loadTemplate();
  }

  async function deleteSection(sectionId: string) {
    const supabase = createClient();
    // Delete questions first
    await supabase.from('template_questions').delete().eq('section_id', sectionId);
    await supabase.from('template_sections').delete().eq('id', sectionId);
    toast.success(t('admin.sectionDeleted'));
    loadTemplate();
  }

  async function deleteQuestion(questionId: string) {
    const supabase = createClient();
    await supabase.from('template_questions').delete().eq('id', questionId);
    toast.success(t('admin.questionDeleted'));
    loadTemplate();
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleQuestionDragEnd(sectionId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionQuestions = questions
      .filter((q) => q.section_id === sectionId)
      .sort((a, b) => a.order_index - b.order_index);

    const oldIndex = sectionQuestions.findIndex((q) => q.id === active.id);
    const newIndex = sectionQuestions.findIndex((q) => q.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(sectionQuestions, oldIndex, newIndex);

    // Optimistic UI update
    setQuestions((prev) => {
      const otherQuestions = prev.filter((q) => q.section_id !== sectionId);
      return [...otherQuestions, ...reordered.map((q, i) => ({ ...q, order_index: i }))];
    });

    // Persist to DB
    const supabase = createClient();
    await Promise.all(
      reordered.map((q, i) =>
        supabase.from('template_questions').update({ order_index: i }).eq('id', q.id)
      )
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon" className="mt-1 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-xl sm:text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
              placeholder={t('admin.templateNameLabel')}
            />
            {isDefault && (
              <Badge className="bg-[#FE0404]/10 text-[#FE0404] shrink-0 self-start">Default</Badge>
            )}
          </div>
          <Input
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
            className="text-muted-foreground border-none shadow-none focus-visible:ring-0 px-0 text-sm h-auto mt-1"
              placeholder={t('admin.templateDescPlaceholder')}
          />
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button
            onClick={saveTemplate}
            disabled={saving}
            className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2 w-full sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Layers className="h-4 w-4" />
          {sections.length} {t('admin.sections')}
        </span>
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4" />
          {questions.length} {t('admin.questions')}
        </span>
      </div>

      {/* Sections */}
      {sections.map((sec) => {
        const sQuestions = questions.filter((q) => q.section_id === sec.id);
        return (
          <Card key={sec.id} className="border-0 shadow-md shadow-black/5">
            <CardHeader className="bg-muted/30 rounded-t-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                  <CardTitle className="text-base sm:text-lg truncate">{getLabel(sec.title)}</CardTitle>
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {sQuestions.length} questions
                  </Badge>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setActiveSectionId(sec.id);
                      setQuestionDialogOpen(true);
                    }}
                    className="gap-1 text-xs h-7"
                  >
                    <Plus className="h-3 w-3" />
                    Add Question
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteSection(sec.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {sQuestions.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  No questions yet. Click &quot;Add Question&quot; to start.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => handleQuestionDragEnd(sec.id, event)}
                >
                  <SortableContext items={sQuestions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="divide-y">
                      {sQuestions.map((q) => (
                        <SortableQuestion
                          key={q.id}
                          q={q}
                          getLabel={getLabel}
                          onDelete={deleteQuestion}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Add Section Button */}
      <Button
        variant="outline"
        onClick={() => setSectionDialogOpen(true)}
        className="w-full border-dashed gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Section
      </Button>

      {/* Add Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
            <DialogDescription>
              Sections group related questions together.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Section Title *</Label>
              <Input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder="e.g., Project Overview"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newSectionDesc}
                onChange={(e) => setNewSectionDesc(e.target.value)}
                placeholder="Brief description of this section..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={addSection}
              disabled={!newSectionTitle.trim()}
              className="bg-[#FE0404] hover:bg-[#E00303] text-white"
            >
              Add Section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>
              Define a new question for this section.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Question *</Label>
              <Input
                value={newQuestionLabel}
                onChange={(e) => setNewQuestionLabel(e.target.value)}
                placeholder="e.g., What is the target audience?"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newQuestionType} onValueChange={(v) => { if (v) setNewQuestionType(v as QuestionType); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((qt) => (
                    <SelectItem key={qt.value} value={qt.value}>{t(`admin.${qt.labelKey}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {['radio', 'multi_select', 'select', 'checkbox'].includes(newQuestionType) && (
              <div className="space-y-2">
                <Label>Options (one per line)</Label>
                <Textarea
                  value={newQuestionOptions}
                  onChange={(e) => setNewQuestionOptions(e.target.value)}
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  rows={4}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>Required</Label>
              <Switch
                checked={newQuestionRequired}
                onCheckedChange={setNewQuestionRequired}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={addQuestion}
              disabled={!newQuestionLabel.trim()}
              className="bg-[#FE0404] hover:bg-[#E00303] text-white"
            >
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
