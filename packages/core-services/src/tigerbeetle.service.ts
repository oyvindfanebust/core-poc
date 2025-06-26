import { TransferType } from '@core-poc/shared';
import { id, createClient } from 'tigerbeetle-node';

import { ACCOUNT_TYPES, LEDGER_CODES } from './config/tigerbeetle.js';
import {
  generateCustomerAccountId,
  isValidCustomerAccountId,
  generateSystemAccountId,
  getSystemAccountNumericId,
  SystemAccountType,
} from './system-account-id.js';
import { CreateAccountRequest, CreateTransferRequest } from './types/index.js';
import { logger } from './utils/logger.js';

export class TigerBeetleService {
  private client: any;
  private clusterId: bigint;
  private addresses: string[];

  constructor(client: any, clusterId: bigint = 0n, addresses: string[] = ['localhost:6000']) {
    this.client = client;
    this.clusterId = clusterId;
    this.addresses = addresses;
  }

  private async ensureConnection(): Promise<void> {
    if (!this.client) {
      await this.reconnect();
    }
  }

  private async reconnect(): Promise<void> {
    try {
      logger.info('Attempting to reconnect to TigerBeetle...', {
        clusterId: this.clusterId.toString(),
        addresses: this.addresses,
      });

      if (this.client) {
        try {
          await this.client.close();
        } catch (error) {
          logger.debug('Error closing existing client', { error });
        }
      }

      this.client = createClient({
        cluster_id: this.clusterId,
        replica_addresses: this.addresses,
      });

      // Connection established successfully
      logger.info('TigerBeetle reconnection successful');
    } catch (error) {
      logger.error('Failed to reconnect to TigerBeetle', { error });
      this.client = null;
      throw error;
    }
  }

  private async withRetry<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.ensureConnection();
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry business logic errors
        if (
          error instanceof Error &&
          (error.message.includes('Account not found') ||
            error.message.includes('Duplicate transfer') ||
            error.message.includes('Invalid account'))
        ) {
          throw error;
        }

        logger.warn(`TigerBeetle operation failed (attempt ${attempt}/${maxRetries})`, {
          error: error instanceof Error ? error.message : String(error),
        });

        if (attempt < maxRetries) {
          // Connection might be broken, try to reconnect
          this.client = null;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError;
  }

  async close(): Promise<void> {
    if (this.client && typeof this.client.close === 'function') {
      await this.client.close();
    }
  }

  async createAccount(request: CreateAccountRequest): Promise<bigint> {
    return this.withRetry(async () => {
      // Generate customer account ID
      const accountId = generateCustomerAccountId();

      // Validate it's a valid customer account ID
      if (!isValidCustomerAccountId(accountId)) {
        throw new Error('Generated invalid customer account ID');
      }

      const account = {
        id: accountId,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: 0,
        reserved: 0,
        ledger: LEDGER_CODES[request.currency],
        code: ACCOUNT_TYPES[request.type],
        flags: 0,
        timestamp: 0n,
      };

      const errors = await this.client.createAccounts([account]);
      if (errors.length > 0) {
        throw new Error(`Failed to create account: ${JSON.stringify(errors)}`);
      }

      if (request.initialBalance && request.initialBalance > 0n) {
        await this.initialDeposit(accountId, request.initialBalance, request.currency);
      }

      return accountId;
    });
  }

  async createTransfer(request: CreateTransferRequest): Promise<bigint> {
    return this.withRetry(async () => {
      const transferId = id();

      const transfer = {
        id: transferId,
        debit_account_id: request.fromAccountId,
        credit_account_id: request.toAccountId,
        amount: request.amount,
        pending_id: 0n,
        user_data_128: 0n,
        user_data_64: 0n,
        user_data_32: request.transferType || TransferType.CUSTOMER_TRANSFER,
        timeout: 0,
        ledger: LEDGER_CODES[request.currency],
        code: 1,
        flags: 0,
        timestamp: 0n,
      };

      const errors = await this.client.createTransfers([transfer]);
      if (errors.length > 0) {
        throw new Error(`Failed to create transfer: ${JSON.stringify(errors)}`);
      }

      return transferId;
    });
  }

