'use client';

import { ArrowLeft, Euro, RefreshCw, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { coreApiClient, SEPASuspenseBalances } from '@/lib/core-api-client';

export default function BalancesPage() {
  const [balances, setBalances] = useState<Record<string, SEPASuspenseBalances>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadBalances();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadBalances, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadBalances = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const currencies = ['EUR', 'NOK', 'SEK', 'DKK'];
      const balancePromises = currencies.map(async currency => {
        try {
          const balance = await coreApiClient.getSEPASuspenseBalances(currency);
          return { currency, balance };
        } catch (err) {
          console.warn(`Failed to load ${currency} balances:`, err);
          return null;
        }
      });

      const results = await Promise.all(balancePromises);
      const balanceMap: Record<string, SEPASuspenseBalances> = {};

      results.forEach(result => {
        if (result) {
          balanceMap[result.currency] = result.balance;
        }
      });

      setBalances(balanceMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load balances');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatAmount = (amount: string): string => {
    const num = parseFloat(amount);
    return (num / 100).toFixed(2); // Convert from cents
  };

  const formatCurrency = (amount: string, currency: string): string => {
    const formatted = formatAmount(amount);
    const symbols: Record<string, string> = {
      EUR: '€',
      NOK: 'kr',
      SEK: 'kr',
      DKK: 'kr',
    };
    return `${formatted} ${symbols[currency] || currency}`;
  };

  const getTotalBalance = (balance: SEPASuspenseBalances): number => {
    return (
      parseFloat(balance.outgoing.balance) +
      parseFloat(balance.incoming.balance) +
      parseFloat(balance.settlement.balance)
    );
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      EUR: '€',
      NOK: 'kr',
      SEK: 'kr',
      DKK: 'kr',
    };
    return symbols[currency] || currency;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        <button
          onClick={() => loadBalances(true)}
          disabled={refreshing}
          className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-6">
          <Euro className="h-6 w-6 text-purple-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">SEPA Suspense Account Balances</h1>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading balances...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(balances).map(([currency, balance]) => {
                const total = getTotalBalance(balance);
                return (
                  <div
                    key={currency}
                    className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-bold text-gray-900">{currency}</div>
                      <div className="text-2xl">{getCurrencySymbol(currency)}</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatAmount(total.toString())}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Total Suspense</div>
                  </div>
                );
              })}
            </div>

            {/* Detailed Balances */}
            {Object.entries(balances).map(([currency, balance]) => (
              <div key={currency} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currency} Suspense Accounts
                  </h2>
                  <div className="text-sm text-gray-500">
                    Updated: {new Date(balance.lastUpdated).toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Outgoing Suspense */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <TrendingUp className="h-5 w-5 text-orange-600 mr-2" />
                        <h3 className="font-medium text-gray-900">Outgoing Suspense</h3>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Balance:</span>
                        <span className="font-medium text-orange-700">
                          {formatCurrency(balance.outgoing.balance, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Debits:</span>
                        <span className="text-sm text-gray-700">
                          {formatCurrency(balance.outgoing.debits, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Credits:</span>
                        <span className="text-sm text-gray-700">
                          {formatCurrency(balance.outgoing.credits, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      Customer transfers awaiting settlement
                    </div>
                  </div>

                  {/* Incoming Suspense */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <TrendingDown className="h-5 w-5 text-green-600 mr-2" />
                        <h3 className="font-medium text-gray-900">Incoming Suspense</h3>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Balance:</span>
                        <span className="font-medium text-green-700">
                          {formatCurrency(balance.incoming.balance, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Debits:</span>
                        <span className="text-sm text-gray-700">
                          {formatCurrency(balance.incoming.debits, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Credits:</span>
                        <span className="text-sm text-gray-700">
                          {formatCurrency(balance.incoming.credits, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      External transfers being processed
                    </div>
                  </div>

                  {/* Settlement */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <Activity className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="font-medium text-gray-900">Settlement</h3>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Balance:</span>
                        <span className="font-medium text-blue-700">
                          {formatCurrency(balance.settlement.balance, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Debits:</span>
                        <span className="text-sm text-gray-700">
                          {formatCurrency(balance.settlement.debits, currency)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Credits:</span>
                        <span className="text-sm text-gray-700">
                          {formatCurrency(balance.settlement.credits, currency)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">Final settlement positions</div>
                  </div>
                </div>
              </div>
            ))}

            {Object.keys(balances).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Euro className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <div className="text-lg font-medium">No SEPA suspense accounts found</div>
                <div className="text-sm text-gray-400 mt-1">
                  Make sure the Core API is running and SEPA accounts are initialized
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Flow Explanation */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-4">SEPA Account Flow</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
          <div className="p-3 bg-white rounded border">
            <div className="font-medium text-orange-700 mb-1">1. Outgoing Suspense</div>
            <div>Customer initiates SEPA transfer → Funds move here temporarily</div>
          </div>
          <div className="p-3 bg-white rounded border">
            <div className="font-medium text-green-700 mb-1">2. Processing</div>
            <div>External banks accept/reject transfers → Funds settle or return</div>
          </div>
          <div className="p-3 bg-white rounded border">
            <div className="font-medium text-blue-700 mb-1">3. Settlement</div>
            <div>Final positions with external SEPA network</div>
          </div>
        </div>
      </div>
    </div>
  );
}
