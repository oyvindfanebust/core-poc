import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

import { locales } from '@/i18n/config';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as (typeof locales)[number])) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  // Ensure navigation and common messages are available to client components
  const clientMessages = messages
    ? {
        navigation: (messages as Record<string, unknown>).navigation,
        common: (messages as Record<string, unknown>).common,
        // Include other messages that might be needed by client components
        ...messages,
      }
    : messages;

  return (
    <NextIntlClientProvider messages={clientMessages} locale={locale}>
      <div className="min-h-screen bg-gray-50">{children}</div>
    </NextIntlClientProvider>
  );
}
