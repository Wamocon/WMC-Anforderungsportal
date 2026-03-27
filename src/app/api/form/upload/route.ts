import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const responseId = formData.get('responseId') as string | null;
    const questionId = formData.get('questionId') as string | null;
    const projectSlug = formData.get('projectSlug') as string | null;

    if (!file || !questionId || !projectSlug) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    const supabase = await createClient();

    // Build storage path: projectSlug/responseId-or-temp/questionId/filename
    const folder = responseId || `temp-${Date.now()}`;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${projectSlug}/${folder}/${questionId}/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('response-attachments')
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL (signed for private bucket)
    const { data: urlData } = await supabase.storage
      .from('response-attachments')
      .createSignedUrl(path, 60 * 60 * 24 * 365); // 1 year URL

    return NextResponse.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type,
        path,
        url: urlData?.signedUrl || null,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
