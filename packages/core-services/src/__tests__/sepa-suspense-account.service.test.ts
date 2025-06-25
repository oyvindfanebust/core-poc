import { SEPASuspenseAccountService } from '../services/sepa-suspense-account.service.js';
import { clearSystemAccountMappings } from '../system-account-id.js';

// Mock dependencies
jest.mock('../tigerbeetle.service.js');
jest.mock('../config/system-accounts.service.js');
jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockTigerBeetleService = {
  createAccount: jest.fn(),
} as any;

const mockSystemAccountConfigService = {
  getSystemAccount: jest.fn(),
  addSystemAccount: jest.fn(),
  getAllSystemAccounts: jest.fn(),
} as any;

describe('SEPASuspenseAccountService', () => {
  let service: SEPASuspenseAccountService;

  beforeEach(() => {
    jest.clearAllMocks();
    clearSystemAccountMappings();

    service = new SEPASuspenseAccountService(
      mockTigerBeetleService,
      mockSystemAccountConfigService,
    );
  });

  describe('createSEPASuspenseAccount', () => {
    it('should create new SEPA suspense account when none exists', async () => {
      const numericId = 123456789n;

      // No existing mapping
      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(null);

      // TigerBeetle creates account successfully
      mockTigerBeetleService.createAccount.mockResolvedValueOnce(numericId);

      // Config service stores mapping successfully
      mockSystemAccountConfigService.addSystemAccount.mockResolvedValueOnce(undefined);

      const result = await service.createSEPASuspenseAccount('OUTGOING_SUSPENSE', 'EUR');

      expect(result).toBe(numericId);
      expect(mockSystemAccountConfigService.getSystemAccount).toHaveBeenCalledWith(
        'SEPA-OUT-SUSPENSE-EUR',
      );
      expect(mockTigerBeetleService.createAccount).toHaveBeenCalledWith({
        type: 'LIABILITY',
        customerId: 'SYSTEM',
        currency: 'EUR',
      });
      expect(mockSystemAccountConfigService.addSystemAccount).toHaveBeenCalledWith(
        'SEPA-OUT-SUSPENSE-EUR',
        numericId.toString(),
        'SEPA_OUTGOING_SUSPENSE',
        'EUR',
        'SEPA outgoing transfer suspense account for EUR',
      );
    });

    it('should return existing account when mapping already exists', async () => {
      const existingNumericId = 987654321n;
      const existingMapping = {
        tigerBeetleId: existingNumericId.toString(),
        accountType: 'SEPA_INCOMING_SUSPENSE',
        currency: 'NOK',
        description: 'SEPA incoming transfer suspense account for NOK',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(existingMapping);

      const result = await service.createSEPASuspenseAccount('INCOMING_SUSPENSE', 'NOK');

      expect(result).toBe(existingNumericId);
      expect(mockSystemAccountConfigService.getSystemAccount).toHaveBeenCalledWith(
        'SEPA-IN-SUSPENSE-NOK',
      );
      expect(mockTigerBeetleService.createAccount).not.toHaveBeenCalled();
      expect(mockSystemAccountConfigService.addSystemAccount).not.toHaveBeenCalled();
    });

    it('should create settlement account with correct description', async () => {
      const numericId = 555666777n;

      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(null);
      mockTigerBeetleService.createAccount.mockResolvedValueOnce(numericId);
      mockSystemAccountConfigService.addSystemAccount.mockResolvedValueOnce(undefined);

      await service.createSEPASuspenseAccount('SETTLEMENT', 'SEK');

      expect(mockSystemAccountConfigService.addSystemAccount).toHaveBeenCalledWith(
        'SEPA-SETTLEMENT-SEK',
        numericId.toString(),
        'SEPA_SETTLEMENT',
        'SEK',
        'SEPA settlement account for SEK',
      );
    });

    it('should handle TigerBeetle account creation errors', async () => {
      const error = new Error('TigerBeetle creation failed');

      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(null);
      mockTigerBeetleService.createAccount.mockRejectedValueOnce(error);

      await expect(service.createSEPASuspenseAccount('OUTGOING_SUSPENSE', 'EUR')).rejects.toThrow(
        error,
      );

      expect(mockSystemAccountConfigService.addSystemAccount).not.toHaveBeenCalled();
    });

    it('should handle config service creation errors', async () => {
      const numericId = 123456789n;
      const error = new Error('Config service creation failed');

      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(null);
      mockTigerBeetleService.createAccount.mockResolvedValueOnce(numericId);
      mockSystemAccountConfigService.addSystemAccount.mockRejectedValueOnce(error);

      await expect(service.createSEPASuspenseAccount('OUTGOING_SUSPENSE', 'EUR')).rejects.toThrow(
        error,
      );
    });
  });

  describe('initializeAllSEPASuspenseAccounts', () => {
    it('should initialize all SEPA suspense accounts for all currencies', async () => {
      const mockNumericId = 123456789n;

      // Mock that no accounts exist
      mockSystemAccountConfigService.getSystemAccount.mockReturnValue(null);
      mockTigerBeetleService.createAccount.mockResolvedValue(mockNumericId);
      mockSystemAccountConfigService.addSystemAccount.mockResolvedValue(undefined);

      await service.initializeAllSEPASuspenseAccounts();

      // Should create 12 accounts: 3 types × 4 currencies
      expect(mockTigerBeetleService.createAccount).toHaveBeenCalledTimes(12);
      expect(mockSystemAccountConfigService.addSystemAccount).toHaveBeenCalledTimes(12);

      // Verify all account types are created
      const expectedCalls = [
        ['OUTGOING_SUSPENSE', 'EUR'],
        ['OUTGOING_SUSPENSE', 'NOK'],
        ['OUTGOING_SUSPENSE', 'SEK'],
        ['OUTGOING_SUSPENSE', 'DKK'],
        ['INCOMING_SUSPENSE', 'EUR'],
        ['INCOMING_SUSPENSE', 'NOK'],
        ['INCOMING_SUSPENSE', 'SEK'],
        ['INCOMING_SUSPENSE', 'DKK'],
        ['SETTLEMENT', 'EUR'],
        ['SETTLEMENT', 'NOK'],
        ['SETTLEMENT', 'SEK'],
        ['SETTLEMENT', 'DKK'],
      ];

      expectedCalls.forEach(([_type, currency]) => {
        expect(mockTigerBeetleService.createAccount).toHaveBeenCalledWith({
          type: 'LIABILITY',
          customerId: 'SYSTEM',
          currency,
        });
      });
    });

    it('should skip existing accounts during initialization', async () => {
      const mockNumericId = 123456789n;
      const existingMapping = {
        tigerBeetleId: mockNumericId.toString(),
        accountType: 'SEPA_OUTGOING_SUSPENSE',
        currency: 'EUR',
        description: 'SEPA outgoing transfer suspense account for EUR',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      // Mock that first account exists, others don't
      mockSystemAccountConfigService.getSystemAccount
        .mockReturnValueOnce(existingMapping) // First call returns existing
        .mockReturnValue(null); // All other calls return null

      mockTigerBeetleService.createAccount.mockResolvedValue(mockNumericId);
      mockSystemAccountConfigService.addSystemAccount.mockResolvedValue(undefined);

      await service.initializeAllSEPASuspenseAccounts();

      // Should create 11 accounts (12 total - 1 existing)
      expect(mockTigerBeetleService.createAccount).toHaveBeenCalledTimes(11);
      expect(mockSystemAccountConfigService.addSystemAccount).toHaveBeenCalledTimes(11);
    });
  });

  describe('loadSystemAccountMappings', () => {
    it('should load all mappings from config service', async () => {
      const mockMappings = {
        'SEPA-OUT-SUSPENSE-EUR': {
          tigerBeetleId: '123456789',
          accountType: 'SEPA_OUTGOING_SUSPENSE',
          currency: 'EUR',
          description: 'SEPA outgoing transfer suspense account for EUR',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
        'SEPA-IN-SUSPENSE-NOK': {
          tigerBeetleId: '987654321',
          accountType: 'SEPA_INCOMING_SUSPENSE',
          currency: 'NOK',
          description: 'SEPA incoming transfer suspense account for NOK',
          createdAt: '2024-01-01T00:00:00.000Z',
        },
      };

      mockSystemAccountConfigService.getAllSystemAccounts.mockReturnValueOnce(mockMappings);

      await service.loadSystemAccountMappings();

      expect(mockSystemAccountConfigService.getAllSystemAccounts).toHaveBeenCalledTimes(1);
    });

    it('should handle config service errors during loading', async () => {
      const error = new Error('Config service error');
      mockSystemAccountConfigService.getAllSystemAccounts.mockImplementationOnce(() => {
        throw error;
      });

      await expect(service.loadSystemAccountMappings()).rejects.toThrow(error);
    });
  });

  describe('getSEPASuspenseAccountNumericId', () => {
    it('should return numeric ID from config when not in cache', async () => {
      const mapping = {
        tigerBeetleId: '123456789',
        accountType: 'SEPA_OUTGOING_SUSPENSE',
        currency: 'EUR',
        description: 'SEPA outgoing transfer suspense account for EUR',
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(mapping);

      const result = await service.getSEPASuspenseAccountNumericId('OUTGOING_SUSPENSE', 'EUR');

      expect(result).toBe(123456789n);
      expect(mockSystemAccountConfigService.getSystemAccount).toHaveBeenCalledWith(
        'SEPA-OUT-SUSPENSE-EUR',
      );
    });

    it('should throw error when account not found', async () => {
      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(null);

      await expect(
        service.getSEPASuspenseAccountNumericId('OUTGOING_SUSPENSE', 'EUR'),
      ).rejects.toThrow('SEPA suspense account not found: SEPA-OUT-SUSPENSE-EUR');
    });
  });

  describe('validateSEPACurrency', () => {
    it('should validate SEPA currencies without throwing', () => {
      expect(() => service.validateSEPACurrency('EUR')).not.toThrow();
      expect(() => service.validateSEPACurrency('NOK')).not.toThrow();
      expect(() => service.validateSEPACurrency('SEK')).not.toThrow();
      expect(() => service.validateSEPACurrency('DKK')).not.toThrow();
    });

    it('should throw error for non-SEPA currencies', () => {
      expect(() => service.validateSEPACurrency('USD')).toThrow(
        'Currency USD is not supported for SEPA operations. Supported currencies: EUR, NOK, SEK, DKK',
      );
      expect(() => service.validateSEPACurrency('GBP')).toThrow();
      expect(() => service.validateSEPACurrency('JPY')).toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow: load, create, and retrieve', async () => {
      // Step 1: Load existing mappings (empty initially)
      mockSystemAccountConfigService.getAllSystemAccounts.mockReturnValueOnce({});
      await service.loadSystemAccountMappings();

      // Step 2: Create a new account
      const numericId = 123456789n;
      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(null);
      mockTigerBeetleService.createAccount.mockResolvedValueOnce(numericId);
      mockSystemAccountConfigService.addSystemAccount.mockResolvedValueOnce(undefined);

      const createdId = await service.createSEPASuspenseAccount('OUTGOING_SUSPENSE', 'EUR');
      expect(createdId).toBe(numericId);

      // Step 3: Retrieve the account
      const mapping = {
        tigerBeetleId: numericId.toString(),
        accountType: 'SEPA_OUTGOING_SUSPENSE',
        currency: 'EUR',
        description: 'SEPA outgoing transfer suspense account for EUR',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(mapping);

      const retrievedId = await service.getSEPASuspenseAccountNumericId('OUTGOING_SUSPENSE', 'EUR');
      expect(retrievedId).toBe(numericId);
    });

    it('should handle currency validation in real scenarios', async () => {
      // Valid SEPA currency should work
      mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(null);
      mockTigerBeetleService.createAccount.mockResolvedValueOnce(123n);
      mockSystemAccountConfigService.addSystemAccount.mockResolvedValueOnce(undefined);

      await expect(
        service.createSEPASuspenseAccount('OUTGOING_SUSPENSE', 'EUR'),
      ).resolves.toBeDefined();

      // Invalid currency validation
      expect(() => service.validateSEPACurrency('USD')).toThrow();
    });
  });

  describe('Account descriptions', () => {
    it('should generate correct descriptions for each account type', async () => {
      const testCases = [
        ['OUTGOING_SUSPENSE', 'EUR', 'SEPA outgoing transfer suspense account for EUR'],
        ['INCOMING_SUSPENSE', 'NOK', 'SEPA incoming transfer suspense account for NOK'],
        ['SETTLEMENT', 'SEK', 'SEPA settlement account for SEK'],
      ] as const;

      for (const [_type, currency, expectedDescription] of testCases) {
        mockSystemAccountConfigService.getSystemAccount.mockReturnValueOnce(null);
        mockTigerBeetleService.createAccount.mockResolvedValueOnce(123n);
        mockSystemAccountConfigService.addSystemAccount.mockResolvedValueOnce(undefined);

        await service.createSEPASuspenseAccount(_type, currency);

        expect(mockSystemAccountConfigService.addSystemAccount).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(String),
          currency,
          expectedDescription,
        );

        jest.clearAllMocks();
      }
    });
  });
});
