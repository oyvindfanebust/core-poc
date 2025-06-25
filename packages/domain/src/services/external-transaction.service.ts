import {
  TigerBeetleService,
  logger,
  Currency,
  generateSystemAccountId,
  getSystemAccountNumericId,
  registerSystemAccountId,
} from '@core-poc/core-services';

import { AccountService } from './account.service.js';

export interface ExternalBankInfo {
  bankIdentifier: string; // SWIFT BIC, Sort Code, Routing Number, etc.
  accountNumber: string;
  bankName: string;
  country?: string; // ISO country code
}

export interface HighValueTransferInfo extends ExternalBankInfo {
  recipientName: string;
  transferMessage?: string;
}

export interface IncomingTransferRequest {
  accountId: bigint;
  amount: bigint;
  currency: Currency;
  externalBankInfo: ExternalBankInfo;
  description?: string;
}

export interface OutgoingTransferRequest {
  accountId: bigint;
  amount: bigint;
  currency: Currency;
  externalBankInfo: ExternalBankInfo;
  description?: string;
}

export interface HighValueTransferRequest {
  accountId: bigint;
  amount: bigint;
  currency: Currency;
  transferInfo: HighValueTransferInfo;
  description?: string;
}

export interface ExternalTransactionResult {
  transferId: bigint;
  status: 'completed' | 'pending' | 'failed';
  externalTransactionId: string;
}

export class ExternalTransactionService {
  private systemAccounts = new Map<Currency, bigint>();

  constructor(
    private accountService: AccountService,
    private tigerBeetleService: TigerBeetleService,
  ) {}

