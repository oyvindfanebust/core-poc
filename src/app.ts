import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

// Add BigInt JSON serialization support
(BigInt.prototype as any).toJSON = function() {
  return this.toString();
};

import { ServiceFactory, ServiceContainer } from './services/factory.js';
import { AccountController } from './controllers/account.controller.js';
import { HealthController } from './controllers/health.controller.js';
import { MetricsController, metricsMiddleware } from './controllers/metrics.controller.js';
import { validateRequest, errorHandler, requestLogger } from './middleware/validation.js';
import { 
  CreateAccountSchema, 
  TransferSchema, 
  CreateInvoiceSchema,
  AccountIdParamSchema 
} from './validation/schemas.js';
import { specs } from './docs/swagger.js';
import { logger, httpLogStream } from './utils/logger.js';

let services: ServiceContainer;

async function createApp(): Promise<express.Application> {
  try {
    logger.info('Starting application initialization...');

    // Initialize services
    services = await ServiceFactory.createServices();

    // Create controllers
    const accountController = new AccountController(
      services.accountService,
      services.loanService,
      services.invoiceService
    );
    
    const healthController = new HealthController(services.database);
    const metricsController = new MetricsController();

    const app = express();

    // Global middleware
    app.use(helmet());
    app.use(cors());
    app.use(morgan('combined', { stream: httpLogStream }));
    app.use(express.json());
    app.use(requestLogger);
    app.use(metricsMiddleware);

    // API Documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Banking Ledger API Documentation',
    }));

    // Health and metrics endpoints (before auth/validation)
    app.get('/health', healthController.getHealth.bind(healthController));
    app.get('/health/ready', healthController.getReadiness.bind(healthController));
    app.get('/health/live', healthController.getLiveness.bind(healthController));
    app.get('/metrics', metricsController.getMetrics.bind(metricsController));
    app.get('/metrics/http', metricsController.getHttpMetrics.bind(metricsController));
    app.get('/metrics/prometheus', metricsController.getPrometheusMetrics.bind(metricsController));

    // Account routes with validation
    app.post('/accounts', 
      validateRequest(CreateAccountSchema),
      accountController.createAccount.bind(accountController)
    );
    
    app.get('/accounts/:accountId/balance', 
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getAccountBalance.bind(accountController)
    );

    // Transfer routes with validation
    app.post('/transfers', 
      validateRequest(TransferSchema),
      accountController.transfer.bind(accountController)
    );

    // Invoice routes with validation
    app.post('/invoices', 
      validateRequest(CreateInvoiceSchema),
      accountController.createInvoice.bind(accountController)
    );
    
    app.get('/accounts/:accountId/invoices', 
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getInvoices.bind(accountController)
    );

    // Payment plan routes
    app.get('/accounts/:accountId/payment-plan', 
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getPaymentPlan.bind(accountController)
    );
    
    app.get('/accounts/:accountId/amortization-schedule', 
      validateRequest(AccountIdParamSchema, 'params'),
      accountController.getAmortizationSchedule.bind(accountController)
    );

    // API info endpoint
    app.get('/api/info', (req, res) => {
      res.json({
        name: 'Banking Ledger API',
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
          invoices: '/invoices',
        },
      });
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Start background jobs
    services.paymentPlanJob.startMonthlyJob();
    services.invoiceJob.startOverdueJob();

    logger.info('Application initialized successfully', {
      routes: [
        'POST /accounts',
        'GET /accounts/:accountId/balance',
        'POST /transfers',
        'POST /invoices',
        'GET /accounts/:accountId/invoices',
        'GET /accounts/:accountId/payment-plan',
        'GET /accounts/:accountId/amortization-schedule',
        'GET /health',
        'GET /metrics',
        'GET /api-docs',
      ],
    });
    
    return app;
  } catch (error) {
    console.error('Failed to initialize application:', error);
    logger.error('Failed to initialize application', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    throw error;
  }
}

// Graceful shutdown handler
async function gracefulShutdown(): Promise<void> {
  logger.info('Received shutdown signal, cleaning up...');
  
  try {
    await ServiceFactory.cleanup();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { 
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
    }, {} as any)
  });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { 
    reason,
    reasonType: typeof reason,
    reasonMessage: (reason as Error)?.message || 'No reason message',
    reasonStack: (reason as Error)?.stack || 'No stack trace',
    promise: promise?.toString() || 'Cannot convert promise to string'
  });
  gracefulShutdown();
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.PORT || '3002');
  
  createApp().then(app => {
    app.listen(port, () => {
      logger.info('Banking Ledger API started', {
        port,
        environment: process.env.NODE_ENV || 'development',
        documentation: `http://localhost:${port}/api-docs`,
        health: `http://localhost:${port}/health`,
        metrics: `http://localhost:${port}/metrics`,
      });
    });
  }).catch(error => {
    console.error('Failed to start application:', error);
    logger.error('Failed to start application', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
    process.exit(1);
  });
}

export default createApp;
export { services };