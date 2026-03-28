import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { rateLimit } from '@/lib/rate-limit';
import { getLanguageName } from '@/lib/lang-map';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are an expert requirements analyst for WAMOCON (WMC), an IT development company. 
You review a client's answer to a requirements question and determine if a follow-up clarification is needed.

RULES:
1. If the answer is clear, specific, and complete — respond with exactly: NO_FOLLOWUP
2. If the answer is vague, incomplete, or could benefit from specifics — generate ONE concise follow-up question.
3. Keep follow-up questions short (1 sentence). Be professional and friendly.
4. Focus on extracting actionable details: numbers, preferences, priorities, constraints.
5. Respond in the language specified by the locale parameter.
6. Examples of when follow-ups ARE needed:
   - "I want it to look nice" → Ask about specific design preferences, color schemes, reference sites
   - "Fast" → Ask for specific performance targets or expectations
   - "Some users" → Ask about expected number, roles, permissions
   - "Standard features" → Ask what "standard" means to them
7. Examples of when NO follow-up is needed:
   - "We need a login system with email/password and Google OAuth for approximately 500 users"
   - "Budget is between 15,000-20,000 EUR, timeline is 3 months"
   - Clear yes/no answers to specific questions`;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed } = rateLimit(ip);
    if (!allowed) return Response.json({ followUp: null });

    const { questionLabel, userAnswer, locale } = await req.json();
    const language = getLanguageName(locale);

    if (!questionLabel || !userAnswer || userAnswer.trim().length < 5) {
      return Response.json({ followUp: null });
    }

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: `Language: ${language}\nQuestion asked: "${questionLabel}"\nClient's answer: "${userAnswer}"\n\nShould we ask a follow-up? If yes, provide the follow-up question in ${language}. If no, respond with NO_FOLLOWUP.`,
      maxOutputTokens: 150,
      temperature: 0.5,
    });

    const trimmed = text.trim();
    if (trimmed === 'NO_FOLLOWUP' || trimmed.includes('NO_FOLLOWUP')) {
      return Response.json({ followUp: null });
    }

    return Response.json({ followUp: trimmed });
  } catch {
    return Response.json({ followUp: null });
  }
}
