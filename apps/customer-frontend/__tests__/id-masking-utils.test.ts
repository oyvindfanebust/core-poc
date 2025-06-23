import { 
  maskSensitiveId, 
  getMaskingPattern,
  formatMaskedId,
  shouldShowMaskingOption,
  getSecurityLevel 
} from '../lib/id-masking-utils';

describe('ID Masking Utils', () => {
  describe('maskSensitiveId', () => {
    describe('Account IDs', () => {
      const longAccountId = '309857248261287769321131213262708'; // 33 characters
      const mediumAccountId = '12345678901234567890'; // 20 characters
      const shortAccountId = '123456789'; // 9 characters

      it('should mask long account IDs showing only last 7 characters', () => {
        const result = maskSensitiveId(longAccountId, 'account');
        expect(result).toBe('•••• 3262708');
      });

      it('should mask medium account IDs showing only last 4 characters', () => {
        const result = maskSensitiveId(mediumAccountId, 'account');
        expect(result).toBe('•••• 7890');
      });

      it('should show short account IDs with minimal masking', () => {
        const result = maskSensitiveId(shortAccountId, 'account');
        expect(result).toBe('•••• 6789');
      });

      it('should handle very short IDs gracefully', () => {
        const veryShortId = '12345';
        const result = maskSensitiveId(veryShortId, 'account');
        expect(result).toBe('••• 45');
      });
    });

    describe('Transaction IDs', () => {
      const transactionId = 'tx_1234567890abcdef';
      const shortTxId = 'tx_123';
      const longTxId = '1234567890abcdef1234567890abcdef12345678';

      it('should mask transaction IDs showing last 8 characters', () => {
        const result = maskSensitiveId(transactionId, 'transaction');
        expect(result).toBe('•••• 90abcdef');
      });

      it('should handle short transaction IDs', () => {
        const result = maskSensitiveId(shortTxId, 'transaction');
        expect(result).toBe('••• 123');
      });

      it('should handle very long transaction IDs', () => {
        const result = maskSensitiveId(longTxId, 'transaction');
        expect(result).toBe('•••• 12345678');
      });
    });

    describe('Customer IDs', () => {
      const customerId = 'CUSTOMER-ABC-123';
      const numericCustomerId = '987654321';
      const shortCustomerId = 'C123';

      it('should mask customer IDs preserving structure hints', () => {
        const result = maskSensitiveId(customerId, 'customer');
        expect(result).toBe('CUSTOMER-•••-123');
      });

      it('should mask numeric customer IDs', () => {
        const result = maskSensitiveId(numericCustomerId, 'customer');
        expect(result).toBe('•••• 4321');
      });

      it('should handle short customer IDs', () => {
        const result = maskSensitiveId(shortCustomerId, 'customer');
        expect(result).toBe('C123'); // Too short for meaningful masking
      });
    });

    describe('Custom masking patterns', () => {
      it('should support custom masking character', () => {
        const result = maskSensitiveId('123456789', 'account', { maskChar: '*' });
        expect(result).toBe('**** 6789');
      });

      it('should support custom visible length', () => {
        const result = maskSensitiveId('123456789', 'account', { visibleLength: 3 });
        expect(result).toBe('•••• 789');
      });

      it('should support custom separator', () => {
        const result = maskSensitiveId('123456789', 'account', { separator: '-' });
        expect(result).toBe('••••-6789');
      });

      it('should support no separator', () => {
        const result = maskSensitiveId('123456789', 'account', { separator: '' });
        expect(result).toBe('••••6789');
      });
    });

    describe('Edge cases', () => {
      it('should handle empty strings', () => {
        const result = maskSensitiveId('', 'account');
        expect(result).toBe('');
      });

      it('should handle undefined input', () => {
        const result = maskSensitiveId(undefined as any, 'account');
        expect(result).toBe('');
      });

      it('should handle null input', () => {
        const result = maskSensitiveId(null as any, 'account');
        expect(result).toBe('');
      });

      it('should handle single character input', () => {
        const result = maskSensitiveId('A', 'account');
        expect(result).toBe('A');
      });

      it('should handle two character input', () => {
        const result = maskSensitiveId('AB', 'account');
        expect(result).toBe('AB');
      });
    });
  });

  describe('getMaskingPattern', () => {
    it('should return correct pattern for account type', () => {
      const pattern = getMaskingPattern('account');
      expect(pattern).toEqual({
        maskChar: '•',
        separator: ' ',
        visibleLength: expect.any(Number),
        preserveStructure: false,
        minLength: expect.any(Number),
      });
    });

    it('should return correct pattern for transaction type', () => {
      const pattern = getMaskingPattern('transaction');
      expect(pattern).toEqual({
        maskChar: '•',
        separator: ' ',
        visibleLength: 8,
        preserveStructure: false,
        minLength: 6,
      });
    });

    it('should return correct pattern for customer type', () => {
      const pattern = getMaskingPattern('customer');
      expect(pattern).toEqual({
        maskChar: '•',
        separator: '',
        visibleLength: 4,
        preserveStructure: true,
        minLength: 4,
      });
    });

    it('should return default pattern for unknown type', () => {
      const pattern = getMaskingPattern('unknown' as any);
      expect(pattern).toEqual({
        maskChar: '•',
        separator: ' ',
        visibleLength: 4,
        preserveStructure: false,
        minLength: 5,
      });
    });
  });

  describe('formatMaskedId', () => {
    it('should format with separator', () => {
      const result = formatMaskedId('••••', '1234', ' ');
      expect(result).toBe('•••• 1234');
    });

    it('should format without separator', () => {
      const result = formatMaskedId('••••', '1234', '');
      expect(result).toBe('••••1234');
    });

    it('should handle empty mask', () => {
      const result = formatMaskedId('', '1234', ' ');
      expect(result).toBe('1234');
    });

    it('should handle empty visible part', () => {
      const result = formatMaskedId('••••', '', ' ');
      expect(result).toBe('••••');
    });

    it('should handle custom separator', () => {
      const result = formatMaskedId('••••', '1234', '-');
      expect(result).toBe('••••-1234');
    });
  });

  describe('shouldShowMaskingOption', () => {
    it('should return true for long sensitive IDs', () => {
      const longId = '309857248261287769321131213262708';
      expect(shouldShowMaskingOption(longId, 'account')).toBe(true);
    });

    it('should return false for short IDs', () => {
      const shortId = '123';
      expect(shouldShowMaskingOption(shortId, 'account')).toBe(false);
    });

    it('should return true for customer IDs with structure', () => {
      const customerId = 'CUSTOMER-ABC-123';
      expect(shouldShowMaskingOption(customerId, 'customer')).toBe(true);
    });

    it('should return false for very short customer IDs', () => {
      const shortId = 'C1';
      expect(shouldShowMaskingOption(shortId, 'customer')).toBe(false);
    });

    it('should consider minimum length thresholds', () => {
      expect(shouldShowMaskingOption('12345', 'account')).toBe(true);
      expect(shouldShowMaskingOption('1234', 'account')).toBe(false);
      expect(shouldShowMaskingOption('123456789', 'transaction')).toBe(true);
      expect(shouldShowMaskingOption('12345', 'transaction')).toBe(false);
    });
  });

  describe('getSecurityLevel', () => {
    it('should return high security for very long IDs', () => {
      const longId = '309857248261287769321131213262708';
      expect(getSecurityLevel(longId, 'account')).toBe('high');
    });

    it('should return medium security for medium IDs', () => {
      const mediumId = '12345678901234567890';
      expect(getSecurityLevel(mediumId, 'account')).toBe('medium');
    });

    it('should return low security for short IDs', () => {
      const shortId = '123456789';
      expect(getSecurityLevel(shortId, 'account')).toBe('low');
    });

    it('should return none for very short IDs', () => {
      const veryShortId = '123';
      expect(getSecurityLevel(veryShortId, 'account')).toBe('none');
    });

    it('should handle different ID types appropriately', () => {
      expect(getSecurityLevel('CUSTOMER-ABC-123', 'customer')).toBe('medium');
      expect(getSecurityLevel('tx_1234567890abcdef', 'transaction')).toBe('medium');
    });
  });

  describe('Consistency and Integration', () => {
    it('should maintain consistency between mask and unmask operations', () => {
      const originalId = '309857248261287769321131213262708';
      const masked = maskSensitiveId(originalId, 'account');
      
      // The visible part should match the end of original
      const visiblePart = masked.split(' ')[1];
      expect(originalId.endsWith(visiblePart)).toBe(true);
    });

    it('should produce different masks for different ID types', () => {
      const id = '123456789012345';
      const accountMask = maskSensitiveId(id, 'account');
      const transactionMask = maskSensitiveId(id, 'transaction');
      const customerMask = maskSensitiveId(id, 'customer');
      
      // They should not all be the same
      const masks = [accountMask, transactionMask, customerMask];
      const uniqueMasks = [...new Set(masks)];
      expect(uniqueMasks.length).toBeGreaterThan(1);
    });

    it('should handle real-world ID patterns correctly', () => {
      const realIds = [
        { id: '309857248261287769321131213262708', type: 'account' as const },
        { id: 'CUSTOMER-ABC-123', type: 'customer' as const },
        { id: 'tx_4f5b2c8a9e3d1f2g', type: 'transaction' as const },
        { id: '987654321', type: 'account' as const },
      ];

      realIds.forEach(({ id, type }) => {
        const masked = maskSensitiveId(id, type);
        expect(masked).toBeTruthy();
        expect(masked).not.toBe(id);
        expect(masked.length).toBeLessThanOrEqual(id.length);
      });
    });
  });
});