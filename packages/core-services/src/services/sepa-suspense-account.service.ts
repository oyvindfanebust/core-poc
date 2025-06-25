import { SystemAccountConfigService } from '../config/system-accounts.service.js';
import {
  getSEPASuspenseAccountId,
  getSystemAccountNumericId,
  registerSystemAccountId,
  isSEPACurrency,
  SEPA_SYSTEM_ACCOUNTS,
} from '../system-account-id.js';
import { TigerBeetleService } from '../tigerbeetle.service.js';
import { Currency } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class SEPASuspenseAccountService {
  constructor(
    private tigerBeetleService: TigerBeetleService,
    private configService: SystemAccountConfigService,
  ) {}

  /**
   * Initialize all SEPA suspense accounts
   * Creates accounts in TigerBeetle and stores mappings in configuration file
   */
  async initializeAllSEPASuspenseAccounts(): Promise<void> {
    logger.info('Initializing SEPA suspense accounts...');

    const sepaCurrencies: Array<'EUR' | 'NOK' | 'SEK' | 'DKK'> = ['EUR', 'NOK', 'SEK', 'DKK'];
    const accountTypes = ['OUTGOING_SUSPENSE', 'INCOMING_SUSPENSE', 'SETTLEMENT'] as const;

    for (const currency of sepaCurrencies) {
      for (const accountType of accountTypes) {
        await this.createSEPASuspenseAccount(accountType, currency);
      }
    }

    logger.info('SEPA suspense accounts initialization completed');
  }

  /**
   * Create a single SEPA suspense account
   */
  async createSEPASuspenseAccount(
    type: keyof typeof SEPA_SYSTEM_ACCOUNTS,
    currency: 'EUR' | 'NOK' | 'SEK' | 'DKK',
  ): Promise<bigint> {
    const systemIdentifier = getSEPASuspenseAccountId(type, currency);

    // Check if account already exists in configuration
    const existingAccount = this.configService.getSystemAccount(systemIdentifier);

    if (existingAccount) {
      logger.info('SEPA suspense account already exists', {
        systemIdentifier,
        tigerBeetleId: existingAccount.tigerBeetleId,
      });

      // Register in memory cache
      registerSystemAccountId(systemIdentifier, BigInt(existingAccount.tigerBeetleId));

      return BigInt(existingAccount.tigerBeetleId);
    }

    // Create new account in TigerBeetle
    const numericId = await this.tigerBeetleService.createAccount({
      type: 'LIABILITY', // Suspense accounts are liabilities
      customerId: 'SYSTEM',
      currency,
    });

    // Store mapping in configuration file
    await this.configService.addSystemAccount(
      systemIdentifier,
      numericId.toString(),
      `SEPA_${type}`,
      currency,
      this.getAccountDescription(type, currency),
    );

    // Register in memory cache
    registerSystemAccountId(systemIdentifier, numericId);

    logger.info('Created SEPA suspense account', {
      systemIdentifier,
      tigerBeetleId: numericId.toString(),
      type,
      currency,
    });

    return numericId;
  }

  /**
   * Load all system account mappings from configuration file into memory
   */
  async loadSystemAccountMappings(): Promise<void> {
    try {
      const accounts = this.configService.getAllSystemAccounts();

      for (const [systemIdentifier, account] of Object.entries(accounts)) {
        registerSystemAccountId(systemIdentifier, BigInt(account.tigerBeetleId));
      }

      logger.info('Loaded system account mappings', {
        count: Object.keys(accounts).length,
      });
    } catch (error) {
      logger.error('Failed to load system account mappings', { error });
      throw error;
    }
  }

  /**
   * Get the numeric TigerBeetle ID for a SEPA suspense account
   */
  async getSEPASuspenseAccountNumericId(
    type: keyof typeof SEPA_SYSTEM_ACCOUNTS,
    currency: 'EUR' | 'NOK' | 'SEK' | 'DKK',
  ): Promise<bigint> {
    const systemIdentifier = getSEPASuspenseAccountId(type, currency);

    // Check memory cache first
    let numericId = getSystemAccountNumericId(systemIdentifier);

    // If not in cache, check configuration
    const account = this.configService.getSystemAccount(systemIdentifier);

    if (!account) {
      throw new Error(`SEPA suspense account not found: ${systemIdentifier}`);
    }

    numericId = BigInt(account.tigerBeetleId);

    // Register in memory cache
    registerSystemAccountId(systemIdentifier, numericId);

    return numericId;
  }

  /**
   * Validate that a currency is supported for SEPA operations
   */
  validateSEPACurrency(currency: Currency): asserts currency is 'EUR' | 'NOK' | 'SEK' | 'DKK' {
    if (!isSEPACurrency(currency)) {
      throw new Error(
        `Currency ${currency} is not supported for SEPA operations. Supported currencies: EUR, NOK, SEK, DKK`,
      );
    }
  }

  private getAccountDescription(type: string, currency: string): string {
    const descriptions = {
      OUTGOING_SUSPENSE: `SEPA outgoing transfer suspense account for ${currency}`,
      INCOMING_SUSPENSE: `SEPA incoming transfer suspense account for ${currency}`,
      SETTLEMENT: `SEPA settlement account for ${currency}`,
    };

    return (
      descriptions[type as keyof typeof descriptions] || `SEPA ${type} account for ${currency}`
    );
  }
}
