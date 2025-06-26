import { TransferRepository } from '@core-poc/core-services';
import { AccountService, LoanService, AccountId } from '@core-poc/domain';
import { Request, Response } from 'express';

import { AccountController } from '../../../src/controllers/account.controller.js';

// Mock the services
jest.mock('@core-poc/domain');
jest.mock('@core-poc/core-services');

describe('AccountController', () => {
  let accountController: AccountController;
  let mockAccountService: jest.Mocked<AccountService>;
  let mockLoanService: jest.Mocked<LoanService>;
  let mockTransferRepository: jest.Mocked<TransferRepository>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockAccountService = {
      updateAccountName: jest.fn(),
      getAccountsByCustomer: jest.fn(),
    } as any;

    mockLoanService = {} as any;
    mockTransferRepository = {
      findByAccountId: jest.fn(),
    } as any;

    accountController = new AccountController(
      mockAccountService,
      mockLoanService,
      mockTransferRepository,
    );

    mockRequest = {
      params: {},
      body: {},
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateAccountName', () => {
    beforeEach(() => {
      mockRequest.params = { accountId: '123456789' };
    });

    it('should update account name successfully', async () => {
      mockRequest.body = { accountName: 'New Account Name' };
      mockAccountService.updateAccountName.mockResolvedValue(true);

      await accountController.updateAccountName(mockRequest as Request, mockResponse as Response);

      expect(mockAccountService.updateAccountName).toHaveBeenCalledWith(
        expect.any(AccountId),
        'New Account Name',
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle account not found', async () => {
      mockRequest.body = { accountName: 'Non-existent Account' };
      mockAccountService.updateAccountName.mockResolvedValue(false);

      await accountController.updateAccountName(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Account not found' });
    });

    it('should handle null account name', async () => {
      mockRequest.body = { accountName: null };
      mockAccountService.updateAccountName.mockResolvedValue(true);

      await accountController.updateAccountName(mockRequest as Request, mockResponse as Response);

      expect(mockAccountService.updateAccountName).toHaveBeenCalledWith(
        expect.any(AccountId),
        null,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it('should handle service errors', async () => {
      mockRequest.body = { accountName: 'Test Account' };
      mockAccountService.updateAccountName.mockRejectedValue(new Error('Database error'));

      await accountController.updateAccountName(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Failed to update account name' });
    });
  });

  describe('getAccountsByCustomer', () => {
    it('should return accounts with account names in response', async () => {
      const mockAccounts = [
        {
          accountId: BigInt('123456789'),
          customerId: 'CUSTOMER-123',
          accountType: 'DEPOSIT' as const,
          currency: 'EUR' as const,
          accountName: 'My Savings Account',
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        {
          accountId: BigInt('987654321'),
          customerId: 'CUSTOMER-123',
          accountType: 'DEPOSIT' as const,
          currency: 'EUR' as const,
          accountName: undefined,
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        },
      ];

      mockRequest.params = { customerId: 'CUSTOMER-123' };
      mockAccountService.getAccountsByCustomer.mockResolvedValue(mockAccounts);

      await accountController.getAccountsByCustomer(
        mockRequest as Request,
        mockResponse as Response,
      );

      expect(mockResponse.json).toHaveBeenCalledWith([
        {
          accountId: '123456789',
          customerId: 'CUSTOMER-123',
          accountType: 'DEPOSIT',
          currency: 'EUR',
          accountName: 'My Savings Account',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        {
          accountId: '987654321',
          customerId: 'CUSTOMER-123',
          accountType: 'DEPOSIT',
          currency: 'EUR',
          accountName: undefined,
          createdAt: '2023-01-02T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z',
        },
      ]);
    });
  });
});
