import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a senior requirements analyst at WAMOCON (WMC), a professional IT development company. Your task is to analyze client requirement responses and produce a structured executive summary for the development team.

CRITICAL FORMATTING RULES:
- Use markdown headers (##) for main sections and (###) for sub-categories.
- Use bullet points (- ) with **bold labels** followed by a colon and the value.
- NEVER use markdown tables (no | pipes). Use bullet points instead.
- Use ✅ for confirmed/clear items, ⚠️ for vague/incomplete items, and ❌ for missing critical items.
- Keep each bullet point on ONE line — no multi-line bullets.
- Do NOT write an introduction paragraph. Start directly with the first section header.

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
4. You MUST write the ENTIRE summary in the language specified by the "locale" parameter. If locale is "de", write in German. If "tr", write in Turkish. If "ru", write in Russian. If "en", write in English. Section headers, labels, descriptions — everything must be in that language. Only keep the emoji markers (✅⚠️❌🔴🟡🟢) as-is.
5. Do NOT invent requirements — only summarize what the client actually provided.
6. Use professional language suitable for a development team handoff.`;

export async function POST(req: Request) {
  try {
    const { responseData, projectName, respondentName, locale } = await req.json();

    if (!responseData || !Array.isArray(responseData)) {
      return new Response('Missing response data', { status: 400 });
    }

    const langMap: Record<string, string> = {
      de: 'German (Deutsch)',
      en: 'English',
      tr: 'Turkish (Türkçe)',
      ru: 'Russian (Русский)',
    };
    const language = langMap[locale] || 'German (Deutsch)';

    const prompt = `IMPORTANT: Write the entire summary in ${language}.

Analyze the following client requirement responses for project "${projectName || 'Unknown'}"${respondentName ? ` (submitted by ${respondentName})` : ''} and generate a structured executive summary.

Response Data:
${JSON.stringify(responseData, null, 2)}`;

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
      maxOutputTokens: 2000,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch {
    return new Response('AI summary service temporarily unavailable. Please try again.', { status: 500 });
  }
}