  async getAccountBalance(
    accountId: bigint,
  ): Promise<{ debits: bigint; credits: bigint; balance: bigint }> {
    return this.withRetry(async () => {
      const accounts = await this.client.lookupAccounts([accountId]);
      if (accounts.length === 0) {
        throw new Error('Account not found');
      }

      const account = accounts[0];
      return {
        debits: BigInt(account.debits_posted),
        credits: BigInt(account.credits_posted),
        balance: BigInt(account.credits_posted) - BigInt(account.debits_posted),
      };
    });
  }

  /**
   * Create a system account (equity, liability, SEPA suspense, etc.)
   * @param type The type of system account
   * @param currency The currency for the account
   * @param code Optional account code (defaults based on type)
   * @returns The system account's string identifier
   */
  async createSystemAccount(
    type: SystemAccountType,
    currency: keyof typeof LEDGER_CODES,
    code?: number,
  ): Promise<string> {
    return this.withRetry(async () => {
      // Generate the system account identifier
      const systemAccountId = generateSystemAccountId(type, currency);

      // Get or generate the numeric ID for TigerBeetle
      const numericId = getSystemAccountNumericId(systemAccountId);

      // Determine the account code based on type
      let accountCode = code;
      if (!accountCode) {
        switch (type) {
          case 'EQUITY':
            accountCode = ACCOUNT_TYPES.EQUITY;
            break;
          case 'LIABILITY':
            accountCode = ACCOUNT_TYPES.LIABILITY;
            break;
          case 'EXTERNAL_TRANSACTION':
            accountCode = ACCOUNT_TYPES.ASSET;
            break;
          case 'SEPA_OUTGOING_SUSPENSE':
          case 'SEPA_INCOMING_SUSPENSE':
          case 'SEPA_SETTLEMENT':
            accountCode = ACCOUNT_TYPES.ASSET; // SEPA accounts are asset accounts
            break;
          default:
            accountCode = ACCOUNT_TYPES.ASSET; // Default for suspense accounts
        }
      }

      const account = {
        id: numericId,
        debits_pending: 0n,
        debits_posted: 0n,
        credits_pending: 0n,
        credits_posted: 0n,
        user_data_128: 0n, // Could store account type info here
        user_data_64: 0n, // Could store currency info here
        user_data_32: 0,
        reserved: 0,
        ledger: LEDGER_CODES[currency],
        code: accountCode,
        flags: 0, // TODO: Add system account flags to prevent customer operations
        timestamp: 0n,
      };

      const errors = await this.client.createAccounts([account]);
      if (errors.length > 0) {
        // Check if account already exists
        const errorData = errors[0];
        if (errorData.result === 'exists') {
          logger.info('System account already exists', {
            systemAccountId,
            numericId: numericId.toString(),
          });
          return systemAccountId;
        }
        throw new Error(`Failed to create system account: ${JSON.stringify(errors)}`);
      }

      logger.info('Created system account', {
        systemAccountId,
        numericId: numericId.toString(),
        type,
        currency,
      });

      return systemAccountId;
    });
  }

  private async initialDeposit(
    accountId: bigint,
    amount: bigint,
    currency: keyof typeof LEDGER_CODES,
  ): Promise<void> {
    // Create or get the equity system account for this currency
    const equityAccountId = generateSystemAccountId('EQUITY', currency);
    const systemAccountNumericId = getSystemAccountNumericId(equityAccountId);

    // Try to create the equity account (will succeed if it doesn't exist)
    try {
      await this.createSystemAccount('EQUITY', currency);
    } catch (error) {
      // Account might already exist, that's okay
      logger.debug('Equity account creation skipped', { equityAccountId, error });
    }

    // Transfer from equity account to customer account
    await this.createTransfer({
      fromAccountId: systemAccountNumericId,
      toAccountId: accountId,
      amount,
      currency,
      transferType: TransferType.INITIAL_DEPOSIT,
    });
  }
}
