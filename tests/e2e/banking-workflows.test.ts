import request from 'supertest';
import express from 'express';
import { AccountController } from '../../src/controllers/account.controller';
import { validateRequest } from '../../src/middleware/validation';
import { CreateAccountSchema, TransferSchema, CreateInvoiceSchema, AccountIdParamSchema } from '../../src/validation/schemas';
import { createLocalTestContext, cleanupLocalTestContext, LocalTestContext } from '../helpers/test-utils-local';

describe('Banking Workflows E2E', () => {
  let context: LocalTestContext;
  let app: express.Application;

  beforeAll(async () => {
    context = await createLocalTestContext();
    
    const accountController = new AccountController(
      context.services.accountService,
      context.services.loanService,
      context.services.invoiceService
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
    app.post('/invoices', 
      validateRequest(CreateInvoiceSchema),
      accountController.createInvoice.bind(accountController)
    );
    app.get('/accounts/:accountId/invoices', 
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getInvoices.bind(accountController)
    );
  }, 15000);

  afterAll(async () => {
    await cleanupLocalTestContext(context);
  }, 5000);

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

      // 7. Create monthly payment invoice for loan
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const invoiceResponse = await request(app)
        .post('/invoices')
        .send({
          accountId: loanAccountId.toString(),
          amount: loanResponse.body.monthlyPayment,
          dueDate: futureDate.toISOString().split('T')[0], // YYYY-MM-DD format
        });

      if (invoiceResponse.status !== 201) {
        console.error('Invoice creation failed:', invoiceResponse.body);
      }
      expect(invoiceResponse.status).toBe(201);

      expect(invoiceResponse.body.status).toBe('pending');

      // 8. Pay loan from savings account
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

      // 9. Verify final balances
      const finalSavingsBalance = await request(app)
        .get(`/accounts/${savingsAccountId}/balance`)
        .expect(200);

      const finalLoanBalance = await request(app)
        .get(`/accounts/${loanAccountId}/balance`)
        .expect(200);

      const expectedSavingsBalance = 250000n - BigInt(monthlyPayment);
      expect(finalSavingsBalance.body.balance).toBe(expectedSavingsBalance.toString());
      expect(finalLoanBalance.body.balance).toBe(monthlyPayment);

      // 10. Verify invoices
      const invoices = await request(app)
        .get(`/accounts/${loanAccountId}/invoices`)
        .expect(200);

      expect(invoices.body).toHaveLength(1);
      expect(invoices.body[0].amount).toBe(monthlyPayment);
    });
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
    });
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
    });
  });

  describe('Invoice Management Scenario', () => {
    it('should handle complex invoice workflows', async () => {
      // Create business account
      const businessAccount = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'BIZ001',
          currency: 'USD',
          initialBalance: '0',
        })
        .expect(201);

      const accountId = businessAccount.body.accountId;

      // Create future due dates for invoices
      const futureDate1 = new Date();
      futureDate1.setDate(futureDate1.getDate() + 15);
      
      const futureDate2 = new Date();
      futureDate2.setDate(futureDate2.getDate() + 45);
      
      const futureDate3 = new Date();
      futureDate3.setDate(futureDate3.getDate() + 75);

      // Create multiple invoices
      const invoice1 = await request(app)
        .post('/invoices')
        .send({
          accountId: accountId.toString(),
          amount: '5000',
          dueDate: futureDate1.toISOString().split('T')[0],
        });

      if (invoice1.status !== 201) {
        console.error('Invoice 1 creation failed:', invoice1.body);
      }
      expect(invoice1.status).toBe(201);

      const invoice2 = await request(app)
        .post('/invoices')
        .send({
          accountId: accountId.toString(),
          amount: '3000',
          dueDate: futureDate2.toISOString().split('T')[0],
        })
        .expect(201);

      const invoice3 = await request(app)
        .post('/invoices')
        .send({
          accountId: accountId.toString(),
          amount: '7500',
          dueDate: futureDate3.toISOString().split('T')[0],
        })
        .expect(201);

      // Verify all invoices were created
      const invoices = await request(app)
        .get(`/accounts/${accountId}/invoices`)
        .expect(200);

      expect(invoices.body).toHaveLength(3);
      
      const totalInvoiceAmount = invoices.body.reduce(
        (sum: number, invoice: any) => sum + parseInt(invoice.amount),
        0
      );
      
      expect(totalInvoiceAmount).toBe(15500); // 5000 + 3000 + 7500

      // Each invoice should be pending
      invoices.body.forEach((invoice: any) => {
        expect(invoice.status).toBe('pending');
      });
    });
  });
});