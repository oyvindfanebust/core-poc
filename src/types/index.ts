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

export type LoanType = 'ANNUITY' | 'SERIAL';
export type PaymentFrequency = 'MONTHLY' | 'BI_WEEKLY' | 'WEEKLY';

export interface LoanFee {
  type: string;
  amount: bigint;
  description: string;
}

export interface PaymentPlan {
  accountId: bigint;
  principalAmount: bigint;
  interestRate: number;
  termMonths: number;
  monthlyPayment: bigint;
  remainingPayments: number;
  loanType: LoanType;
  paymentFrequency: PaymentFrequency;
  fees: LoanFee[];
  totalLoanAmount: bigint;  // Principal + fees
  nextPaymentDate: Date;
  customerId: string;
}

export interface PaymentScheduleEntry {
  paymentNumber: number;
  paymentDate: Date;
  paymentAmount: bigint;
  principalAmount: bigint;
  interestAmount: bigint;
  remainingBalance: bigint;
}

export interface AmortizationSchedule {
  accountId: bigint;
  schedule: PaymentScheduleEntry[];
  totalPayments: bigint;
  totalInterest: bigint;
}

export interface Invoice {
  id: string;
  accountId: bigint;
  amount: bigint;
  dueDate: Date;
  status: 'pending' | 'paid' | 'overdue';
}