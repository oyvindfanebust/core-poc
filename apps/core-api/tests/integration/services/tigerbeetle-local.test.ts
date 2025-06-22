import { TigerBeetleService } from '@core-poc/core-services';
import { createTestContext, cleanupTestContext, TestContext } from '../../helpers/test-utils.js';
import { setupTestTigerBeetle, teardownTestTigerBeetle } from '../../helpers/test-tigerbeetle.js';
import { testCustomers, testAmounts } from '../../fixtures/test-data.js';

describe('TigerBeetleService Integration', () => {
  let context: TestContext;
  let tigerBeetleService: TigerBeetleService;

  beforeAll(async () => {
    // Setup TigerBeetle container first
    await setupTestTigerBeetle();
    
    // Then create test context
    context = await createTestContext();
    tigerBeetleService = context.services.tigerBeetleService;
  }, 60000);

  afterAll(async () => {
    await cleanupTestContext(context);
    await teardownTestTigerBeetle();
  }, 30000);

  describe('createAccount', () => {
    it('should create a deposit account without initial balance', async () => {
      const accountId = await tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: testCustomers.customer3,
        currency: 'USD',
      });

      expect(accountId).toBeDefined();
      expect(typeof accountId).toBe('bigint');
      expect(accountId > 0n).toBe(true);
      
      const balance = await tigerBeetleService.getAccountBalance(accountId);
      expect(balance.balance).toBe(0n);
    });

    it('should create a deposit account with initial balance', async () => {
      const accountId = await tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: testCustomers.customer2,
        currency: 'USD',
        initialBalance: testAmounts.small,
      });

      expect(accountId).toBeDefined();
      
      const balance = await tigerBeetleService.getAccountBalance(accountId);
      expect(balance.balance).toBe(testAmounts.small);
    });
  });

  describe('createTransfer', () => {
    let fromAccountId: bigint;
    let toAccountId: bigint;

    beforeAll(async () => {
      fromAccountId = await tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: 'TRANSFER_FROM',
        currency: 'USD',
        initialBalance: 10000n,
      });

      toAccountId = await tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: 'TRANSFER_TO',
        currency: 'USD',
        initialBalance: 0n,
      });
    });

    it('should transfer funds between accounts', async () => {
      const transferAmount = 2500n;
      
      const transferId = await tigerBeetleService.createTransfer({
        fromAccountId,
        toAccountId,
        amount: transferAmount,
        currency: 'USD',
      });

      expect(transferId).toBeDefined();

      const fromBalance = await tigerBeetleService.getAccountBalance(fromAccountId);
      const toBalance = await tigerBeetleService.getAccountBalance(toAccountId);

      expect(fromBalance.balance).toBe(7500n); // 10000 - 2500
      expect(toBalance.balance).toBe(2500n);
    });
  });

  describe('getAccountBalance', () => {
    it('should throw error for non-existent account', async () => {
      const nonExistentId = 999999n;
      
      await expect(
        tigerBeetleService.getAccountBalance(nonExistentId)
      ).rejects.toThrow('Account not found');
    });
  });
});