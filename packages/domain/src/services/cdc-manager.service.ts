import { logger } from '@core-poc/core-services';

import { AuditEventHandler } from '../handlers/audit-event.handler.js';
import { BankingEventHandler } from '../handlers/banking-event.handler.js';

import { CDCService } from './cdc.service.js';

interface Config {
  cdc: {
    amqpUrl: string;
    exchange: string;
    queue: string;
    routingKeys: string[];
    autoAck: boolean;
  };
}

export class CDCManagerService {
  private cdcService: CDCService | null = null;
  private bankingHandler: BankingEventHandler;
  private auditHandler: AuditEventHandler;

  constructor(private readonly config: Config) {
    this.bankingHandler = new BankingEventHandler();
    this.auditHandler = new AuditEventHandler();
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing CDC Manager...');

      this.cdcService = new CDCService(this.config.cdc.amqpUrl, {
        exchange: this.config.cdc.exchange,
        queue: this.config.cdc.queue,
        routingKeys: this.config.cdc.routingKeys,
        autoAck: this.config.cdc.autoAck,
      });

      // Connect to RabbitMQ
      await this.cdcService.connect();

      // Register event handlers
      this.registerEventHandlers();

      // Start consuming events
      await this.cdcService.startConsuming();

      logger.info('CDC Manager initialized successfully', {
        exchange: this.config.cdc.exchange,
        queue: this.config.cdc.queue,
        routingKeys: this.config.cdc.routingKeys,
      });
    } catch (error) {
      logger.error('Failed to initialize CDC Manager', { error });
      throw error;
    }
  }

  private registerEventHandlers(): void {
    if (!this.cdcService) {
      throw new Error('CDC Service not initialized');
    }

    // Register audit handler for all events (wildcard)
    this.cdcService.registerHandler('*', this.auditHandler);

    // Register business logic handlers for specific event types
    this.cdcService.registerHandler('single_phase', this.bankingHandler);
    this.cdcService.registerHandler('two_phase_pending', this.bankingHandler);
    this.cdcService.registerHandler('two_phase_posted', this.bankingHandler);
    this.cdcService.registerHandler('two_phase_voided', this.bankingHandler);
    this.cdcService.registerHandler('two_phase_expired', this.bankingHandler);

    logger.info('CDC event handlers registered', {
      handlers: [
        'audit (all events)',
        'banking (single_phase)',
        'banking (two_phase_pending)',
        'banking (two_phase_posted)',
        'banking (two_phase_voided)',
        'banking (two_phase_expired)',
      ],
    });
  }

  async shutdown(): Promise<void> {
    if (!this.cdcService) {
      logger.info('CDC Service not initialized, nothing to shutdown');
      return;
    }

    try {
      logger.info('Shutting down CDC Manager...');
      await this.cdcService.disconnect();
      this.cdcService = null;
      logger.info('CDC Manager shutdown completed');
    } catch (error) {
      logger.error('Error shutting down CDC Manager', { error });
      throw error;
    }
  }

  get isConnected(): boolean {
    return this.cdcService?.connected ?? false;
  }

  // Method to get audit trail (exposed from audit handler)
  async getAuditTrail(filters: {
    transferId?: string;
    accountId?: string;
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
  }) {
    return await this.auditHandler.getAuditTrail(filters);
  }

  // Method to generate compliance reports
  async generateComplianceReport(accountId: string, period: { from: string; to: string }) {
    return await this.auditHandler.generateComplianceReport(accountId, period);
  }
}
