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
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'radio', label: 'Single Choice' },
  { value: 'multi_select', label: 'Multiple Choice' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Dropdown' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File Upload' },
  { value: 'rating', label: 'Rating (1-5)' },
];

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
      else toast.success('Template saved');
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

    toast.success('Section added');
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

    toast.success('Question added');
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
    toast.success('Section deleted');
    loadTemplate();
  }

  async function deleteQuestion(questionId: string) {
    const supabase = createClient();
    await supabase.from('template_questions').delete().eq('id', questionId);
    toast.success('Question deleted');
    loadTemplate();
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
      <div className="flex items-start gap-4">
        <Link href="/templates">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-2xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
              placeholder="Template Name"
            />
            {isDefault && (
              <Badge className="bg-[#FE0404]/10 text-[#FE0404] shrink-0">Default</Badge>
            )}
          </div>
          <Input
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
            className="text-muted-foreground border-none shadow-none focus-visible:ring-0 px-0 text-sm h-auto mt-1"
            placeholder="Template description..."
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={saveTemplate}
            disabled={saving}
            className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Layers className="h-4 w-4" />
          {sections.length} sections
        </span>
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4" />
          {questions.length} questions
        </span>
      </div>

      {/* Sections */}
      {sections.map((sec) => {
        const sQuestions = questions.filter((q) => q.section_id === sec.id);
        return (
          <Card key={sec.id} className="border-0 shadow-md shadow-black/5">
            <CardHeader className="bg-muted/30 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <CardTitle className="text-lg">{getLabel(sec.title)}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {sQuestions.length} questions
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
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
                  No questions yet. Click "Add Question" to start.
                </div>
              ) : (
                <div className="divide-y">
                  {sQuestions.map((q) => (
                    <div key={q.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 group">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{getLabel(q.label)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
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
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteQuestion(q.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
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
                    <SelectItem key={qt.value} value={qt.value}>{qt.label}</SelectItem>
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
