'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedLayout } from '@/components/protected-layout';
import { accountsApi, CreateAccountRequest } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const createAccountSchema = z.object({
  type: z.enum(['DEPOSIT', 'LOAN', 'CREDIT']),
  currency: z.enum(['USD', 'EUR', 'GBP', 'NOK', 'SEK', 'DKK', 'JPY', 'CAD', 'AUD', 'CHF']),
  initialBalance: z.string().optional(),
});

type FormData = z.infer<typeof createAccountSchema>;

export default function CreateAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      type: 'DEPOSIT',
      currency: 'USD',
    },
  });

  const accountType = watch('type');

  const onSubmit = async (data: FormData) => {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
      router.push('/');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: CreateAccountRequest = {
        ...data,
        customerId,
      };

      if (data.initialBalance) {
        // Convert dollars to cents
        const cents = Math.round(parseFloat(data.initialBalance) * 100);
        request.initialBalance = cents.toString();
      }

      const result = await accountsApi.createAccount(request);
      
      // Redirect to dashboard after successful creation
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Failed to create account:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Account</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Account Type
              </label>
              <select
                {...register('type')}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="DEPOSIT">Deposit Account</option>
                <option value="LOAN" disabled>Loan Account (Coming Soon)</option>
                <option value="CREDIT" disabled>Credit Account (Coming Soon)</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                Currency
              </label>
              <select
                {...register('currency')}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="NOK">NOK - Norwegian Krone</option>
                <option value="SEK">SEK - Swedish Krona</option>
                <option value="DKK">DKK - Danish Krone</option>
                <option value="JPY">JPY - Japanese Yen</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="CHF">CHF - Swiss Franc</option>
              </select>
              {errors.currency && (
                <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
              )}
            </div>

            {accountType === 'DEPOSIT' && (
              <div>
                <label htmlFor="initialBalance" className="block text-sm font-medium text-gray-700">
                  Initial Balance (Optional)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    {...register('initialBalance')}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Enter an amount to deposit when creating the account
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
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
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedLayout>
  );
}