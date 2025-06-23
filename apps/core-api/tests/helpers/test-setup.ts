import { ServiceFactory, ServiceContainer } from '../../src/services/factory.js';
import { DatabaseConnection, logger } from '@core-poc/core-services';
import { createClient } from 'tigerbeetle-node';

export interface TestContext {
  services: ServiceContainer;
}

let globalTestContext: TestContext | null = null;

/**
 * Load test environment variables
 * Sets test-specific environment variables for external services
 */
export function loadTestEnvironment(): void {
  try {
    // Set test environment variables directly
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    
    // Database Configuration (using external PostgreSQL instance)
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    // Create unique database name per Jest worker to avoid conflicts
    const workerId = process.env.JEST_WORKER_ID || '1';
    process.env.DB_NAME = `banking_poc_test_${workerId}`;
    process.env.DB_USER = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
    process.env.DB_POOL_SIZE = '5';
    process.env.DB_IDLE_TIMEOUT = '30000';
    process.env.DB_CONNECTION_TIMEOUT = '2000';
    
    // TigerBeetle Configuration (using external TigerBeetle instance)
    process.env.TIGERBEETLE_CLUSTER_ID = '0';
    process.env.TIGERBEETLE_ADDRESSES = '6000';
    
    // RabbitMQ Configuration (using external RabbitMQ instance)
    // Use the same exchange as TigerBeetle CDC publishes to
    process.env.AMQP_URL = 'amqp://guest:guest@localhost:5672';
    process.env.CDC_EXCHANGE = 'banking-events';  // Same as TigerBeetle CDC
    process.env.CDC_QUEUE = 'banking-queue-test'; // Test-specific queue
    process.env.CDC_ROUTING_KEYS = '#';
    process.env.CDC_AUTO_ACK = 'false';
    
    // Test-specific settings
    process.env.TEST_MODE = 'true';
    
    logger.info('Test environment loaded successfully');
  } catch (error) {
    logger.error('Failed to load test environment', { error });
    throw new Error('Could not load test environment configuration');
  }
}

/**
 * Initialize test database schema
 * Creates test-specific database and tables
 */
export async function initializeTestDatabase(): Promise<void> {
  try {
    logger.info('Initializing test database...');
    
    // First connect to postgres database to create test database
    const tempDbName = process.env.DB_NAME;
    process.env.DB_NAME = 'postgres'; // Connect to default postgres db first
    
    let adminDatabase = DatabaseConnection.getInstance();
    
    // Create test database if it doesn't exist
    try {
      await adminDatabase.query(`CREATE DATABASE ${tempDbName}`);
      logger.info(`Created test database: ${tempDbName}`);
    } catch (error) {
      // Database might already exist, that's fine
      logger.debug('Test database might already exist', { error });
    }
    
    // Close admin connection
    await adminDatabase.close();
    DatabaseConnection.resetInstance();
    
    // Now reconnect to the test database
    process.env.DB_NAME = tempDbName;
    const database = DatabaseConnection.getInstance();
    
    // Initialize schema
    await database.initializeSchema();
    
    logger.info('Test database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize test database', { error });
    throw error;
  }
}

/**
 * Clean test database by dropping and recreating it
 */
