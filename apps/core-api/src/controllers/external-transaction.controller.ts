import { logger } from '@core-poc/core-services';
import { Request, Response } from 'express';

import { ACHCreditRequest, WireCreditRequest, TransactionIdParam } from '../validation/schemas.js';

export interface ExternalTransactionResponse {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  amount: string;
  currency: string;
  targetAccountId: string;
  timestamp: string;
  estimatedSettlement?: string;
  errorDetails?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface TransactionStatusResponse {
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  type: 'ACH_CREDIT' | 'WIRE_CREDIT';
  amount: string;
  currency: string;
  targetAccountId: string;
  originatingBank: string;
  reference: string;
  timestamp: string;
  settlementDate?: string;
  errorDetails?: {
    code: string;
    message: string;
  };
}

/**
 * Controller for external transaction processing (ACH and Wire transfers)
 */
export class ExternalTransactionController {
  // For now, we'll use an in-memory store for transaction status
  // In production, this would be stored in a database
  private transactionStore = new Map<string, TransactionStatusResponse>();

  /**
   * Process incoming ACH credit transaction
   * POST /api/v1/external-transactions/ach-credit
   */
  async processACHCredit(req: Request, res: Response): Promise<void> {
    try {
      const achRequest = req.body as ACHCreditRequest;

      logger.info('Processing ACH credit transaction', {
        targetAccountId: achRequest.targetAccountId,
        amount: achRequest.amount,
        routingNumber: achRequest.routingNumber,
        originatingBank: achRequest.originatingBankName,
        reference: achRequest.reference,
        urgency: achRequest.urgency,
      });

      // Generate unique transaction ID
      const transactionId = `ACH-${achRequest.urgency}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`;

      // Note: Account validation skipped for MVP - would integrate with account service

      // Calculate settlement time based on urgency
      let estimatedSettlement: Date;
      switch (achRequest.urgency) {
        case 'STANDARD':
          estimatedSettlement = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 business days
          break;
        case 'SAME_DAY':
          estimatedSettlement = new Date(Date.now() + 6 * 60 * 60 * 1000); // 6 hours
          break;
        case 'EXPRESS':
          estimatedSettlement = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
          break;
        default:
          estimatedSettlement = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      }

      // Simulate processing success/failure (90% success rate for testing)
      const isSuccess = Math.random() > 0.1;

      if (!isSuccess) {
        const errorResponse: ExternalTransactionResponse = {
          transactionId,
          status: 'FAILED',
          amount: achRequest.amount,
          currency: achRequest.currency,
          targetAccountId: achRequest.targetAccountId,
          timestamp: new Date().toISOString(),
          errorDetails: {
            code: 'ACH_PROCESSING_FAILED',
            message: 'ACH network processing error. Please retry.',
            retryable: true,
          },
        };

        // Store transaction status
        this.transactionStore.set(transactionId, {
          transactionId,
          status: 'FAILED',
          type: 'ACH_CREDIT',
          amount: achRequest.amount,
          currency: achRequest.currency,
          targetAccountId: achRequest.targetAccountId,
          originatingBank: achRequest.originatingBankName,
          reference: achRequest.reference,
          timestamp: new Date().toISOString(),
          errorDetails: {
            code: 'ACH_PROCESSING_FAILED',
            message: 'ACH network processing error',
          },
        });

        logger.warn('ACH credit transaction failed', {
          transactionId,
          targetAccountId: achRequest.targetAccountId,
          error: 'ACH network processing error',
        });

        res.status(400).json(errorResponse);
        return;
      }

      // TODO: Integrate with actual account service to credit the account
      // For now, we'll simulate successful processing

      const response: ExternalTransactionResponse = {
        transactionId,
        status: 'SUCCESS',
        amount: achRequest.amount,
        currency: achRequest.currency,
        targetAccountId: achRequest.targetAccountId,
        timestamp: new Date().toISOString(),
        estimatedSettlement: estimatedSettlement.toISOString(),
      };

      // Store transaction status
      this.transactionStore.set(transactionId, {
        transactionId,
        status: 'SUCCESS',
        type: 'ACH_CREDIT',
        amount: achRequest.amount,
        currency: achRequest.currency,
        targetAccountId: achRequest.targetAccountId,
        originatingBank: achRequest.originatingBankName,
        reference: achRequest.reference,
        timestamp: new Date().toISOString(),
        settlementDate: estimatedSettlement.toISOString(),
      });

      logger.info('ACH credit transaction processed successfully', {
        transactionId,
        targetAccountId: achRequest.targetAccountId,
        amount: achRequest.amount,
        settlementDate: estimatedSettlement.toISOString(),
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to process ACH credit transaction', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req.body,
      });

      res.status(500).json({
        status: 'FAILED',
        errorDetails: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process ACH credit transaction',
          retryable: true,
        },
      });
    }
  }

