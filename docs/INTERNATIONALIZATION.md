# Internationalization (i18n) Guide

This document covers the internationalization setup and usage for the customer frontend application.

## Overview

The frontend application supports multiple languages with full internationalization using next-intl. The system provides complete coverage for all UI text, navigation, forms, and messages.

## Supported Languages

### Current Languages

- **English (`en`)**: Default language, complete coverage
- **Norwegian (`no`)**: Complete translations (Norsk)
- **Serbian (`sr`)**: Complete translations with Cyrillic script (Српски)

### Language Configuration

Languages are configured in `frontend/i18n/config.ts`:

```typescript
export const locales = ['en', 'no', 'sr'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  no: 'Norsk',
  sr: 'Српски',
};
```

## Translation Files

### File Structure

Translation files are located in `frontend/messages/`:

```
frontend/messages/
├── en.json     # English (default)
├── no.json     # Norwegian
└── sr.json     # Serbian
```

### Translation File Format

```json
{
  "navigation": {
    "dashboard": "Dashboard",
    "accounts": "Accounts",
    "transfer": "Transfer Money",
    "createAccount": "Create Account"
  },
  "accounts": {
    "title": "My Accounts",
    "balance": "Balance",
    "accountNumber": "Account Number",
    "accountType": "Account Type"
  },
  "forms": {
    "submit": "Submit",
    "cancel": "Cancel",
    "loading": "Loading..."
  }
}
```

## Implementation

### Hook Usage

Use the `useTranslations` hook for all user-facing text:

```typescript
import { useTranslations } from 'next-intl';

export default function AccountsPage() {
  const t = useTranslations('accounts');

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('balance')}: {formatCurrency(balance)}</p>
    </div>
  );
}
```

### Provider Wrapper

Wrap components with `NextIntlClientProvider` for client-side components:

```typescript
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

### Nested Translations

Access nested translation keys using dot notation:

```typescript
const t = useTranslations();

// Access nested keys
const title = t('pages.dashboard.title');
const subtitle = t('pages.dashboard.subtitle');
```

## URL-based Locale

### Route Structure

The application uses locale-based URLs:

- `/en` - English content
- `/no` - Norwegian content
- `/sr` - Serbian content

### Middleware Configuration

Next.js middleware handles locale routing:

```typescript
import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['en', 'no', 'sr'],
  defaultLocale: 'en',
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### Navigation Between Locales

```typescript
import { Link } from 'next-intl/navigation';

<Link href="/dashboard" locale="no">
  Norsk versjon
</Link>
```

## Language Switching

### Language Switcher Component

```typescript
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const switchLanguage = (newLocale: string) => {
    router.push(`/${newLocale}${pathname}`);
  };

  return (
    <select value={locale} onChange={(e) => switchLanguage(e.target.value)}>
      <option value="en">English</option>
      <option value="no">Norsk</option>
      <option value="sr">Српски</option>
    </select>
  );
}
```

### Persistent State

Language preference is maintained through:

- URL-based locale detection
- Browser language detection for initial visit
- Session storage for user preference

## Translation Management

### Adding New Translations

1. **Add to English file first** (`en.json`)
2. **Translate to Norwegian** (`no.json`)
3. **Translate to Serbian** (`sr.json`)
4. **Update TypeScript types** if needed

### Translation Keys

**Use descriptive, hierarchical keys:**

```json
{
  "pages": {
    "accounts": {
      "title": "Account Overview",
      "actions": {
        "create": "Create New Account",
        "transfer": "Transfer Money"
      }
    }
  }
}
```

### Pluralization

Handle plural forms using next-intl's rich text features:

```json
{
  "messages": {
    "accountCount": "{count, plural, =0 {No accounts} =1 {One account} other {# accounts}}"
  }
}
```

## Currency and Number Formatting

### Locale-aware Formatting

```typescript
import { useFormatter } from 'next-intl';

export function formatCurrency(amount: number, currency: string) {
  const format = useFormatter();

  return format.number(amount, {
    style: 'currency',
    currency: currency,
  });
}
```

### Date Formatting

```typescript
import { useFormatter } from 'next-intl';

export function formatDate(date: Date) {
  const format = useFormatter();

  return format.dateTime(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
```

## Testing Translations

### Translation Coverage Testing

```typescript
// Test to ensure all keys are translated
describe('Translation Coverage', () => {
  it('should have Norwegian translations for all English keys', () => {
    const enKeys = Object.keys(enMessages);
    const noKeys = Object.keys(noMessages);

    expect(noKeys).toEqual(expect.arrayContaining(enKeys));
  });
});
```

### Component Testing with Translations

```typescript
import { NextIntlClientProvider } from 'next-intl';

const messages = {
  accounts: {
    title: 'Test Title'
  }
};

const renderWithIntl = (component: React.ReactNode) => {
  return render(
    <NextIntlClientProvider messages={messages} locale="en">
      {component}
    </NextIntlClientProvider>
  );
};
```

## Best Practices

### Translation Guidelines

1. **Keep keys descriptive and hierarchical**
2. **Use consistent naming conventions**
3. **Avoid technical jargon in user-facing text**
4. **Consider cultural differences in messaging**
5. **Test with long and short translations**

### Performance Considerations

- **Lazy load translations** for large applications
- **Tree-shake unused translations** in production
- **Cache translations** in browser storage
- **Minimize translation bundle size**

### Accessibility

- **Use semantic HTML** with translated content
- **Provide language indicators** for screen readers
- **Support RTL languages** if needed in future
- **Test with assistive technologies**

## Adding New Languages

### Steps to Add a Language

1. **Create translation file**: `messages/[locale].json`
2. **Add to locales array**: Update `i18n/config.ts`
3. **Add locale name**: Update `localeNames` mapping
4. **Update middleware**: Add to routing configuration
5. **Test thoroughly**: Ensure all text displays correctly

### Example: Adding German

```typescript
// 1. Create messages/de.json
{
  "navigation": {
    "dashboard": "Dashboard",
    "accounts": "Konten"
  }
}

// 2. Update i18n/config.ts
export const locales = ['en', 'no', 'sr', 'de'] as const;

export const localeNames: Record<Locale, string> = {
  en: 'English',
  no: 'Norsk',
  sr: 'Српски',
  de: 'Deutsch'
};
```

## Troubleshooting

### Common Issues

**Missing Translations:**

- Check console for translation warnings
- Verify key names match exactly
- Ensure translation files are valid JSON

**Layout Issues:**

- Test with longer/shorter text in different languages
- Check for text overflow in components
- Verify responsive design with translated content

**Performance Issues:**

- Monitor bundle size with additional languages
- Consider lazy loading for large translation files
- Optimize translation loading strategy
