import { SystemAccountConfigService } from '../config/system-accounts.service.js';
import {
  SEPA_SYSTEM_ACCOUNTS,
  getSEPASuspenseAccountId,
  isSEPACurrency,
} from '../system-account-id.js';
import { TigerBeetleService } from '../tigerbeetle.service.js';
import { Currency } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface SEPAAccountCreationResult {
  accountId: string;
  numericId: bigint;
  existed: boolean;
}

export interface SEPAInitializationResult {
  created: SEPAAccountCreationResult[];
  errors: Array<{ accountId: string; error: string }>;
  totalAccounts: number;
  successCount: number;
}

/**
 * Service for managing SEPA suspense accounts in TigerBeetle
 *
 * Creates and manages the three types of SEPA accounts:
 * - SEPA Outgoing Suspense: For holding funds during outgoing SEPA transfers
 * - SEPA Incoming Suspense: For holding funds during incoming SEPA transfers
 * - SEPA Settlement: For final settlement of SEPA transactions
 */
export class SEPASuspenseAccountService {
  constructor(
    private tigerBeetleService: TigerBeetleService,
    private systemAccountsService: SystemAccountConfigService,
  ) {}

  /**
   * Initialize all SEPA suspense accounts for all supported currencies
   * @returns Result containing created accounts and any errors
   */
  async initializeAllSEPAAccounts(): Promise<SEPAInitializationResult> {
    logger.info('Starting SEPA suspense account initialization');

    const currencies: Array<'EUR' | 'NOK' | 'SEK' | 'DKK'> = ['EUR', 'NOK', 'SEK', 'DKK'];
    const accountTypes = ['OUTGOING_SUSPENSE', 'INCOMING_SUSPENSE', 'SETTLEMENT'] as const;

    const created: SEPAAccountCreationResult[] = [];
    const errors: Array<{ accountId: string; error: string }> = [];
    let totalAccounts = 0;

    for (const currency of currencies) {
      for (const accountType of accountTypes) {
        totalAccounts++;

        try {
          const result = await this.createSEPASuspenseAccount(accountType, currency);
          created.push(result);

          logger.info('SEPA account processed', {
            accountId: result.accountId,
            currency,
            accountType,
            existed: result.existed,
          });
        } catch (error) {
          const accountId = getSEPASuspenseAccountId(accountType, currency);
          const errorMessage = error instanceof Error ? error.message : String(error);

          errors.push({ accountId, error: errorMessage });

          logger.error('Failed to create SEPA account', {
            accountId,
            currency,
            accountType,
            error: errorMessage,
          });
        }
      }
    }

    const result: SEPAInitializationResult = {
      created,
      errors,
      totalAccounts,
      successCount: created.length,
    };

    logger.info('SEPA suspense account initialization completed', {
      totalAccounts: result.totalAccounts,
      successCount: result.successCount,
      errorCount: result.errors.length,
    });

    return result;
  }

  /**
   * Create a specific SEPA suspense account
   * @param type The type of SEPA account
   * @param currency The currency for the account
   * @returns Creation result with account details
   */
  async createSEPASuspenseAccount(
    type: keyof typeof SEPA_SYSTEM_ACCOUNTS,
    currency: 'EUR' | 'NOK' | 'SEK' | 'DKK',
  ): Promise<SEPAAccountCreationResult> {
    if (!isSEPACurrency(currency)) {
      throw new Error(`Currency ${currency} is not supported for SEPA`);
    }

    const accountId = getSEPASuspenseAccountId(type, currency);

    logger.debug('Creating SEPA suspense account', {
      accountId,
      type,
      currency,
    });

    try {
      // Determine the system account type for TigerBeetle creation
      let systemAccountType:
        | 'SEPA_OUTGOING_SUSPENSE'
        | 'SEPA_INCOMING_SUSPENSE'
        | 'SEPA_SETTLEMENT';

      switch (type) {
        case 'OUTGOING_SUSPENSE':
          systemAccountType = 'SEPA_OUTGOING_SUSPENSE';
          break;
        case 'INCOMING_SUSPENSE':
          systemAccountType = 'SEPA_INCOMING_SUSPENSE';
          break;
        case 'SETTLEMENT':
          systemAccountType = 'SEPA_SETTLEMENT';
          break;
        default:
          throw new Error(`Unknown SEPA account type: ${type}`);
      }

      // Create the account in TigerBeetle
      const createdAccountId = await this.tigerBeetleService.createSystemAccount(
        systemAccountType,
        currency,
      );

      // Check if account already existed (createSystemAccount handles this gracefully)
      const existed = createdAccountId === accountId;

      // Store the account configuration
      await this.saveAccountConfiguration(accountId, type, currency);

      // Get the numeric ID for the result
      const { getSystemAccountNumericId } = await import('../system-account-id.js');
      const numericId = getSystemAccountNumericId(accountId);

      return {
        accountId,
        numericId,
        existed,
      };
    } catch (error) {
      logger.error('SEPA account creation failed', {
        accountId,
        type,
        currency,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get SEPA account for a specific type and currency
   * @param type The type of SEPA account
   * @param currency The currency
   * @returns The account ID and its numeric representation
   */
  async getSEPAAccount(
    type: keyof typeof SEPA_SYSTEM_ACCOUNTS,
    currency: 'EUR' | 'NOK' | 'SEK' | 'DKK',
  ): Promise<{ accountId: string; numericId: bigint }> {
    if (!isSEPACurrency(currency)) {
      throw new Error(`Currency ${currency} is not supported for SEPA`);
    }

    const accountId = getSEPASuspenseAccountId(type, currency);
    const { getSystemAccountNumericId } = await import('../system-account-id.js');
    const numericId = getSystemAccountNumericId(accountId);

    return { accountId, numericId };
  }

  /**
   * Validate that all SEPA accounts exist and are properly configured
   * @returns Validation result with missing accounts
   */
  async validateSEPAAccounts(): Promise<{
    valid: boolean;
    missing: string[];
    configured: string[];
  }> {
    const currencies: Array<'EUR' | 'NOK' | 'SEK' | 'DKK'> = ['EUR', 'NOK', 'SEK', 'DKK'];
    const accountTypes = ['OUTGOING_SUSPENSE', 'INCOMING_SUSPENSE', 'SETTLEMENT'] as const;

    const missing: string[] = [];
    const configured: string[] = [];

    for (const currency of currencies) {
      for (const accountType of accountTypes) {
        const accountId = getSEPASuspenseAccountId(accountType, currency);

        try {
          // Check if account exists in TigerBeetle
          const { numericId } = await this.getSEPAAccount(accountType, currency);
          await this.tigerBeetleService.getAccountBalance(numericId);

          configured.push(accountId);
        } catch {
          missing.push(accountId);
        }
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      configured,
    };
  }

  /**
   * Save account configuration to the system accounts file
   */
  private async saveAccountConfiguration(
    accountId: string,
    type: keyof typeof SEPA_SYSTEM_ACCOUNTS,
    currency: string,
  ): Promise<void> {
    try {
      const { getSystemAccountNumericId } = await import('../system-account-id.js');
      const numericId = getSystemAccountNumericId(accountId);

      await this.systemAccountsService.addSystemAccount(
        accountId,
        numericId.toString(),
        `SEPA_${type}`,
        currency as Currency,
        `SEPA ${type.replace('_', ' ').toLowerCase()} account for ${currency}`,
      );

      logger.debug('Saved SEPA account configuration', {
        accountId,
        numericId: numericId.toString(),
      });
    } catch (error) {
      logger.warn('Failed to save account configuration', {
        accountId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - account creation succeeded, configuration save is best-effort
    }
  }
}
