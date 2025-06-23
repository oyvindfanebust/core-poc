'use client';

import { X, ArrowRight, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Account, Balance } from '@/lib/api';

export interface TransferSummary {
  fromAccount: Account;
  toAccount: Account;
  fromBalance?: Balance;
  toBalance?: Balance;
  amount: number; // in cents
  currency: string;
}

interface TransferConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  transferSummary: TransferSummary;
  loading?: boolean;
}

export function TransferConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  transferSummary,
  loading = false,
}: TransferConfirmationDialogProps) {
  const t = useTranslations('transfer.confirmation');
  const tCommon = useTranslations('common');

  if (!isOpen) return null;

  const formatCurrency = (amount: string | number, currency: string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) / 100 : amount / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(value);
  };

  const formatAccountName = (account: Account) => {
    return account.accountName || `${account.accountType} Account`;
  };

  const calculateNewBalance = (currentBalance: string, amount: number, isDebit: boolean) => {
    const current = parseFloat(currentBalance) / 100; // Convert from cents to dollars
    const change = amount / 100; // Convert from cents to dollars
    return isDebit ? current - change : current + change;
  };

  const hasBalanceData = transferSummary.fromBalance && transferSummary.toBalance;
  const fromNewBalance = hasBalanceData
    ? calculateNewBalance(transferSummary.fromBalance!.balance, transferSummary.amount, true)
    : null;
  const toNewBalance = hasBalanceData
    ? calculateNewBalance(transferSummary.toBalance!.balance, transferSummary.amount, false)
    : null;

  const hasInsufficientFunds = hasBalanceData && fromNewBalance !== null && fromNewBalance < 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{t('title')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Transfer Summary */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">{t('transferSummary')}</h4>

            <div className="space-y-4">
              {/* From Account */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatAccountName(transferSummary.fromAccount)}
                  </p>
                  <p className="text-xs text-gray-500">{transferSummary.fromAccount.accountId}</p>
                  {hasBalanceData && (
                    <p className="text-xs text-gray-600 mt-1">
                      {t('currentBalance')}:{' '}
                      {formatCurrency(
                        transferSummary.fromBalance!.balance,
                        transferSummary.currency,
                      )}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-red-600">
                    -{formatCurrency(transferSummary.amount, transferSummary.currency)}
                  </p>
                  {fromNewBalance !== null && (
                    <p
                      className={`text-xs mt-1 ${fromNewBalance < 0 ? 'text-red-600 font-medium' : 'text-gray-600'}`}
                    >
                      {t('newBalance')}:{' '}
                      {formatCurrency(fromNewBalance * 100, transferSummary.currency)}
                    </p>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>

              {/* To Account */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatAccountName(transferSummary.toAccount)}
                  </p>
                  <p className="text-xs text-gray-500">{transferSummary.toAccount.accountId}</p>
                  {hasBalanceData && (
                    <p className="text-xs text-gray-600 mt-1">
                      {t('currentBalance')}:{' '}
                      {formatCurrency(transferSummary.toBalance!.balance, transferSummary.currency)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    +{formatCurrency(transferSummary.amount, transferSummary.currency)}
                  </p>
                  {toNewBalance !== null && (
                    <p className="text-xs text-gray-600 mt-1">
                      {t('newBalance')}:{' '}
                      {formatCurrency(toNewBalance * 100, transferSummary.currency)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Insufficient Funds Warning */}
          {hasInsufficientFunds && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">{t('insufficientFunds')}</p>
                <p className="text-xs text-red-600 mt-1">{t('insufficientFundsDescription')}</p>
              </div>
            </div>
          )}

          {/* Transfer Details */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h5 className="text-sm font-medium text-blue-900 mb-2">{t('transferDetails')}</h5>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex justify-between">
                <span>{t('amount')}:</span>
                <span className="font-medium">
                  {formatCurrency(transferSummary.amount, transferSummary.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{t('currency')}:</span>
                <span>{transferSummary.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('processingTime')}:</span>
                <span>{t('instant')}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {tCommon('cancel')}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || hasInsufficientFunds}
              className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('processing') : t('confirmTransfer')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
