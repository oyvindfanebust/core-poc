import { id } from 'tigerbeetle-node';

import { Currency } from './types/index.js';
import { AccountId } from './value-objects.js';

/**
 * System account types and their prefixes
 */
export const SYSTEM_ACCOUNT_TYPES = {
  // Core system accounts
  EQUITY: 'SYSTEM-EQUITY',
  LIABILITY: 'SYSTEM-LIABILITY',

  // SEPA-specific system accounts
  SEPA_OUTGOING_SUSPENSE: 'SEPA-OUT-SUSPENSE',
  SEPA_INCOMING_SUSPENSE: 'SEPA-IN-SUSPENSE',
  SEPA_SETTLEMENT: 'SEPA-SETTLEMENT',

  // External transaction system accounts
  EXTERNAL_TRANSACTION: 'SYSTEM-EXTERNAL',
} as const;

export type SystemAccountType = keyof typeof SYSTEM_ACCOUNT_TYPES;

/**
 * SEPA system accounts by currency
 */
export const SEPA_SYSTEM_ACCOUNTS = {
  OUTGOING_SUSPENSE: {
    EUR: 'SEPA-OUT-SUSPENSE-EUR',
    NOK: 'SEPA-OUT-SUSPENSE-NOK',
    SEK: 'SEPA-OUT-SUSPENSE-SEK',
    DKK: 'SEPA-OUT-SUSPENSE-DKK',
  },
  INCOMING_SUSPENSE: {
    EUR: 'SEPA-IN-SUSPENSE-EUR',
    NOK: 'SEPA-IN-SUSPENSE-NOK',
    SEK: 'SEPA-IN-SUSPENSE-SEK',
    DKK: 'SEPA-IN-SUSPENSE-DKK',
  },
  SETTLEMENT: {
    EUR: 'SEPA-SETTLEMENT-EUR',
    NOK: 'SEPA-SETTLEMENT-NOK',
    SEK: 'SEPA-SETTLEMENT-SEK',
    DKK: 'SEPA-SETTLEMENT-DKK',
  },
} as const;

// Map to store string identifiers to TigerBeetle numeric IDs
const systemAccountIdMap = new Map<string, bigint>();

/**
 * Generate a customer account ID using TigerBeetle's ID generation
 * Customer IDs are always numeric (bigint)
 * @returns A unique customer account ID
 */
export function generateCustomerAccountId(): bigint {
  return id();
}

/**
 * Validate that an account ID is a valid customer account ID
 * Customer account IDs must be numeric and not start with 'SYSTEM-' or 'SEPA-'
 * @param accountId The account ID to validate
 * @returns true if the ID is valid for a customer account
 */
export function isValidCustomerAccountId(accountId: string | bigint): boolean {
  const idStr = accountId.toString();

  // Must be numeric only
  if (!/^\d+$/.test(idStr)) {
    return false;
  }

  // Must not be a system account
  return !isSystemAccount(idStr);
}

/**
 * Validate that an account ID is a valid system account ID
 * System account IDs must follow the pattern: SYSTEM-{TYPE}-{CURRENCY} or SEPA-{TYPE}-{CURRENCY}
 * @param accountId The account ID to validate
 * @returns true if the ID is valid for a system account
 */
export function isValidSystemAccountId(accountId: string): boolean {
  // Must start with SYSTEM- or SEPA-
  if (!accountId.startsWith('SYSTEM-') && !accountId.startsWith('SEPA-')) {
    return false;
  }

  // Check against known patterns
  const systemPattern = /^SYSTEM-(EQUITY|LIABILITY|EXTERNAL)-(EUR|NOK|SEK|DKK)$/;
  const sepaPattern = /^SEPA-(OUT-SUSPENSE|IN-SUSPENSE|SETTLEMENT)-(EUR|NOK|SEK|DKK)$/;

  return systemPattern.test(accountId) || sepaPattern.test(accountId);
}

/**
 * Generate a system account ID with a specific prefix
 * @param type The type of system account
 * @param currency The currency for the account
 * @returns A unique system account identifier
 */
export function generateSystemAccountId(type: SystemAccountType, currency: Currency): string {
  const prefix = SYSTEM_ACCOUNT_TYPES[type];
  return `${prefix}-${currency}`;
}

/**
 * Check if an account ID represents a system account
 * @param accountId The account ID to check
 * @returns true if the account is a system account
 */
export function isSystemAccount(accountId: AccountId | string): boolean {
  const idStr = typeof accountId === 'string' ? accountId : accountId.toString();

  // Check if it's a mapped system account (by string identifier)
  if (systemAccountIdMap.has(idStr)) {
    return true;
  }

  // Check if the numeric ID is mapped as a system account
  for (const [, numericId] of systemAccountIdMap) {
    if (numericId.toString() === idStr) {
      return true;
    }
  }

  // Check if it starts with any system account prefix
  const prefixes = Object.values(SYSTEM_ACCOUNT_TYPES);
  return prefixes.some(prefix => idStr.startsWith(prefix));
}

/**
 * Check if an account ID represents a customer account
 * @param accountId The account ID to check
 * @returns true if the account is a customer account
 */
export function isCustomerAccount(accountId: AccountId | string): boolean {
  const idStr = typeof accountId === 'string' ? accountId : accountId.toString();

  // Empty string is not a valid customer account
  if (!idStr) {
    return false;
  }

  return !isSystemAccount(accountId) && isValidCustomerAccountId(idStr);
}

/**
 * Get the TigerBeetle numeric ID for a system account
 * Creates and stores a new numeric ID if one doesn't exist
 * @param systemAccountId The string identifier for the system account
 * @returns The TigerBeetle numeric ID
 */
export function getSystemAccountNumericId(systemAccountId: string): bigint {
  let numericId = systemAccountIdMap.get(systemAccountId);

  if (!numericId) {
    // Generate a new TigerBeetle ID and store the mapping
    numericId = id();
    systemAccountIdMap.set(systemAccountId, numericId);
  }

  return numericId;
}

/**
 * Register a system account ID mapping (for persistence)
 * @param systemAccountId The string identifier
 * @param numericId The TigerBeetle numeric ID
 */
export function registerSystemAccountId(systemAccountId: string, numericId: bigint): void {
  systemAccountIdMap.set(systemAccountId, numericId);
}

/**
 * Get all registered system account mappings (for persistence)
 * @returns Map of string identifiers to numeric IDs
 */
export function getSystemAccountMappings(): ReadonlyMap<string, bigint> {
  return new Map(systemAccountIdMap);
}

/**
 * Clear all system account mappings (for testing)
 */
export function clearSystemAccountMappings(): void {
  systemAccountIdMap.clear();
}

/**
 * Get SEPA suspense account ID for a specific type and currency
 * @param type The type of SEPA account (OUTGOING_SUSPENSE, INCOMING_SUSPENSE, SETTLEMENT)
 * @param currency The SEPA currency (EUR, NOK, SEK, DKK)
 * @returns The system account ID
 */
export function getSEPASuspenseAccountId(
  type: keyof typeof SEPA_SYSTEM_ACCOUNTS,
  currency: 'EUR' | 'NOK' | 'SEK' | 'DKK',
): string {
  return SEPA_SYSTEM_ACCOUNTS[type][currency];
}

/**
 * Validate that a currency is supported for SEPA
 * @param currency The currency to check
 * @returns true if the currency is supported for SEPA
 */
export function isSEPACurrency(currency: Currency): currency is 'EUR' | 'NOK' | 'SEK' | 'DKK' {
  return ['EUR', 'NOK', 'SEK', 'DKK'].includes(currency);
}
