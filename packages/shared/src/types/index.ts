// Shared types for core banking - SEPA currencies only
export type Currency = 'EUR' | 'NOK' | 'SEK' | 'DKK';
export type AccountType = 'DEPOSIT' | 'LOAN' | 'CREDIT';

// Transfer types for TigerBeetle user_data encoding - Core banking only
// These are immutable and append-only
export enum TransferType {
  CUSTOMER_TRANSFER = 1,
  INITIAL_DEPOSIT = 2,
  ACH_CREDIT = 3,
  ACH_DEBIT = 4,
  WIRE_TRANSFER = 5,
  LOAN_FUNDING = 6,
  LOAN_PAYMENT = 7,
  INTERNAL_TRANSFER = 8,
  REVERSAL = 9,
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
