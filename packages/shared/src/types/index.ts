// Placeholder for shared types
// These will be extracted from backend in future iterations
export type Currency =
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'NOK'
  | 'SEK'
  | 'DKK'
  | 'JPY'
  | 'CAD'
  | 'AUD'
  | 'CHF';
export type AccountType = 'DEPOSIT' | 'LOAN' | 'CREDIT';

// Transfer types for TigerBeetle user_data encoding
// These are immutable and append-only
export enum TransferType {
  CUSTOMER_TRANSFER = 1,
  INITIAL_DEPOSIT = 2,
}

export interface Account {
  accountId: string;
  customerId: string;
  accountType: AccountType;
  currency: Currency;
  accountName?: string;
  createdAt: string;
  updatedAt: string;
}
