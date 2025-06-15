import { InvoiceRepository } from '../../repositories/invoice.repository.js';
import { Money, AccountId } from '../value-objects.js';
import { Invoice } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateInvoiceParams {
  accountId: AccountId;
  amount: Money;
  dueDate: Date;
}

export class InvoiceService {
  constructor(private invoiceRepository: InvoiceRepository) {}

  async createInvoice(params: CreateInvoiceParams): Promise<Invoice> {
    try {
      logger.info('Creating invoice', {
        accountId: params.accountId.toString(),
        amount: params.amount.toString(),
        currency: params.amount.currency,
        dueDate: params.dueDate.toISOString(),
      });

      const invoice: Invoice = {
        id: uuidv4(),
        accountId: params.accountId.value,
        amount: params.amount.amount,
        dueDate: params.dueDate,
        status: 'pending',
      };

      await this.invoiceRepository.save(invoice);

      logger.info('Invoice created successfully', {
        invoiceId: invoice.id,
        accountId: params.accountId.toString(),
      });

      return invoice;
    } catch (error) {
      logger.error('Failed to create invoice', {
        accountId: params.accountId.toString(),
        error,
      });
      throw error;
    }
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      return await this.invoiceRepository.findById(invoiceId);
    } catch (error) {
      logger.error('Failed to get invoice', { invoiceId, error });
      throw error;
    }
  }

  async getInvoicesByAccount(accountId: AccountId): Promise<Invoice[]> {
    try {
      return await this.invoiceRepository.findByAccountId(accountId);
    } catch (error) {
      logger.error('Failed to get invoices by account', {
        accountId: accountId.toString(),
        error,
      });
      throw error;
    }
  }

  async markInvoicePaid(invoiceId: string): Promise<boolean> {
    try {
      logger.info('Marking invoice as paid', { invoiceId });
      
      const success = await this.invoiceRepository.updateStatus(invoiceId, 'paid');
      
      if (success) {
        logger.info('Invoice marked as paid successfully', { invoiceId });
      } else {
        logger.warn('Invoice not found or already updated', { invoiceId });
      }
      
      return success;
    } catch (error) {
      logger.error('Failed to mark invoice as paid', { invoiceId, error });
      throw error;
    }
  }

  async processOverdueInvoices(): Promise<Invoice[]> {
    try {
      logger.info('Processing overdue invoices');
      
      const overdueInvoices = await this.invoiceRepository.findOverdueInvoices();
      
      if (overdueInvoices.length === 0) {
        logger.info('No overdue invoices found');
        return [];
      }

      // Mark all overdue invoices
      const updatedInvoices: Invoice[] = [];
      for (const invoice of overdueInvoices) {
        const updated = await this.invoiceRepository.updateStatus(invoice.id, 'overdue');
        if (updated) {
          logger.info('Invoice marked as overdue', {
            invoiceId: invoice.id,
            accountId: invoice.accountId.toString(),
            amount: invoice.amount.toString(),
            dueDate: invoice.dueDate.toISOString(),
          });
          
          updatedInvoices.push({
            ...invoice,
            status: 'overdue',
          });
        }
      }

      logger.info('Overdue invoice processing completed', {
        totalProcessed: updatedInvoices.length,
      });

      return updatedInvoices;
    } catch (error) {
      logger.error('Failed to process overdue invoices', { error });
      throw error;
    }
  }

  async getAllInvoices(): Promise<Invoice[]> {
    try {
      return await this.invoiceRepository.findAll();
    } catch (error) {
      logger.error('Failed to get all invoices', { error });
      throw error;
    }
  }
}