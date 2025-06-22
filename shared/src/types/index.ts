// Placeholder for shared types
// These will be extracted from backend in future iterations
export type Currency = 'USD' | 'EUR' | 'GBP' | 'NOK' | 'SEK' | 'DKK' | 'JPY' | 'CAD' | 'AUD' | 'CHF';
export type AccountType = 'DEPOSIT' | 'LOAN' | 'CREDIT';

export interface Account {
  accountId: string;
  customerId: string;
  accountType: AccountType;
  currency: Currency;
  accountName?: string;
  createdAt: string;
  updatedAt: string;
}