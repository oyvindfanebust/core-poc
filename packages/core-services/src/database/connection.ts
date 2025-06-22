import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger.js';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    const config: PoolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'banking_poc',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: parseInt(process.env.DB_POOL_SIZE || '10'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    };

    this.pool = new Pool(config);

    this.pool.on('error', (err) => {
      logger.error('Database pool error', { error: err });
    });

    this.pool.on('connect', () => {
      logger.debug('New database connection established');
    });
  }

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  static resetInstance(): void {
    if (DatabaseConnection.instance) {
      DatabaseConnection.instance.pool.end().catch(() => {
        // Ignore errors during cleanup
      });
    }
    DatabaseConnection.instance = null as any;
  }

  getPool(): Pool {
    return this.pool;
  }

  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text,
        duration,
        rows: result.rowCount,
      });
      
      return result;
    } catch (error) {
      logger.error('Database query failed', {
        query: text,
        params,
        error: error,
      });
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database connection pool closed');
  }

  async initializeSchema(): Promise<void> {
    logger.info('Initializing database schema...');
    
    try {
      const { MigrationRunner } = await import('./migrations.js');
      const migrationRunner = new MigrationRunner(this);
      await migrationRunner.runMigrations();
      
      logger.info('Database schema initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize database schema', { error });
      throw error;
    }
  }
}