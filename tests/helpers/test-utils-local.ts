import { ServiceFactory, ServiceContainer } from '../../src/services/factory';
import { LocalTigerBeetle } from './local-tigerbeetle';
import { TestDatabase } from './test-database';
import { logger } from '../../src/utils/logger';

export interface LocalTestContext {
  services: ServiceContainer;
  tigerBeetle: LocalTigerBeetle;
  testDatabase: TestDatabase;
}

export const createLocalTestContext = async (): Promise<LocalTestContext> => {
  try {
    logger.info('Creating local test context...');

    // Get the shared test database instance
    const testDatabase = await TestDatabase.getInstance();

    // Create a unique TigerBeetle instance for this test
    const tigerBeetle = new LocalTigerBeetle(3000 + Math.floor(Math.random() * 1000));
    const { port } = await tigerBeetle.start();
    
    // Set up test environment variables for TigerBeetle
    process.env.TIGERBEETLE_ADDRESSES = `${port}`;
    process.env.TIGERBEETLE_CLUSTER_ID = '0';
    
    // Create services using the test database configuration
    const services = await ServiceFactory.createLocalTestServices();

    logger.info('Local test context created successfully', { 
      tigerBeetlePort: port,
      databaseConfig: testDatabase.getConnectionConfig(),
    });

    return {
      services,
      tigerBeetle,
      testDatabase,
    };
  } catch (error) {
    logger.error('Failed to create local test context', { error });
    throw error;
  }
};

export const cleanupLocalTestContext = async (context: LocalTestContext): Promise<void> => {
  try {
    logger.info('Cleaning up local test context...');
    
    // Clean up services
    await ServiceFactory.cleanup();
    
    // Stop the TigerBeetle process (database container is managed globally)
    await context.tigerBeetle.stop();
    
    logger.info('Local test context cleaned up successfully');
  } catch (error) {
    logger.error('Failed to cleanup local test context', { error });
    // Don't throw - cleanup should be best effort
  }
};