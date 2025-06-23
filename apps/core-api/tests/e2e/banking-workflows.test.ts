import request from 'supertest';
import express from 'express';
import { AccountController } from '../../src/controllers/account.controller';
import { validateRequest, errorHandler } from '../../src/middleware/validation';
import { CreateAccountSchema, TransferSchema, AccountIdParamSchema, CustomerIdParamSchema } from '../../src/validation/schemas';
import { createTestContext, cleanupTestContext, resetTestData, TestContext } from '../helpers/test-setup.js';

describe('Banking Workflows E2E', () => {
  let context: TestContext;
  let app: express.Application;

  beforeAll(async () => {
    // Create test context (external services assumed to be running)
    context = await createTestContext();
    
    const accountController = new AccountController(
      context.services.accountService,
      context.services.loanService,
      context.services.transferRepository
    );

    app = express();
    app.use(express.json());
    
    // Add validation middleware for routes
    app.post('/accounts', 
      validateRequest(CreateAccountSchema),
      accountController.createAccount.bind(accountController)
    );
    app.get('/accounts/:accountId/balance', 
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getAccountBalance.bind(accountController)
    );
    app.post('/transfers', 
      validateRequest(TransferSchema),
      accountController.transfer.bind(accountController)
    );
    app.get('/customers/:customerId/accounts',
      validateRequest(CustomerIdParamSchema, 'params'),
      accountController.getAccountsByCustomer.bind(accountController)
    );
    
    // Add error handling middleware (must be last)
    app.use(errorHandler);
  }, 30000);

  afterAll(async () => {
    await cleanupTestContext();
  }, 10000);

  beforeEach(async () => {
    // Reset test data between tests for isolation
    await resetTestData();
  });

  describe('Complete Banking Scenario', () => {
    it('should handle a complete customer banking workflow', async () => {
      // 1. Create customer accounts
      const savingsRequest = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'CUST001',
          currency: 'USD',
          initialBalance: '50000',
        });
        
      if (savingsRequest.status !== 201) {
        console.error('Savings account creation failed:', savingsRequest.status, savingsRequest.body);
      }
      expect(savingsRequest.status).toBe(201);
      const savingsResponse = savingsRequest;

      const loanResponseRequest = await request(app)
        .post('/accounts')
        .send({
          type: 'LOAN',
          customerId: 'CUST001',
          currency: 'USD',
          principalAmount: '200000',
          interestRate: '4.5',
          termMonths: '360', // 30 years
        });
        
      if (loanResponseRequest.status !== 201) {
        console.error('Loan account creation failed:', loanResponseRequest.status, loanResponseRequest.body);
      }
      expect(loanResponseRequest.status).toBe(201);
      const loanResponse = loanResponseRequest;

      const creditResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'CREDIT',
          customerId: 'CUST001',
          currency: 'USD',
          creditLimit: '25000',
        })
        .expect(201);

      const savingsAccountId = savingsResponse.body.accountId;
      const loanAccountId = loanResponse.body.accountId;
      const creditAccountId = creditResponse.body.accountId;

      // 2. Verify initial balances
      const savingsBalance = await request(app)
        .get(`/accounts/${savingsAccountId}/balance`)
        .expect(200);
      
      expect(savingsBalance.body.balance).toBe('50000');

      const loanBalance = await request(app)
        .get(`/accounts/${loanAccountId}/balance`)
        .expect(200);
      
      expect(loanBalance.body.balance).toBe('200000');

      // 3. Transfer funds from loan to savings (loan disbursement)
      await request(app)
        .post('/transfers')
        .send({
          fromAccountId: loanAccountId,
          toAccountId: savingsAccountId,
          amount: '200000',
          currency: 'USD',
        })
        .expect(201);

      // 4. Verify balances after loan disbursement
      const updatedSavingsBalance = await request(app)
        .get(`/accounts/${savingsAccountId}/balance`)
        .expect(200);
      
      const updatedLoanBalance = await request(app)
        .get(`/accounts/${loanAccountId}/balance`)
        .expect(200);

      expect(updatedSavingsBalance.body.balance).toBe('250000'); // 50000 + 200000
      expect(updatedLoanBalance.body.balance).toBe('0');

      // 5. Create a credit card purchase (transfer from credit account to merchant)
      const merchantResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MERCH001',
          currency: 'USD',
          initialBalance: '0',
        })
        .expect(201);

      const merchantAccountId = merchantResponse.body.accountId;

      await request(app)
        .post('/transfers')
        .send({
          fromAccountId: creditAccountId,
          toAccountId: merchantAccountId,
          amount: '2500',
          currency: 'USD',
        })
        .expect(201);

      // 6. Verify credit account balance (should be negative)
      const creditBalance = await request(app)
        .get(`/accounts/${creditAccountId}/balance`)
        .expect(200);

      expect(creditBalance.body.balance).toBe('22500'); // 25000 - 2500

      // 7. Make loan payment from savings account
      const monthlyPayment = loanResponse.body.monthlyPayment;
      
      await request(app)
        .post('/transfers')
        .send({
          fromAccountId: savingsAccountId,
          toAccountId: loanAccountId,
          amount: monthlyPayment,
          currency: 'USD',
        })
        .expect(201);

      // 8. Verify final balances
      const finalSavingsBalance = await request(app)
        .get(`/accounts/${savingsAccountId}/balance`)
        .expect(200);

      const finalLoanBalance = await request(app)
        .get(`/accounts/${loanAccountId}/balance`)
        .expect(200);

      const expectedSavingsBalance = 250000n - BigInt(monthlyPayment);
      expect(finalSavingsBalance.body.balance).toBe(expectedSavingsBalance.toString());
      expect(finalLoanBalance.body.balance).toBe(monthlyPayment);

    }, 10000);
  });

  describe('Multi-Customer Transfer Scenario', () => {
    it('should handle transfers between different customers', async () => {
      // Create accounts for two different customers
      const customer1Account = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'CUSTA',
          currency: 'USD',
          initialBalance: '15000',
        })
        .expect(201);

      const customer2Account = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'CUSTB',
          currency: 'USD',
          initialBalance: '5000',
        })
        .expect(201);

      const accountA = customer1Account.body.accountId;
      const accountB = customer2Account.body.accountId;

      // Transfer from A to B
      await request(app)
        .post('/transfers')
        .send({
          fromAccountId: accountA,
          toAccountId: accountB,
          amount: '3000',
          currency: 'USD',
        })
        .expect(201);

      // Verify balances
      const balanceA = await request(app)
        .get(`/accounts/${accountA}/balance`)
        .expect(200);

      const balanceB = await request(app)
        .get(`/accounts/${accountB}/balance`)
        .expect(200);

      expect(balanceA.body.balance).toBe('12000'); // 15000 - 3000
      expect(balanceB.body.balance).toBe('8000');  // 5000 + 3000

      // Transfer back from B to A
      await request(app)
        .post('/transfers')
        .send({
          fromAccountId: accountB,
          toAccountId: accountA,
          amount: '1500',
          currency: 'USD',
        })
        .expect(201);

      // Final verification
      const finalBalanceA = await request(app)
        .get(`/accounts/${accountA}/balance`)
        .expect(200);

      const finalBalanceB = await request(app)
        .get(`/accounts/${accountB}/balance`)
        .expect(200);

      expect(finalBalanceA.body.balance).toBe('13500'); // 12000 + 1500
      expect(finalBalanceB.body.balance).toBe('6500');  // 8000 - 1500
    }, 10000);
  });

  describe('Multi-Currency Scenario', () => {
    it('should handle accounts in different currencies', async () => {
      // Create accounts in different currencies
      const usdResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MULTI1',
          currency: 'USD',
          initialBalance: '10000',
        });
        
      if (usdResponse.status !== 201) {
        console.error('USD account creation failed:', usdResponse.status, usdResponse.body);
      }
      expect(usdResponse.status).toBe(201);
      const usdAccount = usdResponse;

      const eurAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MULTI1',
          currency: 'EUR',
          initialBalance: '8000',
        })
        .expect(201);

      const nokAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MULTI1',
          currency: 'NOK',
          initialBalance: '100000',
        })
        .expect(201);

      // Verify all accounts were created with correct balances
      const usdBalance = await request(app)
        .get(`/accounts/${usdAccount.body.accountId}/balance`)
        .expect(200);

      const eurBalance = await request(app)
        .get(`/accounts/${eurAccount.body.accountId}/balance`)
        .expect(200);

      const nokBalance = await request(app)
        .get(`/accounts/${nokAccount.body.accountId}/balance`)
        .expect(200);

      expect(usdBalance.body.balance).toBe('10000');
      expect(eurBalance.body.balance).toBe('8000');
      expect(nokBalance.body.balance).toBe('100000');

      // Note: Cross-currency transfers would require exchange rate handling
      // which is not implemented in this POC, but accounts can exist independently
    }, 10000);
  });


  describe('Customer Account Management Scenario', () => {
    it('should list all accounts for a specific customer', async () => {
      const customerId = 'CUSTLIST';
      
      // Create multiple accounts for the same customer
      const depositAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId,
          currency: 'USD',
          initialBalance: '25000',
        })
        .expect(201);

      const loanAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'LOAN',
          customerId,
          currency: 'USD',
          principalAmount: '150000',
          interestRate: '3.5',
          termMonths: '240',
        })
        .expect(201);

      const creditAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'CREDIT',
          customerId,
          currency: 'USD',
          creditLimit: '15000',
        })
        .expect(201);

      // List all accounts for the customer
      const accountsResponse = await request(app)
        .get(`/customers/${customerId}/accounts`)
        .expect(200);

      const accounts = accountsResponse.body;
      expect(accounts).toHaveLength(3);

      // Verify all accounts belong to the correct customer
      accounts.forEach((account: any) => {
        expect(account.customerId).toBe(customerId);
        expect(account.currency).toBe('USD');
        expect(account).toHaveProperty('accountId');
        expect(account).toHaveProperty('accountType');
        expect(account).toHaveProperty('createdAt');
        expect(account).toHaveProperty('updatedAt');
      });

      // Verify account types are present
      const accountTypes = accounts.map((account: any) => account.accountType);
      expect(accountTypes).toContain('DEPOSIT');
      expect(accountTypes).toContain('LOAN');
      expect(accountTypes).toContain('CREDIT');

      // Verify account IDs match created accounts
      const accountIds = accounts.map((account: any) => account.accountId);
      expect(accountIds).toContain(depositAccount.body.accountId);
      expect(accountIds).toContain(loanAccount.body.accountId);
      expect(accountIds).toContain(creditAccount.body.accountId);
    }, 10000);

    it('should return empty array for customer with no accounts', async () => {
      const nonExistentCustomerId = 'NOACCNT';
      
      const accountsResponse = await request(app)
        .get(`/customers/${nonExistentCustomerId}/accounts`)
        .expect(200);

      expect(accountsResponse.body).toHaveLength(0);
      expect(Array.isArray(accountsResponse.body)).toBe(true);
    }, 10000);

    it('should handle customer ID validation', async () => {
      // Test invalid customer ID (too long - over 50 characters)
      const tooLongId = 'A'.repeat(51); // 51 characters, exceeds max of 50
      await request(app)
        .get(`/customers/${tooLongId}/accounts`)
        .expect(400);

      // Test invalid customer ID (invalid characters)
      await request(app)
        .get('/customers/cust@123/accounts')
        .expect(400);

      // Test empty customer ID
      await request(app)
        .get('/customers//accounts')
        .expect(404); // Route not found
    }, 10000);

    it('should return accounts ordered by creation date (newest first)', async () => {
      const customerId = 'CUSTORD';
      
      // Create accounts with small delays to ensure different creation times
      const firstAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId,
          currency: 'USD',
          initialBalance: '10000',
        })
        .expect(201);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));

      const secondAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'CREDIT',
          customerId,
          currency: 'USD',
          creditLimit: '5000',
        })
        .expect(201);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));

      const thirdAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId,
          currency: 'EUR',
          initialBalance: '8000',
        })
        .expect(201);

      // Get accounts list
      const accountsResponse = await request(app)
        .get(`/customers/${customerId}/accounts`)
        .expect(200);

      const accounts = accountsResponse.body;
      expect(accounts).toHaveLength(3);

      // Verify accounts are ordered by creation date (newest first)
      const creationDates = accounts.map((account: any) => new Date(account.createdAt));
      for (let i = 0; i < creationDates.length - 1; i++) {
        expect(creationDates[i].getTime()).toBeGreaterThanOrEqual(creationDates[i + 1].getTime());
      }

      // Verify the newest account is first
      expect(accounts[0].accountId).toBe(thirdAccount.body.accountId);
    }, 10000);
  });
});