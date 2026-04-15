import { setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { FormFillClient, type Section, type QuestionOption, type QuestionType } from './_form-fill-client';
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

function resolveOptions(json: Json | null, locale: string): QuestionOption[] | undefined {
  if (!json || !Array.isArray(json)) return undefined;
  return json.map((opt, index) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    if (opt && typeof opt === 'object' && 'label' in opt) {
      const option = opt as Record<string, Json>;
      const label = resolveLabel(option.label as Json, locale);
      const rawValue = option.value;
      return {
        value: typeof rawValue === 'string' && rawValue.trim() ? rawValue : label || `option-${index}`,
        label,
      };
    }
    if (opt && typeof opt === 'object' && 'value' in opt) {
      const value = String((opt as Record<string, Json>).value ?? '');
      return { value, label: value };
    }
    const value = String(opt);
    return { value, label: value };
  });
}

export default async function FormFillPage({
  params,
}: {
  params: Promise<{ locale: string; projectSlug: string }>;
}) {
  const { locale, projectSlug } = await params;
  setRequestLocale(locale);

  const supabase = await createClient();

  // Fetch project by slug
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, template_id, slug, status')
    .eq('slug', projectSlug)
    .single();

  if (!project || project.status !== 'active' || !project.template_id) {
    notFound();
  }

  // Fetch template sections
  const { data: dbSections } = await supabase
    .from('template_sections')
    .select('*')
    .eq('template_id', project.template_id)
    .order('order_index', { ascending: true });

  // Empty template (no sections) — can't render a form
  if (!dbSections || dbSections.length === 0) {
    notFound();
  }

  // Fetch all questions for these sections
  const sectionIds = (dbSections ?? []).map((s) => s.id);
  const { data: dbQuestions } = await supabase
    .from('template_questions')
    .select('*')
    .in('section_id', sectionIds.length > 0 ? sectionIds : ['__none__'])
    .order('order_index', { ascending: true });

  // Group questions by section
  const questionsBySection = (dbQuestions ?? []).reduce<Record<string, typeof dbQuestions>>((acc, q) => {
    if (!acc[q.section_id]) acc[q.section_id] = [];
    acc[q.section_id]!.push(q);
    return acc;
  }, {});

  // Transform to client-friendly format
  const sections: Section[] = (dbSections ?? []).map((s) => ({
    id: s.id,
    title: resolveLabel(s.title, locale),
    questions: (questionsBySection[s.id] ?? []).map((q) => ({
      id: q.id,
      type: q.type as QuestionType,
      label: resolveLabel(q.label, locale),
      required: q.is_required,
      options: resolveOptions(q.options, locale),
    })),
  }));

  // --- Load existing response for this user (resume session) ---
  const { data: { user } } = await supabase.auth.getUser();

  let existingResponseId: string | null = null;
  let existingAnswers: Record<string, Json> = {};

  if (user) {
    // Find the user's latest non-submitted response for this project
    let existingResponse = null;

    // Try by respondent_id first
    const { data: byId } = await supabase
      .from('responses')
      .select('id')
      .eq('project_id', project.id)
      .eq('respondent_id', user.id)
      .in('status', ['draft', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    existingResponse = byId;

    // Fallback: try by email (for responses created before user was linked)
    if (!existingResponse && user.email) {
      const { data: byEmail } = await supabase
        .from('responses')
        .select('id')
        .eq('project_id', project.id)
        .eq('respondent_email', user.email)
        .in('status', ['draft', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      existingResponse = byEmail;

      // Link this response to the user for future lookups
      if (existingResponse) {
        await supabase
          .from('responses')
          .update({ respondent_id: user.id })
          .eq('id', existingResponse.id);
      }
    }

    if (existingResponse) {
      existingResponseId = existingResponse.id;

      // Load saved answers
      const { data: savedAnswers } = await supabase
        .from('response_answers')
        .select('question_id, value')
        .eq('response_id', existingResponse.id);

      if (savedAnswers) {
        existingAnswers = savedAnswers.reduce<Record<string, Json>>((acc, a) => {
          acc[a.question_id] = a.value;
          return acc;
        }, {});
      }
    }
  }

  return (
    <FormFillClient
      sections={sections}
      projectSlug={projectSlug}
      projectName={project.name}
      locale={locale}
      initialResponseId={existingResponseId}
      initialAnswers={existingAnswers}
    />
  );
}
