import { describe, it, expect } from 'vitest';
import { LANG_MAP, getLanguageName } from '../lang-map';

describe('LANG_MAP', () => {
  it('contains all 25 supported locales', () => {
    const expectedLocales = [
      'de', 'en', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'cs', 'sv',
      'da', 'fi', 'no', 'el', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl',
      'et', 'lv', 'lt', 'tr', 'ru',
    ];
    expect(Object.keys(LANG_MAP)).toEqual(expectedLocales);
    expect(Object.keys(LANG_MAP)).toHaveLength(25);
  });

  it('includes native name in parentheses for non-English locales', () => {
    expect(LANG_MAP.de).toBe('German (Deutsch)');
    expect(LANG_MAP.fr).toBe('French (Français)');
    expect(LANG_MAP.ru).toBe('Russian (Русский)');
  });

  it('has plain English for the "en" locale', () => {
    expect(LANG_MAP.en).toBe('English');
  });
});

describe('getLanguageName', () => {
  it('returns the language name for known locales', () => {
    expect(getLanguageName('de')).toBe('German (Deutsch)');
    expect(getLanguageName('en')).toBe('English');
    expect(getLanguageName('tr')).toBe('Turkish (Türkçe)');
  });

  it('falls back to English for unknown locales', () => {
    expect(getLanguageName('xx')).toBe('English');
    expect(getLanguageName('')).toBe('English');
  });
});
