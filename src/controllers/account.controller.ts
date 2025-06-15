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
    const loanAccount = await this.loanService.createLoanWithPaymentPlan({
      customerId: new CustomerId(data.customerId),
      currency: data.currency,
      principalAmount: new Money(data.principalAmount, data.currency),
      interestRate: parseFloat(data.interestRate),
      termMonths: parseInt(data.termMonths),
    });

    res.status(201).json({
      accountId: loanAccount.accountId.toString(),
      monthlyPayment: loanAccount.monthlyPayment.toString(),
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
      initialBalance?.amount
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
      creditLimit.amount
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
}