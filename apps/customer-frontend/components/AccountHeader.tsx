import { useTranslations, useLocale } from 'next-intl';
import React, { useState } from 'react';

import { formatLocalizedCurrency } from '../lib/formatting-utils';
import { cn } from '../lib/utils';

import { AccountTypeIcon } from './AccountTypeIcon';
import { ToggleableId } from './ToggleableId';
import { Tooltip } from './Tooltip';

export interface Account {
  id: string;
  accountType: 'DEPOSIT' | 'LOAN' | 'CREDIT';
  currency: string;
  balance: string;
  createdAt: string;
  nickname?: string;
}

interface AccountHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  account: Account;
  onNicknameChange?: (nickname: string) => Promise<void>;
}

export const AccountHeader: React.FC<AccountHeaderProps> = ({
  account,
  onNicknameChange,
  className,
  ...props
}) => {
  const t = useTranslations();
  const locale = useLocale();

  const [isEditing, setIsEditing] = useState(false);
  const [editingNickname, setEditingNickname] = useState(account.nickname || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = () => {
    setEditingNickname(account.nickname || '');
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    if (!onNicknameChange) return;

    setIsSaving(true);
    try {
      await onNicknameChange(editingNickname);
      setIsEditing(false);
    } catch (error) {
      // Error handling could be improved with toast notifications
      console.error('Failed to save nickname:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelClick = () => {
    setEditingNickname(account.nickname || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveClick();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelClick();
    }
  };

  const formattedBalance = formatLocalizedCurrency(account.balance, account.currency, locale);

  return (
    <div className={cn('account-header', className)} {...props}>
      <div className="account-header__main">
        <div className="account-header__icon-section">
          <AccountTypeIcon accountType={account.accountType} size="large" color="primary" />
        </div>

        <div className="account-header__info">
          <div className="account-header__title-section">
            {isEditing ? (
              <div className="account-header__edit-form">
                <input
                  type="text"
                  value={editingNickname}
                  onChange={e => setEditingNickname(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('accountDetails.accountNamePlaceholder')}
                  className="account-header__nickname-input"
                  autoFocus
                />
                <div className="account-header__edit-buttons">
                  <button
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    aria-label={t('accountDetails.saveName')}
                    className="account-header__save-button"
                  >
                    {t('common.save')}
                  </button>
                  <button
                    onClick={handleCancelClick}
                    disabled={isSaving}
                    aria-label={t('accountDetails.cancelEdit')}
                    className="account-header__cancel-button"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="account-header__title-display">
                <h1 className="account-header__title">{account.nickname || t('common.account')}</h1>
                {onNicknameChange && (
                  <button
                    onClick={handleEditClick}
                    aria-label={t('accountDetails.editName')}
                    className="account-header__edit-button"
                  >
                    {t('common.edit')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="account-header__details">
            <div className="account-header__balance-section">
              <Tooltip content={t('tooltips.balance')}>
                <div className="account-header__balance">
                  <span className="account-header__balance-amount">{formattedBalance}</span>
                  <span className="account-header__currency">{account.currency}</span>
                </div>
              </Tooltip>
            </div>

            <div className="account-header__id-section">
              <ToggleableId id={account.id} type="account" className="account-header__account-id" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

AccountHeader.displayName = 'AccountHeader';
