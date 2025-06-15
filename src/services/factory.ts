import { AccountService } from './account.service.js';
import { TigerBeetleService } from './tigerbeetle.service.js';
import { PaymentPlanJob } from '../jobs/payment-plan.job.js';
import { InvoiceJob } from '../jobs/invoice.job.js';
import { LoanService } from '../domain/services/loan.service.js';
import { InvoiceService } from '../domain/services/invoice.service.js';
import { PaymentPlanRepository } from '../repositories/payment-plan.repository.js';
import { InvoiceRepository } from '../repositories/invoice.repository.js';
import { DatabaseConnection } from '../database/connection.js';
import { createClient } from 'tigerbeetle-node';
import { readFileSync } from 'fs';
import { logger } from '../utils/logger.js';

export interface ServiceContainer {
  accountService: AccountService;
  loanService: LoanService;
  invoiceService: InvoiceService;
  paymentPlanJob: PaymentPlanJob;
  invoiceJob: InvoiceJob;
  database: DatabaseConnection;
  tigerBeetleService: TigerBeetleService;
}

export class ServiceFactory {
  private static instance: ServiceContainer | null = null;

  static async createServices(): Promise<ServiceContainer> {
    if (ServiceFactory.instance) {
      return ServiceFactory.instance;
    }

    try {
      logger.info('Initializing services...');

      // Initialize database connection and schema
      const database = DatabaseConnection.getInstance();
      await database.initializeSchema();

      // Create TigerBeetle client
      const tigerBeetleClient = createClient({
        cluster_id: BigInt(process.env.TIGERBEETLE_CLUSTER_ID || 0),
        replica_addresses: process.env.TIGERBEETLE_ADDRESSES?.split(',') || ['3000'],
      });

      // Create core services
      const tigerBeetleService = new TigerBeetleService(tigerBeetleClient);
      const accountService = new AccountService(tigerBeetleService);

      // Create repositories
      const paymentPlanRepository = new PaymentPlanRepository();
      const invoiceRepository = new InvoiceRepository();

      // Create domain services
      const loanService = new LoanService(accountService, paymentPlanRepository);
      const invoiceService = new InvoiceService(invoiceRepository);

      // Create background jobs
      const paymentPlanJob = new PaymentPlanJob(paymentPlanRepository, accountService);
      const invoiceJob = new InvoiceJob(invoiceService);

      ServiceFactory.instance = {
        accountService,
        loanService,
        invoiceService,
        paymentPlanJob,
        invoiceJob,
        database,
        tigerBeetleService,
      };

      logger.info('Services initialized successfully');
      return ServiceFactory.instance;
    } catch (error) {
      logger.error('Failed to initialize services', { error });
      throw error;
    }
  }


  static async createTestServices(): Promise<ServiceContainer> {
    try {
      logger.info('Initializing test services...');

      // Use the existing database connection configured by TestDatabase
      const database = DatabaseConnection.getInstance();
      await database.initializeSchema();

      // Create TigerBeetle client for container testing
      const tigerBeetleClient = createClient({
        cluster_id: BigInt(process.env.TIGERBEETLE_CLUSTER_ID || 0),
        replica_addresses: process.env.TIGERBEETLE_ADDRESSES?.split(',') || ['3001'],
      });

      // Create core services
      const tigerBeetleService = new TigerBeetleService(tigerBeetleClient);
      const accountService = new AccountService(tigerBeetleService);

      // Create repositories
      const paymentPlanRepository = new PaymentPlanRepository();
      const invoiceRepository = new InvoiceRepository();

      // Create domain services
      const loanService = new LoanService(accountService, paymentPlanRepository);
      const invoiceService = new InvoiceService(invoiceRepository);

      // Create background jobs (but don't start them in tests)
      const paymentPlanJob = new PaymentPlanJob(paymentPlanRepository, accountService);
      const invoiceJob = new InvoiceJob(invoiceService);

      const container = {
        accountService,
        loanService,
        invoiceService,
        paymentPlanJob,
        invoiceJob,
        database,
        tigerBeetleService,
      };

      logger.info('Test services initialized successfully');
      return container;
    } catch (error) {
      logger.error('Failed to initialize test services', { error });
      throw error;
    }
  }

  static async cleanup(): Promise<void> {
    if (ServiceFactory.instance) {
      try {
        logger.info('Cleaning up services...');
        
        // Stop background jobs
        ServiceFactory.instance.paymentPlanJob.stopMonthlyJob();
        ServiceFactory.instance.invoiceJob.stopOverdueJob();
        
        // Close database connection
        await ServiceFactory.instance.database.close();
        
        // Reset database singleton
        DatabaseConnection.resetInstance();
        
        ServiceFactory.instance = null;
        logger.info('Services cleaned up successfully');
      } catch (error) {
        logger.error('Failed to cleanup services', { error });
      }
    }
  }
}