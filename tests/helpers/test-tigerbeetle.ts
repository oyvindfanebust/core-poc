import { createClient } from 'tigerbeetle-node';
import { logger } from '../../src/utils/logger.js';

export class TestTigerBeetle {
  private static instance: TestTigerBeetle | null = null;
  private client: any = null;
  private static readonly HOST = 'localhost';
  private static readonly PORT = 3001; // Port from docker-compose.test.yml

  static async getInstance(): Promise<TestTigerBeetle> {
    if (!TestTigerBeetle.instance) {
      TestTigerBeetle.instance = new TestTigerBeetle();
      await TestTigerBeetle.instance.start();
    }
    return TestTigerBeetle.instance;
  }

  async start(): Promise<void> {
    try {
      logger.info('Connecting to external TigerBeetle container...');
      
      // Set environment variables for the test TigerBeetle
      process.env.TIGERBEETLE_HOST = TestTigerBeetle.HOST;
      process.env.TIGERBEETLE_PORT = TestTigerBeetle.PORT.toString();
      process.env.TIGERBEETLE_ADDRESSES = TestTigerBeetle.PORT.toString();

      logger.info('Test TigerBeetle connection configured', {
        host: TestTigerBeetle.HOST,
        port: TestTigerBeetle.PORT,
        address: `${TestTigerBeetle.HOST}:${TestTigerBeetle.PORT}`,
      });

      // Wait for TigerBeetle to be ready
      await this.waitForTigerBeetle();
      
      logger.info('Test TigerBeetle ready for connections');
    } catch (error) {
      logger.error('Failed to connect to test TigerBeetle container', { error });
      throw error;
    }
  }

  private async waitForTigerBeetle(maxRetries = 30, delayMs = 1000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to create a client connection (TigerBeetle expects just port for localhost)
        const address = TestTigerBeetle.PORT.toString();
        this.client = createClient({
          cluster_id: 0n,
          replica_addresses: [address],
        });
        
        // Test the connection by trying to lookup a non-existent account
        await this.client.lookupAccounts([1n]);
        return;
      } catch (error) {
        if (this.client) {
          this.client = null;
        }
        
        logger.debug(`TigerBeetle not ready, attempt ${i + 1}/${maxRetries}`, { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(`TigerBeetle not ready after ${maxRetries} attempts`);
  }

  async stop(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      
      logger.info('TigerBeetle connection closed (external container remains running)');
    } catch (error) {
      logger.error('Failed to close TigerBeetle connection', { error });
    }
  }

  getClient(): any {
    if (!this.client) {
      // Create client if not exists (TigerBeetle expects just port for localhost)
      const address = TestTigerBeetle.PORT.toString();
      this.client = createClient({
        cluster_id: 0n,
        replica_addresses: [address],
      });
    }
    return this.client;
  }

  getConnectionConfig() {
    return {
      host: TestTigerBeetle.HOST,
      port: TestTigerBeetle.PORT,
      address: `${TestTigerBeetle.HOST}:${TestTigerBeetle.PORT}`,
    };
  }

  static async cleanup(): Promise<void> {
    if (TestTigerBeetle.instance) {
      await TestTigerBeetle.instance.stop();
      TestTigerBeetle.instance = null;
    }
  }
}

// Global setup and teardown for Jest
export async function setupTestTigerBeetle(): Promise<void> {
  // Note: This assumes TigerBeetle container is already running via Docker Compose
  // Run: docker-compose -f docker-compose.test.yml up -d tigerbeetle-test
  await TestTigerBeetle.getInstance();
}

export async function teardownTestTigerBeetle(): Promise<void> {
  // Note: This only closes connections, doesn't stop the external container
  await TestTigerBeetle.cleanup();
}