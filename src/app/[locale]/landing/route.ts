import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ locale: string }>;
};

function getDocumentLang(locale: string) {
  return locale === 'en' ? 'en' : 'de';
}

function localizeHtml(html: string, locale: string) {
  const documentLang = getDocumentLang(locale);
  const ogLocale = documentLang === 'en' ? 'en_US' : 'de_DE';

  return html
    .replace('<html lang="de" class="scroll-smooth">', `<html lang="${documentLang}" class="scroll-smooth">`)
    .replace('<meta property="og:locale" content="de_DE">', `<meta property="og:locale" content="${ogLocale}">`)
    .replace('<body class="overflow-x-hidden antialiased leading-relaxed">', `<body class="overflow-x-hidden antialiased leading-relaxed" data-route-locale="${documentLang}">`);
}

export async function GET(_request: Request, context: RouteContext) {
  const { locale } = await context.params;
  const filePath = path.join(process.cwd(), 'public', 'landing', 'index.html');
  const html = await fs.readFile(filePath, 'utf8');
  const localizedHtml = localizeHtml(html, locale);

  return new NextResponse(localizedHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}