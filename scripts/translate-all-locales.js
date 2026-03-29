/**
 * Batch translate all locale files using Gemini API.
 * Translates only keys that still match EN values (untranslated).
 * 
 * Usage: node scripts/translate-all-locales.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!API_KEY) {
  console.error('ERROR: GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to .env.local');
  process.exit(1);
}
const MODEL = 'gemini-2.5-flash';

const LOCALE_NAMES = {
  fr: 'French', es: 'Spanish', it: 'Italian', pt: 'Portuguese',
  nl: 'Dutch', pl: 'Polish', cs: 'Czech', sv: 'Swedish',
  da: 'Danish', fi: 'Finnish', no: 'Norwegian', el: 'Greek',
  hu: 'Hungarian', ro: 'Romanian', bg: 'Bulgarian', hr: 'Croatian',
  sk: 'Slovak', sl: 'Slovenian', et: 'Estonian', lv: 'Latvian',
  lt: 'Lithuanian', tr: 'Turkish', ru: 'Russian'
};

// Skip these keys from translation (brand names, technical values)
const SKIP_KEYS = new Set([
  'common.appName', // Keep brand name
  'common.poweredBy', // Brand
  'common.copyright', // Keep structure with {year}
]);

async function translateBatch(texts, targetLang) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  
  const prompt = `Translate the following JSON object values from English to ${targetLang}. 
RULES:
- Only translate the VALUES, keep all keys exactly as they are
- Keep all placeholders like {name}, {email}, {year}, {days}, {size}, {types}, {minutes} exactly as they are
- Keep brand names like "WMC", "WAMOCON", "Gemini" unchanged
- Keep technical terms like "GDPR", "DSGVO", "URL", "PDF", "CSV" unchanged  
- Maintain the same tone (formal/professional for admin, friendly for client-facing)
- Return ONLY valid JSON, no markdown, no code blocks, no explanation
- The output must be parseable by JSON.parse()

Input JSON:
${JSON.stringify(texts, null, 2)}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  
  // Strip markdown code blocks if present
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(`  Failed to parse response for ${targetLang}:`, text.slice(0, 200));
    return null;
  }
}

async function translateLocale(locale) {
  const langName = LOCALE_NAMES[locale];
  const enData = JSON.parse(fs.readFileSync('messages/en.json', 'utf8'));
  const localeFile = path.join('messages', `${locale}.json`);
  const localeData = JSON.parse(fs.readFileSync(localeFile, 'utf8'));
  
  // Find keys that need translation (still match EN values)
  const toTranslate = {};
  let needCount = 0;
  
  for (const [section, keys] of Object.entries(enData)) {
    for (const [key, enValue] of Object.entries(keys)) {
      const fullKey = `${section}.${key}`;
      if (SKIP_KEYS.has(fullKey)) continue;
      
      const currentValue = localeData[section]?.[key];
      // If the value is identical to English, it needs translation
      if (currentValue === enValue) {
        if (!toTranslate[section]) toTranslate[section] = {};
        toTranslate[section][key] = enValue;
        needCount++;
      }
    }
  }
  
  if (needCount === 0) {
    console.log(`  ${locale} (${langName}): Already translated ✓`);
    return;
  }
  
  console.log(`  ${locale} (${langName}): ${needCount} keys to translate...`);
  
  // Translate in section-sized batches to avoid token limits
  for (const [section, keys] of Object.entries(toTranslate)) {
    const keyCount = Object.keys(keys).length;
    if (keyCount === 0) continue;
    
    try {
      const translated = await translateBatch(keys, langName);
      if (translated) {
        if (!localeData[section]) localeData[section] = {};
        for (const [key, value] of Object.entries(translated)) {
          if (typeof value === 'string' && value.trim()) {
            localeData[section][key] = value;
          }
        }
        console.log(`    ✓ ${section}: ${keyCount} keys translated`);
      } else {
        console.log(`    ✗ ${section}: translation failed, keeping EN fallback`);
      }
    } catch (err) {
      console.error(`    ✗ ${section}: ${err.message}`);
    }
    
    // Rate limit: 500ms between API calls
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Write back
  fs.writeFileSync(localeFile, JSON.stringify(localeData, null, 2) + '\n', 'utf8');
  console.log(`  ${locale}: Saved ✓`);
}

async function main() {
  console.log('=== Translating all locales via Gemini API ===\n');
  
  const locales = Object.keys(LOCALE_NAMES);
  
  for (const locale of locales) {
    await translateLocale(locale);
    console.log('');
  }
  
  console.log('=== Translation complete ===');
}

main().catch(console.error);
