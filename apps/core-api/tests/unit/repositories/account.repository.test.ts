import { AccountRepository, AccountMetadata, AccountId } from '@core-poc/core-services';

describe('AccountRepository', () => {
  let accountRepository: AccountRepository;
  let mockDbQuery: jest.Mock;

  beforeEach(() => {
    mockDbQuery = jest.fn();

    // Mock the database connection
    const mockDb = {
      query: mockDbQuery,
    };

    accountRepository = new AccountRepository();
    // Override the db property to use our mock
    (accountRepository as any).db = mockDb;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save account metadata with account name', async () => {
      const accountMetadata: Omit<AccountMetadata, 'createdAt' | 'updatedAt'> = {
        accountId: BigInt('123456789'),
        customerId: 'CUSTOMER-123',
        accountType: 'DEPOSIT',
        currency: 'USD',
        accountName: 'My Savings Account',
      };

      mockDbQuery.mockResolvedValue({ rows: [] });

      await accountRepository.save(accountMetadata);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO accounts (account_id, customer_id, account_type, currency, account_name)',
        ),
        ['123456789', 'CUSTOMER-123', 'DEPOSIT', 'USD', 'My Savings Account'],
      );
    });

    it('should save account metadata without account name', async () => {
      const accountMetadata: Omit<AccountMetadata, 'createdAt' | 'updatedAt'> = {
        accountId: BigInt('123456789'),
        customerId: 'CUSTOMER-123',
        accountType: 'DEPOSIT',
        currency: 'USD',
      };

      mockDbQuery.mockResolvedValue({ rows: [] });

      await accountRepository.save(accountMetadata);

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO accounts (account_id, customer_id, account_type, currency, account_name)',
        ),
        ['123456789', 'CUSTOMER-123', 'DEPOSIT', 'USD', null],
      );
    });
  });

  describe('updateAccountName', () => {
    it('should update account name successfully', async () => {
      const accountId = new AccountId('123456789');
      const accountName = 'Updated Account Name';

      mockDbQuery.mockResolvedValue({ rowCount: 1 });

      const result = await accountRepository.updateAccountName(accountId, accountName);

      expect(result).toBe(true);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'UPDATE accounts SET account_name = $1, updated_at = CURRENT_TIMESTAMP WHERE account_id = $2',
        [accountName, '123456789'],
      );
    });

    it('should return false when account not found', async () => {
      const accountId = new AccountId('999999999');
      const accountName = 'Non-existent Account';

      mockDbQuery.mockResolvedValue({ rowCount: 0 });

      const result = await accountRepository.updateAccountName(accountId, accountName);

      expect(result).toBe(false);
    });

    it('should handle null account name', async () => {
      const accountId = new AccountId('123456789');

      mockDbQuery.mockResolvedValue({ rowCount: 1 });

      const result = await accountRepository.updateAccountName(accountId, null);

      expect(result).toBe(true);
      expect(mockDbQuery).toHaveBeenCalledWith(
        'UPDATE accounts SET account_name = $1, updated_at = CURRENT_TIMESTAMP WHERE account_id = $2',
        [null, '123456789'],
      );
    });
  });

  describe('findByCustomerId', () => {
    it('should return accounts with account names', async () => {
      const mockRows = [
        {
          account_id: '123456789',
          customer_id: 'CUSTOMER-123',
          account_type: 'DEPOSIT',
          currency: 'USD',
          account_name: 'My Savings',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          account_id: '987654321',
          customer_id: 'CUSTOMER-123',
          account_type: 'DEPOSIT',
          currency: 'EUR',
          account_name: null,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ];

      mockDbQuery.mockResolvedValue({ rows: mockRows });

      const result = await accountRepository.findByCustomerId({ value: 'CUSTOMER-123' } as any);

      expect(result).toHaveLength(2);
      expect(result[0].accountName).toBe('My Savings');
      expect(result[1].accountName).toBeNull();
    });
  });
});
