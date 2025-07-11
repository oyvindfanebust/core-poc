import { TigerBeetleService } from '@core-poc/core-services';

import { testCustomers, testAmounts } from '../../fixtures/test-data.js';
import { resetTestData } from '../../helpers/test-setup.js';
import { getGlobalTestServices } from '../../setup.js';

describe('TigerBeetleService Integration', () => {
  let tigerBeetleService: TigerBeetleService;

  beforeAll(async () => {
    // Use global test services (initialized once in setup.ts)
    const services = getGlobalTestServices();
    tigerBeetleService = services.tigerBeetleService;
  });

  beforeEach(async () => {
    // Reset test data between tests for isolation
    await resetTestData();
  });

  describe('createAccount', () => {
    it('should create a deposit account without initial balance', async () => {
      const accountId = await tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: testCustomers.customer3,
        currency: 'EUR',
      });

      expect(accountId).toBeDefined();
      expect(typeof accountId).toBe('bigint');
      expect(accountId > 0n).toBe(true);

      const balance = await tigerBeetleService.getAccountBalance(accountId);
      expect(balance.balance).toBe(0n);
    }, 10000);

    it('should create a deposit account with initial balance', async () => {
      const accountId = await tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: testCustomers.customer2,
        currency: 'EUR',
        initialBalance: testAmounts.small,
      });

      expect(accountId).toBeDefined();

      const balance = await tigerBeetleService.getAccountBalance(accountId);
      expect(balance.balance).toBe(testAmounts.small);
    }, 10000);
  });

  describe('createTransfer', () => {
    let fromAccountId: bigint;
    let toAccountId: bigint;

    beforeAll(async () => {
      fromAccountId = await tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: 'TRANSFER_FROM',
        currency: 'EUR',
        initialBalance: 10000n,
      });

      toAccountId = await tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: 'TRANSFER_TO',
        currency: 'EUR',
        initialBalance: 0n,
      });
    }, 10000);

    it('should transfer funds between accounts', async () => {
      const transferAmount = 2500n;

      const transferId = await tigerBeetleService.createTransfer({
        fromAccountId,
        toAccountId,
        amount: transferAmount,
        currency: 'EUR',
      });

      expect(transferId).toBeDefined();

      const fromBalance = await tigerBeetleService.getAccountBalance(fromAccountId);
      const toBalance = await tigerBeetleService.getAccountBalance(toAccountId);

      expect(fromBalance.balance).toBe(7500n); // 10000 - 2500
      expect(toBalance.balance).toBe(2500n);
    }, 10000);
  });

  describe('getAccountBalance', () => {
    it('should throw error for non-existent account', async () => {
      const nonExistentId = 999999n;

      await expect(tigerBeetleService.getAccountBalance(nonExistentId)).rejects.toThrow(
        'Account not found',
      );
    }, 10000);
  });
});
