import express from 'express';
import { SystemAccountController } from '../../src/controllers/system-account.controller.js';
import { validateRequest, errorHandler } from '../../src/middleware/validation.js';
import { 
  SystemIdentifierParamSchema, 
  AccountTypeParamSchema 
} from '../../src/validation/schemas.js';
import { MockServiceContainer } from './mock-service-factory.js';

/**
 * Creates a mock Express app with system accounts endpoints
 * 
 * Uses mocked services instead of requiring the full Core API server
 * Provides the same endpoints that fast-system-accounts.test.ts needs
 */
export function createMockSystemAccountsApp(services: MockServiceContainer): express.Application {
  const app = express();
  
  // Configure middleware
  app.use(express.json());
  
  // Create controller with mock services
  const systemAccountController = new SystemAccountController(
    services.systemAccountConfigService as any
  );
  
  // Set up routes matching the real API
  
  // GET /api/system-accounts - Get all system accounts
  app.get(
    '/api/system-accounts',
    systemAccountController.getSystemAccounts.bind(systemAccountController),
  );
  
  // GET /api/system-accounts/validate - Validate configuration
  app.get(
    '/api/system-accounts/validate',
    systemAccountController.validateConfiguration.bind(systemAccountController),
  );
  
  // GET /api/system-accounts/type/:accountType - Get accounts by type
  app.get(
    '/api/system-accounts/type/:accountType',
    validateRequest(AccountTypeParamSchema, 'params'),
    systemAccountController.getSystemAccountsByType.bind(systemAccountController),
  );
  
  // GET /api/system-accounts/:systemIdentifier - Get specific account
  app.get(
    '/api/system-accounts/:systemIdentifier',
    validateRequest(SystemIdentifierParamSchema, 'params'),
    systemAccountController.getSystemAccount.bind(systemAccountController),
  );
  
  // Error handling middleware
  app.use(errorHandler);
  
  return app;
}