import request from 'supertest';

import createApp from '../../src/app.js';
import { ServiceFactory } from '../../src/services/factory.js';

describe('Loan Funding Integration Tests', () => {
  let app;
  let services;
  let testCustomerId;
  let testLoanAccountId;
  let testDepositAccountId;

  beforeAll(async () => {
    // Initialize app and services
    app = await createApp();
    services = await ServiceFactory.createServices();
    testCustomerId = 'CUSTOMER-TEST-LOAN-123';

    // Create test accounts
    testDepositAccountId = (
      await services.accountService.createDepositAccount(
        testCustomerId,
        'EUR',
        BigInt(0),
        'Test Deposit Account',
      )
    ).toString();

    testLoanAccountId = (
      await services.accountService.createLoanAccount(
        testCustomerId,
        'EUR',
        BigInt(10000000), // 100,000.00 EUR in cents
        'Test Loan Account',
      )
    ).toString();
  });

  afterAll(async () => {
    await ServiceFactory.cleanup();
  });

  describe('POST /api/v1/loans/:loanId/disburse', () => {
    it('should fail when loan account does not exist', async () => {
      const nonExistentLoanId = '999999999999999999';

      const response = await request(app)
        .post(`/api/v1/loans/${nonExistentLoanId}/disburse`)
        .send({
          targetAccountId: testDepositAccountId,
          amount: '50000', // 500.00 EUR
          description: 'Test disbursement',
        })
        .expect(404);

      expect(response.body.status).toBe('FAILED');
      expect(response.body.errorDetails.code).toBe('LOAN_NOT_FOUND');
    });

    it('should fail when target account does not exist', async () => {
      const nonExistentAccountId = '888888888888888888';

      const response = await request(app)
        .post(`/api/v1/loans/${testLoanAccountId}/disburse`)
        .send({
          targetAccountId: nonExistentAccountId,
          amount: '50000',
          description: 'Test disbursement',
        })
        .expect(404);

      expect(response.body.status).toBe('FAILED');
    });

    it('should fail when disbursement amount exceeds loan balance', async () => {
      const response = await request(app)
        .post(`/api/v1/loans/${testLoanAccountId}/disburse`)
        .send({
          targetAccountId: testDepositAccountId,
          amount: '20000000', // 200,000.00 EUR (more than loan balance)
          description: 'Test excessive disbursement',
        })
        .expect(400);

      expect(response.body.status).toBe('FAILED');
      expect(response.body.errorDetails.code).toBe('INSUFFICIENT_FUNDS');
    });

    it('should successfully disburse partial loan amount', async () => {
      const disbursementAmount = '5000000'; // 50,000.00 EUR

      const response = await request(app)
        .post(`/api/v1/loans/${testLoanAccountId}/disburse`)
        .send({
          targetAccountId: testDepositAccountId,
          amount: disbursementAmount,
          description: 'Partial loan disbursement',
        })
        .expect(200);

      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.disbursedAmount).toBe(disbursementAmount);
      expect(response.body.targetAccountId).toBe(testDepositAccountId);
      expect(response.body.loanAccountId).toBe(testLoanAccountId);
      expect(response.body.transferId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();

      // Verify the target account received the funds
      const depositBalance = await services.accountService.getAccountBalance(
        BigInt(testDepositAccountId),
      );
      expect(depositBalance.balance).toBe(BigInt(disbursementAmount));
    });

    it('should successfully disburse remaining loan amount without specifying amount', async () => {
      const response = await request(app)
        .post(`/api/v1/loans/${testLoanAccountId}/disburse`)
        .send({
          targetAccountId: testDepositAccountId,
          description: 'Full remaining disbursement',
        })
        .expect(200);

      expect(response.body.status).toBe('SUCCESS');
      expect(response.body.transferId).toBeDefined();

      // Verify loan account is now empty
      const loanBalance = await services.accountService.getAccountBalance(
        BigInt(testLoanAccountId),
      );
      expect(loanBalance.balance).toBe(BigInt(0));
    });

    it('should fail when trying to disburse from empty loan', async () => {
      const response = await request(app)
        .post(`/api/v1/loans/${testLoanAccountId}/disburse`)
        .send({
          targetAccountId: testDepositAccountId,
          amount: '1000',
          description: 'Attempt disbursement from empty loan',
        })
        .expect(400);

      expect(response.body.status).toBe('FAILED');
      expect(response.body.errorDetails.code).toBe('INSUFFICIENT_FUNDS');
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
      // Create a new loan with payment plan for this test
      const newTestCustomerId = 'CUSTOMER-LOAN-STATUS-TEST';
      // Create deposit account but not used in this test
      await services.accountService.createDepositAccount(
        newTestCustomerId,
        'EUR',
        BigInt(0),
        'Status Test Deposit',
      );

      const newLoanAccountId = (
        await services.accountService.createLoanAccount(
          newTestCustomerId,
          'EUR',
          BigInt(5000000), // 50,000.00 EUR
          'Status Test Loan',
        )
      ).toString();

      // Create a payment plan for the loan (this is required for funding status)
      await services.loanService.createLoanWithPaymentPlan({
        customerId: { value: newTestCustomerId },
        currency: 'EUR',
        principalAmount: {
          amount: BigInt(5000000),
          currency: 'EUR',
          toString: () => '50000.00 EUR',
        },
        interestRate: 5.5,
        termMonths: 60,
        loanType: 'ANNUITY',
        paymentFrequency: 'MONTHLY',
        fees: [],
        accountName: 'Status Test Loan',
      });

      const response = await request(app)
        .get(`/api/v1/loans/${newLoanAccountId}/funding-status`)
        .expect(200);

      expect(response.body.loanId).toBe(newLoanAccountId);
      expect(response.body.totalLoanAmount).toBeDefined();
      expect(response.body.principalAmount).toBeDefined();
      expect(response.body.monthlyPayment).toBeDefined();
      expect(response.body.remainingPayments).toBeDefined();
      expect(response.body.loanType).toBeDefined();
      expect(response.body.paymentFrequency).toBeDefined();
      expect(response.body.interestRate).toBeDefined();
      expect(response.body.nextPaymentDate).toBeDefined();
      expect(response.body.status).toBeDefined();
      expect(response.body.lastChecked).toBeDefined();
    });
  });

  describe('Loan Disbursement Validation', () => {
    it('should validate request parameters', async () => {
      // Test missing targetAccountId
      await request(app)
        .post(`/api/v1/loans/${testLoanAccountId}/disburse`)
        .send({
          amount: '1000',
          description: 'Missing target account',
        })
        .expect(400);

      // Test invalid amount format
      await request(app)
        .post(`/api/v1/loans/${testLoanAccountId}/disburse`)
        .send({
          targetAccountId: testDepositAccountId,
          amount: 'invalid-amount',
          description: 'Invalid amount',
        })
        .expect(400);

      // Test invalid loan ID format
      await request(app)
        .post('/api/v1/loans/invalid-loan-id/disburse')
        .send({
          targetAccountId: testDepositAccountId,
          amount: '1000',
          description: 'Invalid loan ID',
        })
        .expect(400);
    });
  });
});
