import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToggleableId } from '../../components/ToggleableId';

// Mock next-intl hooks
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'accountDetails.viewFullId': 'View full account ID',
      'accountDetails.hideFullId': 'Hide full account ID',
      'common.viewFull': 'View full',
      'common.hide': 'Hide',
      'tooltips.accountId': 'Your unique account identifier',
      'tooltips.transactionId': 'Transaction reference number',
      'tooltips.customerId': 'Your customer identifier',
    };
    return translations[key] || key;
  },
}));

describe('ToggleableId', () => {
  const longAccountId = '309857248261287769321131213262708';
  const transactionId = 'tx_1234567890abcdef';
  const customerId = 'CUSTOMER-ABC-123';

  describe('Basic Rendering', () => {
    it('should render masked ID by default', () => {
      render(<ToggleableId id={longAccountId} type="account" />);
      
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
      expect(screen.queryByText(longAccountId)).not.toBeInTheDocument();
    });

    it('should render different ID types with appropriate masking', () => {
      const { rerender } = render(<ToggleableId id={longAccountId} type="account" />);
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();

      rerender(<ToggleableId id={transactionId} type="transaction" />);
      expect(screen.getByText('•••• 90abcdef')).toBeInTheDocument();

      rerender(<ToggleableId id={customerId} type="customer" />);
      expect(screen.getByText('CUSTOMER-•••-123')).toBeInTheDocument();
    });

    it('should show full ID when showFull prop is true', () => {
      render(<ToggleableId id={longAccountId} type="account" showFull={true} />);
      
      expect(screen.getByText(longAccountId)).toBeInTheDocument();
      expect(screen.queryByText('•••• 3262708')).not.toBeInTheDocument();
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle between masked and full ID when clicked', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      
      // Initially masked
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
      
      // Click to show full
      await user.click(button);
      expect(screen.getByText(longAccountId)).toBeInTheDocument();
      expect(screen.queryByText('•••• 3262708')).not.toBeInTheDocument();
      
      // Click to hide again
      await user.click(button);
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
      expect(screen.queryByText(longAccountId)).not.toBeInTheDocument();
    });

    it('should handle controlled mode with onToggle callback', async () => {
      const user = userEvent.setup();
      const onToggle = jest.fn();
      
      render(
        <ToggleableId 
          id={longAccountId} 
          type="account" 
          showFull={false}
          onToggle={onToggle}
        />
      );
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it('should not be toggleable when disabled', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" disabled />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      
      await user.click(button);
      // Should remain masked
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should toggle with Enter key', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard('{Enter}');
      expect(screen.getByText(longAccountId)).toBeInTheDocument();
      
      await user.keyboard('{Enter}');
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
    });

    it('should toggle with Space key', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await user.keyboard(' ');
      expect(screen.getByText(longAccountId)).toBeInTheDocument();
      
      await user.keyboard(' ');
      expect(screen.getByText('•••• 3262708')).toBeInTheDocument();
    });

    it('should be focusable and have proper tab order', async () => {
      const user = userEvent.setup();
      
      render(
        <div>
          <button>Before</button>
          <ToggleableId id={longAccountId} type="account" />
          <button>After</button>
        </div>
      );
      
      await user.tab();
      expect(screen.getByRole('button', { name: 'Before' })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: 'View full account ID' })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'View full account ID');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('should update ARIA attributes when toggled', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(button).toHaveAttribute('aria-label', 'Hide full account ID');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have proper ARIA attributes for different ID types', () => {
      const { rerender } = render(<ToggleableId id={transactionId} type="transaction" />);
      
      let button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('View full'));
      
      rerender(<ToggleableId id={customerId} type="customer" />);
      button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', expect.stringContaining('View full'));
    });

    it('should support screen readers with live region updates', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const liveRegion = screen.getByRole('status', { hidden: true });
      expect(liveRegion).toBeInTheDocument();
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent('Full account ID revealed');
      });
    });
  });

  describe('Tooltip Integration', () => {
    it('should show tooltip on hover', async () => {
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('Your unique account identifier')).toBeInTheDocument();
      });
    });

    it('should show appropriate tooltip for different ID types', async () => {
      const { rerender } = render(<ToggleableId id={transactionId} type="transaction" />);
      
      let button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByText('Transaction reference number')).toBeInTheDocument();
      });
      
      fireEvent.mouseLeave(button);
      
      rerender(<ToggleableId id={customerId} type="customer" />);
      button = screen.getByRole('button');
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByText('Your customer identifier')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Indicators', () => {
    it('should show appropriate visual states', () => {
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('toggleable-id');
      expect(button).toHaveClass('toggleable-id--masked');
    });

    it('should update visual states when toggled', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      await user.click(button);
      
      expect(button).toHaveClass('toggleable-id--revealed');
      expect(button).not.toHaveClass('toggleable-id--masked');
    });

    it('should show security level indicators', () => {
      render(<ToggleableId id={longAccountId} type="account" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('toggleable-id--security-high');
    });
  });

  describe('Copy Functionality', () => {
    let mockWriteText: jest.Mock;
    
    beforeEach(() => {
      // Mock clipboard API
      mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: mockWriteText,
        },
        writable: true,
      });
    });

    it('should support copying full ID when enableCopy is true', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" enableCopy />);
      
      // Reveal the ID first
      const toggleButton = screen.getByRole('button', { name: 'View full account ID' });
      await user.click(toggleButton);
      
      // Verify ID is revealed
      expect(screen.getByText(longAccountId)).toBeInTheDocument();
      
      // Verify copy button appears
      const copyButton = await screen.findByRole('button', { name: 'Copy to clipboard' });
      expect(copyButton).toBeInTheDocument();
      
      // Click copy button and verify feedback appears (which proves copy worked)
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
    });

    it('should show copy feedback', async () => {
      const user = userEvent.setup();
      
      render(<ToggleableId id={longAccountId} type="account" enableCopy />);
      
      // Reveal and copy
      const toggleButton = screen.getByRole('button', { name: 'View full account ID' });
      await user.click(toggleButton);
      
      const copyButton = screen.getByRole('button', { name: 'Copy to clipboard' });
      await user.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument();
      });
      
      // Feedback should disappear after timeout
      await waitFor(() => {
        expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very short IDs that should not be masked', () => {
      render(<ToggleableId id="123" type="account" />);
      
      // Should show full ID since it's too short to mask meaningfully
      expect(screen.getByText('123')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should handle empty ID gracefully', () => {
      render(<ToggleableId id="" type="account" />);
      
      expect(screen.getByText('-')).toBeInTheDocument(); // Placeholder
    });

    it('should handle undefined ID', () => {
      render(<ToggleableId id={undefined as any} type="account" />);
      
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should support custom className', () => {
      render(<ToggleableId id={longAccountId} type="account" className="custom-id" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-id');
    });

    it('should forward additional props', () => {
      render(<ToggleableId id={longAccountId} type="account" data-testid="toggleable-id" />);
      
      expect(screen.getByTestId('toggleable-id')).toBeInTheDocument();
    });

    it('should support custom masking options', () => {
      render(
        <ToggleableId 
          id={longAccountId} 
          type="account" 
          maskingOptions={{ maskChar: '*', visibleLength: 5 }}
        />
      );
      
      expect(screen.getByText('**** 62708')).toBeInTheDocument();
    });
  });
});