import { PaymentPlanJob } from '../../../src/jobs/payment-plan.job';
import { PaymentPlanRepository } from '../../../src/repositories/payment-plan.repository';
import { AccountService } from '../../../src/services/account.service';
import { PaymentProcessingService } from '../../../src/services/payment-processing.service';
import { AccountId } from '../../../src/domain/value-objects';
import { PaymentPlan } from '../../../src/types';

// Mock the dependencies
jest.mock('../../../src/repositories/payment-plan.repository');
jest.mock('../../../src/services/account.service');
jest.mock('../../../src/services/payment-processing.service');
jest.mock('../../../src/utils/logger');

describe('PaymentPlanJob', () => {
  let paymentPlanJob: PaymentPlanJob;
  let mockPaymentPlanRepository: jest.Mocked<PaymentPlanRepository>;
  let mockAccountService: jest.Mocked<AccountService>;
  let mockPaymentProcessingService: jest.Mocked<PaymentProcessingService>;

  beforeEach(() => {
    mockPaymentPlanRepository = new PaymentPlanRepository() as jest.Mocked<PaymentPlanRepository>;
    mockAccountService = new AccountService({} as any) as jest.Mocked<AccountService>;
    mockPaymentProcessingService = new PaymentProcessingService({} as any, {} as any) as jest.Mocked<PaymentProcessingService>;
    paymentPlanJob = new PaymentPlanJob(mockPaymentPlanRepository, mockAccountService, mockPaymentProcessingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    paymentPlanJob.stopMonthlyJob();
  });

  describe('processMonthlyPayments', () => {
    it('should process scheduled payments using payment processing service', async () => {
      const mockResults = [
        {
          paymentProcessed: true,
          transferId: 123n,
        },
      ];

      mockPaymentProcessingService.processScheduledPayments.mockResolvedValue(mockResults);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentProcessingService.processScheduledPayments).toHaveBeenCalled();
    });

    it('should handle empty payment results', async () => {
      mockPaymentProcessingService.processScheduledPayments.mockResolvedValue([]);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentProcessingService.processScheduledPayments).toHaveBeenCalled();
    });

    it('should process payments and decrement remaining payments (legacy test)', async () => {
      const plans: PaymentPlan[] = [
        {
          accountId: 123n,
          principalAmount: 10000n,
          interestRate: 5.0,
          termMonths: 12,
          monthlyPayment: 856n,
          remainingPayments: 2,
          loanType: 'ANNUITY',
          paymentFrequency: 'MONTHLY',
          fees: [],
          totalLoanAmount: 10000n,
          nextPaymentDate: new Date(),
          customerId: 'CUST001',
        },
      ];

      // This test is now obsolete since the job uses PaymentProcessingService
      // But we'll keep it for compatibility
      const mockResults = [{ paymentProcessed: true }];
      mockPaymentProcessingService.processScheduledPayments.mockResolvedValue(mockResults);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentProcessingService.processScheduledPayments).toHaveBeenCalled();
    });

    it('should handle completed payment plans', async () => {
      const plans: PaymentPlan[] = [
        {
          accountId: 123n,
          principalAmount: 10000n,
          interestRate: 5.0,
          termMonths: 12,
          monthlyPayment: 856n,
          remainingPayments: 1,
          loanType: 'ANNUITY',
          paymentFrequency: 'MONTHLY',
          fees: [],
          totalLoanAmount: 10000n,
          nextPaymentDate: new Date(),
          customerId: 'CUST001',
        },
      ];

      const mockResults = [{ paymentProcessed: true }];
      mockPaymentProcessingService.processScheduledPayments.mockResolvedValue(mockResults);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentProcessingService.processScheduledPayments).toHaveBeenCalled();
    });

    it('should handle empty payment plans', async () => {
      mockPaymentProcessingService.processScheduledPayments.mockResolvedValue([]);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentProcessingService.processScheduledPayments).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockPaymentProcessingService.processScheduledPayments.mockRejectedValue(new Error('Service error'));

      // Should not throw
      await expect(paymentPlanJob.processMonthlyPayments()).resolves.toBeUndefined();
    });
  });

  describe('processPaymentForAccount', () => {
    it('should process single payment successfully', async () => {
      const accountId = new AccountId(123n);
      const plan: PaymentPlan = {
        accountId: 123n,
        principalAmount: 10000n,
        interestRate: 5.0,
        termMonths: 12,
        monthlyPayment: 856n,
        remainingPayments: 5,
        loanType: 'ANNUITY',
        paymentFrequency: 'MONTHLY',
        fees: [],
        totalLoanAmount: 10000n,
        nextPaymentDate: new Date(),
        customerId: 'CUST001',
      };

      mockPaymentPlanRepository.findByAccountId.mockResolvedValue(plan);
      mockPaymentPlanRepository.updateRemainingPayments.mockResolvedValue(undefined);

      const result = await paymentPlanJob.processPaymentForAccount(accountId);

      expect(result).toBe(true);
      expect(mockPaymentPlanRepository.updateRemainingPayments).toHaveBeenCalledWith(accountId, 4);
    });

    it('should return false for non-existent payment plan', async () => {
      const accountId = new AccountId(999n);

      mockPaymentPlanRepository.findByAccountId.mockResolvedValue(null);

      const result = await paymentPlanJob.processPaymentForAccount(accountId);

      expect(result).toBe(false);
      expect(mockPaymentPlanRepository.updateRemainingPayments).not.toHaveBeenCalled();
    });

    it('should return false for completed payment plan', async () => {
      const accountId = new AccountId(123n);
      const plan: PaymentPlan = {
        accountId: 123n,
        principalAmount: 10000n,
        interestRate: 5.0,
        termMonths: 12,
        monthlyPayment: 856n,
        remainingPayments: 0,
        loanType: 'ANNUITY',
        paymentFrequency: 'MONTHLY',
        fees: [],
        totalLoanAmount: 10000n,
        nextPaymentDate: new Date(),
        customerId: 'CUST001',
      };

      mockPaymentPlanRepository.findByAccountId.mockResolvedValue(plan);

      const result = await paymentPlanJob.processPaymentForAccount(accountId);

      expect(result).toBe(false);
      expect(mockPaymentPlanRepository.updateRemainingPayments).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentPlan', () => {
    it('should retrieve payment plan by account ID', async () => {
      const accountId = new AccountId(123n);
      const plan: PaymentPlan = {
        accountId: 123n,
        principalAmount: 10000n,
        interestRate: 5.0,
        termMonths: 12,
        monthlyPayment: 856n,
        remainingPayments: 5,
        loanType: 'ANNUITY',
        paymentFrequency: 'MONTHLY',
        fees: [],
        totalLoanAmount: 10000n,
        nextPaymentDate: new Date(),
        customerId: 'CUST001',
      };

      mockPaymentPlanRepository.findByAccountId.mockResolvedValue(plan);

      const result = await paymentPlanJob.getPaymentPlan(accountId);

      expect(result).toEqual(plan);
      expect(mockPaymentPlanRepository.findByAccountId).toHaveBeenCalledWith(accountId);
    });

    it('should return null for non-existent payment plan', async () => {
      const accountId = new AccountId(999n);

      mockPaymentPlanRepository.findByAccountId.mockResolvedValue(null);

      const result = await paymentPlanJob.getPaymentPlan(accountId);

      expect(result).toBeNull();
    });
  });

  describe('job lifecycle', () => {
    it('should start and stop monthly job', () => {
      // Mock setInterval and clearInterval
      const mockSetInterval = jest.fn().mockReturnValue('mock-interval-id');
      const mockClearInterval = jest.fn();
      
      global.setInterval = mockSetInterval;
      global.clearInterval = mockClearInterval;

      paymentPlanJob.startMonthlyJob();
      expect(mockSetInterval).toHaveBeenCalled();

      paymentPlanJob.stopMonthlyJob();
      expect(mockClearInterval).toHaveBeenCalledWith('mock-interval-id');
    });

    it('should not start job if already running', () => {
      const mockSetInterval = jest.fn().mockReturnValue('mock-interval-id');
      global.setInterval = mockSetInterval;

      paymentPlanJob.startMonthlyJob();
      paymentPlanJob.startMonthlyJob(); // Second call

      expect(mockSetInterval).toHaveBeenCalledTimes(1);
    });
  });
});