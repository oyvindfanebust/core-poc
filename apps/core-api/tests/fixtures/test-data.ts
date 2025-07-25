export const testCustomers = {
  customer1: 'CUST001',
  customer2: 'CUST002',
  customer3: 'CUST003',
};

export const testAmounts = {
  small: 1000n,
  medium: 50000n,
  large: 1000000n,
};

export const testCurrencies = ['EUR', 'NOK', 'SEK', 'DKK'] as const;

export const testLoanData = {
  principalAmount: 100000n,
  interestRate: 5.5,
  termMonths: 36,
  currency: 'EUR' as const,
};

export const testDepositData = {
  initialBalance: 25000n,
  currency: 'EUR' as const,
};

export const testCreditData = {
  creditLimit: 10000n,
  currency: 'EUR' as const,
};

export const createTestAccountRequest = (
  type: 'LOAN' | 'DEPOSIT' | 'CREDIT',
  customerId: string,
) => {
  const base = {
    type,
    customerId,
    currency: 'EUR' as const,
  };

  switch (type) {
    case 'LOAN':
      return {
        ...base,
        ...testLoanData,
      };
    case 'DEPOSIT':
      return {
        ...base,
        ...testDepositData,
      };
    case 'CREDIT':
      return {
        ...base,
        ...testCreditData,
      };
  }
};
