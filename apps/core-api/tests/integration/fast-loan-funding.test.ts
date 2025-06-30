import { Money, CustomerId } from '@core-poc/core-services';
import express from 'express';
import request from 'supertest';

import { LoanFundingController } from '../../src/controllers/loan-funding.controller.js';
import { validateRequest, errorHandler } from '../../src/middleware/validation.js';
import { LoanDisbursementSchema, LoanIdParamSchema } from '../../src/validation/schemas.js';
import {
  createTestServicesWithMocks,
  MockServiceContainer,
} from '../mocks/mock-service-factory.js';

describe('Fast Loan Funding Tests (Mock Services)', () => {
  let services: MockServiceContainer;
  let app: express.Application;

  beforeAll(async () => {
    // Use mock services for fast testing
    services = await createTestServicesWithMocks();

    const loanFundingController = new LoanFundingController(services.loanService);

    app = express();
    app.use(express.json());

    app.post(
      '/api/v1/loans/:loanId/disburse',
      validateRequest(LoanIdParamSchema, 'params'),
      validateRequest(LoanDisbursementSchema),
      loanFundingController.disburseLoan.bind(loanFundingController),
    );

    app.get(
      '/api/v1/loans/:loanId/funding-status',
      validateRequest(LoanIdParamSchema, 'params'),
      loanFundingController.getFundingStatus.bind(loanFundingController),
    );

    app.use(errorHandler);
  });

  beforeEach(async () => {
    // Reset mock state
    services.tigerBeetleService.reset();
  });

  describe('POST /api/v1/loans/:loanId/disburse', () => {
    it('should validate request parameters', async () => {
      // Test missing targetAccountId
      await request(app)
        .post('/api/v1/loans/123456789/disburse')
        .send({
          amount: '1000',
          description: 'Missing target account',
        })
        .expect(400);

      // Test invalid amount format
      await request(app)
        .post('/api/v1/loans/123456789/disburse')
        .send({
          targetAccountId: '987654321',
          amount: 'invalid-amount',
          description: 'Invalid amount',
        })
        .expect(400);

      // Test invalid loan ID format
      await request(app)
        .post('/api/v1/loans/invalid-loan-id/disburse')
        .send({
          targetAccountId: '987654321',
          amount: '1000',
          description: 'Invalid loan ID',
        })
        .expect(400);
    });

    it('should fail when loan account does not exist', async () => {
      const nonExistentLoanId = '999999999999999999';

      const response = await request(app)
        .post(`/api/v1/loans/${nonExistentLoanId}/disburse`)
        .send({
          targetAccountId: '123456789',
          amount: '50000',
          description: 'Test disbursement',
        })
        .expect(404);

      expect(response.body.status).toBe('FAILED');
      expect(response.body.errorDetails.code).toBe('LOAN_NOT_FOUND');
    });

    it('should successfully disburse funds from loan to target account', async () => {
      // Create a proper loan with payment plan using the loan service
      const testCustomerId = 'CUSTOMER-DISBURSE-TEST';

      // First create a deposit account to receive the disbursement
      const depositId = await services.tigerBeetleService.createAccount({
        type: 'DEPOSIT',
        customerId: testCustomerId,
        currency: 'EUR',
        initialBalance: 0n,
      });

      // Create a loan with payment plan using the loan service
      const loanAccount = await services.loanService.createLoanWithPaymentPlan({
        customerId: new CustomerId(testCustomerId),
        currency: 'EUR',
        principalAmount: new Money(10000000n, 'EUR'), // 100,000.00 EUR in cents
        interestRate: 5.5,
        termMonths: 60,
        loanType: 'ANNUITY',
        paymentFrequency: 'MONTHLY',
        fees: [],
        accountName: 'Test Loan for Disbursement',
      });

      // THIS TEST SHOULD FAIL - we expect success but haven't implemented the disbursement logic yet
      const response = await request(app)
        .post(`/api/v1/loans/${loanAccount.accountId.toString()}/disburse`)
        .send({
          targetAccountId: depositId.toString(),
          amount: '5000000', // 50,000.00 EUR
          description: 'Loan disbursement test',
        })
        .expect(200);

      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.disbursedAmount).toBe('5000000');
      expect(response.body.targetAccountId).toBe(depositId.toString());
      expect(response.body.loanAccountId).toBe(loanAccount.accountId.toString());
      expect(response.body.transferId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      // Verify balances were updated
      const loanBalance = await services.tigerBeetleService.getAccountBalance(
        loanAccount.accountId.value,
      );
      const depositBalance = await services.tigerBeetleService.getAccountBalance(depositId);

      expect(loanBalance.balance).toBe(5000000n); // 50k remaining
      expect(depositBalance.balance).toBe(5000000n); // 50k received
    });

    it('should fail when target account does not exist', async () => {
      // Create a proper loan with payment plan
      const testCustomerId = 'CUSTOMER-TEST-TARGET-FAIL';
      const loanAccount = await services.loanService.createLoanWithPaymentPlan({
        customerId: new CustomerId(testCustomerId),
        currency: 'EUR',
        principalAmount: new Money(10000000n, 'EUR'),
        interestRate: 5.5,
        termMonths: 60,
        loanType: 'ANNUITY',
        paymentFrequency: 'MONTHLY',
        fees: [],
        accountName: 'Test Loan for Failed Target',
      });

      const nonExistentAccountId = '888888888888888888';

      const response = await request(app)
        .post(`/api/v1/loans/${loanAccount.accountId.toString()}/disburse`)
        .send({
          targetAccountId: nonExistentAccountId,
          amount: '50000',
          description: 'Test disbursement',
        })
        .expect(404);

      expect(response.body.status).toBe('FAILED');
    });
  });

  describe('GET /api/v1/loans/:loanId/funding-status', () => {
    it('should fail when loan does not exist', async () => {
      const nonExistentLoanId = '777777777777777777';

      const response = await request(app)
        .get(`/api/v1/loans/${nonExistentLoanId}/funding-status`)
        .expect(404);

      expect(response.body.error.code).toBe('LOAN_NOT_FOUND');
    });

    it('should return loan funding status for existing loan', async () => {
      // Create a proper loan with payment plan for status testing
      const testCustomerId = 'CUSTOMER-STATUS-TEST';
      const loanAccount = await services.loanService.createLoanWithPaymentPlan({
        customerId: new CustomerId(testCustomerId),
        currency: 'EUR',
        principalAmount: new Money(5000000n, 'EUR'), // 50,000.00 EUR
        interestRate: 5.5,
        termMonths: 60,
        loanType: 'ANNUITY',
        paymentFrequency: 'MONTHLY',
        fees: [],
        accountName: 'Status Test Loan',
      });

      const response = await request(app)
        .get(`/api/v1/loans/${loanAccount.accountId.toString()}/funding-status`)
        .expect(200);

      expect(response.body.loanId).toBe(loanAccount.accountId.toString());
      expect(response.body.totalLoanAmount).toBeDefined();
      expect(response.body.principalAmount).toBeDefined();
      expect(response.body.monthlyPayment).toBeDefined();
      expect(response.body.remainingPayments).toBeDefined();
      expect(response.body.loanType).toBe('ANNUITY');
      expect(response.body.paymentFrequency).toBe('MONTHLY');
      expect(response.body.interestRate).toBe(5.5);
      expect(response.body.nextPaymentDate).toBeDefined();
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.lastChecked).toBeDefined();
    });
  });
});
