'use client';

import { ArrowLeft, Banknote, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

// eslint-disable-next-line import/no-unresolved
import { coreApiClient, LoanDisbursementRequest, LoanFundingStatus } from '@/lib/core-api-client';

interface AccountDetails {
  accountId: string;
  accountName: string;
  accountType: string;
  currency: string;
  balance?: number;
}

export default function LoanFundingPage() {
  const [formData, setFormData] = useState({
    customerIdForLoans: 'CUSTOMER-ABC-123', // Default test customer
    selectedLoanId: '',
    targetAccountId: '',
    amount: '',
    description: 'Loan disbursement',
  });
  const [customerAccounts, setCustomerAccounts] = useState<AccountDetails[]>([]);
  const [loanAccounts, setLoanAccounts] = useState<AccountDetails[]>([]);
  const [depositAccounts, setDepositAccounts] = useState<AccountDetails[]>([]);
  const [loanStatus, setLoanStatus] = useState<LoanFundingStatus | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingLoanStatus, setLoadingLoanStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    transferId?: string;
  } | null>(null);

  // Load accounts for default customer on mount
  useEffect(() => {
    if (formData.customerIdForLoans) {
      loadCustomerAccounts(formData.customerIdForLoans);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // When customer ID changes, load their accounts
    if (field === 'customerIdForLoans' && value.trim()) {
      loadCustomerAccounts(value.trim());
    }

    // When loan is selected, load its status
    if (field === 'selectedLoanId' && value) {
      loadLoanStatus(value);
    }
  };

  const loadCustomerAccounts = async (customerId: string) => {
    try {
      setLoadingAccounts(true);
      setResult(null);
      const accounts = await coreApiClient.getCustomerAccounts(customerId);

      // Separate loan and deposit accounts
      const loans = accounts.filter(account => account.accountType === 'LOAN');
      const deposits = accounts.filter(
        account =>
          account.accountType === 'DEPOSIT' &&
          ['EUR', 'NOK', 'SEK', 'DKK'].includes(account.currency),
      );

      setCustomerAccounts(accounts);
      setLoanAccounts(loans);
      setDepositAccounts(deposits);

      // Reset selections when customer changes
      setFormData(prev => ({
        ...prev,
        selectedLoanId: '',
        targetAccountId: '',
      }));
      setLoanStatus(null);

      if (loans.length === 0) {
        setResult({
          success: false,
          message: `Customer ${customerId} has no loan accounts available for disbursement.`,
        });
      } else if (deposits.length === 0) {
        setResult({
          success: false,
          message: `Customer ${customerId} has no deposit accounts to receive loan disbursement.`,
        });
      }
    } catch (error) {
      console.error('Failed to load customer accounts:', error);
      setCustomerAccounts([]);
      setLoanAccounts([]);
      setDepositAccounts([]);
      setResult({
        success: false,
        message: `Failed to load accounts for customer ${customerId}. Make sure the customer exists.`,
      });
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadLoanStatus = async (loanId: string) => {
    try {
      setLoadingLoanStatus(true);
      const status = await coreApiClient.getLoanFundingStatus(loanId);
      setLoanStatus(status);
    } catch (error) {
      console.error('Failed to load loan status:', error);
      setLoanStatus(null);
      setResult({
        success: false,
        message: `Failed to load loan status for loan ${loanId}.`,
      });
    } finally {
      setLoadingLoanStatus(false);
    }
  };

  const formatAccountDisplay = (account: AccountDetails): string => {
    const name = account.accountName || 'Unnamed Account';
    const currency = account.currency;
    const id = account.accountId;
    const shortId = id.length > 16 ? `${id.substring(0, 8)}...${id.substring(id.length - 8)}` : id;
    return `${name} (${currency}) - ${shortId}`;
  };

  const formatAmount = (amountStr: string): string => {
    const amount = parseFloat(amountStr);
    // API returns amounts in cents, so we need to convert to currency units
    return (amount / 100).toFixed(2);
  };

  const disburseLoan = async () => {
    if (!formData.selectedLoanId || !formData.targetAccountId) {
      setResult({ success: false, message: 'Please select both a loan and target account' });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const disbursementRequest: LoanDisbursementRequest = {
        targetAccountId: formData.targetAccountId,
        amount: formData.amount
          ? Math.round(parseFloat(formData.amount) * 100).toString()
          : undefined,
        description: formData.description || undefined,
      };

      const response = await coreApiClient.disburseLoan(
        formData.selectedLoanId,
        disbursementRequest,
      );

      setResult({
        success: response.status === 'SUCCESS',
        message:
          response.status === 'SUCCESS'
            ? `Loan disbursement successful! Disbursed ${formatAmount(response.disbursedAmount)} to account.`
            : `Loan disbursement failed: ${response.errorDetails?.message || 'Unknown error'}`,
        transferId: response.transferId,
      });

      // Reset form on success
      if (response.status === 'SUCCESS') {
        setFormData(prev => ({
          ...prev,
          targetAccountId: '',
          amount: '',
        }));
        // Reload loan status
        if (formData.selectedLoanId) {
          loadLoanStatus(formData.selectedLoanId);
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to disburse loan',
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
          <Banknote className="h-6 w-6 text-purple-600 mr-2" />
          <h1 className="text-2xl font-bold text-gray-900">Loan Funding & Disbursement</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Loan Selection */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Select Loan to Disburse</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID</label>
                <input
                  type="text"
                  value={formData.customerIdForLoans}
                  onChange={e => handleInputChange('customerIdForLoans', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="CUSTOMER-ABC-123"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Loan Account *</label>
                  {formData.customerIdForLoans && (
                    <button
                      type="button"
                      onClick={() => loadCustomerAccounts(formData.customerIdForLoans)}
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
                    Loading loan accounts...
                  </div>
                ) : loanAccounts.length > 0 ? (
                  <select
                    value={formData.selectedLoanId}
                    onChange={e => handleInputChange('selectedLoanId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a loan account</option>
                    {loanAccounts.map(account => (
                      <option key={account.accountId} value={account.accountId}>
                        {formatAccountDisplay(account)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <div className="text-gray-500 text-sm">
                      {formData.customerIdForLoans
                        ? 'No loan accounts found for this customer'
                        : 'Enter a customer ID to load their loan accounts'}
                    </div>
                  </div>
                )}
              </div>

              {/* Loan Status Display */}
              {formData.selectedLoanId && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Loan Details</h3>
                  {loadingLoanStatus ? (
                    <div className="text-gray-500 text-sm">Loading loan details...</div>
                  ) : loanStatus ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Principal:</span>{' '}
                        {formatAmount(loanStatus.principalAmount)}
                      </div>
                      <div>
                        <span className="text-gray-500">Monthly Payment:</span>{' '}
                        {formatAmount(loanStatus.monthlyPayment)}
                      </div>
                      <div>
                        <span className="text-gray-500">Interest Rate:</span>{' '}
                        {loanStatus.interestRate}%
                      </div>
                      <div>
                        <span className="text-gray-500">Payments Left:</span>{' '}
                        {loanStatus.remainingPayments}
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span> {loanStatus.loanType}
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span> {loanStatus.status}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Failed to load loan details</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Disbursement Details */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Disbursement Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Deposit Account *
                </label>
                {depositAccounts.length > 0 ? (
                  <select
                    value={formData.targetAccountId}
                    onChange={e => handleInputChange('targetAccountId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select account to receive funds</option>
                    {depositAccounts.map(account => (
                      <option key={account.accountId} value={account.accountId}>
                        {formatAccountDisplay(account)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                    <div className="text-gray-500 text-sm">
                      {formData.customerIdForLoans
                        ? 'No deposit accounts found for this customer'
                        : 'Load a customer to see their deposit accounts'}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={e => handleInputChange('amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Leave empty for full loan balance"
                />
                <div className="text-xs text-gray-500 mt-1">
                  If not specified, the entire loan balance will be disbursed
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => handleInputChange('description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Loan disbursement description"
                  maxLength={200}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={disburseLoan}
            disabled={loading || !formData.selectedLoanId || !formData.targetAccountId}
            className="inline-flex items-center px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Disburse Loan Funds'}
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

        {/* Summary Stats */}
        {loanAccounts.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Account Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Loan Accounts:</span> {loanAccounts.length}
              </div>
              <div>
                <span className="text-gray-500">Deposit Accounts:</span> {depositAccounts.length}
              </div>
              <div>
                <span className="text-gray-500">Total Accounts:</span> {customerAccounts.length}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
