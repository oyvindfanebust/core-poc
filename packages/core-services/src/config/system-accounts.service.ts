import { promises as fs } from 'fs';
import { join } from 'path';

import { Currency } from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface SystemAccountEntry {
  tigerBeetleId: string;
  accountType: string;
  currency: Currency;
  description: string;
  createdAt: string;
}

export interface SystemAccountConfig {
  version: string;
  lastUpdated: string;
  accounts: Record<string, SystemAccountEntry>;
}

export class SystemAccountConfigService {
  private config: SystemAccountConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    // Default to config directory in project root
    this.configPath = configPath || join(process.cwd(), 'config', 'system-accounts.json');
  }

  /**
   * Initialize the config service by loading the configuration file
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      logger.info('System account configuration loaded successfully', {
        accountCount: Object.keys(this.config?.accounts || {}).length,
        configPath: this.configPath,
      });
    } catch (error) {
      if (this.isFileNotFoundError(error)) {
        logger.info('System account config file not found, creating default config', {
          configPath: this.configPath,
        });
        await this.createDefaultConfig();
      } else {
        logger.error('Failed to initialize system account configuration', {
          error,
          configPath: this.configPath,
        });
        throw error;
      }
    }
  }

  /**
   * Load configuration from file
   */
  private async loadConfig(): Promise<void> {
    const configData = await fs.readFile(this.configPath, 'utf8');
    this.config = JSON.parse(configData);

    // Validate config structure
    if (!this.config || typeof this.config !== 'object') {
      throw new Error('Invalid config file format');
    }

    if (!this.config.accounts || typeof this.config.accounts !== 'object') {
      throw new Error('Config file missing accounts section');
    }
  }

  /**
   * Create default configuration file
   */
  private async createDefaultConfig(): Promise<void> {
    const defaultConfig: SystemAccountConfig = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      accounts: {},
    };

    await this.ensureConfigDirectory();
    await this.writeConfig(defaultConfig);
    this.config = defaultConfig;
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDirectory(): Promise<void> {
    const configDir = join(this.configPath, '..');
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
      logger.info('Created config directory', { configDir });
    }
  }

  /**
   * Write configuration to file with atomic operation
   */
  private async writeConfig(config: SystemAccountConfig): Promise<void> {
    const tempPath = `${this.configPath}.tmp`;

    try {
      // Write to temporary file first
      await fs.writeFile(tempPath, JSON.stringify(config, null, 2), 'utf8');

      // Atomic rename
      await fs.rename(tempPath, this.configPath);

      logger.info('System account configuration saved', {
        configPath: this.configPath,
        accountCount: Object.keys(config.accounts).length,
      });
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Add a new system account to the configuration
   */
  async addSystemAccount(
    systemIdentifier: string,
    tigerBeetleId: string,
    accountType: string,
    currency: Currency,
    description: string,
  ): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    if (this.config.accounts[systemIdentifier]) {
      throw new Error(`System account already exists: ${systemIdentifier}`);
    }

    const newAccount: SystemAccountEntry = {
      tigerBeetleId,
      accountType,
      currency,
      description,
      createdAt: new Date().toISOString(),
    };

    // Create updated config
    const updatedConfig: SystemAccountConfig = {
      ...this.config,
      lastUpdated: new Date().toISOString(),
      accounts: {
        ...this.config.accounts,
        [systemIdentifier]: newAccount,
      },
    };

    await this.writeConfig(updatedConfig);
    this.config = updatedConfig;

    logger.info('Added system account to configuration', {
      systemIdentifier,
      tigerBeetleId,
      accountType,
      currency,
    });
  }

  /**
   * Get system account by identifier
   */
  getSystemAccount(systemIdentifier: string): SystemAccountEntry | null {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    return this.config.accounts[systemIdentifier] || null;
  }

  /**
   * Get all system accounts
   */
  getAllSystemAccounts(): Record<string, SystemAccountEntry> {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    return { ...this.config.accounts };
  }

  /**
   * Get system accounts by type
   */
  getSystemAccountsByType(accountType: string): Record<string, SystemAccountEntry> {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    const filtered: Record<string, SystemAccountEntry> = {};

    for (const [identifier, account] of Object.entries(this.config.accounts)) {
      if (account.accountType === accountType) {
        filtered[identifier] = account;
      }
    }

    return filtered;
  }

  /**
   * Check if system account exists
   */
  hasSystemAccount(systemIdentifier: string): boolean {
    if (!this.config) {
      return false;
    }

    return systemIdentifier in this.config.accounts;
  }

  /**
   * Get TigerBeetle ID for system account
   */
  getSystemAccountTigerBeetleId(systemIdentifier: string): string | null {
    const account = this.getSystemAccount(systemIdentifier);
    return account ? account.tigerBeetleId : null;
  }

  /**
   * Find system identifier by TigerBeetle ID
   */
  findSystemIdentifierByTigerBeetleId(tigerBeetleId: string): string | null {
    if (!this.config) {
      return null;
    }

    for (const [identifier, account] of Object.entries(this.config.accounts)) {
      if (account.tigerBeetleId === tigerBeetleId) {
        return identifier;
      }
    }

    return null;
  }

  /**
   * Get configuration metadata
   */
  getConfigMetadata(): { version: string; lastUpdated: string; accountCount: number } | null {
    if (!this.config) {
      return null;
    }

    return {
      version: this.config.version,
      lastUpdated: this.config.lastUpdated,
      accountCount: Object.keys(this.config.accounts).length,
    };
  }

  /**
   * Validate configuration file integrity
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.config) {
      errors.push('Configuration not loaded');
      return { valid: false, errors };
    }

    // Check required fields
    if (!this.config.version) {
      errors.push('Missing version field');
    }

    if (!this.config.lastUpdated) {
      errors.push('Missing lastUpdated field');
    }

    if (!this.config.accounts || typeof this.config.accounts !== 'object') {
      errors.push('Missing or invalid accounts section');
      return { valid: false, errors };
    }

    // Validate each account entry
    for (const [identifier, account] of Object.entries(this.config.accounts)) {
      if (!account.tigerBeetleId) {
        errors.push(`Account ${identifier}: missing tigerBeetleId`);
      }

      if (!account.accountType) {
        errors.push(`Account ${identifier}: missing accountType`);
      }

      if (!account.currency) {
        errors.push(`Account ${identifier}: missing currency`);
      }

      if (!account.createdAt) {
        errors.push(`Account ${identifier}: missing createdAt`);
      }

      // Validate TigerBeetle ID format (should be numeric string)
      if (account.tigerBeetleId && !/^\d+$/.test(account.tigerBeetleId)) {
        errors.push(`Account ${identifier}: invalid tigerBeetleId format`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Export configuration for backup or migration
   */
  async exportConfig(): Promise<SystemAccountConfig> {
    if (!this.config) {
      throw new Error('Configuration not initialized');
    }

    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Check if error is file not found
   */
  private isFileNotFoundError(error: any): boolean {
    return error?.code === 'ENOENT';
  }
}
