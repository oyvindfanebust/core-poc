'use client';

import { ArrowLeft, Send, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

import { generateIBAN, getBanksByCurrency, MockBank } from '@/config/mock-banks';
import { coreApiClient, SEPATransferRequest } from '@/lib/core-api-client';

export default function IncomingTransfersPage() {
  const [selectedBank, setSelectedBank] = useState<MockBank | null>(null);
  const [formData, setFormData] = useState({
    targetCustomerId: 'CUSTOMER-ABC-123', // Default test customer
    targetAccountId: '',
    amount: '',
    recipientName: '',
    transferMessage: 'Test incoming SEPA transfer from mock bank',
    urgency: 'STANDARD' as 'STANDARD' | 'EXPRESS' | 'INSTANT',
  });
  const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    transferId?: string;
  } | null>(null);

  // Load accounts for default customer on mount
  useEffect(() => {
    if (formData.targetCustomerId) {
      loadCustomerAccounts(formData.targetCustomerId);
    }
  }, []);

  const handleBankSelect = (bank: MockBank) => {
    setSelectedBank(bank);
    setFormData(prev => ({
      ...prev,
      recipientName: `${bank.name} Test Transfer`,
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // When customer ID changes, load their accounts
    if (field === 'targetCustomerId' && value.trim()) {
      loadCustomerAccounts(value.trim());
    }
  };

  const loadCustomerAccounts = async (customerId: string) => {
    try {
      setLoadingAccounts(true);
      setResult(null); // Clear previous results
      const accounts = await coreApiClient.getCustomerAccounts(customerId);

      // Filter to only SEPA-compatible currencies and deposit accounts
      const sepaAccounts = accounts.filter(
        account =>
          account.accountType === 'DEPOSIT' &&
          ['EUR', 'NOK', 'SEK', 'DKK'].includes(account.currency),
      );

      setCustomerAccounts(sepaAccounts);

      // Reset selected account when customer changes
      setFormData(prev => ({ ...prev, targetAccountId: '' }));

      if (sepaAccounts.length === 0 && accounts.length > 0) {
        setResult({
          success: false,
          message: `Customer ${customerId} has ${accounts.length} account(s) but none are SEPA-compatible (deposit accounts with EUR/NOK/SEK/DKK currency).`,
        });
      }
    } catch (error) {
      console.error('Failed to load customer accounts:', error);
      setCustomerAccounts([]);
      setResult({
        success: false,
        message: `Failed to load accounts for customer ${customerId}. Make sure the customer exists and the Core API is running.`,
      });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const formatAccountDisplay = (account: any): string => {
    const name = account.accountName || 'Unnamed Account';
    const currency = account.currency;
    const id = account.accountId;
    // Truncate long account IDs for better readability
    const shortId = id.length > 16 ? `${id.substring(0, 8)}...${id.substring(id.length - 8)}` : id;
    return `${name} (${currency}) - ${shortId}`;
  };

  const simulateIncomingTransfer = async () => {
    if (!selectedBank || !formData.targetAccountId || !formData.amount || !formData.recipientName) {
      setResult({ success: false, message: 'Please fill in all required fields' });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      // Generate a realistic IBAN for the mock bank
      const senderIBAN = generateIBAN(selectedBank);

      // Create the SEPA transfer request (simulating incoming transfer)
      const transferRequest: SEPATransferRequest = {
        accountId: formData.targetAccountId,
        amount: formData.amount,
        currency: selectedBank.currency,
        bankInfo: {
          iban: senderIBAN,
          bic: selectedBank.bic,
          bankName: selectedBank.name,
          recipientName: formData.recipientName,
          country: selectedBank.countryCode,
        },
        description: formData.transferMessage,
        urgency: formData.urgency,
      };

      const response = await coreApiClient.createIncomingSEPATransfer(transferRequest);

      setResult({
        success: true,
        message: `Incoming transfer simulated successfully! Status: ${response.status}`,
        transferId: response.transferId,
      });

      // Reset form
      setFormData(prev => ({
        ...prev,
        targetAccountId: '',
        amount: '',
        recipientName: `${selectedBank.name} Test Transfer`,
      }));
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to simulate transfer',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="flex items-center mb-6">
          <Send className="h-6 w-6 text-green-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Simulate Incoming SEPA Transfer</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bank Selection */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Select Sending Bank</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {['EUR', 'NOK', 'SEK', 'DKK'].map(currency => (
                <div key={currency}>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">{currency} Banks</h3>
                  {getBanksByCurrency(currency as any).map(bank => (
                    <button
                      key={bank.id}
                      onClick={() => handleBankSelect(bank)}
                      className={`w-full text-left p-3 border rounded-lg transition-colors ${
                        selectedBank?.id === bank.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{bank.name}</div>
                          <div className="text-sm text-gray-500">
                            {bank.country} • {bank.bic}
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {bank.currency}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Transfer Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Customer ID
                </label>
                <input
                  type="text"
                  value={formData.targetCustomerId}
                  onChange={e => handleInputChange('targetCustomerId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="CUSTOMER-ABC-123"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Target Account ID *
                  </label>
                  {formData.targetCustomerId && (
                    <button
                      type="button"
                      onClick={() => loadCustomerAccounts(formData.targetCustomerId)}
                      disabled={loadingAccounts}
                      className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3 w-3 mr-1 ${loadingAccounts ? 'animate-spin' : ''}`}
                      />
                      Refresh
                    </button>
                  )}
                </div>
                {loadingAccounts ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500">
                    Loading accounts...
                  </div>
                ) : customerAccounts.length > 0 ? (
                  <select
                    value={formData.targetAccountId}
                    onChange={e => handleInputChange('targetAccountId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select an account to receive funds</option>
                    {customerAccounts.map(account => (
                      <option key={account.accountId} value={account.accountId}>
                        {formatAccountDisplay(account)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <div className="text-gray-500 text-sm">
                      {formData.targetCustomerId
                        ? 'No SEPA-compatible accounts found for this customer'
                        : 'Enter a customer ID to load their accounts'}
                    </div>
                  </div>
                )}
                {customerAccounts.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    Showing {customerAccounts.length} SEPA-compatible deposit account(s)
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({selectedBank?.currency || 'Currency'}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => handleInputChange('amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name *
                </label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={e => handleInputChange('recipientName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Recipient name for the transfer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer Message
                </label>
                <input
                  type="text"
                  value={formData.transferMessage}
                  onChange={e => handleInputChange('transferMessage', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Transfer description"
                  maxLength={140}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <select
                  value={formData.urgency}
                  onChange={e => handleInputChange('urgency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="STANDARD">Standard (1-2 business days)</option>
                  <option value="EXPRESS">Express (Same day)</option>
                  <option value="INSTANT">Instant (Real-time)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Summary */}
        {(selectedBank || formData.targetAccountId) && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Transfer Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {selectedBank && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Sending Bank</h4>
                  <div>
                    <span className="text-gray-500">Bank:</span> {selectedBank.name}
                  </div>
                  <div>
                    <span className="text-gray-500">Country:</span> {selectedBank.country}
                  </div>
                  <div>
                    <span className="text-gray-500">BIC:</span> {selectedBank.bic}
                  </div>
                  <div>
                    <span className="text-gray-500">Currency:</span> {selectedBank.currency}
                  </div>
                </div>
              )}
              {formData.targetAccountId && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-700">Receiving Account</h4>
                  {(() => {
                    const account = customerAccounts.find(
                      acc => acc.accountId === formData.targetAccountId,
                    );
                    return account ? (
                      <>
                        <div>
                          <span className="text-gray-500">Name:</span>{' '}
                          {account.accountName || 'Unnamed Account'}
                        </div>
                        <div>
                          <span className="text-gray-500">Currency:</span> {account.currency}
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span> {account.accountType}
                        </div>
                        <div>
                          <span className="text-gray-500">ID:</span>{' '}
                          <span className="font-mono text-xs">{account.accountId}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500">Account details loading...</div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={simulateIncomingTransfer}
            disabled={loading || !selectedBank}
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Simulate Incoming Transfer'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mt-6 p-4 rounded-lg border ${
              result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              <div className={result.success ? 'text-green-700' : 'text-red-700'}>
                {result.message}
                {result.transferId && (
                  <div className="text-sm mt-1">Transfer ID: {result.transferId}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
