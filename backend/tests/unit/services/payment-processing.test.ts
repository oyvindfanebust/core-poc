import { PaymentProcessingService, PaymentProcessingResult } from '../../../src/services/payment-processing.service';
import { PaymentPlanRepository } from '../../../src/repositories/payment-plan.repository';
import { InvoiceService } from '../../../src/domain/services/invoice.service';
import { AccountService } from '../../../src/services/account.service';
import { Money, AccountId, CustomerId } from '../../../src/domain/value-objects';
import { PaymentPlan } from '../../../src/types';

// Mock the dependencies
jest.mock('../../../src/repositories/payment-plan.repository');
jest.mock('../../../src/domain/services/invoice.service');
jest.mock('../../../src/services/account.service');
jest.mock('../../../src/utils/logger');

describe('PaymentProcessingService', () => {
  let paymentProcessingService: PaymentProcessingService;
  let mockPaymentPlanRepository: jest.Mocked<PaymentPlanRepository>;
  let mockInvoiceService: jest.Mocked<InvoiceService>;
  let mockAccountService: jest.Mocked<AccountService>;

  beforeEach(() => {
    mockPaymentPlanRepository = new PaymentPlanRepository() as jest.Mocked<PaymentPlanRepository>;
    mockInvoiceService = new InvoiceService({} as any) as jest.Mocked<InvoiceService>;
    mockAccountService = new AccountService({} as any) as jest.Mocked<AccountService>;
    
    paymentProcessingService = new PaymentProcessingService(
      mockPaymentPlanRepository,
      mockInvoiceService,
      mockAccountService
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processScheduledPayments', () => {
    it('should process all due payments and create invoices', async () => {
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
        {
          accountId: 456n,
          principalAmount: 50000n,
          interestRate: 4.5,
          termMonths: 24,
          monthlyPayment: 2280n,
          remainingPayments: 20,
          loanType: 'SERIAL',
          paymentFrequency: 'MONTHLY',
          fees: [{ type: 'PROCESSING', amount: 100n, description: 'Processing fee' }],
          totalLoanAmount: 50100n,
          nextPaymentDate: new Date('2024-01-15'),
          customerId: 'CUST002',
        },
      ];

      const mockInvoice1 = {
        id: 'invoice-1',
        accountId: 123n,
        amount: 8560n,
        dueDate: testDate,
        status: 'pending' as const,
      };

      const mockInvoice2 = {
        id: 'invoice-2',
        accountId: 456n,
        amount: 2280n,
        dueDate: testDate,
        status: 'pending' as const,
      };

      mockPaymentPlanRepository.findPaymentsDue.mockResolvedValue(duePayments);
      mockInvoiceService.createInvoice
        .mockResolvedValueOnce(mockInvoice1)
        .mockResolvedValueOnce(mockInvoice2);

      const results = await paymentProcessingService.processScheduledPayments(testDate);

      expect(mockPaymentPlanRepository.findPaymentsDue).toHaveBeenCalledWith(testDate);
      expect(mockInvoiceService.createInvoice).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      
      // Check that invoices were created
      expect(results[0].invoiceCreated).toBe(true);
      expect(results[0].invoiceId).toBe('invoice-1');
      expect(results[1].invoiceCreated).toBe(true);
      expect(results[1].invoiceId).toBe('invoice-2');

      // Payment processing should fail since no customer accounts are found
      expect(results[0].paymentProcessed).toBe(false);
      expect(results[1].paymentProcessed).toBe(false);
      expect(results[0].error).toContain('No deposit account found');
      expect(results[1].error).toContain('No deposit account found');
    });

    it('should handle empty payment list', async () => {
      mockPaymentPlanRepository.findPaymentsDue.mockResolvedValue([]);

      const results = await paymentProcessingService.processScheduledPayments();

      expect(results).toHaveLength(0);
      expect(mockInvoiceService.createInvoice).not.toHaveBeenCalled();
    });

    it('should handle invoice creation failures gracefully', async () => {
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
          nextPaymentDate: new Date(),
          customerId: 'CUST001',
        },
      ];

      mockPaymentPlanRepository.findPaymentsDue.mockResolvedValue(duePayments);
      mockInvoiceService.createInvoice.mockRejectedValue(new Error('Invoice creation failed'));

      const results = await paymentProcessingService.processScheduledPayments();

      expect(results).toHaveLength(1);
      expect(results[0].invoiceCreated).toBe(false);
      expect(results[0].paymentProcessed).toBe(false);
      expect(results[0].error).toContain('Invoice creation failed');
    });
  });

  describe('processPaymentPlan', () => {
    it('should create invoice but fail payment without customer account', async () => {
      const paymentPlan: PaymentPlan = {
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
        nextPaymentDate: new Date(),
        customerId: 'CUST001',
      };

      const mockInvoice = {
        id: 'test-invoice',
        accountId: 123n,
        amount: 8560n,
        dueDate: new Date(),
        status: 'pending' as const,
      };

      mockInvoiceService.createInvoice.mockResolvedValue(mockInvoice);

      const result = await paymentProcessingService.processPaymentPlan(paymentPlan);

      expect(result.invoiceCreated).toBe(true);
      expect(result.invoiceId).toBe('test-invoice');
      expect(result.paymentProcessed).toBe(false);
      expect(result.error).toContain('No deposit account found');
    });

    it('should create invoice and process payment when customer account exists', async () => {
      const paymentPlan: PaymentPlan = {
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
        nextPaymentDate: new Date(),
        customerId: 'CUST001',
      };

      const mockInvoice = {
        id: 'test-invoice',
        accountId: 123n,
        amount: 8560n,
        dueDate: new Date(),
        status: 'pending' as const,
      };

      const customerAccountId = new AccountId(999n);
      const transferId = 777n;

      mockInvoiceService.createInvoice.mockResolvedValue(mockInvoice);
      mockAccountService.transfer.mockResolvedValue(transferId);
      mockPaymentPlanRepository.updateRemainingPayments.mockResolvedValue(undefined);
      mockPaymentPlanRepository.updateNextPaymentDate.mockResolvedValue(undefined);

      // Mock the private method by temporarily replacing the customer account lookup
      const originalMethod = (paymentProcessingService as any).findCustomerDepositAccount;
      (paymentProcessingService as any).findCustomerDepositAccount = jest.fn().mockResolvedValue(customerAccountId);

      const result = await paymentProcessingService.processPaymentPlan(paymentPlan);

      expect(result.invoiceCreated).toBe(true);
      expect(result.invoiceId).toBe('test-invoice');
      expect(result.paymentProcessed).toBe(true);
      expect(result.transferId).toBe(transferId);
      expect(result.error).toBeUndefined();

      expect(mockAccountService.transfer).toHaveBeenCalledWith(
        customerAccountId.value,
        paymentPlan.accountId,
        paymentPlan.monthlyPayment,
        'USD'
      );

      expect(mockPaymentPlanRepository.updateRemainingPayments).toHaveBeenCalledWith(
        new AccountId(paymentPlan.accountId),
        9
      );

      // Restore original method
      (paymentProcessingService as any).findCustomerDepositAccount = originalMethod;
    });
  });

  describe('markInvoicePaid', () => {
    it('should mark invoice as paid successfully', async () => {
      const invoiceId = 'test-invoice-123';
      mockInvoiceService.markInvoicePaid.mockResolvedValue(true);

      const result = await paymentProcessingService.markInvoicePaid(invoiceId);

      expect(result).toBe(true);
      expect(mockInvoiceService.markInvoicePaid).toHaveBeenCalledWith(invoiceId);
    });

    it('should handle invoice payment marking failure', async () => {
      const invoiceId = 'test-invoice-123';
      mockInvoiceService.markInvoicePaid.mockResolvedValue(false);

      const result = await paymentProcessingService.markInvoicePaid(invoiceId);

      expect(result).toBe(false);
      expect(mockInvoiceService.markInvoicePaid).toHaveBeenCalledWith(invoiceId);
    });

    it('should handle errors in invoice payment marking', async () => {
      const invoiceId = 'test-invoice-123';
      mockInvoiceService.markInvoicePaid.mockRejectedValue(new Error('Database error'));

      const result = await paymentProcessingService.markInvoicePaid(invoiceId);

      expect(result).toBe(false);
      expect(mockInvoiceService.markInvoicePaid).toHaveBeenCalledWith(invoiceId);
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