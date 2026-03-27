import { defineRouting } from 'next-intl/routing';

export const locales = ['en', 'de', 'tr', 'ru'] as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  tr: 'Türkçe',
  ru: 'Русский',
};

export const routing = defineRouting({
  locales,
  defaultLocale: 'de',
  localePrefix: 'always',
});
