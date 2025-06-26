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

      // Should have 3 core banking accounts
      expect(response.body.count).toBe(3);
      expect(Array.isArray(response.body.accounts)).toBe(true);
      expect(response.body.accounts).toHaveLength(3);

      // Verify account structure
      const account = response.body.accounts[0];
      expect(account).toHaveProperty('systemIdentifier');
      expect(account).toHaveProperty('tigerBeetleId');
      expect(account).toHaveProperty('accountType');
      expect(account).toHaveProperty('currency');
      expect(account).toHaveProperty('description');
      expect(account).toHaveProperty('createdAt');
    });

    it('should include all required core account types', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);

      const accountTypes = response.body.accounts.map((account: any) => account.accountType);
      const uniqueAccountTypes = [...new Set(accountTypes)];

      expect(uniqueAccountTypes).toContain('OUTGOING_SUSPENSE');
      expect(uniqueAccountTypes).toContain('INCOMING_SUSPENSE');
      expect(uniqueAccountTypes).toContain('CLEARING');
      expect(uniqueAccountTypes).toHaveLength(3);
    });

    it('should include EUR currency for all accounts', async () => {
      const response = await api.get('/api/system-accounts');

      expect(response.status).toBe(200);

      const currencies = response.body.accounts.map((account: any) => account.currency);
      const uniqueCurrencies = [...new Set(currencies)];

      expect(uniqueCurrencies).toContain('EUR');
      expect(uniqueCurrencies).toHaveLength(1);
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

      const expectedAccounts = ['SYSTEM-SUSPENSE-OUT', 'SYSTEM-SUSPENSE-IN', 'SYSTEM-CLEARING'];

      const accountIdentifiers = response.body.accounts.map(
        (account: any) => account.systemIdentifier,
      );

      expectedAccounts.forEach(expectedAccount => {
        expect(accountIdentifiers).toContain(expectedAccount);
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
