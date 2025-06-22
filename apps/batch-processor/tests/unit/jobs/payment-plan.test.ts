import { PaymentPlanJob } from '../../../src/jobs/payment-plan.job.js';
import { PaymentProcessingService, AccountService } from '@core-poc/domain';
import { PaymentPlanRepository } from '@core-poc/core-services';

describe('PaymentPlanJob', () => {
  let paymentPlanJob: PaymentPlanJob;
  let mockPaymentPlanRepository: jest.Mocked<PaymentPlanRepository>;
  let mockAccountService: jest.Mocked<AccountService>;
  let mockPaymentProcessingService: jest.Mocked<PaymentProcessingService>;

  beforeEach(() => {
    mockPaymentPlanRepository = {
      findPaymentsDue: jest.fn(),
      save: jest.fn(),
      findByAccountId: jest.fn(),
      updateNextPaymentDate: jest.fn(),
      findAll: jest.fn(),
      updateRemainingPayments: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockAccountService = {
      getAccountsByCustomer: jest.fn(),
      transfer: jest.fn(),
      createLoanAccount: jest.fn(),
      createDepositAccount: jest.fn(),
      createCreditAccount: jest.fn(),
      getAccountBalance: jest.fn(),
      getAccountMetadata: jest.fn(),
      updateAccountName: jest.fn(),
    } as any;

    mockPaymentProcessingService = {
      processScheduledPayments: jest.fn(),
      processPaymentPlan: jest.fn(),
    } as any;

    paymentPlanJob = new PaymentPlanJob(
      mockPaymentPlanRepository,
      mockAccountService,
      mockPaymentProcessingService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMonthlyPayments', () => {
    it('should process monthly payments successfully', async () => {
      const mockResults = [
        { paymentProcessed: true, transferId: 123n, error: undefined }
      ];
      
      mockPaymentProcessingService.processScheduledPayments.mockResolvedValue(mockResults);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentProcessingService.processScheduledPayments).toHaveBeenCalledWith();
    });

    it('should handle processing errors gracefully', async () => {
      mockPaymentProcessingService.processScheduledPayments.mockRejectedValue(
        new Error('Processing failed')
      );

      // Should not throw
      await expect(paymentPlanJob.processMonthlyPayments()).resolves.not.toThrow();
    });
  });

  describe('startMonthlyJob', () => {
    it('should initialize monthly job', () => {
      // The method should initialize without throwing
      expect(() => paymentPlanJob.startMonthlyJob()).not.toThrow();
      
      // Clean up after test
      paymentPlanJob.stopMonthlyJob();
    });
  });
});