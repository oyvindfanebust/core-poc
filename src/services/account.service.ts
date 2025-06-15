import { TigerBeetleService } from './tigerbeetle.service.js';
import { CreateAccountRequest } from '../types/index.js';

export class AccountService {
  constructor(private tigerBeetleService: TigerBeetleService) {}
  async createLoanAccount(customerId: string, currency: 'USD' | 'EUR' | 'GBP' | 'NOK', principalAmount: bigint): Promise<bigint> {
    return await this.tigerBeetleService.createAccount({
      type: 'LOAN',
      customerId,
      currency,
      initialBalance: principalAmount,
    });
  }

  async createDepositAccount(customerId: string, currency: 'USD' | 'EUR' | 'GBP' | 'NOK', initialBalance?: bigint): Promise<bigint> {
    return await this.tigerBeetleService.createAccount({
      type: 'DEPOSIT',
      customerId,
      currency,
      initialBalance,
    });
  }

  async createCreditAccount(customerId: string, currency: 'USD' | 'EUR' | 'GBP' | 'NOK', creditLimit: bigint): Promise<bigint> {
    return await this.tigerBeetleService.createAccount({
      type: 'CREDIT',
      customerId,
      currency,
      initialBalance: creditLimit,
    });
  }

  async getAccountBalance(accountId: bigint) {
    return await this.tigerBeetleService.getAccountBalance(accountId);
  }

  async transfer(fromAccountId: bigint, toAccountId: bigint, amount: bigint, currency: 'USD' | 'EUR' | 'GBP' | 'NOK') {
    return await this.tigerBeetleService.createTransfer({
      fromAccountId,
      toAccountId,
      amount,
      currency,
    });
  }
}

