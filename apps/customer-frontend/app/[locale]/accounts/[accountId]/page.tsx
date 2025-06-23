'use client';

import {
  ArrowLeft,
  CreditCard,
  TrendingUp,
  Download,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { ProtectedLayout } from '@/components/protected-layout';
import { ToggleableId } from '@/components/ToggleableId';
import { accountsApi, Account, Balance, Transaction } from '@/lib/api';

export default function AccountDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.accountId as string;
  const t = useTranslations('accountDetails');
  const tCommon = useTranslations('common');

  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
      router.push('/');
      return;
    }

    loadAccountDetails(customerId);
  }, [router, accountId]);

  const loadAccountDetails = async (customerId: string) => {
    try {
      setLoading(true);

      // Load customer accounts to find this specific account
      const accounts = await accountsApi.getAccountsByCustomer(customerId);
      const currentAccount = accounts.find(acc => acc.accountId === accountId);

      if (!currentAccount) {
        setError(t('errors.notFound'));
        return;
      }

      setAccount(currentAccount);

      // Load balance
      const accountBalance = await accountsApi.getAccountBalance(accountId);
      setBalance(accountBalance);

      // Load transactions
      setTransactionsLoading(true);
      try {
        const accountTransactions = await accountsApi.getAccountTransactions(accountId, 20);
        setTransactions(accountTransactions);
      } catch (transactionError) {
        console.error('Failed to load transactions:', transactionError);
        // Don't fail the whole page if transactions fail
      } finally {
        setTransactionsLoading(false);
      }
    } catch (err) {
      console.error('Failed to load account details:', err);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string, currency: string) => {
    const value = parseFloat(amount) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <CreditCard className="h-8 w-8 text-blue-600" />;
      case 'LOAN':
        return <TrendingUp className="h-8 w-8 text-orange-600" />;
      case 'CREDIT':
        return <CreditCard className="h-8 w-8 text-purple-600" />;
      default:
        return <CreditCard className="h-8 w-8 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTransactionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTransactionTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionDirection = (transaction: Transaction): 'incoming' | 'outgoing' => {
    return transaction.toAccountId === accountId ? 'incoming' : 'outgoing';
  };

  const getTransactionDisplayName = (transaction: Transaction): string => {
    const direction = getTransactionDirection(transaction);
    if (direction === 'incoming') {
      return transaction.fromAccountName || `Account ${transaction.fromAccountId}`;
    } else {
      return transaction.toAccountName || `Account ${transaction.toAccountId}`;
    }
  };

  if (loading) {
    return (
      <ProtectedLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">{tCommon('loadingDetails')}</div>
        </div>
      </ProtectedLayout>
    );
  }

  if (error || !account) {
    return (
      <ProtectedLayout>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link
              href="/accounts"
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('backToAccounts')}
            </Link>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error || t('errors.notFound')}
          </div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/accounts"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('backToAccounts')}
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <div className="flex-shrink-0">{getAccountIcon(account.accountType)}</div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {t(`accountType.${account.accountType}`)}
                </h1>
                <div className="text-sm text-gray-500 mt-1 flex items-center">
                  <span className="mr-2">{t('accountId')}:</span>
                  <ToggleableId id={account.accountId} type="account" className="text-sm" />
                </div>
                <p className="text-sm text-gray-500">
                  {t('currency')}: {account.currency}
                </p>
                <p className="text-sm text-gray-500">
                  {t('created')}: {formatDate(account.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {account.accountType === 'DEPOSIT' && (
                <Link
                  href="/transfer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {t('transferButton')}
                </Link>
              )}
            </div>
          </div>
        </div>

        {balance && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="rounded-md bg-blue-50 p-3">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t('currentBalance')}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {formatCurrency(balance.balance, account.currency)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="rounded-md bg-green-50 p-3">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t('totalCredits')}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {formatCurrency(balance.credits, account.currency)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="rounded-md bg-red-50 p-3">
                      <Download className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t('totalDebits')}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {formatCurrency(balance.debits, account.currency)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('transactionHistory')}</h2>

          {transactionsLoading ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-gray-500">{tCommon('loadingTransactions')}</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('noTransactions')}</p>
              <p className="text-sm mt-2">{t('noTransactionsDescription')}</p>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {transactions.map(transaction => {
                  const direction = getTransactionDirection(transaction);
                  const isIncoming = direction === 'incoming';
                  const displayName = getTransactionDisplayName(transaction);

                  return (
                    <li key={transaction.transferId} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div
                            className={`rounded-full p-2 ${
                              isIncoming ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {isIncoming ? (
                              <ArrowDownLeft className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {transaction.description ||
                                  (isIncoming ? t('receivedFrom') : t('sentTo'))}{' '}
                                {displayName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {formatTransactionDate(transaction.createdAt)} •{' '}
                                {formatTransactionTime(transaction.createdAt)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p
                                className={`text-sm font-medium ${
                                  isIncoming ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {isIncoming ? '+' : '-'}
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </p>
                              <div className="text-xs text-gray-500">
                                <ToggleableId
                                  id={transaction.transferId}
                                  type="transaction"
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}
