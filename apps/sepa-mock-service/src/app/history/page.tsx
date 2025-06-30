'use client';

import {
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';

interface TransactionRecord {
  id: string;
  type: 'SEPA_INCOMING' | 'SEPA_OUTGOING' | 'ACH_CREDIT' | 'WIRE_TRANSFER' | 'LOAN_DISBURSEMENT';
  accountId: string;
  accountName: string;
  amount: number;
  currency: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'PROCESSING';
  originBank: string;
  originBankCode: string; // IBAN, Routing Number, or SWIFT
  reference: string;
  timestamp: string;
  settlementDate?: string;
  transactionId: string;
  fees?: number;
  urgency: 'STANDARD' | 'EXPRESS' | 'PRIORITY' | 'INSTANT' | 'SAME_DAY';
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTransactionHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTransactionHistory = () => {
    setLoading(true);

    // Since this is a mock service, we'll generate sample transaction history
    // In a real implementation, this would fetch from an API or local storage
    const mockTransactions: TransactionRecord[] = generateMockTransactions();

    setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 1000);
  };

  const generateMockTransactions = (): TransactionRecord[] => {
    const types: TransactionRecord['type'][] = [
      'SEPA_INCOMING',
      'SEPA_OUTGOING',
      'ACH_CREDIT',
      'WIRE_TRANSFER',
      'LOAN_DISBURSEMENT',
    ];
    const statuses: TransactionRecord['status'][] = [
      'COMPLETED',
      'PENDING',
      'FAILED',
      'PROCESSING',
    ];
    const currencies = ['EUR', 'USD', 'GBP', 'NOK', 'SEK', 'DKK', 'CHF', 'JPY', 'CAD', 'AUD'];
    const urgencies: TransactionRecord['urgency'][] = [
      'STANDARD',
      'EXPRESS',
      'PRIORITY',
      'INSTANT',
      'SAME_DAY',
    ];

    const banks = [
      { name: 'Deutsche Bank AG', code: 'DEUTDEFF' },
      { name: 'JPMorgan Chase Bank', code: 'CHASUS33' },
      { name: 'BNP Paribas', code: 'BNPAFRPP' },
      { name: 'Bank of America', code: '121000358' },
      { name: 'HSBC Bank PLC', code: 'HBUKGB4B' },
      { name: 'Danske Bank A/S', code: 'DABADKKK' },
      { name: 'Wells Fargo Bank', code: '121042882' },
      { name: 'UBS Switzerland AG', code: 'UBSWCHZH' },
    ];

    const transactions: TransactionRecord[] = [];

    for (let i = 0; i < 50; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const currency = currencies[Math.floor(Math.random() * currencies.length)];
      const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
      const bank = banks[Math.floor(Math.random() * banks.length)];

      const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const settlementDate =
        status === 'COMPLETED'
          ? new Date(timestamp.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000)
          : undefined;

      const amount = Math.floor(Math.random() * 50000) + 100; // $1 to $500
      const fees =
        type === 'WIRE_TRANSFER'
          ? Math.floor(amount * 0.001) + 25
          : type === 'ACH_CREDIT'
            ? Math.floor(amount * 0.0005) + 5
            : 0;

      transactions.push({
        id: `TXN-${i.toString().padStart(4, '0')}`,
        type,
        accountId: `ACC-${Math.floor(Math.random() * 999) + 1}`,
        accountName: `Customer Account ${Math.floor(Math.random() * 99) + 1}`,
        amount,
        currency,
        status,
        originBank: bank.name,
        originBankCode: bank.code,
        reference: `${type.replace('_', ' ')} ${i + 1}`,
        timestamp: timestamp.toISOString(),
        settlementDate: settlementDate?.toISOString(),
        transactionId: `${type.slice(0, 3)}-${Date.now() + i}-${Math.random().toString(36).substr(2, 6)}`,
        fees: fees > 0 ? fees : undefined,
        urgency,
      });
    }

    return transactions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  };

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      // Search term filter
      if (
        searchTerm &&
        !txn.reference.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !txn.originBank.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !txn.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !txn.accountName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Type filter
      if (typeFilter !== 'ALL' && txn.type !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && txn.status !== statusFilter) {
        return false;
      }

      // Currency filter
      if (currencyFilter !== 'ALL' && txn.currency !== currencyFilter) {
        return false;
      }

      // Date range filter
      if (dateRange !== 'ALL') {
        const txnDate = new Date(txn.timestamp);
        const now = new Date();

        switch (dateRange) {
          case 'TODAY':
            if (txnDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'WEEK':
            if (now.getTime() - txnDate.getTime() > 7 * 24 * 60 * 60 * 1000) return false;
            break;
          case 'MONTH':
            if (now.getTime() - txnDate.getTime() > 30 * 24 * 60 * 60 * 1000) return false;
            break;
        }
      }

      return true;
    });
  }, [transactions, searchTerm, typeFilter, statusFilter, currencyFilter, dateRange]);

  const getStatusIcon = (status: TransactionRecord['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PENDING':
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: TransactionRecord['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-800 bg-green-100';
      case 'PENDING':
      case 'PROCESSING':
        return 'text-yellow-800 bg-yellow-100';
      case 'FAILED':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const getTypeColor = (type: TransactionRecord['type']) => {
    switch (type) {
      case 'SEPA_INCOMING':
      case 'SEPA_OUTGOING':
        return 'text-blue-800 bg-blue-100';
      case 'ACH_CREDIT':
        return 'text-orange-800 bg-orange-100';
      case 'WIRE_TRANSFER':
        return 'text-red-800 bg-red-100';
      case 'LOAN_DISBURSEMENT':
        return 'text-purple-800 bg-purple-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const exportTransactions = () => {
    const csvContent = [
      [
        'Date',
        'Type',
        'Account',
        'Amount',
        'Currency',
        'Status',
        'Bank',
        'Reference',
        'Transaction ID',
      ].join(','),
      ...filteredTransactions.map(txn =>
        [
          new Date(txn.timestamp).toLocaleDateString(),
          txn.type,
          txn.accountName,
          txn.amount / 100,
          txn.currency,
          txn.status,
          txn.originBank,
          `"${txn.reference}"`,
          txn.transactionId,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaction-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setCurrencyFilter('ALL');
    setDateRange('ALL');
  };

  const uniqueCurrencies = [...new Set(transactions.map(t => t.currency))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center mb-2">
          <Link href="/" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
              <History className="h-8 w-8 mr-3" />
              Transaction History
            </h1>
            <p className="text-lg text-gray-600">
              View and analyze all external transaction simulations
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={loadTransactionHistory}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={exportTransactions}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Total Transactions</div>
          <div className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {filteredTransactions.filter(t => t.status === 'COMPLETED').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {filteredTransactions.filter(t => ['PENDING', 'PROCESSING'].includes(t.status)).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-medium text-gray-500">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {filteredTransactions.filter(t => t.status === 'FAILED').length}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Search & Filter</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by reference, bank name, transaction ID, or account..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="SEPA_INCOMING">SEPA Incoming</option>
                <option value="SEPA_OUTGOING">SEPA Outgoing</option>
                <option value="ACH_CREDIT">ACH Credit</option>
                <option value="WIRE_TRANSFER">Wire Transfer</option>
                <option value="LOAN_DISBURSEMENT">Loan Disbursement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={currencyFilter}
                onChange={e => setCurrencyFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Currencies</option>
                {uniqueCurrencies.map(currency => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today</option>
                <option value="WEEK">Last Week</option>
                <option value="MONTH">Last Month</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Transactions ({filteredTransactions.length})
          </h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin h-6 w-6 text-gray-400 mr-2" />
            <span className="text-gray-500">Loading transaction history...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <AlertCircle className="h-6 w-6 text-red-400 mr-2" />
            <span className="text-red-600">{error}</span>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search terms or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Origin Bank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map(txn => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div>{new Date(txn.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(txn.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(txn.type)}`}
                        >
                          {txn.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{txn.urgency}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{txn.accountName}</div>
                        <div className="text-xs text-gray-500">{txn.accountId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">
                          {txn.currency}{' '}
                          {(txn.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                        {txn.fees && (
                          <div className="text-xs text-gray-500">
                            Fees: {txn.currency} {(txn.fees / 100).toFixed(2)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{txn.originBank}</div>
                        <div className="text-xs font-mono text-gray-500">{txn.originBankCode}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(txn.status)}
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}
                        >
                          {txn.status}
                        </span>
                      </div>
                      {txn.settlementDate && (
                        <div className="text-xs text-gray-500 mt-1">
                          Settled: {new Date(txn.settlementDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{txn.reference}</div>
                        <div className="text-xs font-mono text-gray-500">{txn.transactionId}</div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
