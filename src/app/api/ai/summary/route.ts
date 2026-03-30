import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { getLanguageName } from '@/lib/lang-map';

// Edge runtime: fast, 30-second timeout, compatible with AI calls.
// DB persistence is handled client-side after the summary is returned.
export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a senior requirements analyst at WAMOCON (WMC), a professional IT development company. Your task is to analyze client requirement responses and produce a structured executive summary for the development team.

CRITICAL FORMATTING RULES:
- Use markdown headers (##) for main sections and (###) for sub-categories.
- Use bullet points (- ) with **bold labels** followed by a colon and the value.
- NEVER use markdown tables (no | pipes). Use bullet points instead.
- Use ✅ for confirmed/clear items, ⚠️ for vague/incomplete items, and ❌ for missing critical items.
- Keep each bullet point on ONE line — no multi-line bullets.
- Do NOT write an introduction paragraph. Start directly with the first section header.

IMPORTANT LANGUAGE HANDLING:
- The client answers may be in ANY language (Russian, German, Turkish, etc.) because the form was filled in the client's preferred language.
- You MUST translate and interpret client answers into the target output language.
- Write the ENTIRE summary including section headers and labels in the output language specified by the "locale" parameter.
- Example: if a client answered "Да" (Russian for Yes), write "Yes" in the summary if the output language is English.

OUTPUT FORMAT — Use these exact sections:

## 📋 Project Overview
- **Project Name:** [name] ✅/⚠️
- **Purpose:** [description] ✅/⚠️
- **Target Audience:** [audience] ✅/⚠️
- **Core Problem:** [problem] ✅/⚠️
- **Existing Assets:** [url or status] ✅/❌

## 🎯 Key Requirements
### Must-Haves
- ✅ [requirement description]

### Nice-to-Haves
- [requirement or "❌ Not provided"]

### Unclear / Needs Clarification
- ⚠️ **[field]:** [why it's unclear]

## 🔧 Technical Specifications
- ✅/❌ **Platforms:** [value]
- ✅/❌ **User Scale:** [value]
- ✅/❌ **Offline Support:** [value]
- ✅/❌ **Data Privacy:** [value]
- ✅/❌ **Technology Stack:** [value or "Not provided"]

## 🎨 Design & UX
- ✅/❌ **Style Preferences:** [value or "Not provided"]
- ✅/❌ **References:** [value or "Not provided"]
- ✅/❌ **Dark Mode:** [value or "Not provided"]
- ✅/❌ **Branding:** [value or "Not provided"]

## 📅 Timeline & Budget
- ✅/❌ **Deadline:** [value or "Not provided"]
- ✅/❌ **Budget Range:** [value or "Not provided"]
- ✅/❌ **Priority:** [value]

## ⚠️ Risks & Gaps
1. 🔴/🟡/🟢 **[Risk title]:** [description]

## ✅ Recommended Next Steps
1. [Specific action item]

RULES:
1. Be concise. Use single-line bullets. No filler text.
2. If a field has no data, mark it with ❌ and "Not provided".
3. Flag vague answers explicitly (e.g., client wrote "test" — mark as ⚠️ vague).
4. Write the ENTIRE summary in the language specified by the locale parameter. Section headers, labels, and descriptions must all be in that language.
5. Translate client answers from their original language into the output language.
6. Do NOT invent requirements — only summarize what the client actually provided.
7. Use professional language suitable for a development team handoff.`;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const { allowed, remaining } = rateLimit(ip);
    if (!allowed) {
      return Response.json({ error: 'Too many requests. Please wait a moment.' }, {
        status: 429,
        headers: getRateLimitHeaders(remaining),
      });
    }

    const { responseData, projectName, respondentName, locale, responseId } = await req.json();

    if (!responseData || !Array.isArray(responseData) || responseData.length === 0) {
      return Response.json({ error: 'Missing or empty response data' }, { status: 400 });
    }

    const language = getLanguageName(locale);

    const prompt = `IMPORTANT: Write the entire summary in ${language}. Translate any client answers that are in other languages into ${language}.

Analyze the following client requirement responses for project "${projectName || 'Unknown'}"${respondentName ? ` (submitted by ${respondentName})` : ''} and generate a structured executive summary.

Response Data:
${JSON.stringify(responseData, null, 2)}`;

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    if (!text || !text.trim()) {
      return Response.json({ error: 'AI returned empty response. Please try again.' }, { status: 502 });
    }

    return Response.json({ summary: text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[summary route]', message);
    return Response.json(
      { error: 'AI summary service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  }
}
