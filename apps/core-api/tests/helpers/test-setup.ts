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
    process.env.DB_NAME = 'banking_poc_test';
    process.env.DB_USER = 'postgres';
    process.env.DB_PASSWORD = 'postgres';
    process.env.DB_POOL_SIZE = '5';
    process.env.DB_IDLE_TIMEOUT = '30000';
    process.env.DB_CONNECTION_TIMEOUT = '2000';
    
    // TigerBeetle Configuration (using external TigerBeetle instance)
    process.env.TIGERBEETLE_CLUSTER_ID = '0';
    process.env.TIGERBEETLE_ADDRESSES = '6000';
    
    // RabbitMQ Configuration (using external RabbitMQ instance)
    process.env.AMQP_URL = 'amqp://guest:guest@localhost:5672';
    process.env.CDC_EXCHANGE = 'banking-events-test';
    process.env.CDC_QUEUE = 'banking-queue-test';
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
    
    // Connect to postgres database to drop/create test database
    process.env.DB_NAME = 'postgres';
    
    let adminDatabase = DatabaseConnection.getInstance();
    
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
    let testClient = null;
    try {
      const address = process.env.TIGERBEETLE_ADDRESSES || '6000';
      testClient = createClient({
        cluster_id: BigInt(process.env.TIGERBEETLE_CLUSTER_ID || '0'),
        replica_addresses: [address],
      });
      
      // Test the connection
      await testClient.lookupAccounts([1n]);
      
      logger.debug('TigerBeetle is ready');
      return;
    } catch (error) {
      logger.debug(`TigerBeetle not ready, attempt ${i + 1}/${maxRetries}`, { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    } finally {
      // Clean up test client to avoid open handles
      if (testClient) {
        try {
          testClient = null;
        } catch (e) {
          // Ignore cleanup errors
        }
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