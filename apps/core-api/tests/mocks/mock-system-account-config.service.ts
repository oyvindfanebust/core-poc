import { SystemAccountConfigService, SystemAccountEntry, Currency } from '@core-poc/core-services';

/**
 * Mock implementation of SystemAccountConfigService for fast testing
 *
 * Provides predictable test data without file system dependencies
 * Mimics the same interface as the real service but with in-memory data
 */
export class MockSystemAccountConfigService extends SystemAccountConfigService {
  private mockConfig = {
    version: '1.0',
    lastUpdated: '2024-01-01T12:00:00.000Z',
    accounts: {} as Record<string, SystemAccountEntry>,
  };

  private accountsData: Record<string, SystemAccountEntry> = {
    // Core system accounts
    'SYSTEM-SUSPENSE-OUT': {
      tigerBeetleId: '1000000001',
      accountType: 'OUTGOING_SUSPENSE',
      currency: 'EUR' as Currency,
      description: 'General outgoing transfer suspense account for EUR transactions',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SYSTEM-SUSPENSE-IN': {
      tigerBeetleId: '1000000002',
      accountType: 'INCOMING_SUSPENSE',
      currency: 'EUR' as Currency,
      description: 'General incoming transfer suspense account for EUR transactions',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SYSTEM-CLEARING': {
      tigerBeetleId: '1000000003',
      accountType: 'CLEARING',
      currency: 'EUR' as Currency,
      description: 'General clearing account for EUR transactions',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    // SEPA accounts for all currencies
    'SEPA-OUT-SUSPENSE-EUR': {
      tigerBeetleId: '2000000001',
      accountType: 'SEPA_OUTGOING_SUSPENSE',
      currency: 'EUR' as Currency,
      description: 'SEPA outgoing suspense account for EUR',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-OUT-SUSPENSE-NOK': {
      tigerBeetleId: '2000000002',
      accountType: 'SEPA_OUTGOING_SUSPENSE',
      currency: 'NOK' as Currency,
      description: 'SEPA outgoing suspense account for NOK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-OUT-SUSPENSE-SEK': {
      tigerBeetleId: '2000000003',
      accountType: 'SEPA_OUTGOING_SUSPENSE',
      currency: 'SEK' as Currency,
      description: 'SEPA outgoing suspense account for SEK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-OUT-SUSPENSE-DKK': {
      tigerBeetleId: '2000000004',
      accountType: 'SEPA_OUTGOING_SUSPENSE',
      currency: 'DKK' as Currency,
      description: 'SEPA outgoing suspense account for DKK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-IN-SUSPENSE-EUR': {
      tigerBeetleId: '2000000005',
      accountType: 'SEPA_INCOMING_SUSPENSE',
      currency: 'EUR' as Currency,
      description: 'SEPA incoming suspense account for EUR',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-IN-SUSPENSE-NOK': {
      tigerBeetleId: '2000000006',
      accountType: 'SEPA_INCOMING_SUSPENSE',
      currency: 'NOK' as Currency,
      description: 'SEPA incoming suspense account for NOK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-IN-SUSPENSE-SEK': {
      tigerBeetleId: '2000000007',
      accountType: 'SEPA_INCOMING_SUSPENSE',
      currency: 'SEK' as Currency,
      description: 'SEPA incoming suspense account for SEK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-IN-SUSPENSE-DKK': {
      tigerBeetleId: '2000000008',
      accountType: 'SEPA_INCOMING_SUSPENSE',
      currency: 'DKK' as Currency,
      description: 'SEPA incoming suspense account for DKK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-SETTLEMENT-EUR': {
      tigerBeetleId: '2000000009',
      accountType: 'SEPA_SETTLEMENT',
      currency: 'EUR' as Currency,
      description: 'SEPA settlement account for EUR',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-SETTLEMENT-NOK': {
      tigerBeetleId: '2000000010',
      accountType: 'SEPA_SETTLEMENT',
      currency: 'NOK' as Currency,
      description: 'SEPA settlement account for NOK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-SETTLEMENT-SEK': {
      tigerBeetleId: '2000000011',
      accountType: 'SEPA_SETTLEMENT',
      currency: 'SEK' as Currency,
      description: 'SEPA settlement account for SEK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
    'SEPA-SETTLEMENT-DKK': {
      tigerBeetleId: '2000000012',
      accountType: 'SEPA_SETTLEMENT',
      currency: 'DKK' as Currency,
      description: 'SEPA settlement account for DKK',
      createdAt: '2024-01-01T12:00:00.000Z',
    },
  };

  constructor() {
    // Call parent constructor with undefined path to avoid file system operations
    super(undefined);
    // Set up mock accounts data with current timestamps
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const currentTime = new Date().toISOString();

    // Update all accounts to have current timestamps
    Object.values(this.accountsData).forEach(account => {
      account.createdAt = currentTime;
    });

    this.mockConfig.accounts = this.accountsData;
    this.mockConfig.lastUpdated = currentTime;
  }

  /**
   * Mock initialization - always succeeds immediately
   */
  override async initialize(): Promise<void> {
    // Mock initialization completes immediately without file system access
    return Promise.resolve();
  }

  /**
   * Get system account by identifier
   */
  override getSystemAccount(systemIdentifier: string): SystemAccountEntry | null {
    return this.mockConfig.accounts[systemIdentifier] || null;
  }

  /**
   * Get all system accounts
   */
  override getAllSystemAccounts(): Record<string, SystemAccountEntry> {
    return { ...this.mockConfig.accounts };
  }

  /**
   * Get system accounts by type
   */
  override getSystemAccountsByType(accountType: string): Record<string, SystemAccountEntry> {
    const filtered: Record<string, SystemAccountEntry> = {};

    for (const [identifier, account] of Object.entries(this.mockConfig.accounts)) {
      if (account.accountType === accountType) {
        filtered[identifier] = account;
      }
    }

    return filtered;
  }

  /**
   * Check if system account exists
   */
  override hasSystemAccount(systemIdentifier: string): boolean {
    return systemIdentifier in this.mockConfig.accounts;
  }

  /**
   * Get TigerBeetle ID for system account
   */
  override getSystemAccountTigerBeetleId(systemIdentifier: string): string | null {
    const account = this.getSystemAccount(systemIdentifier);
    return account ? account.tigerBeetleId : null;
  }

  /**
   * Find system identifier by TigerBeetle ID
   */
  override findSystemIdentifierByTigerBeetleId(tigerBeetleId: string): string | null {
    for (const [identifier, account] of Object.entries(this.mockConfig.accounts)) {
      if (account.tigerBeetleId === tigerBeetleId) {
        return identifier;
      }
    }
    return null;
  }

  /**
   * Get configuration metadata
   */
  override getConfigMetadata(): {
    version: string;
    lastUpdated: string;
    accountCount: number;
  } | null {
    return {
      version: this.mockConfig.version,
      lastUpdated: this.mockConfig.lastUpdated,
      accountCount: Object.keys(this.mockConfig.accounts).length,
    };
  }

  /**
   * Validate configuration file integrity - always returns valid for mock
   */
  override async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    return { valid: true, errors: [] };
  }

  /**
   * Export configuration for backup or migration
   */
  override async exportConfig() {
    return JSON.parse(JSON.stringify(this.mockConfig));
  }

  /**
   * Add a new system account to the mock configuration
   */
  override async addSystemAccount(
    systemIdentifier: string,
    tigerBeetleId: string,
    accountType: string,
    currency: Currency,
    description: string,
  ): Promise<void> {
    if (this.mockConfig.accounts[systemIdentifier]) {
      throw new Error(`System account already exists: ${systemIdentifier}`);
    }

    const newAccount: SystemAccountEntry = {
      tigerBeetleId,
      accountType,
      currency,
      description,
      createdAt: new Date().toISOString(),
    };

    this.mockConfig.accounts[systemIdentifier] = newAccount;
    this.mockConfig.lastUpdated = new Date().toISOString();
  }

  /**
   * Reset mock data to initial state (useful for test cleanup)
   */
  reset(): void {
    // Reset to original mock data - reinitialize with current timestamps
    this.initializeMockData();
  }
}
