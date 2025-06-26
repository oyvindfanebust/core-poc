import {
  DatabaseConnection,
  PaymentPlanRepository,
  TransferRepository,
  TigerBeetleService,
  SystemAccountConfigService,
  SEPASuspenseAccountService,
  getTestConfig,
  logger,
} from '@core-poc/core-services';
import {
  AccountService,
  LoanService,
  PaymentProcessingService,
  SEPAService,
  MockSEPANetworkService,
  CDCManagerService,
} from '@core-poc/domain';
import { createClient } from 'tigerbeetle-node';

import { ServiceContainer } from '../../src/services/factory.js';

/**
 * Mock service factory specifically for SEPA testing scenarios
 * Provides isolated SEPA mock network for comprehensive testing
 */
export class MockSEPAServiceFactory {
  private static testInstance: ServiceContainer | null = null;
  private static mockSEPANetwork: MockSEPANetworkService | null = null;

  static async createSEPATestServices(): Promise<
    ServiceContainer & { mockSEPANetwork: MockSEPANetworkService }
  > {
    if (MockSEPAServiceFactory.testInstance && MockSEPAServiceFactory.mockSEPANetwork) {
      return {
        ...MockSEPAServiceFactory.testInstance,
        mockSEPANetwork: MockSEPAServiceFactory.mockSEPANetwork,
      };
    }

    try {
      logger.info('Initializing SEPA test services with mock network...');

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

      // Create SEPA services
      const sepaSuspenseAccountService = new SEPASuspenseAccountService(
        tigerBeetleService,
        systemAccountConfigService,
      );

      // Load system account mappings and initialize SEPA accounts
      await sepaSuspenseAccountService.loadSystemAccountMappings();
      await sepaSuspenseAccountService.initializeAllSEPASuspenseAccounts();

      // Create mock SEPA network service
      const mockSEPANetwork = new MockSEPANetworkService({
        networkDelay: 10, // Fast for testing
        errorRate: 0, // Deterministic by default
        timeoutRate: 0,
        simulateWeekends: false, // Consistent testing
        simulateHolidays: false,
        enforceCutOffTimes: false,
        maxDailyAmount: BigInt(1000000 * 100), // €10,000 daily limit
        maxTransactionAmount: BigInt(100000 * 100), // €1,000 per transaction
      });

      // Create enhanced SEPA service with mock network
      const sepaService = new SEPAService(
        accountService,
        tigerBeetleService,
        sepaSuspenseAccountService,
      );

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

      MockSEPAServiceFactory.testInstance = {
        accountService,
        loanService,
        paymentProcessingService,
        sepaService,
        database,
        tigerBeetleService,
        cdcManager,
        transferRepository,
        systemAccountConfigService,
        sepaSuspenseAccountService,
      };

      MockSEPAServiceFactory.mockSEPANetwork = mockSEPANetwork;

      logger.info('SEPA test services with mock network initialized successfully');

      return {
        ...MockSEPAServiceFactory.testInstance,
        mockSEPANetwork: MockSEPAServiceFactory.mockSEPANetwork,
      };
    } catch (error) {
      logger.error('Failed to initialize SEPA test services', { error });
      throw error;
    }
  }

  static async cleanup(): Promise<void> {
    const activeInstance = MockSEPAServiceFactory.testInstance;

    if (activeInstance) {
      try {
        logger.info('Cleaning up SEPA test services...');

        // Reset mock SEPA network
        if (MockSEPAServiceFactory.mockSEPANetwork) {
          MockSEPAServiceFactory.mockSEPANetwork.reset();
        }

        // Close TigerBeetle connection
        await activeInstance.tigerBeetleService.close();

        // Shutdown CDC Manager
        await activeInstance.cdcManager.shutdown();

        // Close database connection
        await activeInstance.database.close();

        // Reset database singleton
        DatabaseConnection.resetInstance();

        MockSEPAServiceFactory.testInstance = null;
        MockSEPAServiceFactory.mockSEPANetwork = null;

        logger.info('SEPA test services cleaned up successfully');
      } catch (error) {
        logger.error('Failed to cleanup SEPA test services', { error });
      }
    }
  }

