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
import { Plus, FileText, Layers, HelpCircle, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  org_id: string | null;
  created_at: string;
  sectionCount: number;
  questionCount: number;
};

export default function TemplatesPage() {
  const t = useTranslations();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const loadTemplates = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.refreshSession();

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
      setError(`Failed to load templates: ${tmplErr.message}`);
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
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  async function handleCreateTemplate() {
    if (!newName.trim()) return;
    setCreating(true);

    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();

      const { data: { user } } = await supabase.auth.getUser();
      const orgId = user?.app_metadata?.org_id;

      const { error: insertErr } = await supabase.from('requirement_templates').insert({
        name: newName.trim(),
        description: newDesc.trim() || null,
        org_id: orgId || null,
        is_default: false,
      });

      if (insertErr) {
        toast.error(`Failed to create template: ${insertErr.message}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('admin.templates')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('admin.manageTemplatesDesc')}
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

      {templates.length === 0 ? (
        <Card className="border-0 shadow-md shadow-black/5 glass-v2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-2xl bg-muted p-4 mb-4">
              <FileText className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('admin.noTemplatesYet')}</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              {t('admin.templatesDescription')}
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Link key={template.id} href={`/templates/${template.id}`}>
              <Card className="border-0 shadow-md shadow-black/5 glass-v2 spotlight-card transition-all duration-300 hover:shadow-lg hover:border-[#FE0404]/20 h-full cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{template.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {template.description || t('admin.noDescription')}
                      </p>
                    </div>
                    {template.is_default && (
                      <Badge variant="secondary" className="bg-[#FE0404]/10 text-[#FE0404] shrink-0 ml-2">
                        {t('common.default')}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      {template.sectionCount} {t('admin.sections')}
                    </span>
                    <span className="flex items-center gap-1">
                      <HelpCircle className="h-3 w-3" />
                      {template.questionCount} {t('admin.questions')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Create Template Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.createNewTemplate')}</DialogTitle>
            <DialogDescription>
              {t('admin.createNewTemplateDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tmpl-name">{t('admin.templateNameRequired')}</Label>
              <Input
                id="tmpl-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('admin.templateNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tmpl-desc">{t('admin.descriptionLabel')}</Label>
              <Textarea
                id="tmpl-desc"
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
              disabled={creating || !newName.trim()}
              className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2"
            >
              {creating && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('admin.createTemplate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
