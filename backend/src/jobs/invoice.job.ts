import { InvoiceService } from '../domain/services/invoice.service.js';
import { logger } from '../utils/logger.js';

export class InvoiceJob {
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(private invoiceService: InvoiceService) {}

  /**
   * Process overdue invoices
   */
  async processOverdueInvoices(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Overdue invoice processing already running, skipping this cycle');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('Starting overdue invoice processing');

      const overdueInvoices = await this.invoiceService.processOverdueInvoices();

      if (overdueInvoices.length > 0) {
        logger.info('Overdue invoices processed', {
          count: overdueInvoices.length,
          invoiceIds: overdueInvoices.map(i => i.id),
        });

        // TODO: In a real system, this would:
        // 1. Send overdue notifications to customers
        // 2. Apply late fees if configured
        // 3. Trigger collection processes
        // 4. Generate reports for management
      } else {
        logger.info('No overdue invoices to process');
      }
    } catch (error) {
      logger.error('Failed to process overdue invoices', { error });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the overdue invoice processing job
   */
  startOverdueJob(): void {
    if (this.intervalId) {
      logger.warn('Overdue job already started');
      return;
    }

    logger.info('Starting overdue invoice job');
    
    // For development/testing, run every 60 seconds instead of 24 hours
    const interval = process.env.NODE_ENV === 'production' 
      ? 24 * 60 * 60 * 1000  // 24 hours
      : 60 * 1000;           // 60 seconds for testing

    this.intervalId = setInterval(() => {
      this.processOverdueInvoices().catch(error => {
        logger.error('Unhandled error in overdue invoice processing', { error });
      });
    }, interval);

    logger.info('Overdue invoice job started', { 
      intervalMs: interval,
      environment: process.env.NODE_ENV || 'development',
    });
  }

  /**
   * Stop the overdue invoice processing job
   */
  stopOverdueJob(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Overdue invoice job stopped');
    }
  }

  // Delegate methods to the service for backward compatibility
  async createInvoice(accountId: bigint, amount: bigint, dueDate: Date) {
    return this.invoiceService.createInvoice({
      accountId: { value: accountId } as any,
      amount: { amount, currency: 'USD' } as any,
      dueDate,
    });
  }

  async markInvoicePaid(invoiceId: string): Promise<boolean> {
    return this.invoiceService.markInvoicePaid(invoiceId);
  }

  async getInvoice(invoiceId: string) {
    return this.invoiceService.getInvoice(invoiceId);
  }

  async getInvoicesByAccount(accountId: bigint) {
    return this.invoiceService.getInvoicesByAccount({ value: accountId } as any);
  }

  async getAllInvoices() {
    return this.invoiceService.getAllInvoices();
  }
}