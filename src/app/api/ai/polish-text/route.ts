import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { rateLimit } from '@/lib/rate-limit';
import { getLanguageName } from '@/lib/lang-map';
import { getAuthUser } from '@/lib/auth-edge';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a minimal text correction assistant. You make the SMALLEST possible changes to fix obvious errors. You are NOT a rewriter or editor.

RULES — STRICTLY FOLLOW:
1. ONLY fix clear typos, spelling mistakes, and broken grammar
2. Do NOT rephrase, restructure, or "improve" sentences
3. Do NOT change word choice, tone, vocabulary level, or sentence style
4. Do NOT add or remove words unless fixing a clear grammatical error
5. Do NOT change punctuation style (e.g. don't add Oxford commas if the user doesn't use them)
6. Do NOT change capitalization style unless it's a clear error
7. PRESERVE the exact same language — never translate
8. PRESERVE bullet points, line breaks, markdown formatting, lists, and structure exactly
9. PRESERVE technical terms, product names, abbreviations, and slang
10. If the text has zero errors, return it EXACTLY as-is, character for character
11. Return ONLY the corrected text — no explanations, no comments
12. When in doubt, DO NOT change anything — the user's original wording is sacred`;

// Increase safety threshold: reject polish if the AI changed too much
const MAX_CHANGE_RATIO = 0.85; // polished must be at least 85% of original length

export async function POST(req: Request) {
  try {
    // Auth check: only authenticated users can use AI features
    const user = await getAuthUser(req);
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed } = rateLimit(ip);
    if (!allowed) return Response.json({ polished: null });

    const body = await req.json();
    const rawText = String(body.text ?? '');
    const locale = body.locale;

    if (!rawText || rawText.trim().length < 3) {
      return Response.json({ polished: rawText });
    }

    const { text: polished } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: `Language hint (do NOT translate): ${getLanguageName(locale)}\n\nFix ONLY typos and grammar. Do NOT rephrase or improve style:\n${rawText}`,
      maxOutputTokens: 16384,
      temperature: 0.1,
    });

    const result = polished.trim() || rawText;

    // Safety: if the polished text changed too much, the AI rewrote it —
    // return the original to protect the user's intent
    if (result.length < rawText.length * MAX_CHANGE_RATIO) {
      return Response.json({ polished: rawText });
    }

    return Response.json({ polished: result });
  } catch (err) {
    console.error('[ai/polish-text]', err instanceof Error ? err.message : err);
    return Response.json({ polished: null });
  }
}
