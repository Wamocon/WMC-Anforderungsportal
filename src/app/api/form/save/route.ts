import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import type { Json } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { responseId, projectSlug, answers, followUps, email, name } = body;

    if (!projectSlug || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Detect authenticated user
    const { data: { user } } = await supabase.auth.getUser();

    // Get project by slug
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, template_id')
      .eq('slug', projectSlug)
      .single();

    if (projErr || !project || !project.template_id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    let currentResponseId = responseId;

    // Create response if it doesn't exist
    if (!currentResponseId) {
      const totalQuestions = Object.keys(answers).length;
      const answeredCount = Object.values(answers).filter(
        (a) => a !== null && a !== '' && (!Array.isArray(a) || (a as unknown[]).length > 0)
      ).length;
      const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

      const { data: resp, error: respErr } = await supabase
        .from('responses')
        .insert({
          project_id: project.id,
          template_id: project.template_id,
          respondent_email: user?.email || email || 'anonymous@form.local',
          respondent_name: user?.user_metadata?.full_name || name || null,
          respondent_id: user?.id || null,
          status: 'in_progress',
          progress_percent: progress,
        })
        .select('id')
        .single();

      if (respErr) {
        return NextResponse.json({ error: 'Failed to create response' }, { status: 500 });
      }
      currentResponseId = resp.id;
    } else {
      // Update progress
      const totalQuestions = Object.keys(answers).length;
      const answeredCount = Object.values(answers).filter(
        (a) => a !== null && a !== '' && (!Array.isArray(a) || (a as unknown[]).length > 0)
      ).length;
      const progress = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

      await supabase
        .from('responses')
        .update({ progress_percent: progress, status: 'in_progress' })
        .eq('id', currentResponseId);
    }

    // Upsert answers
    const answerRows = Object.entries(answers)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([questionId, value]) => {
        const followUp = followUps?.[questionId];
        return {
          response_id: currentResponseId,
          question_id: questionId,
          value: value as Json,
          ai_clarification: followUp?.answer || null,
        };
      });

    if (answerRows.length > 0) {
      // Upsert answers (on conflict with response_id + question_id, update the value)
      const { error: ansErr } = await supabase
        .from('response_answers')
        .upsert(answerRows, { onConflict: 'response_id,question_id' });

      if (ansErr) {
        return NextResponse.json({ error: 'Failed to save answers' }, { status: 500 });
      }
    }

    return NextResponse.json({ responseId: currentResponseId, success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
