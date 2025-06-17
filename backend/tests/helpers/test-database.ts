import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabaseConnection } from '../../src/database/connection';
import { logger } from '../../src/utils/logger';

export class TestDatabase {
  private static instance: TestDatabase | null = null;
  private container: StartedPostgreSqlContainer | null = null;
  private connection: DatabaseConnection | null = null;
  private static containerPort: number;

  static async getInstance(): Promise<TestDatabase> {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
      await TestDatabase.instance.start();
    }
    return TestDatabase.instance;
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting test database container...');
      
      this.container = await new PostgreSqlContainer('postgres:15-alpine')
        .withDatabase('banking_poc_test')
        .withUsername('test_user')
        .withPassword('test_password')
        .withExposedPorts(5432)
        .withEnvironment({
          POSTGRES_HOST_AUTH_METHOD: 'trust'
        })
        .withTmpFs({ '/var/lib/postgresql/data': 'rw,noexec,nosuid,size=1024m' })
        .start();

      TestDatabase.containerPort = this.container.getMappedPort(5432);

      // Set environment variables for the test database
      process.env.DB_HOST = this.container.getHost();
      process.env.DB_PORT = TestDatabase.containerPort.toString();
      process.env.DB_NAME = 'banking_poc_test';
      process.env.DB_USER = 'test_user';
      process.env.DB_PASSWORD = 'test_password';

      logger.info('Test database container started', {
        host: this.container.getHost(),
        port: TestDatabase.containerPort,
        database: 'banking_poc_test',
      });

      // Reset database connection to use new environment variables
      DatabaseConnection.resetInstance();
      
      // Initialize connection with new environment variables
      this.connection = DatabaseConnection.getInstance();
      
      // Wait for database to be ready
      await this.waitForDatabase();
      
      logger.info('Test database ready for connections');
    } catch (error) {
      logger.error('Failed to start test database container', { error });
      throw error;
    }
  }

  private async waitForDatabase(maxRetries = 30, delayMs = 1000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (this.connection) {
          await this.connection.query('SELECT 1');
          return;
        }
      } catch (error) {
        logger.debug(`Database not ready, attempt ${i + 1}/${maxRetries}`, { error: error instanceof Error ? error.message : 'Unknown error' });
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error(`Database not ready after ${maxRetries} attempts`);
  }

  async stop(): Promise<void> {
    try {
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      if (this.container) {
        logger.info('Stopping test database container...');
        await this.container.stop();
        this.container = null;
        logger.info('Test database container stopped');
      }
    } catch (error) {
      logger.error('Failed to stop test database container', { error });
    }
  }

  getConnection(): DatabaseConnection {
    if (!this.connection) {
      throw new Error('Database connection not initialized');
    }
    return this.connection;
  }

  getConnectionConfig() {
    if (!this.container) {
      throw new Error('Database container not started');
    }

    return {
      host: this.container.getHost(),
      port: TestDatabase.containerPort,
      database: 'banking_poc_test',
      user: 'test_user',
      password: 'test_password',
    };
  }

  static async cleanup(): Promise<void> {
    if (TestDatabase.instance) {
      await TestDatabase.instance.stop();
      TestDatabase.instance = null;
    }
  }
}

// Global setup and teardown for Jest
export async function setupTestDatabase(): Promise<void> {
  await TestDatabase.getInstance();
}

export async function teardownTestDatabase(): Promise<void> {
  await TestDatabase.cleanup();
}