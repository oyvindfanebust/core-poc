export interface AccountType {
  LOAN: number;
  DEPOSIT: number;
  CREDIT: number;
  ASSET: number;
  LIABILITY: number;
  EQUITY: number;
}

export interface LedgerCode {
  USD: number;
  EUR: number;
  GBP: number;
  NOK: number;
}

export type Currency = keyof LedgerCode;

export interface CreateAccountRequest {
  type: keyof AccountType;
  customerId: string;
  currency: keyof LedgerCode;
  initialBalance?: bigint;
}

export interface CreateTransferRequest {
  fromAccountId: bigint;
  toAccountId: bigint;
  amount: bigint;
  currency: keyof LedgerCode;
  description?: string;
}

export interface PaymentPlan {
  accountId: bigint;
  principalAmount: bigint;
  interestRate: number;
  termMonths: number;
  monthlyPayment: bigint;
  remainingPayments: number;
}

export interface Invoice {
  id: string;
  accountId: bigint;
  amount: bigint;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
}