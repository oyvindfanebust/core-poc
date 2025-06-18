'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { accountsApi, transfersApi, Account, TransferRequest } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Send, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const transferSchema = z.object({
  fromAccountId: z.string().min(1, 'Please select a source account'),
  toAccountId: z.string().min(1, 'Please select a destination account'),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than 0'),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination accounts must be different",
  path: ["toAccountId"],
});

type FormData = z.infer<typeof transferSchema>;

export default function TransferPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(transferSchema),
  });

  const fromAccountId = watch('fromAccountId');
  const toAccountId = watch('toAccountId');

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
      setLoadingAccounts(true);
      const accountList = await accountsApi.getAccountsByCustomer(customerId);
      // Filter to only show deposit accounts for transfers
      const depositAccounts = accountList.filter(acc => acc.accountType === 'DEPOSIT');
      setAccounts(depositAccounts);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError('Failed to load accounts. Please try again.');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    const fromAccount = accounts.find(acc => acc.accountId === data.fromAccountId);
    if (!fromAccount) return;

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Convert dollars to cents
      const cents = Math.round(parseFloat(data.amount) * 100);

      const request: TransferRequest = {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: cents.toString(),
        currency: fromAccount.currency,
      };

      await transfersApi.createTransfer(request);
      
      setSuccess(true);
      reset();
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Failed to create transfer:', err);
      setError(err.message || 'Failed to process transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatAccountOption = (account: Account) => {
    return `${account.accountType} Account - ${account.currency} (ID: ${account.accountId})`;
  };

  if (loadingAccounts) {
    return (
      <ProtectedLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading accounts...</div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-6">
            <Send className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">Transfer Money</h1>
          </div>

          {accounts.length < 2 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                You need at least two accounts to make a transfer.
              </p>
              <Link
                href="/create-account"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Create Another Account
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="fromAccountId" className="block text-sm font-medium text-gray-700">
                  From Account
                </label>
                <select
                  {...register('fromAccountId')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Select source account</option>
                  {accounts.map((account) => (
                    <option key={account.accountId} value={account.accountId}>
                      {formatAccountOption(account)}
                    </option>
                  ))}
                </select>
                {errors.fromAccountId && (
                  <p className="mt-1 text-sm text-red-600">{errors.fromAccountId.message}</p>
                )}
              </div>

              {fromAccountId && toAccountId && (
                <div className="flex justify-center">
                  <ArrowRight className="h-6 w-6 text-gray-400" />
                </div>
              )}

              <div>
                <label htmlFor="toAccountId" className="block text-sm font-medium text-gray-700">
                  To Account
                </label>
                <select
                  {...register('toAccountId')}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">Select destination account</option>
                  {accounts
                    .filter((account) => account.accountId !== fromAccountId)
                    .map((account) => (
                      <option key={account.accountId} value={account.accountId}>
                        {formatAccountOption(account)}
                      </option>
                    ))}
                </select>
                {errors.toAccountId && (
                  <p className="mt-1 text-sm text-red-600">{errors.toAccountId.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    {...register('amount')}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  Transfer completed successfully! Redirecting to dashboard...
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Transfer Money'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ProtectedLayout>
  );
}