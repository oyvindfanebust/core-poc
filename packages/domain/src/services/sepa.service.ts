import {
  TigerBeetleService,
  logger,
  Currency,
  SEPASuspenseAccountService,
  isSEPACurrency,
} from '@core-poc/core-services';

import { AccountService } from './account.service.js';

export interface SEPABankInfo {
  iban: string; // International Bank Account Number
  bic?: string; // Bank Identifier Code (SWIFT)
  bankName: string;
  recipientName: string;
  country: string; // ISO 3166-1 alpha-2 country code
}

export interface SEPATransferRequest {
  accountId: bigint;
  amount: bigint;
  currency: 'EUR' | 'NOK' | 'SEK' | 'DKK';
  bankInfo: SEPABankInfo;
  description?: string;
  urgency?: 'STANDARD' | 'EXPRESS' | 'INSTANT';
}

export interface SEPATransferResult {
  transferId: bigint;
  status: 'completed' | 'pending' | 'failed';
  sepaTransactionId: string;
  processingStage: 'suspense' | 'settlement' | 'external';
}

export interface SEPAIncomingTransferRequest {
  amount: bigint;
  currency: 'EUR' | 'NOK' | 'SEK' | 'DKK';
  bankInfo: SEPABankInfo;
  targetAccountId: bigint;
  sepaTransactionId: string;
  description?: string;
}

export class SEPAService {
  constructor(
    private accountService: AccountService,
    private tigerBeetleService: TigerBeetleService,
    private sepaSuspenseAccountService: SEPASuspenseAccountService,
  ) {}

