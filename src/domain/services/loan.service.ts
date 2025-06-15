import { AccountService } from '../../services/account.service.js';
import { PaymentPlanRepository } from '../../repositories/payment-plan.repository.js';
import { Money, AccountId, CustomerId } from '../value-objects.js';
import { Currency, PaymentPlan } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export interface CreateLoanParams {
  customerId: CustomerId;
  currency: Currency;
  principalAmount: Money;
  interestRate: number;
  termMonths: number;
}

export interface LoanAccount {
  accountId: AccountId;
  monthlyPayment: Money;
}

export class LoanService {
  constructor(
    private accountService: AccountService,
    private paymentPlanRepository: PaymentPlanRepository
  ) {}

  async createLoanWithPaymentPlan(params: CreateLoanParams): Promise<LoanAccount> {
    try {
      logger.info('Creating loan account', {
        customerId: params.customerId.value,
        principalAmount: params.principalAmount.toString(),
        currency: params.principalAmount.currency,
        interestRate: params.interestRate,
        termMonths: params.termMonths,
      });

      // Create the loan account
      const accountId = await this.accountService.createLoanAccount(
        params.customerId.value,
        params.currency,
        params.principalAmount.amount
      );

      // Calculate monthly payment
      const monthlyPayment = this.calculateMonthlyPayment(
        params.principalAmount,
        params.interestRate,
        params.termMonths
      );

      // Create payment plan
      const paymentPlan: PaymentPlan = {
        accountId,
        principalAmount: params.principalAmount.amount,
        interestRate: params.interestRate,
        termMonths: params.termMonths,
        monthlyPayment: monthlyPayment.amount,
        remainingPayments: params.termMonths,
      };

      // Save payment plan to database
      await this.paymentPlanRepository.save(paymentPlan);

      logger.info('Loan account created successfully', {
        accountId: accountId.toString(),
        monthlyPayment: monthlyPayment.toString(),
      });

      return {
        accountId: new AccountId(accountId),
        monthlyPayment,
      };
    } catch (error) {
      logger.error('Failed to create loan with payment plan', {
        customerId: params.customerId.value,
        error,
      });
      throw error;
    }
  }

  /**
   * Calculate monthly payment using the standard loan payment formula
   * M = P * [r(1+r)^n] / [(1+r)^n - 1]
   * where:
   * M = Monthly payment
   * P = Principal amount
   * r = Monthly interest rate (annual rate / 12)
   * n = Number of payments (months)
   */
  private calculateMonthlyPayment(
    principalAmount: Money,
    annualInterestRate: number,
    termMonths: number
  ): Money {
    if (termMonths <= 0) {
      throw new Error('Term months must be greater than 0');
    }

    if (annualInterestRate <= 0) {
      throw new Error('Interest rate must be greater than 0');
    }

    // Convert to monthly interest rate (as decimal)
    const monthlyRate = annualInterestRate / 100 / 12;
    
    // If interest rate is 0, just divide principal by number of payments
    if (monthlyRate === 0) {
      return new Money(principalAmount.amount / BigInt(termMonths), principalAmount.currency);
    }

    // Calculate using the loan payment formula
    // We need to work with floating point for the calculation, then convert back to BigInt
    const principal = Number(principalAmount.amount);
    const numerator = monthlyRate * Math.pow(1 + monthlyRate, termMonths);
    const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
    
    const monthlyPayment = principal * (numerator / denominator);
    
    // Round to nearest cent and convert back to BigInt
    const roundedPayment = Math.round(monthlyPayment);
    
    return new Money(BigInt(roundedPayment), principalAmount.currency);
  }

  async getPaymentPlan(accountId: AccountId): Promise<PaymentPlan | null> {
    try {
      return await this.paymentPlanRepository.findByAccountId(accountId);
    } catch (error) {
      logger.error('Failed to get payment plan', {
        accountId: accountId.toString(),
        error,
      });
      throw error;
    }
  }

  async getAllPaymentPlans(): Promise<PaymentPlan[]> {
    try {
      return await this.paymentPlanRepository.findAll();
    } catch (error) {
      logger.error('Failed to get all payment plans', { error });
      throw error;
    }
  }
}