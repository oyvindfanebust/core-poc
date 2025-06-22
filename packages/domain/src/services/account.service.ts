import { TigerBeetleService, AccountRepository, AccountMetadata, TransferRepository, TransferWithAccounts, CreateAccountRequest, Currency, CustomerId, AccountId } from '@core-poc/core-services';

export class AccountService {
  private accountRepository: AccountRepository;
  private transferRepository: TransferRepository;

  constructor(private tigerBeetleService: TigerBeetleService) {
    this.accountRepository = new AccountRepository();
    this.transferRepository = new TransferRepository();
  }
  async createLoanAccount(customerId: string, currency: Currency, principalAmount: bigint, accountName?: string): Promise<bigint> {
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
      accountName,
    });

    return accountId;
  }

  async createDepositAccount(customerId: string, currency: Currency, initialBalance?: bigint, accountName?: string): Promise<bigint> {
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
      accountName,
    });

    return accountId;
  }

  async createCreditAccount(customerId: string, currency: Currency, creditLimit: bigint, accountName?: string): Promise<bigint> {
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
      accountName,
    });

    return accountId;
  }

  async getAccountBalance(accountId: bigint) {
    return await this.tigerBeetleService.getAccountBalance(accountId);
  }

  async transfer(fromAccountId: bigint, toAccountId: bigint, amount: bigint, currency: Currency, description?: string) {
    const transferId = await this.tigerBeetleService.createTransfer({
      fromAccountId,
      toAccountId,
      amount,
      currency,
    });

    // Transfer record will be saved via CDC events - no direct database dependency
    return transferId;
  }

  async getAccountsByCustomer(customerId: CustomerId): Promise<AccountMetadata[]> {
    return await this.accountRepository.findByCustomerId(customerId);
  }

  async getAccountMetadata(accountId: bigint): Promise<AccountMetadata | null> {
    return await this.accountRepository.findByAccountId(new AccountId(accountId));
  }

  async updateAccountName(accountId: AccountId, accountName: string | null): Promise<boolean> {
    return await this.accountRepository.updateAccountName(accountId, accountName);
  }
}

