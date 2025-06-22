import { AccountService } from './account.service.js';
import { TigerBeetleService } from './tigerbeetle.service.js';
import { CDCManagerService } from './cdc-manager.service.js';
import { PaymentProcessingService } from './payment-processing.service.js';
import { PaymentPlanJob } from '../jobs/payment-plan.job.js';
import { InvoiceJob } from '../jobs/invoice.job.js';
import { LoanService } from '../domain/services/loan.service.js';
import { InvoiceService } from '../domain/services/invoice.service.js';
import { PaymentPlanRepository } from '../repositories/payment-plan.repository.js';
import { InvoiceRepository } from '../repositories/invoice.repository.js';
import { TransferRepository } from '../repositories/transfer.repository.js';
import { DatabaseConnection } from '../database/connection.js';
import { createClient } from 'tigerbeetle-node';
import { readFileSync } from 'fs';
import { logger } from '../utils/logger.js';
import { getConfig, getTestConfig } from '../config/index.js';

export interface ServiceContainer {
  accountService: AccountService;
  loanService: LoanService;
  invoiceService: InvoiceService;
  paymentProcessingService: PaymentProcessingService;
  paymentPlanJob: PaymentPlanJob;
  invoiceJob: InvoiceJob;
  database: DatabaseConnection;
  tigerBeetleService: TigerBeetleService;
  cdcManager: CDCManagerService;
  transferRepository: TransferRepository;
}

export class ServiceFactory {
  private static instance: ServiceContainer | null = null;

  static async createServices(): Promise<ServiceContainer> {
    if (ServiceFactory.instance) {
      return ServiceFactory.instance;
    }

    try {
      logger.info('Initializing services...');

      // Get configuration
      const config = getConfig();

      // Initialize database connection and schema
      logger.info('Initializing database connection...');
      const database = DatabaseConnection.getInstance();
      try {
        await database.initializeSchema();
        logger.info('Database schema initialized successfully');
      } catch (dbError) {
        logger.error('Failed to initialize database schema', { 
          error: dbError,
          dbHost: config.database.host,
          dbPort: config.database.port,
          dbName: config.database.name
        });
        throw new Error(`Database initialization failed: ${(dbError as Error)?.message || 'Unknown database error'}`);
      }

      // Create TigerBeetle client
      logger.info('Initializing TigerBeetle client...');
      const tigerbeetleAddresses = [config.tigerbeetle.address];
      const clusterId = config.tigerbeetle.clusterId;
      
      logger.info('TigerBeetle configuration', {
        clusterId: clusterId.toString(),
        addresses: tigerbeetleAddresses
      });

      let tigerBeetleClient;
      try {
        tigerBeetleClient = createClient({
          cluster_id: clusterId,
          replica_addresses: tigerbeetleAddresses,
        });
        logger.info('TigerBeetle client created successfully');
      } catch (tbError) {
        logger.error('Failed to create TigerBeetle client', { 
          error: tbError,
          clusterId: clusterId.toString(),
          addresses: tigerbeetleAddresses
        });
        throw new Error(`TigerBeetle client creation failed: ${(tbError as Error)?.message || 'Unknown TigerBeetle error'}`);
      }

      // Create core services
      const tigerBeetleService = new TigerBeetleService(tigerBeetleClient, clusterId, tigerbeetleAddresses);
      const accountService = new AccountService(tigerBeetleService);

      // Create repositories
      const paymentPlanRepository = new PaymentPlanRepository();
      const invoiceRepository = new InvoiceRepository();
      const transferRepository = new TransferRepository();

      // Create domain services
      const loanService = new LoanService(accountService, paymentPlanRepository);
      const invoiceService = new InvoiceService(invoiceRepository);

      // Create payment processing service
      const paymentProcessingService = new PaymentProcessingService(
        paymentPlanRepository,
        invoiceService,
        accountService
      );

      // Create background jobs
      const paymentPlanJob = new PaymentPlanJob(paymentPlanRepository, accountService, paymentProcessingService);
      const invoiceJob = new InvoiceJob(invoiceService);

      // Create CDC Manager
      const cdcManager = new CDCManagerService(config);
      await cdcManager.initialize();

      ServiceFactory.instance = {
        accountService,
        loanService,
        invoiceService,
        paymentProcessingService,
        paymentPlanJob,
        invoiceJob,
        database,
        tigerBeetleService,
        cdcManager,
        transferRepository,
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

      // Get test configuration
      const config = getTestConfig();

      // Use the existing database connection configured by TestDatabase
      const database = DatabaseConnection.getInstance();
      await database.initializeSchema();

      // Create TigerBeetle client for container testing
      const clusterId = config.tigerbeetle.clusterId;
      const tigerbeetleAddresses = [config.tigerbeetle.address];
      const tigerBeetleClient = createClient({
        cluster_id: clusterId,
        replica_addresses: tigerbeetleAddresses,
      });

      // Create core services
      const tigerBeetleService = new TigerBeetleService(tigerBeetleClient, clusterId, tigerbeetleAddresses);
      const accountService = new AccountService(tigerBeetleService);

      // Create repositories
      const paymentPlanRepository = new PaymentPlanRepository();
      const invoiceRepository = new InvoiceRepository();
      const transferRepository = new TransferRepository();

      // Create domain services
      const loanService = new LoanService(accountService, paymentPlanRepository);
      const invoiceService = new InvoiceService(invoiceRepository);

      // Create payment processing service
      const paymentProcessingService = new PaymentProcessingService(
        paymentPlanRepository,
        invoiceService,
        accountService
      );

      // Create background jobs (but don't start them in tests)
      const paymentPlanJob = new PaymentPlanJob(paymentPlanRepository, accountService, paymentProcessingService);
      const invoiceJob = new InvoiceJob(invoiceService);

      // Create CDC Manager (disabled for tests)
      const cdcManager = new CDCManagerService(config);
      // Don't initialize CDC in tests

      const container = {
        accountService,
        loanService,
        invoiceService,
        paymentProcessingService,
        paymentPlanJob,
        invoiceJob,
        database,
        tigerBeetleService,
        cdcManager,
        transferRepository,
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
        
        // Shutdown CDC Manager
        await ServiceFactory.instance.cdcManager.shutdown();
        
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