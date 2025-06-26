import { validateBIC, validateSEPAIBAN, normalizeIBAN, normalizeBIC } from '@core-poc/shared';
import { z } from 'zod';

// import { Currency } from '../types/index.js';

// Base schemas for reusable validation
export const CurrencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'NOK',
  'SEK',
  'DKK',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
] as const);
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

// Account name update schema
export const UpdateAccountNameSchema = z.object({
  accountName: z
    .string()
    .min(1, 'Account name cannot be empty')
    .max(100, 'Account name cannot exceed 100 characters')
    .nullable(),
});

// External bank transaction schemas (international-friendly)
export const ExternalBankInfoSchema = z.object({
  bankIdentifier: z
    .string()
    .min(1, 'Bank identifier is required')
    .max(50, 'Bank identifier cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9\-\s]+$/, 'Bank identifier contains invalid characters'),
  accountNumber: z
    .string()
    .min(1, 'Account number is required')
    .max(50, 'Account number cannot exceed 50 characters')
    .regex(/^[A-Za-z0-9\-\s]+$/, 'Account number contains invalid characters'),
  bankName: z
    .string()
    .min(1, 'Bank name is required')
    .max(100, 'Bank name cannot exceed 100 characters'),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/, 'Country must be a valid ISO 3166-1 alpha-2 code')
    .optional(),
});

export const HighValueTransferInfoSchema = ExternalBankInfoSchema.extend({
  recipientName: z
    .string()
    .min(1, 'Recipient name is required')
    .max(100, 'Recipient name cannot exceed 100 characters'),
  transferMessage: z.string().max(140, 'Transfer message cannot exceed 140 characters').optional(),
});

export const IncomingTransferRequestSchema = z.object({
  accountId: AccountIdSchema,
  amount: MoneyAmountSchema,
  currency: CurrencySchema,
  externalBankInfo: ExternalBankInfoSchema,
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
});

export const OutgoingTransferRequestSchema = z.object({
  accountId: AccountIdSchema,
  amount: MoneyAmountSchema,
  currency: CurrencySchema,
  externalBankInfo: ExternalBankInfoSchema,
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
});

export const HighValueTransferRequestSchema = z.object({
  accountId: AccountIdSchema,
  amount: MoneyAmountSchema,
  currency: CurrencySchema,
  transferInfo: HighValueTransferInfoSchema,
  description: z.string().max(200, 'Description cannot exceed 200 characters').optional(),
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

// SEPA validation schemas
export const SEPACurrencySchema = z.enum(['EUR', 'NOK', 'SEK', 'DKK'] as const);

export const SEPABankInfoSchema = z.object({
  iban: z
    .string()
    .min(1, 'IBAN is required')
    .refine(iban => {
      const validation = validateSEPAIBAN(iban);
      return validation.isValid;
    }, 'Invalid IBAN format, checksum, or not within SEPA zone')
    .transform(normalizeIBAN),
  bic: z
    .string()
    .optional()
    .refine(bic => !bic || validateBIC(bic), 'Invalid BIC format')
    .transform(bic => (bic ? normalizeBIC(bic) : undefined)),
  bankName: z
    .string()
    .min(1, 'Bank name is required')
    .max(100, 'Bank name cannot exceed 100 characters'),
  recipientName: z
    .string()
    .min(1, 'Recipient name is required')
    .max(100, 'Recipient name cannot exceed 100 characters'),
  country: z.string().regex(/^[A-Z]{2}$/, 'Country must be a valid ISO 3166-1 alpha-2 code'),
});

export const SEPAOutgoingTransferSchema = z.object({
  accountId: AccountIdSchema,
  amount: MoneyAmountSchema,
  currency: SEPACurrencySchema,
  bankInfo: SEPABankInfoSchema,
  description: z.string().max(140, 'Description cannot exceed 140 characters').optional(),
  urgency: z
    .enum(['STANDARD', 'EXPRESS', 'INSTANT'] as const)
    .optional()
    .default('STANDARD'),
});

export const SEPAIncomingTransferSchema = z.object({
  amount: MoneyAmountSchema,
  currency: SEPACurrencySchema,
  bankInfo: SEPABankInfoSchema,
  targetAccountId: AccountIdSchema,
  sepaTransactionId: z
    .string()
    .min(1, 'SEPA transaction ID is required')
    .max(50, 'SEPA transaction ID cannot exceed 50 characters'),
  description: z.string().max(140, 'Description cannot exceed 140 characters').optional(),
});

export const SEPACurrencyParamSchema = z.object({
  currency: SEPACurrencySchema,
});

// SEPA type exports
export type SEPAOutgoingTransferRequest = z.infer<typeof SEPAOutgoingTransferSchema>;
export type SEPAIncomingTransferRequest = z.infer<typeof SEPAIncomingTransferSchema>;
export type SEPACurrencyParam = z.infer<typeof SEPACurrencyParamSchema>;

// External transaction type exports
export type ExternalBankInfo = z.infer<typeof ExternalBankInfoSchema>;
export type HighValueTransferInfo = z.infer<typeof HighValueTransferInfoSchema>;
export type IncomingTransferRequest = z.infer<typeof IncomingTransferRequestSchema>;
export type OutgoingTransferRequest = z.infer<typeof OutgoingTransferRequestSchema>;
export type HighValueTransferRequest = z.infer<typeof HighValueTransferRequestSchema>;
