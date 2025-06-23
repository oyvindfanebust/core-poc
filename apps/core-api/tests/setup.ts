import { logger } from '@core-poc/core-services';

import { ServiceFactory, ServiceContainer } from '../src/services/factory.js';

import {
  loadTestEnvironment,
  initializeTestDatabase,
  cleanTestDatabase,
  waitForTigerBeetle,
} from './helpers/test-setup.js';

// Global test services - initialized once and reused
let globalTestServices: ServiceContainer | null = null;

// Global test setup
beforeAll(async () => {
  try {
    logger.info('Setting up global test environment...');

    // Load test environment configuration
    loadTestEnvironment();

    // Run service initialization in parallel to reduce setup time
    await Promise.all([waitForTigerBeetle(), cleanTestDatabase()]);

    // Create global test services once
    globalTestServices = await ServiceFactory.createTestServices();

    logger.info('Global test environment setup complete');
  } catch (error) {
    logger.error('Failed to setup global test environment', { error });
    throw error;
  }
}, 60000); // 60 second timeout - temporary fix for slow initialization

// Global test teardown
afterAll(async () => {
  try {
    logger.info('Tearing down global test environment...');

    // Cleanup global services
    if (globalTestServices) {
      await ServiceFactory.cleanup();
      globalTestServices = null;
    }

    // Clean test database
    await cleanTestDatabase();

    logger.info('Global test environment teardown complete');
  } catch (error) {
    logger.error('Failed to teardown global test environment', { error });
  }
}, 10000); // 10 second timeout for cleanup

// Export function to access global test services
export function getGlobalTestServices(): ServiceContainer {
  if (!globalTestServices) {
    throw new Error(
      'Global test services not initialized. Make sure global test setup has completed.',
    );
  }
  return globalTestServices;
}
