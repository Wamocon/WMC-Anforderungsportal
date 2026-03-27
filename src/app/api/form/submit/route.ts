import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { responseId } = await req.json();

    if (!responseId) {
      return NextResponse.json({ error: 'Missing responseId' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('responses')
      .update({
        status: 'submitted',
        progress_percent: 100,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', responseId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
