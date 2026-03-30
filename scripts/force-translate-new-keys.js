import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env.local');
  process.exit(1);
}

const NEW_KEYS = {
  common: { requirementManager: 'Requirement Manager', switchToLightMode: 'Switch to light mode', switchToDarkMode: 'Switch to dark mode' },
  admin: { createProjectDesc: 'Start a new requirement collection', manageTemplatesAction: 'Manage Templates', manageTemplatesActionDesc: 'Create or edit form templates', viewResponsesDesc: 'Review client submissions' },
  template: { sectionDescription: 'Sections group related questions together.', sectionPlaceholder: 'e.g., Project Overview', descriptionLabel: 'Description', descPlaceholder: 'Brief description of this section...', questionStar: 'Question *', questionPlaceholderExample: 'e.g., What is the target audience?', typeLabel: 'Type', optionsLabel: 'Options (one per line)', optionsPlaceholder: 'Option 1\nOption 2\nOption 3', defineQuestion: 'Define a new question for this section.', noQuestionsYet: 'No questions yet. Click "Add Question" to start.' },
  form: { yourAnswer: 'Your answer...', yourClarification: 'Your clarification...', askAnything: 'Ask anything...', aiAssistant: 'AI Assistant', aiAnalyzing: 'AI is analyzing your answer...', skipQuestion: 'Skip', answerLater: 'Answer later', undoSkip: 'undo', answerNow: 'answer now', skippedPrefix: 'Skipped', markedLaterPrefix: 'Marked for later', requiredQuestions: 'required questions', dropFilesHere: 'Drop files here or click to upload', allowedFileTypes: 'PDF, Word, PowerPoint, Excel, Images (max 10MB each)', uploading: 'Uploading...', attachDocument: 'Attach document', aiError: "Sorry, I couldn't process that. Please try again.", questions: 'questions', nOptions: '{count} options' },
  response: { export: 'Export', noAnswerProvided: 'No answer provided', noAnswer: 'No answer', referencedNotUploaded: 'Referenced but not uploaded', missing: 'Missing', aiExecutiveSummary: 'AI Executive Summary', clickGenerateSummary: 'Click "Generate Summary" to get an AI-powered executive summary of all responses.', responseReviewed: 'Response marked as reviewed' },
  errors: { notFoundDescription: 'The page you are looking for does not exist or has been moved.', backToHome: 'Back to Home', somethingWentWrong: 'Something went wrong', unexpectedError: 'An unexpected error occurred. Please try again.', tryAgain: 'Try Again', linkRevoked: 'This link is no longer valid. Please contact the project administrator.', linkNotFound: 'Magic link not found', linkExpiredTitle: 'Link Expired', linkRevokedTitle: 'Link Revoked', linkNotFoundTitle: 'Link Not Found', goToLogin: 'Go to Login' }
};

const LOCALE_NAMES = {
  de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese',
  nl: 'Dutch', pl: 'Polish', cs: 'Czech', sv: 'Swedish', da: 'Danish',
  fi: 'Finnish', no: 'Norwegian', el: 'Greek', hu: 'Hungarian', ro: 'Romanian',
  bg: 'Bulgarian', hr: 'Croatian', sk: 'Slovak', sl: 'Slovenian', et: 'Estonian',
  lv: 'Latvian', lt: 'Lithuanian', tr: 'Turkish', ru: 'Russian'
};

async function translate(texts, targetLang) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
  const prompt = `Translate the following JSON values from English to ${targetLang}. 
RULES:
- Only translate the VALUES, keep all keys exactly as they are
- Keep all placeholders like {count}, {size} etc. as-is
- Keep brand names like "WMC", "WAMOCON" unchanged
- Keep technical terms like "PDF", "Excel" etc. unchanged
- Return ONLY valid JSON, no markdown, no code blocks
Input:
${JSON.stringify(texts, null, 2)}`;

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
    })
  });
  const data = await r.json();
  const raw = data.candidates[0].content.parts[0].text;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  for (const [locale, langName] of Object.entries(LOCALE_NAMES)) {
    const filePath = `messages/${locale}.json`;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let total = 0;
    
    for (const [section, keys] of Object.entries(NEW_KEYS)) {
      try {
        const translated = await translate(keys, langName);
        if (translated) {
          if (!data[section]) data[section] = {};
          for (const [key, val] of Object.entries(translated)) {
            data[section][key] = val;
            total++;
          }
        }
        await sleep(500); // Rate limit
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`  Error translating ${section} for ${locale}: ${message}`);
      }
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`${locale}: ${total} keys force-translated`);
  }
}

main().catch(console.error);
