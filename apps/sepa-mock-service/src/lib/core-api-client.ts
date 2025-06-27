// API client for Core API SEPA endpoints
const CORE_API_BASE_URL = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://localhost:7001';

export interface SEPATransferRequest {
  accountId: string;
  amount: string;
  currency: 'EUR' | 'NOK' | 'SEK' | 'DKK';
  bankInfo: {
    iban: string;
    bic?: string;
    bankName: string;
    recipientName: string;
    country: string;
  };
  description?: string;
  urgency?: 'STANDARD' | 'EXPRESS' | 'INSTANT';
}

export interface SEPATransferResponse {
  transferId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  sepaTransactionId?: string;
  estimatedSettlement?: string;
  errorDetails?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface SEPAStatus {
  status: 'OPERATIONAL' | 'DEGRADED' | 'ERROR';
  version: string;
  supportedCurrencies: string[];
  suspenseAccounts: {
    configured: number;
    missing: number;
    total: number;
  };
  capabilities: {
    outgoingTransfers: boolean;
    incomingTransfers: boolean;
    instantPayments: boolean;
    bulkPayments: boolean;
  };
  lastChecked: string;
}

export interface SEPASuspenseBalances {
  currency: string;
  outgoing: {
    debits: string;
    credits: string;
    balance: string;
  };
  incoming: {
    debits: string;
    credits: string;
    balance: string;
  };
  settlement: {
    debits: string;
    credits: string;
    balance: string;
  };
  lastUpdated: string;
}

class CoreApiClient {
  private baseUrl: string;

  constructor(baseUrl = CORE_API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        mode: 'cors',
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Failed to connect to Core API at ${this.baseUrl}. Make sure the Core API is running on port 7001.`,
        );
      }
      throw error;
    }
  }

  // Create outgoing SEPA transfer
  async createSEPATransfer(transfer: SEPATransferRequest): Promise<SEPATransferResponse> {
    return this.request<SEPATransferResponse>('/sepa/transfers/outgoing', {
      method: 'POST',
      body: JSON.stringify(transfer),
    });
  }

  // Create incoming SEPA transfer (for simulation)
  async createIncomingSEPATransfer(transfer: SEPATransferRequest): Promise<SEPATransferResponse> {
    return this.request<SEPATransferResponse>('/sepa/transfers/incoming', {
      method: 'POST',
      body: JSON.stringify(transfer),
    });
  }

  // Get SEPA service status
  async getSEPAStatus(): Promise<SEPAStatus> {
    return this.request<SEPAStatus>('/sepa/status');
  }

  // Get SEPA suspense balances for a currency
  async getSEPASuspenseBalances(currency: string): Promise<SEPASuspenseBalances> {
    return this.request<SEPASuspenseBalances>(`/sepa/suspense/${currency.toUpperCase()}`);
  }

  // Get all customer accounts (for simulation)
  async getCustomerAccounts(customerId: string): Promise<any[]> {
    return this.request<any[]>(`/customers/${customerId}/accounts`);
  }

  // Get account balance (for validation)
  async getAccountBalance(accountId: string): Promise<any> {
    return this.request<any>(`/accounts/${accountId}/balance`);
  }
}

export const coreApiClient = new CoreApiClient();
