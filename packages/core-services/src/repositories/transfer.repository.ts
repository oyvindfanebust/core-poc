import { DatabaseConnection } from '../database/connection.js';
import { logger } from '../utils/logger.js';
import { AccountId } from '../value-objects.js';

export interface TransferRecord {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: bigint;
  currency: string;
  description?: string;
  createdAt: Date;
}

export interface TransferWithAccounts extends TransferRecord {
  fromAccountName?: string;
  toAccountName?: string;
  fromAccountType: string;
  toAccountType: string;
}

export class TransferRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async save(transfer: Omit<TransferRecord, 'createdAt'>): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO transfers (transfer_id, from_account_id, to_account_id, amount, currency, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          transfer.transferId,
          transfer.fromAccountId,
          transfer.toAccountId,
          transfer.amount.toString(),
          transfer.currency,
          transfer.description || null,
        ],
      );

      logger.debug('Transfer record saved', {
        transferId: transfer.transferId,
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: transfer.amount.toString(),
        currency: transfer.currency,
      });
    } catch (error) {
      logger.error('Failed to save transfer record', { error, transferId: transfer.transferId });
      throw error;
    }
  }

  async findByAccountId(accountId: AccountId, limit: number = 50): Promise<TransferWithAccounts[]> {
    try {
      const result = await this.db.query(
        `SELECT 
          t.transfer_id,
          t.from_account_id,
          t.to_account_id,
          t.amount,
          t.currency,
          t.description,
          t.created_at,
          fa.account_name as from_account_name,
          fa.account_type as from_account_type,
          ta.account_name as to_account_name,
          ta.account_type as to_account_type
        FROM transfers t
        JOIN accounts fa ON t.from_account_id = fa.account_id
        JOIN accounts ta ON t.to_account_id = ta.account_id
        WHERE t.from_account_id = $1 OR t.to_account_id = $1
        ORDER BY t.created_at DESC
        LIMIT $2`,
        [accountId.value, limit],
      );

      return result.rows.map(row => ({
        transferId: row.transfer_id,
        fromAccountId: row.from_account_id,
        toAccountId: row.to_account_id,
        amount: BigInt(row.amount),
        currency: row.currency,
        description: row.description,
        createdAt: row.created_at,
        fromAccountName: row.from_account_name,
        toAccountName: row.to_account_name,
        fromAccountType: row.from_account_type,
        toAccountType: row.to_account_type,
      }));
    } catch (error) {
      logger.error('Failed to find transfers by account ID', { error, accountId: accountId.value });
      throw error;
    }
  }

  async findRecentTransfers(limit: number = 10): Promise<TransferWithAccounts[]> {
    try {
      const result = await this.db.query(
        `SELECT 
          t.transfer_id,
          t.from_account_id,
          t.to_account_id,
          t.amount,
          t.currency,
          t.description,
          t.created_at,
          fa.account_name as from_account_name,
          fa.account_type as from_account_type,
          ta.account_name as to_account_name,
          ta.account_type as to_account_type
        FROM transfers t
        JOIN accounts fa ON t.from_account_id = fa.account_id
        JOIN accounts ta ON t.to_account_id = ta.account_id
        ORDER BY t.created_at DESC
        LIMIT $1`,
        [limit],
      );

      return result.rows.map(row => ({
        transferId: row.transfer_id,
        fromAccountId: row.from_account_id,
        toAccountId: row.to_account_id,
        amount: BigInt(row.amount),
        currency: row.currency,
        description: row.description,
        createdAt: row.created_at,
        fromAccountName: row.from_account_name,
        toAccountName: row.to_account_name,
        fromAccountType: row.from_account_type,
        toAccountType: row.to_account_type,
      }));
    } catch (error) {
      logger.error('Failed to find recent transfers', { error });
      throw error;
    }
  }
}