  /**
   * Process incoming Wire credit transaction
   * POST /api/v1/external-transactions/wire-credit
   */
  async processWireCredit(req: Request, res: Response): Promise<void> {
    try {
      const wireRequest = req.body as WireCreditRequest;

      logger.info('Processing Wire credit transaction', {
        targetAccountId: wireRequest.targetAccountId,
        amount: wireRequest.amount,
        currency: wireRequest.currency,
        swiftCode: wireRequest.swiftCode,
        originatingBank: wireRequest.originatingBankName,
        reference: wireRequest.reference,
        urgency: wireRequest.urgency,
      });

      // Generate unique transaction ID
      const transactionId = `WIRE-${wireRequest.urgency}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`;

      // Note: Account validation skipped for MVP - would integrate with account service

      // Calculate settlement time based on urgency
      let estimatedSettlement: Date;
      switch (wireRequest.urgency) {
        case 'STANDARD':
          estimatedSettlement = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 business day
          break;
        case 'EXPRESS':
          estimatedSettlement = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours
          break;
        case 'PRIORITY':
          estimatedSettlement = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
          break;
        default:
          estimatedSettlement = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
      }

      // Simulate processing success/failure (95% success rate for wire transfers)
      const isSuccess = Math.random() > 0.05;

      if (!isSuccess) {
        const errorResponse: ExternalTransactionResponse = {
          transactionId,
          status: 'FAILED',
          amount: wireRequest.amount,
          currency: wireRequest.currency,
          targetAccountId: wireRequest.targetAccountId,
          timestamp: new Date().toISOString(),
          errorDetails: {
            code: 'WIRE_PROCESSING_FAILED',
            message: 'SWIFT network processing error. Please retry.',
            retryable: true,
          },
        };

        // Store transaction status
        this.transactionStore.set(transactionId, {
          transactionId,
          status: 'FAILED',
          type: 'WIRE_CREDIT',
          amount: wireRequest.amount,
          currency: wireRequest.currency,
          targetAccountId: wireRequest.targetAccountId,
          originatingBank: wireRequest.originatingBankName,
          reference: wireRequest.reference,
          timestamp: new Date().toISOString(),
          errorDetails: {
            code: 'WIRE_PROCESSING_FAILED',
            message: 'SWIFT network processing error',
          },
        });

        logger.warn('Wire credit transaction failed', {
          transactionId,
          targetAccountId: wireRequest.targetAccountId,
          error: 'SWIFT network processing error',
        });

        res.status(400).json(errorResponse);
        return;
      }

      // TODO: Integrate with actual account service to credit the account
      // For now, we'll simulate successful processing

      const response: ExternalTransactionResponse = {
        transactionId,
        status: 'SUCCESS',
        amount: wireRequest.amount,
        currency: wireRequest.currency,
        targetAccountId: wireRequest.targetAccountId,
        timestamp: new Date().toISOString(),
        estimatedSettlement: estimatedSettlement.toISOString(),
      };

      // Store transaction status
      this.transactionStore.set(transactionId, {
        transactionId,
        status: 'SUCCESS',
        type: 'WIRE_CREDIT',
        amount: wireRequest.amount,
        currency: wireRequest.currency,
        targetAccountId: wireRequest.targetAccountId,
        originatingBank: wireRequest.originatingBankName,
        reference: wireRequest.reference,
        timestamp: new Date().toISOString(),
        settlementDate: estimatedSettlement.toISOString(),
      });

      logger.info('Wire credit transaction processed successfully', {
        transactionId,
        targetAccountId: wireRequest.targetAccountId,
        amount: wireRequest.amount,
        currency: wireRequest.currency,
        settlementDate: estimatedSettlement.toISOString(),
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to process Wire credit transaction', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req.body,
      });

      res.status(500).json({
        status: 'FAILED',
        errorDetails: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process Wire credit transaction',
          retryable: true,
        },
      });
    }
  }

  /**
   * Get transaction status
   * GET /api/v1/external-transactions/status/:transactionId
   */
  async getTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params as TransactionIdParam;

      logger.debug('Getting transaction status', { transactionId });

      const transaction = this.transactionStore.get(transactionId);

      if (!transaction) {
        res.status(404).json({
          error: {
            code: 'TRANSACTION_NOT_FOUND',
            message: 'Transaction not found',
          },
        });
        return;
      }

      res.json(transaction);
    } catch (error) {
      logger.error('Failed to get transaction status', {
        transactionId: req.params.transactionId,
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'STATUS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve transaction status',
        },
      });
    }
  }
}
