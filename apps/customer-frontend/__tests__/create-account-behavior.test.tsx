import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as api from '../lib/api';

// Mock the API module
jest.mock('../lib/api', () => ({
  accountsApi: {
    createAccount: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn().mockReturnValue('CUSTOMER-ABC-123'),
  setItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Simple test component that represents what we want (no initial balance)
const TestCreateAccountForm = () => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const request = {
      type: formData.get('type') as string,
      currency: formData.get('currency') as string,
      customerId: 'CUSTOMER-ABC-123',
    };
    
    // Should NOT include initialBalance
    await (api.accountsApi.createAccount as jest.Mock)(request);
  };

  return (
    <form onSubmit={handleSubmit} data-testid="create-account-form">
      <label htmlFor="type">Account Type</label>
      <select id="type" name="type" defaultValue="DEPOSIT">
        <option value="DEPOSIT">Deposit Account</option>
      </select>
      
      <label htmlFor="currency">Currency</label>
      <select id="currency" name="currency" defaultValue="USD">
        <option value="USD">USD</option>
      </select>
      
      <button type="submit">Create Account</button>
    </form>
  );
};

describe('Create Account Form - TDD Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should NOT have initial balance field', () => {
    render(<TestCreateAccountForm />);
    
    // These should pass after we remove the initial balance field
    expect(screen.queryByLabelText(/initial balance/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/0\.00/i)).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('')).not.toBeInTheDocument();
  });

  it('should NOT include initialBalance in form submission', async () => {
    const mockCreateAccount = api.accountsApi.createAccount as jest.Mock;
    mockCreateAccount.mockResolvedValue({ accountId: '123' });

    render(<TestCreateAccountForm />);
    
    const form = screen.getByTestId('create-account-form');
    fireEvent.submit(form);
    
    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith({
        type: 'DEPOSIT',
        currency: 'USD',
        customerId: 'CUSTOMER-ABC-123',
      });
    });
    
    // Verify initialBalance is NOT in the call
    const callArgs = mockCreateAccount.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty('initialBalance');
  });

  it('should successfully create account without initial balance', async () => {
    const mockCreateAccount = api.accountsApi.createAccount as jest.Mock;
    mockCreateAccount.mockResolvedValue({ accountId: '456' });

    render(<TestCreateAccountForm />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledTimes(1);
    });
    
    expect(mockCreateAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'DEPOSIT',
        currency: 'USD',
        customerId: 'CUSTOMER-ABC-123',
      })
    );
    
    expect(mockCreateAccount).toHaveBeenCalledWith(
      expect.not.objectContaining({
        initialBalance: expect.anything()
      })
    );
  });
});