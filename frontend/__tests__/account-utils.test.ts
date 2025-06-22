import { formatAccountDisplayName, formatAccountOption } from '../lib/account-utils';

const mockAccount = {
  accountId: '123456789012345',
  customerId: 'CUSTOMER-123',
  accountType: 'DEPOSIT' as const,
  currency: 'USD' as const,
  balance: 150000, // $1500.00
  totalCredits: 200000,
  totalDebits: 50000,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
};

describe('Account Utils', () => {
  describe('formatAccountDisplayName', () => {
    it('should display nickname with masked ID when nickname exists', () => {
      const accountWithName = { ...mockAccount, accountName: 'My Savings' };
      const result = formatAccountDisplayName(accountWithName);
      expect(result).toBe('My Savings (••••3345)');
    });

    it('should display full ID when nickname exists and showFullId is true', () => {
      const accountWithName = { ...mockAccount, accountName: 'My Savings' };
      const result = formatAccountDisplayName(accountWithName, true);
      expect(result).toBe('My Savings (123456789012345)');
    });

    it('should display type and masked ID when no nickname', () => {
      const result = formatAccountDisplayName(mockAccount);
      expect(result).toBe('DEPOSIT Account (••••3345)');
    });

    it('should display type and full ID when no nickname and showFullId is true', () => {
      const result = formatAccountDisplayName(mockAccount, true);
      expect(result).toBe('DEPOSIT Account (123456789012345)');
    });

    it('should handle null accountName', () => {
      const accountWithNullName = { ...mockAccount, accountName: null };
      const result = formatAccountDisplayName(accountWithNullName);
      expect(result).toBe('DEPOSIT Account (••••3345)');
    });
  });

  describe('formatAccountOption', () => {
    it('should format account with nickname for select option', () => {
      const accountWithName = { ...mockAccount, accountName: 'My Savings' };
      const result = formatAccountOption(accountWithName);
      expect(result).toBe('My Savings (••••3345) - $1,500.00 USD');
    });

    it('should format account without nickname for select option', () => {
      const result = formatAccountOption(mockAccount);
      expect(result).toBe('DEPOSIT Account (••••3345) - $1,500.00 USD');
    });

    it('should handle zero balance', () => {
      const zeroBalanceAccount = { ...mockAccount, balance: 0 };
      const result = formatAccountOption(zeroBalanceAccount);
      expect(result).toBe('DEPOSIT Account (••••3345) - $0.00 USD');
    });

    it('should handle negative balance', () => {
      const negativeBalanceAccount = { ...mockAccount, balance: -5000 };
      const result = formatAccountOption(negativeBalanceAccount);
      expect(result).toBe('DEPOSIT Account (••••3345) - -$50.00 USD');
    });
  });
});