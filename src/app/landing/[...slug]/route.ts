import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const fileName = slug.join('/');
  const ext = path.extname(fileName);
  const filePath = path.join(process.cwd(), 'public', 'landing', fileName);

  try {
    const fileBuffer = await fs.readFile(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    return new Response(fileBuffer, {
      headers: {
        'content-type': contentType,
        'cache-control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
