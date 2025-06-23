import React, { forwardRef } from 'react';
import { cn } from '../lib/utils';

export type AccountType = 'DEPOSIT' | 'LOAN' | 'CREDIT';
export type IconSize = 'small' | 'medium' | 'large';
export type IconColor = 'primary' | 'secondary' | 'muted';

interface AccountTypeIconProps extends React.SVGProps<SVGSVGElement> {
  accountType: AccountType;
  size?: IconSize;
  color?: IconColor;
  'aria-label'?: string;
}

const sizeMap = {
  small: { width: 16, height: 16 },
  medium: { width: 24, height: 24 },
  large: { width: 32, height: 32 },
};

const getAccountTypeLabel = (accountType: AccountType): string => {
  switch (accountType) {
    case 'DEPOSIT':
      return 'Deposit Account';
    case 'LOAN':
      return 'Loan Account';
    case 'CREDIT':
      return 'Credit Account';
    default:
      return 'Account';
  }
};

const DepositIcon = () => (
  <>
    <path 
      d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" 
      fill="currentColor"
    />
    <path 
      d="M7 12h2v5h6v-5h2l-5-5-5 5z" 
      fill="currentColor"
    />
  </>
);

const LoanIcon = () => (
  <>
    <path 
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" 
      fill="currentColor"
    />
    <path 
      d="M17 12h-2V7H9v5H7l5 5 5-5z" 
      fill="currentColor"
    />
  </>
);

const CreditIcon = () => (
  <>
    <path 
      d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V8h16v10z" 
      fill="currentColor"
    />
    <path 
      d="M11 17h2v-4h-2v4zm0-6h2V9h-2v2z" 
      fill="currentColor"
    />
  </>
);

const DefaultIcon = () => (
  <>
    <path 
      d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" 
      fill="currentColor"
    />
    <path 
      d="M11 17h2v-6h-2v6z" 
      fill="currentColor"
    />
  </>
);

const getAccountTypeIcon = (accountType: AccountType) => {
  switch (accountType) {
    case 'DEPOSIT':
      return <DepositIcon />;
    case 'LOAN':
      return <LoanIcon />;
    case 'CREDIT':
      return <CreditIcon />;
    default:
      return <DefaultIcon />;
  }
};

export const AccountTypeIcon = forwardRef<SVGSVGElement, AccountTypeIconProps>(
  ({ 
    accountType, 
    size = 'medium', 
    color = 'primary', 
    className,
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    const dimensions = sizeMap[size];
    const label = ariaLabel || getAccountTypeLabel(accountType);

    return (
      <svg
        ref={ref}
        width={dimensions.width}
        height={dimensions.height}
        viewBox="0 0 24 24"
        role="img"
        aria-label={label}
        className={cn(
          'account-type-icon',
          `account-type-icon--${size}`,
          `account-type-icon--${color}`,
          className
        )}
        {...props}
      >
        {getAccountTypeIcon(accountType)}
      </svg>
    );
  }
);

AccountTypeIcon.displayName = 'AccountTypeIcon';