import { getRequestConfig } from 'next-intl/server';
import { Locale, defaultLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale as Locale;
  
  // Fallback to default locale if invalid
  if (!locale || !['en', 'sr', 'no'].includes(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});