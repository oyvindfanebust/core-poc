import { DatabaseConnection } from '../database/connection.js';
import { AccountId, CustomerId } from '../domain/value-objects.js';
import { Currency } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface AccountMetadata {
  accountId: bigint;
  customerId: string;
  accountType: 'DEPOSIT' | 'LOAN' | 'CREDIT';
  currency: Currency;
  createdAt: Date;
  updatedAt: Date;
}

export class AccountRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async save(accountMetadata: Omit<AccountMetadata, 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO accounts (account_id, customer_id, account_type, currency)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (account_id) DO UPDATE SET
         customer_id = EXCLUDED.customer_id,
         account_type = EXCLUDED.account_type,
         currency = EXCLUDED.currency,
         updated_at = CURRENT_TIMESTAMP`,
        [
          accountMetadata.accountId.toString(),
          accountMetadata.customerId,
          accountMetadata.accountType,
          accountMetadata.currency,
        ]
      );
      
      logger.debug('Account metadata saved', { 
        accountId: accountMetadata.accountId.toString(),
        customerId: accountMetadata.customerId,
        accountType: accountMetadata.accountType
      });
    } catch (error) {
      logger.error('Failed to save account metadata', { 
        accountId: accountMetadata.accountId.toString(),
        error 
      });
      throw error;
    }
  }

  async findByCustomerId(customerId: CustomerId): Promise<AccountMetadata[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM accounts WHERE customer_id = $1 ORDER BY created_at DESC',
        [customerId.value]
      );

      return result.rows.map(row => ({
        accountId: BigInt(row.account_id),
        customerId: row.customer_id,
        accountType: row.account_type,
        currency: row.currency,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error) {
      logger.error('Failed to find accounts by customer', { 
        customerId: customerId.value,
        error 
      });
      throw error;
    }
  }

  async findByAccountId(accountId: AccountId): Promise<AccountMetadata | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM accounts WHERE account_id = $1',
        [accountId.toString()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        accountId: BigInt(row.account_id),
        customerId: row.customer_id,
        accountType: row.account_type,
        currency: row.currency,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    } catch (error) {
      logger.error('Failed to find account metadata', { 
        accountId: accountId.toString(),
        error 
      });
      throw error;
    }
  }

  async findByCustomerAndType(customerId: CustomerId, accountType: 'DEPOSIT' | 'LOAN' | 'CREDIT'): Promise<AccountMetadata[]> {
    try {
      const result = await this.db.query(
        'SELECT * FROM accounts WHERE customer_id = $1 AND account_type = $2 ORDER BY created_at DESC',
        [customerId.value, accountType]
      );

      return result.rows.map(row => ({
        accountId: BigInt(row.account_id),
        customerId: row.customer_id,
        accountType: row.account_type,
        currency: row.currency,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error) {
      logger.error('Failed to find accounts by customer and type', { 
        customerId: customerId.value,
        accountType,
        error 
      });
      throw error;
    }
  }

  async deleteByAccountId(accountId: AccountId): Promise<boolean> {
    try {
      const result = await this.db.query(
        'DELETE FROM accounts WHERE account_id = $1',
        [accountId.toString()]
      );

      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.error('Failed to delete account metadata', { 
        accountId: accountId.toString(),
        error 
      });
      throw error;
    }
  }
}