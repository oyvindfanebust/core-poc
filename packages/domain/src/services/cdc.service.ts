import * as amqp from 'amqplib';
import { logger, TransferEvent, CDCEventHandler, EventHandlerConfig } from '@core-poc/core-services';

export class CDCService {
  private connection: any | null = null;
  private channel: any | null = null;
  private handlers = new Map<string, CDCEventHandler>();
  private isConnected = false;

  constructor(
    private readonly amqpUrl: string,
    private readonly config: EventHandlerConfig
  ) {}

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(this.amqpUrl);
      if (!this.connection) {
        throw new Error('Failed to establish connection to RabbitMQ');
      }
      
      this.channel = await this.connection.createChannel();
      if (!this.channel) {
        throw new Error('Failed to create channel');
      }

      // Ensure exchange exists
      await this.channel.assertExchange(this.config.exchange, 'topic', { durable: true });

      // Create queue if specified
      if (this.config.queue) {
        await this.channel.assertQueue(this.config.queue, { durable: true });
        
        // Bind routing keys
        for (const routingKey of this.config.routingKeys) {
          await this.channel.bindQueue(this.config.queue, this.config.exchange, routingKey);
        }
      }

      this.isConnected = true;
      logger.info('CDC Service connected to RabbitMQ', {
        exchange: this.config.exchange,
        routingKeys: this.config.routingKeys
      });

      // Handle connection events
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));

    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      logger.info('CDC Service disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error disconnecting from RabbitMQ', { error });
    }
  }

  registerHandler(eventType: string, handler: CDCEventHandler): void {
    this.handlers.set(eventType, handler);
    logger.info('Registered CDC event handler', { eventType });
  }

  async startConsuming(): Promise<void> {
    if (!this.channel || !this.config.queue) {
      throw new Error('CDC Service not properly initialized');
    }

    await this.channel.consume(
      this.config.queue,
      this.handleMessage.bind(this),
      { noAck: this.config.autoAck ?? false }
    );

    logger.info('CDC Service started consuming events', { 
      queue: this.config.queue,
      exchange: this.config.exchange,
      routingKeys: this.config.routingKeys,
      autoAck: this.config.autoAck
    });
  }

  private async handleMessage(msg: any | null): Promise<void> {
    if (!msg || !this.channel) {
      logger.warn('Received null message or no channel available', { 
        hasMessage: !!msg, 
        hasChannel: !!this.channel 
      });
      return;
    }

    try {
      logger.info('CDC message received', { 
        routingKey: msg.fields?.routingKey,
        messageId: msg.properties?.messageId,
        contentLength: msg.content?.length
      });

      const content = msg.content.toString();
      
      const event: TransferEvent = JSON.parse(content);
      
      logger.info('Received CDC event', {
        type: event.type,
        transferId: event.transfer.id,
        timestamp: event.timestamp,
        debitAccountId: event.debit_account.id,
        creditAccountId: event.credit_account.id,
        amount: event.transfer.amount
      });

      // Process event with all matching handlers
      const promises: Promise<void>[] = [];

      // Handle by specific event type
      const specificHandler = this.handlers.get(event.type);
      if (specificHandler) {
        promises.push(specificHandler.handleTransferEvent(event));
      }

      // Handle by wildcard handler
      const wildcardHandler = this.handlers.get('*');
      if (wildcardHandler) {
        promises.push(wildcardHandler.handleTransferEvent(event));
      }

      await Promise.all(promises);

      // Acknowledge message if not auto-ack
      if (!this.config.autoAck) {
        this.channel.ack(msg);
      }

    } catch (error) {
      logger.error('Error processing CDC event', { 
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error,
        messageId: msg.properties?.messageId,
        routingKey: msg.fields?.routingKey
      });

      // Reject message and requeue for retry
      if (!this.config.autoAck && this.channel) {
        this.channel.nack(msg, false, true);
      }
    }
  }

  private handleConnectionError(error: Error): void {
    logger.error('RabbitMQ connection error', { error });
    this.isConnected = false;
  }

  private handleConnectionClose(): void {
    logger.warn('RabbitMQ connection closed');
    this.isConnected = false;
    
    // Attempt to reconnect after delay
    setTimeout(() => {
      if (!this.isConnected) {
        this.reconnect();
      }
    }, 5000);
  }

  private async reconnect(): Promise<void> {
    try {
      logger.info('Attempting to reconnect to RabbitMQ...');
      await this.connect();
      await this.startConsuming();
    } catch (error) {
      logger.error('Failed to reconnect to RabbitMQ', { error });
      // Try again after delay
      setTimeout(() => this.reconnect(), 10000);
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}