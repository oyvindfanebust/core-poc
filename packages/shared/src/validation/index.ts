// Placeholder for shared validation schemas
// These will be extracted from backend in future iterations
import { z } from 'zod';

export const CurrencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'NOK',
  'SEK',
  'DKK',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
] as const);

// Export IBAN validation utilities
export * from './iban-validation.js';