export async function cleanTestDatabase(): Promise<void> {
  try {
    logger.info('Cleaning test database...');
    
    const testDbName = process.env.DB_NAME;
    
    // Close any existing database connections to the test database
    try {
      const existingDb = DatabaseConnection.getInstance();
      await existingDb.close();
      DatabaseConnection.resetInstance();
    } catch (error) {
      // Ignore if no connection exists
      logger.debug('No existing database connection to close', { error });
    }
    
    // Connect to postgres database to drop/create test database
    process.env.DB_NAME = 'postgres';
    
    let adminDatabase = DatabaseConnection.getInstance();
    
    // Force close all connections to the test database before dropping
    await adminDatabase.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${testDbName}' AND pid <> pg_backend_pid()
    `);
    
    // Drop and recreate test database for clean state
    await adminDatabase.query(`DROP DATABASE IF EXISTS ${testDbName}`);
    await adminDatabase.query(`CREATE DATABASE ${testDbName}`);
    
    // Close admin connection
    await adminDatabase.close();
    DatabaseConnection.resetInstance();
    
    // Reconnect to the new test database
    process.env.DB_NAME = testDbName;
    const newDatabase = DatabaseConnection.getInstance();
    await newDatabase.initializeSchema();
    
    logger.info('Test database cleaned successfully');
  } catch (error) {
    logger.error('Failed to clean test database', { error });
    throw error;
  }
}

/**
 * Wait for TigerBeetle to be ready
 */
export async function waitForTigerBeetle(maxRetries = 10, delayMs = 500): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    let testClient: any = null;
    try {
      const address = process.env.TIGERBEETLE_ADDRESSES || '6000';
      testClient = createClient({
        cluster_id: BigInt(process.env.TIGERBEETLE_CLUSTER_ID || '0'),
        replica_addresses: [address],
      });
      
      // Test the connection
      await testClient.lookupAccounts([1n]);
      
      // Clean up test client immediately after successful test
      await testClient.close();
      testClient = null;
      
      logger.debug('TigerBeetle is ready');
      return;
    } catch (error) {
      logger.debug(`TigerBeetle not ready, attempt ${i + 1}/${maxRetries}`, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } finally {
      // Cleanup any remaining test client (in case of error)
      if (testClient) {
        try {
          await testClient.close();
        } catch (e) {
          // Ignore cleanup errors - connection might already be closed
          logger.debug('Error during TigerBeetle test client cleanup', { error: e });
        }
        testClient = null;
      }
    }
  }
  throw new Error(`TigerBeetle not ready after ${maxRetries} attempts`);
}

/**
 * Create test context with simplified setup
 */
export async function createTestContext(): Promise<TestContext> {
  if (globalTestContext) {
    return globalTestContext;
  }

  try {
    logger.info('Creating test context...');

    // Load test environment
    loadTestEnvironment();
    
    // Wait for external services to be ready
    await waitForTigerBeetle();
    
    // Initialize test database
    await initializeTestDatabase();
    
    // Create services using test configuration
    const services = await ServiceFactory.createTestServices();

    globalTestContext = {
      services,
    };

    logger.info('Test context created successfully');
    return globalTestContext;
  } catch (error) {
    logger.error('Failed to create test context', { error });
    throw error;
  }
}

/**
 * Clean up test context
 */
export async function cleanupTestContext(): Promise<void> {
  if (globalTestContext) {
    try {
      logger.info('Cleaning up test context...');
      
      // Clean up services
      await ServiceFactory.cleanup();
      
      globalTestContext = null;
      
      logger.info('Test context cleaned up successfully');
    } catch (error) {
      logger.error('Failed to cleanup test context', { error });
      // Don't throw - cleanup should be best effort
    }
  }
}

/**
 * Reset test data between tests
 */
export async function resetTestData(): Promise<void> {
  try {
    logger.info('Resetting test data...');
    
    const database = DatabaseConnection.getInstance();
    
    // Clear all tables in correct order (respecting foreign keys)
    await database.query('TRUNCATE accounts CASCADE');
    await database.query('TRUNCATE payment_plans CASCADE');
    await database.query('TRUNCATE transfers CASCADE');
    
    logger.debug('Test data reset successfully');
  } catch (error) {
    logger.error('Failed to reset test data', { error });
    throw error;
  }
}

/**
 * Wait for CDC event processing to complete
 * CDC events are processed asynchronously, so tests need to wait for them
 */
export async function waitForCDCProcessing(delayMs: number = 2000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Wait for specific transfer to appear in PostgreSQL via CDC
 */
export async function waitForTransferRecord(
  transferId: string, 
  maxRetries: number = 10, 
  delayMs: number = 500
): Promise<boolean> {
  const database = DatabaseConnection.getInstance();
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await database.query(
        'SELECT COUNT(*) as count FROM transfers WHERE transfer_id = $1',
        [transferId]
      );
      
      if (parseInt(result.rows[0].count) > 0) {
        logger.debug(`Transfer record found after ${i + 1} attempts`);
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } catch (error) {
      logger.debug(`Error checking for transfer record, attempt ${i + 1}/${maxRetries}`, { error });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  logger.warn(`Transfer record not found after ${maxRetries} attempts`, { transferId });
  return false;
}