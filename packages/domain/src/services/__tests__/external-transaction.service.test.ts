import { TigerBeetleService } from '@core-poc/core-services';

import { AccountService } from '../account.service.js';
import { ExternalTransactionService } from '../external-transaction.service.js';

// Mock dependencies
jest.mock('../account.service.js');
jest.mock('@core-poc/core-services');

describe('ExternalTransactionService', () => {
  let externalTransactionService: ExternalTransactionService;
  let mockAccountService: jest.Mocked<AccountService>;
  let mockTigerBeetleService: jest.Mocked<TigerBeetleService>;

  beforeEach(() => {
    mockTigerBeetleService = {
      createTransfer: jest.fn(),
      createAccount: jest.fn(),
      getAccountBalance: jest.fn(),
      close: jest.fn(),
    } as any;

    mockAccountService = {
      transfer: jest.fn(),
      getAccountBalance: jest.fn(),
      createDepositAccount: jest.fn(),
    } as any;

    externalTransactionService = new ExternalTransactionService(
      mockAccountService,
      mockTigerBeetleService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processIncomingTransfer', () => {
    it('should process incoming transfer successfully', async () => {
      const request = {
        accountId: BigInt('123456789'),
        amount: BigInt('100000'), // $1000.00
        currency: 'USD' as const,
        externalBankInfo: {
          bankIdentifier: '021000021',
          accountNumber: '1234567890',
          bankName: 'Chase Bank',
          country: 'US',
        },
        description: 'Payroll deposit',
      };

      mockTigerBeetleService.createAccount.mockResolvedValue(BigInt('999999999'));
      mockAccountService.transfer.mockResolvedValue(BigInt('987654321'));

      const result = await externalTransactionService.processIncomingTransfer(request);

      expect(result).toEqual({
        transferId: BigInt('987654321'),
        status: 'completed',
        externalTransactionId: expect.any(String),
      });

      expect(mockAccountService.transfer).toHaveBeenCalledWith(
        expect.any(BigInt), // System account ID
        BigInt('123456789'),
        BigInt('100000'),
        'USD',
        'Incoming transfer from external bank: Payroll deposit',
      );
    });

    it('should handle incoming transfer processing errors', async () => {
      const request = {
        accountId: BigInt('123456789'),
        amount: BigInt('100000'),
        currency: 'USD' as const,
        externalBankInfo: {
          bankIdentifier: '021000021',
          accountNumber: '1234567890',
          bankName: 'Chase Bank',
          country: 'US',
        },
        description: 'Failed transfer',
      };

      mockTigerBeetleService.createAccount.mockResolvedValue(BigInt('999999999'));
      mockAccountService.transfer.mockRejectedValue(new Error('Insufficient funds'));

      await expect(externalTransactionService.processIncomingTransfer(request)).rejects.toThrow(
        'Insufficient funds',
      );
    });
  });

  describe('processOutgoingTransfer', () => {
    it('should process outgoing transfer successfully', async () => {
      const request = {
        accountId: BigInt('123456789'),
        amount: BigInt('50000'), // $500.00
        currency: 'USD' as const,
        externalBankInfo: {
          bankIdentifier: '021000021',
          accountNumber: '1234567890',
          bankName: 'Chase Bank',
          country: 'US',
        },
        description: 'Bill payment',
      };

      mockTigerBeetleService.createAccount.mockResolvedValue(BigInt('999999999'));
      mockAccountService.transfer.mockResolvedValue(BigInt('987654321'));

      const result = await externalTransactionService.processOutgoingTransfer(request);

      expect(result).toEqual({
        transferId: BigInt('987654321'),
        status: 'completed',
        externalTransactionId: expect.any(String),
      });

      expect(mockAccountService.transfer).toHaveBeenCalledWith(
        BigInt('123456789'),
        expect.any(BigInt), // System account ID
        BigInt('50000'),
        'USD',
        'Outgoing transfer to external bank: Bill payment',
      );
    });
  });

  describe('processHighValueTransfer', () => {
    it('should process high-value transfer successfully', async () => {
      const request = {
        accountId: BigInt('123456789'),
        amount: BigInt('500000'), // $5000.00
        currency: 'USD' as const,
        transferInfo: {
          bankIdentifier: '021000021',
          accountNumber: '1234567890',
          bankName: 'Chase Bank',
          country: 'US',
          recipientName: 'John Doe',
          transferMessage: 'Property purchase',
        },
        description: 'Real estate transfer',
      };

      mockTigerBeetleService.createAccount.mockResolvedValue(BigInt('999999999'));
      mockAccountService.transfer.mockResolvedValue(BigInt('987654321'));

      const result = await externalTransactionService.processHighValueTransfer(request);

      expect(result).toEqual({
        transferId: BigInt('987654321'),
        status: 'completed',
        externalTransactionId: expect.any(String),
      });

      expect(mockAccountService.transfer).toHaveBeenCalledWith(
        BigInt('123456789'),
        expect.any(BigInt), // System account ID
        BigInt('500000'),
        'USD',
        'High-value transfer: Real estate transfer',
      );
    });
  });

  describe('getSystemAccount', () => {
    it('should create or retrieve system account for currency', async () => {
      mockTigerBeetleService.createAccount.mockResolvedValue(BigInt('999999999'));

      const result = await externalTransactionService.getSystemAccount('USD');

      expect(result).toBe(BigInt('999999999'));
      expect(mockTigerBeetleService.createAccount).toHaveBeenCalledWith({
        type: 'EQUITY',
        customerId: 'SYSTEM',
        currency: 'USD',
      });
    });

    it('should cache system accounts by currency', async () => {
      mockTigerBeetleService.createAccount.mockResolvedValue(BigInt('999999999'));

      // First call
      const result1 = await externalTransactionService.getSystemAccount('USD');
      // Second call
      const result2 = await externalTransactionService.getSystemAccount('USD');

      expect(result1).toBe(result2);
      expect(mockTigerBeetleService.createAccount).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateExternalBankInfo', () => {
    it('should validate correct bank identifier format', () => {
      const validInfo = {
        bankIdentifier: 'CHASUS33',
        accountNumber: '1234567890',
        bankName: 'Chase Bank',
        country: 'US',
      };

      expect(() => externalTransactionService.validateExternalBankInfo(validInfo)).not.toThrow();
    });

    it('should reject invalid bank identifier format', () => {
      const invalidInfo = {
        bankIdentifier: '', // Empty
        accountNumber: '1234567890',
        bankName: 'Chase Bank',
      };

      expect(() => externalTransactionService.validateExternalBankInfo(invalidInfo)).toThrow(
        'Bank identifier is required',
      );
    });

    it('should reject invalid account number format', () => {
      const invalidInfo = {
        bankIdentifier: 'CHASUS33',
        accountNumber: '', // Empty
        bankName: 'Chase Bank',
      };

      expect(() => externalTransactionService.validateExternalBankInfo(invalidInfo)).toThrow(
        'Account number is required',
      );
    });

    it('should reject invalid country code format', () => {
      const invalidInfo = {
        bankIdentifier: 'CHASUS33',
        accountNumber: '1234567890',
        bankName: 'Chase Bank',
        country: 'USA', // Too long
      };

      expect(() => externalTransactionService.validateExternalBankInfo(invalidInfo)).toThrow(
        'Invalid country code format',
      );
    });
  });
});
