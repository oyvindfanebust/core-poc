import { DatabaseConnection } from '../database/connection.js';
import { PaymentPlan } from '../types/index.js';
import { AccountId, Money } from '../value-objects.js';
import { logger } from '../utils/logger.js';

export class PaymentPlanRepository {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async save(paymentPlan: PaymentPlan): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO payment_plans 
         (account_id, principal_amount, interest_rate, term_months, monthly_payment, remaining_payments,
          loan_type, payment_frequency, fees, total_loan_amount, next_payment_date, customer_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (account_id) DO UPDATE SET
         principal_amount = EXCLUDED.principal_amount,
         interest_rate = EXCLUDED.interest_rate,
         term_months = EXCLUDED.term_months,
         monthly_payment = EXCLUDED.monthly_payment,
         remaining_payments = EXCLUDED.remaining_payments,
         loan_type = EXCLUDED.loan_type,
         payment_frequency = EXCLUDED.payment_frequency,
         fees = EXCLUDED.fees,
         total_loan_amount = EXCLUDED.total_loan_amount,
         next_payment_date = EXCLUDED.next_payment_date,
         customer_id = EXCLUDED.customer_id,
         updated_at = CURRENT_TIMESTAMP`,
        [
          paymentPlan.accountId.toString(),
          paymentPlan.principalAmount.toString(),
          paymentPlan.interestRate,
          paymentPlan.termMonths,
          paymentPlan.monthlyPayment.toString(),
          paymentPlan.remainingPayments,
          paymentPlan.loanType,
          paymentPlan.paymentFrequency,
          JSON.stringify(paymentPlan.fees),
          paymentPlan.totalLoanAmount.toString(),
          paymentPlan.nextPaymentDate.toISOString().split('T')[0], // DATE format
          paymentPlan.customerId,
        ]
      );
      
      logger.debug('Payment plan saved', { accountId: paymentPlan.accountId.toString() });
    } catch (error) {
      logger.error('Failed to save payment plan', { 
        accountId: paymentPlan.accountId.toString(),
        error 
      });
      throw error;
    }
  }

  async findByAccountId(accountId: AccountId): Promise<PaymentPlan | null> {
    try {
      const result = await this.db.query(
        'SELECT * FROM payment_plans WHERE account_id = $1',
        [accountId.toString()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        accountId: BigInt(row.account_id),
        principalAmount: BigInt(row.principal_amount),
        interestRate: parseFloat(row.interest_rate),
        termMonths: row.term_months,
        monthlyPayment: BigInt(row.monthly_payment),
        remainingPayments: row.remaining_payments,
        loanType: row.loan_type || 'ANNUITY',
        paymentFrequency: row.payment_frequency || 'MONTHLY',
        fees: row.fees || [],
        totalLoanAmount: BigInt(row.total_loan_amount || row.principal_amount),
        nextPaymentDate: row.next_payment_date ? new Date(row.next_payment_date) : new Date(),
        customerId: row.customer_id || '',
      };
    } catch (error) {
      logger.error('Failed to find payment plan', { 
        accountId: accountId.toString(),
        error 
      });
      throw error;
    }
  }

  async findAll(): Promise<PaymentPlan[]> {
    try {
      const result = await this.db.query('SELECT * FROM payment_plans ORDER BY created_at');
      
      return result.rows.map(row => ({
        accountId: BigInt(row.account_id),
        principalAmount: BigInt(row.principal_amount),
        interestRate: parseFloat(row.interest_rate),
        termMonths: row.term_months,
        monthlyPayment: BigInt(row.monthly_payment),
        remainingPayments: row.remaining_payments,
        loanType: row.loan_type || 'ANNUITY',
        paymentFrequency: row.payment_frequency || 'MONTHLY',
        fees: row.fees || [],
        totalLoanAmount: BigInt(row.total_loan_amount || row.principal_amount),
        nextPaymentDate: row.next_payment_date ? new Date(row.next_payment_date) : new Date(),
        customerId: row.customer_id || '',
      }));
    } catch (error) {
      logger.error('Failed to find all payment plans', { error });
      throw error;
    }
  }

  async updateRemainingPayments(accountId: AccountId, remainingPayments: number): Promise<void> {
    try {
      await this.db.query(
        'UPDATE payment_plans SET remaining_payments = $1, updated_at = CURRENT_TIMESTAMP WHERE account_id = $2',
        [remainingPayments, accountId.toString()]
      );
      
      logger.debug('Payment plan remaining payments updated', { 
        accountId: accountId.toString(),
        remainingPayments 
      });
    } catch (error) {
      logger.error('Failed to update remaining payments', { 
        accountId: accountId.toString(),
        error 
      });
      throw error;
    }
  }

  async delete(accountId: AccountId): Promise<void> {
    try {
      await this.db.query('DELETE FROM payment_plans WHERE account_id = $1', [accountId.toString()]);
      logger.debug('Payment plan deleted', { accountId: accountId.toString() });
    } catch (error) {
      logger.error('Failed to delete payment plan', { 
        accountId: accountId.toString(),
        error 
      });
      throw error;
    }
  }

  async findPaymentsDue(date: Date = new Date()): Promise<PaymentPlan[]> {
    try {
      const result = await this.db.query(
        `SELECT * FROM payment_plans 
         WHERE next_payment_date <= $1 
         AND remaining_payments > 0 
         ORDER BY next_payment_date`,
        [date.toISOString().split('T')[0]]
      );
      
      return result.rows.map(row => ({
        accountId: BigInt(row.account_id),
        principalAmount: BigInt(row.principal_amount),
        interestRate: parseFloat(row.interest_rate),
        termMonths: row.term_months,
        monthlyPayment: BigInt(row.monthly_payment),
        remainingPayments: row.remaining_payments,
        loanType: row.loan_type || 'ANNUITY',
        paymentFrequency: row.payment_frequency || 'MONTHLY',
        fees: row.fees || [],
        totalLoanAmount: BigInt(row.total_loan_amount || row.principal_amount),
        nextPaymentDate: row.next_payment_date ? new Date(row.next_payment_date) : new Date(),
        customerId: row.customer_id || '',
      }));
    } catch (error) {
      logger.error('Failed to find payments due', { error });
      throw error;
    }
  }

  async updateNextPaymentDate(accountId: AccountId, nextPaymentDate: Date): Promise<void> {
    try {
      await this.db.query(
        'UPDATE payment_plans SET next_payment_date = $1, updated_at = CURRENT_TIMESTAMP WHERE account_id = $2',
        [nextPaymentDate.toISOString().split('T')[0], accountId.toString()]
      );
      
      logger.debug('Payment plan next payment date updated', { 
        accountId: accountId.toString(),
        nextPaymentDate: nextPaymentDate.toISOString().split('T')[0]
      });
    } catch (error) {
      logger.error('Failed to update next payment date', { 
        accountId: accountId.toString(),
        error 
      });
      throw error;
    }
  }
}