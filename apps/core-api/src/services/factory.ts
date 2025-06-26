import {
  DatabaseConnection,
  PaymentPlanRepository,
  TransferRepository,
  TigerBeetleService,
  SystemAccountConfigService,
  getConfig,
  getTestConfig,
  logger,
} from '@core-poc/core-services';
import {
  AccountService,
  LoanService,
  PaymentProcessingService,
  CDCManagerService,
} from '@core-poc/domain';
import { createClient } from 'tigerbeetle-node';

export interface ServiceContainer {
  accountService: AccountService;
  loanService: LoanService;
  paymentProcessingService: PaymentProcessingService;
  database: DatabaseConnection;
  tigerBeetleService: TigerBeetleService;
  cdcManager: CDCManagerService;
  transferRepository: TransferRepository;
  systemAccountConfigService: SystemAccountConfigService;
}

export class ServiceFactory {
  private static instance: ServiceContainer | null = null;
  private static testInstance: ServiceContainer | null = null;

  static async createServices(): Promise<ServiceContainer> {
    if (ServiceFactory.instance) {
      return ServiceFactory.instance;
    }

    try {
      logger.info('Initializing Core API services...');

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
      const transferRepository = new TransferRepository();

      // Create system account config service
      const systemAccountConfigService = new SystemAccountConfigService();
      await systemAccountConfigService.initialize();

      // Create domain services
      const loanService = new LoanService(accountService, paymentPlanRepository);

      // Create payment processing service
      const paymentProcessingService = new PaymentProcessingService(
        paymentPlanRepository,
        accountService,
      );

      // Create CDC Manager
      const cdcManager = new CDCManagerService(config);
      await cdcManager.initialize();

      ServiceFactory.instance = {
        accountService,
        loanService,
        paymentProcessingService,
        database,
        tigerBeetleService,
        cdcManager,
        transferRepository,
        systemAccountConfigService,
      };

      logger.info('Core API services initialized successfully');
      return ServiceFactory.instance;
    } catch (error) {
      logger.error('Failed to initialize services', { error });
      throw error;
    }
  }

  static async createTestServices(): Promise<ServiceContainer> {
    if (ServiceFactory.testInstance) {
      return ServiceFactory.testInstance;
    }

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
      const tigerBeetleService = new TigerBeetleService(
        tigerBeetleClient,
        clusterId,
        tigerbeetleAddresses,
      );
      const accountService = new AccountService(tigerBeetleService);

      // Create repositories
      const paymentPlanRepository = new PaymentPlanRepository();
      const transferRepository = new TransferRepository();

      // Create system account config service
      const systemAccountConfigService = new SystemAccountConfigService();
      await systemAccountConfigService.initialize();

      // Create domain services
      const loanService = new LoanService(accountService, paymentPlanRepository);

      // Create payment processing service
      const paymentProcessingService = new PaymentProcessingService(
        paymentPlanRepository,
        accountService,
      );

      // Create CDC Manager
      const cdcManager = new CDCManagerService(config);
      await cdcManager.initialize();

      ServiceFactory.testInstance = {
        accountService,
        loanService,
        paymentProcessingService,
        database,
        tigerBeetleService,
        cdcManager,
        transferRepository,
        systemAccountConfigService,
      };

      logger.info('Test services initialized successfully');
      return ServiceFactory.testInstance;
    } catch (error) {
      logger.error('Failed to initialize test services', { error });
      throw error;
    }
  }

  static async cleanup(): Promise<void> {
    const activeInstance = ServiceFactory.instance || ServiceFactory.testInstance;

    if (activeInstance) {
      try {
        logger.info('Cleaning up services...');

        // Close TigerBeetle connection
        await activeInstance.tigerBeetleService.close();

        // Shutdown CDC Manager
        await activeInstance.cdcManager.shutdown();

        // Close database connection
        await activeInstance.database.close();

        // Reset database singleton
        DatabaseConnection.resetInstance();

        ServiceFactory.instance = null;
        ServiceFactory.testInstance = null;
        logger.info('Services cleaned up successfully');
      } catch (error) {
        logger.error('Failed to cleanup services', { error });
      }
    }
  }
}
