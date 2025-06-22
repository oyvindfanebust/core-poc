'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ProtectedLayout } from '@/components/protected-layout';
import { accountsApi, Account, Balance } from '@/lib/api';
import { formatAccountDisplayName, maskAccountId } from '@/lib/account-utils';
import { CreditCard, TrendingUp, ArrowRight, Edit2, Check, X } from 'lucide-react';
import Link from 'next/link';

interface AccountWithBalance extends Account {
  balance?: Balance;
}

export default function AccountsPage() {
  const router = useRouter();
  const t = useTranslations('accounts');
  const tCommon = useTranslations('common');
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

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
        accountList.map(async (account) => {
          try {
            const balance = await accountsApi.getAccountBalance(account.accountId);
            return { ...account, balance };
          } catch (err) {
            console.error(`Failed to load balance for account ${account.accountId}:`, err);
            return account;
          }
        })
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
    const value = parseFloat(amount) / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const handleStartEdit = (account: AccountWithBalance) => {
    setEditingAccountId(account.accountId);
    setEditingName(account.accountName || '');
  };

  const handleSaveEdit = async (accountId: string) => {
    try {
      await accountsApi.updateAccountName(accountId, editingName.trim() || null);
      
      // Update local state
      setAccounts(prev => prev.map(account => 
        account.accountId === accountId 
          ? { ...account, accountName: editingName.trim() || undefined }
          : account
      ));
      
      setEditingAccountId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to update account name:', error);
      // Could add a toast notification here
    }
  };

  const handleCancelEdit = () => {
    setEditingAccountId(null);
    setEditingName('');
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

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">{tCommon('loading')}</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noAccounts')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('noAccountsDescription')}</p>
            <div className="mt-6">
              <Link
                href="/create-account"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                {t('createFirst')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {accounts.map((account) => (
                <li key={account.accountId}>
                  <Link
                    href={`/accounts/${account.accountId}`}
                    className="block hover:bg-gray-50"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {getAccountIcon(account.accountType)}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                {editingAccountId === account.accountId ? (
                                  <div className="flex items-center space-x-2">
                                    <input
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      className="text-sm font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder={t('accountNamePlaceholder')}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveEdit(account.accountId);
                                        if (e.key === 'Escape') handleCancelEdit();
                                      }}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleSaveEdit(account.accountId);
                                      }}
                                      className="text-green-600 hover:text-green-700"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCancelEdit();
                                      }}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatAccountDisplayName(account)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleStartEdit(account);
                                      }}
                                      className="text-gray-400 hover:text-gray-600"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                                <div className="text-sm text-gray-500">
                                  {tCommon('currency')}: {account.currency}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="text-right mr-4">
                            <div className="text-lg font-medium text-gray-900">
                              {account.balance
                                ? formatCurrency(account.balance.balance, account.currency)
                                : formatCurrency('0', account.currency)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {t('currentBalance')}
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}