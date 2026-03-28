import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { rateLimit } from '@/lib/rate-limit';
import { getLanguageName } from '@/lib/lang-map';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a text polishing assistant. Your ONLY job is to fix grammar, spelling, and punctuation in the given text while preserving the original meaning and language.

RULES:
1. Fix grammar, spelling, and punctuation errors
2. Keep the SAME language as the input
3. Keep the same tone and meaning
4. Do NOT add new information
5. Do NOT rephrase sentences unnecessarily
6. Do NOT translate to a different language
7. Return ONLY the corrected text, nothing else
8. If the text is already correct, return it as-is`;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed } = rateLimit(ip);
    if (!allowed) return Response.json({ polished: null });

    const { text, locale } = await req.json();

    if (!text || text.trim().length < 3) {
      return Response.json({ polished: text });
    }

    const { text: polished } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: `Language: ${getLanguageName(locale)}\n\nText to polish:\n${text}`,
      maxOutputTokens: 500,
      temperature: 0.2,
    });

    return Response.json({ polished: polished.trim() });
  } catch {
    return Response.json({ polished: null });
  }
}
