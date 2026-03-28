export const LANG_MAP: Record<string, string> = {
  de: 'German (Deutsch)',
  en: 'English',
  fr: 'French (Français)',
  es: 'Spanish (Español)',
  it: 'Italian (Italiano)',
  pt: 'Portuguese (Português)',
  nl: 'Dutch (Nederlands)',
  pl: 'Polish (Polski)',
  cs: 'Czech (Čeština)',
  sv: 'Swedish (Svenska)',
  da: 'Danish (Dansk)',
  fi: 'Finnish (Suomi)',
  no: 'Norwegian (Norsk)',
  el: 'Greek (Ελληνικά)',
  hu: 'Hungarian (Magyar)',
  ro: 'Romanian (Română)',
  bg: 'Bulgarian (Български)',
  hr: 'Croatian (Hrvatski)',
  sk: 'Slovak (Slovenčina)',
  sl: 'Slovenian (Slovenščina)',
  et: 'Estonian (Eesti)',
  lv: 'Latvian (Latviešu)',
  lt: 'Lithuanian (Lietuvių)',
  tr: 'Turkish (Türkçe)',
  ru: 'Russian (Русский)',
};

export function getLanguageName(locale: string): string {
  return LANG_MAP[locale] || 'German (Deutsch)';
}
