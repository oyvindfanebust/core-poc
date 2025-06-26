import { logger, SEPASuspenseAccountService, TigerBeetleService } from '@core-poc/core-services';
import { AccountService } from '@core-poc/domain';
import { Request, Response } from 'express';

import { SEPATransferRequest } from '../validation/schemas.js';

export interface SEPATransferResponse {
  transferId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  sepaTransactionId?: string;
  estimatedSettlement?: string;
  errorDetails?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Controller for SEPA (Single Euro Payments Area) operations
 * Handles outgoing SEPA transfers, status checks, and suspense account monitoring
 */
export class SEPAController {
  constructor(
    private accountService: AccountService,
    private sepaAccountService: SEPASuspenseAccountService,
    private tigerBeetleService: TigerBeetleService,
  ) {}

  /**
   * Create an outgoing SEPA transfer
   * POST /sepa/transfers/outgoing
   */
  async createOutgoingTransfer(req: Request, res: Response): Promise<void> {
    try {
      const transferRequest = req.body as SEPATransferRequest;

      logger.info('Creating SEPA outgoing transfer', {
        accountId: transferRequest.accountId,
        amount: transferRequest.amount,
        currency: transferRequest.currency,
        iban: transferRequest.bankInfo.iban,
        urgency: transferRequest.urgency || 'STANDARD',
      });

      // Validate the account exists and has sufficient balance
      const accountBalance = await this.tigerBeetleService.getAccountBalance(
        BigInt(transferRequest.accountId),
      );

      const transferAmount = BigInt(transferRequest.amount);
      if (accountBalance.balance < transferAmount) {
        res.status(400).json({
          error: {
            code: 'INSUFFICIENT_FUNDS',
            message: 'Account has insufficient funds for this transfer',
            retryable: false,
          },
        });
        return;
      }

      // Get the appropriate SEPA outgoing suspense account for this currency
      const sepaAccount = await this.sepaAccountService.getSEPAAccount(
        'OUTGOING_SUSPENSE',
        transferRequest.currency,
      );

      // Step 1: Move funds from customer account to SEPA outgoing suspense
      const suspenseTransferId = await this.tigerBeetleService.createTransfer({
        fromAccountId: BigInt(transferRequest.accountId),
        toAccountId: sepaAccount.numericId,
        amount: transferAmount,
        currency: transferRequest.currency,
        transferType: 1, // SEPA_OUTGOING transfer type
      });

      // Generate a SEPA transaction ID (in real implementation, this would come from SEPA network)
      const sepaTransactionId = `SEPA-OUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // For now, we'll simulate the SEPA processing
      // In a real implementation, this would:
      // 1. Send the payment instruction to the SEPA network
      // 2. Wait for acknowledgment
      // 3. Handle settlement notifications

      const response: SEPATransferResponse = {
        transferId: suspenseTransferId.toString(),
        status: 'ACCEPTED',
        sepaTransactionId,
        estimatedSettlement: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next business day
      };

      logger.info('SEPA outgoing transfer created successfully', {
        transferId: suspenseTransferId.toString(),
        sepaTransactionId,
        accountId: transferRequest.accountId,
        amount: transferRequest.amount,
        currency: transferRequest.currency,
      });

      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to create SEPA outgoing transfer', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req.body,
      });

      if (error instanceof Error && error.message.includes('Account not found')) {
        res.status(404).json({
          error: {
            code: 'ACCOUNT_NOT_FOUND',
            message: 'Source account not found',
            retryable: false,
          },
        });
        return;
      }

      res.status(500).json({
        error: {
          code: 'SEPA_TRANSFER_FAILED',
          message: 'Failed to process SEPA transfer',
          retryable: true,
        },
      });
    }
  }

  /**
   * Get SEPA service status and information
   * GET /sepa/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('Getting SEPA service status');

      // Validate that all SEPA suspense accounts are available
      const validation = await this.sepaAccountService.validateSEPAAccounts();

      const response = {
        status: validation.valid ? 'OPERATIONAL' : 'DEGRADED',
        version: '1.0.0',
        supportedCurrencies: ['EUR', 'NOK', 'SEK', 'DKK'],
        suspenseAccounts: {
          configured: validation.configured.length,
          missing: validation.missing.length,
          total: 12, // 3 types × 4 currencies
        },
        capabilities: {
          outgoingTransfers: true,
          incomingTransfers: false, // Not implemented yet
          instantPayments: false, // Not implemented yet
          bulkPayments: false, // Not implemented yet
        },
        lastChecked: new Date().toISOString(),
      };

      if (!validation.valid) {
        logger.warn('SEPA service status is degraded', {
          missing: validation.missing,
          configured: validation.configured,
        });
      }

      res.json(response);
    } catch (error) {
      logger.error('Failed to get SEPA status', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        status: 'ERROR',
        error: 'Failed to retrieve SEPA service status',
      });
    }
  }

  /**
   * Get SEPA suspense account balances for a specific currency
   * GET /sepa/suspense/:currency
   */
  async getSuspenseBalances(req: Request, res: Response): Promise<void> {
    try {
      const { currency } = req.params;

      // Validate currency
      if (!['EUR', 'NOK', 'SEK', 'DKK'].includes(currency.toUpperCase())) {
        res.status(400).json({
          error: {
            code: 'INVALID_CURRENCY',
            message: 'Currency must be one of: EUR, NOK, SEK, DKK',
          },
        });
        return;
      }

      const curr = currency.toUpperCase() as 'EUR' | 'NOK' | 'SEK' | 'DKK';

      logger.debug('Getting SEPA suspense balances', { currency: curr });

      // Get all three suspense accounts for this currency
      const outgoingAccount = await this.sepaAccountService.getSEPAAccount(
        'OUTGOING_SUSPENSE',
        curr,
      );
      const incomingAccount = await this.sepaAccountService.getSEPAAccount(
        'INCOMING_SUSPENSE',
        curr,
      );
      const settlementAccount = await this.sepaAccountService.getSEPAAccount('SETTLEMENT', curr);

      // Get balances from TigerBeetle
      const [outgoingBalance, incomingBalance, settlementBalance] = await Promise.all([
        this.tigerBeetleService.getAccountBalance(outgoingAccount.numericId),
        this.tigerBeetleService.getAccountBalance(incomingAccount.numericId),
        this.tigerBeetleService.getAccountBalance(settlementAccount.numericId),
      ]);

      const response = {
        currency: curr,
        outgoing: {
          debits: outgoingBalance.debits.toString(),
          credits: outgoingBalance.credits.toString(),
          balance: outgoingBalance.balance.toString(),
        },
        incoming: {
          debits: incomingBalance.debits.toString(),
          credits: incomingBalance.credits.toString(),
          balance: incomingBalance.balance.toString(),
        },
        settlement: {
          debits: settlementBalance.debits.toString(),
          credits: settlementBalance.credits.toString(),
          balance: settlementBalance.balance.toString(),
        },
        lastUpdated: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get SEPA suspense balances', {
        currency: req.params.currency,
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'BALANCE_RETRIEVAL_FAILED',
          message: 'Failed to retrieve suspense account balances',
        },
      });
    }
  }
}
