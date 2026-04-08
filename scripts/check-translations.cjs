const fs = require('fs');
const path = require('path');
const en = require('../messages/en.json');

function flatten(obj, prefix = '') {
  return Object.entries(obj).reduce((acc, [k, v]) => {
    const key = prefix ? prefix + '.' + k : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      Object.assign(acc, flatten(v, key));
    } else {
      acc[key] = v;
    }
    return acc;
  }, {});
}

const enFlat = new Set(Object.keys(flatten(en)));

const files = [
  'src/app/[locale]/(admin)/requirements/page.tsx',
  'src/app/[locale]/(admin)/requirements/checklist/[projectId]/page.tsx',
  'src/app/[locale]/(admin)/settings/page.tsx',
  'src/app/[locale]/(portal)/my-projects/page.tsx',
];

let missing = [];
files.forEach(f => {
  const content = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  // Only match t('dotted.key') - must contain a dot and only word chars/dots
  const regex = /\bt\(\s*['"]([a-zA-Z_]+\.[a-zA-Z_]+(?:\.[a-zA-Z_]+)*)['"](?:\s*[,)])/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const key = m[1];
    if (!enFlat.has(key)) {
      missing.push({ file: f.split('/').pop(), key });
    }
  }
});

if (missing.length === 0) {
  console.log('ALL t() translation keys found in messages/en.json!');
} else {
  console.log('MISSING t() keys:');
  missing.forEach(m => console.log('  ' + m.file + ': ' + m.key));
}
