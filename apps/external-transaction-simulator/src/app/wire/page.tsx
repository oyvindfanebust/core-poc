'use client';

import { Building2, Send, AlertCircle, CheckCircle, Clock, Globe, Banknote } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { INTERNATIONAL_BANKS } from '@/config/international-banks';
import { coreApiClient } from '@/lib/core-api-client';

interface CustomerAccount {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
}

interface WireTransferResult {
  success: boolean;
  transferId?: string;
  wireTransactionId?: string;
  message: string;
  estimatedSettlement?: string;
  fees?: string;
}

export default function WirePage() {
  const [accounts, setAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WireTransferResult[]>([]);

  // Form state
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('USD');
  const [reference, setReference] = useState<string>('');
  const [urgency, setUrgency] = useState<'STANDARD' | 'EXPRESS' | 'PRIORITY'>('STANDARD');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCustomerAccounts();
  }, []);

  const loadCustomerAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const accountsData = await coreApiClient.getCustomerAccounts('CUSTOMER-ABC-123');
      setAccounts(accountsData);
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

    const selectedBankData = INTERNATIONAL_BANKS.find(bank => bank.id === selectedBank);
    if (!selectedBankData) {
      alert('Invalid bank selected');
      return;
    }

    const selectedAccountData = accounts.find(acc => acc.id === selectedAccount);
    if (!selectedAccountData) {
      alert('Invalid account selected');
      return;
    }

    try {
      setSubmitting(true);

      // Calculate fees based on urgency and amount
      const transferAmount = parseFloat(amount);
      let feeAmount = 0;
      switch (urgency) {
        case 'STANDARD':
          feeAmount = Math.max(25, transferAmount * 0.001); // Min $25 or 0.1%
          break;
        case 'EXPRESS':
          feeAmount = Math.max(50, transferAmount * 0.002); // Min $50 or 0.2%
          break;
        case 'PRIORITY':
          feeAmount = Math.max(100, transferAmount * 0.003); // Min $100 or 0.3%
          break;
      }

      // Generate wire transaction ID
      const wireTransactionId = `WIRE-${urgency}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Simulate success/failure (higher success rate for wire transfers)
      const isSuccess = Math.random() > 0.05; // 95% success rate

      let estimatedSettlement = '';
      switch (urgency) {
        case 'STANDARD':
          estimatedSettlement = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 1 business day
          break;
        case 'EXPRESS':
          estimatedSettlement = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours
          break;
        case 'PRIORITY':
          estimatedSettlement = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(); // 1 hour
          break;
      }

      const result: WireTransferResult = {
        success: isSuccess,
        transferId: isSuccess ? `TB-${Date.now()}` : undefined,
        wireTransactionId: isSuccess ? wireTransactionId : undefined,
        message: isSuccess
          ? `Wire transfer initiated successfully to ${selectedBankData.name}. Funds will be credited to account ${selectedAccount}.`
          : 'Wire transfer failed due to correspondent bank rejection or compliance check failure.',
        estimatedSettlement: isSuccess ? estimatedSettlement : undefined,
        fees: isSuccess ? `${currency} ${feeAmount.toFixed(2)}` : undefined,
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
      const errorResult: WireTransferResult = {
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error occurred',
      };
      setResults(prev => [errorResult, ...prev]);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBankData = INTERNATIONAL_BANKS.find(bank => bank.id === selectedBank);
  const availableCurrencies = [
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'CAD',
    'AUD',
    'CHF',
    'SEK',
    'NOK',
    'DKK',
  ];
  const filteredAccounts = accounts.filter(acc => (currency ? acc.currency === currency : true));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center mb-2">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Wire Transfer Simulation</h1>
        <p className="text-lg text-gray-600">
          Simulate incoming international wire transfers via SWIFT network
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Transfer Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Send className="h-5 w-5 mr-2" />
            Simulate Wire Transfer
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
              {/* Currency Selection */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer Currency *
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={e => {
                    setCurrency(e.target.value);
                    setSelectedAccount(''); // Reset account selection when currency changes
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {availableCurrencies.map(curr => (
                    <option key={curr} value={curr}>
                      {curr}
                    </option>
                  ))}
                </select>
              </div>

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
                  {filteredAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.type}) - {currency}{' '}
                      {(account.balance / 100).toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Showing accounts for selected currency: {currency}
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
                  {INTERNATIONAL_BANKS.map(bank => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name} ({bank.country}) - {bank.currencies.join(', ')}
                    </option>
                  ))}
                </select>
                {selectedBankData && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md">
                    <div className="text-xs text-gray-600">
                      <div>
                        <strong>SWIFT Code:</strong> {selectedBankData.swiftCode}
                      </div>
                      <div>
                        <strong>Location:</strong> {selectedBankData.city},{' '}
                        {selectedBankData.country}
                      </div>
                      <div>
                        <strong>Type:</strong> {selectedBankData.bankType}
                      </div>
                      <div>
                        <strong>Currencies:</strong> {selectedBankData.currencies.join(', ')}
                      </div>
                      {selectedBankData.correspondentBank && (
                        <div>
                          <strong>Correspondent:</strong> {selectedBankData.correspondentBank}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer Amount ({currency}) *
                </label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                  Transfer Purpose/Reference *
                </label>
                <input
                  type="text"
                  id="reference"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="International wire transfer"
                  required
                />
              </div>

              {/* Urgency */}
              <div>
                <label htmlFor="urgency" className="block text-sm font-medium text-gray-700 mb-1">
                  Processing Priority
                </label>
                <select
                  id="urgency"
                  value={urgency}
                  onChange={e => setUrgency(e.target.value as 'STANDARD' | 'EXPRESS' | 'PRIORITY')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="STANDARD">Standard (1 business day) - Low fees</option>
                  <option value="EXPRESS">Express (4 hours) - Medium fees</option>
                  <option value="PRIORITY">Priority (1 hour) - High fees</option>
                </select>
                {amount && (
                  <div className="mt-2 text-xs text-gray-600">
                    Estimated fee: {currency}{' '}
                    {urgency === 'STANDARD'
                      ? Math.max(25, parseFloat(amount || '0') * 0.001).toFixed(2)
                      : urgency === 'EXPRESS'
                        ? Math.max(50, parseFloat(amount || '0') * 0.002).toFixed(2)
                        : Math.max(100, parseFloat(amount || '0') * 0.003).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                }`}
              >
                {submitting ? (
                  <>
                    <Clock className="animate-spin h-4 w-4 mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Simulate Wire Transfer
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
              No transfers simulated yet. Use the form to simulate a wire transfer.
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
                        {result.success ? 'Wire Transfer Successful' : 'Wire Transfer Failed'}
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
                            <strong>Wire Reference:</strong> {result.wireTransactionId}
                          </div>
                          {result.fees && (
                            <div>
                              <strong>Wire Fees:</strong> {result.fees}
                            </div>
                          )}
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
          Available International Banks ({INTERNATIONAL_BANKS.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {INTERNATIONAL_BANKS.map(bank => (
            <div key={bank.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-gray-900 truncate">{bank.name}</div>
                <span className="text-xs font-medium px-2 py-1 bg-red-100 text-red-800 rounded">
                  {bank.bankType}
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-1">
                {bank.city}, {bank.country}
              </div>
              <div className="text-xs font-mono text-gray-600 mb-1">{bank.swiftCode}</div>
              <div className="text-xs text-gray-500">{bank.currencies.join(', ')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Wire Transfer Simulation</h3>
        <div className="text-sm text-blue-700 space-y-2">
          <p>
            • <strong>Standard Processing:</strong> Typical wire transfers that settle in 1 business
            day
          </p>
          <p>
            • <strong>Express Processing:</strong> Expedited processing with settlement in
            approximately 4 hours
          </p>
          <p>
            • <strong>Priority Processing:</strong> Urgent transfers with 1-hour settlement window
          </p>
          <p>
            • <strong>Multi-Currency:</strong> Supports major global currencies (USD, EUR, GBP, JPY,
            etc.)
          </p>
          <p>
            • <strong>Correspondent Banking:</strong> Simulates correspondent bank relationships for
            international routing
          </p>
          <p>
            • <strong>Fees:</strong> Variable fees based on transfer amount and processing priority
          </p>
          <p>
            • <strong>Success Rate:</strong> 95% success rate to simulate real-world wire transfer
            reliability
          </p>
        </div>
      </div>
    </div>
  );
}
