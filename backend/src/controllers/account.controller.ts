import { Request, Response } from 'express';
import { AccountService } from '../services/account.service.js';
import { LoanService } from '../domain/services/loan.service.js';
import { InvoiceService } from '../domain/services/invoice.service.js';
import { Money, AccountId, CustomerId } from '../domain/value-objects.js';
import { 
  CreateAccountRequest, 
  CreateDepositAccountRequest, 
  CreateLoanAccountRequest, 
  CreateCreditAccountRequest,
  TransferRequest,
  CreateInvoiceRequest,
  CustomerIdParam,
  UpdateAccountNameRequest,
} from '../validation/schemas.js';
import { logger } from '../utils/logger.js';

export class AccountController {
  constructor(
    private accountService: AccountService,
    private loanService: LoanService,
    private invoiceService: InvoiceService
  ) {}

  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = req.body as CreateAccountRequest;
      
      logger.info('Creating account', {
        type: validatedData.type,
        customerId: validatedData.customerId,
        currency: validatedData.currency,
      });

      switch (validatedData.type) {
        case 'LOAN':
          await this.createLoanAccount(req, res, validatedData);
          break;
        case 'DEPOSIT':
          await this.createDepositAccount(req, res, validatedData);
          break;
        case 'CREDIT':
          await this.createCreditAccount(req, res, validatedData);
          break;
        default:
          res.status(400).json({ error: 'Invalid account type' });
      }
    } catch (error) {
      logger.error('Failed to create account', { error });
      res.status(500).json({ error: 'Failed to create account' });
    }
  }

  private async createLoanAccount(
    req: Request, 
    res: Response, 
    data: CreateLoanAccountRequest
  ): Promise<void> {
    // Convert fee strings to LoanFee objects with bigint amounts
    const fees = data.fees.map(fee => ({
      type: fee.type,
      amount: BigInt(fee.amount),
      description: fee.description,
    }));

    const loanAccount = await this.loanService.createLoanWithPaymentPlan({
      customerId: new CustomerId(data.customerId),
      currency: data.currency,
      principalAmount: new Money(data.principalAmount, data.currency),
      interestRate: parseFloat(data.interestRate),
      termMonths: parseInt(data.termMonths),
      loanType: data.loanType,
      paymentFrequency: data.paymentFrequency,
      fees,
      accountName: data.accountName,
    });

    res.status(201).json({
      accountId: loanAccount.accountId.toString(),
      monthlyPayment: loanAccount.monthlyPayment.toString(),
      loanType: data.loanType,
      paymentFrequency: data.paymentFrequency,
      totalFees: fees.reduce((total, fee) => total + fee.amount, 0n).toString(),
    });
  }

  private async createDepositAccount(
    req: Request, 
    res: Response, 
    data: CreateDepositAccountRequest
  ): Promise<void> {
    const initialBalance = data.initialBalance 
      ? new Money(data.initialBalance, data.currency) 
      : undefined;

    const accountId = await this.accountService.createDepositAccount(
      data.customerId,
      data.currency,
      initialBalance?.amount,
      data.accountName
    );

    res.status(201).json({
      accountId: accountId.toString(),
    });
  }

  private async createCreditAccount(
    req: Request, 
    res: Response, 
    data: CreateCreditAccountRequest
  ): Promise<void> {
    const creditLimit = new Money(data.creditLimit, data.currency);

    const accountId = await this.accountService.createCreditAccount(
      data.customerId,
      data.currency,
      creditLimit.amount,
      data.accountName
    );

    res.status(201).json({
      accountId: accountId.toString(),
    });
  }

  async getAccountBalance(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      
      logger.debug('Getting account balance', { accountId });
      
      const balance = await this.accountService.getAccountBalance(BigInt(accountId));
      
      res.json({
        debits: balance.debits.toString(),
        credits: balance.credits.toString(),
        balance: balance.balance.toString(),
      });
    } catch (error) {
      logger.error('Failed to get account balance', { 
        accountId: req.params.accountId,
        error 
      });
      res.status(500).json({ error: 'Failed to get account balance' });
    }
  }

  async transfer(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as TransferRequest;
      
      logger.info('Processing transfer', {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: data.amount,
        currency: data.currency,
      });
      
      const transferId = await this.accountService.transfer(
        BigInt(data.fromAccountId),
        BigInt(data.toAccountId),
        BigInt(data.amount),
        data.currency
      );

      res.status(201).json({ 
        transferId: transferId.toString() 
      });
    } catch (error) {
      logger.error('Failed to process transfer', { 
        body: req.body,
        error 
      });
      res.status(500).json({ error: 'Failed to process transfer' });
    }
  }

  async createInvoice(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateInvoiceRequest;
      
      logger.info('Creating invoice', {
        accountId: data.accountId,
        amount: data.amount,
        dueDate: data.dueDate,
      });
      
      const invoice = await this.invoiceService.createInvoice({
        accountId: new AccountId(data.accountId),
        amount: new Money(data.amount, 'USD'), // TODO: Get currency from request or account
        dueDate: new Date(data.dueDate),
      });

      // Convert BigInt fields to strings for JSON serialization
      const serializedInvoice = {
        id: invoice.id,
        accountId: invoice.accountId.toString(),
        amount: invoice.amount.toString(),
        dueDate: invoice.dueDate,
        status: invoice.status,
      };

      res.status(201).json(serializedInvoice);
    } catch (error) {
      logger.error('Failed to create invoice', { 
        body: req.body,
        error 
      });
      res.status(500).json({ error: 'Failed to create invoice' });
    }
  }

  async getInvoices(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      
      logger.debug('Getting invoices for account', { accountId });
      
      const invoices = await this.invoiceService.getInvoicesByAccount(
        new AccountId(accountId)
      );
      
      // Convert BigInt fields to strings for JSON serialization
      const serializedInvoices = invoices.map(invoice => ({
        id: invoice.id,
        accountId: invoice.accountId.toString(),
        amount: invoice.amount.toString(),
        dueDate: invoice.dueDate,
        status: invoice.status,
      }));
      
      res.json(serializedInvoices);
    } catch (error) {
      logger.error('Failed to get invoices', { 
        accountId: req.params.accountId,
        error 
      });
      res.status(500).json({ error: 'Failed to get invoices' });
    }
  }

  async getPaymentPlan(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      
      logger.debug('Getting payment plan for account', { accountId });
      
      const paymentPlan = await this.loanService.getPaymentPlan(
        new AccountId(accountId)
      );
      
      if (!paymentPlan) {
        res.status(404).json({ error: 'Payment plan not found' });
        return;
      }
      
      // Convert BigInt fields to strings for JSON serialization
      const serializedPaymentPlan = {
        accountId: paymentPlan.accountId.toString(),
        principalAmount: paymentPlan.principalAmount.toString(),
        interestRate: paymentPlan.interestRate,
        termMonths: paymentPlan.termMonths,
        monthlyPayment: paymentPlan.monthlyPayment.toString(),
        remainingPayments: paymentPlan.remainingPayments,
        loanType: paymentPlan.loanType,
        paymentFrequency: paymentPlan.paymentFrequency,
        fees: paymentPlan.fees.map(fee => ({
          type: fee.type,
          amount: fee.amount.toString(),
          description: fee.description,
        })),
        totalLoanAmount: paymentPlan.totalLoanAmount.toString(),
      };
      
      res.json(serializedPaymentPlan);
    } catch (error) {
      logger.error('Failed to get payment plan', { 
        accountId: req.params.accountId,
        error 
      });
      res.status(500).json({ error: 'Failed to get payment plan' });
    }
  }

  async getAmortizationSchedule(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      
      logger.debug('Getting amortization schedule for account', { accountId });
      
      const schedule = await this.loanService.generateAmortizationSchedule(
        new AccountId(accountId)
      );
      
      if (!schedule) {
        res.status(404).json({ error: 'Payment plan not found' });
        return;
      }
      
      // Convert BigInt fields to strings for JSON serialization
      const serializedSchedule = {
        accountId: schedule.accountId.toString(),
        totalPayments: schedule.totalPayments.toString(),
        totalInterest: schedule.totalInterest.toString(),
        schedule: schedule.schedule.map(entry => ({
          paymentNumber: entry.paymentNumber,
          paymentDate: entry.paymentDate,
          paymentAmount: entry.paymentAmount.toString(),
          principalAmount: entry.principalAmount.toString(),
          interestAmount: entry.interestAmount.toString(),
          remainingBalance: entry.remainingBalance.toString(),
        })),
      };
      
      res.json(serializedSchedule);
    } catch (error) {
      logger.error('Failed to get amortization schedule', { 
        accountId: req.params.accountId,
        error 
      });
      res.status(500).json({ error: 'Failed to get amortization schedule' });
    }
  }

  async getAccountsByCustomer(req: Request, res: Response): Promise<void> {
    try {
      const { customerId } = req.params;
      
      logger.debug('Getting accounts for customer', { customerId });
      
      const accounts = await this.accountService.getAccountsByCustomer(
        new CustomerId(customerId)
      );
      
      logger.debug('Found accounts for customer', { 
        customerId,
        accountCount: accounts.length 
      });
      
      // Convert BigInt fields to strings for JSON serialization
      const serializedAccounts = accounts.map(account => ({
        accountId: account.accountId.toString(),
        customerId: account.customerId,
        accountType: account.accountType,
        currency: account.currency,
        accountName: account.accountName,
        createdAt: account.createdAt.toISOString(),
        updatedAt: account.updatedAt.toISOString(),
      }));
      
      res.json(serializedAccounts);
    } catch (error) {
      logger.error('Failed to get accounts by customer', { 
        customerId: req.params.customerId,
        error 
      });
      res.status(500).json({ error: 'Failed to get accounts by customer' });
    }
  }

  async updateAccountName(req: Request, res: Response): Promise<void> {
    try {
      const { accountId } = req.params;
      const validatedData = req.body as UpdateAccountNameRequest;
      
      logger.debug('Updating account name', { accountId, accountName: validatedData.accountName });
      
      const success = await this.accountService.updateAccountName(
        new AccountId(accountId),
        validatedData.accountName
      );
      
      if (!success) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
      
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to update account name', { 
        accountId: req.params.accountId,
        error 
      });
      res.status(500).json({ error: 'Failed to update account name' });
    }
  }
}