import { Account } from './api';

/**
 * Format account display name with optional ID masking
 */
export function formatAccountDisplayName(account: Account, showFullId: boolean = false): string {
  const { accountName, accountType, accountId } = account;

  if (accountName) {
    return showFullId
      ? `${accountName} (${accountId})`
      : `${accountName} (••••${accountId.slice(-4)})`;
  }

  const typeDisplay = accountType.charAt(0) + accountType.slice(1).toLowerCase();
  return showFullId
    ? `${typeDisplay} Account (${accountId})`
    : `${typeDisplay} Account (••••${accountId.slice(-4)})`;
}

/**
 * Format account for select/dropdown options
 */
export function formatAccountOption(account: Account): string {
  const { accountName, accountType, currency, accountId } = account;
  const name =
    accountName || `${accountType.charAt(0) + accountType.slice(1).toLowerCase()} Account`;
  return `${name} - ${currency} (••••${accountId.slice(-4)})`;
}

/**
 * Get a short display name for an account
 */
export function getAccountShortName(account: Account): string {
  return (
    account.accountName ||
    `${account.accountType.charAt(0) + account.accountType.slice(1).toLowerCase()} Account`
  );
}

/**
 * Mask account ID for display
 */
export function maskAccountId(accountId: string): string {
  if (accountId.length <= 4) return accountId;
  return `••••${accountId.slice(-4)}`;
}

/**
 * Validate IBAN format
 */
export function validateIBAN(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return (
    /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleaned) && cleaned.length >= 15 && cleaned.length <= 34
  );
}

/**
 * Validate BIC format
 */
export function validateBIC(bic: string): boolean {
  if (!bic) return true; // BIC is optional
  const cleaned = bic.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleaned);
}

/**
 * Format IBAN with spaces for display
 */
export function formatIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Extract country code from IBAN
 */
export function extractCountryFromIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return cleaned.substring(0, 2);
}

/**
 * Check if currency is supported for SEPA transfers
 */
export function isSEPACurrency(currency: string): boolean {
  return ['EUR', 'NOK', 'SEK', 'DKK'].includes(currency);
}

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    NOK: 'kr',
    SEK: 'kr',
    DKK: 'kr',
    GBP: '£',
    JPY: '¥',
    CHF: 'CHF',
    CAD: 'C$',
    AUD: 'A$',
  };
  return symbols[currency] || currency;
}

/**
 * Filter accounts compatible with SEPA transfers
 */
export function filterSEPACompatibleAccounts(accounts: Account[]): Account[] {
  return accounts.filter(
    account => account.accountType === 'DEPOSIT' && isSEPACurrency(account.currency),
  );
}
