import express from 'express';
import request from 'supertest';

import { AccountController } from '../../src/controllers/account.controller.js';
import { validateRequest, errorHandler } from '../../src/middleware/validation.js';
import { CreateAccountSchema, TransferSchema } from '../../src/validation/schemas.js';
import {
  createTestServicesWithMocks,
  MockServiceContainer,
} from '../mocks/mock-service-factory.js';

describe('Fast Banking Workflows (Mock Services)', () => {
  let services: MockServiceContainer;
  let app: express.Application;

  beforeAll(async () => {
    // Use mock services for fast testing
    services = await createTestServicesWithMocks();

    const accountController = new AccountController(
      services.accountService,
      services.loanService,
      services.transferRepository,
    );

    app = express();
    app.use(express.json());

    app.post(
      '/accounts',
      validateRequest(CreateAccountSchema),
      accountController.createAccount.bind(accountController),
    );
    app.post(
      '/transfers',
      validateRequest(TransferSchema),
      accountController.transfer.bind(accountController),
    );
    app.get(
      '/accounts/:accountId/balance',
      accountController.getAccountBalance.bind(accountController),
    );

    app.use(errorHandler);
  });

  beforeEach(async () => {
    // Reset mock state only - no database access needed for fast tests
    services.tigerBeetleService.reset();
    services.cdcManager.clearEvents();
  });

  describe('Account Creation and Transfers', () => {
    it('should create accounts and perform transfers quickly', async () => {
      // Create account 1
      const account1Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'FAST-CUSTOMER-1',
          currency: 'EUR',
          initialBalance: '100000', // $1000.00
        })
        .expect(201);

      const account1Id = account1Response.body.accountId;

      // Create account 2
      const account2Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'FAST-CUSTOMER-2',
          currency: 'EUR',
          initialBalance: '50000', // $500.00
        })
        .expect(201);

      const account2Id = account2Response.body.accountId;

      // Verify initial balances
      const balance1 = await request(app).get(`/accounts/${account1Id}/balance`).expect(200);

      const balance2 = await request(app).get(`/accounts/${account2Id}/balance`).expect(200);

      expect(balance1.body.balance).toBe('100000');
      expect(balance2.body.balance).toBe('50000');

      // Perform transfer
      await request(app)
        .post('/transfers')
        .send({
          fromAccountId: account1Id,
          toAccountId: account2Id,
          amount: '25000', // $250.00
          currency: 'EUR',
        })
        .expect(201);

      // Verify balances after transfer
      const updatedBalance1 = await request(app).get(`/accounts/${account1Id}/balance`).expect(200);

      const updatedBalance2 = await request(app).get(`/accounts/${account2Id}/balance`).expect(200);

      expect(updatedBalance1.body.balance).toBe('75000'); // 100000 - 25000
      expect(updatedBalance2.body.balance).toBe('75000'); // 50000 + 25000

      // Verify mock service state
      expect(services.tigerBeetleService.getAccountCount()).toBe(2);
      expect(services.tigerBeetleService.getTransferCount()).toBe(1);
    });

    it('should handle multiple rapid transfers', async () => {
      // Create test accounts
      const account1Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MULTI-CUSTOMER-1',
          currency: 'EUR',
          initialBalance: '1000000', // $10,000.00
        })
        .expect(201);

      const account2Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MULTI-CUSTOMER-2',
          currency: 'EUR',
          initialBalance: '500000', // $5,000.00
        })
        .expect(201);

      const account1Id = account1Response.body.accountId;
      const account2Id = account2Response.body.accountId;

      // Perform multiple transfers rapidly
      const transferPromises: Promise<any>[] = [];
      for (let i = 0; i < 5; i++) {
        transferPromises.push(
          request(app)
            .post('/transfers')
            .send({
              fromAccountId: account1Id,
              toAccountId: account2Id,
              amount: '10000', // $100.00 each
              currency: 'EUR',
            })
            .expect(201),
        );
      }

      await Promise.all(transferPromises);

      // Verify final balances
      const finalBalance1 = await request(app).get(`/accounts/${account1Id}/balance`).expect(200);

      const finalBalance2 = await request(app).get(`/accounts/${account2Id}/balance`).expect(200);

      expect(finalBalance1.body.balance).toBe('950000'); // 1000000 - (5 * 10000)
      expect(finalBalance2.body.balance).toBe('550000'); // 500000 + (5 * 10000)

      // Verify all transfers were recorded
      expect(services.tigerBeetleService.getTransferCount()).toBe(5);
    });

    it('should validate insufficient funds', async () => {
      // Create account with limited balance
      const accountResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'LOW-BALANCE-CUSTOMER',
          currency: 'EUR',
          initialBalance: '1000', // $10.00
        })
        .expect(201);

      const account2Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'RECIPIENT-CUSTOMER',
          currency: 'EUR',
          initialBalance: '0',
        })
        .expect(201);

      const fromAccountId = accountResponse.body.accountId;
      const toAccountId = account2Response.body.accountId;

      // Try to transfer more than available
      await request(app)
        .post('/transfers')
        .send({
          fromAccountId,
          toAccountId,
          amount: '2000', // $20.00 - more than available
          currency: 'EUR',
        })
        .expect(500); // Should fail due to insufficient funds

      // Verify balance unchanged
      const balance = await request(app).get(`/accounts/${fromAccountId}/balance`).expect(200);

      expect(balance.body.balance).toBe('1000'); // Unchanged
      expect(services.tigerBeetleService.getTransferCount()).toBe(0); // No transfers
    });
  });

  describe('CDC Events (Mock)', () => {
    it('should simulate CDC events synchronously', async () => {
      // Create accounts and transfer
      const account1Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'CDC-TEST-1',
          currency: 'EUR',
          initialBalance: '100000',
        })
        .expect(201);

      const account2Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'CDC-TEST-2',
          currency: 'EUR',
          initialBalance: '50000',
        })
        .expect(201);

      const transferResponse = await request(app)
        .post('/transfers')
        .send({
          fromAccountId: account1Response.body.accountId,
          toAccountId: account2Response.body.accountId,
          amount: '25000',
          currency: 'EUR',
        })
        .expect(201);

      const transferId = transferResponse.body.transferId;

      // Simulate CDC event (in real system, this would come from TigerBeetle CDC)
      await services.cdcManager.simulateTransferEvent(
        transferId,
        account1Response.body.accountId,
        account2Response.body.accountId,
        '25000',
        'EUR',
      );

      // Verify CDC event was recorded
      const events = services.cdcManager.getEventsByType('transfer.created');
      expect(events).toHaveLength(1);
      expect(events[0].data.transfer_id).toBe(transferId);
      expect(events[0].data.amount).toBe('25000');
    });
  });
});
