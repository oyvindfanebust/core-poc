import { z } from 'zod';

// import { Currency } from '../types/index.js';

// Base schemas for reusable validation - SEPA currencies only
export const CurrencySchema = z.enum(['EUR', 'NOK', 'SEK', 'DKK'] as const);
export const AccountTypeSchema = z.enum(['DEPOSIT', 'LOAN', 'CREDIT'] as const);

// Money amount validation (positive BigInt as string)
export const MoneyAmountSchema = z.string().refine(
  val => {
    try {
      const amount = BigInt(val);
      return amount >= 0n;
    } catch {
      return false;
    }
  },
  { message: 'Amount must be a valid positive number' },
);

// Account ID validation
export const AccountIdSchema = z.string().refine(
  val => {
    try {
      BigInt(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Account ID must be a valid number' },
);

// Customer ID validation - More realistic for real-world usage
export const CustomerIdSchema = z
  .string()
  .min(1, 'Customer ID is required')
  .max(50, 'Customer ID cannot exceed 50 characters')
  .regex(
    /^[A-Za-z0-9\-_]+$/,
    'Customer ID must contain only letters, numbers, hyphens, and underscores',
  );

// Account creation schemas
export const CreateDepositAccountSchema = z.object({
  type: z.literal('DEPOSIT'),
  customerId: CustomerIdSchema,
  currency: CurrencySchema,
  accountName: z.string().max(100, 'Account name cannot exceed 100 characters').optional(),
  initialBalance: MoneyAmountSchema.optional(),
});

// Loan-specific validation schemas
export const LoanTypeSchema = z.enum(['ANNUITY', 'SERIAL'] as const);
export const PaymentFrequencySchema = z.enum([
  'WEEKLY',
  'BI_WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMI_ANNUALLY',
  'ANNUALLY',
] as const);

// Fee types for loans
export const FeeTypeSchema = z.enum([
  'ORIGINATION',
  'PROCESSING',
  'INSURANCE',
  'LATE_PAYMENT',
  'PREPAYMENT',
  'APPRAISAL',
  'ADMINISTRATION',
] as const);

export const LoanFeeSchema = z.object({
  type: FeeTypeSchema,
  amount: MoneyAmountSchema,
  description: z.string().min(1, 'Fee description is required'),
});

export const CreateLoanAccountSchema = z.object({
  type: z.literal('LOAN'),
  customerId: CustomerIdSchema,
  currency: CurrencySchema,
  accountName: z.string().max(100, 'Account name cannot exceed 100 characters').optional(),
  principalAmount: MoneyAmountSchema,
  interestRate: z.string().refine(
    val => {
      const rate = parseFloat(val);
      return !isNaN(rate) && rate >= 0 && rate <= 100;
    },
    { message: 'Interest rate must be between 0 and 100' },
  ),
  termMonths: z.string().refine(
    val => {
      const months = parseInt(val);
      return !isNaN(months) && months > 0 && months <= 480; // Max 40 years
    },
    { message: 'Term must be between 1 and 480 months' },
  ),
  loanType: LoanTypeSchema.optional().default('ANNUITY'),
  paymentFrequency: PaymentFrequencySchema.optional().default('MONTHLY'),
  fees: z.array(LoanFeeSchema).optional().default([]),
});

export const CreateCreditAccountSchema = z.object({
  type: z.literal('CREDIT'),
  customerId: CustomerIdSchema,
  currency: CurrencySchema,
  accountName: z.string().max(100, 'Account name cannot exceed 100 characters').optional(),
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

// Request parameter schemas
export const AccountIdParamSchema = z.object({
  accountId: AccountIdSchema,
});

export const CustomerIdParamSchema = z.object({
  customerId: CustomerIdSchema,
});

// Loan disbursement validation
export const LoanDisbursementSchema = z.object({
  targetAccountId: AccountIdSchema,
  amount: MoneyAmountSchema.optional(),
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
});

export const LoanIdParamSchema = z.object({
  loanId: AccountIdSchema,
});

// Account name update schema
export const UpdateAccountNameSchema = z.object({
  accountName: z
    .string()
    .min(1, 'Account name cannot be empty')
    .max(100, 'Account name cannot exceed 100 characters')
    .nullable(),
});

// System account validation schemas
export const SystemIdentifierParamSchema = z.object({
  systemIdentifier: z
    .string()
    .min(1, 'System identifier is required')
    .max(100, 'System identifier cannot exceed 100 characters')
    .regex(
      /^[A-Z0-9\-_]+$/,
      'System identifier must contain only uppercase letters, numbers, hyphens, and underscores',
    ),
});

export const AccountTypeParamSchema = z.object({
  accountType: z
    .string()
    .min(1, 'Account type is required')
    .max(50, 'Account type cannot exceed 50 characters')
    .regex(/^[A-Z_]+$/, 'Account type must contain only uppercase letters and underscores'),
});

// SEPA validation schemas
export const IBANSchema = z
  .string()
  .min(15, 'IBAN must be at least 15 characters')
  .max(34, 'IBAN cannot exceed 34 characters')
  .regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/, 'IBAN must be in valid format (e.g., NO9386011117947)')
  .transform(val => val.replace(/\s/g, '').toUpperCase()); // Remove spaces and convert to uppercase

export const BICSchema = z
  .string()
  .length(8, 'BIC must be exactly 8 characters')
  .regex(/^[A-Z]{6}[A-Z0-9]{2}$/, 'BIC must be in valid format (6 letters + 2 alphanumeric)')
  .optional();

export const SEPAUrgencySchema = z.enum(['STANDARD', 'EXPRESS', 'INSTANT'] as const);

export const SEPABankInfoSchema = z.object({
  iban: IBANSchema,
  bic: BICSchema,
  bankName: z
    .string()
    .min(1, 'Bank name is required')
    .max(100, 'Bank name cannot exceed 100 characters'),
  recipientName: z
    .string()
    .min(1, 'Recipient name is required')
    .max(100, 'Recipient name cannot exceed 100 characters'),
  country: z
    .string()
    .length(2, 'Country must be a 2-letter ISO code')
    .regex(/^[A-Z]{2}$/, 'Country must be uppercase letters'),
});

export const SEPATransferRequestSchema = z.object({
  accountId: AccountIdSchema,
  amount: MoneyAmountSchema,
  currency: CurrencySchema,
  bankInfo: SEPABankInfoSchema,
  description: z.string().max(140, 'Description cannot exceed 140 characters').optional(),
  urgency: SEPAUrgencySchema.optional().default('STANDARD'),
});

export const SEPACurrencyParamSchema = z.object({
  currency: CurrencySchema,
});

// Type exports for use in controllers
export type CreateAccountRequest = z.infer<typeof CreateAccountSchema>;
export type CreateDepositAccountRequest = z.infer<typeof CreateDepositAccountSchema>;
export type CreateLoanAccountRequest = z.infer<typeof CreateLoanAccountSchema>;
export type CreateCreditAccountRequest = z.infer<typeof CreateCreditAccountSchema>;
export type TransferRequest = z.infer<typeof TransferSchema>;
export type AccountIdParam = z.infer<typeof AccountIdParamSchema>;
export type CustomerIdParam = z.infer<typeof CustomerIdParamSchema>;
export type UpdateAccountNameRequest = z.infer<typeof UpdateAccountNameSchema>;
export type SystemIdentifierParam = z.infer<typeof SystemIdentifierParamSchema>;
export type AccountTypeParam = z.infer<typeof AccountTypeParamSchema>;
export type SEPATransferRequest = z.infer<typeof SEPATransferRequestSchema>;
export type SEPABankInfo = z.infer<typeof SEPABankInfoSchema>;
export type SEPACurrencyParam = z.infer<typeof SEPACurrencyParamSchema>;
export type LoanDisbursementRequest = z.infer<typeof LoanDisbursementSchema>;
export type LoanIdParam = z.infer<typeof LoanIdParamSchema>;
