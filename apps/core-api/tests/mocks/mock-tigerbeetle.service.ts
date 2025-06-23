import { CreateAccountRequest, CreateTransferRequest } from '@core-poc/core-services';
import { TransferType } from '@core-poc/shared';

/**
 * Mock TigerBeetleService for testing
 *
 * Provides fast in-memory simulation of TigerBeetle ledger operations
 * without requiring external TigerBeetle service connections.
 *
 * Features:
 * - In-memory account and transfer storage
 * - Automatic ID generation
 * - Balance validation for transfers
 * - Fast, deterministic responses
 * - Reset capability for test isolation
 */
export class MockTigerBeetleService {
  private accounts = new Map<bigint, MockAccount>();
  private transfers = new Map<bigint, MockTransfer>();
  private nextId = 1000n;

  async close(): Promise<void> {
    // Mock implementation - no real connections to close
  }

  async createAccount(request: CreateAccountRequest): Promise<bigint> {
    const accountId = this.generateId();

    const account: MockAccount = {
      id: accountId,
      type: request.type,
      customerId: request.customerId,
      currency: request.currency,
      debits: 0n,
      credits: request.initialBalance || 0n,
      createdAt: new Date(),
    };

    this.accounts.set(accountId, account);
    return accountId;
  }

  async createTransfer(request: CreateTransferRequest): Promise<bigint> {
    const transferId = this.generateId();

    // Validate accounts exist
    const fromAccount = this.accounts.get(request.fromAccountId);
    const toAccount = this.accounts.get(request.toAccountId);

    if (!fromAccount) {
      throw new Error(`From account ${request.fromAccountId} not found`);
    }
    if (!toAccount) {
      throw new Error(`To account ${request.toAccountId} not found`);
    }

    // Validate currency match
    if (fromAccount.currency !== request.currency || toAccount.currency !== request.currency) {
      throw new Error('Currency mismatch between accounts and transfer');
    }

    // For most account types, check sufficient balance
    if (fromAccount.type !== 'CREDIT' && fromAccount.type !== 'LOAN') {
      const fromBalance = fromAccount.credits - fromAccount.debits;
      if (fromBalance < request.amount) {
        throw new Error('Insufficient funds');
      }
    }

    // Record the transfer
    const transfer: MockTransfer = {
      id: transferId,
      fromAccountId: request.fromAccountId,
      toAccountId: request.toAccountId,
      amount: request.amount,
      currency: request.currency,
      transferType: request.transferType || TransferType.CUSTOMER_TRANSFER,
      description: request.description,
      createdAt: new Date(),
    };

    this.transfers.set(transferId, transfer);

    // Update account balances
    fromAccount.debits += request.amount;
    toAccount.credits += request.amount;

    return transferId;
  }

  async getAccountBalance(
    accountId: bigint,
  ): Promise<{ debits: bigint; credits: bigint; balance: bigint }> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error('Account not found');
    }

    return {
      debits: account.debits,
      credits: account.credits,
      balance: account.credits - account.debits,
    };
  }

  // Additional helper methods for testing
  getAccountCount(): number {
    return this.accounts.size;
  }

  getTransferCount(): number {
    return this.transfers.size;
  }

  getAccount(accountId: bigint): MockAccount | undefined {
    return this.accounts.get(accountId);
  }

  getTransfer(transferId: bigint): MockTransfer | undefined {
    return this.transfers.get(transferId);
  }

  reset(): void {
    this.accounts.clear();
    this.transfers.clear();
    this.nextId = 1000n;
  }

  private generateId(): bigint {
    return this.nextId++;
  }
}

interface MockAccount {
  id: bigint;
  type: string;
  customerId: string;
  currency: string;
  debits: bigint;
  credits: bigint;
  createdAt: Date;
}

interface MockTransfer {
  id: bigint;
  fromAccountId: bigint;
  toAccountId: bigint;
  amount: bigint;
  currency: string;
  transferType: number;
  description?: string;
  createdAt: Date;
}