  /**
   * Process incoming transfer (funds coming from external bank)
   * Handles various systems: ACH Credit (US), SEPA Credit (EU), Faster Payments (UK), etc.
   */
  async processIncomingTransfer(
    request: IncomingTransferRequest,
  ): Promise<ExternalTransactionResult> {
    try {
      logger.info('Processing incoming transfer', {
        accountId: request.accountId.toString(),
        amount: request.amount.toString(),
        currency: request.currency,
        bankName: request.externalBankInfo.bankName,
      });

      // Validate external bank information
      this.validateExternalBankInfo(request.externalBankInfo);

      // Get or create system account for this currency
      const systemAccountId = await this.getSystemAccount(request.currency);

      // Create transfer from system account to customer account
      const transferId = await this.accountService.transfer(
        systemAccountId,
        request.accountId,
        request.amount,
        request.currency,
        `Incoming transfer from external bank: ${request.description || 'External deposit'}`,
      );

      // Generate external transaction ID for tracking
      const externalTransactionId = this.generateExternalTransactionId('INCOMING_TRANSFER');

      logger.info('Incoming transfer processed successfully', {
        transferId: transferId.toString(),
        externalTransactionId,
        accountId: request.accountId.toString(),
      });

      return {
        transferId,
        status: 'completed',
        externalTransactionId,
      };
    } catch (error) {
      logger.error('Failed to process incoming transfer', {
        accountId: request.accountId.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Process outgoing transfer (funds going to external bank)
   * Handles various systems: ACH Debit (US), SEPA Direct Debit (EU), Direct Debit (UK), etc.
   */
  async processOutgoingTransfer(
    request: OutgoingTransferRequest,
  ): Promise<ExternalTransactionResult> {
    try {
      logger.info('Processing outgoing transfer', {
        accountId: request.accountId.toString(),
        amount: request.amount.toString(),
        currency: request.currency,
        bankName: request.externalBankInfo.bankName,
      });

      // Validate external bank information
      this.validateExternalBankInfo(request.externalBankInfo);

      // Get or create system account for this currency
      const systemAccountId = await this.getSystemAccount(request.currency);

      // Create transfer from customer account to system account
      const transferId = await this.accountService.transfer(
        request.accountId,
        systemAccountId,
        request.amount,
        request.currency,
        `Outgoing transfer to external bank: ${request.description || 'External withdrawal'}`,
      );

      // Generate external transaction ID for tracking
      const externalTransactionId = this.generateExternalTransactionId('OUTGOING_TRANSFER');

      logger.info('Outgoing transfer processed successfully', {
        transferId: transferId.toString(),
        externalTransactionId,
        accountId: request.accountId.toString(),
      });

      return {
        transferId,
        status: 'completed',
        externalTransactionId,
      };
    } catch (error) {
      logger.error('Failed to process outgoing transfer', {
        accountId: request.accountId.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Process high-value transfer (typically outgoing, high security)
   * Handles various systems: Wire transfers (US), SWIFT (International), RTGS (UK), etc.
   */
  async processHighValueTransfer(
    request: HighValueTransferRequest,
  ): Promise<ExternalTransactionResult> {
    try {
      logger.info('Processing high-value transfer', {
        accountId: request.accountId.toString(),
        amount: request.amount.toString(),
        currency: request.currency,
        bankName: request.transferInfo.bankName,
        recipientName: request.transferInfo.recipientName,
      });

      // Validate high-value transfer information
      this.validateHighValueTransferInfo(request.transferInfo);

      // Get or create system account for this currency
      const systemAccountId = await this.getSystemAccount(request.currency);

      // Create transfer from customer account to system account
      const transferId = await this.accountService.transfer(
        request.accountId,
        systemAccountId,
        request.amount,
        request.currency,
        `High-value transfer: ${request.description || 'High-value transfer to external bank'}`,
      );

      // Generate external transaction ID for tracking
      const externalTransactionId = this.generateExternalTransactionId('HIGH_VALUE_TRANSFER');

      logger.info('High-value transfer processed successfully', {
        transferId: transferId.toString(),
        externalTransactionId,
        accountId: request.accountId.toString(),
      });

      return {
        transferId,
        status: 'completed',
        externalTransactionId,
      };
    } catch (error) {
      logger.error('Failed to process high-value transfer', {
        accountId: request.accountId.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Get or create system account for external transactions
   */
  async getSystemAccount(currency: Currency): Promise<bigint> {
    // Check if we already have a system account for this currency
    if (this.systemAccounts.has(currency)) {
      return this.systemAccounts.get(currency)!;
    }

    try {
      // Generate system account identifier using the new scheme
      const systemIdentifier = generateSystemAccountId('EXTERNAL_TRANSACTION', currency);

      // Try to get existing numeric ID
      let systemAccountId: bigint;
      try {
        systemAccountId = getSystemAccountNumericId(systemIdentifier);
        logger.info('Found existing system account for external transactions', {
          currency,
          systemIdentifier,
          accountId: systemAccountId.toString(),
        });
      } catch {
        // Account doesn't exist, create it
        systemAccountId = await this.tigerBeetleService.createAccount({
          type: 'EQUITY',
          customerId: 'SYSTEM',
          currency,
        });

        // Register the mapping
        registerSystemAccountId(systemIdentifier, systemAccountId);

        logger.info('Created new system account for external transactions', {
          currency,
          systemIdentifier,
          accountId: systemAccountId.toString(),
        });
      }

      // Cache the system account ID
      this.systemAccounts.set(currency, systemAccountId);

      return systemAccountId;
    } catch (error) {
      logger.error('Failed to get or create system account', { currency, error });
      throw error;
    }
  }

  /**
   * Validate external bank information
   */
  validateExternalBankInfo(bankInfo: ExternalBankInfo): void {
    // Validate bank identifier (flexible format for international use)
    if (!bankInfo.bankIdentifier || bankInfo.bankIdentifier.trim().length === 0) {
      throw new Error('Bank identifier is required');
    }

    // Basic validation - allow alphanumeric and common bank identifier characters
    if (!/^[A-Za-z0-9\-\s]+$/.test(bankInfo.bankIdentifier)) {
      throw new Error('Invalid bank identifier format');
    }

    // Validate account number (flexible for international formats)
    if (!bankInfo.accountNumber || bankInfo.accountNumber.trim().length === 0) {
      throw new Error('Account number is required');
    }

    // Allow alphanumeric and common account number characters
    if (!/^[A-Za-z0-9\-\s]+$/.test(bankInfo.accountNumber)) {
      throw new Error('Invalid account number format');
    }

    // Validate bank name
    if (!bankInfo.bankName || bankInfo.bankName.trim().length === 0) {
      throw new Error('Bank name is required');
    }

    // Validate country code if provided (ISO 3166-1 alpha-2)
    if (bankInfo.country && !/^[A-Z]{2}$/.test(bankInfo.country)) {
      throw new Error('Invalid country code format (expected ISO 3166-1 alpha-2)');
    }
  }

  /**
   * Validate high-value transfer information
   */
  validateHighValueTransferInfo(transferInfo: HighValueTransferInfo): void {
    // First validate basic bank info
    this.validateExternalBankInfo(transferInfo);

    // Validate recipient name
    if (!transferInfo.recipientName || transferInfo.recipientName.trim().length === 0) {
      throw new Error('Recipient name is required for high-value transfers');
    }

    // Validate transfer message length if provided
    if (transferInfo.transferMessage && transferInfo.transferMessage.length > 140) {
      throw new Error('Transfer message cannot exceed 140 characters');
    }
  }

  /**
   * Generate unique external transaction ID for tracking
   */
  private generateExternalTransactionId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${type}_${timestamp}_${random}`;
  }
}
