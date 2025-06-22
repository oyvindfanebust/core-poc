import express from 'express';
import { BatchServiceFactory, BatchServiceContainer } from './services/factory.js';
import { logger } from '@core-poc/core-services';

let services: BatchServiceContainer;

async function createApp(): Promise<express.Application> {
  try {
    logger.info('Starting Batch Processor initialization...');

    // Initialize services
    services = await BatchServiceFactory.createServices();

    const app = express();
    app.use(express.json());

    // Health endpoint for monitoring
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'batch-processor',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Job status endpoint
    app.get('/status', (req, res) => {
      res.json({
        service: 'batch-processor',
        jobs: {
          paymentPlan: {
            running: services.paymentPlanJob ? 'active' : 'inactive',
          },
        },
        timestamp: new Date().toISOString(),
      });
    });

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
        method: req.method,
        availableEndpoints: {
          health: '/health',
          status: '/status',
        },
      });
    });

    // Start background jobs
    services.paymentPlanJob.startMonthlyJob();

    logger.info('Batch Processor initialized successfully', {
      endpoints: [
        'GET /health',
        'GET /status',
      ],
      jobs: [
        'PaymentPlanJob (started)',
      ],
    });
    
    return app;
  } catch (error) {
    console.error('Failed to initialize Batch Processor:', error);
    logger.error('Failed to initialize Batch Processor', { 
      error: error instanceof Error ? error.message : String(error), 
      stack: error instanceof Error ? error.stack : undefined 
    });
    throw error;
  }
}

// Graceful shutdown handler
async function gracefulShutdown(): Promise<void> {
  logger.info('Received shutdown signal, cleaning up Batch Processor...');
  
  try {
    await BatchServiceFactory.cleanup();
    logger.info('Batch Processor graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during Batch Processor shutdown', { error });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception in Batch Processor', { 
    error,
    message: error?.message || 'No error message',
    stack: error?.stack || 'No stack trace',
  });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection in Batch Processor', { 
    reason,
    reasonType: typeof reason,
    reasonMessage: (reason as Error)?.message || 'No reason message',
    reasonStack: (reason as Error)?.stack || 'No stack trace',
  });
  gracefulShutdown();
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = parseInt(process.env.BATCH_PROCESSOR_PORT || '7003');
  
  createApp().then(app => {
    app.listen(port, () => {
      logger.info('Banking Ledger Batch Processor started', {
        port,
        environment: process.env.NODE_ENV || 'development',
        health: `http://localhost:${port}/health`,
        status: `http://localhost:${port}/status`,
      });
    });
  }).catch(error => {
    console.error('Failed to start Batch Processor:', error);
    logger.error('Failed to start Batch Processor', { 
      error: error instanceof Error ? error.message : String(error), 
      stack: error instanceof Error ? error.stack : undefined 
    });
    process.exit(1);
  });
}

export default createApp;