import { DatabaseConnection } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { AccountId } from '../value-objects.js';

export interface ExternalTransactionRecord {
  externalTransactionId: string;
  accountId: string;
  transferId: string;
  transactionType: 'INCOMING_TRANSFER' | 'OUTGOING_TRANSFER' | 'HIGH_VALUE_TRANSFER';
  amount: bigint;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  externalBankInfo: {
    bankIdentifier: string;
    accountNumber: string;
    bankName: string;
    country?: string;
    recipientName?: string;
    transferMessage?: string;
  };
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ExternalTransactionRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async save(
    transaction: Omit<ExternalTransactionRecord, 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO external_transactions (
          external_transaction_id, 
          account_id, 
          transfer_id, 
          transaction_type, 
          amount, 
          currency, 
          status, 
          external_bank_info, 
          description
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          transaction.externalTransactionId,
          transaction.accountId,
          transaction.transferId,
          transaction.transactionType,
          transaction.amount.toString(),
          transaction.currency,
          transaction.status,
          JSON.stringify(transaction.externalBankInfo),
          transaction.description || null,
        ],
      );

      logger.debug('External transaction record saved', {
        externalTransactionId: transaction.externalTransactionId,
        accountId: transaction.accountId,
        transferId: transaction.transferId,
        transactionType: transaction.transactionType,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
      });
    } catch (error) {
      logger.error('Failed to save external transaction record', {
        error,
        externalTransactionId: transaction.externalTransactionId,
      });
      throw error;
    }
  }

  async findByAccountId(
    accountId: AccountId,
    limit: number = 50,
  ): Promise<ExternalTransactionRecord[]> {
    try {
      const result = await this.db.query(
        `SELECT 
          external_transaction_id,
          account_id,
          transfer_id,
          transaction_type,
          amount,
          currency,
          status,
          external_bank_info,
          description,
          created_at,
          updated_at
        FROM external_transactions
        WHERE account_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
        [accountId.value, limit],
      );

      return result.rows.map(row => ({
        externalTransactionId: row.external_transaction_id,
        accountId: row.account_id,
        transferId: row.transfer_id,
        transactionType: row.transaction_type,
        amount: BigInt(row.amount),
        currency: row.currency,
        status: row.status,
        externalBankInfo: JSON.parse(row.external_bank_info),
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('Failed to find external transactions by account ID', {
        error,
        accountId: accountId.value,
      });
      throw error;
    }
  }

  async findByExternalTransactionId(
    externalTransactionId: string,
  ): Promise<ExternalTransactionRecord | null> {
    try {
      const result = await this.db.query(
        `SELECT 
          external_transaction_id,
          account_id,
          transfer_id,
          transaction_type,
          amount,
          currency,
          status,
          external_bank_info,
          description,
          created_at,
          updated_at
        FROM external_transactions
        WHERE external_transaction_id = $1`,
        [externalTransactionId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        externalTransactionId: row.external_transaction_id,
        accountId: row.account_id,
        transferId: row.transfer_id,
        transactionType: row.transaction_type,
        amount: BigInt(row.amount),
        currency: row.currency,
        status: row.status,
        externalBankInfo: JSON.parse(row.external_bank_info),
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      logger.error('Failed to find external transaction by ID', {
        error,
        externalTransactionId,
      });
      throw error;
    }
  }

  async updateStatus(
    externalTransactionId: string,
    status: 'pending' | 'completed' | 'failed',
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `UPDATE external_transactions 
         SET status = $1, updated_at = CURRENT_TIMESTAMP
         WHERE external_transaction_id = $2`,
        [status, externalTransactionId],
      );

      if (result.rowCount === 0) {
        logger.warn('No external transaction found to update', { externalTransactionId });
        return false;
      }

      logger.debug('External transaction status updated', {
        externalTransactionId,
        newStatus: status,
      });

      return true;
    } catch (error) {
      logger.error('Failed to update external transaction status', {
        error,
        externalTransactionId,
        status,
      });
      throw error;
    }
  }

  async findRecentTransactions(limit: number = 10): Promise<ExternalTransactionRecord[]> {
    try {
      const result = await this.db.query(
        `SELECT 
          external_transaction_id,
          account_id,
          transfer_id,
          transaction_type,
          amount,
          currency,
          status,
          external_bank_info,
          description,
          created_at,
          updated_at
        FROM external_transactions
        ORDER BY created_at DESC
        LIMIT $1`,
        [limit],
      );

      return result.rows.map(row => ({
        externalTransactionId: row.external_transaction_id,
        accountId: row.account_id,
        transferId: row.transfer_id,
        transactionType: row.transaction_type,
        amount: BigInt(row.amount),
        currency: row.currency,
        status: row.status,
        externalBankInfo: JSON.parse(row.external_bank_info),
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('Failed to find recent external transactions', { error });
      throw error;
    }
  }
}
