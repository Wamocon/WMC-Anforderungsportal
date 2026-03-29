const fs = require('fs');
const path = require('path');

// Read the EN source as reference for key structure
const en = JSON.parse(fs.readFileSync('messages/en.json', 'utf8'));

// Keys that need to exist in every locale (with EN fallback)
const requiredSections = ['landing', 'admin', 'form', 'auth', 'project', 'client', 'settings', 'errors', 'common', 'template', 'invitation', 'response'];

const locales = fs.readdirSync('messages')
  .filter(f => f.endsWith('.json') && f !== 'en.json' && f !== 'de.json')
  .map(f => f.replace('.json', ''));

for (const lang of locales) {
  const filePath = path.join('messages', lang + '.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const section of requiredSections) {
    if (!data[section]) data[section] = {};
    
    // Add missing keys from EN (using EN as fallback)
    for (const [key, value] of Object.entries(en[section] || {})) {
      if (data[section][key] === undefined) {
        data[section][key] = value; // EN fallback - better than missing key error
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${lang}: added missing keys from EN`);
}

console.log(`\nDone! Updated ${locales.length} locale files with EN fallback values.`);
console.log('Note: These use English text as fallback. For production, translate them properly.');
