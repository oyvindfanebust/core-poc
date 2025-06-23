import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AccountHeader } from '../../components/AccountHeader';

// Mock next-intl hooks
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'accountDetails.accountId': 'Account ID',
      'accountDetails.created': 'Created',
      'accountDetails.currency': 'Currency',
      'accountDetails.currentBalance': 'Current Balance',
      'accountDetails.accountNickname': 'Account Nickname',
      'accountDetails.viewFullId': 'View full account ID',
      'accountDetails.editName': 'Edit account name',
      'accountDetails.saveName': 'Save account name',
      'accountDetails.cancelEdit': 'Cancel editing',
      'accountDetails.accountNamePlaceholder': 'Enter account name',
      'tooltips.accountId': 'Your unique account identifier',
      'tooltips.balance': 'Current available balance',
      'common.edit': 'Edit',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.account': 'Account',
    };
    return translations[key] || key;
  },
  useLocale: () => 'en',
}));

const mockAccount = {
  id: '309857248261287769321131213262708',
  accountType: 'DEPOSIT' as const,
  currency: 'USD',
  balance: '250000', // $2,500.00
  createdAt: '2023-12-25T14:30:00Z',
  nickname: 'My Savings Account',
};

describe('AccountHeader', () => {
  describe('Basic Rendering', () => {
    it('should render account information correctly', () => {
      render(<AccountHeader account={mockAccount} />);

      expect(screen.getByText('My Savings Account')).toBeInTheDocument();
      expect(screen.getByText('$2,500.00')).toBeInTheDocument();
      expect(screen.getByText('USD')).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument(); // Account type icon
    });

    it('should render account without nickname', () => {
      const accountWithoutNickname = { ...mockAccount, nickname: undefined };

      render(<AccountHeader account={accountWithoutNickname} />);

      expect(screen.getByText('Account')).toBeInTheDocument(); // Default title
      expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    });

    it('should render different account types with correct icons', () => {
      const { rerender } = render(
        <AccountHeader account={{ ...mockAccount, accountType: 'DEPOSIT' }} />,
      );

      let icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('aria-label', 'Deposit Account');

      rerender(<AccountHeader account={{ ...mockAccount, accountType: 'LOAN' }} />);

      icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('aria-label', 'Loan Account');
    });
  });

  describe('Balance Display', () => {
    it('should format currency according to locale', () => {
      render(<AccountHeader account={mockAccount} />);

      expect(screen.getByText('$2,500.00')).toBeInTheDocument();
    });

    it('should handle different currencies', () => {
      const eurAccount = { ...mockAccount, currency: 'EUR' };

      render(<AccountHeader account={eurAccount} />);

      expect(screen.getByText('EUR')).toBeInTheDocument();
    });

    it('should handle zero balance', () => {
      const zeroBalanceAccount = { ...mockAccount, balance: '0' };

      render(<AccountHeader account={zeroBalanceAccount} />);

      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    it('should handle negative balance', () => {
      const negativeBalanceAccount = { ...mockAccount, balance: '-150000' };

      render(<AccountHeader account={negativeBalanceAccount} />);

      expect(screen.getByText('-$1,500.00')).toBeInTheDocument();
    });
  });

  describe('Account ID Display', () => {
    it('should show masked account ID by default', () => {
      render(<AccountHeader account={mockAccount} />);

      // Should show masked version (last 8 characters)
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
      expect(screen.queryByText(mockAccount.id)).not.toBeInTheDocument();
    });

    it('should have tooltip for account ID', async () => {
      render(<AccountHeader account={mockAccount} />);

      const accountIdElement = screen.getByText('•••• 3262708');
      fireEvent.mouseEnter(accountIdElement);

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Your unique account identifier')).toBeInTheDocument();
      });
    });

    it('should toggle full account ID when clicked', async () => {
      const user = userEvent.setup();

      render(<AccountHeader account={mockAccount} />);

      const accountIdElement = screen.getByText('•••• 3262708');
      await user.click(accountIdElement);

      expect(screen.getByText(mockAccount.id)).toBeInTheDocument();
      expect(screen.queryByText('•••• 3262708')).not.toBeInTheDocument();

      // Click again to hide
      const fullIdElement = screen.getByText(mockAccount.id);
      await user.click(fullIdElement);

      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
      expect(screen.queryByText(mockAccount.id)).not.toBeInTheDocument();
    });
  });

  describe('Nickname Editing', () => {
    it('should show edit button when onNicknameChange is provided', () => {
      const handleNicknameChange = jest.fn();

      render(<AccountHeader account={mockAccount} onNicknameChange={handleNicknameChange} />);

      expect(screen.getByRole('button', { name: 'Edit account name' })).toBeInTheDocument();
    });

    it('should not show edit button when onNicknameChange is not provided', () => {
      render(<AccountHeader account={mockAccount} />);

      expect(screen.queryByRole('button', { name: 'Edit account name' })).not.toBeInTheDocument();
    });

    it('should enter edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      const handleNicknameChange = jest.fn();

      render(<AccountHeader account={mockAccount} onNicknameChange={handleNicknameChange} />);

      const editButton = screen.getByRole('button', { name: 'Edit account name' });
      await user.click(editButton);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByDisplayValue('My Savings Account')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save account name' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel editing' })).toBeInTheDocument();
    });

    it('should save nickname when save button is clicked', async () => {
      const user = userEvent.setup();
      const handleNicknameChange = jest.fn().mockResolvedValue(undefined);

      render(<AccountHeader account={mockAccount} onNicknameChange={handleNicknameChange} />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit account name' });
      await user.click(editButton);

      // Change the nickname
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Updated Savings Account');

      // Save
      const saveButton = screen.getByRole('button', { name: 'Save account name' });
      await user.click(saveButton);

      expect(handleNicknameChange).toHaveBeenCalledWith('Updated Savings Account');

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });

    it('should cancel editing when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const handleNicknameChange = jest.fn();

      render(<AccountHeader account={mockAccount} onNicknameChange={handleNicknameChange} />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit account name' });
      await user.click(editButton);

      // Change the nickname
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'This should not be saved');

      // Cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel editing' });
      await user.click(cancelButton);

      expect(handleNicknameChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('My Savings Account')).toBeInTheDocument(); // Original nickname
    });

    it('should save on Enter key press', async () => {
      const user = userEvent.setup();
      const handleNicknameChange = jest.fn().mockResolvedValue(undefined);

      render(<AccountHeader account={mockAccount} onNicknameChange={handleNicknameChange} />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit account name' });
      await user.click(editButton);

      // Change the nickname and press Enter
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Keyboard Saved Account');
      await user.keyboard('{Enter}');

      expect(handleNicknameChange).toHaveBeenCalledWith('Keyboard Saved Account');
    });

    it('should cancel on Escape key press', async () => {
      const user = userEvent.setup();
      const handleNicknameChange = jest.fn();

      render(<AccountHeader account={mockAccount} onNicknameChange={handleNicknameChange} />);

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit account name' });
      await user.click(editButton);

      // Change the nickname and press Escape
      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'This should be cancelled');
      await user.keyboard('{Escape}');

      expect(handleNicknameChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.getByText('My Savings Account')).toBeInTheDocument();
    });

    it('should handle empty nickname gracefully', async () => {
      const user = userEvent.setup();
      const handleNicknameChange = jest.fn().mockResolvedValue(undefined);
      const accountWithoutNickname = { ...mockAccount, nickname: undefined };

      render(
        <AccountHeader account={accountWithoutNickname} onNicknameChange={handleNicknameChange} />,
      );

      // Enter edit mode
      const editButton = screen.getByRole('button', { name: 'Edit account name' });
      await user.click(editButton);

      // Input should be empty
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');

      // Add a nickname
      await user.type(input, 'New Account Name');
      await user.keyboard('{Enter}');

      expect(handleNicknameChange).toHaveBeenCalledWith('New Account Name');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when saving nickname', async () => {
      const user = userEvent.setup();
      let resolvePromise: (value: any) => void;
      const handleNicknameChange = jest.fn().mockImplementation(() => {
        return new Promise(resolve => {
          resolvePromise = resolve;
        });
      });

      render(<AccountHeader account={mockAccount} onNicknameChange={handleNicknameChange} />);

      // Enter edit mode and start saving
      const editButton = screen.getByRole('button', { name: 'Edit account name' });
      await user.click(editButton);

      const input = screen.getByRole('textbox');
      await user.clear(input);
      await user.type(input, 'Loading Account');

      const saveButton = screen.getByRole('button', { name: 'Save account name' });
      await user.click(saveButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: 'Save account name' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Cancel editing' })).toBeDisabled();

      // Resolve the promise
      resolvePromise!(undefined);

      await waitFor(() => {
        expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<AccountHeader account={mockAccount} />);

      expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Deposit Account');
      expect(screen.getByRole('button', { name: 'View full account ID' })).toBeInTheDocument();
    });

    it('should support keyboard navigation for account ID toggle', async () => {
      const user = userEvent.setup();

      render(<AccountHeader account={mockAccount} />);

      const accountIdButton = screen.getByText('•••• 3262708');
      await user.tab();

      // Should be focusable
      expect(accountIdButton).toHaveFocus();

      // Should activate on Enter
      await user.keyboard('{Enter}');
      expect(screen.getByText(mockAccount.id)).toBeInTheDocument();

      // Should activate on Space
      await user.keyboard(' ');
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should support custom className', () => {
      const { container } = render(
        <AccountHeader account={mockAccount} className="custom-header" />,
      );

      expect(container.firstChild).toHaveClass('custom-header');
    });

    it('should forward additional props', () => {
      render(<AccountHeader account={mockAccount} data-testid="account-header" />);

      expect(screen.getByTestId('account-header')).toBeInTheDocument();
    });
  });
});
