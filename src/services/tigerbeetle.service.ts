import { id } from 'tigerbeetle-node';
import { ACCOUNT_TYPES, LEDGER_CODES } from '../config/tigerbeetle.js';
import { CreateAccountRequest, CreateTransferRequest } from '../types/index.js';

export class TigerBeetleService {
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  async close(): Promise<void> {
    if (this.client && typeof this.client.close === 'function') {
      await this.client.close();
    }
  }

  async createAccount(request: CreateAccountRequest): Promise<bigint> {
    const accountId = id();
    
    const account = {
      id: accountId,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: 0n,
      user_data_64: BigInt(request.customerId.slice(0, 8).padEnd(8, '0').split('').map(c => c.charCodeAt(0)).join('')),
      user_data_32: 0,
      reserved: 0,
      ledger: LEDGER_CODES[request.currency],
      code: ACCOUNT_TYPES[request.type],
      flags: 0,
      timestamp: 0n,
    };

    const errors = await this.client.createAccounts([account]);
    if (errors.length > 0) {
      throw new Error(`Failed to create account: ${JSON.stringify(errors)}`);
    }

    if (request.initialBalance && request.initialBalance > 0n) {
      await this.initialDeposit(accountId, request.initialBalance, request.currency);
    }

    return accountId;
  }

  async createTransfer(request: CreateTransferRequest): Promise<bigint> {
    const transferId = id();
    
    const transfer = {
      id: transferId,
      debit_account_id: request.fromAccountId,
      credit_account_id: request.toAccountId,
      amount: request.amount,
      pending_id: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      timeout: 0,
      ledger: LEDGER_CODES[request.currency],
      code: 1,
      flags: 0,
      timestamp: 0n,
    };

    const errors = await this.client.createTransfers([transfer]);
    if (errors.length > 0) {
      throw new Error(`Failed to create transfer: ${JSON.stringify(errors)}`);
    }

    return transferId;
  }

  async getAccountBalance(accountId: bigint): Promise<{ debits: bigint; credits: bigint; balance: bigint }> {
    const accounts = await this.client.lookupAccounts([accountId]);
    if (accounts.length === 0) {
      throw new Error('Account not found');
    }

    const account = accounts[0];
    return {
      debits: BigInt(account.debits_posted),
      credits: BigInt(account.credits_posted),
      balance: BigInt(account.credits_posted) - BigInt(account.debits_posted),
    };
  }

  private async initialDeposit(accountId: bigint, amount: bigint, currency: keyof typeof LEDGER_CODES): Promise<void> {
    const systemAccountId = id();
    
    const systemAccount = {
      id: systemAccountId,
      debits_pending: 0n,
      debits_posted: 0n,
      credits_pending: 0n,
      credits_posted: 0n,
      user_data_128: 0n,
      user_data_64: 0n,
      user_data_32: 0,
      reserved: 0,
      ledger: LEDGER_CODES[currency],
      code: ACCOUNT_TYPES.EQUITY,
      flags: 0,
      timestamp: 0n,
    };

    await this.client.createAccounts([systemAccount]);

    await this.createTransfer({
      fromAccountId: systemAccountId,
      toAccountId: accountId,
      amount,
      currency,
      description: 'Initial deposit',
    });
  }
}

