'use client';

import {
  Building2,
  Send,
  Activity,
  AlertCircle,
  TrendingUp,
  Euro,
  Banknote,
  DollarSign,
  Globe,
  History,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// eslint-disable-next-line import/no-unresolved
import { MOCK_BANKS } from '@/config/mock-banks';
// eslint-disable-next-line import/no-unresolved
import { coreApiClient, SEPAStatus } from '@/lib/core-api-client';

export default function HomePage() {
  const [sepaStatus, setSEPAStatus] = useState<SEPAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSEPAStatus();
  }, []);

  const testConnection = async () => {
    try {
      // Test basic connectivity
      const response = await fetch('http://localhost:7001/health');
      const data = await response.json();
      console.log('Core API Health:', data);

      // Test customer accounts
      const accountsResponse = await fetch(
        'http://localhost:7001/customers/CUSTOMER-ABC-123/accounts',
      );
      const accounts = await accountsResponse.json();
      console.log('Customer accounts:', accounts);

      alert(`✅ Connection successful! Found ${accounts.length} accounts for test customer.`);
    } catch (error) {
      console.error('Connection test failed:', error);
      alert(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadSEPAStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await coreApiClient.getSEPAStatus();
      setSEPAStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SEPA status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'text-green-600 bg-green-100';
      case 'DEGRADED':
        return 'text-yellow-600 bg-yellow-100';
      case 'ERROR':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">External Transaction Simulator</h1>
        <p className="text-lg text-gray-600">
          Simulate external transfers, SEPA payments, and loan disbursements
        </p>
      </div>

      {/* SEPA Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Core API SEPA Status
          </h2>
          <div className="space-x-2">
            <button
              onClick={loadSEPAStatus}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Refresh
            </button>
            <button
              onClick={testConnection}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Test Connection
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading SEPA status...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {sepaStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-500">Status</div>
                <div
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(sepaStatus.status)}`}
                >
                  {sepaStatus.status}
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-1">Version</div>
              <div className="text-lg font-semibold text-gray-900">{sepaStatus.version}</div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-1">Suspense Accounts</div>
              <div className="text-lg font-semibold text-gray-900">
                {sepaStatus.suspenseAccounts.configured}/{sepaStatus.suspenseAccounts.total}
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm font-medium text-gray-500 mb-1">Currencies</div>
              <div className="text-lg font-semibold text-gray-900">
                {sepaStatus.supportedCurrencies.join(', ')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Simulate Incoming Transfer */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Send className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Incoming Transfers</h3>
              <p className="text-sm text-gray-600">Simulate external bank sending money</p>
            </div>
          </div>
          <a
            href="/incoming"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            Simulate Incoming
          </a>
        </div>

        {/* Process Outgoing Transfers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Outgoing Transfers</h3>
              <p className="text-sm text-gray-600">Process pending SEPA transfers</p>
            </div>
          </div>
          <a
            href="/outgoing"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Process Outgoing
          </a>
        </div>

        {/* Monitor Balances */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Euro className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Suspense Balances</h3>
              <p className="text-sm text-gray-600">Monitor SEPA account balances</p>
            </div>
          </div>
          <a
            href="/balances"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            View Balances
          </a>
        </div>

        {/* ACH Transfers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <DollarSign className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">ACH Transfers</h3>
              <p className="text-sm text-gray-600">Simulate US domestic ACH credit transfers</p>
            </div>
          </div>
          <a
            href="/ach"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
          >
            Simulate ACH
          </a>
        </div>

        {/* Wire Transfers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Globe className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Wire Transfers</h3>
              <p className="text-sm text-gray-600">Simulate international wire transfers</p>
            </div>
          </div>
          <a
            href="/wire"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            Simulate Wire
          </a>
        </div>

        {/* Loan Funding */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Banknote className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Loan Funding</h3>
              <p className="text-sm text-gray-600">Disburse loan funds to customer accounts</p>
            </div>
          </div>
          <a
            href="/funding"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            Manage Disbursements
          </a>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <History className="h-8 w-8 text-gray-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
              <p className="text-sm text-gray-600">View and analyze all simulated transactions</p>
            </div>
          </div>
          <a
            href="/history"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700"
          >
            View History
          </a>
        </div>
      </div>

      {/* Mock Banks Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          Available Mock Banks ({MOCK_BANKS.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MOCK_BANKS.map(bank => (
            <div key={bank.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 truncate">{bank.name}</div>
                <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {bank.currency}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-1">{bank.country}</div>
              <div className="text-xs font-mono text-gray-600">{bank.bic}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Getting Started</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            • <strong>SEPA Incoming:</strong> Simulate European banks sending money to customer
            accounts (EUR, NOK, SEK, DKK)
          </p>
          <p>
            • <strong>SEPA Outgoing:</strong> Process SEPA transfers initiated from the customer
            frontend
          </p>
          <p>
            • <strong>ACH Transfers:</strong> Simulate US domestic ACH credit transfers with major
            banks
          </p>
          <p>
            • <strong>Wire Transfers:</strong> Simulate international wire transfers via SWIFT
            network
          </p>
          <p>
            • <strong>Balances:</strong> Monitor suspense account positions and settlement status
          </p>
          <p>
            • <strong>Loan Funding:</strong> Disburse loan proceeds to customer deposit accounts
          </p>
          <p>
            • <strong>Transaction History:</strong> View, search, and export all simulated external
            transactions
          </p>
          <p>
            • Use the customer frontend at{' '}
            <a href="http://localhost:7002" className="underline">
              http://localhost:7002
            </a>{' '}
            to initiate SEPA transfers
          </p>
        </div>
      </div>
    </div>
  );
}
