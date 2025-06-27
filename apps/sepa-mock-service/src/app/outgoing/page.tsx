'use client';

import { ArrowLeft, TrendingUp, AlertCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { coreApiClient, SEPASuspenseBalances } from '@/lib/core-api-client';

export default function OutgoingTransfersPage() {
  const [balances, setBalances] = useState<Record<string, SEPASuspenseBalances>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingTransfers, setProcessingTransfers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    try {
      setLoading(true);
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
    }
  };

  const simulateProcessing = async (currency: string, _action: 'approve' | 'reject') => {
    const transferId = `${currency}-${Date.now()}`;
    setProcessingTransfers(prev => new Set(prev).add(transferId));

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    setProcessingTransfers(prev => {
      const newSet = new Set(prev);
      newSet.delete(transferId);
      return newSet;
    });

    // Refresh balances after processing
    await loadBalances();
  };

  const formatAmount = (amount: string): string => {
    const num = parseFloat(amount);
    return (num / 100).toFixed(2); // Convert from cents
  };

  const hasOutgoingBalance = (balance: SEPASuspenseBalances): boolean => {
    return parseFloat(balance.outgoing.balance) > 0;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Process Outgoing SEPA Transfers</h1>
          </div>
          <button
            onClick={loadBalances}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading outgoing transfers...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <div className="text-red-700">{error}</div>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                How Outgoing Transfer Processing Works
              </h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  • When customers initiate SEPA transfers, funds move to outgoing suspense accounts
                </p>
                <p>
                  • This page simulates external banks accepting or rejecting those pending
                  transfers
                </p>
                <p>• In production, this would be handled by actual SEPA network integration</p>
              </div>
            </div>

            {/* Currency Sections */}
            {Object.entries(balances).map(([currency, balance]) => (
              <div key={currency} className="border rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currency} Outgoing Transfers
                  </h2>
                  <span className="text-sm text-gray-500">
                    Last Updated: {new Date(balance.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Outgoing Balance */}
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-orange-800">Pending Outgoing</div>
                        <div className="text-xl font-bold text-orange-900">
                          {formatAmount(balance.outgoing.balance)} {currency}
                        </div>
                      </div>
                      <Clock className="h-8 w-8 text-orange-600" />
                    </div>
                  </div>

                  {/* Incoming Balance */}
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm font-medium text-green-800">Incoming Suspense</div>
                    <div className="text-xl font-bold text-green-900">
                      {formatAmount(balance.incoming.balance)} {currency}
                    </div>
                  </div>

                  {/* Settlement Balance */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm font-medium text-blue-800">Settlement</div>
                    <div className="text-xl font-bold text-blue-900">
                      {formatAmount(balance.settlement.balance)} {currency}
                    </div>
                  </div>
                </div>

                {/* Processing Actions */}
                {hasOutgoingBalance(balance) ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <AlertCircle className="h-5 w-5 text-orange-600" />
                      <span className="text-sm text-orange-800 font-medium">
                        Pending transfers require processing
                      </span>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => simulateProcessing(currency, 'approve')}
                        disabled={processingTransfers.size > 0}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Settle
                      </button>

                      <button
                        onClick={() => simulateProcessing(currency, 'reject')}
                        disabled={processingTransfers.size > 0}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject & Return
                      </button>
                    </div>

                    {processingTransfers.size > 0 && (
                      <div className="text-sm text-gray-600 italic">
                        Simulating external bank processing...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm">No pending outgoing transfers</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Initiate a SEPA transfer from the customer frontend to see pending transfers
                      here
                    </div>
                  </div>
                )}
              </div>
            ))}

            {Object.keys(balances).length === 0 && !loading && (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <div className="text-lg font-medium">No SEPA suspense accounts found</div>
                <div className="text-sm text-gray-400 mt-1">
                  Make sure the Core API is running and SEPA accounts are initialized
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Testing Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">Testing Instructions</h3>
        <div className="text-sm text-yellow-700 space-y-2">
          <p>
            <strong>1. Create a SEPA transfer:</strong> Go to the customer frontend at{' '}
            <a href="http://localhost:7002" className="underline">
              http://localhost:7002
            </a>
          </p>
          <p>
            <strong>2. Fill in transfer details:</strong> Use any valid IBAN and sufficient account
            balance
          </p>
          <p>
            <strong>3. Submit transfer:</strong> Funds will move to outgoing suspense account
          </p>
          <p>
            <strong>4. Process here:</strong> Refresh this page and approve/reject the pending
            transfer
          </p>
          <p>
            <strong>5. Check balances:</strong> Monitor how funds move between suspense accounts
          </p>
        </div>
      </div>
    </div>
  );
}
