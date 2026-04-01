import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { rateLimit } from '@/lib/rate-limit';
import { getLanguageName } from '@/lib/lang-map';
import { verifyAuth } from '@/lib/auth-edge';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are an expert requirements analyst. Based on a client's existing answers, generate 1-2 additional clarifying questions that would help complete the requirements specification. 

RULES:
1. Only suggest questions that are NOT already covered in the existing questions list.
2. Questions should be specific and actionable.
3. Focus on gaps in: user roles, integrations, performance requirements, security needs, data migration, or edge cases.
4. Keep questions short (1 sentence each).
5. Respond ONLY with a JSON array of question objects: [{"label": "...", "type": "text"}]
6. Valid types: text, textarea, radio, select
7. For radio/select questions, include "options": ["Option 1", "Option 2"]
8. If no additional questions are needed, respond with: []
9. Respond in the language matching the locale parameter provided.
10. Maximum 2 questions per call.`;

export async function POST(req: Request) {
  try {
    // Auth check: only authenticated users can use AI features
    const user = await verifyAuth(req);
    if (!user) {
      return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed } = rateLimit(ip);
    if (!allowed) return Response.json({ questions: [] });

    const body = await req.json();
    const rawAnswers = body.answers;
    const rawExisting = body.existingQuestions;
    const locale = body.locale;
    const language = getLanguageName(locale);

    if (!rawAnswers || typeof rawAnswers !== 'object' || Object.keys(rawAnswers).length < 2) {
      return Response.json({ questions: [] });
    }

    // Sanitize: cap key and value lengths
    const answeredSummary = Object.entries(rawAnswers)
      .filter(([, v]) => v && String(v).trim().length > 0)
      .slice(0, 20)
      .map(([, v]) => `- ${String(v).slice(0, 500)}`)
      .join('\n');

    const existingLabels = (Array.isArray(rawExisting) ? rawExisting : [])
      .slice(0, 30)
      .map((l: unknown) => String(l).slice(0, 200))
      .join(', ');

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: `Language: ${language}\n\nExisting questions already asked: ${existingLabels}\n\nClient's answers so far:\n${answeredSummary}\n\nGenerate additional questions in ${language} as JSON array:`,
      maxOutputTokens: 800,
      temperature: 0.6,
    });

    // Robust JSON extraction — strips markdown code fences if present
    const jsonMatch = text.replace(/```(?:json)?/gi, '').match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Response.json({ questions: [] });
    }

    let questions: unknown[];
    try {
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      return Response.json({ questions: [] });
    }

    return Response.json({ questions: Array.isArray(questions) ? questions.slice(0, 2) : [] });
  } catch (err) {
    console.error('[ai/dynamic-questions]', err instanceof Error ? err.message : err);
    return Response.json({ questions: [] });
  }
}
