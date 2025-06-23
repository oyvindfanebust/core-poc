export const locales = ['en', 'sr', 'no'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  sr: 'Српски',
  no: 'Norsk',
};
