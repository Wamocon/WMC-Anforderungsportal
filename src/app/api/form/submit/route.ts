import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { responseId, summary } = await req.json();

    if (!responseId) {
      return NextResponse.json({ error: 'Missing responseId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify response exists and is in_progress
    const { data: existing } = await supabase
      .from('responses')
      .select('id, status')
      .eq('id', responseId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Response not found' }, { status: 404 });
    }

    if (existing.status === 'submitted') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 409 });
    }

    const { error } = await supabase
      .from('responses')
      .update({
        status: 'submitted',
        progress_percent: 100,
        summary_markdown: typeof summary === 'string' && summary.trim() ? summary.trim() : null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', responseId);

    if (error) {
      return NextResponse.json({ error: 'Submission failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
