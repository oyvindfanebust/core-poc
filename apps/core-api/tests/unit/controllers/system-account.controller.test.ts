import { SystemAccountConfigService, type Currency } from '@core-poc/core-services';
import { Request, Response } from 'express';

import { SystemAccountController } from '../../../src/controllers/system-account.controller';

// Mock the logger to avoid console output during tests
jest.mock('@core-poc/core-services', () => ({
  ...jest.requireActual('@core-poc/core-services'),
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('SystemAccountController', () => {
  let controller: SystemAccountController;
  let mockConfigService: jest.Mocked<SystemAccountConfigService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Create mock config service
    mockConfigService = {
      getAllSystemAccounts: jest.fn(),
      getConfigMetadata: jest.fn(),
      getSystemAccount: jest.fn(),
      getSystemAccountsByType: jest.fn(),
      validateConfig: jest.fn(),
    } as any;

    // Create controller with mock service
    controller = new SystemAccountController(mockConfigService);

    // Create mock request and response
    mockRequest = {
      params: {},
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemAccounts', () => {
    it('should return all system accounts with metadata', async () => {
      // Arrange
      const mockAccounts = {
        'SEPA-OUT-SUSPENSE-EUR': {
          tigerBeetleId: '123456789',
          accountType: 'SEPA_OUTGOING_SUSPENSE',
          currency: 'EUR' as Currency,
          description: 'Test account',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      };

      const mockMetadata = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accountCount: 1,
      };

      mockConfigService.getAllSystemAccounts.mockReturnValue(mockAccounts);
      mockConfigService.getConfigMetadata.mockReturnValue(mockMetadata);

      // Act
      await controller.getSystemAccounts(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockConfigService.getAllSystemAccounts).toHaveBeenCalledTimes(1);
      expect(mockConfigService.getConfigMetadata).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        metadata: mockMetadata,
        accounts: [
          {
            systemIdentifier: 'SEPA-OUT-SUSPENSE-EUR',
            tigerBeetleId: '123456789',
            accountType: 'SEPA_OUTGOING_SUSPENSE',
            currency: 'EUR',
            description: 'Test account',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        count: 1,
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Database error');
      mockConfigService.getAllSystemAccounts.mockImplementation(() => {
        throw error;
      });

      // Act
      await controller.getSystemAccounts(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'SYSTEM_ACCOUNTS_FETCH_FAILED',
          message: 'Failed to retrieve system accounts',
          details: 'Database error',
        },
      });
    });
  });

  describe('getSystemAccount', () => {
    it('should return specific system account', async () => {
      // Arrange
      const systemIdentifier = 'SEPA-OUT-SUSPENSE-EUR';
      mockRequest.params = { systemIdentifier };

      const mockAccount = {
        tigerBeetleId: '123456789',
        accountType: 'SEPA_OUTGOING_SUSPENSE',
        currency: 'EUR' as Currency,
        description: 'Test account',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockConfigService.getSystemAccount.mockReturnValue(mockAccount);

      // Act
      await controller.getSystemAccount(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockConfigService.getSystemAccount).toHaveBeenCalledWith(systemIdentifier);
      expect(mockResponse.json).toHaveBeenCalledWith({
        systemIdentifier,
        ...mockAccount,
      });
    });

    it('should return 404 when account not found', async () => {
      // Arrange
      const systemIdentifier = 'NON-EXISTENT-ACCOUNT';
      mockRequest.params = { systemIdentifier };

      mockConfigService.getSystemAccount.mockReturnValue(null);

      // Act
      await controller.getSystemAccount(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'SYSTEM_ACCOUNT_NOT_FOUND',
          message: `System account not found: ${systemIdentifier}`,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const systemIdentifier = 'SEPA-OUT-SUSPENSE-EUR';
      mockRequest.params = { systemIdentifier };

      const error = new Error('Database error');
      mockConfigService.getSystemAccount.mockImplementation(() => {
        throw error;
      });

      // Act
      await controller.getSystemAccount(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'SYSTEM_ACCOUNT_FETCH_FAILED',
          message: 'Failed to retrieve system account',
          details: 'Database error',
        },
      });
    });
  });

  describe('getSystemAccountsByType', () => {
    it('should return accounts filtered by type', async () => {
      // Arrange
      const accountType = 'SEPA_SETTLEMENT';
      mockRequest.params = { accountType };

      const mockAccounts = {
        'SEPA-SETTLEMENT-EUR': {
          tigerBeetleId: '123456789',
          accountType: 'SEPA_SETTLEMENT',
          currency: 'EUR' as Currency,
          description: 'Test settlement account',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        'SEPA-SETTLEMENT-NOK': {
          tigerBeetleId: '987654321',
          accountType: 'SEPA_SETTLEMENT',
          currency: 'NOK' as Currency,
          description: 'Test settlement account NOK',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      };

      mockConfigService.getSystemAccountsByType.mockReturnValue(mockAccounts);

      // Act
      await controller.getSystemAccountsByType(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockConfigService.getSystemAccountsByType).toHaveBeenCalledWith(accountType);
      expect(mockResponse.json).toHaveBeenCalledWith({
        accountType,
        accounts: [
          {
            systemIdentifier: 'SEPA-SETTLEMENT-EUR',
            tigerBeetleId: '123456789',
            accountType: 'SEPA_SETTLEMENT',
            currency: 'EUR',
            description: 'Test settlement account',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          {
            systemIdentifier: 'SEPA-SETTLEMENT-NOK',
            tigerBeetleId: '987654321',
            accountType: 'SEPA_SETTLEMENT',
            currency: 'NOK',
            description: 'Test settlement account NOK',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        count: 2,
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const accountType = 'SEPA_SETTLEMENT';
      mockRequest.params = { accountType };

      const error = new Error('Database error');
      mockConfigService.getSystemAccountsByType.mockImplementation(() => {
        throw error;
      });

      // Act
      await controller.getSystemAccountsByType(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'SYSTEM_ACCOUNTS_BY_TYPE_FETCH_FAILED',
          message: 'Failed to retrieve system accounts by type',
          details: 'Database error',
        },
      });
    });
  });

  describe('validateConfiguration', () => {
    it('should return validation success', async () => {
      // Arrange
      const mockValidation = {
        valid: true,
        errors: [],
      };

      mockConfigService.validateConfig.mockResolvedValue(mockValidation);

      // Act
      await controller.validateConfiguration(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockConfigService.validateConfig).toHaveBeenCalledTimes(1);
      expect(mockResponse.json).toHaveBeenCalledWith({
        valid: true,
        errors: [],
        message: 'Configuration is valid',
      });
    });

    it('should return validation errors', async () => {
      // Arrange
      const mockValidation = {
        valid: false,
        errors: ['Missing required field', 'Invalid format'],
      };

      mockConfigService.validateConfig.mockResolvedValue(mockValidation);

      // Act
      await controller.validateConfiguration(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        valid: false,
        errors: ['Missing required field', 'Invalid format'],
        message: 'Configuration has errors',
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Validation error');
      mockConfigService.validateConfig.mockRejectedValue(error);

      // Act
      await controller.validateConfiguration(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'CONFIGURATION_VALIDATION_FAILED',
          message: 'Failed to validate configuration',
          details: 'Validation error',
        },
      });
    });
  });
});
