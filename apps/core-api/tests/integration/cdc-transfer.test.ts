import { DatabaseConnection } from '@core-poc/core-services';
import express from 'express';
import request from 'supertest';

import { AccountController } from '../../src/controllers/account.controller';
import { validateRequest, errorHandler } from '../../src/middleware/validation';
import { ServiceContainer } from '../../src/services/factory.js';
import { CreateAccountSchema, TransferSchema } from '../../src/validation/schemas';
import { resetTestData, waitForTransferRecord } from '../helpers/test-setup.js';
import { getGlobalTestServices } from '../setup.js';

describe('CDC Transfer Integration', () => {
  let services: ServiceContainer;
  let app: express.Application;
  let database: DatabaseConnection;

  beforeAll(async () => {
    // Use global test services
    services = getGlobalTestServices();
    database = DatabaseConnection.getInstance();

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
    await resetTestData();
  });

  describe('CDC Transfer Flow', () => {
    it('should create PostgreSQL transfer record via CDC when transfer occurs in TigerBeetle', async () => {
      // 1. Create two accounts
      const fromAccountResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'CUSTOMER-ABC-123',
          currency: 'EUR',
          initialBalance: '100000', // $1000.00
        })
        .expect(201);

      const toAccountResponse = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'CUSTOMER-XYZ-456',
          currency: 'EUR',
          initialBalance: '50000', // $500.00
        })
        .expect(201);

      const fromAccountId = fromAccountResponse.body.accountId;
      const toAccountId = toAccountResponse.body.accountId;

      // 2. Verify initial balances in TigerBeetle
      const initialFromBalance = await request(app)
        .get(`/accounts/${fromAccountId}/balance`)
        .expect(200);

      const initialToBalance = await request(app)
        .get(`/accounts/${toAccountId}/balance`)
        .expect(200);

      expect(initialFromBalance.body.balance).toBe('100000');
      expect(initialToBalance.body.balance).toBe('50000');

      // 3. Verify no transfer records exist in PostgreSQL initially
      const initialTransferCount = await database.query('SELECT COUNT(*) as count FROM transfers');
      expect(parseInt(initialTransferCount.rows[0].count)).toBe(0);

      // 4. Perform transfer
      const transferAmount = '25000'; // $250.00
      const transferResponse = await request(app)
        .post('/transfers')
        .send({
          fromAccountId,
          toAccountId,
          amount: transferAmount,
          currency: 'EUR',
        })
        .expect(201);

      const transferId = transferResponse.body.transferId;

      // 5. Verify balances updated in TigerBeetle
      const updatedFromBalance = await request(app)
        .get(`/accounts/${fromAccountId}/balance`)
        .expect(200);

      const updatedToBalance = await request(app)
        .get(`/accounts/${toAccountId}/balance`)
        .expect(200);

      expect(updatedFromBalance.body.balance).toBe('75000'); // 100000 - 25000
      expect(updatedToBalance.body.balance).toBe('75000'); // 50000 + 25000

      // 6. Wait for CDC event processing to create PostgreSQL record
      const transferRecordExists = await waitForTransferRecord(transferId);
      expect(transferRecordExists).toBe(true);

      // 7. Verify transfer record was created in PostgreSQL via CDC
      const transferRecords = await database.query(
        'SELECT * FROM transfers WHERE transfer_id = $1',
        [transferId],
      );

      expect(transferRecords.rows).toHaveLength(1);

      const transferRecord = transferRecords.rows[0];
      expect(transferRecord.transfer_id).toBe(transferId);
      expect(transferRecord.from_account_id).toBe(fromAccountId);
      expect(transferRecord.to_account_id).toBe(toAccountId);
      expect(transferRecord.amount).toBe(transferAmount);
      expect(transferRecord.currency).toBe('EUR');
      expect(transferRecord.description).toBe('Customer transfer');
      expect(transferRecord.created_at).toBeDefined();

      // 8. Verify total transfer count increased
      const finalTransferCount = await database.query('SELECT COUNT(*) as count FROM transfers');
      expect(parseInt(finalTransferCount.rows[0].count)).toBe(1);
    }, 15000);

    it('should handle multiple transfers correctly via CDC', async () => {
      // Create accounts
      const account1Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MULTI-1',
          currency: 'EUR',
          initialBalance: '200000',
        })
        .expect(201);

      const account2Response = await request(app)
        .post('/accounts')
        .send({
          type: 'DEPOSIT',
          customerId: 'MULTI-2',
          currency: 'EUR',
          initialBalance: '100000',
        })
        .expect(201);

      const account1Id = account1Response.body.accountId;
      const account2Id = account2Response.body.accountId;

      // Perform multiple transfers
      await request(app)
        .post('/transfers')
        .send({
          fromAccountId: account1Id,
          toAccountId: account2Id,
          amount: '50000',
          currency: 'EUR',
        })
        .expect(201);

      await request(app)
        .post('/transfers')
        .send({
          fromAccountId: account2Id,
          toAccountId: account1Id,
          amount: '25000',
          currency: 'EUR',
        })
        .expect(201);

      // Wait for CDC processing - check for both transfers
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify both transfers recorded in PostgreSQL
      const transferRecords = await database.query(
        'SELECT * FROM transfers WHERE from_account_id IN ($1, $2) OR to_account_id IN ($1, $2) ORDER BY created_at',
        [account1Id, account2Id],
      );

      expect(transferRecords.rows).toHaveLength(2);

      // First transfer: account1 -> account2 (50000)
      expect(transferRecords.rows[0].from_account_id).toBe(account1Id);
      expect(transferRecords.rows[0].to_account_id).toBe(account2Id);
      expect(transferRecords.rows[0].amount).toBe('50000');

      // Second transfer: account2 -> account1 (25000)
      expect(transferRecords.rows[1].from_account_id).toBe(account2Id);
      expect(transferRecords.rows[1].to_account_id).toBe(account1Id);
      expect(transferRecords.rows[1].amount).toBe('25000');
    }, 20000);
  });

  describe('CDC Health Check', () => {
    it('should verify CDC manager is connected', () => {
      // Verify CDC manager is initialized and connected
      expect(services.cdcManager.isConnected).toBe(true);
    });
  });
});
