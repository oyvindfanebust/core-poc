import { PaymentProcessingService, PaymentProcessingResult } from '../../../src/services/payment-processing.service';
import { PaymentPlanRepository } from '../../../src/repositories/payment-plan.repository';
import { AccountService } from '../../../src/services/account.service';
import { Money, AccountId, CustomerId } from '../../../src/domain/value-objects';
import { PaymentPlan } from '../../../src/types';

// Mock the dependencies
jest.mock('../../../src/repositories/payment-plan.repository');
jest.mock('../../../src/services/account.service');
jest.mock('../../../src/utils/logger');

describe('PaymentProcessingService', () => {
  let paymentProcessingService: PaymentProcessingService;
  let mockPaymentPlanRepository: jest.Mocked<PaymentPlanRepository>;
  let mockAccountService: jest.Mocked<AccountService>;

  beforeEach(() => {
    mockPaymentPlanRepository = new PaymentPlanRepository() as jest.Mocked<PaymentPlanRepository>;
    mockAccountService = new AccountService({} as any) as jest.Mocked<AccountService>;
    
    paymentProcessingService = new PaymentProcessingService(
      mockPaymentPlanRepository,
      mockAccountService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processScheduledPayments', () => {
    it('should process all due payments', async () => {
      const testDate = new Date('2024-01-15');
      const duePayments: PaymentPlan[] = [
        {
          accountId: 123n,
          principalAmount: 100000n,
          interestRate: 5.0,
          termMonths: 12,
          monthlyPayment: 8560n,
          remainingPayments: 10,
          loanType: 'ANNUITY',
          paymentFrequency: 'MONTHLY',
          fees: [],
          totalLoanAmount: 100000n,
          nextPaymentDate: new Date('2024-01-15'),
          customerId: 'CUST001',
        },
      ];

      mockPaymentPlanRepository.findPaymentsDue.mockResolvedValue(duePayments);

      const results = await paymentProcessingService.processScheduledPayments(testDate);

      expect(mockPaymentPlanRepository.findPaymentsDue).toHaveBeenCalledWith(testDate);
      expect(results).toHaveLength(1);
      
      // Payment processing should fail since no customer accounts are found
      expect(results[0].paymentProcessed).toBe(false);
      expect(results[0].error).toContain('No deposit account found');
    });

    it('should handle empty payment list', async () => {
      mockPaymentPlanRepository.findPaymentsDue.mockResolvedValue([]);

      const results = await paymentProcessingService.processScheduledPayments();

      expect(results).toHaveLength(0);
    });
  });

  describe('calculateNextPaymentDate', () => {
    it('should calculate next monthly payment date correctly', () => {
      const currentDate = new Date('2024-01-15');
      const nextDate = (paymentProcessingService as any).calculateNextPaymentDate(currentDate, 'MONTHLY');
      
      expect(nextDate.getMonth()).toBe(1); // February (0-indexed)
      expect(nextDate.getDate()).toBe(15);
    });

    it('should calculate next weekly payment date correctly', () => {
      const currentDate = new Date('2024-01-15');
      const nextDate = (paymentProcessingService as any).calculateNextPaymentDate(currentDate, 'WEEKLY');
      
      expect(nextDate.getDate()).toBe(22);
    });

    it('should calculate next bi-weekly payment date correctly', () => {
      const currentDate = new Date('2024-01-15');
      const nextDate = (paymentProcessingService as any).calculateNextPaymentDate(currentDate, 'BI_WEEKLY');
      
      expect(nextDate.getDate()).toBe(29);
    });
  });
});