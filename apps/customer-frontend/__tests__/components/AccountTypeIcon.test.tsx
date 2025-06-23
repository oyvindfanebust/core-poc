import { render, screen } from '@testing-library/react';
import { AccountTypeIcon } from '../../components/AccountTypeIcon';

describe('AccountTypeIcon', () => {
  describe('Account Type Rendering', () => {
    it('should render deposit account icon with correct attributes', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-label', 'Deposit Account');
      expect(icon).toHaveClass('account-type-icon');
    });

    it('should render loan account icon with correct attributes', () => {
      render(<AccountTypeIcon accountType="LOAN" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-label', 'Loan Account');
      expect(icon).toHaveClass('account-type-icon');
    });

    it('should render credit account icon with correct attributes', () => {
      render(<AccountTypeIcon accountType="CREDIT" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-label', 'Credit Account');
      expect(icon).toHaveClass('account-type-icon');
    });

    it('should render default icon for unknown account type', () => {
      render(<AccountTypeIcon accountType={"UNKNOWN" as any} />);
      
      const icon = screen.getByRole('img');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('aria-label', 'Account');
      expect(icon).toHaveClass('account-type-icon');
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class when size="small"', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" size="small" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon--small');
    });

    it('should apply medium size class when size="medium" (default)', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" size="medium" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon--medium');
    });

    it('should apply large size class when size="large"', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" size="large" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon--large');
    });

    it('should default to medium size when size prop is not provided', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon--medium');
    });
  });

  describe('Color Variants', () => {
    it('should apply primary color class when color="primary"', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" color="primary" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon--primary');
    });

    it('should apply secondary color class when color="secondary"', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" color="secondary" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon--secondary');
    });

    it('should apply muted color class when color="muted"', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" color="muted" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon--muted');
    });

    it('should default to primary color when color prop is not provided', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon--primary');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for screen readers', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('role', 'img');
      expect(icon).toHaveAttribute('aria-label');
    });

    it('should be focusable when used in interactive contexts', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" tabIndex={0} />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('tabindex', '0');
    });

    it('should support custom aria-label override', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" aria-label="My Custom Label" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveAttribute('aria-label', 'My Custom Label');
    });
  });

  describe('Custom Props', () => {
    it('should support custom className', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" className="custom-class" />);
      
      const icon = screen.getByRole('img');
      expect(icon).toHaveClass('account-type-icon');
      expect(icon).toHaveClass('custom-class');
    });

    it('should support custom data attributes', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" data-testid="account-icon" />);
      
      const icon = screen.getByTestId('account-icon');
      expect(icon).toBeInTheDocument();
    });

    it('should forward ref correctly', () => {
      const ref = { current: null };
      render(<AccountTypeIcon accountType="DEPOSIT" ref={ref} />);
      
      expect(ref.current).not.toBeNull();
    });
  });

  describe('SVG Structure', () => {
    it('should render as SVG element', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" />);
      
      const svg = screen.getByRole('img');
      expect(svg.tagName.toLowerCase()).toBe('svg');
    });

    it('should have viewBox attribute for proper scaling', () => {
      render(<AccountTypeIcon accountType="DEPOSIT" />);
      
      const svg = screen.getByRole('img');
      expect(svg).toHaveAttribute('viewBox');
    });

    it('should contain path elements for the icon graphics', () => {
      const { container } = render(<AccountTypeIcon accountType="DEPOSIT" />);
      
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Consistency', () => {
    it('should render different icons for different account types', () => {
      const { container: depositContainer } = render(<AccountTypeIcon accountType="DEPOSIT" />);
      const { container: loanContainer } = render(<AccountTypeIcon accountType="LOAN" />);
      
      const depositPaths = depositContainer.querySelectorAll('path');
      const loanPaths = loanContainer.querySelectorAll('path');
      
      // Should have different path structures
      expect(depositPaths[0]?.getAttribute('d')).not.toBe(loanPaths[0]?.getAttribute('d'));
    });

    it('should maintain consistent sizing across different account types', () => {
      const { container: depositContainer } = render(<AccountTypeIcon accountType="DEPOSIT" size="large" />);
      const { container: loanContainer } = render(<AccountTypeIcon accountType="LOAN" size="large" />);
      
      const depositSvg = depositContainer.querySelector('svg');
      const loanSvg = loanContainer.querySelector('svg');
      
      expect(depositSvg?.getAttribute('width')).toBe(loanSvg?.getAttribute('width'));
      expect(depositSvg?.getAttribute('height')).toBe(loanSvg?.getAttribute('height'));
    });
  });
});