'use client';

import { CreditCard, TrendingUp, ArrowUpRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { ProtectedLayout } from '@/components/protected-layout';
import { getAccountShortName, maskAccountId } from '@/lib/account-utils';
import { accountsApi, Account, Balance } from '@/lib/api';

interface AccountWithBalance extends Account {
  balance?: Balance;
}

export default function DashboardPage() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
      router.push('/');
      return;
    }

    loadAccounts(customerId);
  }, [router]);

  const loadAccounts = async (customerId: string) => {
    try {
      setLoading(true);
      const accountList = await accountsApi.getAccountsByCustomer(customerId);

      // Load balances for each account
      const accountsWithBalances = await Promise.all(
        accountList.map(async account => {
          try {
            const balance = await accountsApi.getAccountBalance(account.accountId);
            return { ...account, balance };
          } catch (err) {
            console.error(`Failed to load balance for account ${account.accountId}:`, err);
            return account;
          }
        }),
      );

      setAccounts(accountsWithBalances);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError(t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string, currency: string) => {
    const value = parseFloat(amount) / 100; // Convert cents to dollars
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
        return <CreditCard className="h-6 w-6 text-blue-600" />;
      case 'LOAN':
        return <TrendingUp className="h-6 w-6 text-orange-600" />;
      case 'CREDIT':
        return <CreditCard className="h-6 w-6 text-purple-600" />;
      default:
        return <CreditCard className="h-6 w-6 text-gray-600" />;
    }
  };

  const getTotalBalance = () => {
    return accounts.reduce((total, account) => {
      if (account.balance && account.accountType === 'DEPOSIT') {
        return total + parseFloat(account.balance.balance);
      }
      return total;
    }, 0);
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <Link
            href="/create-account"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('createAccount')}
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">{tCommon('loading')}</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noAccounts')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('noAccountsDescription')}</p>
            <div className="mt-6">
              <Link
                href="/create-account"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('createAccount')}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-2">{t('totalBalance')}</h2>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(getTotalBalance().toString(), 'USD')}
              </p>
              <p className="text-sm text-gray-500 mt-1">{t('totalBalanceDescription')}</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map(account => (
                <Link
                  key={account.accountId}
                  href={`/accounts/${account.accountId}`}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">{getAccountIcon(account.accountType)}</div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {getAccountShortName(account)}
                          </dt>
                          <dd className="flex items-baseline">
                            <div className="text-2xl font-semibold text-gray-900">
                              {account.balance
                                ? formatCurrency(account.balance.balance, account.currency)
                                : formatCurrency('0', account.currency)}
                            </div>
                          </dd>
                        </dl>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-gray-500">
                        {maskAccountId(account.accountId)} • {account.currency}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </ProtectedLayout>
  );
}
