import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, CheckCircle, MessageSquare, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { SubmitButton } from './_submit-button';
import type { Json } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

function resolveLabel(json: Json, locale: string): string {
  if (typeof json === 'string') return json;
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, string>;
    return obj[locale] || obj['en'] || obj['de'] || Object.values(obj)[0] || '';
  }
  return String(json ?? '');
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ locale: string; projectSlug: string }>;
}) {
  const { locale, projectSlug } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();
  const supabase = await createClient();

  // Get project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, status, template_id')
    .eq('slug', projectSlug)
    .single();

  if (!project || project.status !== 'active') {
    notFound();
  }

  // Find the latest in_progress response for this project
  // Try authenticated user first, then fallback to latest
  const { data: { user } } = await supabase.auth.getUser();

  let response;
  if (user) {
    const { data } = await supabase
      .from('responses')
      .select('id, status, progress_percent')
      .eq('project_id', project.id)
      .eq('respondent_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    response = data;

    // Fallback: try matching by email (for magic link users whose respondent_id wasn't set)
    if (!response && user.email) {
      const { data: emailMatch } = await supabase
        .from('responses')
        .select('id, status, progress_percent')
        .eq('project_id', project.id)
        .eq('respondent_email', user.email)
        .in('status', ['in_progress', 'draft'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      response = emailMatch;
    }
  }

  // If no response found or already submitted, handle appropriately
  if (!response) {
    // No response exists — redirect to fill to start fresh
    redirect(`/${locale}/form/${projectSlug}/fill`);
  }

  // If already submitted, redirect to done
  if (response.status === 'submitted' || response.status === 'reviewed') {
    redirect(`/${locale}/form/${projectSlug}/done`);
  }

  // Get template sections and questions
  const { data: sections } = await supabase
    .from('template_sections')
    .select('id, title, order_index')
    .eq('template_id', project.template_id!)
    .order('order_index', { ascending: true });

  const sectionIds = (sections ?? []).map(s => s.id);
  const { data: questions } = await supabase
    .from('template_questions')
    .select('id, section_id, label, type, is_required, order_index')
    .in('section_id', sectionIds.length > 0 ? sectionIds : ['__none__'])
    .order('order_index', { ascending: true });

  // Get answers for this response
  let answers: Record<string, { value: Json; ai_clarification: string | null }> = {};
  if (response) {
    const { data: answerRows } = await supabase
      .from('response_answers')
      .select('question_id, value, ai_clarification')
      .eq('response_id', response.id);

    for (const a of answerRows ?? []) {
      answers[a.question_id] = { value: a.value, ai_clarification: a.ai_clarification };
    }
  }

  // Group questions by section
  const questionsBySection = (questions ?? []).reduce<Record<string, typeof questions>>((acc, q) => {
    if (!acc[q.section_id]) acc[q.section_id] = [];
    acc[q.section_id]!.push(q);
    return acc;
  }, {});

  const totalQuestions = questions?.length ?? 0;
  const answeredCount = Object.keys(answers).length;
  const unanswered = totalQuestions - answeredCount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href={`/form/${projectSlug}/fill`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="font-semibold">{t('form.reviewTitle')}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-emerald-100 p-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">{t('form.reviewTitle')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('form.reviewSubtitle')}
          </p>
          <p className="text-sm text-muted-foreground mt-2 font-medium">
            {project.name}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
              <CheckCircle className="h-3 w-3" />
              {answeredCount} {t('common.answered')}
            </Badge>
            {unanswered > 0 && (
              <Badge variant="outline" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
                <AlertCircle className="h-3 w-3" />
                {unanswered} {t('common.unanswered')}
              </Badge>
            )}
          </div>
        </div>

        {/* Answers by Section */}
        <div className="space-y-6 mb-8">
          {(sections ?? []).map((section) => {
            const sectionQuestions = questionsBySection[section.id] ?? [];
            if (sectionQuestions.length === 0) return null;

            return (
              <Card key={section.id} className="border-0 shadow-md shadow-black/5 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {resolveLabel(section.title, locale)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sectionQuestions.map((q) => {
                    const answer = answers[q.id];
                    const displayValue = answer?.value;
                    const hasAnswer = displayValue !== null && displayValue !== undefined && displayValue !== '';

                    return (
                      <div key={q.id} className="border-b border-border/30 pb-3 last:border-0 last:pb-0">
                        <p className="text-sm font-medium text-foreground mb-1">
                          {resolveLabel(q.label, locale)}
                          {q.is_required && <span className="text-red-500 ml-1">*</span>}
                        </p>
                        {hasAnswer ? (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {Array.isArray(displayValue) ? displayValue.join(', ') : String(displayValue)}
                          </p>
                        ) : (
                          <p className="text-sm text-orange-500 italic">
                            {t('common.notAnswered')}
                          </p>
                        )}
                        {answer?.ai_clarification && (
                          <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <MessageSquare className="h-3 w-3 mt-0.5 text-[#FE0404]" />
                            <span>{answer.ai_clarification}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-between items-center">
          <Link href={`/form/${projectSlug}/fill`}>
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </Button>
          </Link>
          {response ? (
            <SubmitButton responseId={response.id} />
          ) : (
            <Link href={`/form/${projectSlug}/fill`}>
              <Button className="bg-[#FE0404] hover:bg-[#E00303] text-white gap-2">
                {t('form.startForm')}
              </Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
