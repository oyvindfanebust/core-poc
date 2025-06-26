import {
  clearSystemAccountMappings,
  getSEPASuspenseAccountId,
  getSystemAccountNumericId,
  SEPA_SYSTEM_ACCOUNTS,
  isSEPACurrency,
  generateSystemAccountId,
  isValidSystemAccountId,
} from '../system-account-id.js';

describe('SEPA Account Helpers', () => {
  beforeEach(() => {
    clearSystemAccountMappings();
  });

  describe('getSEPASuspenseAccountId', () => {
    it('should generate correct SEPA outgoing suspense account IDs', () => {
      expect(getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'EUR')).toBe('SEPA-OUT-SUSPENSE-EUR');
      expect(getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'NOK')).toBe('SEPA-OUT-SUSPENSE-NOK');
      expect(getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'SEK')).toBe('SEPA-OUT-SUSPENSE-SEK');
      expect(getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'DKK')).toBe('SEPA-OUT-SUSPENSE-DKK');
    });

    it('should generate correct SEPA incoming suspense account IDs', () => {
      expect(getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'EUR')).toBe('SEPA-IN-SUSPENSE-EUR');
      expect(getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'NOK')).toBe('SEPA-IN-SUSPENSE-NOK');
      expect(getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'SEK')).toBe('SEPA-IN-SUSPENSE-SEK');
      expect(getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'DKK')).toBe('SEPA-IN-SUSPENSE-DKK');
    });

    it('should generate correct SEPA settlement account IDs', () => {
      expect(getSEPASuspenseAccountId('SETTLEMENT', 'EUR')).toBe('SEPA-SETTLEMENT-EUR');
      expect(getSEPASuspenseAccountId('SETTLEMENT', 'NOK')).toBe('SEPA-SETTLEMENT-NOK');
      expect(getSEPASuspenseAccountId('SETTLEMENT', 'SEK')).toBe('SEPA-SETTLEMENT-SEK');
      expect(getSEPASuspenseAccountId('SETTLEMENT', 'DKK')).toBe('SEPA-SETTLEMENT-DKK');
    });
  });

  describe('SEPA_SYSTEM_ACCOUNTS constant', () => {
    it('should contain all required SEPA account types', () => {
      expect(SEPA_SYSTEM_ACCOUNTS).toHaveProperty('OUTGOING_SUSPENSE');
      expect(SEPA_SYSTEM_ACCOUNTS).toHaveProperty('INCOMING_SUSPENSE');
      expect(SEPA_SYSTEM_ACCOUNTS).toHaveProperty('SETTLEMENT');
    });

    it('should contain all required currencies for each type', () => {
      const currencies = ['EUR', 'NOK', 'SEK', 'DKK'];

      Object.keys(SEPA_SYSTEM_ACCOUNTS).forEach(accountType => {
        currencies.forEach(currency => {
          expect(
            SEPA_SYSTEM_ACCOUNTS[accountType as keyof typeof SEPA_SYSTEM_ACCOUNTS],
          ).toHaveProperty(currency);
        });
      });
    });

    it('should have correctly formatted account IDs', () => {
      expect(SEPA_SYSTEM_ACCOUNTS.OUTGOING_SUSPENSE.EUR).toBe('SEPA-OUT-SUSPENSE-EUR');
      expect(SEPA_SYSTEM_ACCOUNTS.INCOMING_SUSPENSE.NOK).toBe('SEPA-IN-SUSPENSE-NOK');
      expect(SEPA_SYSTEM_ACCOUNTS.SETTLEMENT.SEK).toBe('SEPA-SETTLEMENT-SEK');
    });
  });

  describe('isSEPACurrency', () => {
    it('should return true for supported SEPA currencies', () => {
      expect(isSEPACurrency('EUR')).toBe(true);
      expect(isSEPACurrency('NOK')).toBe(true);
      expect(isSEPACurrency('SEK')).toBe(true);
      expect(isSEPACurrency('DKK')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isSEPACurrency('USD' as any)).toBe(false);
      expect(isSEPACurrency('GBP' as any)).toBe(false);
      expect(isSEPACurrency('JPY' as any)).toBe(false);
    });
  });

  describe('SEPA account ID validation', () => {
    it('should validate SEPA account IDs as valid system accounts', () => {
      const sepaAccountIds = [
        'SEPA-OUT-SUSPENSE-EUR',
        'SEPA-IN-SUSPENSE-NOK',
        'SEPA-SETTLEMENT-SEK',
        'SEPA-OUT-SUSPENSE-DKK',
        'SEPA-IN-SUSPENSE-EUR',
        'SEPA-SETTLEMENT-NOK',
      ];

      sepaAccountIds.forEach(accountId => {
        expect(isValidSystemAccountId(accountId)).toBe(true);
      });
    });

    it('should reject invalid SEPA account IDs', () => {
      const invalidIds = [
        'SEPA-INVALID-EUR',
        'SEPA-OUT-SUSPENSE-USD',
        'SEPA-SETTLEMENT',
        'INVALID-OUT-SUSPENSE-EUR',
        'sepa-out-suspense-eur', // lowercase
        'SEPA-OUT-SUSPENSE-eur', // lowercase currency
      ];

      invalidIds.forEach(accountId => {
        expect(isValidSystemAccountId(accountId)).toBe(false);
      });
    });
  });

  describe('Numeric ID mapping for SEPA accounts', () => {
    it('should generate unique numeric IDs for different SEPA accounts', () => {
      const outgoingEUR = getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'EUR');
      const incomingEUR = getSEPASuspenseAccountId('INCOMING_SUSPENSE', 'EUR');
      const settlementEUR = getSEPASuspenseAccountId('SETTLEMENT', 'EUR');

      const numericId1 = getSystemAccountNumericId(outgoingEUR);
      const numericId2 = getSystemAccountNumericId(incomingEUR);
      const numericId3 = getSystemAccountNumericId(settlementEUR);

      expect(numericId1).not.toBe(numericId2);
      expect(numericId1).not.toBe(numericId3);
      expect(numericId2).not.toBe(numericId3);

      // All should be valid bigints
      expect(typeof numericId1).toBe('bigint');
      expect(typeof numericId2).toBe('bigint');
      expect(typeof numericId3).toBe('bigint');
    });

    it('should generate consistent numeric IDs for the same SEPA account', () => {
      const accountId = getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'EUR');

      const numericId1 = getSystemAccountNumericId(accountId);
      const numericId2 = getSystemAccountNumericId(accountId);

      expect(numericId1).toBe(numericId2);
    });

    it('should generate different numeric IDs for same type but different currencies', () => {
      const eurAccount = getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'EUR');
      const nokAccount = getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'NOK');
      const sekAccount = getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'SEK');
      const dkkAccount = getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'DKK');

      const eurNumeric = getSystemAccountNumericId(eurAccount);
      const nokNumeric = getSystemAccountNumericId(nokAccount);
      const sekNumeric = getSystemAccountNumericId(sekAccount);
      const dkkNumeric = getSystemAccountNumericId(dkkAccount);

      // All should be different
      const numericIds = [eurNumeric, nokNumeric, sekNumeric, dkkNumeric];
      const uniqueIds = new Set(numericIds.map(id => id.toString()));
      expect(uniqueIds.size).toBe(4);
    });
  });

  describe('Complete SEPA account set validation', () => {
    it('should create all 12 SEPA accounts (3 types × 4 currencies)', () => {
      const currencies: Array<'EUR' | 'NOK' | 'SEK' | 'DKK'> = ['EUR', 'NOK', 'SEK', 'DKK'];
      const accountTypes = ['OUTGOING_SUSPENSE', 'INCOMING_SUSPENSE', 'SETTLEMENT'] as const;

      const allAccounts: string[] = [];
      const allNumericIds: bigint[] = [];

      currencies.forEach(currency => {
        accountTypes.forEach(accountType => {
          const accountId = getSEPASuspenseAccountId(accountType, currency);
          const numericId = getSystemAccountNumericId(accountId);

          allAccounts.push(accountId);
          allNumericIds.push(numericId);

          // Validate each account ID
          expect(isValidSystemAccountId(accountId)).toBe(true);
          expect(typeof numericId).toBe('bigint');
          expect(numericId > 0n).toBe(true);
        });
      });

      // Should have 12 accounts total
      expect(allAccounts).toHaveLength(12);
      expect(allNumericIds).toHaveLength(12);

      // All accounts should be unique
      const uniqueAccounts = new Set(allAccounts);
      expect(uniqueAccounts.size).toBe(12);

      // All numeric IDs should be unique
      const uniqueNumericIds = new Set(allNumericIds.map(id => id.toString()));
      expect(uniqueNumericIds.size).toBe(12);

      // Expected account structure
      const expectedAccounts = [
        'SEPA-OUT-SUSPENSE-EUR',
        'SEPA-OUT-SUSPENSE-NOK',
        'SEPA-OUT-SUSPENSE-SEK',
        'SEPA-OUT-SUSPENSE-DKK',
        'SEPA-IN-SUSPENSE-EUR',
        'SEPA-IN-SUSPENSE-NOK',
        'SEPA-IN-SUSPENSE-SEK',
        'SEPA-IN-SUSPENSE-DKK',
        'SEPA-SETTLEMENT-EUR',
        'SEPA-SETTLEMENT-NOK',
        'SEPA-SETTLEMENT-SEK',
        'SEPA-SETTLEMENT-DKK',
      ];

      expectedAccounts.forEach(expectedAccount => {
        expect(allAccounts).toContain(expectedAccount);
      });
    });
  });

  describe('Integration with existing system account types', () => {
    it('should work alongside other system account types', () => {
      // Generate SEPA accounts
      const sepaAccount = getSEPASuspenseAccountId('OUTGOING_SUSPENSE', 'EUR');
      const sepaNumericId = getSystemAccountNumericId(sepaAccount);

      // Generate regular system accounts
      const equityAccount = generateSystemAccountId('EQUITY', 'EUR');
      const liabilityAccount = generateSystemAccountId('LIABILITY', 'NOK');
      const externalAccount = generateSystemAccountId('EXTERNAL_TRANSACTION', 'SEK');

      const equityNumericId = getSystemAccountNumericId(equityAccount);
      const liabilityNumericId = getSystemAccountNumericId(liabilityAccount);
      const externalNumericId = getSystemAccountNumericId(externalAccount);

      // All should be valid
      expect(isValidSystemAccountId(sepaAccount)).toBe(true);
      expect(isValidSystemAccountId(equityAccount)).toBe(true);
      expect(isValidSystemAccountId(liabilityAccount)).toBe(true);
      expect(isValidSystemAccountId(externalAccount)).toBe(true);

      // All numeric IDs should be unique
      const allNumericIds = [sepaNumericId, equityNumericId, liabilityNumericId, externalNumericId];
      const uniqueIds = new Set(allNumericIds.map(id => id.toString()));
      expect(uniqueIds.size).toBe(4);
    });
  });
});
