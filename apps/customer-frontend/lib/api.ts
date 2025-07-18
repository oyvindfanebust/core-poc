import { apiClient } from './api-client';

// Types for API responses
export interface Account {
  accountId: string;
  customerId: string;
  accountType: 'DEPOSIT' | 'LOAN' | 'CREDIT';
  currency: string;
  accountName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Balance {
  debits: string;
  credits: string;
  balance: string;
}

export interface Transfer {
  transferId: string;
}

export interface Transaction {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  fromAccountName?: string;
  toAccountName?: string;
  fromAccountType: string;
  toAccountType: string;
  amount: string;
  currency: string;
  description?: string;
  createdAt: string;
}

export interface CreateAccountRequest {
  type: 'DEPOSIT' | 'LOAN' | 'CREDIT';
  customerId: string;
  currency: string;
  accountName?: string;
  principalAmount?: string;
  interestRate?: string;
  termMonths?: string;
  creditLimit?: string;
}

export interface TransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currency: string;
}

export interface SEPABankInfo {
  iban: string;
  bic?: string;
  bankName: string;
  recipientName: string;
  country: string;
}

export interface SEPATransferRequest {
  accountId: string;
  amount: string;
  currency: 'EUR' | 'NOK' | 'SEK' | 'DKK';
  bankInfo: SEPABankInfo;
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

// API functions
export const accountsApi = {
  async createAccount(data: CreateAccountRequest): Promise<{ accountId: string }> {
    return apiClient.post('/accounts', data);
  },

  async getAccountsByCustomer(customerId: string): Promise<Account[]> {
    return apiClient.get(`/customers/${customerId}/accounts`);
  },

  async getAccountBalance(accountId: string): Promise<Balance> {
    return apiClient.get(`/accounts/${accountId}/balance`);
  },

  async updateAccountName(
    accountId: string,
    accountName: string | null,
  ): Promise<{ success: boolean }> {
    return apiClient.patch(`/accounts/${accountId}/name`, { accountName });
  },

  async getAccountTransactions(accountId: string, limit?: number): Promise<Transaction[]> {
    const params = limit ? `?limit=${limit}` : '';
    return apiClient.get(`/accounts/${accountId}/transactions${params}`);
  },
};

export const transfersApi = {
  async createTransfer(data: TransferRequest): Promise<Transfer> {
    return apiClient.post('/transfers', data);
  },
};

export const sepaApi = {
  async createSEPATransfer(data: SEPATransferRequest): Promise<SEPATransferResponse> {
    return apiClient.post('/sepa/transfers/outgoing', data);
  },

  async getSEPAStatus(): Promise<{ status: string; version: string }> {
    return apiClient.get('/sepa/status');
  },

  async getSEPASuspenseBalances(currency: string): Promise<{
    outgoing: Balance;
    incoming: Balance;
    settlement: Balance;
  }> {
    return apiClient.get(`/sepa/suspense/${currency}`);
  },
};
