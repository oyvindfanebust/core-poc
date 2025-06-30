import { 
  SEPASuspenseAccountService, 
  TigerBeetleService, 
  SystemAccountConfigService,
  SEPAAccountCreationResult,
  SEPAInitializationResult
} from '@core-poc/core-services';

/**
 * Mock implementation of SEPASuspenseAccountService for fast testing
 * 
 * Provides predictable responses without TigerBeetle dependencies
 * Simulates all SEPA account operations in-memory
 */
export class MockSEPASuspenseAccountService extends SEPASuspenseAccountService {
  private mockAccounts: Map<string, SEPAAccountCreationResult> = new Map();

  constructor(
    tigerBeetleService: TigerBeetleService,
    systemAccountsService: SystemAccountConfigService,
  ) {
    super(tigerBeetleService, systemAccountsService);
    this.initializeMockAccounts();
  }

  /**
   * Initialize mock account data
   */
  private initializeMockAccounts(): void {
    const currencies = ['EUR', 'NOK', 'SEK', 'DKK'] as const;
    const accountTypes = ['OUTGOING_SUSPENSE', 'INCOMING_SUSPENSE', 'SETTLEMENT'] as const;
    
    let numericId = 2000000001n;

    for (const currency of currencies) {
      for (const accountType of accountTypes) {
        const accountId = this.getMockAccountId(accountType, currency);
        this.mockAccounts.set(accountId, {
          accountId,
          numericId: numericId++,
          existed: false,
        });
      }
    }
  }

  /**
   * Get mock account ID based on type and currency
   */
  private getMockAccountId(
    type: 'OUTGOING_SUSPENSE' | 'INCOMING_SUSPENSE' | 'SETTLEMENT',
    currency: string,
  ): string {
    switch (type) {
      case 'OUTGOING_SUSPENSE':
        return `SEPA-OUT-SUSPENSE-${currency}`;
      case 'INCOMING_SUSPENSE':
        return `SEPA-IN-SUSPENSE-${currency}`;
      case 'SETTLEMENT':
        return `SEPA-SETTLEMENT-${currency}`;
      default:
        throw new Error(`Unknown account type: ${type}`);
    }
  }

  /**
   * Initialize all SEPA suspense accounts - mock implementation
   */
  override async initializeAllSEPAAccounts(): Promise<SEPAInitializationResult> {
    const created = Array.from(this.mockAccounts.values());
    
    return {
      created,
      errors: [],
      totalAccounts: created.length,
      successCount: created.length,
    };
  }

  /**
   * Create a specific SEPA suspense account - mock implementation
   */
  override async createSEPASuspenseAccount(
    type: 'OUTGOING_SUSPENSE' | 'INCOMING_SUSPENSE' | 'SETTLEMENT',
    currency: 'EUR' | 'NOK' | 'SEK' | 'DKK',
  ): Promise<SEPAAccountCreationResult> {
    const accountId = this.getMockAccountId(type, currency);
    const mockResult = this.mockAccounts.get(accountId);
    
    if (!mockResult) {
      throw new Error(`Mock account not found: ${accountId}`);
    }

    return { ...mockResult };
  }

  /**
   * Get SEPA account information - mock implementation
   */
  override async getSEPAAccount(
    type: 'OUTGOING_SUSPENSE' | 'INCOMING_SUSPENSE' | 'SETTLEMENT',
    currency: 'EUR' | 'NOK' | 'SEK' | 'DKK',
  ): Promise<{ accountId: string; numericId: bigint }> {
    const accountId = this.getMockAccountId(type, currency);
    const mockResult = this.mockAccounts.get(accountId);
    
    if (!mockResult) {
      throw new Error(`Mock SEPA account not found: ${accountId}`);
    }

    return {
      accountId: mockResult.accountId,
      numericId: mockResult.numericId,
    };
  }

  /**
   * Validate SEPA accounts configuration - mock implementation
   */
  override async validateSEPAAccounts(): Promise<{
    valid: boolean;
    missing: string[];
    configured: string[];
  }> {
    const configured = Array.from(this.mockAccounts.keys());
    
    return {
      valid: true,
      missing: [],
      configured,
    };
  }

  /**
   * Reset mock state (useful for test cleanup)
   */
  reset(): void {
    this.initializeMockAccounts();
  }
}