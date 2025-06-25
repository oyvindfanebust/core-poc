import {
  generateSystemAccountId,
  isSystemAccount,
  isCustomerAccount,
  getSystemAccountNumericId,
  registerSystemAccountId,
  getSystemAccountMappings,
  clearSystemAccountMappings,
  getSEPASuspenseAccountId,
  isSEPACurrency,
  SYSTEM_ACCOUNT_TYPES,
  SEPA_SYSTEM_ACCOUNTS,
} from '../system-account-id.js';
import { AccountId } from '../value-objects.js';

describe('System Account ID', () => {
  beforeEach(() => {
    // Clear any existing mappings before each test
    clearSystemAccountMappings();
  });

  describe('generateSystemAccountId', () => {
    it('should generate correct ID for external transaction account', () => {
      const id = generateSystemAccountId('EXTERNAL_TRANSACTION', 'USD');
      expect(id).toBe('SYSTEM-EXTERNAL-USD');
    });

    it('should generate correct ID for equity account', () => {
      const id = generateSystemAccountId('EQUITY', 'EUR');
      expect(id).toBe('SYSTEM-EQUITY-EUR');
    });

    it('should generate correct ID for liability account', () => {
      const id = generateSystemAccountId('LIABILITY', 'GBP');
      expect(id).toBe('SYSTEM-LIABILITY-GBP');
    });

    it('should generate different IDs for different currencies', () => {
      const usdId = generateSystemAccountId('EXTERNAL_TRANSACTION', 'USD');
      const eurId = generateSystemAccountId('EXTERNAL_TRANSACTION', 'EUR');
      expect(usdId).not.toBe(eurId);
      expect(usdId).toBe('SYSTEM-EXTERNAL-USD');
      expect(eurId).toBe('SYSTEM-EXTERNAL-EUR');
    });
  });

  describe('isSystemAccount', () => {
    it('should return true for system account string IDs', () => {
      expect(isSystemAccount('SYSTEM-EXTERNAL-USD')).toBe(true);
      expect(isSystemAccount('SYSTEM-EQUITY-EUR')).toBe(true);
      expect(isSystemAccount('SEPA-OUT-SUSPENSE-EUR')).toBe(true);
    });

    it('should return false for customer account numeric IDs', () => {
      expect(isSystemAccount('123456789')).toBe(false);
      expect(isSystemAccount('987654321012345')).toBe(false);
    });

    it('should work with AccountId objects', () => {
      // Register a system account mapping first
      const systemIdentifier = 'SYSTEM-EXTERNAL-USD';
      const numericId = 123456789n;
      registerSystemAccountId(systemIdentifier, numericId);

      const systemAccountId = new AccountId(numericId);
      const customerAccountId = new AccountId('987654321');

      expect(isSystemAccount(systemAccountId)).toBe(true);
      expect(isSystemAccount(customerAccountId)).toBe(false);
    });

    it('should return true for registered system accounts', () => {
      const systemId = 'SYSTEM-TEST-USD';
      const numericId = 123456789n;

      registerSystemAccountId(systemId, numericId);
      expect(isSystemAccount(systemId)).toBe(true);
    });
  });

  describe('isCustomerAccount', () => {
    it('should return true for customer account IDs', () => {
      expect(isCustomerAccount('123456789')).toBe(true);
      expect(isCustomerAccount('987654321012345')).toBe(true);
    });

    it('should return false for system account IDs', () => {
      expect(isCustomerAccount('SYSTEM-EXTERNAL-USD')).toBe(false);
      expect(isCustomerAccount('SEPA-OUT-SUSPENSE-EUR')).toBe(false);
    });

    it('should work with AccountId objects', () => {
      // Register a system account mapping first
      const systemIdentifier = 'SYSTEM-EXTERNAL-USD';
      const numericId = 123456789n;
      registerSystemAccountId(systemIdentifier, numericId);

      const systemAccountId = new AccountId(numericId);
      const customerAccountId = new AccountId('987654321');

      expect(isCustomerAccount(systemAccountId)).toBe(false);
      expect(isCustomerAccount(customerAccountId)).toBe(true);
    });
  });

  describe('getSystemAccountNumericId', () => {
    it('should generate and return a numeric ID for new system accounts', () => {
      const systemId = 'SYSTEM-TEST-USD';
      const numericId = getSystemAccountNumericId(systemId);

      expect(typeof numericId).toBe('bigint');
      expect(numericId > 0n).toBe(true);
    });

    it('should return the same numeric ID for the same system account', () => {
      const systemId = 'SYSTEM-TEST-EUR';
      const numericId1 = getSystemAccountNumericId(systemId);
      const numericId2 = getSystemAccountNumericId(systemId);

      expect(numericId1).toBe(numericId2);
    });

    it('should generate different numeric IDs for different system accounts', () => {
      const systemId1 = 'SYSTEM-TEST-USD';
      const systemId2 = 'SYSTEM-TEST-EUR';

      const numericId1 = getSystemAccountNumericId(systemId1);
      const numericId2 = getSystemAccountNumericId(systemId2);

      expect(numericId1).not.toBe(numericId2);
    });
  });

  describe('registerSystemAccountId', () => {
    it('should register a system account ID mapping', () => {
      const systemId = 'SYSTEM-TEST-USD';
      const numericId = 123456789n;

      registerSystemAccountId(systemId, numericId);

      const retrievedId = getSystemAccountNumericId(systemId);
      expect(retrievedId).toBe(numericId);
    });

    it('should override existing mapping when registering same system ID', () => {
      const systemId = 'SYSTEM-TEST-USD';
      const numericId1 = 123456789n;
      const numericId2 = 987654321n;

      registerSystemAccountId(systemId, numericId1);
      registerSystemAccountId(systemId, numericId2);

      const retrievedId = getSystemAccountNumericId(systemId);
      expect(retrievedId).toBe(numericId2);
    });
  });

  describe('getSystemAccountMappings', () => {
    it('should return empty map when no mappings exist', () => {
      const mappings = getSystemAccountMappings();
      expect(mappings.size).toBe(0);
    });

    it('should return all registered mappings', () => {
      const mapping1 = { systemId: 'SYSTEM-TEST1-USD', numericId: 123n };
      const mapping2 = { systemId: 'SYSTEM-TEST2-EUR', numericId: 456n };

      registerSystemAccountId(mapping1.systemId, mapping1.numericId);
      registerSystemAccountId(mapping2.systemId, mapping2.numericId);

      const mappings = getSystemAccountMappings();
      expect(mappings.size).toBe(2);
      expect(mappings.get(mapping1.systemId)).toBe(mapping1.numericId);
      expect(mappings.get(mapping2.systemId)).toBe(mapping2.numericId);
    });

    it('should return readonly map', () => {
      const systemId = 'SYSTEM-TEST-USD';
      const numericId = 123456789n;

      registerSystemAccountId(systemId, numericId);
      const mappings = getSystemAccountMappings();

      // Should not be able to modify the returned map (it's a new Map instance)
      expect(mappings.has(systemId)).toBe(true);
      expect(mappings.get(systemId)).toBe(numericId);

      // The returned map should be separate from the internal map
      const originalSize = mappings.size;
      const newMappings = getSystemAccountMappings();
      expect(newMappings.size).toBe(originalSize);
    });
  });

  describe('clearSystemAccountMappings', () => {
    it('should clear all registered mappings', () => {
      registerSystemAccountId('SYSTEM-TEST1-USD', 123n);
      registerSystemAccountId('SYSTEM-TEST2-EUR', 456n);

      expect(getSystemAccountMappings().size).toBe(2);

      clearSystemAccountMappings();

      expect(getSystemAccountMappings().size).toBe(0);
    });
  });

  describe('getSEPASuspenseAccountId', () => {
    it('should return correct SEPA outgoing suspense account IDs', () => {
      expect(getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'EUR')).toBe('SEPA-OUT-SUSPENSE-EUR');
      expect(getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'NOK')).toBe('SEPA-OUT-SUSPENSE-NOK');
      expect(getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'SEK')).toBe('SEPA-OUT-SUSPENSE-SEK');
      expect(getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'DKK')).toBe('SEPA-OUT-SUSPENSE-DKK');
    });

    it('should return correct SEPA incoming suspense account IDs', () => {
      expect(getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'EUR')).toBe('SEPA-IN-SUSPENSE-EUR');
      expect(getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'NOK')).toBe('SEPA-IN-SUSPENSE-NOK');
      expect(getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'SEK')).toBe('SEPA-IN-SUSPENSE-SEK');
      expect(getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'DKK')).toBe('SEPA-IN-SUSPENSE-DKK');
    });

    it('should return correct SEPA settlement account IDs', () => {
      expect(getSEPASuspenseAccountId('SETTLEMENT', 'EUR')).toBe('SEPA-SETTLEMENT-EUR');
      expect(getSEPASuspenseAccountId('SETTLEMENT', 'NOK')).toBe('SEPA-SETTLEMENT-NOK');
      expect(getSEPASuspenseAccountId('SETTLEMENT', 'SEK')).toBe('SEPA-SETTLEMENT-SEK');
      expect(getSEPASuspenseAccountId('SETTLEMENT', 'DKK')).toBe('SEPA-SETTLEMENT-DKK');
    });
  });

  describe('isSEPACurrency', () => {
    it('should return true for SEPA-supported currencies', () => {
      expect(isSEPACurrency('EUR')).toBe(true);
      expect(isSEPACurrency('NOK')).toBe(true);
      expect(isSEPACurrency('SEK')).toBe(true);
      expect(isSEPACurrency('DKK')).toBe(true);
    });

    it('should return false for non-SEPA currencies', () => {
      expect(isSEPACurrency('USD')).toBe(false);
      expect(isSEPACurrency('GBP')).toBe(false);
      expect(isSEPACurrency('JPY')).toBe(false);
      expect(isSEPACurrency('CAD')).toBe(false);
      expect(isSEPACurrency('AUD')).toBe(false);
      expect(isSEPACurrency('CHF')).toBe(false);
    });
  });

  describe('Constants', () => {
    it('should have correct SYSTEM_ACCOUNT_TYPES values', () => {
      expect(SYSTEM_ACCOUNT_TYPES.EQUITY).toBe('SYSTEM-EQUITY');
      expect(SYSTEM_ACCOUNT_TYPES.LIABILITY).toBe('SYSTEM-LIABILITY');
      expect(SYSTEM_ACCOUNT_TYPES.SEPA_OUTGOING_SUSPENSE).toBe('SEPA-OUT-SUSPENSE');
      expect(SYSTEM_ACCOUNT_TYPES.SEPA_INCOMING_SUSPENSE).toBe('SEPA-IN-SUSPENSE');
      expect(SYSTEM_ACCOUNT_TYPES.SEPA_SETTLEMENT).toBe('SEPA-SETTLEMENT');
      expect(SYSTEM_ACCOUNT_TYPES.EXTERNAL_TRANSACTION).toBe('SYSTEM-EXTERNAL');
    });

    it('should have correct SEPA_SYSTEM_ACCOUNTS structure', () => {
      expect(SEPA_SYSTEM_ACCOUNTS.OUTGOING_SUSPENSE.EUR).toBe('SEPA-OUT-SUSPENSE-EUR');
      expect(SEPA_SYSTEM_ACCOUNTS.INCOMING_SUSPENSE.NOK).toBe('SEPA-IN-SUSPENSE-NOK');
      expect(SEPA_SYSTEM_ACCOUNTS.SETTLEMENT.SEK).toBe('SEPA-SETTLEMENT-SEK');

      // Test all currencies exist for all types
      const types = ['OUTGOING_SUSPENSE', 'INCOMING_SUSPENSE', 'SETTLEMENT'] as const;
      const currencies = ['EUR', 'NOK', 'SEK', 'DKK'] as const;

      types.forEach(type => {
        currencies.forEach(currency => {
          expect(SEPA_SYSTEM_ACCOUNTS[type][currency]).toBeDefined();
          expect(typeof SEPA_SYSTEM_ACCOUNTS[type][currency]).toBe('string');
        });
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete workflow for SEPA account creation', () => {
      const currency = 'EUR';
      const accountType = 'OUTGOING_SUSPENSE';

      // Get SEPA account ID
      const sepaAccountId = getSEPASuspenseAccountId(accountType, currency);
      expect(sepaAccountId).toBe('SEPA-OUT-SUSPENSE-EUR');

      // Verify it's recognized as a system account
      expect(isSystemAccount(sepaAccountId)).toBe(true);
      expect(isCustomerAccount(sepaAccountId)).toBe(false);

      // Register a numeric mapping
      const numericId = 123456789n;
      registerSystemAccountId(sepaAccountId, numericId);

      // Verify mapping retrieval
      const retrievedId = getSystemAccountNumericId(sepaAccountId);
      expect(retrievedId).toBe(numericId);

      // Verify it appears in mappings
      const mappings = getSystemAccountMappings();
      expect(mappings.has(sepaAccountId)).toBe(true);
      expect(mappings.get(sepaAccountId)).toBe(numericId);
    });

    it('should handle external transaction account workflow', () => {
      const currency = 'USD';

      // Generate system account ID
      const systemAccountId = generateSystemAccountId('EXTERNAL_TRANSACTION', currency);
      expect(systemAccountId).toBe('SYSTEM-EXTERNAL-USD');

      // Verify it's recognized as a system account
      expect(isSystemAccount(systemAccountId)).toBe(true);

      // Get numeric ID (should generate new one)
      const numericId = getSystemAccountNumericId(systemAccountId);
      expect(typeof numericId).toBe('bigint');

      // Subsequent calls should return same ID
      const numericId2 = getSystemAccountNumericId(systemAccountId);
      expect(numericId2).toBe(numericId);
    });
  });
});
