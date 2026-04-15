'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, FileText, Layers, HelpCircle, Loader2, AlertCircle, Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  sectionCount: number;
  questionCount: number;
};

export default function MyTemplatesPage() {
  const t = useTranslations();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.refreshSession();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const [
      { data: tmplData, error: tmplErr },
      { data: sectionData },
      { data: questionData },
    ] = await Promise.all([
      supabase
        .from('requirement_templates')
        .select('*')
        .order('is_default', { ascending: false }),
      supabase.from('template_sections').select('id, template_id'),
      supabase.from('template_questions').select('id, section_id'),
    ]);

    if (tmplErr) {
      setError(t('errors.loadFailed'));
      setLoading(false);
      return;
    }

    const sections = sectionData ?? [];
    const questions = questionData ?? [];

    const sectionsByTemplate = sections.reduce<Record<string, string[]>>((acc, s) => {
      if (!acc[s.template_id]) acc[s.template_id] = [];
      acc[s.template_id].push(s.id);
      return acc;
    }, {});

    const questionsBySection = questions.reduce<Record<string, number>>((acc, q) => {
      acc[q.section_id] = (acc[q.section_id] || 0) + 1;
      return acc;
    }, {});

    const list: Template[] = (tmplData ?? []).map((tmpl) => ({
      ...tmpl,
      sectionCount: sectionsByTemplate[tmpl.id]?.length ?? 0,
      questionCount: (sectionsByTemplate[tmpl.id] ?? []).reduce(
        (sum, sid) => sum + (questionsBySection[sid] ?? 0),
        0
      ),
    }));

    setTemplates(list);
    setError(null);
    setLoading(false);
  }, [t]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  async function handleCreateTemplate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: insertErr } = await supabase.from('requirement_templates').insert({
        name: newName.trim(),
        description: newDesc.trim() || null,
        org_id: user.app_metadata?.org_id || null,
        is_default: false,
        created_by: user.id,
      });

      if (insertErr) {
        toast.error(t('errors.saveFailed'));
        return;
      }

      toast.success(t('admin.templateCreated'));
      setDialogOpen(false);
      setNewName('');
      setNewDesc('');
      await loadTemplates();
    } catch {
      toast.error(t('admin.failedTemplate'));
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicateTemplate(templateId: string, templateName: string) {
    setDuplicating(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create new template
      const { data: newTmpl, error: tmplErr } = await supabase
        .from('requirement_templates')
        .insert({
          name: `${templateName} (Copy)`,
          description: null,
          org_id: user.app_metadata?.org_id || null,
          is_default: false,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (tmplErr || !newTmpl) {
        toast.error(t('errors.saveFailed'));
        return;
      }

      // Copy sections
      const { data: srcSections } = await supabase
        .from('template_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index');

      for (const sec of srcSections ?? []) {
        const { data: newSec } = await supabase
          .from('template_sections')
          .insert({
            template_id: newTmpl.id,
            title: sec.title,
            description: sec.description,
            order_index: sec.order_index,
            is_required: sec.is_required,
          })
          .select('id')
          .single();

        if (!newSec) continue;

        // Copy questions for this section
        const { data: srcQuestions } = await supabase
          .from('template_questions')
          .select('*')
          .eq('section_id', sec.id)
          .order('order_index');

        for (const q of srcQuestions ?? []) {
          await supabase.from('template_questions').insert({
            section_id: newSec.id,
            type: q.type,
            label: q.label,
            placeholder: q.placeholder,
            help_text: q.help_text,
            options: q.options,
            validation: q.validation,
            order_index: q.order_index,
            is_required: q.is_required,
            conditional_logic: q.conditional_logic,
          });
        }
      }

      toast.success(t('admin.templateCreated'));
      await loadTemplates();
    } catch {
      toast.error(t('errors.saveFailed'));
    } finally {
      setDuplicating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Separate own templates from default/system templates
  const myTemplates = templates.filter(t => t.created_by === currentUserId);
  const systemTemplates = templates.filter(t => t.is_default || (t.created_by !== currentUserId && t.created_by !== null));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('client.myTemplates')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('client.myTemplatesDesc')}
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2 w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          {t('template.newTemplate')}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* My Templates */}
      {myTemplates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('client.myOwnTemplates')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myTemplates.map((template) => (
              <Link key={template.id} href={`/my-templates/${template.id}`}>
                <Card className="border-0 shadow-md shadow-black/5 glass-v2 spotlight-card transition-all duration-300 hover:shadow-lg hover:border-[#FE0404]/20 h-full cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{template.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.description || t('admin.noDescription')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5" />
                        <span>{template.sectionCount} {t('admin.sections')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HelpCircle className="h-3.5 w-3.5" />
                        <span>{template.questionCount} {t('admin.questions')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* System/Default Templates — read-only, can duplicate */}
      {systemTemplates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{t('client.systemTemplates')}</h2>
          <p className="text-sm text-muted-foreground">{t('client.systemTemplatesDesc')}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {systemTemplates.map((template) => (
              <Card key={template.id} className="border-0 shadow-md shadow-black/5 glass-v2 h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.is_default && (
                          <Badge className="bg-[#FE0404]/10 text-[#FE0404] text-[10px]">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {template.description || t('admin.noDescription')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{template.sectionCount} {t('admin.sections')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      <span>{template.questionCount} {t('admin.questions')}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 w-full"
                      disabled={duplicating}
                      onClick={() => handleDuplicateTemplate(template.id, template.name)}
                    >
                      {duplicating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                      {t('client.duplicateTemplate')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {templates.length === 0 && (
        <Card className="border-0 shadow-md shadow-black/5 glass-v2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('admin.noTemplatesYet')}</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {t('client.noTemplatesDesc')}
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('template.newTemplate')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.createNewTemplate')}</DialogTitle>
            <DialogDescription>{t('admin.createNewTemplateDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('admin.templateNameRequired')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('admin.templateNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('admin.descriptionLabel')}</Label>
              <Textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder={t('admin.descPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateTemplate}
              disabled={!newName.trim() || creating}
              className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('admin.createTemplate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
