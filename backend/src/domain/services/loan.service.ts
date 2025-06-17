import { AccountService } from '../../services/account.service.js';
import { PaymentPlanRepository } from '../../repositories/payment-plan.repository.js';
import { Money, AccountId, CustomerId } from '../value-objects.js';
import { Currency, PaymentPlan, LoanType, PaymentFrequency, LoanFee, AmortizationSchedule, PaymentScheduleEntry } from '../../types/index.js';
import { logger } from '../../utils/logger.js';

export interface CreateLoanParams {
  customerId: CustomerId;
  currency: Currency;
  principalAmount: Money;
  interestRate: number;
  termMonths: number;
  loanType: LoanType;
  paymentFrequency: PaymentFrequency;
  fees: LoanFee[];
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
        loanType: params.loanType,
        paymentFrequency: params.paymentFrequency,
        fees: params.fees.length,
      });

      // Calculate total fees
      const totalFees = this.calculateTotalFees(params.principalAmount, params.fees);
      const totalLoanAmount = params.principalAmount.add(totalFees);

      // Create the loan account
      const accountId = await this.accountService.createLoanAccount(
        params.customerId.value,
        params.currency,
        totalLoanAmount.amount
      );

      // Calculate payment amount based on loan type
      const paymentAmount = this.calculatePayment(
        params.principalAmount,
        totalLoanAmount,
        params.interestRate,
        params.termMonths,
        params.loanType,
        params.paymentFrequency
      );

      // Calculate first payment date (30 days from now by default)
      const firstPaymentDate = new Date();
      firstPaymentDate.setDate(firstPaymentDate.getDate() + 30);

      // Create payment plan
      const paymentPlan: PaymentPlan = {
        accountId,
        principalAmount: params.principalAmount.amount,
        interestRate: params.interestRate,
        termMonths: params.termMonths,
        monthlyPayment: paymentAmount.amount,
        remainingPayments: this.calculateTotalPayments(params.termMonths, params.paymentFrequency),
        loanType: params.loanType,
        paymentFrequency: params.paymentFrequency,
        fees: params.fees,
        totalLoanAmount: totalLoanAmount.amount,
        nextPaymentDate: firstPaymentDate,
        customerId: params.customerId.value,
      };

      // Save payment plan to database
      await this.paymentPlanRepository.save(paymentPlan);

      logger.info('Loan account created successfully', {
        accountId: accountId.toString(),
        paymentAmount: paymentAmount.toString(),
        totalLoanAmount: totalLoanAmount.toString(),
      });

      return {
        accountId: new AccountId(accountId),
        monthlyPayment: paymentAmount,
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
   * Calculate total fees from fee array
   */
  private calculateTotalFees(principalAmount: Money, fees: LoanFee[]): Money {
    let totalFees = new Money(0n, principalAmount.currency);
    
    for (const fee of fees) {
      totalFees = totalFees.add(new Money(fee.amount, principalAmount.currency));
    }
    
    return totalFees;
  }

  /**
   * Calculate total number of payments based on frequency
   */
  private calculateTotalPayments(termMonths: number, frequency: PaymentFrequency): number {
    switch (frequency) {
      case 'WEEKLY':
        return Math.ceil(termMonths * 52 / 12);
      case 'BI_WEEKLY':
        return Math.ceil(termMonths * 26 / 12);
      case 'MONTHLY':
        return termMonths;
      default:
        throw new Error(`Unsupported payment frequency: ${frequency}`);
    }
  }

  /**
   * Calculate payment amount based on loan type and frequency
   */
  private calculatePayment(
    principalAmount: Money,
    totalLoanAmount: Money,
    annualInterestRate: number,
    termMonths: number,
    loanType: LoanType,
    paymentFrequency: PaymentFrequency
  ): Money {
    if (termMonths <= 0) {
      throw new Error('Term months must be greater than 0');
    }

    if (annualInterestRate < 0) {
      throw new Error('Interest rate cannot be negative');
    }

    const totalPayments = this.calculateTotalPayments(termMonths, paymentFrequency);
    
    switch (loanType) {
      case 'ANNUITY':
        return this.calculateAnnuityPayment(
          principalAmount,
          annualInterestRate,
          totalPayments,
          paymentFrequency
        );
      case 'SERIAL':
        return this.calculateSerialPayment(
          principalAmount,
          annualInterestRate,
          totalPayments,
          paymentFrequency
        );
      default:
        throw new Error(`Unsupported loan type: ${loanType}`);
    }
  }

  /**
   * Calculate annuity loan payment (fixed payment amount)
   * M = P * [r(1+r)^n] / [(1+r)^n - 1]
   */
  private calculateAnnuityPayment(
    principalAmount: Money,
    annualInterestRate: number,
    totalPayments: number,
    paymentFrequency: PaymentFrequency
  ): Money {
    // Convert to payment period interest rate
    const periodsPerYear = this.getPeriodsPerYear(paymentFrequency);
    const periodRate = annualInterestRate / 100 / periodsPerYear;
    
    // If interest rate is 0, just divide principal by number of payments
    if (periodRate === 0) {
      return new Money(principalAmount.amount / BigInt(totalPayments), principalAmount.currency);
    }

    // Calculate using the loan payment formula
    const principal = Number(principalAmount.amount);
    const numerator = periodRate * Math.pow(1 + periodRate, totalPayments);
    const denominator = Math.pow(1 + periodRate, totalPayments) - 1;
    
    const payment = principal * (numerator / denominator);
    
    // Round to nearest cent and convert back to BigInt
    const roundedPayment = Math.round(payment);
    
    return new Money(BigInt(roundedPayment), principalAmount.currency);
  }

  /**
   * Calculate serial loan payment (first payment with highest interest)
   * Principal portion is constant, interest decreases over time
   */
  private calculateSerialPayment(
    principalAmount: Money,
    annualInterestRate: number,
    totalPayments: number,
    paymentFrequency: PaymentFrequency
  ): Money {
    // Convert to payment period interest rate
    const periodsPerYear = this.getPeriodsPerYear(paymentFrequency);
    const periodRate = annualInterestRate / 100 / periodsPerYear;
    
    // Principal portion (constant for each payment)
    const principalPerPayment = Number(principalAmount.amount) / totalPayments;
    
    // First payment has the highest interest (on full principal)
    const firstInterestPayment = Number(principalAmount.amount) * periodRate;
    
    // First payment is principal + interest
    const firstPayment = principalPerPayment + firstInterestPayment;
    
    // Round to nearest cent and convert back to BigInt
    const roundedPayment = Math.round(firstPayment);
    
    return new Money(BigInt(roundedPayment), principalAmount.currency);
  }

  /**
   * Get number of payment periods per year
   */
  private getPeriodsPerYear(paymentFrequency: PaymentFrequency): number {
    switch (paymentFrequency) {
      case 'WEEKLY':
        return 52;
      case 'BI_WEEKLY':
        return 26;
      case 'MONTHLY':
        return 12;
      default:
        throw new Error(`Unsupported payment frequency: ${paymentFrequency}`);
    }
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

  async generateAmortizationSchedule(accountId: AccountId): Promise<AmortizationSchedule | null> {
    try {
      const paymentPlan = await this.paymentPlanRepository.findByAccountId(accountId);
      if (!paymentPlan) {
        return null;
      }

      const schedule = this.calculateAmortizationSchedule(paymentPlan);
      
      logger.debug('Generated amortization schedule', {
        accountId: accountId.toString(),
        totalPayments: schedule.schedule.length,
      });

      return schedule;
    } catch (error) {
      logger.error('Failed to generate amortization schedule', {
        accountId: accountId.toString(),
        error,
      });
      throw error;
    }
  }

  private calculateAmortizationSchedule(paymentPlan: PaymentPlan): AmortizationSchedule {
    const schedule: PaymentScheduleEntry[] = [];
    const principalMoney = new Money(paymentPlan.principalAmount, 'USD');
    
    let remainingBalance = Number(paymentPlan.principalAmount);
    let totalInterest = 0;
    let totalPayments = 0;

    const periodsPerYear = this.getPeriodsPerYear(paymentPlan.paymentFrequency);
    const periodRate = paymentPlan.interestRate / 100 / periodsPerYear;
    const totalPaymentsCount = this.calculateTotalPayments(paymentPlan.termMonths, paymentPlan.paymentFrequency);

    // Calculate payment interval in days
    const paymentIntervalDays = paymentPlan.paymentFrequency === 'WEEKLY' ? 7 : 
                               paymentPlan.paymentFrequency === 'BI_WEEKLY' ? 14 : 30;

    for (let i = 1; i <= totalPaymentsCount && remainingBalance > 0; i++) {
      let interestAmount: number;
      let principalAmount: number;
      let paymentAmount: number;

      if (paymentPlan.loanType === 'ANNUITY') {
        // Annuity: fixed payment amount
        paymentAmount = Number(paymentPlan.monthlyPayment);
        interestAmount = remainingBalance * periodRate;
        principalAmount = paymentAmount - interestAmount;
        
        // Ensure we don't pay more principal than remaining
        if (principalAmount > remainingBalance) {
          principalAmount = remainingBalance;
          paymentAmount = principalAmount + interestAmount;
        }
      } else {
        // Serial: fixed principal amount
        principalAmount = Number(paymentPlan.principalAmount) / totalPaymentsCount;
        interestAmount = remainingBalance * periodRate;
        paymentAmount = principalAmount + interestAmount;
        
        // Ensure we don't pay more principal than remaining
        if (principalAmount > remainingBalance) {
          principalAmount = remainingBalance;
          paymentAmount = principalAmount + interestAmount;
        }
      }

      remainingBalance -= principalAmount;
      totalInterest += interestAmount;
      totalPayments += paymentAmount;

      // Calculate payment date
      const paymentDate = new Date();
      paymentDate.setDate(paymentDate.getDate() + (i - 1) * paymentIntervalDays);

      schedule.push({
        paymentNumber: i,
        paymentDate,
        paymentAmount: BigInt(Math.round(paymentAmount)),
        principalAmount: BigInt(Math.round(principalAmount)),
        interestAmount: BigInt(Math.round(interestAmount)),
        remainingBalance: BigInt(Math.round(Math.max(0, remainingBalance))),
      });
    }

    return {
      accountId: paymentPlan.accountId,
      schedule,
      totalPayments: BigInt(Math.round(totalPayments)),
      totalInterest: BigInt(Math.round(totalInterest)),
    };
  }
}