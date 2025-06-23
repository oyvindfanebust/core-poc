import {
  formatLocalizedDate,
  formatLocalizedNumber,
  formatLocalizedCurrency,
  formatTransactionReference,
} from '../lib/formatting-utils';

describe('Formatting Utils', () => {
  describe('formatLocalizedDate', () => {
    const testDate = '2023-12-25T14:30:00Z';

    it('should format date for English locale (MM/DD/YYYY)', () => {
      const result = formatLocalizedDate(testDate, 'en');
      expect(result).toBe('12/25/2023');
    });

    it('should format date for Norwegian locale (DD.MM.YYYY)', () => {
      const result = formatLocalizedDate(testDate, 'no');
      expect(result).toBe('25.12.2023');
    });

    it('should format date for Serbian locale (DD.MM.YYYY.)', () => {
      const result = formatLocalizedDate(testDate, 'sr');
      expect(result).toBe('25.12.2023.');
    });

    it('should handle invalid date strings', () => {
      const result = formatLocalizedDate('invalid-date', 'en');
      expect(result).toBe('Invalid Date');
    });

    it('should fallback to English for unsupported locale', () => {
      const result = formatLocalizedDate(testDate, 'fr');
      expect(result).toBe('12/25/2023');
    });
  });

  describe('formatLocalizedNumber', () => {
    it('should format numbers for English locale (comma separator)', () => {
      expect(formatLocalizedNumber(1234.56, 'en')).toBe('1,234.56');
      expect(formatLocalizedNumber(1000000, 'en')).toBe('1,000,000');
      expect(formatLocalizedNumber(0, 'en')).toBe('0');
    });

    it('should format numbers for Norwegian locale (space separator)', () => {
      expect(formatLocalizedNumber(1234.56, 'no')).toBe('1 234,56');
      expect(formatLocalizedNumber(1000000, 'no')).toBe('1 000 000');
      expect(formatLocalizedNumber(0, 'no')).toBe('0');
    });

    it('should format numbers for Serbian locale (dot separator)', () => {
      expect(formatLocalizedNumber(1234.56, 'sr')).toBe('1.234,56');
      expect(formatLocalizedNumber(1000000, 'sr')).toBe('1.000.000');
      expect(formatLocalizedNumber(0, 'sr')).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatLocalizedNumber(-1234.56, 'en')).toBe('-1,234.56');
      expect(formatLocalizedNumber(-1234.56, 'no')).toBe('-1 234,56');
      expect(formatLocalizedNumber(-1234.56, 'sr')).toBe('-1.234,56');
    });

    it('should fallback to English for unsupported locale', () => {
      expect(formatLocalizedNumber(1234.56, 'fr')).toBe('1,234.56');
    });
  });

  describe('formatLocalizedCurrency', () => {
    it('should format USD currency for English locale', () => {
      expect(formatLocalizedCurrency('150000', 'USD', 'en')).toBe('$1,500.00');
      expect(formatLocalizedCurrency('0', 'USD', 'en')).toBe('$0.00');
      expect(formatLocalizedCurrency('-50000', 'USD', 'en')).toBe('-$500.00');
    });

    it('should format NOK currency for Norwegian locale', () => {
      expect(formatLocalizedCurrency('150000', 'NOK', 'no')).toBe('1 500,00 kr');
      expect(formatLocalizedCurrency('0', 'NOK', 'no')).toBe('0,00 kr');
    });

    it('should format EUR currency for Serbian locale', () => {
      expect(formatLocalizedCurrency('150000', 'EUR', 'sr')).toBe('1.500,00 €');
      expect(formatLocalizedCurrency('0', 'EUR', 'sr')).toBe('0,00 €');
    });

    it('should handle different currencies consistently', () => {
      expect(formatLocalizedCurrency('100000', 'EUR', 'en')).toBe('€1,000.00');
      expect(formatLocalizedCurrency('100000', 'GBP', 'en')).toBe('£1,000.00');
      expect(formatLocalizedCurrency('100000', 'JPY', 'en')).toBe('¥1,000');
    });

    it('should handle invalid amount strings', () => {
      expect(formatLocalizedCurrency('invalid', 'USD', 'en')).toBe('$0.00');
    });

    it('should fallback to English for unsupported locale', () => {
      expect(formatLocalizedCurrency('150000', 'USD', 'fr')).toBe('$1,500.00');
    });
  });

  describe('formatTransactionReference', () => {
    it('should show only last 8 characters of transaction ID', () => {
      const longId = '1234567890abcdef1234567890abcdef';
      expect(formatTransactionReference(longId)).toBe('90abcdef');
    });

    it('should return full ID if shorter than 8 characters', () => {
      expect(formatTransactionReference('123')).toBe('123');
      expect(formatTransactionReference('12345678')).toBe('12345678');
    });

    it('should handle empty string', () => {
      expect(formatTransactionReference('')).toBe('');
    });

    it('should handle undefined or null values gracefully', () => {
      expect(formatTransactionReference(undefined as any)).toBe('');
      expect(formatTransactionReference(null as any)).toBe('');
    });
  });

  describe('Edge cases and performance', () => {
    it('should handle very large numbers', () => {
      const largeNumber = 999999999999.99;
      expect(formatLocalizedNumber(largeNumber, 'en')).toBe('999,999,999,999.99');
      expect(formatLocalizedNumber(largeNumber, 'no')).toBe('999 999 999 999,99');
    });

    it('should handle very small decimal numbers', () => {
      expect(formatLocalizedNumber(0.01, 'en')).toBe('0.01');
      expect(formatLocalizedNumber(0.001, 'en')).toBe('0.001');
    });

    it('should be consistent with repeated calls', () => {
      const testValue = 1234.56;
      const firstCall = formatLocalizedNumber(testValue, 'en');
      const secondCall = formatLocalizedNumber(testValue, 'en');
      expect(firstCall).toBe(secondCall);
    });
  });
});
