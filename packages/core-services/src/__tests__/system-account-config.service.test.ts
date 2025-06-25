import { promises as fs } from 'fs';

import {
  SystemAccountConfigService,
  SystemAccountConfig,
} from '../config/system-accounts.service.js';

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

jest.mock('../utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('SystemAccountConfigService', () => {
  let service: SystemAccountConfigService;
  const testConfigPath = '/test/config/system-accounts.json';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SystemAccountConfigService(testConfigPath);
  });

  describe('initialize', () => {
    it('should load existing config file successfully', async () => {
      const mockConfig: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
          'SEPA-OUT-SUSPENSE-EUR': {
            tigerBeetleId: '123456789',
            accountType: 'SEPA_OUTGOING_SUSPENSE',
            currency: 'EUR',
            description: 'SEPA outgoing transfer suspense account for EUR',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockConfig));

      await service.initialize();

      expect(mockFs.readFile).toHaveBeenCalledWith(testConfigPath, 'utf8');
    });

    it('should create default config when file does not exist', async () => {
      const enoentError = new Error('File not found') as any;
      enoentError.code = 'ENOENT';

      mockFs.readFile.mockRejectedValueOnce(enoentError);
      mockFs.access.mockRejectedValueOnce(new Error('Directory does not exist'));
      mockFs.mkdir.mockResolvedValueOnce(undefined);
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      mockFs.rename.mockResolvedValueOnce(undefined);

      await service.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/config', { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        `${testConfigPath}.tmp`,
        expect.stringContaining('"version": "1.0"'),
        'utf8',
      );
      expect(mockFs.rename).toHaveBeenCalledWith(`${testConfigPath}.tmp`, testConfigPath);
    });

    it('should throw error for invalid config format', async () => {
      mockFs.readFile.mockResolvedValueOnce('invalid json');

      await expect(service.initialize()).rejects.toThrow();
    });

    it('should throw error for config missing accounts section', async () => {
      const invalidConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        // Missing accounts section
      };

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(invalidConfig));

      await expect(service.initialize()).rejects.toThrow('Config file missing accounts section');
    });
  });

  describe('addSystemAccount', () => {
    beforeEach(async () => {
      const defaultConfig: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {},
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(defaultConfig));
      await service.initialize();
    });

    it('should add new system account successfully', async () => {
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      mockFs.rename.mockResolvedValueOnce(undefined);

      await service.addSystemAccount(
        'SEPA-OUT-SUSPENSE-EUR',
        '123456789',
        'SEPA_OUTGOING_SUSPENSE',
        'EUR',
        'SEPA outgoing transfer suspense account for EUR',
      );

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        `${testConfigPath}.tmp`,
        expect.stringContaining('SEPA-OUT-SUSPENSE-EUR'),
        'utf8',
      );
      expect(mockFs.rename).toHaveBeenCalledWith(`${testConfigPath}.tmp`, testConfigPath);
    });

    it('should throw error when account already exists', async () => {
      // First add an account
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      mockFs.rename.mockResolvedValueOnce(undefined);

      await service.addSystemAccount(
        'SEPA-OUT-SUSPENSE-EUR',
        '123456789',
        'SEPA_OUTGOING_SUSPENSE',
        'EUR',
        'SEPA outgoing transfer suspense account for EUR',
      );

      // Try to add the same account again
      await expect(
        service.addSystemAccount(
          'SEPA-OUT-SUSPENSE-EUR',
          '987654321',
          'SEPA_OUTGOING_SUSPENSE',
          'EUR',
          'Duplicate account',
        ),
      ).rejects.toThrow('System account already exists: SEPA-OUT-SUSPENSE-EUR');
    });

    it('should throw error when not initialized', async () => {
      const uninitializedService = new SystemAccountConfigService(testConfigPath);

      await expect(
        uninitializedService.addSystemAccount(
          'SEPA-OUT-SUSPENSE-EUR',
          '123456789',
          'SEPA_OUTGOING_SUSPENSE',
          'EUR',
          'Description',
        ),
      ).rejects.toThrow('Configuration not initialized');
    });
  });

  describe('getSystemAccount', () => {
    beforeEach(async () => {
      const configWithAccount: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
          'SEPA-OUT-SUSPENSE-EUR': {
            tigerBeetleId: '123456789',
            accountType: 'SEPA_OUTGOING_SUSPENSE',
            currency: 'EUR',
            description: 'SEPA outgoing transfer suspense account for EUR',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(configWithAccount));
      await service.initialize();
    });

    it('should return existing account', () => {
      const account = service.getSystemAccount('SEPA-OUT-SUSPENSE-EUR');

      expect(account).toEqual({
        tigerBeetleId: '123456789',
        accountType: 'SEPA_OUTGOING_SUSPENSE',
        currency: 'EUR',
        description: 'SEPA outgoing transfer suspense account for EUR',
        createdAt: '2024-01-01T00:00:00.000Z',
      });
    });

    it('should return null for non-existent account', () => {
      const account = service.getSystemAccount('NON-EXISTENT-ACCOUNT');
      expect(account).toBeNull();
    });

    it('should throw error when not initialized', () => {
      const uninitializedService = new SystemAccountConfigService(testConfigPath);

      expect(() => uninitializedService.getSystemAccount('SEPA-OUT-SUSPENSE-EUR')).toThrow(
        'Configuration not initialized',
      );
    });
  });

  describe('getAllSystemAccounts', () => {
    beforeEach(async () => {
      const configWithAccounts: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
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
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(configWithAccounts));
      await service.initialize();
    });

    it('should return all system accounts', () => {
      const accounts = service.getAllSystemAccounts();

      expect(Object.keys(accounts)).toHaveLength(2);
      expect(accounts['SEPA-OUT-SUSPENSE-EUR']).toBeDefined();
      expect(accounts['SEPA-IN-SUSPENSE-NOK']).toBeDefined();
    });

    it('should return copy of accounts (not reference)', () => {
      const accounts1 = service.getAllSystemAccounts();
      const accounts2 = service.getAllSystemAccounts();

      expect(accounts1).toEqual(accounts2);
      expect(accounts1).not.toBe(accounts2);
    });
  });

  describe('getSystemAccountsByType', () => {
    beforeEach(async () => {
      const configWithAccounts: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
          'SEPA-OUT-SUSPENSE-EUR': {
            tigerBeetleId: '123456789',
            accountType: 'SEPA_OUTGOING_SUSPENSE',
            currency: 'EUR',
            description: 'SEPA outgoing transfer suspense account for EUR',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          'SEPA-OUT-SUSPENSE-NOK': {
            tigerBeetleId: '987654321',
            accountType: 'SEPA_OUTGOING_SUSPENSE',
            currency: 'NOK',
            description: 'SEPA outgoing transfer suspense account for NOK',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
          'SEPA-IN-SUSPENSE-EUR': {
            tigerBeetleId: '555666777',
            accountType: 'SEPA_INCOMING_SUSPENSE',
            currency: 'EUR',
            description: 'SEPA incoming transfer suspense account for EUR',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(configWithAccounts));
      await service.initialize();
    });

    it('should return accounts filtered by type', () => {
      const outgoingAccounts = service.getSystemAccountsByType('SEPA_OUTGOING_SUSPENSE');

      expect(Object.keys(outgoingAccounts)).toHaveLength(2);
      expect(outgoingAccounts['SEPA-OUT-SUSPENSE-EUR']).toBeDefined();
      expect(outgoingAccounts['SEPA-OUT-SUSPENSE-NOK']).toBeDefined();
      expect(outgoingAccounts['SEPA-IN-SUSPENSE-EUR']).toBeUndefined();
    });

    it('should return empty object when no accounts match type', () => {
      const accounts = service.getSystemAccountsByType('NON_EXISTENT_TYPE');
      expect(accounts).toEqual({});
    });
  });

  describe('hasSystemAccount', () => {
    beforeEach(async () => {
      const configWithAccount: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
          'SEPA-OUT-SUSPENSE-EUR': {
            tigerBeetleId: '123456789',
            accountType: 'SEPA_OUTGOING_SUSPENSE',
            currency: 'EUR',
            description: 'SEPA outgoing transfer suspense account for EUR',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(configWithAccount));
      await service.initialize();
    });

    it('should return true for existing account', () => {
      expect(service.hasSystemAccount('SEPA-OUT-SUSPENSE-EUR')).toBe(true);
    });

    it('should return false for non-existent account', () => {
      expect(service.hasSystemAccount('NON-EXISTENT-ACCOUNT')).toBe(false);
    });

    it('should return false when not initialized', () => {
      const uninitializedService = new SystemAccountConfigService(testConfigPath);
      expect(uninitializedService.hasSystemAccount('SEPA-OUT-SUSPENSE-EUR')).toBe(false);
    });
  });

  describe('findSystemIdentifierByTigerBeetleId', () => {
    beforeEach(async () => {
      const configWithAccounts: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
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
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(configWithAccounts));
      await service.initialize();
    });

    it('should find system identifier by TigerBeetle ID', () => {
      const identifier = service.findSystemIdentifierByTigerBeetleId('123456789');
      expect(identifier).toBe('SEPA-OUT-SUSPENSE-EUR');
    });

    it('should return null when TigerBeetle ID not found', () => {
      const identifier = service.findSystemIdentifierByTigerBeetleId('999999999');
      expect(identifier).toBeNull();
    });

    it('should return null when not initialized', () => {
      const uninitializedService = new SystemAccountConfigService(testConfigPath);
      const identifier = uninitializedService.findSystemIdentifierByTigerBeetleId('123456789');
      expect(identifier).toBeNull();
    });
  });

  describe('validateConfig', () => {
    it('should validate valid configuration', async () => {
      const validConfig: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
          'SEPA-OUT-SUSPENSE-EUR': {
            tigerBeetleId: '123456789',
            accountType: 'SEPA_OUTGOING_SUSPENSE',
            currency: 'EUR',
            description: 'SEPA outgoing transfer suspense account for EUR',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(validConfig));
      await service.initialize();

      const validation = await service.validateConfig();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing fields', async () => {
      const invalidConfig = {
        // Missing version
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
          'SEPA-OUT-SUSPENSE-EUR': {
            tigerBeetleId: '123456789',
            // Missing accountType
            currency: 'EUR',
            description: 'Description',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(invalidConfig));
      await service.initialize();

      const validation = await service.validateConfig();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing version field');
      expect(validation.errors).toContain('Account SEPA-OUT-SUSPENSE-EUR: missing accountType');
    });

    it('should detect invalid TigerBeetle ID format', async () => {
      const configWithInvalidId: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {
          'SEPA-OUT-SUSPENSE-EUR': {
            tigerBeetleId: 'invalid-id',
            accountType: 'SEPA_OUTGOING_SUSPENSE',
            currency: 'EUR',
            description: 'Description',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(configWithInvalidId));
      await service.initialize();

      const validation = await service.validateConfig();

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Account SEPA-OUT-SUSPENSE-EUR: invalid tigerBeetleId format',
      );
    });
  });

  describe('atomic file operations', () => {
    it('should clean up temp file on write failure', async () => {
      const defaultConfig: SystemAccountConfig = {
        version: '1.0',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        accounts: {},
      };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(defaultConfig));
      await service.initialize();

      // Mock write to succeed but rename to fail
      mockFs.writeFile.mockResolvedValueOnce(undefined);
      mockFs.rename.mockRejectedValueOnce(new Error('Rename failed'));
      mockFs.unlink.mockResolvedValueOnce(undefined);

      await expect(
        service.addSystemAccount(
          'SEPA-OUT-SUSPENSE-EUR',
          '123456789',
          'SEPA_OUTGOING_SUSPENSE',
          'EUR',
          'Description',
        ),
      ).rejects.toThrow('Rename failed');

      expect(mockFs.unlink).toHaveBeenCalledWith(`${testConfigPath}.tmp`);
    });
  });
});
