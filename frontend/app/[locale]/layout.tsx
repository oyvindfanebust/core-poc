import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n/config';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  // Ensure navigation and common messages are available to client components
  const clientMessages = messages ? {
    navigation: (messages as any).navigation,
    common: (messages as any).common,
    // Include other messages that might be needed by client components
    ...messages
  } : messages;

  return (
    <NextIntlClientProvider 
      messages={clientMessages}
      locale={locale}
    >
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}