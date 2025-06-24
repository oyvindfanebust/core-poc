import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, usePathname } from 'next/navigation';

import { LoginForm } from '../app/[locale]/login-form';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

const mockPush = jest.fn();
const mockTranslations = {
  title: 'Core Banking',
  subtitle: 'Sign in to access your accounts',
  customerIdLabel: 'Customer ID',
  customerIdPlaceholder: 'Enter your Customer ID',
  signInButton: 'Sign in',
  signingIn: 'Signing in...',
  useTestCustomer: 'Use test customer (CUSTOMER-ABC-123)',
  demoText: 'This is a demo application.',
  instructionText: 'Enter any customer ID or use the test customer.',
  errors: {
    customerIdRequired: 'Please enter a customer ID',
    invalidFormat: 'Customer ID must contain only letters, numbers, hyphens, and underscores',
  },
};

describe('LoginForm', () => {
  beforeEach(() => {
    const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
    const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);
    mockUsePathname.mockReturnValue('/en');
    mockLocalStorage.setItem.mockClear();
    mockPush.mockClear();
  });

  it('renders login form correctly', () => {
    render(<LoginForm translations={mockTranslations} />);

    expect(screen.getByText('Core Banking')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access your accounts')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your Customer ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows error for empty customer ID', async () => {
    render(<LoginForm translations={mockTranslations} />);

    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(signInButton);

    expect(screen.getByText('Please enter a customer ID')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows error for invalid customer ID format', async () => {
    render(<LoginForm translations={mockTranslations} />);

    const input = screen.getByPlaceholderText('Enter your Customer ID');
    fireEvent.change(input, { target: { value: 'invalid@id' } });

    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(signInButton);

    expect(
      screen.getByText('Customer ID must contain only letters, numbers, hyphens, and underscores'),
    ).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows loading state during sign in', async () => {
    render(<LoginForm translations={mockTranslations} />);

    const input = screen.getByPlaceholderText('Enter your Customer ID');
    fireEvent.change(input, { target: { value: 'CUSTOMER-ABC-123' } });

    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(signInButton);

    expect(screen.getByText('Signing in...')).toBeInTheDocument();
    expect(signInButton).toBeDisabled();
    expect(input).toBeDisabled();
  });

  it('successfully signs in with valid customer ID', async () => {
    render(<LoginForm translations={mockTranslations} />);

    const input = screen.getByPlaceholderText('Enter your Customer ID');
    fireEvent.change(input, { target: { value: 'CUSTOMER-ABC-123' } });

    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('customerId', 'CUSTOMER-ABC-123');
      expect(mockPush).toHaveBeenCalledWith('/en/dashboard');
    });
  });

  it('works with test customer button', async () => {
    render(<LoginForm translations={mockTranslations} />);

    const testButton = screen.getByText('Use test customer (CUSTOMER-ABC-123)');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('customerId', 'CUSTOMER-ABC-123');
      expect(mockPush).toHaveBeenCalledWith('/en/dashboard');
    });
  });

  it('clears error when user types in input', () => {
    render(<LoginForm translations={mockTranslations} />);

    // First trigger an error
    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(signInButton);
    expect(screen.getByText('Please enter a customer ID')).toBeInTheDocument();

    // Then type in input to clear error
    const input = screen.getByPlaceholderText('Enter your Customer ID');
    fireEvent.change(input, { target: { value: 'test' } });

    expect(screen.queryByText('Please enter a customer ID')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LoginForm translations={mockTranslations} />);

    const input = screen.getByPlaceholderText('Enter your Customer ID');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('id', 'customer-id');

    const label = screen.getByLabelText('Customer ID');
    expect(label).toBe(input);
  });

  it('shows proper ARIA attributes when error occurs', () => {
    render(<LoginForm translations={mockTranslations} />);

    const signInButton = screen.getByRole('button', { name: 'Sign in' });
    fireEvent.click(signInButton);

    const input = screen.getByPlaceholderText('Enter your Customer ID');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'login-error');

    const errorElement = screen.getByRole('alert');
    expect(errorElement).toHaveAttribute('id', 'login-error');
    expect(errorElement).toHaveAttribute('aria-live', 'polite');
  });
});
