import { setupTestDatabase, teardownTestDatabase } from './helpers/test-database.js';
import { logger } from '@core-poc/core-services';

// Global test setup
beforeAll(async () => {
  try {
    logger.info('Setting up global test environment...');
    
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
    
    // Start test database container
    await setupTestDatabase();
    
    logger.info('Global test environment setup complete');
  } catch (error) {
    logger.error('Failed to setup global test environment', { error });
    throw error;
  }
}, 60000); // 60 second timeout for container startup

// Global test teardown
afterAll(async () => {
  try {
    logger.info('Tearing down global test environment...');
    
    // Stop test database container
    await teardownTestDatabase();
    
    logger.info('Global test environment teardown complete');
  } catch (error) {
    logger.error('Failed to teardown global test environment', { error });
  }
}, 30000); // 30 second timeout for container shutdown