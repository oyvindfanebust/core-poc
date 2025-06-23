import { logger } from '../utils/logger.js';

import { DatabaseConnection } from './connection.js';

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
        migration => !appliedMigrations.includes(migration.id),
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
    await this.db.query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [
      migration.id,
      migration.name,
    ]);
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
      {
        id: '006_enhance_payment_plans',
        name: 'Add loan type, payment frequency, fees, and total loan amount to payment plans',
        up: async (db: DatabaseConnection) => {
          // Add new fields to payment_plans table
          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='loan_type') THEN
                ALTER TABLE payment_plans ADD COLUMN loan_type VARCHAR(20) DEFAULT 'ANNUITY';
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='payment_frequency') THEN
                ALTER TABLE payment_plans ADD COLUMN payment_frequency VARCHAR(20) DEFAULT 'MONTHLY';
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='fees') THEN
                ALTER TABLE payment_plans ADD COLUMN fees JSONB DEFAULT '[]'::jsonb;
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='total_loan_amount') THEN
                ALTER TABLE payment_plans ADD COLUMN total_loan_amount BIGINT;
              END IF;
            END $$;
          `);

          // Update existing records with default values
          await db.query(`
            UPDATE payment_plans 
            SET total_loan_amount = principal_amount 
            WHERE total_loan_amount IS NULL
          `);

          // Add constraints
          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='chk_loan_type') THEN
                ALTER TABLE payment_plans ADD CONSTRAINT chk_loan_type CHECK (loan_type IN ('ANNUITY', 'SERIAL'));
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='chk_payment_frequency') THEN
                ALTER TABLE payment_plans ADD CONSTRAINT chk_payment_frequency CHECK (payment_frequency IN ('WEEKLY', 'BI_WEEKLY', 'MONTHLY'));
              END IF;
            END $$;
          `);
        },
        down: async (db: DatabaseConnection) => {
          await db.query('ALTER TABLE payment_plans DROP COLUMN IF EXISTS loan_type');
          await db.query('ALTER TABLE payment_plans DROP COLUMN IF EXISTS payment_frequency');
          await db.query('ALTER TABLE payment_plans DROP COLUMN IF EXISTS fees');
          await db.query('ALTER TABLE payment_plans DROP COLUMN IF EXISTS total_loan_amount');
        },
      },
      {
        id: '007_add_payment_schedule_tracking',
        name: 'Add next payment date and customer ID to payment plans',
        up: async (db: DatabaseConnection) => {
          // Add new fields to payment_plans table
          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='next_payment_date') THEN
                ALTER TABLE payment_plans ADD COLUMN next_payment_date DATE;
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payment_plans' AND column_name='customer_id') THEN
                ALTER TABLE payment_plans ADD COLUMN customer_id VARCHAR(8);
              END IF;
            END $$;
          `);

          // Set default next payment date for existing records (30 days from now)
          await db.query(`
            UPDATE payment_plans 
            SET next_payment_date = CURRENT_DATE + INTERVAL '30 days'
            WHERE next_payment_date IS NULL AND remaining_payments > 0
          `);
        },
        down: async (db: DatabaseConnection) => {
          await db.query('ALTER TABLE payment_plans DROP COLUMN IF EXISTS next_payment_date');
          await db.query('ALTER TABLE payment_plans DROP COLUMN IF EXISTS customer_id');
        },
      },
      {
        id: '008_create_accounts_metadata',
        name: 'Create accounts metadata table for customer-account relationships',
        up: async (db: DatabaseConnection) => {
          // Create accounts table to track customer-account relationships
          await db.query(`
            CREATE TABLE IF NOT EXISTS accounts (
              account_id TEXT PRIMARY KEY,
              customer_id VARCHAR(8) NOT NULL,
              account_type VARCHAR(20) NOT NULL,
              currency VARCHAR(3) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);

          // Create indexes for efficient lookups
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON accounts(customer_id)
          `);

          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type)
          `);

          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_accounts_customer_type ON accounts(customer_id, account_type)
          `);

          // Add constraints
          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='chk_account_type') THEN
                ALTER TABLE accounts ADD CONSTRAINT chk_account_type CHECK (account_type IN ('DEPOSIT', 'LOAN', 'CREDIT'));
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='chk_currency') THEN
                ALTER TABLE accounts ADD CONSTRAINT chk_currency CHECK (currency IN ('USD', 'EUR', 'NOK'));
              END IF;
            END $$;
          `);
        },
        down: async (db: DatabaseConnection) => {
          await db.query('DROP TABLE IF EXISTS accounts');
        },
      },
      {
        id: '009_update_constraints_for_realistic_values',
        name: 'Update constraints to support more realistic values',
        up: async (db: DatabaseConnection) => {
          // Update customer_id column to support longer customer IDs
          await db.query(`
            ALTER TABLE accounts 
            ALTER COLUMN customer_id TYPE VARCHAR(50)
          `);

          await db.query(`
            ALTER TABLE payment_plans 
            ALTER COLUMN customer_id TYPE VARCHAR(50)
          `);

          // Drop old currency constraint and add new one with more currencies
          await db.query(`
            ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_currency
          `);

          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='chk_currency_updated') THEN
                ALTER TABLE accounts ADD CONSTRAINT chk_currency_updated CHECK (currency IN ('USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK', 'JPY', 'CAD', 'AUD', 'CHF'));
              END IF;
            END $$;
          `);

          // Drop old payment frequency constraint and add new one
          await db.query(`
            ALTER TABLE payment_plans DROP CONSTRAINT IF EXISTS chk_payment_frequency
          `);

          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='chk_payment_frequency_updated') THEN
                ALTER TABLE payment_plans ADD CONSTRAINT chk_payment_frequency_updated CHECK (payment_frequency IN ('WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'QUARTERLY', 'SEMI_ANNUALLY', 'ANNUALLY'));
              END IF;
            END $$;
          `);
        },
        down: async (db: DatabaseConnection) => {
          // Revert customer_id back to VARCHAR(8)
          await db.query(`
            ALTER TABLE accounts 
            ALTER COLUMN customer_id TYPE VARCHAR(8)
          `);

          await db.query(`
            ALTER TABLE payment_plans 
            ALTER COLUMN customer_id TYPE VARCHAR(8)
          `);

          // Revert constraints
          await db.query(`
            ALTER TABLE accounts DROP CONSTRAINT IF EXISTS chk_currency_updated
          `);

          await db.query(`
            ALTER TABLE accounts ADD CONSTRAINT chk_currency CHECK (currency IN ('USD', 'EUR', 'NOK'))
          `);

          await db.query(`
            ALTER TABLE payment_plans DROP CONSTRAINT IF EXISTS chk_payment_frequency_updated
          `);

          await db.query(`
            ALTER TABLE payment_plans ADD CONSTRAINT chk_payment_frequency CHECK (payment_frequency IN ('WEEKLY', 'BI_WEEKLY', 'MONTHLY'))
          `);
        },
      },
      {
        id: '010_add_account_name',
        name: 'Add account_name column for user-friendly account nicknames',
        up: async (db: DatabaseConnection) => {
          // Add account_name column to accounts table
          await db.query(`
            DO $$ 
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='accounts' AND column_name='account_name') THEN
                ALTER TABLE accounts ADD COLUMN account_name VARCHAR(100);
              END IF;
            END $$;
          `);

          // Add index for account name searches
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(account_name)
          `);
        },
        down: async (db: DatabaseConnection) => {
          await db.query('ALTER TABLE accounts DROP COLUMN IF EXISTS account_name');
        },
      },
      {
        id: '011_create_transfers_table',
        name: 'Create transfers table for transaction history',
        up: async (db: DatabaseConnection) => {
          await db.query(`
            CREATE TABLE IF NOT EXISTS transfers (
              transfer_id VARCHAR(20) PRIMARY KEY,
              from_account_id VARCHAR(20) NOT NULL,
              to_account_id VARCHAR(20) NOT NULL,
              amount BIGINT NOT NULL,
              currency VARCHAR(3) NOT NULL,
              description VARCHAR(500),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (from_account_id) REFERENCES accounts(account_id),
              FOREIGN KEY (to_account_id) REFERENCES accounts(account_id)
            )
          `);

          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_transfers_from_account ON transfers(from_account_id, created_at DESC)
          `);

          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_transfers_to_account ON transfers(to_account_id, created_at DESC)
          `);

          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_transfers_created ON transfers(created_at DESC)
          `);
        },
        down: async (db: DatabaseConnection) => {
          await db.query('DROP TABLE IF EXISTS transfers');
        },
      },
      {
        id: '012_remove_invoices_table',
        name: 'Remove invoices table and related functionality',
        up: async (db: DatabaseConnection) => {
          // Drop invoices table and all its indexes
          await db.query('DROP TABLE IF EXISTS invoices CASCADE');
        },
        down: async (db: DatabaseConnection) => {
          // Recreate invoices table if needed (for rollback)
          await db.query(`
            CREATE TABLE IF NOT EXISTS invoices (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              account_id TEXT NOT NULL,
              amount BIGINT NOT NULL,
              due_date DATE NOT NULL,
              status VARCHAR(20) DEFAULT 'pending',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              created_by VARCHAR(255),
              updated_by VARCHAR(255)
            )
          `);

          // Recreate indexes
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
      },
      {
        id: '013_fix_transfer_id_lengths',
        name: 'Increase transfer_id and account_id column lengths for TigerBeetle IDs',
        up: async (db: DatabaseConnection) => {
          // TigerBeetle generates 34-character IDs, but transfers table was created with VARCHAR(20)
          // This causes "22001: value too long for type character varying(20)" errors

          // Increase transfer_id column length
          await db.query(`
            ALTER TABLE transfers 
            ALTER COLUMN transfer_id TYPE VARCHAR(50)
          `);

          // Increase from_account_id and to_account_id column lengths
          await db.query(`
            ALTER TABLE transfers 
            ALTER COLUMN from_account_id TYPE VARCHAR(50)
          `);

          await db.query(`
            ALTER TABLE transfers 
            ALTER COLUMN to_account_id TYPE VARCHAR(50)
          `);
        },
        down: async (db: DatabaseConnection) => {
          // Revert back to VARCHAR(20) - this might fail if there are existing long IDs
          await db.query(`
            ALTER TABLE transfers 
            ALTER COLUMN transfer_id TYPE VARCHAR(20)
          `);

          await db.query(`
            ALTER TABLE transfers 
            ALTER COLUMN from_account_id TYPE VARCHAR(20)
          `);

          await db.query(`
            ALTER TABLE transfers 
            ALTER COLUMN to_account_id TYPE VARCHAR(20)
          `);
        },
      },
    ];
  }
}
