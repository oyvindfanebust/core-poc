export interface AccountType {
  LOAN: number;
  DEPOSIT: number;
  CREDIT: number;
  ASSET: number;
  LIABILITY: number;
  EQUITY: number;
}

export interface LedgerCode {
  EUR: number;
  NOK: number;
  SEK: number;
  DKK: number;
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
  transferType?: number; // TransferType enum value
  description?: string;
}

export type LoanType = 'ANNUITY' | 'SERIAL';
export type PaymentFrequency =
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMI_ANNUALLY'
  | 'ANNUALLY';

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
  totalLoanAmount: bigint; // Principal + fees
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
