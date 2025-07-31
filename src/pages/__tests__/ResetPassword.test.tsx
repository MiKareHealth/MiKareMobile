import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import ResetPassword from '../ResetPassword';
import { getSupabaseClient } from '../../lib/supabaseClient';

// Mock the Supabase client
jest.mock('../../lib/supabaseClient');
jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../config/branding', () => ({
  MIKARE_LOGO: 'test-logo.png',
}));

const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
  },
};

const mockGetSupabaseClient = getSupabaseClient as jest.MockedFunction<typeof getSupabaseClient>;

const renderResetPassword = (searchParams = '') => {
  // Mock useSearchParams
  const mockSearchParams = new URLSearchParams(searchParams);
  jest.spyOn(require('react-router-dom'), 'useSearchParams').mockReturnValue([mockSearchParams]);

  return render(
    <BrowserRouter>
      <ResetPassword />
    </BrowserRouter>
  );
};

describe('ResetPassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupabaseClient.mockResolvedValue(mockSupabaseClient as any);
  });

  describe('Token Validation', () => {
    it('shows loading state while validating token', () => {
      mockSupabaseClient.auth.getUser.mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      renderResetPassword('?token=valid-token');
      
      expect(screen.getByText(/validating reset link/i)).toBeInTheDocument();
    });

    it('shows error when no token is provided', () => {
      renderResetPassword();
      
      expect(screen.getByRole('heading', { name: /invalid reset link/i })).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid reset link/i);
    });

    it('shows error when token is invalid', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      renderResetPassword('?token=invalid-token');
      
      await waitFor(() => {
        expect(screen.getByText(/reset link invalid or expired/i)).toBeInTheDocument();
      });
    });

    it('validates token and shows form when valid', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });

      renderResetPassword('?token=valid-token&email=test@example.com');
      
      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
        expect(screen.getByText(/resetting password for: test@example.com/i)).toBeInTheDocument();
      });
    });

    it('shows error when email mismatch', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'different@example.com' } },
        error: null,
      });

      renderResetPassword('?token=valid-token&email=test@example.com');
      
      await waitFor(() => {
        expect(screen.getByText(/email mismatch/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Update', () => {
    beforeEach(async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });
    });

    it('validates password requirements', async () => {
      const user = userEvent.setup();
      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('new-password-input');
      const confirmInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(passwordInput, 'short');
      await user.type(confirmInput, 'short');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/password must be at least 8 characters long/i);
      });
    });

    it('validates password confirmation', async () => {
      const user = userEvent.setup();
      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('new-password-input');
      const confirmInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(passwordInput, 'password123');
      await user.type(confirmInput, 'different123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
      });
    });

    it('successfully updates password', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });

      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('new-password-input');
      const confirmInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
          password: 'newpassword123'
        });
      });

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /password updated successfully/i })).toBeInTheDocument();
      });
    });

    it('handles expired token error', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token has expired' },
      });

      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('new-password-input');
      const confirmInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/reset link has expired/i);
      });
    });

    it('handles invalid token error', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token has expired' },
      });

      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('new-password-input');
      const confirmInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/reset link has expired/i);
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    beforeEach(async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('new-password-input');
      const toggleButton = screen.getByTestId('password-toggle');

      expect(passwordInput).toHaveAttribute('type', 'password');
      
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('toggles confirm password visibility', async () => {
      const user = userEvent.setup();
      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const confirmInput = screen.getByTestId('confirm-password-input');
      const confirmToggleButton = screen.getByTestId('confirm-password-toggle');

      expect(confirmInput).toHaveAttribute('type', 'password');
      
      await user.click(confirmToggleButton);
      expect(confirmInput).toHaveAttribute('type', 'text');
      
      await user.click(confirmToggleButton);
      expect(confirmInput).toHaveAttribute('type', 'password');
    });
  });

  describe('Error Handling', () => {
    it('handles unexpected errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Network error'));

      renderResetPassword('?token=valid-token');
      
      await waitFor(() => {
        expect(screen.getByText(/unable to validate reset link/i)).toBeInTheDocument();
      });
    });

    it('handles password update errors gracefully', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });
      mockSupabaseClient.auth.updateUser.mockRejectedValue(new Error('Network error'));

      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const passwordInput = screen.getByTestId('new-password-input');
      const confirmInput = screen.getByTestId('confirm-password-input');
      const submitButton = screen.getByRole('button', { name: /update password/i });

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/an unexpected error occurred/i);
      });
    });
  });

  describe('Navigation', () => {
    it('provides link back to sign in', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });

      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
      });

      const backLink = screen.getByText(/back to sign in/i);
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/signin');
    });

    it('provides resend link option for invalid tokens', () => {
      renderResetPassword();

      const resendButton = screen.getByText(/request new reset link/i);
      expect(resendButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { email: 'test@example.com' } },
        error: null,
      });
    });

    it('has proper ARIA labels on form inputs', async () => {
      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        expect(screen.getByTestId('new-password-input')).toBeInTheDocument();
        expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument();
      });
    });

    it('has proper ARIA labels on password visibility toggles', async () => {
      renderResetPassword('?token=valid-token');

      await waitFor(() => {
        const toggleButtons = screen.getAllByLabelText(/show password/i);
        expect(toggleButtons).toHaveLength(2);
      });
    });

    it('has proper ARIA labels on error banners', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      renderResetPassword('?token=invalid-token');
      
      await waitFor(() => {
        const errorBanner = screen.getByRole('alert');
        expect(errorBanner).toBeInTheDocument();
      });
    });
  });
}); 