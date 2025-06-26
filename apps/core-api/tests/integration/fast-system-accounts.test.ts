import request from 'supertest';

describe('System Accounts API Integration Tests', () => {
  // Use supertest to test the Express app directly
  const api = request('http://localhost:7001');

  describe('GET /api/system-accounts', () => {
    it('should return all system accounts with proper structure', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metadata');
      expect(response.body).toHaveProperty('accounts');
      expect(response.body).toHaveProperty('count');

      // Should have 15 total accounts: 3 core + 12 SEPA (3 types × 4 currencies)
      expect(response.body.count).toBe(15);
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts).toHaveLength(15);

      // Verify account structure
      const account = response.body.accounts[0];
      expect(account).toHaveProperty('systemIdentifier');
      expect(account).toHaveProperty('tigerBeetleId');
      expect(account).toHaveProperty('accountType');
      expect(account).toHaveProperty('currency');
      expect(account).toHaveProperty('description');
      expect(account).toHaveProperty('createdAt');
    });

    it('should include all required core and SEPA account types', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);

      const accountTypes = response.body.accounts.map((account: any) => account.accountType);
      const uniqueAccountTypes = [...new Set(accountTypes)];

      // Core account types
      expect(uniqueAccountTypes).toContain('OUTGOING_SUSPENSE');
      expect(uniqueAccountTypes).toContain('INCOMING_SUSPENSE');
      expect(uniqueAccountTypes).toContain('CLEARING');

      // SEPA account types
      expect(uniqueAccountTypes).toContain('SEPA_OUTGOING_SUSPENSE');
      expect(uniqueAccountTypes).toContain('SEPA_INCOMING_SUSPENSE');
      expect(uniqueAccountTypes).toContain('SEPA_SETTLEMENT');

      // Should have 6 unique account types total
      expect(uniqueAccountTypes).toHaveLength(6);
    });

    it('should include all SEPA currencies', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);

      const currencies = response.body.accounts.map((account: any) => account.currency);
      const uniqueCurrencies = [...new Set(currencies)];

      // Should include all SEPA currencies
      expect(uniqueCurrencies).toContain('EUR');
      expect(uniqueCurrencies).toContain('NOK');
      expect(uniqueCurrencies).toContain('SEK');
      expect(uniqueCurrencies).toContain('DKK');

      // Should have 4 unique currencies total
      expect(uniqueCurrencies).toHaveLength(4);
    });
  });

  describe('GET /api/system-accounts/:systemIdentifier', () => {
    it('should return specific outgoing suspense account', async () => {
      const response = await api.get('/api/system-accounts/SYSTEM-SUSPENSE-OUT');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('systemIdentifier', 'SYSTEM-SUSPENSE-OUT');
      expect(response.body).toHaveProperty('currency', 'EUR');
      expect(response.body).toHaveProperty('accountType', 'OUTGOING_SUSPENSE');
      expect(response.body.description).toContain('General outgoing transfer suspense account');
    });

    it('should return 404 for non-existent system account', async () => {
      const response = await api.get('/api/system-accounts/NON-EXISTENT-ACCOUNT');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'SYSTEM_ACCOUNT_NOT_FOUND');
    });

    it('should return specific SEPA outgoing suspense account', async () => {
      const response = await api.get('/api/system-accounts/SEPA-OUT-SUSPENSE-EUR');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('systemIdentifier', 'SEPA-OUT-SUSPENSE-EUR');
      expect(response.body).toHaveProperty('currency', 'EUR');
      expect(response.body).toHaveProperty('accountType', 'SEPA_OUTGOING_SUSPENSE');
      expect(response.body.description).toContain('SEPA outgoing suspense account for EUR');
    });

    it('should return specific SEPA settlement account', async () => {
      const response = await api.get('/api/system-accounts/SEPA-SETTLEMENT-NOK');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('systemIdentifier', 'SEPA-SETTLEMENT-NOK');
      expect(response.body).toHaveProperty('currency', 'NOK');
      expect(response.body).toHaveProperty('accountType', 'SEPA_SETTLEMENT');
      expect(response.body.description).toContain('SEPA settlement account for NOK');
    });
  });

  describe('GET /api/system-accounts/type/:accountType', () => {
    it('should return clearing accounts only', async () => {
      const response = await api.get('/api/system-accounts/type/CLEARING');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accountType', 'CLEARING');
      expect(response.body).toHaveProperty('count', 1);

      // All accounts should be clearing type
      response.body.accounts.forEach((account: any) => {
        expect(account.accountType).toBe('CLEARING');
        expect(account.systemIdentifier).toBe('SYSTEM-CLEARING');
      });

      // Should have EUR currency
      const currencies = response.body.accounts.map((account: any) => account.currency);
      expect(currencies).toContain('EUR');
    });

    it('should return outgoing suspense accounts only', async () => {
      const response = await api.get('/api/system-accounts/type/OUTGOING_SUSPENSE');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accountType', 'OUTGOING_SUSPENSE');
      expect(response.body).toHaveProperty('count', 1);

      response.body.accounts.forEach((account: any) => {
        expect(account.accountType).toBe('OUTGOING_SUSPENSE');
        expect(account.systemIdentifier).toBe('SYSTEM-SUSPENSE-OUT');
      });
    });

    it('should return SEPA outgoing suspense accounts only', async () => {
      const response = await api.get('/api/system-accounts/type/SEPA_OUTGOING_SUSPENSE');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accountType', 'SEPA_OUTGOING_SUSPENSE');
      expect(response.body).toHaveProperty('count', 4); // All 4 currencies

      response.body.accounts.forEach((account: any) => {
        expect(account.accountType).toBe('SEPA_OUTGOING_SUSPENSE');
        expect(account.systemIdentifier).toMatch(/^SEPA-OUT-SUSPENSE-(EUR|NOK|SEK|DKK)$/);
      });

      // Should have all SEPA currencies
      const currencies = response.body.accounts.map((account: any) => account.currency);
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('NOK');
      expect(currencies).toContain('SEK');
      expect(currencies).toContain('DKK');
    });

    it('should return SEPA settlement accounts only', async () => {
      const response = await api.get('/api/system-accounts/type/SEPA_SETTLEMENT');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accountType', 'SEPA_SETTLEMENT');
      expect(response.body).toHaveProperty('count', 4); // All 4 currencies

      response.body.accounts.forEach((account: any) => {
        expect(account.accountType).toBe('SEPA_SETTLEMENT');
        expect(account.systemIdentifier).toMatch(/^SEPA-SETTLEMENT-(EUR|NOK|SEK|DKK)$/);
      });
    });

    it('should return empty result for non-existent account type', async () => {
      const response = await api.get('/api/system-accounts/type/NON_EXISTENT_TYPE');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accountType', 'NON_EXISTENT_TYPE');
      expect(response.body).toHaveProperty('accounts', []);
      expect(response.body).toHaveProperty('count', 0);
    });
  });

  describe('GET /api/system-accounts/validate', () => {
    it('should validate configuration successfully', async () => {
      const response = await api.get('/api/system-accounts/validate');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('errors', []);
      expect(response.body).toHaveProperty('message', 'Configuration is valid');
    });
  });

  describe('Expected Core Account Structure', () => {
    it('should have all required core accounts created automatically', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);

      const expectedCoreAccounts = ['SYSTEM-SUSPENSE-OUT', 'SYSTEM-SUSPENSE-IN', 'SYSTEM-CLEARING'];

      const expectedSEPAAccounts = [
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

      const accountIdentifiers = response.body.accounts.map(
        (account: any) => account.systemIdentifier,
      );

      // Check core accounts
      expectedCoreAccounts.forEach(expectedAccount => {
        expect(accountIdentifiers).toContain(expectedAccount);
      });

      // Check SEPA accounts
      expectedSEPAAccounts.forEach(expectedAccount => {
        expect(accountIdentifiers).toContain(expectedAccount);
      });

      // Verify we have exactly 15 accounts total
      expect(accountIdentifiers).toHaveLength(15);
    });

    it('should have all required SEPA accounts with correct structure', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);

      // Filter to SEPA accounts only
      const sepaAccounts = response.body.accounts.filter((account: any) =>
        account.systemIdentifier.startsWith('SEPA-'),
      );

      expect(sepaAccounts).toHaveLength(12); // 3 types × 4 currencies

      // Group by type
      const outgoingSuspense = sepaAccounts.filter(
        (acc: any) => acc.accountType === 'SEPA_OUTGOING_SUSPENSE',
      );
      const incomingSuspense = sepaAccounts.filter(
        (acc: any) => acc.accountType === 'SEPA_INCOMING_SUSPENSE',
      );
      const settlement = sepaAccounts.filter((acc: any) => acc.accountType === 'SEPA_SETTLEMENT');

      expect(outgoingSuspense).toHaveLength(4);
      expect(incomingSuspense).toHaveLength(4);
      expect(settlement).toHaveLength(4);

      // Each type should have all 4 currencies
      const currencies = ['EUR', 'NOK', 'SEK', 'DKK'];
      [outgoingSuspense, incomingSuspense, settlement].forEach(accountGroup => {
        const groupCurrencies = accountGroup.map((acc: any) => acc.currency);
        currencies.forEach(currency => {
          expect(groupCurrencies).toContain(currency);
        });
      });
    });

    it('should have valid TigerBeetle IDs for all accounts', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);

      response.body.accounts.forEach((account: any) => {
        // TigerBeetle IDs should be numeric strings
        expect(account.tigerBeetleId).toMatch(/^\d+$/);
        // Should be able to convert to BigInt
        expect(() => BigInt(account.tigerBeetleId)).not.toThrow();
        // Should be a positive number
        expect(BigInt(account.tigerBeetleId)).toBeGreaterThan(0n);
      });
    });

    it('should have valid creation timestamps', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);

      response.body.accounts.forEach((account: any) => {
        // Should be valid ISO date strings
        expect(() => new Date(account.createdAt)).not.toThrow();
        expect(new Date(account.createdAt).toISOString()).toBe(account.createdAt);
        // Should be recent (created today)
        const createdDate = new Date(account.createdAt);
        const now = new Date();
        const timeDiff = now.getTime() - createdDate.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        expect(hoursDiff).toBeLessThan(24); // Created within the last 24 hours
      });
    });
  });
});
