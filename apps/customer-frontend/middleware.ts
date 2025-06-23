import createMiddleware from 'next-intl/middleware';

import { locales, defaultLocale } from './i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  matcher: [
    // Enable middleware for all routes except:
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
