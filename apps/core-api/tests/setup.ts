import { loadTestEnvironment, initializeTestDatabase, cleanTestDatabase, waitForTigerBeetle } from './helpers/test-setup.js';
import { logger } from '@core-poc/core-services';

// Global test setup
beforeAll(async () => {
  try {
    logger.info('Setting up global test environment...');
    
    // Load test environment configuration
    loadTestEnvironment();
    
    // Wait for external services to be ready
    await waitForTigerBeetle();
    
    // Clean and initialize test database
    await cleanTestDatabase();
    
    logger.info('Global test environment setup complete');
  } catch (error) {
    logger.error('Failed to setup global test environment', { error });
    throw error;
  }
}, 30000); // 30 second timeout (much faster without containers)

// Global test teardown
afterAll(async () => {
  try {
    logger.info('Tearing down global test environment...');
    
    // Clean test database
    await cleanTestDatabase();
    
    logger.info('Global test environment teardown complete');
  } catch (error) {
    logger.error('Failed to teardown global test environment', { error });
  }
}, 10000); // 10 second timeout for cleanup