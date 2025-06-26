'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Send, ArrowRight, Globe } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { ProtectedLayout } from '@/components/protected-layout';
import {
  TransferConfirmationDialog,
  TransferSummary,
} from '@/components/transfer-confirmation-dialog';
import {
  formatAccountOption,
  validateBIC,
  formatIBAN,
  isSEPACurrency,
  getCurrencySymbol,
  filterSEPACompatibleAccounts,
  validateSEPAIBANFormat,
  getIBANInfo,
} from '@/lib/account-utils';
import {
  accountsApi,
  transfersApi,
  sepaApi,
  Account,
  TransferRequest,
  SEPATransferRequest,
} from '@/lib/api';

// Transfer type
type TransferType = 'internal' | 'sepa';

// Country options for SEPA
const SEPA_COUNTRIES = [
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'MC', name: 'Monaco' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SM', name: 'San Marino' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
];

// Internal transfer schema
const internalTransferSchema = z
  .object({
    fromAccountId: z.string().min(1, 'Please select a source account'),
    toAccountId: z.string().min(1, 'Please select a destination account'),
    amount: z.string().refine(val => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    }, 'Amount must be greater than 0'),
  })
  .refine(data => data.fromAccountId !== data.toAccountId, {
    message: 'Source and destination accounts must be different',
    path: ['toAccountId'],
  });

