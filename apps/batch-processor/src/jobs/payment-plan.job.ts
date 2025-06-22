import { PaymentPlanRepository, logger, PaymentPlan } from '@core-poc/core-services';
import { AccountService, PaymentProcessingService, Money, AccountId } from '@core-poc/domain';

export class PaymentPlanJob {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(
    private paymentPlanRepository: PaymentPlanRepository,
    private accountService: AccountService,
    private paymentProcessingService: PaymentProcessingService
  ) {}

  /**
   * Process scheduled payments for all payment plans that are due
   * This creates invoices and TigerBeetle transactions automatically
   */
  async processMonthlyPayments(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Payment processing already running, skipping this cycle');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('Starting scheduled payment processing');

      // Use the payment processing service to handle all the logic
      const results = await this.paymentProcessingService.processScheduledPayments();
      
      const successful = results.filter(r => r.paymentProcessed).length;
      const failed = results.filter(r => !r.paymentProcessed).length;

      logger.info('Scheduled payment processing completed', {
        total: results.length,
        successful,
        failed,
        transfers: results.filter(r => r.transferId).map(r => r.transferId?.toString()),
      });

      // Log individual failures for debugging
      const failures = results.filter(r => r.error);
      if (failures.length > 0) {
        logger.warn('Some payments failed to process', {
          failures: failures.map(f => ({ error: f.error })),
        });
      }

    } catch (error) {
      logger.error('Failed to process scheduled payments', { error });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the monthly payment job
   * In production, this would be handled by a proper job scheduler
   */
  startMonthlyJob(): void {
    if (this.intervalId) {
      logger.warn('Monthly job already started');
      return;
    }

    logger.info('Starting monthly payment job');
    
    // For development/testing, run every 30 seconds instead of 30 days
    const interval = process.env.NODE_ENV === 'production' 
      ? 30 * 24 * 60 * 60 * 1000  // 30 days
      : 30 * 1000;                 // 30 seconds for testing

    this.intervalId = setInterval(() => {
      this.processMonthlyPayments().catch(error => {
        logger.error('Unhandled error in monthly payment processing', { error });
      });
    }, interval);

    logger.info('Monthly payment job started', { 
      intervalMs: interval,
      environment: process.env.NODE_ENV || 'development',
    });
  }

  /**
   * Stop the monthly payment job
   */
  stopMonthlyJob(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Monthly payment job stopped');
    }
  }

  /**
   * Process a single payment manually (for testing or immediate processing)
   */
  async processPaymentForAccount(accountId: AccountId): Promise<boolean> {
    try {
      const plan = await this.paymentPlanRepository.findByAccountId(accountId);
      
      if (!plan) {
        logger.warn('No payment plan found for account', {
          accountId: accountId.toString(),
        });
        return false;
      }

      if (plan.remainingPayments <= 0) {
        logger.warn('Payment plan already completed', {
          accountId: accountId.toString(),
        });
        return false;
      }

      logger.info('Processing single payment', {
        accountId: accountId.toString(),
        monthlyPayment: plan.monthlyPayment.toString(),
      });

      const newRemainingPayments = plan.remainingPayments - 1;
      await this.paymentPlanRepository.updateRemainingPayments(accountId, newRemainingPayments);

      logger.info('Single payment processed successfully', {
        accountId: accountId.toString(),
        remainingPayments: newRemainingPayments,
      });

      return true;
    } catch (error) {
      logger.error('Failed to process single payment', {
        accountId: accountId.toString(),
        error,
      });
      return false;
    }
  }

  /**
   * Get payment plan for an account
   */
  async getPaymentPlan(accountId: AccountId): Promise<PaymentPlan | null> {
    try {
      return await this.paymentPlanRepository.findByAccountId(accountId);
    } catch (error) {
      logger.error('Failed to get payment plan', {
        accountId: accountId.toString(),
        error,
      });
      throw error;
    }
  }
}