import { InvoiceService } from '../../../src/domain/services/invoice.service';
import { InvoiceRepository } from '../../../src/repositories/invoice.repository';
import { AccountId, Money } from '../../../src/domain/value-objects';
import { Invoice } from '../../../src/types';

// Mock the repository
jest.mock('../../../src/repositories/invoice.repository');
jest.mock('../../../src/utils/logger');

describe('InvoiceService', () => {
  let invoiceService: InvoiceService;
  let mockInvoiceRepository: jest.Mocked<InvoiceRepository>;

  beforeEach(() => {
    mockInvoiceRepository = new InvoiceRepository() as jest.Mocked<InvoiceRepository>;
    invoiceService = new InvoiceService(mockInvoiceRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create a new invoice', async () => {
      const accountId = new AccountId(123n);
      const amount = new Money(1000n, 'USD');
      const dueDate = new Date('2024-01-15');

      const expectedInvoice: Invoice = {
        id: 'test-uuid',
        accountId: 123n,
        amount: 1000n,
        dueDate,
        status: 'pending',
      };

      mockInvoiceRepository.save.mockResolvedValue(undefined);
      
      // Mock UUID generation
      jest.mock('uuid', () => ({
        v4: () => 'test-uuid',
      }));

      const invoice = await invoiceService.createInvoice({
        accountId,
        amount,
        dueDate,
      });

      expect(invoice.accountId).toBe(123n);
      expect(invoice.amount).toBe(1000n);
      expect(invoice.dueDate).toEqual(dueDate);
      expect(invoice.status).toBe('pending');
      expect(mockInvoiceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 123n,
          amount: 1000n,
          dueDate,
          status: 'pending',
        })
      );
    });
  });

  describe('markInvoicePaid', () => {
    it('should mark existing invoice as paid', async () => {
      const invoiceId = 'test-invoice-id';
      
      mockInvoiceRepository.updateStatus.mockResolvedValue(true);

      const result = await invoiceService.markInvoicePaid(invoiceId);

      expect(result).toBe(true);
      expect(mockInvoiceRepository.updateStatus).toHaveBeenCalledWith(invoiceId, 'paid');
    });

    it('should return false for non-existent invoice', async () => {
      const invoiceId = 'non-existent-id';
      
      mockInvoiceRepository.updateStatus.mockResolvedValue(false);

      const result = await invoiceService.markInvoicePaid(invoiceId);

      expect(result).toBe(false);
      expect(mockInvoiceRepository.updateStatus).toHaveBeenCalledWith(invoiceId, 'paid');
    });
  });

  describe('processOverdueInvoices', () => {
    it('should mark overdue invoices', async () => {
      const overdueInvoices: Invoice[] = [
        {
          id: 'invoice1',
          accountId: 123n,
          amount: 1000n,
          dueDate: new Date('2024-01-15'),
          status: 'pending',
        },
        {
          id: 'invoice2',
          accountId: 456n,
          amount: 2000n,
          dueDate: new Date('2024-01-10'),
          status: 'pending',
        },
      ];

      mockInvoiceRepository.findOverdueInvoices.mockResolvedValue(overdueInvoices);
      mockInvoiceRepository.updateStatus.mockResolvedValue(true);

      const result = await invoiceService.processOverdueInvoices();

      expect(result).toHaveLength(2);
      expect(mockInvoiceRepository.findOverdueInvoices).toHaveBeenCalled();
      expect(mockInvoiceRepository.updateStatus).toHaveBeenCalledWith('invoice1', 'overdue');
      expect(mockInvoiceRepository.updateStatus).toHaveBeenCalledWith('invoice2', 'overdue');
    });

    it('should return empty array when no overdue invoices exist', async () => {
      mockInvoiceRepository.findOverdueInvoices.mockResolvedValue([]);

      const result = await invoiceService.processOverdueInvoices();

      expect(result).toEqual([]);
      expect(mockInvoiceRepository.findOverdueInvoices).toHaveBeenCalled();
      expect(mockInvoiceRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('getInvoicesByAccount', () => {
    it('should return invoices for specific account', async () => {
      const accountId = new AccountId(123n);
      const invoices: Invoice[] = [
        {
          id: 'invoice1',
          accountId: 123n,
          amount: 1000n,
          dueDate: new Date('2024-01-15'),
          status: 'pending',
        },
        {
          id: 'invoice2',
          accountId: 123n,
          amount: 2000n,
          dueDate: new Date('2024-01-20'),
          status: 'paid',
        },
      ];

      mockInvoiceRepository.findByAccountId.mockResolvedValue(invoices);

      const result = await invoiceService.getInvoicesByAccount(accountId);

      expect(result).toEqual(invoices);
      expect(mockInvoiceRepository.findByAccountId).toHaveBeenCalledWith(accountId);
    });

    it('should return empty array for account with no invoices', async () => {
      const accountId = new AccountId(999n);
      
      mockInvoiceRepository.findByAccountId.mockResolvedValue([]);

      const result = await invoiceService.getInvoicesByAccount(accountId);

      expect(result).toEqual([]);
      expect(mockInvoiceRepository.findByAccountId).toHaveBeenCalledWith(accountId);
    });
  });

  describe('getAllInvoices', () => {
    it('should return all invoices', async () => {
      const invoices: Invoice[] = [
        {
          id: 'invoice1',
          accountId: 123n,
          amount: 1000n,
          dueDate: new Date('2024-01-15'),
          status: 'pending',
        },
        {
          id: 'invoice2',
          accountId: 456n,
          amount: 2000n,
          dueDate: new Date('2024-01-20'),
          status: 'paid',
        },
      ];

      mockInvoiceRepository.findAll.mockResolvedValue(invoices);

      const result = await invoiceService.getAllInvoices();

      expect(result).toEqual(invoices);
      expect(mockInvoiceRepository.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no invoices exist', async () => {
      mockInvoiceRepository.findAll.mockResolvedValue([]);

      const result = await invoiceService.getAllInvoices();

      expect(result).toEqual([]);
      expect(mockInvoiceRepository.findAll).toHaveBeenCalled();
    });
  });
});