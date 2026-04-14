import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { rateLimit } from '@/lib/rate-limit';
import { getLanguageName } from '@/lib/lang-map';
import { getAuthUser } from '@/lib/auth-edge';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a multilingual text polishing assistant for requirements collection. Your ONLY job is to make the text clearer and easier to understand while preserving the original meaning, detail, and intent.

RULES:
1. Fix grammar, spelling, and punctuation errors
2. Improve sentence clarity only when needed so the information is easier to understand
3. Preserve the SAME language as the input text; treat the locale only as a hint, not an instruction to translate
4. If the input mixes languages, keep the dominant language and preserve technical terms, names, and product terminology
5. Keep the same meaning, detail level, and tone
6. Do NOT summarize, shorten, or remove requirements
7. Do NOT add new information
8. Do NOT translate unless the input itself is already mixed and a tiny wording fix requires keeping the dominant language consistent
9. Return ONLY the corrected text, nothing else
10. If the text is already clear and correct, return it as-is`;

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
    const rawText = String(body.text ?? '').slice(0, 10_000);
    const locale = body.locale;

    if (!rawText || rawText.trim().length < 3) {
      return Response.json({ polished: rawText });
    }

    const { text: polished } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: `Locale hint: ${getLanguageName(locale)}\n\nPolish this text without summarizing it:\n${rawText}`,
      maxOutputTokens: 8192,
      temperature: 0.2,
    });

    const result = polished.trim() || rawText;

    // Safety: if the polished text is significantly shorter than the original,
    // the AI likely summarized instead of polishing — return the original
    if (result.length < rawText.length * 0.7) {
      return Response.json({ polished: rawText });
    }

    return Response.json({ polished: result });
  } catch (err) {
    console.error('[ai/polish-text]', err instanceof Error ? err.message : err);
    return Response.json({ polished: null });
  }
}
