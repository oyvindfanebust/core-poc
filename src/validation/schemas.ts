import { z } from 'zod';
import { Currency } from '../types/index.js';

// Base schemas for reusable validation
export const CurrencySchema = z.enum(['USD', 'EUR', 'NOK'] as const);
export const AccountTypeSchema = z.enum(['DEPOSIT', 'LOAN', 'CREDIT'] as const);

// Money amount validation (positive BigInt as string)
export const MoneyAmountSchema = z.string().refine(
  (val) => {
    try {
      const amount = BigInt(val);
      return amount >= 0n;
    } catch {
      return false;
    }
  },
  { message: 'Amount must be a valid positive number' }
);

// Account ID validation
export const AccountIdSchema = z.string().refine(
  (val) => {
    try {
      BigInt(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Account ID must be a valid number' }
);

// Customer ID validation
export const CustomerIdSchema = z.string()
  .min(1, 'Customer ID is required')
  .max(8, 'Customer ID cannot exceed 8 characters')
  .regex(/^[A-Z0-9_]+$/, 'Customer ID must contain only uppercase letters, numbers, and underscores');

// Account creation schemas
export const CreateDepositAccountSchema = z.object({
  type: z.literal('DEPOSIT'),
  customerId: CustomerIdSchema,
  currency: CurrencySchema,
  initialBalance: MoneyAmountSchema.optional(),
});

// Loan-specific validation schemas
export const LoanTypeSchema = z.enum(['ANNUITY', 'SERIAL'] as const);
export const PaymentFrequencySchema = z.enum(['WEEKLY', 'BI_WEEKLY', 'MONTHLY'] as const);

export const LoanFeeSchema = z.object({
  type: z.string().min(1, 'Fee type is required'),
  amount: MoneyAmountSchema,
  description: z.string().min(1, 'Fee description is required'),
});

export const CreateLoanAccountSchema = z.object({
  type: z.literal('LOAN'),
  customerId: CustomerIdSchema,
  currency: CurrencySchema,
  principalAmount: MoneyAmountSchema,
  interestRate: z.string().refine(
    (val) => {
      const rate = parseFloat(val);
      return !isNaN(rate) && rate >= 0 && rate <= 100;
    },
    { message: 'Interest rate must be between 0 and 100' }
  ),
  termMonths: z.string().refine(
    (val) => {
      const months = parseInt(val);
      return !isNaN(months) && months > 0 && months <= 480; // Max 40 years
    },
    { message: 'Term must be between 1 and 480 months' }
  ),
  loanType: LoanTypeSchema.optional().default('ANNUITY'),
  paymentFrequency: PaymentFrequencySchema.optional().default('MONTHLY'),
  fees: z.array(LoanFeeSchema).optional().default([]),
});

export const CreateCreditAccountSchema = z.object({
  type: z.literal('CREDIT'),
  customerId: CustomerIdSchema,
  currency: CurrencySchema,
  creditLimit: MoneyAmountSchema,
});

// Union schema for account creation
export const CreateAccountSchema = z.discriminatedUnion('type', [
  CreateDepositAccountSchema,
  CreateLoanAccountSchema,
  CreateCreditAccountSchema,
]);

// Transfer schema
export const TransferSchema = z.object({
  fromAccountId: AccountIdSchema,
  toAccountId: AccountIdSchema,
  amount: MoneyAmountSchema,
  currency: CurrencySchema,
});

// Invoice creation schema
export const CreateInvoiceSchema = z.object({
  accountId: AccountIdSchema,
  amount: MoneyAmountSchema,
  dueDate: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date > new Date();
    },
    { message: 'Due date must be a valid future date' }
  ),
});

// Request parameter schemas
export const AccountIdParamSchema = z.object({
  accountId: AccountIdSchema,
});

// Type exports for use in controllers
export type CreateAccountRequest = z.infer<typeof CreateAccountSchema>;
export type CreateDepositAccountRequest = z.infer<typeof CreateDepositAccountSchema>;
export type CreateLoanAccountRequest = z.infer<typeof CreateLoanAccountSchema>;
export type CreateCreditAccountRequest = z.infer<typeof CreateCreditAccountSchema>;
export type TransferRequest = z.infer<typeof TransferSchema>;
export type CreateInvoiceRequest = z.infer<typeof CreateInvoiceSchema>;
export type AccountIdParam = z.infer<typeof AccountIdParamSchema>;