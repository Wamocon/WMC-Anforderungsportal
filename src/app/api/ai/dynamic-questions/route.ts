import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

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
    const { answers, existingQuestions, locale } = await req.json();

    if (!answers || Object.keys(answers).length < 2) {
      return Response.json({ questions: [] });
    }

    const answeredSummary = Object.entries(answers)
      .filter(([, v]) => v && String(v).trim().length > 0)
      .map(([, v]) => `- ${v}`)
      .join('\n');

    const existingLabels = (existingQuestions || []).join(', ');

    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      system: SYSTEM_PROMPT,
      prompt: `Locale: ${locale || 'de'}\n\nExisting questions already asked: ${existingLabels}\n\nClient's answers so far:\n${answeredSummary}\n\nGenerate additional questions as JSON array:`,
      maxOutputTokens: 300,
      temperature: 0.6,
    });

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Response.json({ questions: [] });
    }

    const questions = JSON.parse(jsonMatch[0]);
    return Response.json({ questions: Array.isArray(questions) ? questions.slice(0, 2) : [] });
  } catch {
    return Response.json({ questions: [] });
  }
}
