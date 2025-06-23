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