  /**
   * Process outgoing SEPA transfer
   * Flow: Customer Account → SEPA Outgoing Suspense → SEPA Settlement → External Bank
   */
  async processOutgoingTransfer(request: SEPATransferRequest): Promise<SEPATransferResult> {
    try {
      logger.info('Processing outgoing SEPA transfer', {
        accountId: request.accountId.toString(),
        amount: request.amount.toString(),
        currency: request.currency,
        iban: this.maskIBAN(request.bankInfo.iban),
        urgency: request.urgency || 'STANDARD',
      });

      // Validate SEPA currency and bank info
      this.validateSEPATransfer(request);

      // Step 1: Move funds from customer account to outgoing suspense
      const outgoingSuspenseId =
        await this.sepaSuspenseAccountService.getSEPASuspenseAccountNumericId(
          'OUTGOING_SUSPENSE',
          request.currency,
        );

      const suspenseTransferId = await this.accountService.transfer(
        request.accountId,
        outgoingSuspenseId,
        request.amount,
        request.currency,
        `SEPA transfer to ${request.bankInfo.iban}: ${request.description || 'SEPA payment'}`,
      );

      // Generate SEPA transaction ID
      const sepaTransactionId = this.generateSEPATransactionId('OUT', request.currency);

      // Step 2: Move funds from outgoing suspense to settlement (simulating SEPA processing)
      const settlementAccountId =
        await this.sepaSuspenseAccountService.getSEPASuspenseAccountNumericId(
          'SETTLEMENT',
          request.currency,
        );

      const settlementTransferId = await this.accountService.transfer(
        outgoingSuspenseId,
        settlementAccountId,
        request.amount,
        request.currency,
        `SEPA settlement for ${sepaTransactionId}`,
      );

      logger.info('Outgoing SEPA transfer processed successfully', {
        suspenseTransferId: suspenseTransferId.toString(),
        settlementTransferId: settlementTransferId.toString(),
        sepaTransactionId,
        accountId: request.accountId.toString(),
      });

      return {
        transferId: suspenseTransferId,
        status: 'completed',
        sepaTransactionId,
        processingStage: 'settlement',
      };
    } catch (error) {
      logger.error('Failed to process outgoing SEPA transfer', {
        accountId: request.accountId.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Process incoming SEPA transfer
   * Flow: External Bank → SEPA Settlement → SEPA Incoming Suspense → Customer Account
   */
  async processIncomingTransfer(request: SEPAIncomingTransferRequest): Promise<SEPATransferResult> {
    try {
      logger.info('Processing incoming SEPA transfer', {
        targetAccountId: request.targetAccountId.toString(),
        amount: request.amount.toString(),
        currency: request.currency,
        sepaTransactionId: request.sepaTransactionId,
        iban: this.maskIBAN(request.bankInfo.iban),
      });

      // Validate SEPA currency and bank info
      this.validateSEPACurrency(request.currency);
      this.validateSEPABankInfo(request.bankInfo);

      // Step 1: Simulate funds arriving in settlement account from external bank
      const settlementAccountId =
        await this.sepaSuspenseAccountService.getSEPASuspenseAccountNumericId(
          'SETTLEMENT',
          request.currency,
        );

      // Step 2: Move funds from settlement to incoming suspense
      const incomingSuspenseId =
        await this.sepaSuspenseAccountService.getSEPASuspenseAccountNumericId(
          'INCOMING_SUSPENSE',
          request.currency,
        );

      const suspenseTransferId = await this.accountService.transfer(
        settlementAccountId,
        incomingSuspenseId,
        request.amount,
        request.currency,
        `SEPA incoming processing for ${request.sepaTransactionId}`,
      );

      // Step 3: Move funds from incoming suspense to customer account
      const finalTransferId = await this.accountService.transfer(
        incomingSuspenseId,
        request.targetAccountId,
        request.amount,
        request.currency,
        `SEPA credit from ${request.bankInfo.iban}: ${request.description || 'SEPA payment received'}`,
      );

      logger.info('Incoming SEPA transfer processed successfully', {
        suspenseTransferId: suspenseTransferId.toString(),
        finalTransferId: finalTransferId.toString(),
        sepaTransactionId: request.sepaTransactionId,
        targetAccountId: request.targetAccountId.toString(),
      });

      return {
        transferId: finalTransferId,
        status: 'completed',
        sepaTransactionId: request.sepaTransactionId,
        processingStage: 'external',
      };
    } catch (error) {
      logger.error('Failed to process incoming SEPA transfer', {
        targetAccountId: request.targetAccountId.toString(),
        sepaTransactionId: request.sepaTransactionId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get SEPA suspense account balances for monitoring
   */
  async getSEPASuspenseBalances(currency: 'EUR' | 'NOK' | 'SEK' | 'DKK') {
    try {
      this.validateSEPACurrency(currency);

      const [outgoingId, incomingId, settlementId] = await Promise.all([
        this.sepaSuspenseAccountService.getSEPASuspenseAccountNumericId(
          'OUTGOING_SUSPENSE',
          currency,
        ),
        this.sepaSuspenseAccountService.getSEPASuspenseAccountNumericId(
          'INCOMING_SUSPENSE',
          currency,
        ),
        this.sepaSuspenseAccountService.getSEPASuspenseAccountNumericId('SETTLEMENT', currency),
      ]);

      const [outgoingBalance, incomingBalance, settlementBalance] = await Promise.all([
        this.accountService.getAccountBalance(outgoingId),
        this.accountService.getAccountBalance(incomingId),
        this.accountService.getAccountBalance(settlementId),
      ]);

      return {
        currency,
        outgoingSuspense: {
          accountId: outgoingId.toString(),
          balance: outgoingBalance,
        },
        incomingSuspense: {
          accountId: incomingId.toString(),
          balance: incomingBalance,
        },
        settlement: {
          accountId: settlementId.toString(),
          balance: settlementBalance,
        },
      };
    } catch (error) {
      logger.error('Failed to get SEPA suspense balances', { currency, error });
      throw error;
    }
  }

  /**
   * Validate SEPA transfer request
   */
  private validateSEPATransfer(request: SEPATransferRequest): void {
    this.validateSEPACurrency(request.currency);
    this.validateSEPABankInfo(request.bankInfo);

    if (request.amount <= 0n) {
      throw new Error('Transfer amount must be positive');
    }

    // Validate urgency if provided
    if (request.urgency && !['STANDARD', 'EXPRESS', 'INSTANT'].includes(request.urgency)) {
      throw new Error('Invalid urgency level. Must be STANDARD, EXPRESS, or INSTANT');
    }
  }

  /**
   * Validate SEPA currency
   */
  private validateSEPACurrency(
    currency: Currency,
  ): asserts currency is 'EUR' | 'NOK' | 'SEK' | 'DKK' {
    if (!isSEPACurrency(currency)) {
      throw new Error(
        `Currency ${currency} is not supported for SEPA operations. Supported currencies: EUR, NOK, SEK, DKK`,
      );
    }
  }

  /**
   * Validate SEPA bank information
   */
  private validateSEPABankInfo(bankInfo: SEPABankInfo): void {
    // Validate IBAN format (basic validation)
    if (!bankInfo.iban || bankInfo.iban.trim().length === 0) {
      throw new Error('IBAN is required for SEPA transfers');
    }

    // Basic IBAN format check (should start with 2-letter country code followed by 2 digits)
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(bankInfo.iban.replace(/\s/g, ''))) {
      throw new Error('Invalid IBAN format');
    }

    // Validate BIC if provided (8 or 11 characters)
    if (bankInfo.bic && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bankInfo.bic)) {
      throw new Error('Invalid BIC format');
    }

    // Validate bank name
    if (!bankInfo.bankName || bankInfo.bankName.trim().length === 0) {
      throw new Error('Bank name is required');
    }

    // Validate recipient name
    if (!bankInfo.recipientName || bankInfo.recipientName.trim().length === 0) {
      throw new Error('Recipient name is required');
    }

    // Validate country code (ISO 3166-1 alpha-2)
    if (!bankInfo.country || !/^[A-Z]{2}$/.test(bankInfo.country)) {
      throw new Error('Valid country code is required (ISO 3166-1 alpha-2)');
    }
  }

  /**
   * Generate SEPA transaction ID
   */
  private generateSEPATransactionId(direction: 'IN' | 'OUT', currency: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SEPA_${direction}_${currency}_${timestamp}_${random}`;
  }

  /**
   * Mask IBAN for logging (show first 4 and last 4 characters)
   */
  private maskIBAN(iban: string): string {
    if (iban.length <= 8) return iban;
    const cleaned = iban.replace(/\s/g, '');
    return `${cleaned.substring(0, 4)}****${cleaned.substring(cleaned.length - 4)}`;
  }
}
