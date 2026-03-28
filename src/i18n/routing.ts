import { defineRouting } from 'next-intl/routing';

export const locales = [
  'en', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'pl', 'cs', 'sv',
  'da', 'fi', 'no', 'el', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl',
  'et', 'lv', 'lt', 'tr', 'ru',
] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  cs: 'Čeština',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  no: 'Norsk',
  el: 'Ελληνικά',
  hu: 'Magyar',
  ro: 'Română',
  bg: 'Български',
  hr: 'Hrvatski',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  et: 'Eesti',
  lv: 'Latviešu',
  lt: 'Lietuvių',
  tr: 'Türkçe',
  ru: 'Русский',
};

export const routing = defineRouting({
  locales,
  defaultLocale: 'de',
  localePrefix: 'always',
});
