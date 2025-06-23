/**
 * Mock CDCManagerService for testing
 *
 * Provides fast, synchronous event simulation without RabbitMQ dependencies.
 * Events are processed immediately and stored in-memory for test verification.
 *
 * Features:
 * - Synchronous event publishing and handling
 * - In-memory event storage and retrieval
 * - Event filtering by type
 * - Mock connection status management
 * - Test helper methods for verification
 */
export class MockCDCManagerService {
  private _isConnected = true;
  private eventHandlers = new Map<string, ((event: MockCDCEvent) => Promise<void>)[]>();
  private events: MockCDCEvent[] = [];

  async initialize(): Promise<void> {
    // Mock initialization - always succeeds quickly
    this._isConnected = true;
  }

  async shutdown(): Promise<void> {
    // Mock shutdown
    this._isConnected = false;
    this.eventHandlers.clear();
    this.events.length = 0;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  // Mock event publishing - events are stored and can be processed synchronously
  async publishEvent(event: MockCDCEvent): Promise<void> {
    this.events.push({
      ...event,
      timestamp: new Date(),
    });

    // Synchronously trigger any registered handlers
    const handlers = this.eventHandlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.warn('Mock CDC event handler error:', error);
      }
    }
  }

  // Register event handlers for testing
  onEvent(eventType: string, handler: (event: MockCDCEvent) => Promise<void>): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  // Helper methods for testing
  getEvents(): MockCDCEvent[] {
    return [...this.events];
  }

  getEventsByType(eventType: string): MockCDCEvent[] {
    return this.events.filter(event => event.type === eventType);
  }

  clearEvents(): void {
    this.events.length = 0;
  }

  getEventCount(): number {
    return this.events.length;
  }

  // Simulate transfer events for testing
  async simulateTransferEvent(
    transferId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: string,
    currency: string,
  ): Promise<void> {
    await this.publishEvent({
      type: 'transfer.created',
      data: {
        transfer_id: transferId,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        currency,
        description: 'Customer transfer',
        created_at: new Date().toISOString(),
      },
    });
  }
}

interface MockCDCEvent {
  type: string;
  data: any;
  timestamp?: Date;
}