  /**
   * Get the mock SEPA network instance for test configuration
   */
  static getMockSEPANetwork(): MockSEPANetworkService | null {
    return MockSEPAServiceFactory.mockSEPANetwork;
  }

  /**
   * Reset mock SEPA network state without full cleanup
   */
  static resetMockSEPANetwork(): void {
    if (MockSEPAServiceFactory.mockSEPANetwork) {
      MockSEPAServiceFactory.mockSEPANetwork.reset();
    }
  }

  /**
   * Configure mock SEPA network for specific test scenarios
   */
  static configureMockSEPANetwork(config: {
    networkDelay?: number;
    errorRate?: number;
    forceError?: string; // SEPAErrorType
    timeoutRate?: number;
    simulateWeekends?: boolean;
    simulateHolidays?: boolean;
    enforceCutOffTimes?: boolean;
  }): void {
    const mockNetwork = MockSEPAServiceFactory.mockSEPANetwork;
    if (!mockNetwork) {
      throw new Error('Mock SEPA network not initialized. Call createSEPATestServices() first.');
    }

    if (config.networkDelay !== undefined) {
      mockNetwork.setNetworkDelay(config.networkDelay);
    }

    if (config.forceError) {
      mockNetwork.injectNetworkError(config.forceError);
    }
  }
}

/**
 * Helper functions for SEPA testing
 */
export class SEPATestHelpers {
  /**
   * Create a valid test SEPA message
   */
  static createTestSEPAMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      messageId: `TEST_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      direction: 'OUTGOING',
      amount: BigInt(10000), // €100.00
      currency: 'EUR',
      debtorIBAN: 'DE89370400440532013000',
      creditorIBAN: 'FR1420041010050500013M02606',
      urgency: 'STANDARD',
      description: 'Test SEPA transfer',
      createdAt: new Date(),
      ...overrides,
    };
  }

  /**
   * Create test bank response configuration
   */
  static createTestBankResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      bic: 'TESTBANKXXX',
      accepts: true,
      delay: 100,
      errorRate: 0,
      ...overrides,
    };
  }

  /**
   * Wait for mock settlement to complete
   */
  static async waitForSettlement(
    mockNetwork: MockSEPANetworkService,
    messageId: string,
    timeoutMs: number = 5000,
  ): Promise<MockSEPATransfer | null> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const transfer = await mockNetwork.getTransferStatus(messageId);
      if (transfer && transfer.status === 'SETTLED') {
        return transfer;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Transfer ${messageId} did not settle within ${timeoutMs}ms`);
  }

  /**
   * Create multiple test transfers for load testing
   */
  static createTestTransferBatch(
    count: number,
    baseAmount: bigint = BigInt(10000),
  ): Record<string, unknown>[] {
    return Array.from({ length: count }, (_, index) =>
      SEPATestHelpers.createTestSEPAMessage({
        messageId: `BATCH_${index}_${Date.now()}`,
        amount: baseAmount + BigInt(index * 1000),
      }),
    );
  }

  /**
   * Verify SEPA response structure
   */
  static verifyResponseStructure(response: Record<string, unknown>): void {
    expect(response).toHaveProperty('messageId');
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('sepaTransactionId');
    expect(['ACCEPTED', 'REJECTED', 'PENDING']).toContain(response.status);

    if (response.status === 'REJECTED') {
      expect(response).toHaveProperty('errorDetails');
      expect(response.errorDetails).toHaveProperty('code');
      expect(response.errorDetails).toHaveProperty('message');
      expect(response.errorDetails).toHaveProperty('retryable');
    }

    if (response.status === 'ACCEPTED') {
      expect(response).toHaveProperty('estimatedSettlement');
      expect(response.estimatedSettlement).toBeInstanceOf(Date);
    }
  }
}
