import { promises as fs } from 'node:fs';
import path from 'node:path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'landing', 'index.html');
  const html = await fs.readFile(filePath, 'utf8');
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=600',
    },
  });
}
