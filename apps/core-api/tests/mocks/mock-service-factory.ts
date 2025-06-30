import {
  DatabaseConnection,
  PaymentPlanRepository,
  TransferRepository,
} from '@core-poc/core-services';
import { AccountService, LoanService, PaymentProcessingService } from '@core-poc/domain';

import { MockCDCManagerService } from './mock-cdc-manager.service.js';
import { MockTigerBeetleService } from './mock-tigerbeetle.service.js';
import { MockSystemAccountConfigService } from './mock-system-account-config.service.js';
import { MockSEPASuspenseAccountService } from './mock-sepa-suspense-account.service.js';

export interface MockServiceContainer {
  accountService: AccountService;
  loanService: LoanService;
  paymentProcessingService: PaymentProcessingService;
  database: DatabaseConnection;
  tigerBeetleService: MockTigerBeetleService;
  cdcManager: MockCDCManagerService;
  transferRepository: TransferRepository;
  systemAccountConfigService: MockSystemAccountConfigService;
  sepaAccountService: MockSEPASuspenseAccountService;
}

/**
 * Factory for creating test services with mocked external dependencies
 *
 * Provides much faster test execution by avoiding real TigerBeetle and CDC connections.
 * Creates fully configured service containers using mock implementations while
 * maintaining the same interfaces as production services.
 *
 * Usage:
 * ```typescript
 * const services = await createTestServicesWithMocks();
 * // Use services.accountService, services.tigerBeetleService, etc.
 * ```
 */
export class MockServiceFactory {
  private static instance: MockServiceContainer | null = null;

  static async createMockServices(): Promise<MockServiceContainer> {
    if (MockServiceFactory.instance) {
      return MockServiceFactory.instance;
    }

    // Create mock services - no external dependencies
    const tigerBeetleService = new MockTigerBeetleService();
    const cdcManager = new MockCDCManagerService();
    const systemAccountConfigService = new MockSystemAccountConfigService();

    // Initialize mock services
    await cdcManager.initialize();
    await systemAccountConfigService.initialize();

    // Create business services using mocks
    const accountService = new AccountService(tigerBeetleService as any);

    // Create repositories - these can use real database for integration testing
    const paymentPlanRepository = new PaymentPlanRepository();
    const transferRepository = new TransferRepository();

    // Create domain services
    const loanService = new LoanService(accountService, paymentPlanRepository);

    // Create payment processing service
    const paymentProcessingService = new PaymentProcessingService(
      paymentPlanRepository,
      accountService,
    );

    // Create mock SEPA service
    const sepaAccountService = new MockSEPASuspenseAccountService(
      tigerBeetleService as any,
      systemAccountConfigService as any,
    );

    // Use real database connection - tests can still use it for data verification
    const database = DatabaseConnection.getInstance();

    MockServiceFactory.instance = {
      accountService,
      loanService,
      paymentProcessingService,
      database,
      tigerBeetleService,
      cdcManager,
      transferRepository,
      systemAccountConfigService,
      sepaAccountService,
    };

    return MockServiceFactory.instance;
  }

  static async cleanup(): Promise<void> {
    if (MockServiceFactory.instance) {
      try {
        // Clean up mock services
        await MockServiceFactory.instance.tigerBeetleService.close();
        await MockServiceFactory.instance.cdcManager.shutdown();

        // Reset mock state
        MockServiceFactory.instance.tigerBeetleService.reset();
        MockServiceFactory.instance.cdcManager.clearEvents();
        MockServiceFactory.instance.systemAccountConfigService.reset();
        MockServiceFactory.instance.sepaAccountService.reset();

        MockServiceFactory.instance = null;
      } catch (error) {
        console.warn('Error during mock service cleanup:', error);
      }
    }
  }

  static resetMockState(): void {
    if (MockServiceFactory.instance) {
      MockServiceFactory.instance.tigerBeetleService.reset();
      MockServiceFactory.instance.cdcManager.clearEvents();
      MockServiceFactory.instance.systemAccountConfigService.reset();
      MockServiceFactory.instance.sepaAccountService.reset();
    }
  }
}

/**
 * Helper function to create and setup mock services for a test
 */
export async function createTestServicesWithMocks(): Promise<MockServiceContainer> {
  const services = await MockServiceFactory.createMockServices();

  // Reset state for clean test
  MockServiceFactory.resetMockState();

  return services;
}
