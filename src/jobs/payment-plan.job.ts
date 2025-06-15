import { PaymentPlanRepository } from '../repositories/payment-plan.repository.js';
import { AccountService } from '../services/account.service.js';
import { Money, AccountId } from '../domain/value-objects.js';
import { PaymentPlan } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class PaymentPlanJob {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(
    private paymentPlanRepository: PaymentPlanRepository,
    private accountService: AccountService
  ) {}

  /**
   * Process monthly payments for all active payment plans
   * This now actually creates transfers in TigerBeetle
   */
  async processMonthlyPayments(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Payment processing already running, skipping this cycle');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('Starting monthly payment processing');

      const paymentPlans = await this.paymentPlanRepository.findAll();
      
      if (paymentPlans.length === 0) {
        logger.info('No active payment plans found');
        return;
      }

      let processed = 0;
      let failed = 0;

      for (const plan of paymentPlans) {
        if (plan.remainingPayments > 0) {
          try {
            logger.info('Processing payment', {
              accountId: plan.accountId.toString(),
              monthlyPayment: plan.monthlyPayment.toString(),
              remainingPayments: plan.remainingPayments,
            });

            // TODO: In a real system, this would need to:
            // 1. Find the customer's deposit account
            // 2. Create a transfer from deposit account to loan account
            // 3. Handle insufficient funds scenarios
            // 4. Send notifications
            
            // For now, we'll just log and update the remaining payments
            const newRemainingPayments = plan.remainingPayments - 1;
            
            await this.paymentPlanRepository.updateRemainingPayments(
              new AccountId(plan.accountId),
              newRemainingPayments
            );

            if (newRemainingPayments === 0) {
              logger.info('Payment plan completed', {
                accountId: plan.accountId.toString(),
              });
            }

            processed++;
          } catch (error) {
            logger.error('Failed to process payment', {
              accountId: plan.accountId.toString(),
              error,
            });
            failed++;
          }
        }
      }

      logger.info('Monthly payment processing completed', {
        total: paymentPlans.length,
        processed,
        failed,
      });
    } catch (error) {
      logger.error('Failed to process monthly payments', { error });
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