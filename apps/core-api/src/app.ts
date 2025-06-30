import { logger, httpLogStream } from '@core-poc/core-services';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

// Add BigInt JSON serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import { AccountController } from './controllers/account.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { LoanFundingController } from './controllers/loan-funding.controller.js';
import { MetricsController, metricsMiddleware } from './controllers/metrics.controller.js';
import { SEPAController } from './controllers/sepa.controller.js';
import { SystemAccountController } from './controllers/system-account.controller.js';
import { specs } from './docs/swagger.js';
import { validateRequest, errorHandler, requestLogger } from './middleware/validation.js';
import { ServiceFactory, ServiceContainer } from './services/factory.js';
import {
  CreateAccountSchema,
  TransferSchema,
  AccountIdParamSchema,
  CustomerIdParamSchema,
  UpdateAccountNameSchema,
  SystemIdentifierParamSchema,
  AccountTypeParamSchema,
  SEPATransferRequestSchema,
  SEPACurrencyParamSchema,
  LoanDisbursementSchema,
  LoanIdParamSchema,
} from './validation/schemas.js';

let services: ServiceContainer;

async function createApp(): Promise<express.Application> {
  try {
    logger.info('Starting Core API initialization...');

    // Initialize services
    services = await ServiceFactory.createServices();

    // Create controllers
    const accountController = new AccountController(
      services.accountService,
      services.loanService,
      services.transferRepository,
    );

    const healthController = new HealthController(services.database, services.cdcManager);
    const metricsController = new MetricsController();
    const systemAccountController = new SystemAccountController(
      services.systemAccountConfigService,
    );

    const sepaController = new SEPAController(
      services.accountService,
      services.sepaAccountService,
      services.tigerBeetleService,
    );

    const loanFundingController = new LoanFundingController(services.loanService);

    const app = express();

    // Global middleware
    app.use(helmet());
    app.use(
      cors({
        origin: ['http://localhost:7002', 'http://localhost:7005', 'http://localhost:7006'], // Allow customer frontend, admin frontend, and SEPA mock service
        credentials: true,
      }),
    );
    app.use(morgan('combined', { stream: httpLogStream }));
    app.use(express.json());
    app.use(requestLogger);
    app.use(metricsMiddleware);

    // API Documentation
    app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(specs, {
        explorer: true,
        customCss: '.swagger-ui .topbar { display: none }',
        customSiteTitle: 'Banking Ledger API Documentation',
      }),
    );

    // Health and metrics endpoints (before auth/validation)
    app.get('/health', healthController.getHealth.bind(healthController));
    app.get('/health/ready', healthController.getReadiness.bind(healthController));
    app.get('/health/live', healthController.getLiveness.bind(healthController));
    app.get('/metrics', metricsController.getMetrics.bind(metricsController));
    app.get('/metrics/http', metricsController.getHttpMetrics.bind(metricsController));
    app.get('/metrics/prometheus', metricsController.getPrometheusMetrics.bind(metricsController));

    // Account routes with validation
    app.post(
      '/accounts',
      validateRequest(CreateAccountSchema),
      accountController.createAccount.bind(accountController),
    );

    app.get(
      '/accounts/:accountId/balance',
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getAccountBalance.bind(accountController),
    );

    app.get(
      '/accounts/:accountId/transactions',
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getAccountTransactions.bind(accountController),
    );

    app.patch(
      '/accounts/:accountId/name',
      validateRequest(AccountIdParamSchema, 'params'),
      validateRequest(UpdateAccountNameSchema),
      accountController.updateAccountName.bind(accountController),
    );

    // Transfer routes with validation
    app.post(
      '/transfers',
      validateRequest(TransferSchema),
      accountController.transfer.bind(accountController),
    );

    // Payment plan routes
    app.get(
      '/accounts/:accountId/payment-plan',
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getPaymentPlan.bind(accountController),
    );

    app.get(
      '/accounts/:accountId/amortization-schedule',
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getAmortizationSchedule.bind(accountController),
    );

    // Customer accounts route
    app.get(
      '/customers/:customerId/accounts',
      validateRequest(CustomerIdParamSchema, 'params'),
      accountController.getAccountsByCustomer.bind(accountController),
    );

    // System account routes (specific routes before parameterized ones)
    app.get(
      '/api/system-accounts',
      systemAccountController.getSystemAccounts.bind(systemAccountController),
    );

    app.get(
      '/api/system-accounts/validate',
      systemAccountController.validateConfiguration.bind(systemAccountController),
    );

    app.get(
      '/api/system-accounts/type/:accountType',
      validateRequest(AccountTypeParamSchema, 'params'),
      systemAccountController.getSystemAccountsByType.bind(systemAccountController),
    );

    app.get(
      '/api/system-accounts/:systemIdentifier',
      validateRequest(SystemIdentifierParamSchema, 'params'),
      systemAccountController.getSystemAccount.bind(systemAccountController),
    );

    // SEPA routes
    app.post(
      '/sepa/transfers/outgoing',
      validateRequest(SEPATransferRequestSchema),
      sepaController.createOutgoingTransfer.bind(sepaController),
    );

    app.post(
      '/sepa/transfers/incoming',
      validateRequest(SEPATransferRequestSchema),
      sepaController.createIncomingTransfer.bind(sepaController),
    );

    app.get('/sepa/status', sepaController.getStatus.bind(sepaController));

    app.get(
      '/sepa/suspense/:currency',
      validateRequest(SEPACurrencyParamSchema, 'params'),
      sepaController.getSuspenseBalances.bind(sepaController),
    );

    // Loan funding routes
    app.post(
      '/api/v1/loans/:loanId/disburse',
      validateRequest(LoanIdParamSchema, 'params'),
      validateRequest(LoanDisbursementSchema),
      loanFundingController.disburseLoan.bind(loanFundingController),
    );

    app.get(
      '/api/v1/loans/:loanId/funding-status',
      validateRequest(LoanIdParamSchema, 'params'),
      loanFundingController.getFundingStatus.bind(loanFundingController),
    );

    // API info endpoint
    app.get('/api/info', (req, res) => {
      res.json({
        name: 'Banking Ledger Core API',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        documentation: '/api-docs',
        health: '/health',
        metrics: '/metrics',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler for undefined routes
    app.use((req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: {
          documentation: '/api-docs',
          health: '/health',
          metrics: '/metrics',
          accounts: '/accounts',
          transfers: '/transfers',
          systemAccounts: '/api/system-accounts',
          sepa: '/sepa',
          loanFunding: '/api/v1/loans',
        },
      });
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    logger.info('Core API initialized successfully', {
      routes: [
        'POST /accounts',
        'GET /accounts/:accountId/balance',
        'GET /accounts/:accountId/transactions',
        'POST /transfers',
        'GET /accounts/:accountId/payment-plan',
        'GET /accounts/:accountId/amortization-schedule',
        'GET /customers/:customerId/accounts',
        'GET /api/system-accounts',
        'GET /api/system-accounts/:systemIdentifier',
        'GET /api/system-accounts/type/:accountType',
        'GET /api/system-accounts/validate',
        'POST /sepa/transfers/outgoing',
        'POST /sepa/transfers/incoming',
        'GET /sepa/status',
        'GET /sepa/suspense/:currency',
        'POST /api/v1/loans/:loanId/disburse',
        'GET /api/v1/loans/:loanId/funding-status',
        'GET /health',
        'GET /metrics',
        'GET /api-docs',
      ],
    });

    return app;
  } catch (error) {
    console.error('Failed to initialize Core API:', error);
    logger.error('Failed to initialize Core API', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

// Graceful shutdown handler
async function gracefulShutdown(): Promise<void> {
  logger.info('Received shutdown signal, cleaning up Core API...');

  try {
    await ServiceFactory.cleanup();
    logger.info('Core API graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during Core API shutdown', { error });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught exception in Core API', {
    error,
    message: error?.message || 'No error message',
    stack: error?.stack || 'No stack trace',
    name: error?.name || 'Unknown error type',
    toString: error?.toString() || 'Cannot convert to string',
    errorType: typeof error,
    errorConstructor: error?.constructor?.name || 'Unknown constructor',
    // Log all enumerable properties
    errorProps: Object.getOwnPropertyNames(error).reduce((acc, key) => {
      try {
        acc[key] = (error as any)[key];
      } catch (e) {
        acc[key] = `[Error accessing property: ${(e as Error)?.message || 'Unknown error'}]`;
      }
      return acc;
    }, {} as any),
  });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in Core API', {
    reason,
    reasonType: typeof reason,
    reasonMessage: (reason as Error)?.message || 'No reason message',
    reasonStack: (reason as Error)?.stack || 'No stack trace',
    promise: promise?.toString() || 'Cannot convert promise to string',
  });
  gracefulShutdown();
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '7001');

  createApp()
    .then(app => {
      app.listen(port, () => {
        logger.info('Banking Ledger Core API started', {
          port,
          environment: process.env.NODE_ENV || 'development',
          documentation: `http://localhost:${port}/api-docs`,
          health: `http://localhost:${port}/health`,
          metrics: `http://localhost:${port}/metrics`,
        });
      });
    })
    .catch(error => {
      console.error('Failed to start Core API:', error);
      logger.error('Failed to start Core API', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    });
}

export default createApp;
export { services };
