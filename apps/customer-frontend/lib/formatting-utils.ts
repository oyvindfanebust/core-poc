/**
 * Locale-aware formatting utilities for dates, numbers, and currency
 * Supports English (en), Norwegian (no), and Serbian (sr) locales
 */

export type SupportedLocale = 'en' | 'no' | 'sr';

/**
 * Format a date string according to locale preferences
 * @param dateString - ISO date string or date-like string
 * @param locale - Target locale (en, no, sr)
 * @returns Formatted date string
 */
export function formatLocalizedDate(dateString: string, locale: string): string {
  try {
    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const normalizedLocale = normalizeSupportedLocale(locale);

    switch (normalizedLocale) {
      case 'en':
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });

      case 'no':
        return date
          .toLocaleDateString('nb-NO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          .replace(/\//g, '.');

      case 'sr': {
        const formatted = date
          .toLocaleDateString('sr-RS', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          .replace(/\//g, '.');
        return formatted.endsWith('.') ? formatted : `${formatted}.`;
      }

      default:
        return formatLocalizedDate(dateString, 'en');
    }
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format a number according to locale preferences
 * @param amount - Number to format
 * @param locale - Target locale (en, no, sr)
 * @returns Formatted number string
 */
export function formatLocalizedNumber(amount: number, locale: string): string {
  const normalizedLocale = normalizeSupportedLocale(locale);

  try {
    let formatted: string;

    switch (normalizedLocale) {
      case 'en':
        formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 20, // Preserve original precision
        }).format(amount);
        break;

      case 'no':
        formatted = new Intl.NumberFormat('nb-NO', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 20,
        }).format(amount);
        // Replace non-breaking space with regular space and minus with hyphen
        formatted = formatted.replace(/\u00A0/g, ' ').replace(/\u2212/g, '-');
        break;

      case 'sr':
        formatted = new Intl.NumberFormat('sr-RS', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 20,
        }).format(amount);
        // Replace non-breaking space with regular space and minus with hyphen
        formatted = formatted.replace(/\u00A0/g, ' ').replace(/\u2212/g, '-');
        break;

      default:
        return formatLocalizedNumber(amount, 'en');
    }

    return formatted;
  } catch {
    // Fallback to basic formatting if Intl fails
    return amount.toString();
  }
}

/**
 * Format currency amount according to locale preferences
 * Amount is expected to be in cents (e.g., 150000 = $1500.00)
 * @param amountString - Amount in cents as string
 * @param currency - Currency code (USD, EUR, NOK, etc.)
 * @param locale - Target locale (en, no, sr)
 * @returns Formatted currency string
 */
export function formatLocalizedCurrency(
  amountString: string,
  currency: string,
  locale: string,
): string {
  const normalizedLocale = normalizeSupportedLocale(locale);

  // Convert from cents to main currency unit
  const amount = parseFloat(amountString) / 100;

  // Handle invalid amounts
  if (isNaN(amount)) {
    return formatLocalizedCurrency('0', currency, locale);
  }

  try {
    let formatted: string;

    // Special handling for different locales and currencies
    switch (normalizedLocale) {
      case 'en':
        formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: currency === 'JPY' ? 0 : 2,
          maximumFractionDigits: currency === 'JPY' ? 0 : 2,
        }).format(amount);
        break;

      case 'no':
        // Norwegian typically puts currency symbol after amount for NOK
        if (currency === 'NOK') {
          const numberFormatted = new Intl.NumberFormat('nb-NO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(amount);
          // Replace non-breaking space with regular space
          formatted = `${numberFormatted.replace(/\u00A0/g, ' ')} kr`;
        } else {
          formatted = new Intl.NumberFormat('nb-NO', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: currency === 'JPY' ? 0 : 2,
            maximumFractionDigits: currency === 'JPY' ? 0 : 2,
          }).format(amount);
          formatted = formatted.replace(/\u00A0/g, ' ').replace(/\u2212/g, '-');
        }
        break;

      case 'sr':
        formatted = new Intl.NumberFormat('sr-RS', {
          style: 'currency',
          currency: currency,
          minimumFractionDigits: currency === 'JPY' ? 0 : 2,
          maximumFractionDigits: currency === 'JPY' ? 0 : 2,
        }).format(amount);
        formatted = formatted.replace(/\u00A0/g, ' ').replace(/\u2212/g, '-');
        break;

      default:
        return formatLocalizedCurrency(amountString, currency, 'en');
    }

    return formatted;
  } catch {
    // Fallback to basic formatting if Intl fails
    const formatted = formatLocalizedNumber(amount, locale);
    return `${currency} ${formatted}`;
  }
}

/**
 * Format transaction reference to show only relevant part
 * Shows last 8 characters for long IDs, full ID for short ones
 * @param id - Transaction ID or reference
 * @returns Formatted reference string
 */
export function formatTransactionReference(id: string | null | undefined): string {
  // Handle null/undefined cases
  if (!id) {
    return '';
  }

  // Convert to string and trim whitespace
  const cleanId = String(id).trim();

  // Return empty string for empty input
  if (!cleanId) {
    return '';
  }

  // If ID is 8 characters or less, return as-is
  if (cleanId.length <= 8) {
    return cleanId;
  }

  // Return last 8 characters for longer IDs
  return cleanId.slice(-8);
}

/**
 * Normalize locale string to supported locale or fallback to 'en'
 * @param locale - Input locale string
 * @returns Supported locale string
 */
function normalizeSupportedLocale(locale: string): SupportedLocale {
  const normalized = locale.toLowerCase();

  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }

  if (normalized === 'no' || normalized === 'nb' || normalized.startsWith('nb-')) {
    return 'no';
  }

  if (normalized === 'sr' || normalized.startsWith('sr-')) {
    return 'sr';
  }

  // Default fallback to English
  return 'en';
}
