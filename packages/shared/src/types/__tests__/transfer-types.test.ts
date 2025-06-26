import { TransferType } from '../index.js';

describe('TransferType', () => {
  describe('existing transfer types', () => {
    it('should have CUSTOMER_TRANSFER with value 1', () => {
      expect(TransferType.CUSTOMER_TRANSFER).toBe(1);
    });

    it('should have INITIAL_DEPOSIT with value 2', () => {
      expect(TransferType.INITIAL_DEPOSIT).toBe(2);
    });
  });

  describe('external bank transfer types', () => {
    it('should have ACH_CREDIT with value 3', () => {
      expect(TransferType.ACH_CREDIT).toBe(3);
    });

    it('should have ACH_DEBIT with value 4', () => {
      expect(TransferType.ACH_DEBIT).toBe(4);
    });

    it('should have WIRE_TRANSFER with value 5', () => {
      expect(TransferType.WIRE_TRANSFER).toBe(5);
    });

    it('should have LOAN_FUNDING with value 6', () => {
      expect(TransferType.LOAN_FUNDING).toBe(6);
    });

    it('should have LOAN_PAYMENT with value 7', () => {
      expect(TransferType.LOAN_PAYMENT).toBe(7);
    });

    it('should have INTERNAL_TRANSFER with value 8', () => {
      expect(TransferType.INTERNAL_TRANSFER).toBe(8);
    });

    it('should have REVERSAL with value 9', () => {
      expect(TransferType.REVERSAL).toBe(9);
    });
  });

  describe('enum integrity', () => {
    it('should have unique values for all transfer types', () => {
      const values = Object.values(TransferType).filter(v => typeof v === 'number');
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it('should have sequential values starting from 1', () => {
      const values = Object.values(TransferType)
        .filter(v => typeof v === 'number')
        .sort((a, b) => (a as number) - (b as number));

      values.forEach((value, index) => {
        expect(value).toBe(index + 1);
      });
    });
  });
});
