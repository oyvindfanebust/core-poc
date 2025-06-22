import { ServiceFactory, ServiceContainer } from '../../src/services/factory.js';
import { TestTigerBeetle } from './test-tigerbeetle.js';
import { TestDatabase } from './test-database.js';
import { logger } from '@core-poc/core-services';

export interface TestContext {
  services: ServiceContainer;
  testTigerBeetle: TestTigerBeetle;
  testDatabase: TestDatabase;
}

export const createTestContext = async (): Promise<TestContext> => {
  try {
    logger.info('Creating container test context...');

    // Get the shared test database instance
    const testDatabase = await TestDatabase.getInstance();

    // Get the shared test TigerBeetle instance
    const testTigerBeetle = await TestTigerBeetle.getInstance();
    
    // Set up test environment variables for TigerBeetle
    const tigerBeetleConfig = testTigerBeetle.getConnectionConfig();
    process.env.TIGERBEETLE_ADDRESSES = tigerBeetleConfig.port.toString();
    process.env.TIGERBEETLE_CLUSTER_ID = '0';
    
    // Create services using the test configurations
    const services = await ServiceFactory.createTestServices();

    logger.info('Test context created successfully', { 
      tigerBeetleConfig,
      databaseConfig: testDatabase.getConnectionConfig(),
    });

    return {
      services,
      testTigerBeetle,
      testDatabase,
    };
  } catch (error) {
    logger.error('Failed to create test context', { error });
    throw error;
  }
};

export const cleanupTestContext = async (context: TestContext): Promise<void> => {
  try {
    logger.info('Cleaning up test context...');
    
    // Clean up services (containers are managed globally)
    await ServiceFactory.cleanup();
    
    logger.info('Test context cleaned up successfully');
  } catch (error) {
    logger.error('Failed to cleanup test context', { error });
    // Don't throw - cleanup should be best effort
  }
};