import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ReviewClient } from './_review-client';
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

  // Transform sections + answers for the client component
  const reviewSections = (sections ?? []).map((section) => ({
    id: section.id,
    title: resolveLabel(section.title, locale),
    questions: (questionsBySection[section.id] ?? []).map((q) => ({
      id: q.id,
      label: resolveLabel(q.label, locale),
      type: q.type,
      is_required: q.is_required,
      value: answers[q.id]?.value ?? null,
      ai_clarification: answers[q.id]?.ai_clarification ?? null,
    })),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-card/80 backdrop-blur-xl shadow-sm">
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

      <ReviewClient
        sections={reviewSections}
        responseId={response.id}
        projectName={project.name}
        projectSlug={projectSlug}
        locale={locale}
        respondentName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
      />
    </div>
  );
}
