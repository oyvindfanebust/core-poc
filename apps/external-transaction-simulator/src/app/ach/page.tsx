'use client';

import { Building2, Send, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { US_BANKS } from '@/config/us-banks';
import { coreApiClient } from '@/lib/core-api-client';

interface CustomerAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
}

interface ACHTransferResult {
  success: boolean;
  transferId?: string;
  achTransactionId?: string;
  message: string;
  estimatedSettlement?: string;
}

export default function ACHPage() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ACHTransferResult[]>([]);

  // Form state
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [urgency, setUrgency] = useState<'STANDARD' | 'SAME_DAY' | 'EXPRESS'>('STANDARD');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomerAccounts();
  }, []);

  const loadCustomerAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const accountsData = await coreApiClient.getCustomerAccounts('CUSTOMER-ABC-123');
      setAccounts(accountsData.filter(acc => acc.currency === 'USD'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAccount || !selectedBank || !amount || !reference) {
      alert('Please fill in all required fields');
      return;
    }

    const selectedBankData = US_BANKS.find(bank => bank.id === selectedBank);
    if (!selectedBankData) {
      alert('Invalid bank selected');
      return;
    }

    try {
      setSubmitting(true);

      // For now, we'll simulate ACH processing since the core API only has SEPA endpoints
      // In a full implementation, we'd need dedicated ACH endpoints
      const achTransactionId = `ACH-${urgency}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Simulate success/failure
      const isSuccess = Math.random() > 0.1; // 90% success rate

      let estimatedSettlement = '';
      switch (urgency) {
        case 'STANDARD':
          estimatedSettlement = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 business days
          break;
        case 'SAME_DAY':
          estimatedSettlement = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours
          break;
        case 'EXPRESS':
          estimatedSettlement = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
          break;
      }

      const result: ACHTransferResult = {
        success: isSuccess,
        transferId: isSuccess ? `TB-${Date.now()}` : undefined,
        achTransactionId: isSuccess ? achTransactionId : undefined,
        message: isSuccess
          ? `ACH credit transfer initiated successfully. Funds will be credited to account ${selectedAccount}.`
          : 'ACH transfer failed due to bank processing error. Please retry.',
        estimatedSettlement: isSuccess ? estimatedSettlement : undefined,
      };

      setResults(prev => [result, ...prev]);

      if (isSuccess) {
        // Reset form
        setSelectedAccount('');
        setSelectedBank('');
        setAmount('');
        setReference('');
        setUrgency('STANDARD');
      }
    } catch (err) {
      const errorResult: ACHTransferResult = {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      };
      setResults(prev => [errorResult, ...prev]);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBankData = US_BANKS.find(bank => bank.id === selectedBank);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center mb-2">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ACH Transfer Simulation</h1>
        <p className="text-lg text-gray-600">
          Simulate incoming ACH credit transfers from US banks to customer accounts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transfer Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Simulate ACH Credit Transfer
          </h2>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading accounts...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {!loading && !error && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Account Selection */}
              <div>
                <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Customer Account *
                </label>
                <select
                  id="account"
                  value={selectedAccount}
                  onChange={e => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select an account...</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type}) - ${(account.balance / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Only USD accounts are shown for ACH transfers
                </p>
              </div>

              {/* Bank Selection */}
              <div>
                <label htmlFor="bank" className="block text-sm font-medium text-gray-700 mb-1">
                  Originating Bank *
                </label>
                <select
                  id="bank"
                  value={selectedBank}
                  onChange={e => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a bank...</option>
                  {US_BANKS.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} ({bank.state})
                    </option>
                  ))}
                </select>
                {selectedBankData && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <div className="text-xs text-gray-600">
                      <div>
                        <strong>Routing Number:</strong> {selectedBankData.routingNumber}
                      </div>
                      <div>
                        <strong>Location:</strong> {selectedBankData.city}, {selectedBankData.state}
                      </div>
                      <div>
                        <strong>Type:</strong> {selectedBankData.bankType}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer Amount (USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="0.01"
                    step="0.01"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-gray-700 mb-1">
                  Reference/Memo *
                </label>
                <input
                  type="text"
                  id="reference"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ACH credit transfer"
                  required
                />
              </div>

              {/* Urgency */}
              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
                  Processing Speed
                </label>
                <select
                  id="urgency"
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as 'STANDARD' | 'SAME_DAY' | 'EXPRESS')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="STANDARD">Standard (2 business days)</option>
                  <option value="SAME_DAY">Same Day (6 hours)</option>
                  <option value="EXPRESS">Express (2 hours)</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                }`}
              >
                {submitting ? (
                  <>
                    <Clock className="animate-spin h-4 w-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Simulate ACH Transfer
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Results Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transfer Results</h2>

          {results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transfers simulated yet. Use the form to simulate an ACH transfer.
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div
                        className={`text-sm font-medium ${
                          result.success ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {result.success ? 'Transfer Successful' : 'Transfer Failed'}
                      </div>
                      <div
                        className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}
                      >
                        {result.message}
                      </div>

                      {result.success && (
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          <div>
                            <strong>Transfer ID:</strong> {result.transferId}
                          </div>
                          <div>
                            <strong>ACH Transaction ID:</strong> {result.achTransactionId}
                          </div>
                          {result.estimatedSettlement && (
                            <div>
                              <strong>Estimated Settlement:</strong>{' '}
                              {new Date(result.estimatedSettlement).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Banks Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          Available US Banks ({US_BANKS.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {US_BANKS.map(bank => (
            <div key={bank.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 truncate">{bank.name}</div>
                <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {bank.bankType}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-1">
                {bank.city}, {bank.state}
              </div>
              <div className="text-xs font-mono text-gray-600">{bank.routingNumber}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">ACH Transfer Simulation</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            • <strong>Standard Processing:</strong> Simulates typical ACH transfers that settle in 2
            business days
          </p>
          <p>
            • <strong>Same Day ACH:</strong> Faster processing with settlement in approximately 6
            hours
          </p>
          <p>
            • <strong>Express Processing:</strong> Premium service with 2-hour settlement
            (simulated)
          </p>
          <p>
            • <strong>Success Rate:</strong> 90% success rate to simulate real-world conditions
          </p>
          <p>
            • This simulation uses mock US banking data and demonstrates ACH credit transfer
            functionality
          </p>
        </div>
      </div>
    </div>
  );
}
