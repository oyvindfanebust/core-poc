import { TigerBeetleService } from './tigerbeetle.service.js';
import { AccountRepository, AccountMetadata } from '../repositories/account.repository.js';
import { CreateAccountRequest, Currency } from '../types/index.js';
import { CustomerId, AccountId } from '../domain/value-objects.js';

export class AccountService {
  private accountRepository: AccountRepository;

  constructor(private tigerBeetleService: TigerBeetleService) {
    this.accountRepository = new AccountRepository();
  }
  async createLoanAccount(customerId: string, currency: Currency, principalAmount: bigint): Promise<bigint> {
    const accountId = await this.tigerBeetleService.createAccount({
      type: 'LOAN',
      customerId,
      currency,
      initialBalance: principalAmount,
    });

    // Save account metadata
    await this.accountRepository.save({
      accountId,
      customerId,
      accountType: 'LOAN',
      currency: currency as Currency,
    });

    return accountId;
  }

  async createDepositAccount(customerId: string, currency: Currency, initialBalance?: bigint): Promise<bigint> {
    const accountId = await this.tigerBeetleService.createAccount({
      type: 'DEPOSIT',
      customerId,
      currency,
      initialBalance,
    });

    // Save account metadata
    await this.accountRepository.save({
      accountId,
      customerId,
      accountType: 'DEPOSIT',
      currency: currency as Currency,
    });

    return accountId;
  }

  async createCreditAccount(customerId: string, currency: Currency, creditLimit: bigint): Promise<bigint> {
    const accountId = await this.tigerBeetleService.createAccount({
      type: 'CREDIT',
      customerId,
      currency,
      initialBalance: creditLimit,
    });

    // Save account metadata
    await this.accountRepository.save({
      accountId,
      customerId,
      accountType: 'CREDIT',
      currency: currency as Currency,
    });

    return accountId;
  }

  async getAccountBalance(accountId: bigint) {
    return await this.tigerBeetleService.getAccountBalance(accountId);
  }

  async transfer(fromAccountId: bigint, toAccountId: bigint, amount: bigint, currency: Currency) {
    return await this.tigerBeetleService.createTransfer({
      fromAccountId,
      toAccountId,
      amount,
      currency,
    });
  }

  async getAccountsByCustomer(customerId: CustomerId): Promise<AccountMetadata[]> {
    return await this.accountRepository.findByCustomerId(customerId);
  }

  async getAccountMetadata(accountId: bigint): Promise<AccountMetadata | null> {
    return await this.accountRepository.findByAccountId(new AccountId(accountId));
  }
}

