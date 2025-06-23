import {
  DatabaseConnection,
  PaymentPlanRepository,
  TigerBeetleService,
  getConfig,
  logger,
} from '@core-poc/core-services';
import { AccountService, PaymentProcessingService } from '@core-poc/domain';
import { createClient } from 'tigerbeetle-node';

import { PaymentPlanJob } from '../jobs/payment-plan.job.js';

export interface BatchServiceContainer {
  accountService: AccountService;
  paymentProcessingService: PaymentProcessingService;
  paymentPlanJob: PaymentPlanJob;
  database: DatabaseConnection;
  tigerBeetleService: TigerBeetleService;
}

export class BatchServiceFactory {
  private static instance: BatchServiceContainer | null = null;

  static async createServices(): Promise<BatchServiceContainer> {
    if (BatchServiceFactory.instance) {
      return BatchServiceFactory.instance;
    }

    try {
      logger.info('Initializing batch processor services...');

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
          dbName: config.database.name,
        });
        throw new Error(
          `Database initialization failed: ${(dbError as Error)?.message || 'Unknown database error'}`,
        );
      }

      // Create TigerBeetle client
      logger.info('Initializing TigerBeetle client...');
      const tigerbeetleAddresses = [config.tigerbeetle.address];
      const clusterId = config.tigerbeetle.clusterId;

      logger.info('TigerBeetle configuration', {
        clusterId: clusterId.toString(),
        addresses: tigerbeetleAddresses,
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
          addresses: tigerbeetleAddresses,
        });
        throw new Error(
          `TigerBeetle client creation failed: ${(tbError as Error)?.message || 'Unknown TigerBeetle error'}`,
        );
      }

      // Create core services
      const tigerBeetleService = new TigerBeetleService(
        tigerBeetleClient,
        clusterId,
        tigerbeetleAddresses,
      );
      const accountService = new AccountService(tigerBeetleService);

      // Create repositories
      const paymentPlanRepository = new PaymentPlanRepository();

      // Create payment processing service
      const paymentProcessingService = new PaymentProcessingService(
        paymentPlanRepository,
        accountService,
      );

      // Create background jobs
      const paymentPlanJob = new PaymentPlanJob(
        paymentPlanRepository,
        accountService,
        paymentProcessingService,
      );

      BatchServiceFactory.instance = {
        accountService,
        paymentProcessingService,
        paymentPlanJob,
        database,
        tigerBeetleService,
      };

      logger.info('Batch processor services initialized successfully');
      return BatchServiceFactory.instance;
    } catch (error) {
      logger.error('Failed to initialize batch processor services', { error });
      throw error;
    }
  }

  static async cleanup(): Promise<void> {
    if (BatchServiceFactory.instance) {
      try {
        logger.info('Cleaning up batch processor services...');

        // Stop background jobs
        BatchServiceFactory.instance.paymentPlanJob.stopMonthlyJob();

        // Close database connection
        await BatchServiceFactory.instance.database.close();

        // Reset database singleton
        DatabaseConnection.resetInstance();

        BatchServiceFactory.instance = null;
        logger.info('Batch processor services cleaned up successfully');
      } catch (error) {
        logger.error('Failed to cleanup batch processor services', { error });
      }
    }
  }
}
