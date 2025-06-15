import { PaymentPlanJob } from '../../../src/jobs/payment-plan.job';
import { PaymentPlanRepository } from '../../../src/repositories/payment-plan.repository';
import { AccountService } from '../../../src/services/account.service';
import { AccountId } from '../../../src/domain/value-objects';
import { PaymentPlan } from '../../../src/types';

// Mock the dependencies
jest.mock('../../../src/repositories/payment-plan.repository');
jest.mock('../../../src/services/account.service');
jest.mock('../../../src/utils/logger');

describe('PaymentPlanJob', () => {
  let paymentPlanJob: PaymentPlanJob;
  let mockPaymentPlanRepository: jest.Mocked<PaymentPlanRepository>;
  let mockAccountService: jest.Mocked<AccountService>;

  beforeEach(() => {
    mockPaymentPlanRepository = new PaymentPlanRepository() as jest.Mocked<PaymentPlanRepository>;
    mockAccountService = new AccountService({} as any) as jest.Mocked<AccountService>;
    paymentPlanJob = new PaymentPlanJob(mockPaymentPlanRepository, mockAccountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    paymentPlanJob.stopMonthlyJob();
  });

  describe('processMonthlyPayments', () => {
    it('should process payments and decrement remaining payments', async () => {
      const plans: PaymentPlan[] = [
        {
          accountId: 123n,
          principalAmount: 10000n,
          interestRate: 5.0,
          termMonths: 12,
          monthlyPayment: 856n,
          remainingPayments: 2,
        },
      ];

      mockPaymentPlanRepository.findAll.mockResolvedValue(plans);
      mockPaymentPlanRepository.updateRemainingPayments.mockResolvedValue(undefined);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentPlanRepository.findAll).toHaveBeenCalled();
      expect(mockPaymentPlanRepository.updateRemainingPayments).toHaveBeenCalledWith(
        expect.any(AccountId),
        1
      );
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
        },
      ];

      mockPaymentPlanRepository.findAll.mockResolvedValue(plans);
      mockPaymentPlanRepository.updateRemainingPayments.mockResolvedValue(undefined);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentPlanRepository.updateRemainingPayments).toHaveBeenCalledWith(
        expect.any(AccountId),
        0
      );
    });

    it('should handle empty payment plans', async () => {
      mockPaymentPlanRepository.findAll.mockResolvedValue([]);

      await paymentPlanJob.processMonthlyPayments();

      expect(mockPaymentPlanRepository.findAll).toHaveBeenCalled();
      expect(mockPaymentPlanRepository.updateRemainingPayments).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const plans: PaymentPlan[] = [
        {
          accountId: 123n,
          principalAmount: 10000n,
          interestRate: 5.0,
          termMonths: 12,
          monthlyPayment: 856n,
          remainingPayments: 2,
        },
      ];

      mockPaymentPlanRepository.findAll.mockResolvedValue(plans);
      mockPaymentPlanRepository.updateRemainingPayments.mockRejectedValue(new Error('Database error'));

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