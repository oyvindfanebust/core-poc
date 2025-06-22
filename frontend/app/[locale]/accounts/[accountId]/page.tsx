'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ProtectedLayout } from '@/components/protected-layout';
import { accountsApi, Account, Balance } from '@/lib/api';
import { ArrowLeft, CreditCard, TrendingUp, Download, Send } from 'lucide-react';
import Link from 'next/link';

export default function AccountDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const accountId = params.accountId as string;
  const t = useTranslations('accountDetails');
  const tCommon = useTranslations('common');
  
  const [account, setAccount] = useState<Account | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
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
              <div className="flex-shrink-0">
                {getAccountIcon(account.accountType)}
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {t(`accountType.${account.accountType}`)}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t('accountId')}: {account.accountId}
                </p>
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
          <div className="text-center py-8 text-gray-500">
            <p>{t('transactionHistoryComingSoon')}</p>
            <p className="text-sm mt-2">
              {t('transactionHistoryDescription')}
            </p>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}