import { logger, AccountId, Money } from '@core-poc/core-services';
import { LoanService } from '@core-poc/domain';
import { Request, Response } from 'express';

import { LoanDisbursementRequest } from '../validation/schemas.js';

export interface LoanDisbursementResponse {
  transferId: string;
  status: 'SUCCESS' | 'FAILED';
  disbursedAmount: string;
  targetAccountId: string;
  loanAccountId: string;
  timestamp: string;
  errorDetails?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Controller for loan funding and disbursement operations
 */
export class LoanFundingController {
  constructor(private loanService: LoanService) {}

  /**
   * Disburse loan funds to a customer deposit account
   * POST /api/v1/loans/:loanId/disburse
   */
  async disburseLoan(req: Request, res: Response): Promise<void> {
    try {
      const { loanId } = req.params;
      const disbursementRequest = req.body as LoanDisbursementRequest;

      logger.info('Processing loan disbursement request', {
        loanId,
        targetAccountId: disbursementRequest.targetAccountId,
        amount: disbursementRequest.amount,
        description: disbursementRequest.description,
      });

      const loanAccountId = new AccountId(BigInt(loanId));
      const targetAccountId = new AccountId(BigInt(disbursementRequest.targetAccountId));

      // Parse amount if provided
      let amount: Money | undefined;
      if (disbursementRequest.amount) {
        // Amount is expected to be in cents (smallest currency unit)
        // For simplicity, we'll use EUR as default currency
        // In a real implementation, we'd get this from the loan account metadata
        amount = new Money(BigInt(disbursementRequest.amount), 'EUR');
      }

      // Perform disbursement
      const result = await this.loanService.disburseLoan(
        loanAccountId,
        targetAccountId,
        amount,
        disbursementRequest.description,
      );

      const response: LoanDisbursementResponse = {
        transferId: result.transferId,
        status: 'SUCCESS',
        disbursedAmount: result.disbursedAmount.amount.toString(),
        targetAccountId: result.targetAccountId.toString(),
        loanAccountId: result.loanAccountId.toString(),
        timestamp: result.timestamp.toISOString(),
      };

      logger.info('Loan disbursement completed successfully', {
        transferId: result.transferId,
        disbursedAmount: result.disbursedAmount.toString(),
        loanId,
        targetAccountId: disbursementRequest.targetAccountId,
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('Failed to disburse loan', {
        loanId: req.params.loanId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        requestBody: req.body,
      });

      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            status: 'FAILED',
            errorDetails: {
              code: 'LOAN_NOT_FOUND',
              message: 'Loan account not found',
              retryable: false,
            },
          });
          return;
        }

        if (error.message.includes('Insufficient')) {
          res.status(400).json({
            status: 'FAILED',
            errorDetails: {
              code: 'INSUFFICIENT_FUNDS',
              message: error.message,
              retryable: false,
            },
          });
          return;
        }
      }

      res.status(500).json({
        status: 'FAILED',
        errorDetails: {
          code: 'DISBURSEMENT_FAILED',
          message: 'Failed to process loan disbursement',
          retryable: true,
        },
      });
    }
  }

  /**
   * Get loan disbursement status and available funding
   * GET /api/v1/loans/:loanId/funding-status
   */
  async getFundingStatus(req: Request, res: Response): Promise<void> {
    try {
      const { loanId } = req.params;

      logger.debug('Getting loan funding status', { loanId });

      const loanAccountId = new AccountId(BigInt(loanId));

      // Get payment plan to verify loan exists
      const paymentPlan = await this.loanService.getPaymentPlan(loanAccountId);
      if (!paymentPlan) {
        res.status(404).json({
          error: {
            code: 'LOAN_NOT_FOUND',
            message: 'Loan account not found',
          },
        });
        return;
      }

      // Get current loan account balance (available for disbursement)
      // Note: This is simplified - in reality we'd use the account service
      const response = {
        loanId,
        totalLoanAmount: paymentPlan.totalLoanAmount.toString(),
        principalAmount: paymentPlan.principalAmount.toString(),
        monthlyPayment: paymentPlan.monthlyPayment.toString(),
        remainingPayments: paymentPlan.remainingPayments,
        loanType: paymentPlan.loanType,
        paymentFrequency: paymentPlan.paymentFrequency,
        interestRate: paymentPlan.interestRate,
        nextPaymentDate: paymentPlan.nextPaymentDate.toISOString(),
        status: 'ACTIVE', // Simplified status
        lastChecked: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      logger.error('Failed to get loan funding status', {
        loanId: req.params.loanId,
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: {
          code: 'STATUS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve loan funding status',
        },
      });
    }
  }
}
