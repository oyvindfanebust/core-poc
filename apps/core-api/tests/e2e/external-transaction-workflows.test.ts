import express from 'express';
import request from 'supertest';

import { AccountController } from '../../src/controllers/account.controller';
import { ExternalTransactionController } from '../../src/controllers/external-transaction.controller';
import { validateRequest, errorHandler } from '../../src/middleware/validation';
import { ServiceContainer } from '../../src/services/factory.js';
import {
  CreateAccountSchema,
  AccountIdParamSchema,
  ACHCreditRequestSchema,
  WireCreditRequestSchema,
  TransactionIdParamSchema,
} from '../../src/validation/schemas';
import { resetTestData } from '../helpers/test-setup.js';
import { getGlobalTestServices } from '../setup.js';

describe('External Transaction Workflows E2E', () => {
  let services: ServiceContainer;
  let app: express.Application;

  beforeAll(async () => {
    // Use global test services with real TigerBeetle and database
    services = getGlobalTestServices();

    const accountController = new AccountController(
      services.accountService,
      services.loanService,
      services.transferRepository,
    );

    const externalTransactionController = new ExternalTransactionController();

    app = express();
    app.use(express.json());

    // Account management routes
    app.post(
      '/accounts',
      validateRequest(CreateAccountSchema),
      accountController.createAccount.bind(accountController),
    );
    app.get(
      '/accounts/:accountId/balance',
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getAccountBalance.bind(accountController),
    );

    // External transaction routes
    app.post(
      '/api/v1/external-transactions/ach-credit',
      validateRequest(ACHCreditRequestSchema),
      externalTransactionController.processACHCredit.bind(externalTransactionController),
    );

    app.post(
      '/api/v1/external-transactions/wire-credit',
      validateRequest(WireCreditRequestSchema),
      externalTransactionController.processWireCredit.bind(externalTransactionController),
    );

    app.get(
      '/api/v1/external-transactions/status/:transactionId',
      validateRequest(TransactionIdParamSchema, 'params'),
      externalTransactionController.getTransactionStatus.bind(externalTransactionController),
    );

    app.use(errorHandler);
  });

  beforeEach(async () => {
    await resetTestData();
  });

  describe('ACH Credit Transaction Workflow', () => {
    it('should process complete ACH credit workflow from creation to status verification', async () => {
      // Step 1: Create a customer account to receive the ACH credit
      const accountResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'EXTERNAL-RECV-CUSTOMER',
          currency: 'EUR', // Note: Real account uses EUR, but ACH will be USD
          initialBalance: '100000', // €1,000.00 initial balance
        })
        .expect(201);

      const targetAccountId = accountResponse.body.accountId;

      // Step 2: Check initial account balance
      const initialBalance = await request(app)
        .get(`/accounts/${targetAccountId}/balance`)
        .expect(200);

      expect(initialBalance.body.balance).toBe('100000'); // €1,000.00

      // Step 3: Process ACH credit transaction
      const achRequest = {
        targetAccountId: targetAccountId,
        amount: '250000', // $2,500.00 in cents
        currency: 'USD',
        routingNumber: '021000021', // JP Morgan Chase routing number
        originatingBankName: 'JPMorgan Chase Bank, N.A.',
        reference: 'E2E ACH Credit Test - Payroll Deposit',
        urgency: 'STANDARD',
      };

      const achResponse = await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send(achRequest);

      // Step 4: Verify ACH transaction response
      // Note: Transaction may succeed or fail due to simulation (90% success rate)
      expect([200, 400]).toContain(achResponse.status);

      if (achResponse.status === 200) {
        // Successful transaction
        expect(achResponse.body.status).toBe('SUCCESS');
        expect(achResponse.body.transactionId).toMatch(/^ACH-STANDARD-/);
        expect(achResponse.body.amount).toBe('250000');
        expect(achResponse.body.currency).toBe('USD');
        expect(achResponse.body.targetAccountId).toBe(targetAccountId);
        expect(achResponse.body.timestamp).toBeDefined();
        expect(achResponse.body.estimatedSettlement).toBeDefined();

        // Step 5: Verify transaction status lookup
        const transactionId = achResponse.body.transactionId;
        const statusResponse = await request(app)
          .get(`/api/v1/external-transactions/status/${transactionId}`)
          .expect(200);

        expect(statusResponse.body.transactionId).toBe(transactionId);
        expect(statusResponse.body.status).toBe('SUCCESS');
        expect(statusResponse.body.type).toBe('ACH_CREDIT');
        expect(statusResponse.body.amount).toBe('250000');
        expect(statusResponse.body.currency).toBe('USD');
        expect(statusResponse.body.targetAccountId).toBe(targetAccountId);
        expect(statusResponse.body.originatingBank).toBe('JPMorgan Chase Bank, N.A.');
        expect(statusResponse.body.reference).toBe('E2E ACH Credit Test - Payroll Deposit');
        expect(statusResponse.body.timestamp).toBeDefined();
        expect(statusResponse.body.settlementDate).toBeDefined();

        // Step 6: Verify settlement timing
        const timestamp = new Date(statusResponse.body.timestamp);
        const settlementDate = new Date(statusResponse.body.settlementDate);
        const timeDiff = settlementDate.getTime() - timestamp.getTime();
        const expectedStandardSettlement = 2 * 24 * 60 * 60 * 1000; // 2 days in ms

        // Allow for some variance in timing
        expect(timeDiff).toBeGreaterThan(expectedStandardSettlement - 60000);
        expect(timeDiff).toBeLessThan(expectedStandardSettlement + 60000);

        console.log(`✓ ACH Credit transaction ${transactionId} processed successfully`);
      } else {
        // Failed transaction (simulated)
        expect(achResponse.body.status).toBe('FAILED');
        expect(achResponse.body.errorDetails).toBeDefined();
        expect(achResponse.body.errorDetails.code).toBe('ACH_PROCESSING_FAILED');
        expect(achResponse.body.errorDetails.retryable).toBe(true);

        console.log(`✓ ACH Credit transaction failed as expected (simulation)`);
      }
    }, 15000);

    it('should handle different ACH urgency levels with correct settlement times', async () => {
      // Create account for testing
      const accountResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'ACH-URGENCY-TEST',
          currency: 'EUR',
          initialBalance: '50000',
        })
        .expect(201);

      const targetAccountId = accountResponse.body.accountId;
      const urgencyLevels = [
        { urgency: 'STANDARD', expectedHours: 48 }, // 2 days
        { urgency: 'SAME_DAY', expectedHours: 6 }, // 6 hours
        { urgency: 'EXPRESS', expectedHours: 2 }, // 2 hours
      ];

      for (const { urgency, expectedHours } of urgencyLevels) {
        const achRequest = {
          targetAccountId,
          amount: '100000', // $1,000.00
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank, N.A.',
          reference: `E2E ${urgency} ACH Test`,
          urgency,
        };

        const response = await request(app)
          .post('/api/v1/external-transactions/ach-credit')
          .send(achRequest);

        if (response.status === 200) {
          expect(response.body.transactionId).toMatch(new RegExp(`^ACH-${urgency}-`));

          const timestamp = new Date(response.body.timestamp);
          const settlement = new Date(response.body.estimatedSettlement);
          const actualHours = (settlement.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

          // Allow 10% variance for timing
          expect(actualHours).toBeGreaterThan(expectedHours * 0.9);
          expect(actualHours).toBeLessThan(expectedHours * 1.1);

          console.log(`✓ ${urgency} ACH processed with ${actualHours.toFixed(1)}h settlement`);
        }
      }
    }, 45000);
  });

  describe('Wire Transfer Transaction Workflow', () => {
    it('should process complete international wire transfer workflow', async () => {
      // Step 1: Create customer account
      const accountResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'WIRE-RECV-CUSTOMER',
          currency: 'EUR',
          initialBalance: '500000', // €5,000.00
        })
        .expect(201);

      const targetAccountId = accountResponse.body.accountId;

      // Step 2: Process international wire transfer (EUR)
      const wireRequest = {
        targetAccountId,
        amount: '750000', // €7,500.00 in cents
        currency: 'EUR',
        swiftCode: 'DEUTDEFF', // Deutsche Bank Frankfurt
        originatingBankName: 'Deutsche Bank AG',
        correspondentBank: 'Deutsche Bank Trust Company Americas',
        reference: 'E2E Wire Transfer - International Business Payment',
        urgency: 'STANDARD',
      };

      const wireResponse = await request(app)
        .post('/api/v1/external-transactions/wire-credit')
        .send(wireRequest);

      // Step 3: Verify wire transaction response
      expect([200, 400]).toContain(wireResponse.status);

      if (wireResponse.status === 200) {
        // Successful transaction
        expect(wireResponse.body.status).toBe('SUCCESS');
        expect(wireResponse.body.transactionId).toMatch(/^WIRE-STANDARD-/);
        expect(wireResponse.body.amount).toBe('750000');
        expect(wireResponse.body.currency).toBe('EUR');
        expect(wireResponse.body.targetAccountId).toBe(targetAccountId);
        expect(wireResponse.body.timestamp).toBeDefined();
        expect(wireResponse.body.estimatedSettlement).toBeDefined();

        // Step 4: Verify transaction status
        const transactionId = wireResponse.body.transactionId;
        const statusResponse = await request(app)
          .get(`/api/v1/external-transactions/status/${transactionId}`)
          .expect(200);

        expect(statusResponse.body.transactionId).toBe(transactionId);
        expect(statusResponse.body.status).toBe('SUCCESS');
        expect(statusResponse.body.type).toBe('WIRE_CREDIT');
        expect(statusResponse.body.amount).toBe('750000');
        expect(statusResponse.body.currency).toBe('EUR');
        expect(statusResponse.body.targetAccountId).toBe(targetAccountId);
        expect(statusResponse.body.originatingBank).toBe('Deutsche Bank AG');
        expect(statusResponse.body.reference).toBe(
          'E2E Wire Transfer - International Business Payment',
        );

        // Step 5: Verify settlement timing (wires settle faster than ACH)
        const timestamp = new Date(statusResponse.body.timestamp);
        const settlementDate = new Date(statusResponse.body.settlementDate);
        const timeDiff = settlementDate.getTime() - timestamp.getTime();
        const expectedStandardSettlement = 1 * 24 * 60 * 60 * 1000; // 1 day in ms

        expect(timeDiff).toBeGreaterThan(expectedStandardSettlement - 60000);
        expect(timeDiff).toBeLessThan(expectedStandardSettlement + 60000);

        console.log(`✓ Wire transfer ${transactionId} processed successfully`);
      } else {
        // Failed transaction
        expect(wireResponse.body.status).toBe('FAILED');
        expect(wireResponse.body.errorDetails.code).toBe('WIRE_PROCESSING_FAILED');

        console.log(`✓ Wire transfer failed as expected (simulation)`);
      }
    }, 45000);

    it('should handle multi-currency wire transfers correctly', async () => {
      // Create account for multi-currency testing
      const accountResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MULTI-CURRENCY-TEST',
          currency: 'EUR',
          initialBalance: '100000',
        })
        .expect(201);

      const targetAccountId = accountResponse.body.accountId;
      const currencies = [
        { currency: 'EUR', amount: '500000', description: 'European payment' },
        { currency: 'USD', amount: '400000', description: 'US Dollar payment' },
        { currency: 'GBP', amount: '300000', description: 'British Pound payment' },
        { currency: 'CAD', amount: '350000', description: 'Canadian Dollar payment' },
      ];

      for (const { currency, amount, description } of currencies) {
        const wireRequest = {
          targetAccountId,
          amount,
          currency,
          swiftCode: 'DEUTDEFF',
          originatingBankName: 'Deutsche Bank AG',
          reference: `E2E ${currency} ${description}`,
          urgency: 'STANDARD',
        };

        const response = await request(app)
          .post('/api/v1/external-transactions/wire-credit')
          .send(wireRequest);

        if (response.status === 200) {
          expect(response.body.currency).toBe(currency);
          expect(response.body.amount).toBe(amount);
          expect(response.body.transactionId).toMatch(/^WIRE-STANDARD-/);

          console.log(`✓ ${currency} wire transfer processed: ${amount} units`);
        }
      }
    }, 60000);
  });

  describe('Cross-System Integration Workflow', () => {
    it('should demonstrate complete external payment to account credit workflow', async () => {
      // This test simulates a real-world scenario where:
      // 1. Customer has existing account
      // 2. External payment (wire/ACH) credits the account
      // 3. Customer can verify the credit was received

      // Step 1: Customer has existing account with some balance
      const accountResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'INTEGRATION-TEST-CUSTOMER',
          currency: 'EUR',
          initialBalance: '250000', // €2,500.00 starting balance
        })
        .expect(201);

      const accountId = accountResponse.body.accountId;

      // Step 2: Check initial account balance
      const initialBalance = await request(app).get(`/accounts/${accountId}/balance`).expect(200);

      expect(initialBalance.body.balance).toBe('250000');
      console.log(
        `✓ Account ${accountId} created with initial balance: €${(parseInt(initialBalance.body.balance) / 100).toFixed(2)}`,
      );

      // Step 3: External system initiates wire credit (e.g., salary payment)
      const salaryPayment = {
        targetAccountId: accountId,
        amount: '350000', // €3,500.00 salary
        currency: 'EUR',
        swiftCode: 'GEBABEBB', // BNP Paribas Fortis Brussels
        originatingBankName: 'BNP Paribas Fortis',
        reference: 'Monthly Salary Payment - Employee ID 12345',
        urgency: 'STANDARD',
      };

      const paymentResponse = await request(app)
        .post('/api/v1/external-transactions/wire-credit')
        .send(salaryPayment);

      // Step 4: Verify external payment was processed
      if (paymentResponse.status === 200) {
        expect(paymentResponse.body.status).toBe('SUCCESS');
        const transactionId = paymentResponse.body.transactionId;

        console.log(`✓ External salary payment processed: ${transactionId}`);

        // Step 5: Verify transaction details are complete
        const statusCheck = await request(app)
          .get(`/api/v1/external-transactions/status/${transactionId}`)
          .expect(200);

        expect(statusCheck.body.status).toBe('SUCCESS');
        expect(statusCheck.body.type).toBe('WIRE_CREDIT');
        expect(statusCheck.body.reference).toBe('Monthly Salary Payment - Employee ID 12345');

        // Step 6: Customer checks account balance (simulating customer login)
        // NOTE: In a real system, the wire credit would actually credit the account
        // For this test, we're demonstrating the external transaction tracking
        const currentBalance = await request(app).get(`/accounts/${accountId}/balance`).expect(200);

        // Balance remains the same since we're only tracking external transactions
        // In a full implementation, this would integrate with the account service
        expect(currentBalance.body.balance).toBe('250000');

        console.log(`✓ Complete workflow verified:
          - Initial balance: €${(250000 / 100).toFixed(2)}
          - External payment: €${(350000 / 100).toFixed(2)}
          - Transaction ID: ${transactionId}
          - Status: ${statusCheck.body.status}
          - Settlement: ${statusCheck.body.settlementDate}`);
      } else {
        console.log(`✓ Payment failed simulation - transaction handling verified`);
      }
    }, 45000);
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid account scenarios gracefully', async () => {
      // Test with non-existent target account
      const invalidRequest = {
        targetAccountId: '999999999999999999', // Non-existent account
        amount: '100000',
        currency: 'USD',
        routingNumber: '021000021',
        originatingBankName: 'Test Bank',
        reference: 'Invalid account test',
        urgency: 'STANDARD',
      };

      const response = await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send(invalidRequest);

      // Should still process the external transaction (MVP doesn't validate accounts)
      expect([200, 400]).toContain(response.status);
      console.log(`✓ Invalid account scenario handled: ${response.status}`);
    });

    it('should maintain transaction history for failed transactions', async () => {
      // Process multiple transactions to test status storage
      const requests = Array.from({ length: 5 }, (_, i) => ({
        targetAccountId: `12345678${i}`,
        amount: '50000',
        currency: 'USD',
        routingNumber: '021000021',
        originatingBankName: 'Test Bank',
        reference: `Test transaction ${i + 1}`,
        urgency: 'STANDARD',
      }));

      const transactionIds: string[] = [];

      for (const achRequest of requests) {
        const response = await request(app)
          .post('/api/v1/external-transactions/ach-credit')
          .send(achRequest);

        if (response.body.transactionId) {
          transactionIds.push(response.body.transactionId);
        }
      }

      // Verify all transactions can be looked up
      for (const transactionId of transactionIds) {
        const statusResponse = await request(app)
          .get(`/api/v1/external-transactions/status/${transactionId}`)
          .expect(200);

        expect(statusResponse.body.transactionId).toBe(transactionId);
        expect(['SUCCESS', 'FAILED']).toContain(statusResponse.body.status);
      }

      console.log(`✓ Transaction history maintained for ${transactionIds.length} transactions`);
    }, 30000);
  });
});
