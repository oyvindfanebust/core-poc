import express from 'express';
import request from 'supertest';

import { ExternalTransactionController } from '../../src/controllers/external-transaction.controller.js';
import { validateRequest, errorHandler } from '../../src/middleware/validation.js';
import {
  ACHCreditRequestSchema,
  WireCreditRequestSchema,
  TransactionIdParamSchema,
} from '../../src/validation/schemas.js';

describe('External Transaction Integration Tests', () => {
  let app: express.Application;
  let externalTransactionController: ExternalTransactionController;

  beforeAll(async () => {
    // Create controller for testing
    externalTransactionController = new ExternalTransactionController();

    // Set up test app
    app = express();
    app.use(express.json());

    // Set up routes
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

  describe('POST /api/v1/external-transactions/ach-credit', () => {
    it('should validate request parameters', async () => {
      // Test missing targetAccountId
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          amount: '5000000',
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank',
          reference: 'Test ACH transfer',
        })
        .expect(400);

      // Test invalid routing number format
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: '123456789',
          amount: '5000000',
          currency: 'USD',
          routingNumber: '12345', // Invalid - too short
          originatingBankName: 'JPMorgan Chase Bank',
          reference: 'Test ACH transfer',
        })
        .expect(400);

      // Test invalid currency (ACH is USD only)
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: '123456789',
          amount: '5000000',
          currency: 'EUR', // Invalid for ACH
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank',
          reference: 'Test ACH transfer',
        })
        .expect(400);

      // Test missing reference
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: '123456789',
          amount: '5000000',
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank',
        })
        .expect(400);
    });

    it('should process valid ACH credit requests', async () => {
      const achRequest = {
        targetAccountId: '123456789',
        amount: '5000000', // $50,000.00 in cents
        currency: 'USD',
        routingNumber: '021000021',
        originatingBankName: 'JPMorgan Chase Bank',
        reference: 'Test ACH credit transfer',
        urgency: 'STANDARD',
      };

      const response = await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send(achRequest);

      // Should be either success (200) or simulated failure (400)
      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.status).toBe('SUCCESS');
        expect(response.body.transactionId).toMatch(/^ACH-STANDARD-/);
        expect(response.body.amount).toBe('5000000');
        expect(response.body.currency).toBe('USD');
        expect(response.body.targetAccountId).toBe('123456789');
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.estimatedSettlement).toBeDefined();
      } else {
        expect(response.body.status).toBe('FAILED');
        expect(response.body.errorDetails).toBeDefined();
        expect(response.body.errorDetails.code).toBe('ACH_PROCESSING_FAILED');
      }
    });

    it('should handle different urgency levels', async () => {
      const urgencyLevels = ['STANDARD', 'SAME_DAY', 'EXPRESS'];

      for (const urgency of urgencyLevels) {
        const achRequest = {
          targetAccountId: '123456789',
          amount: '1000000', // $10,000.00
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank',
          reference: `Test ${urgency} ACH transfer`,
          urgency,
        };

        const response = await request(app)
          .post('/api/v1/external-transactions/ach-credit')
          .send(achRequest)
          .expect(res => expect([200, 400]).toContain(res.status));

        if (response.status === 200) {
          expect(response.body.transactionId).toMatch(new RegExp(`^ACH-${urgency}-`));
        }
      }
    });
  });

  describe('POST /api/v1/external-transactions/wire-credit', () => {
    it('should validate request parameters', async () => {
      // Test missing targetAccountId
      await request(app)
        .post('/api/v1/external-transactions/wire-credit')
        .send({
          amount: '10000000',
          currency: 'EUR',
          swiftCode: 'DEUTDEFF',
          originatingBankName: 'Deutsche Bank AG',
          reference: 'Test wire transfer',
        })
        .expect(400);

      // Test invalid SWIFT code format
      await request(app)
        .post('/api/v1/external-transactions/wire-credit')
        .send({
          targetAccountId: '123456789',
          amount: '10000000',
          currency: 'EUR',
          swiftCode: 'INVALID', // Invalid format
          originatingBankName: 'Deutsche Bank AG',
          reference: 'Test wire transfer',
        })
        .expect(400);

      // Test missing reference
      await request(app)
        .post('/api/v1/external-transactions/wire-credit')
        .send({
          targetAccountId: '123456789',
          amount: '10000000',
          currency: 'EUR',
          swiftCode: 'DEUTDEFF',
          originatingBankName: 'Deutsche Bank AG',
        })
        .expect(400);
    });

    it('should process valid wire credit requests', async () => {
      const wireRequest = {
        targetAccountId: '123456789',
        amount: '10000000', // €100,000.00 in cents
        currency: 'EUR',
        swiftCode: 'DEUTDEFF',
        originatingBankName: 'Deutsche Bank AG',
        reference: 'Test international wire transfer',
        urgency: 'STANDARD',
      };

      const response = await request(app)
        .post('/api/v1/external-transactions/wire-credit')
        .send(wireRequest);

      // Should be either success (200) or simulated failure (400)
      expect([200, 400]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.status).toBe('SUCCESS');
        expect(response.body.transactionId).toMatch(/^WIRE-STANDARD-/);
        expect(response.body.amount).toBe('10000000');
        expect(response.body.currency).toBe('EUR');
        expect(response.body.targetAccountId).toBe('123456789');
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.estimatedSettlement).toBeDefined();
      } else {
        expect(response.body.status).toBe('FAILED');
        expect(response.body.errorDetails).toBeDefined();
        expect(response.body.errorDetails.code).toBe('WIRE_PROCESSING_FAILED');
      }
    });

    it('should support multiple currencies', async () => {
      const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'CAD'];

      for (const currency of currencies) {
        const wireRequest = {
          targetAccountId: '123456789',
          amount: '5000000',
          currency,
          swiftCode: 'DEUTDEFF',
          originatingBankName: 'Deutsche Bank AG',
          reference: `Test ${currency} wire transfer`,
          urgency: 'STANDARD',
        };

        const response = await request(app)
          .post('/api/v1/external-transactions/wire-credit')
          .send(wireRequest)
          .expect(res => expect([200, 400]).toContain(res.status));

        if (response.status === 200) {
          expect(response.body.currency).toBe(currency);
        }
      }
    });

    it('should handle different urgency levels for wire transfers', async () => {
      const urgencyLevels = ['STANDARD', 'EXPRESS', 'PRIORITY'];

      for (const urgency of urgencyLevels) {
        const wireRequest = {
          targetAccountId: '123456789',
          amount: '2500000',
          currency: 'EUR',
          swiftCode: 'DEUTDEFF',
          originatingBankName: 'Deutsche Bank AG',
          reference: `Test ${urgency} wire transfer`,
          urgency,
        };

        const response = await request(app)
          .post('/api/v1/external-transactions/wire-credit')
          .send(wireRequest)
          .expect(res => expect([200, 400]).toContain(res.status));

        if (response.status === 200) {
          expect(response.body.transactionId).toMatch(new RegExp(`^WIRE-${urgency}-`));
        }
      }
    });
  });

  describe('GET /api/v1/external-transactions/status/:transactionId', () => {
    it('should return 404 for non-existent transaction', async () => {
      const nonExistentId = 'NON-EXISTENT-TRANSACTION-ID';

      const response = await request(app)
        .get(`/api/v1/external-transactions/status/${nonExistentId}`)
        .expect(404);

      expect(response.body.error.code).toBe('TRANSACTION_NOT_FOUND');
    });

    it('should return transaction status for valid transaction', async () => {
      // First create a transaction
      const achRequest = {
        targetAccountId: '123456789',
        amount: '2500000',
        currency: 'USD',
        routingNumber: '021000021',
        originatingBankName: 'JPMorgan Chase Bank',
        reference: 'Test status lookup',
        urgency: 'STANDARD',
      };

      const createResponse = await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send(achRequest);

      // Skip status check if creation failed (simulated failure)
      if (createResponse.status !== 200) return;

      const transactionId = createResponse.body.transactionId;

      // Now check the status
      const statusResponse = await request(app)
        .get(`/api/v1/external-transactions/status/${transactionId}`)
        .expect(200);

      expect(statusResponse.body.transactionId).toBe(transactionId);
      expect(statusResponse.body.status).toBe('SUCCESS');
      expect(statusResponse.body.type).toBe('ACH_CREDIT');
      expect(statusResponse.body.amount).toBe('2500000');
      expect(statusResponse.body.currency).toBe('USD');
      expect(statusResponse.body.targetAccountId).toBe('123456789');
      expect(statusResponse.body.originatingBank).toBe('JPMorgan Chase Bank');
      expect(statusResponse.body.reference).toBe('Test status lookup');
      expect(statusResponse.body.timestamp).toBeDefined();
      expect(statusResponse.body.settlementDate).toBeDefined();
    });

    it('should handle failed transaction status lookup', async () => {
      // Create a transaction that might fail
      const wireRequest = {
        targetAccountId: '123456789',
        amount: '1000000',
        currency: 'EUR',
        swiftCode: 'DEUTDEFF',
        originatingBankName: 'Deutsche Bank AG',
        reference: 'Test failed status lookup',
        urgency: 'STANDARD',
      };

      const createResponse = await request(app)
        .post('/api/v1/external-transactions/wire-credit')
        .send(wireRequest);

      // This test handles both success and failure cases
      if (createResponse.status === 400) {
        // Transaction failed, check it was stored
        const transactionId = createResponse.body.transactionId;
        if (transactionId) {
          const statusResponse = await request(app)
            .get(`/api/v1/external-transactions/status/${transactionId}`)
            .expect(200);

          expect(statusResponse.body.status).toBe('FAILED');
          expect(statusResponse.body.errorDetails).toBeDefined();
        }
      } else if (createResponse.status === 200) {
        // Transaction succeeded, verify status
        const transactionId = createResponse.body.transactionId;
        const statusResponse = await request(app)
          .get(`/api/v1/external-transactions/status/${transactionId}`)
          .expect(200);

        expect(statusResponse.body.status).toBe('SUCCESS');
        expect(statusResponse.body.type).toBe('WIRE_CREDIT');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON requests', async () => {
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express error handler should catch this
    });

    it('should validate account ID format', async () => {
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: 'invalid-account-id',
          amount: '5000000',
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank',
          reference: 'Test invalid account',
        })
        .expect(400);
    });

    it('should validate amount format', async () => {
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: '123456789',
          amount: 'invalid-amount',
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank',
          reference: 'Test invalid amount',
        })
        .expect(400);
    });
  });

  describe('Business Logic Validation', () => {
    it('should reject zero or negative amounts', async () => {
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: '123456789',
          amount: '0',
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank',
          reference: 'Test zero amount',
        })
        .expect(400);

      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: '123456789',
          amount: '-1000',
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: 'JPMorgan Chase Bank',
          reference: 'Test negative amount',
        })
        .expect(400);
    });

    it('should enforce reference length limits', async () => {
      const longReference = 'x'.repeat(141); // Exceeds 140 char limit for wire transfers

      await request(app)
        .post('/api/v1/external-transactions/wire-credit')
        .send({
          targetAccountId: '123456789',
          amount: '5000000',
          currency: 'EUR',
          swiftCode: 'DEUTDEFF',
          originatingBankName: 'Deutsche Bank AG',
          reference: longReference,
        })
        .expect(400);
    });

    it('should enforce bank name requirements', async () => {
      // Empty bank name
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: '123456789',
          amount: '5000000',
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: '',
          reference: 'Test empty bank name',
        })
        .expect(400);

      // Bank name too long
      const longBankName = 'x'.repeat(101);
      await request(app)
        .post('/api/v1/external-transactions/ach-credit')
        .send({
          targetAccountId: '123456789',
          amount: '5000000',
          currency: 'USD',
          routingNumber: '021000021',
          originatingBankName: longBankName,
          reference: 'Test long bank name',
        })
        .expect(400);
    });
  });
});
