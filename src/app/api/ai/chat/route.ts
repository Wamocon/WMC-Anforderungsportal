import { google } from '@ai-sdk/google';
import { streamText, type ModelMessage } from 'ai';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { getLanguageName } from '@/lib/lang-map';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are an expert requirements analyst working for WAMOCON (WMC), a professional IT development company. Your job is to interview clients about their app/software project requirements through a friendly, structured conversation.

GUIDELINES:
1. Ask ONE question at a time. Keep questions clear and simple.
2. Start with project overview, then dig into functional requirements, design preferences, technical needs, timeline, and budget.
3. If the client gives a vague answer (e.g., "make it fast" or "make it nice"), ask a clarifying follow-up.
4. Be professional but warm. Use simple language — the client may not be technical.
5. After gathering enough information, summarize what you've learned and ask if anything is missing.
6. Cover these key areas:
   - Project name and description
   - Target audience
   - Core features needed
   - Platform preferences (mobile/web/both)
   - Design style preferences
   - User roles and permissions
   - Integration needs
   - Data privacy requirements (GDPR/DSGVO)
   - Timeline and budget
   - Communication preferences
7. You MUST respond in the language specified at conversation start. Keep responses concise — no more than 2-3 short paragraphs.
8. When you detect the conversation is complete, indicate this and offer to generate a summary.

Remember: You are collecting requirements FOR the client's project. Be helpful, patient, and thorough.`;

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining } = rateLimit(ip);
    if (!allowed) {
      return new Response('Too many requests. Please wait a moment.', {
        status: 429,
        headers: getRateLimitHeaders(remaining),
      });
    }

    const body = await req.json();
    const { locale } = body;
    const rawMessages = body.messages;

    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      return new Response('Invalid request', { status: 400 });
    }

    // Sanitize: enforce max messages + max length per message
    const messages = rawMessages
      .slice(-MAX_MESSAGES)
      .map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? '').slice(0, MAX_MESSAGE_LENGTH),
      }))
      .filter((m) => m.content.trim().length > 0) as ModelMessage[];

    if (messages.length === 0) {
      return new Response('Invalid request', { status: 400 });
    }

    const language = getLanguageName(locale);

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: `${SYSTEM_PROMPT}\n\nIMPORTANT: Always respond in ${language}. Current date: ${new Date().toISOString().split('T')[0]}.`,
      messages,
      maxOutputTokens: 800,
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch {
    return new Response('AI service temporarily unavailable. Please try again.', { status: 500 });
  }
}
