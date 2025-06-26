import {
  generateCustomerAccountId,
  generateSystemAccountId,
  isSystemAccount,
  isCustomerAccount,
  isValidCustomerAccountId,
  isValidSystemAccountId,
  getSystemAccountNumericId,
  registerSystemAccountId,
  clearSystemAccountMappings,
} from '../system-account-id.js';

describe('Account ID Scheme', () => {
  beforeEach(() => {
    clearSystemAccountMappings();
  });

  describe('Customer Account IDs', () => {
    it('should generate valid customer account IDs', () => {
      const accountId = generateCustomerAccountId();

      expect(typeof accountId).toBe('bigint');
      expect(accountId > 0n).toBe(true);
      expect(isValidCustomerAccountId(accountId)).toBe(true);
      expect(isCustomerAccount(accountId.toString())).toBe(true);
      expect(isSystemAccount(accountId.toString())).toBe(false);
    });

    it('should validate customer account IDs correctly', () => {
      // Valid customer account IDs (numeric only)
      expect(isValidCustomerAccountId('123456789')).toBe(true);
      expect(isValidCustomerAccountId('1234567890123456789')).toBe(true);
      expect(isValidCustomerAccountId(123456789n)).toBe(true);

      // Invalid customer account IDs
      expect(isValidCustomerAccountId('SYSTEM-EQUITY-EUR')).toBe(false);
      expect(isValidCustomerAccountId('SEPA-OUT-SUSPENSE-EUR')).toBe(false);
      expect(isValidCustomerAccountId('abc123')).toBe(false);
      expect(isValidCustomerAccountId('')).toBe(false);
    });

    it('should generate unique customer account IDs', () => {
      const id1 = generateCustomerAccountId();
      const id2 = generateCustomerAccountId();

      expect(id1).not.toBe(id2);
    });
  });

  describe('System Account IDs', () => {
    it('should generate correct system account IDs', () => {
      expect(generateSystemAccountId('EQUITY', 'EUR')).toBe('SYSTEM-EQUITY-EUR');
      expect(generateSystemAccountId('LIABILITY', 'NOK')).toBe('SYSTEM-LIABILITY-NOK');
      expect(generateSystemAccountId('EXTERNAL_TRANSACTION', 'SEK')).toBe('SYSTEM-EXTERNAL-SEK');
    });

    it('should validate system account IDs correctly', () => {
      // Valid system account IDs
      expect(isValidSystemAccountId('SYSTEM-EQUITY-EUR')).toBe(true);
      expect(isValidSystemAccountId('SYSTEM-LIABILITY-NOK')).toBe(true);
      expect(isValidSystemAccountId('SYSTEM-EXTERNAL-SEK')).toBe(true);
      expect(isValidSystemAccountId('SEPA-OUT-SUSPENSE-EUR')).toBe(true);
      expect(isValidSystemAccountId('SEPA-IN-SUSPENSE-NOK')).toBe(true);
      expect(isValidSystemAccountId('SEPA-SETTLEMENT-DKK')).toBe(true);

      // Invalid system account IDs
      expect(isValidSystemAccountId('SYSTEM-INVALID-EUR')).toBe(false);
      expect(isValidSystemAccountId('SEPA-INVALID-EUR')).toBe(false);
      expect(isValidSystemAccountId('SYSTEM-EQUITY-INVALID')).toBe(false);
      expect(isValidSystemAccountId('INVALID-EQUITY-EUR')).toBe(false);
      expect(isValidSystemAccountId('123456789')).toBe(false);
      expect(isValidSystemAccountId('')).toBe(false);
    });

    it('should recognize system accounts', () => {
      const systemAccountId = generateSystemAccountId('EQUITY', 'EUR');

      expect(isSystemAccount(systemAccountId)).toBe(true);
      expect(isCustomerAccount(systemAccountId)).toBe(false);
    });

    it('should generate different IDs for different types and currencies', () => {
      const eurEquity = generateSystemAccountId('EQUITY', 'EUR');
      const nokEquity = generateSystemAccountId('EQUITY', 'NOK');
      const eurLiability = generateSystemAccountId('LIABILITY', 'EUR');

      expect(eurEquity).not.toBe(nokEquity);
      expect(eurEquity).not.toBe(eurLiability);
      expect(nokEquity).not.toBe(eurLiability);
    });
  });

  describe('System Account Numeric ID Mapping', () => {
    it('should generate and store numeric IDs for system accounts', () => {
      const systemAccountId = 'SYSTEM-EQUITY-EUR';
      const numericId = getSystemAccountNumericId(systemAccountId);

      expect(typeof numericId).toBe('bigint');
      expect(numericId > 0n).toBe(true);

      // Should return the same ID on subsequent calls
      const numericId2 = getSystemAccountNumericId(systemAccountId);
      expect(numericId2).toBe(numericId);
    });

    it('should generate different numeric IDs for different system accounts', () => {
      const numericId1 = getSystemAccountNumericId('SYSTEM-EQUITY-EUR');
      const numericId2 = getSystemAccountNumericId('SYSTEM-LIABILITY-EUR');

      expect(numericId1).not.toBe(numericId2);
    });

    it('should allow manual registration of system account mappings', () => {
      const systemAccountId = 'SYSTEM-TEST-EUR';
      const numericId = 123456789n;

      registerSystemAccountId(systemAccountId, numericId);

      const retrievedId = getSystemAccountNumericId(systemAccountId);
      expect(retrievedId).toBe(numericId);
    });

    it('should recognize manually registered system accounts', () => {
      const systemAccountId = 'SYSTEM-TEST-EUR';
      const numericId = 123456789n;

      registerSystemAccountId(systemAccountId, numericId);

      expect(isSystemAccount(systemAccountId)).toBe(true);
      expect(isSystemAccount(numericId.toString())).toBe(true);
    });
  });

  describe('ID Collision Prevention', () => {
    it('should never generate conflicting IDs between customer and system accounts', () => {
      // Generate some customer account IDs
      const customerIds = Array.from({ length: 100 }, () => generateCustomerAccountId());

      // Generate some system account IDs
      const systemIds = [
        generateSystemAccountId('EQUITY', 'EUR'),
        generateSystemAccountId('LIABILITY', 'NOK'),
        generateSystemAccountId('EXTERNAL_TRANSACTION', 'SEK'),
      ];

      // No customer ID should be recognized as a system account
      customerIds.forEach(id => {
        expect(isSystemAccount(id.toString())).toBe(false);
        expect(isCustomerAccount(id.toString())).toBe(true);
      });

      // No system ID should be recognized as a customer account
      systemIds.forEach(id => {
        expect(isSystemAccount(id)).toBe(true);
        expect(isCustomerAccount(id)).toBe(false);
      });
    });

    it('should maintain separation even with numeric representations', () => {
      const customerAccountId = generateCustomerAccountId();
      const systemAccountId = 'SYSTEM-EQUITY-EUR';
      const systemNumericId = getSystemAccountNumericId(systemAccountId);

      // Customer numeric ID should not be recognized as system
      expect(isSystemAccount(customerAccountId.toString())).toBe(false);

      // System numeric ID should be recognized as system
      expect(isSystemAccount(systemNumericId.toString())).toBe(true);

      // They should be different
      expect(customerAccountId.toString()).not.toBe(systemNumericId.toString());
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty and invalid inputs gracefully', () => {
      expect(isSystemAccount('')).toBe(false);
      expect(isCustomerAccount('')).toBe(false);
      expect(isValidCustomerAccountId('')).toBe(false);
      expect(isValidSystemAccountId('')).toBe(false);
    });

    it('should handle very large customer account IDs', () => {
      const largeId = BigInt('9'.repeat(18)); // 18 nines
      expect(isValidCustomerAccountId(largeId)).toBe(true);
      expect(isCustomerAccount(largeId.toString())).toBe(true);
    });

    it('should reject customer IDs that look like system IDs', () => {
      // Even if someone tries to create a customer account with a system-like ID
      expect(isValidCustomerAccountId('SYSTEM-FAKE-EUR')).toBe(false);
      expect(isValidCustomerAccountId('SEPA-FAKE-EUR')).toBe(false);
    });
  });
});
