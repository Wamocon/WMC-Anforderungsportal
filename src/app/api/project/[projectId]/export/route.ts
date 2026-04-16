import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined };

function resolveLabel(json: Json, locale: string): string {
  if (typeof json === 'string') return json;
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, string>;
    return obj[locale] || obj['en'] || obj['de'] || Object.values(obj)[0] || '';
  }
  return String(json ?? '');
}

function formatValue(value: Json): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.map(v => String(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

/**
 * GET /api/project/[projectId]/export
 *
 * Returns project form responses as Markdown — perfect for copying
 * to Copilot or another AI for analysis.
 *
 * Query params:
 *   ?format=markdown (default) — returns text/markdown
 *   ?format=json — returns structured JSON
 *   ?locale=de (default) — resolve labels in this locale
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'markdown';
    const locale = searchParams.get('locale') || 'de';

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch project
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, slug, description, status, created_by, template_id, created_at, onedrive_link')
      .eq('id', projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Only owner or staff can export
    const role = user.app_metadata?.role;
    const isOwner = project.created_by === user.id;
    const isStaff = role === 'staff' || role === 'super_admin';
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch responses for this project
    const { data: responses } = await supabase
      .from('responses')
      .select('id, respondent_name, respondent_email, status, progress_percent, summary_markdown, submitted_at, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    // Fetch template sections + questions
    let sections: { id: string; title: Json; order_index: number }[] = [];
    let questions: { id: string; section_id: string; label: Json; type: string; is_required: boolean; order_index: number }[] = [];

    if (project.template_id) {
      const { data: dbSections } = await supabase
        .from('template_sections')
        .select('id, title, order_index')
        .eq('template_id', project.template_id)
        .order('order_index', { ascending: true });
      sections = dbSections ?? [];

      if (sections.length > 0) {
        const { data: dbQuestions } = await supabase
          .from('template_questions')
          .select('id, section_id, label, type, is_required, order_index')
          .in('section_id', sections.map(s => s.id))
          .order('order_index', { ascending: true });
        questions = dbQuestions ?? [];
      }
    }

    // Fetch all answers for all responses
    const responseIds = (responses ?? []).map(r => r.id);
    let allAnswers: { response_id: string; question_id: string; value: Json }[] = [];
    if (responseIds.length > 0) {
      const { data: answersData } = await supabase
        .from('response_answers')
        .select('response_id, question_id, value')
        .in('response_id', responseIds);
      allAnswers = answersData ?? [];
    }

    // Fetch attachments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: attachments } = await (supabase as any)
      .from('project_attachments')
      .select('id, file_name, file_size, mime_type, description, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }) as { data: { id: string; file_name: string; file_size: number | null; mime_type: string | null; description: string | null; created_at: string }[] | null };

    // ── JSON format ──
    if (format === 'json') {
      const data = {
        project: {
          name: project.name,
          description: project.description,
          status: project.status,
          created_at: project.created_at,
          onedrive_link: project.onedrive_link,
        },
        responses: (responses ?? []).map(r => {
          const responseAnswers = allAnswers.filter(a => a.response_id === r.id);
          const answerMap: Record<string, { question: string; section: string; value: string }> = {};
          for (const ans of responseAnswers) {
            const q = questions.find(q => q.id === ans.question_id);
            const s = sections.find(s => s.id === q?.section_id);
            answerMap[ans.question_id] = {
              question: q ? resolveLabel(q.label, locale) : ans.question_id,
              section: s ? resolveLabel(s.title, locale) : '',
              value: formatValue(ans.value),
            };
          }
          return {
            respondent: r.respondent_name || r.respondent_email,
            status: r.status,
            progress: r.progress_percent,
            submitted_at: r.submitted_at,
            summary: r.summary_markdown,
            answers: answerMap,
          };
        }),
        attachments: (attachments ?? []).map(a => ({
          name: a.file_name,
          size: a.file_size,
          type: a.mime_type,
          description: a.description,
        })),
      };
      return NextResponse.json(data);
    }

    // ── Markdown format ──
    const lines: string[] = [];
    lines.push(`# ${project.name}`);
    lines.push('');
    if (project.description) {
      lines.push(`> ${project.description}`);
      lines.push('');
    }
    lines.push(`**Status:** ${project.status}`);
    lines.push(`**Created:** ${new Date(project.created_at).toLocaleDateString('de-DE')}`);
    if (project.onedrive_link) {
      lines.push(`**OneDrive:** ${project.onedrive_link}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    // Responses
    for (const resp of (responses ?? [])) {
      lines.push(`## Response: ${resp.respondent_name || resp.respondent_email}`);
      lines.push(`**Status:** ${resp.status} · **Progress:** ${resp.progress_percent ?? 0}%`);
      if (resp.submitted_at) {
        lines.push(`**Submitted:** ${new Date(resp.submitted_at).toLocaleDateString('de-DE')}`);
      }
      lines.push('');

      // Summary
      if (resp.summary_markdown) {
        lines.push('### AI Summary');
        lines.push(resp.summary_markdown);
        lines.push('');
      }

      // Answers by section
      const responseAnswers = allAnswers.filter(a => a.response_id === resp.id);
      const answerByQuestion = new Map(responseAnswers.map(a => [a.question_id, a.value]));

      for (const section of sections) {
        const sectionQuestions = questions.filter(q => q.section_id === section.id);
        const hasAnyAnswer = sectionQuestions.some(q => answerByQuestion.has(q.id));
        if (!hasAnyAnswer) continue;

        lines.push(`### ${resolveLabel(section.title, locale)}`);
        lines.push('');
        for (const q of sectionQuestions) {
          const val = answerByQuestion.get(q.id);
          if (val === undefined) continue;
          lines.push(`**${resolveLabel(q.label, locale)}**`);
          lines.push(formatValue(val));
          lines.push('');
        }
      }

      lines.push('---');
      lines.push('');
    }

    // Attachments
    if (attachments && attachments.length > 0) {
      lines.push('## Attachments');
      lines.push('');
      for (const att of attachments) {
        const size = att.file_size
          ? att.file_size < 1024 * 1024
            ? `${(att.file_size / 1024).toFixed(1)} KB`
            : `${(att.file_size / (1024 * 1024)).toFixed(1)} MB`
          : '';
        lines.push(`- **${att.file_name}** ${size ? `(${size})` : ''} — ${att.mime_type || 'unknown'}`);
        if (att.description) lines.push(`  ${att.description}`);
      }
      lines.push('');
    }

    const markdown = lines.join('\n');

    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(project.name)}-report.md"`,
      },
    });
  } catch (err) {
    console.error('[project/export] unexpected error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
