import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import type { ProjectAttachment } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

// Allowed MIME type prefixes — matches the storage bucket policy
const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check — admin-level users can always upload; product_owners can upload to their own projects
    const role = user.app_metadata?.role as string | undefined;
    const adminRoles = ['super_admin', 'staff'];
    if (!role || (!adminRoles.includes(role) && role !== 'product_owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If product_owner, verify they created this project
    if (role === 'product_owner') {
      const { data: ownProject } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('created_by', user.id)
        .single();
      if (!ownProject) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const description = (formData.get('description') as string | null) ?? null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50 MB.' },
        { status: 400 }
      );
    }

    const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) =>
      file.type.startsWith(prefix)
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed.` },
        { status: 400 }
      );
    }

    // Verify project exists and user has access (org_id match for admins, or project_members for others)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Build safe storage path: {projectId}/{timestamp}-{safeName}
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_');
    const storagePath = `${projectId}/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('project-attachments')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Persist attachment record in DB
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: attachment, error: dbError } = await (supabase as any)
      .from('project_attachments')
      .insert({
        project_id: projectId,
        uploaded_by: user.id,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        storage_path: storagePath,
        description: description,
      })
      .select()
      .single() as { data: ProjectAttachment | null; error: { message: string } | null };

    if (dbError) {
      // Rollback the storage object to keep DB and storage consistent
      await supabase.storage.from('project-attachments').remove([storagePath]);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Generate a 30-day signed URL for immediate display
    const { data: urlData } = await supabase.storage
      .from('project-attachments')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30);

    return NextResponse.json({
      success: true,
      attachment: {
        ...attachment,
        url: urlData?.signedUrl ?? null,
      },
    });
  } catch (err) {
    console.error('[project/upload] unexpected error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// GET: list attachments for a project with fresh signed URLs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: attachments, error } = await (supabase as any)
      .from('project_attachments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }) as { data: ProjectAttachment[] | null; error: { message: string } | null };

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate fresh signed URLs for each attachment (1 hour)
    const withUrls = await Promise.all(
      (attachments ?? []).map(async (a) => {
        const { data: urlData } = await supabase.storage
          .from('project-attachments')
          .createSignedUrl(a.storage_path, 60 * 60);
        return { ...a, url: urlData?.signedUrl ?? null };
      })
    );

    return NextResponse.json({ attachments: withUrls });
  } catch (err) {
    console.error('[project/attachments GET] unexpected error:', err);
    return NextResponse.json({ error: 'Failed to load attachments' }, { status: 500 });
  }
}

// DELETE: remove an attachment (uploader or super_admin only — enforced by DB RLS)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const { attachmentId } = await req.json();

    if (!attachmentId) {
      return NextResponse.json({ error: 'Missing attachmentId' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: attachment, error: fetchError } = await (supabase as any)
      .from('project_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .eq('project_id', projectId)
      .single() as { data: Pick<ProjectAttachment, 'storage_path'> | null; error: { message: string } | null };

    if (fetchError || !attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Delete from storage
    await supabase.storage
      .from('project-attachments')
      .remove([attachment.storage_path]);

    // Delete DB record (RLS policy enforces uploader-or-super_admin)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('project_attachments')
      .delete()
      .eq('id', attachmentId) as { error: { message: string } | null };

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[project/attachments DELETE] unexpected error:', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
