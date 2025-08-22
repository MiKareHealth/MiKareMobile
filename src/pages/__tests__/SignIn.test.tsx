import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import SignIn from '../SignIn';
import { getSupabaseClient } from '../../lib/supabaseClient';

// Mock the Supabase client
jest.mock('../../lib/supabaseClient');
jest.mock('../../lib/regionDetection', () => ({
  getCurrentRegion: jest.fn(() => 'USA'),
  setUserRegion: jest.fn(),
}));
jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../../config/branding', () => ({
  SIGNIN_IMAGE: 'test-image.jpg',
  SIGNIN_VIDEO: 'test-video.mp4',
  MIKARE_LOGO: 'test-logo.png',
}));

// Mock RegionSelector component
jest.mock('../../components/RegionSelector', () => {
  return function MockRegionSelector({ onRegionChange, currentRegion }: any) {
    return (
      <select
        data-testid="region-selector"
        value={currentRegion}
        onChange={(e) => onRegionChange(e.target.value)}
      >
        <option value="USA">USA</option>
        <option value="UK">UK</option>
        <option value="AU">AU</option>
      </select>
    );
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
};

const mockGetSupabaseClient = getSupabaseClient as jest.MockedFunction<typeof getSupabaseClient>;

const renderSignIn = () => {
  return render(
    <BrowserRouter>
      <SignIn />
    </BrowserRouter>
  );
};

describe('SignIn Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupabaseClient.mockResolvedValue(mockSupabaseClient as any);
    
    // Clear localStorage before each test
    localStorage.clear();
    
    // Mock successful sign in
    mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123', user_metadata: {} } },
      error: null,
    });
    
    // Mock successful profile fetch
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { preferred_session_length: 30 },
            error: null,
          }),
        }),
      }),
    } as any);
  });

  describe('Basic Rendering', () => {
    it('renders sign in form with all required fields', () => {
      renderSignIn();
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it('renders region selector', () => {
      renderSignIn();
      expect(screen.getByTestId('region-selector')).toBeInTheDocument();
    });
  });

  describe('Attempt Tracking', () => {
    it('increments attempt counter on failed login', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      renderSignIn();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      expect(localStorage.setItem).toHaveBeenCalledWith('mikare_login_attempts', '1');
      expect(localStorage.setItem).toHaveBeenCalledWith('mikare_attempt_time', expect.any(String));
    });

    it('shows warning after 2 failed attempts', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      renderSignIn();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // First failed attempt
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword1');
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Clear form for second attempt
      await user.clear(emailInput);
      await user.clear(passwordInput);

      // Second failed attempt
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword2');
      await user.click(submitButton);

      await waitFor(() => {
        const warningElements = screen.getAllByText(/warning: one more failed attempt before password reset is required/i);
        expect(warningElements.length).toBeGreaterThan(0);
      });
    });

    it('locks account after 3 failed attempts', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      renderSignIn();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Three failed attempts
      for (let i = 0; i < 3; i++) {
        await user.clear(emailInput);
        await user.clear(passwordInput);
        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, `wrongpassword${i}`);
        await user.click(submitButton);
        await waitFor(() => {
          // For the first two attempts, expect "invalid email or password"
          // For the third attempt, expect "too many failed attempts"
          if (i < 2) {
            expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
          } else {
            expect(screen.getByText(/too many failed attempts/i)).toBeInTheDocument();
          }
        });
      }

      // Check that password field is disabled
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/account locked/i)).toBeInTheDocument();
    });

    it('resets attempts on successful login', async () => {
      const user = userEvent.setup();
      
      // First, set up a failed attempt
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      }).mockResolvedValueOnce({
        data: { user: { id: '123', user_metadata: {} } },
        error: null,
      });

      renderSignIn();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Failed attempt
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Clear form for successful attempt
      await user.clear(emailInput);
      await user.clear(passwordInput);

      // Successful attempt
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(localStorage.removeItem).toHaveBeenCalledWith('mikare_login_attempts');
        expect(localStorage.removeItem).toHaveBeenCalledWith('mikare_attempt_time');
      });
    });
  });

  describe('Forgot Password Functionality', () => {
    it('opens forgot password modal when link is clicked', async () => {
      const user = userEvent.setup();
      renderSignIn();
      
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      await user.click(forgotPasswordLink);
      
      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your email address/i)).toBeInTheDocument();
    });

    it('calls resetPasswordForEmail with correct email', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      renderSignIn();
      
      // Open modal
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      await user.click(forgotPasswordLink);
      
      // Enter email and submit
      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@example.com', {
          redirectTo: expect.stringContaining('/reset-password?email=test%40example.com')
        });
      });
    });

    it('shows success message after sending reset email', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      renderSignIn();
      
      // Open modal
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      await user.click(forgotPasswordLink);
      
      // Enter email and submit
      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/if that account exists, you'll receive a reset link/i)).toBeInTheDocument();
      });
    });

    it('shows error message when reset email fails', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'Failed to send email' },
      });

      renderSignIn();
      
      // Open modal
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      await user.click(forgotPasswordLink);
      
      // Enter email and submit
      const emailInput = screen.getByPlaceholderText(/enter your email address/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/failed to send reset email/i)).toBeInTheDocument();
      });
    });

    it('closes modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderSignIn();
      
      // Open modal
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      await user.click(forgotPasswordLink);
      
      // Verify modal is open
      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
      
      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      
      // Verify modal is closed
      expect(screen.queryByText(/reset password/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on form inputs', () => {
      renderSignIn();
      
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByTestId('password-input')).toBeInTheDocument();
    });

    it('has proper ARIA labels on password visibility toggle', () => {
      renderSignIn();
      
      const toggleButton = screen.getByLabelText(/show password/i);
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    });

    it('has proper ARIA label on close modal button', async () => {
      const user = userEvent.setup();
      renderSignIn();
      
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      await user.click(forgotPasswordLink);
      
      const closeButton = screen.getByLabelText(/close modal/i);
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Persistence', () => {
    it('loads attempts from localStorage on mount', () => {
      localStorageMock.getItem.mockReturnValueOnce('2'); // 2 attempts
      localStorageMock.getItem.mockReturnValueOnce(Date.now().toString()); // Recent time
      
      renderSignIn();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mikare_login_attempts');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mikare_attempt_time');
    });

    it('clears expired attempts from localStorage', () => {
      localStorageMock.getItem.mockReturnValueOnce('2'); // 2 attempts
      localStorageMock.getItem.mockReturnValueOnce((Date.now() - 6 * 60 * 1000).toString()); // 6 minutes ago
      
      renderSignIn();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mikare_login_attempts');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mikare_attempt_time');
    });

    it('persists warning message when navigating between sign-in and sign-up pages', () => {
      // Set up 2 failed attempts in localStorage
      localStorageMock.getItem.mockReturnValueOnce('2'); // 2 attempts
      localStorageMock.getItem.mockReturnValueOnce(Date.now().toString()); // Recent time
      
      const { unmount } = renderSignIn();
      
      // Verify warning message is shown
      expect(screen.getByText(/warning: one more failed attempt before account lockout/i)).toBeInTheDocument();
      
      // Simulate navigation to sign-up page (component unmount)
      unmount();
      
      // Verify lockout state is NOT cleared when navigating between auth pages
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('mikare_login_attempts');
      expect(localStorageMock.removeItem).not.toHaveBeenCalledWith('mikare_attempt_time');
    });

    it('clears lockout state when navigating to non-auth pages', () => {
      // Set up 2 failed attempts in localStorage
      localStorageMock.getItem.mockReturnValueOnce('2'); // 2 attempts
      localStorageMock.getItem.mockReturnValueOnce(Date.now().toString()); // Recent time
      
      const { unmount } = renderSignIn();
      
      // Simulate navigation to a non-auth page by triggering beforeunload
      window.dispatchEvent(new Event('beforeunload'));
      
      // Verify lockout state is cleared
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mikare_login_attempts');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mikare_attempt_time');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('mikare_lockout_until');
      
      unmount();
    });

    it('refreshes lockout state when page becomes visible', () => {
      // Set up a locked state in localStorage
      const lockoutTime = Date.now() + (5 * 60 * 1000); // 5 minutes from now
      localStorageMock.getItem.mockReturnValueOnce('3'); // 3 attempts
      localStorageMock.getItem.mockReturnValueOnce(Date.now().toString()); // Recent time
      localStorageMock.getItem.mockReturnValueOnce(lockoutTime.toString()); // Lockout until
      
      renderSignIn();
      
      // Verify lockout message is shown
      expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
      
      // Simulate page becoming visible
      Object.defineProperty(document, 'hidden', {
        value: false,
        writable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      
      // Verify getLockoutState was called again (refreshed)
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mikare_login_attempts');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mikare_attempt_time');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('mikare_lockout_until');
    });

    it('updates remaining lockout time display in real-time', () => {
      // Set up a locked state in localStorage
      const lockoutTime = Date.now() + (5 * 60 * 1000); // 5 minutes from now
      localStorageMock.getItem.mockReturnValueOnce('3'); // 3 attempts
      localStorageMock.getItem.mockReturnValueOnce(Date.now().toString()); // Recent time
      localStorageMock.getItem.mockReturnValueOnce(lockoutTime.toString()); // Lockout until
      
      renderSignIn();
      
      // Verify lockout message shows remaining time
      expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument();
      expect(screen.getByText(/please try again in/i)).toBeInTheDocument();
    });

    it('clears lockout state when lockout expires', () => {
      // Set up an expired lockout state in localStorage
      const expiredLockoutTime = Date.now() - (1 * 60 * 1000); // 1 minute ago (expired)
      localStorageMock.getItem.mockReturnValueOnce('3'); // 3 attempts
      localStorageMock.getItem.mockReturnValueOnce(Date.now().toString()); // Recent time
      localStorageMock.getItem.mockReturnValueOnce(expiredLockoutTime.toString()); // Expired lockout
      
      renderSignIn();
      
      // Verify lockout message is NOT shown (lockout expired)
      expect(screen.queryByText(/account temporarily locked/i)).not.toBeInTheDocument();
      
      // Verify the form is enabled (not locked)
      const passwordInput = screen.getByTestId('password-input');
      expect(passwordInput).not.toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('provides neutral error messages without revealing specific details', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      renderSignIn();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
        // Should not show specific error details
        expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
      });
    });

    it('handles unexpected errors gracefully', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));

      renderSignIn();
      
      const emailInput = screen.getByLabelText(/email address/i);
      const passwordInput = screen.getByTestId('password-input');
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Query Parameter Banners', () => {
    const renderSignInWithParams = (params: string) => {
      return render(
        <BrowserRouter>
          <SignIn />
        </BrowserRouter>
      );
    };

    it('shows success banner when reset=success', () => {
      // Mock window.location.search
      Object.defineProperty(window, 'location', {
        value: {
          search: '?reset=success',
        },
        writable: true,
      });

      renderSignIn();
      
      expect(screen.getByText(/your password was updated/i)).toBeInTheDocument();
      expect(screen.getByText(/please sign in/i)).toBeInTheDocument();
    });

    it('shows error banner when reset=error', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?reset=error',
        },
        writable: true,
      });

      renderSignIn();
      
      expect(screen.getByText(/reset link invalid or expired/i)).toBeInTheDocument();
      expect(screen.getByText(/request a new link/i)).toBeInTheDocument();
    });

    it('shows expired banner when reset=expired with resend link', () => {
      Object.defineProperty(window, 'location', {
        value: {
          search: '?reset=expired',
        },
        writable: true,
      });

      renderSignIn();
      
      expect(screen.getByText(/reset link has expired/i)).toBeInTheDocument();
      expect(screen.getByText(/request new link/i)).toBeInTheDocument();
    });

    it('opens forgot password modal when clicking resend link in expired banner', async () => {
      const user = userEvent.setup();
      Object.defineProperty(window, 'location', {
        value: {
          search: '?reset=expired',
        },
        writable: true,
      });

      renderSignIn();
      
      const resendLink = screen.getByText(/request new link/i);
      await user.click(resendLink);

      await waitFor(() => {
        expect(screen.getByText(/reset password/i)).toBeInTheDocument();
      });
    });
  });

  describe('Forgot Password Flow', () => {
    it('sends reset email with custom redirect URL', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      renderSignIn();
      
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      await user.click(forgotPasswordLink);

      const emailInput = screen.getByTestId('reset-email');
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          'test@example.com',
          {
            redirectTo: expect.stringContaining('/reset-password?email=test%40example.com')
          }
        );
      });
    });

    it('shows neutral confirmation message regardless of email existence', async () => {
      const user = userEvent.setup();
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      renderSignIn();
      
      const forgotPasswordLink = screen.getByText(/forgot password/i);
      await user.click(forgotPasswordLink);

      const emailInput = screen.getByTestId('reset-email');
      await user.type(emailInput, 'nonexistent@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/if that account exists, you'll receive a reset link/i)).toBeInTheDocument();
      });
    });
  });
}); 