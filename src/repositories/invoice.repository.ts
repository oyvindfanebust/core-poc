import { DatabaseConnection } from '../database/connection.js';
import { Invoice } from '../types/index.js';
import { AccountId } from '../domain/value-objects.js';
import { logger } from '../utils/logger.js';

export class InvoiceRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async save(invoice: Invoice): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO invoices (id, account_id, amount, due_date, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          invoice.id,
          invoice.accountId.toString(),
          invoice.amount.toString(),
          invoice.dueDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
          invoice.status,
        ]
      );
      
      logger.debug('Invoice saved', { invoiceId: invoice.id });
    } catch (error) {
      logger.error('Failed to save invoice', { 
        invoiceId: invoice.id,
        error 
      });
      throw error;
    }
  }

  async findById(id: string): Promise<Invoice | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM invoices WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        accountId: BigInt(row.account_id),
        amount: BigInt(row.amount),
        dueDate: new Date(row.due_date),
        status: row.status,
      };
    } catch (error) {
      logger.error('Failed to find invoice', { id, error });
      throw error;
    }
  }

  async findByAccountId(accountId: AccountId): Promise<Invoice[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM invoices WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId.toString()]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        accountId: BigInt(row.account_id),
        amount: BigInt(row.amount),
        dueDate: new Date(row.due_date),
        status: row.status,
      }));
    } catch (error) {
      logger.error('Failed to find invoices by account', { 
        accountId: accountId.toString(),
        error 
      });
      throw error;
    }
  }

  async findOverdueInvoices(): Promise<Invoice[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM invoices 
         WHERE status = 'pending' AND due_date < CURRENT_DATE
         ORDER BY due_date ASC`
      );
      
      return result.rows.map(row => ({
        id: row.id,
        accountId: BigInt(row.account_id),
        amount: BigInt(row.amount),
        dueDate: new Date(row.due_date),
        status: row.status,
      }));
    } catch (error) {
      logger.error('Failed to find overdue invoices', { error });
      throw error;
    }
  }

  async updateStatus(id: string, status: 'pending' | 'paid' | 'overdue'): Promise<boolean> {
    try {
      const result = await this.db.query(
        'UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, id]
      );
      
      const updated = (result.rowCount ?? 0) > 0;
      if (updated) {
        logger.debug('Invoice status updated', { id, status });
      }
      
      return updated;
    } catch (error) {
      logger.error('Failed to update invoice status', { id, status, error });
      throw error;
    }
  }

  async findAll(): Promise<Invoice[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM invoices ORDER BY created_at DESC'
      );
      
      return result.rows.map(row => ({
        id: row.id,
        accountId: BigInt(row.account_id),
        amount: BigInt(row.amount),
        dueDate: new Date(row.due_date),
        status: row.status,
      }));
    } catch (error) {
      logger.error('Failed to find all invoices', { error });
      throw error;
    }
  }
}