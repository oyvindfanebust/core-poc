import { DatabaseConnection } from './connection.js';
import { logger } from '../utils/logger.js';

export interface Migration {
  id: string;
  name: string;
  up: (db: DatabaseConnection) => Promise<void>;
  down: (db: DatabaseConnection) => Promise<void>;
}

export class MigrationRunner {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migrations...');
      
      // Ensure migrations table exists
      await this.ensureMigrationsTable();
      
      const migrations = this.getMigrations();
      const appliedMigrations = await this.getAppliedMigrations();
      
      const pendingMigrations = migrations.filter(
        migration => !appliedMigrations.includes(migration.id)
      );
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }
      
      logger.info(`Running ${pendingMigrations.length} pending migrations...`);
      
      for (const migration of pendingMigrations) {
        await this.runMigration(migration);
      }
      
      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', { error });
      throw error;
    }
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    try {
      logger.info(`Rolling back migration: ${migrationId}`);
      
      const migrations = this.getMigrations();
      const migration = migrations.find(m => m.id === migrationId);
      
      if (!migration) {
        throw new Error(`Migration not found: ${migrationId}`);
      }
      
      const appliedMigrations = await this.getAppliedMigrations();
      if (!appliedMigrations.includes(migrationId)) {
        throw new Error(`Migration not applied: ${migrationId}`);
      }
      
      await migration.down(this.db);
      await this.removeMigrationRecord(migrationId);
      
      logger.info(`Migration rolled back successfully: ${migrationId}`);
    } catch (error) {
      logger.error('Migration rollback failed', { migrationId, error });
      throw error;
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const result = await this.db.query('SELECT id FROM migrations ORDER BY applied_at');
    return result.rows.map(row => row.id);
  }

  private async runMigration(migration: Migration): Promise<void> {
    try {
      logger.info(`Running migration: ${migration.name}`);
      
      await migration.up(this.db);
      await this.recordMigration(migration);
      
      logger.info(`Migration completed: ${migration.name}`);
    } catch (error) {
      logger.error(`Migration failed: ${migration.name}`, { error });
      throw error;
    }
  }

  private async recordMigration(migration: Migration): Promise<void> {
    await this.db.query(
      'INSERT INTO migrations (id, name) VALUES ($1, $2)',
      [migration.id, migration.name]
    );
  }

  private async removeMigrationRecord(migrationId: string): Promise<void> {
    await this.db.query('DELETE FROM migrations WHERE id = $1', [migrationId]);
  }

  private getMigrations(): Migration[] {
    return [
      {
        id: '001_initial_schema',
        name: 'Create initial database schema',
        up: async (db: DatabaseConnection) => {
          // Create payment plans table
          await db.query(`
            CREATE TABLE IF NOT EXISTS payment_plans (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              account_id BIGINT NOT NULL,
              principal_amount BIGINT NOT NULL,
              interest_rate DECIMAL(5,2) NOT NULL,
              term_months INTEGER NOT NULL,
              monthly_payment BIGINT NOT NULL,
              remaining_payments INTEGER NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(account_id)
            )
          `);

          // Create invoices table
          await db.query(`
            CREATE TABLE IF NOT EXISTS invoices (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              account_id BIGINT NOT NULL,
              amount BIGINT NOT NULL,
              due_date DATE NOT NULL,
              status VARCHAR(20) DEFAULT 'pending',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Create indexes
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_payment_plans_account_id ON payment_plans(account_id)
          `);
          
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_invoices_account_id ON invoices(account_id)
          `);
          
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
          `);
          
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)
          `);
        },
        down: async (db: DatabaseConnection) => {
          await db.query('DROP TABLE IF EXISTS payment_plans CASCADE');
          await db.query('DROP TABLE IF EXISTS invoices CASCADE');
        },
      },
      {
        id: '002_add_audit_fields',
        name: 'Add audit fields to tables',
        up: async (db: DatabaseConnection) => {
          // Add audit fields to payment_plans if they don't exist
          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='created_by') THEN
                ALTER TABLE payment_plans ADD COLUMN created_by VARCHAR(255);
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='updated_by') THEN
                ALTER TABLE payment_plans ADD COLUMN updated_by VARCHAR(255);
              END IF;
            END $$;
          `);

          // Add audit fields to invoices if they don't exist
          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='created_by') THEN
                ALTER TABLE invoices ADD COLUMN created_by VARCHAR(255);
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='updated_by') THEN
                ALTER TABLE invoices ADD COLUMN updated_by VARCHAR(255);
              END IF;
            END $$;
          `);
        },
        down: async (db: DatabaseConnection) => {
          await db.query('ALTER TABLE payment_plans DROP COLUMN IF EXISTS created_by');
          await db.query('ALTER TABLE payment_plans DROP COLUMN IF EXISTS updated_by');
          await db.query('ALTER TABLE invoices DROP COLUMN IF EXISTS created_by');
          await db.query('ALTER TABLE invoices DROP COLUMN IF EXISTS updated_by');
        },
      },
      {
        id: '005_fix_account_id_bigint_overflow',
        name: 'Change account_id columns from BIGINT to TEXT for large TigerBeetle IDs',
        up: async (db: DatabaseConnection) => {
          // Change account_id column type in payment_plans table
          await db.query(`
            ALTER TABLE payment_plans 
            ALTER COLUMN account_id TYPE TEXT 
            USING account_id::TEXT
          `);

          // Change account_id column type in invoices table
          await db.query(`
            ALTER TABLE invoices 
            ALTER COLUMN account_id TYPE TEXT 
            USING account_id::TEXT
          `);
        },
        down: async (db: DatabaseConnection) => {
          // Revert account_id column type back to BIGINT
          await db.query(`
            ALTER TABLE payment_plans 
            ALTER COLUMN account_id TYPE BIGINT 
            USING account_id::BIGINT
          `);

          await db.query(`
            ALTER TABLE invoices 
            ALTER COLUMN account_id TYPE BIGINT 
            USING account_id::BIGINT
          `);
        },
      },
    ];
  }
}