// SEPA transfer schema
const sepaTransferSchema = z.object({
  accountId: z.string().min(1, 'Please select an account'),
  amount: z.string().refine(val => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be greater than 0'),
  iban: z
    .string()
    .min(1, 'IBAN is required')
    .refine(
      iban => {
        const validation = validateSEPAIBANFormat(iban);
        return validation.isValid;
      },
      {
        message: 'Invalid IBAN format, checksum, or not within SEPA zone',
      },
    ),
  bic: z
    .string()
    .optional()
    .refine(val => !val || validateBIC(val), 'Invalid BIC format'),
  recipientName: z.string().min(1, 'Recipient name is required').max(100, 'Name too long'),
  bankName: z.string().min(1, 'Bank name is required').max(100, 'Bank name too long'),
  country: z.string().min(2, 'Country is required'),
  transferMessage: z.string().max(140, 'Message too long').optional(),
  urgency: z.enum(['STANDARD', 'EXPRESS', 'INSTANT']).default('STANDARD'),
});

type InternalFormData = z.infer<typeof internalTransferSchema>;
type SEPAFormData = z.infer<typeof sepaTransferSchema>;

export default function TransferPage() {
  const router = useRouter();
  const t = useTranslations('transfer');
  const tCommon = useTranslations('common');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transferSummary, setTransferSummary] = useState<TransferSummary | null>(null);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [transferType, setTransferType] = useState<TransferType>('internal');

  // Form for internal transfers
  const internalForm = useForm<InternalFormData>({
    resolver: zodResolver(internalTransferSchema),
  });

  // Form for SEPA transfers
  const sepaForm = useForm<SEPAFormData>({
    resolver: zodResolver(sepaTransferSchema),
    defaultValues: {
      urgency: 'STANDARD',
    },
  });

  const watchedIBAN = sepaForm.watch('iban');
  const watchedAccountId = sepaForm.watch('accountId');
  const [ibanInfo, setIbanInfo] = useState<ReturnType<typeof getIBANInfo> | null>(null);

  useEffect(() => {
    const customerId = localStorage.getItem('customerId');
    if (!customerId) {
      router.push('/');
      return;
    }

    loadAccounts(customerId);
  }, [router]);

  // Auto-fill country from IBAN and update IBAN info
  useEffect(() => {
    if (watchedIBAN) {
      const info = getIBANInfo(watchedIBAN);
      setIbanInfo(info);

      if (info.isValid && info.isSEPA) {
        const country = SEPA_COUNTRIES.find(c => c.code === info.countryCode);
        if (country) {
          sepaForm.setValue('country', info.countryCode);
        }
      }
    } else {
      setIbanInfo(null);
    }
  }, [watchedIBAN, sepaForm]);

  const loadAccounts = async (customerId: string) => {
    try {
      setLoadingAccounts(true);
      const accountList = await accountsApi.getAccountsByCustomer(customerId);
      // Filter to only show deposit accounts for transfers
      const depositAccounts = accountList.filter(acc => acc.accountType === 'DEPOSIT');
      setAccounts(depositAccounts);
    } catch (err) {
      console.error('Failed to load accounts:', err);
      setError(t('errors.loadFailed'));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const onInternalSubmit = async (data: InternalFormData) => {
    const fromAccount = accounts.find(acc => acc.accountId === data.fromAccountId);
    const toAccount = accounts.find(acc => acc.accountId === data.toAccountId);

    if (!fromAccount || !toAccount) return;

    try {
      setLoadingBalances(true);
      setError(null);

      // Convert to cents based on currency
      const cents = Math.round(parseFloat(data.amount) * 100);

      // Load current balances for both accounts
      const [fromBalance, toBalance] = await Promise.all([
        accountsApi.getAccountBalance(data.fromAccountId),
        accountsApi.getAccountBalance(data.toAccountId),
      ]);

      // Create transfer summary
      const summary: TransferSummary = {
        fromAccount,
        toAccount,
        fromBalance,
        toBalance,
        amount: cents,
        currency: fromAccount.currency,
      };

      setTransferSummary(summary);
      setShowConfirmation(true);
    } catch (err: unknown) {
      console.error('Failed to load account balances:', err);
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoadingBalances(false);
    }
  };

  const onSEPASubmit = async (data: SEPAFormData) => {
    const account = accounts.find(acc => acc.accountId === data.accountId);
    if (!account) return;

    // Validate currency is SEPA compatible
    if (!isSEPACurrency(account.currency)) {
      setError(t('validation.sepaCurrencyOnly'));
      return;
    }

    try {
      setLoadingBalances(true);
      setError(null);

      // Convert to cents
      const cents = Math.round(parseFloat(data.amount) * 100);

      // Load current balance
      const balance = await accountsApi.getAccountBalance(data.accountId);

      // Create SEPA transfer summary - different structure for SEPA
      const summary: TransferSummary & {
        sepaDetails?: {
          iban: string;
          bic?: string;
          recipientName: string;
          bankName: string;
          country: string;
          transferMessage?: string;
          urgency: string;
        };
        transferType: 'sepa';
      } = {
        fromAccount: account,
        toAccount: null, // No destination account for SEPA
        fromBalance: balance,
        toBalance: null,
        amount: cents,
        currency: account.currency as 'EUR' | 'NOK' | 'SEK' | 'DKK',
        transferType: 'sepa',
        sepaDetails: {
          iban: formatIBAN(data.iban),
          bic: data.bic,
          recipientName: data.recipientName,
          bankName: data.bankName,
          country: data.country,
          transferMessage: data.transferMessage,
          urgency: data.urgency,
        },
      };

      setTransferSummary(summary as TransferSummary);
      setShowConfirmation(true);
    } catch (err: unknown) {
      console.error('Failed to load account balance:', err);
      setError(err instanceof Error ? err.message : t('errors.loadFailed'));
    } finally {
      setLoadingBalances(false);
    }
  };

  const handleConfirmTransfer = async () => {
    if (!transferSummary) return;

    // Check if it's a SEPA transfer
    const summary = transferSummary as TransferSummary & {
      transferType?: 'sepa';
      sepaDetails?: {
        iban: string;
        bic?: string;
        recipientName: string;
        bankName: string;
        country: string;
        transferMessage?: string;
        urgency: string;
      };
    };

    try {
      setLoading(true);
      setError(null);

      if (summary.transferType === 'sepa' && summary.sepaDetails) {
        // SEPA transfer
        const request: SEPATransferRequest = {
          accountId: summary.fromAccount.accountId,
          amount: summary.amount.toString(),
          currency: summary.currency as 'EUR' | 'NOK' | 'SEK' | 'DKK',
          bankInfo: {
            iban: summary.sepaDetails.iban.replace(/\s/g, ''),
            bic: summary.sepaDetails.bic,
            bankName: summary.sepaDetails.bankName,
            recipientName: summary.sepaDetails.recipientName,
            country: summary.sepaDetails.country,
          },
          description: summary.sepaDetails.transferMessage,
          urgency: summary.sepaDetails.urgency as 'STANDARD' | 'EXPRESS' | 'INSTANT',
        };

        await sepaApi.createSEPATransfer(request);
      } else {
        // Internal transfer
        const request: TransferRequest = {
          fromAccountId: summary.fromAccount.accountId,
          toAccountId: summary.toAccount!.accountId,
          amount: summary.amount.toString(),
          currency: summary.currency,
        };

        await transfersApi.createTransfer(request);
      }

      setSuccess(true);
      setShowConfirmation(false);
      internalForm.reset();
      sepaForm.reset();

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: unknown) {
      console.error('Failed to create transfer:', err);
      const errorMessage =
        summary.transferType === 'sepa'
          ? t('errors.sepaTransferFailed')
          : t('errors.transferFailed');
      setError(err instanceof Error ? err.message : errorMessage);
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setTransferSummary(null);
  };

  const sepaCompatibleAccounts = filterSEPACompatibleAccounts(accounts);
  const hasSepaAccounts = sepaCompatibleAccounts.length > 0;

  if (loadingAccounts) {
    return (
      <ProtectedLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">{tCommon('loading')}</div>
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
            {t('backToDashboard')}
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center mb-6">
            <Send className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          </div>

          {/* Transfer Type Selection */}
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('type.selectType')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTransferType('internal')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  transferType === 'internal'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center mb-2">
                  <ArrowRight className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium">{t('type.internal')}</span>
                </div>
                <p className="text-sm text-gray-600">{t('type.internalDescription')}</p>
              </button>

              <button
                type="button"
                onClick={() => setTransferType('sepa')}
                disabled={!hasSepaAccounts}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  transferType === 'sepa'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!hasSepaAccounts ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center mb-2">
                  <Globe className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="font-medium">{t('type.sepa')}</span>
                </div>
                <p className="text-sm text-gray-600">{t('type.sepaDescription')}</p>
                {!hasSepaAccounts && (
                  <p className="text-xs text-orange-600 mt-1">{t('sepa.supportedCurrencies')}</p>
                )}
              </button>
            </div>
          </div>

          {/* Internal Transfer Form */}
          {transferType === 'internal' && (
            <>
              {accounts.length < 2 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">{t('needTwoAccounts')}</p>
                  <Link
                    href="/create-account"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {t('createAnother')}
                  </Link>
                </div>
              ) : (
                <form onSubmit={internalForm.handleSubmit(onInternalSubmit)} className="space-y-6">
                  <div>
                    <label
                      htmlFor="fromAccountId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t('fromAccount')}
                    </label>
                    <select
                      {...internalForm.register('fromAccountId')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">{t('selectSource')}</option>
                      {accounts.map(account => (
                        <option key={account.accountId} value={account.accountId}>
                          {formatAccountOption(account)}
                        </option>
                      ))}
                    </select>
                    {internalForm.formState.errors.fromAccountId && (
                      <p className="mt-1 text-sm text-red-600">
                        {internalForm.formState.errors.fromAccountId.message}
                      </p>
                    )}
                  </div>

                  {internalForm.watch('fromAccountId') && internalForm.watch('toAccountId') && (
                    <div className="flex justify-center">
                      <ArrowRight className="h-6 w-6 text-gray-400" />
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="toAccountId"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t('toAccount')}
                    </label>
                    <select
                      {...internalForm.register('toAccountId')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">{t('selectDestination')}</option>
                      {accounts
                        .filter(
                          account => account.accountId !== internalForm.watch('fromAccountId'),
                        )
                        .map(account => (
                          <option key={account.accountId} value={account.accountId}>
                            {formatAccountOption(account)}
                          </option>
                        ))}
                    </select>
                    {internalForm.formState.errors.toAccountId && (
                      <p className="mt-1 text-sm text-red-600">
                        {internalForm.formState.errors.toAccountId.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                      {t('amount')}
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">
                          {internalForm.watch('fromAccountId')
                            ? getCurrencySymbol(
                                accounts.find(
                                  a => a.accountId === internalForm.watch('fromAccountId'),
                                )?.currency || 'USD',
                              )
                            : '$'}
                        </span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        {...internalForm.register('amount')}
                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                        placeholder="0.00"
                      />
                    </div>
                    {internalForm.formState.errors.amount && (
                      <p className="mt-1 text-sm text-red-600">
                        {internalForm.formState.errors.amount.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {tCommon('cancel')}
                    </Link>
                    <button
                      type="submit"
                      disabled={loadingBalances || loading || success}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loadingBalances ? t('loadingBalances') : t('reviewTransfer')}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* SEPA Transfer Form */}
          {transferType === 'sepa' && (
            <>
              {!hasSepaAccounts ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">{t('sepa.supportedCurrencies')}</p>
                  <Link
                    href="/create-account"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {t('createAnother')}
                  </Link>
                </div>
              ) : (
                <form onSubmit={sepaForm.handleSubmit(onSEPASubmit)} className="space-y-6">
                  <div>
                    <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">
                      {t('sepa.selectAccount')}
                    </label>
                    <select
                      {...sepaForm.register('accountId')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">{t('selectSource')}</option>
                      {sepaCompatibleAccounts.map(account => (
                        <option key={account.accountId} value={account.accountId}>
                          {formatAccountOption(account)}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{t('sepa.selectCurrency')}</p>
                    {sepaForm.formState.errors.accountId && (
                      <p className="mt-1 text-sm text-red-600">
                        {sepaForm.formState.errors.accountId.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="iban" className="block text-sm font-medium text-gray-700">
                        {t('sepa.iban')}
                      </label>
                      <input
                        type="text"
                        {...sepaForm.register('iban')}
                        onChange={e => {
                          const formatted = formatIBAN(e.target.value);
                          sepaForm.setValue('iban', formatted);
                        }}
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 sm:text-sm ${
                          ibanInfo && watchedIBAN
                            ? ibanInfo.isValid && ibanInfo.isSEPA
                              ? 'border-green-300 focus:border-green-500'
                              : 'border-red-300 focus:border-red-500'
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                        placeholder={t('sepa.ibanPlaceholder')}
                        style={{ fontFamily: 'monospace' }}
                      />
                      {ibanInfo && watchedIBAN && (
                        <div className="mt-1">
                          {ibanInfo.isValid && ibanInfo.isSEPA ? (
                            <p className="text-sm text-green-600">
                              ✓ Valid SEPA IBAN ({ibanInfo.countryCode})
                            </p>
                          ) : (
                            <p className="text-sm text-red-600">
                              {ibanInfo.error ||
                                (!ibanInfo.isSEPA ? 'Not a SEPA country' : 'Invalid IBAN')}
                            </p>
                          )}
                        </div>
                      )}
                      {sepaForm.formState.errors.iban && (
                        <p className="mt-1 text-sm text-red-600">
                          {sepaForm.formState.errors.iban.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="bic" className="block text-sm font-medium text-gray-700">
                        {t('sepa.bic')}
                      </label>
                      <input
                        type="text"
                        {...sepaForm.register('bic')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder={t('sepa.bicPlaceholder')}
                        style={{ fontFamily: 'monospace' }}
                      />
                      {sepaForm.formState.errors.bic && (
                        <p className="mt-1 text-sm text-red-600">
                          {sepaForm.formState.errors.bic.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="recipientName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        {t('sepa.recipientName')}
                      </label>
                      <input
                        type="text"
                        {...sepaForm.register('recipientName')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder={t('sepa.recipientNamePlaceholder')}
                      />
                      {sepaForm.formState.errors.recipientName && (
                        <p className="mt-1 text-sm text-red-600">
                          {sepaForm.formState.errors.recipientName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">
                        {t('sepa.bankName')}
                      </label>
                      <input
                        type="text"
                        {...sepaForm.register('bankName')}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder={t('sepa.bankNamePlaceholder')}
                      />
                      {sepaForm.formState.errors.bankName && (
                        <p className="mt-1 text-sm text-red-600">
                          {sepaForm.formState.errors.bankName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      {t('sepa.country')}
                    </label>
                    <select
                      {...sepaForm.register('country')}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                      <option value="">{t('sepa.countryPlaceholder')}</option>
                      {SEPA_COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    {sepaForm.formState.errors.country && (
                      <p className="mt-1 text-sm text-red-600">
                        {sepaForm.formState.errors.country.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                        {t('amount')}
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">
                            {watchedAccountId
                              ? getCurrencySymbol(
                                  sepaCompatibleAccounts.find(a => a.accountId === watchedAccountId)
                                    ?.currency || 'EUR',
                                )
                              : '€'}
                          </span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          {...sepaForm.register('amount')}
                          className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                          placeholder="0.00"
                        />
                      </div>
                      {sepaForm.formState.errors.amount && (
                        <p className="mt-1 text-sm text-red-600">
                          {sepaForm.formState.errors.amount.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="urgency" className="block text-sm font-medium text-gray-700">
                        {t('sepa.urgency')}
                      </label>
                      <select
                        {...sepaForm.register('urgency')}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      >
                        <option value="STANDARD">{t('sepa.urgencyOptions.STANDARD')}</option>
                        <option value="EXPRESS">{t('sepa.urgencyOptions.EXPRESS')}</option>
                        <option value="INSTANT">{t('sepa.urgencyOptions.INSTANT')}</option>
                      </select>
                      {sepaForm.formState.errors.urgency && (
                        <p className="mt-1 text-sm text-red-600">
                          {sepaForm.formState.errors.urgency.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="transferMessage"
                      className="block text-sm font-medium text-gray-700"
                    >
                      {t('sepa.transferMessage')}
                    </label>
                    <input
                      type="text"
                      {...sepaForm.register('transferMessage')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder={t('sepa.transferMessagePlaceholder')}
                      maxLength={140}
                    />
                    {sepaForm.formState.errors.transferMessage && (
                      <p className="mt-1 text-sm text-red-600">
                        {sepaForm.formState.errors.transferMessage.message}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Link
                      href="/dashboard"
                      className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {tCommon('cancel')}
                    </Link>
                    <button
                      type="submit"
                      disabled={loadingBalances || loading || success}
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loadingBalances ? t('loadingBalances') : t('reviewTransfer')}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {t('success')}
            </div>
          )}
        </div>
      </div>

      {/* Transfer Confirmation Dialog */}
      {transferSummary && (
        <TransferConfirmationDialog
          isOpen={showConfirmation}
          onClose={handleCancelConfirmation}
          onConfirm={handleConfirmTransfer}
          transferSummary={transferSummary}
          loading={loading}
        />
      )}
    </ProtectedLayout>
  );
}
