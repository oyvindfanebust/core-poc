import { PaymentPlanRepository, logger, Money, AccountId, CustomerId, PaymentPlan } from '@core-poc/core-services';
import { AccountService } from './account.service.js';

export interface PaymentProcessingResult {
  paymentProcessed: boolean;
  transferId?: bigint;
  error?: string;
}

export class PaymentProcessingService {
  constructor(
    private paymentPlanRepository: PaymentPlanRepository,
    private accountService: AccountService
  ) {}

  /**
   * Process all payment plans that are due for payment
   */
  async processScheduledPayments(processDate: Date = new Date()): Promise<PaymentProcessingResult[]> {
    try {
      logger.info('Starting scheduled payment processing', {
        processDate: processDate.toISOString(),
      });

      const paymentsDue = await this.paymentPlanRepository.findPaymentsDue(processDate);
      
      if (paymentsDue.length === 0) {
        logger.info('No payments due for processing');
        return [];
      }

      logger.info('Found payments due for processing', {
        count: paymentsDue.length,
        accountIds: paymentsDue.map(p => p.accountId.toString()),
      });

      const results: PaymentProcessingResult[] = [];

      for (const paymentPlan of paymentsDue) {
        const result = await this.processPaymentPlan(paymentPlan, processDate);
        results.push(result);
      }

      const successful = results.filter(r => r.paymentProcessed).length;
      const failed = results.filter(r => !r.paymentProcessed).length;

      logger.info('Scheduled payment processing completed', {
        total: results.length,
        successful,
        failed,
      });

      return results;
    } catch (error) {
      logger.error('Failed to process scheduled payments', { error });
      throw error;
    }
  }

  /**
   * Process a single payment plan
   */
  async processPaymentPlan(paymentPlan: PaymentPlan, processDate: Date = new Date()): Promise<PaymentProcessingResult> {
    const result: PaymentProcessingResult = {
      paymentProcessed: false,
    };

    try {
      logger.info('Processing payment plan', {
        accountId: paymentPlan.accountId.toString(),
        customerId: paymentPlan.customerId,
        amount: paymentPlan.monthlyPayment.toString(),
        remainingPayments: paymentPlan.remainingPayments,
      });

      // Step 1: Find customer's deposit account
      const customerDepositAccount = await this.findCustomerDepositAccount(paymentPlan.customerId);
      
      if (!customerDepositAccount) {
        result.error = `No deposit account found for customer ${paymentPlan.customerId}`;
        logger.error('No deposit account found for customer', {
          customerId: paymentPlan.customerId,
          accountId: paymentPlan.accountId.toString(),
        });
        return result;
      }

      // Step 2: Process the payment transaction
      const transferId = await this.processPaymentTransaction(
        customerDepositAccount,
        new AccountId(paymentPlan.accountId),
        new Money(paymentPlan.monthlyPayment, 'USD') // TODO: Get currency from payment plan
      );

      result.paymentProcessed = true;
      result.transferId = transferId;

      logger.info('Payment transaction processed', {
        transferId: transferId.toString(),
        fromAccount: customerDepositAccount.toString(),
        toAccount: paymentPlan.accountId.toString(),
        amount: paymentPlan.monthlyPayment.toString(),
      });

      // Step 3: Update payment plan for next payment
      await this.updatePaymentPlanAfterPayment(paymentPlan);

      logger.info('Payment plan processing completed successfully', {
        accountId: paymentPlan.accountId.toString(),
        transferId: result.transferId?.toString(),
      });

      return result;
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error);
      logger.error('Failed to process payment plan', {
        accountId: paymentPlan.accountId.toString(),
        error,
      });
      return result;
    }
  }


  /**
   * Find the customer's primary deposit account for payments
   */
  private async findCustomerDepositAccount(customerId: string): Promise<AccountId | null> {
    try {
      // In a real system, this would query the database for customer accounts
      // For now, we'll use a simple approach of looking for deposit accounts
      // that might belong to this customer based on account creation patterns
      
      // TODO: This is a simplified implementation
      // In reality, you'd have a customer-account mapping table
      logger.info('Looking for deposit account for customer', { customerId });
      
      // For now, return null to indicate we need a proper customer-account mapping
      // This will be implemented when we have customer account management
      return null;
    } catch (error) {
      logger.error('Failed to find customer deposit account', {
        customerId,
        error,
      });
      return null;
    }
  }

  /**
   * Process the actual payment transaction in TigerBeetle
   */
  private async processPaymentTransaction(
    fromAccountId: AccountId,
    toAccountId: AccountId,
    amount: Money
  ): Promise<bigint> {
    try {
      const transferId = await this.accountService.transfer(
        fromAccountId.value,
        toAccountId.value,
        amount.amount,
        amount.currency
      );

      logger.info('Payment transfer created in TigerBeetle', {
        transferId: transferId.toString(),
        fromAccount: fromAccountId.toString(),
        toAccount: toAccountId.toString(),
        amount: amount.toString(),
      });

      return transferId;
    } catch (error) {
      logger.error('Failed to create payment transfer', {
        fromAccount: fromAccountId.toString(),
        toAccount: toAccountId.toString(),
        amount: amount.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Update payment plan after successful payment
   */
  private async updatePaymentPlanAfterPayment(paymentPlan: PaymentPlan): Promise<void> {
    try {
      // Decrement remaining payments
      const newRemainingPayments = paymentPlan.remainingPayments - 1;
      
      await this.paymentPlanRepository.updateRemainingPayments(
        new AccountId(paymentPlan.accountId),
        newRemainingPayments
      );

      // Calculate next payment date based on payment frequency
      if (newRemainingPayments > 0) {
        const nextPaymentDate = this.calculateNextPaymentDate(
          paymentPlan.nextPaymentDate,
          paymentPlan.paymentFrequency
        );

        await this.paymentPlanRepository.updateNextPaymentDate(
          new AccountId(paymentPlan.accountId),
          nextPaymentDate
        );

        logger.info('Next payment date updated', {
          accountId: paymentPlan.accountId.toString(),
          nextPaymentDate: nextPaymentDate.toISOString(),
          remainingPayments: newRemainingPayments,
        });
      } else {
        logger.info('Payment plan completed', {
          accountId: paymentPlan.accountId.toString(),
        });
      }
    } catch (error) {
      logger.error('Failed to update payment plan after payment', {
        accountId: paymentPlan.accountId.toString(),
        error,
      });
      throw error;
    }
  }

  /**
   * Calculate the next payment date based on payment frequency
   */
  private calculateNextPaymentDate(currentDate: Date, frequency: string): Date {
    const nextDate = new Date(currentDate);

    switch (frequency) {
      case 'WEEKLY':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'BI_WEEKLY':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'MONTHLY':
      default:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }

    return nextDate;
  }

}