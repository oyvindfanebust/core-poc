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

export interface CreateAccountRequest {
  type: 'DEPOSIT' | 'LOAN' | 'CREDIT';
  customerId: string;
  currency: string;
  accountName?: string;
  initialBalance?: string;
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

  async updateAccountName(accountId: string, accountName: string | null): Promise<{ success: boolean }> {
    return apiClient.patch(`/accounts/${accountId}/name`, { accountName });
  },
};

export const transfersApi = {
  async createTransfer(data: TransferRequest): Promise<Transfer> {
    return apiClient.post('/transfers', data);
  },
};