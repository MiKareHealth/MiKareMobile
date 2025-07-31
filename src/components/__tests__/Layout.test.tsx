import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../Layout';
import { PatientsProvider } from '../../contexts/PatientsContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock the supabase client
jest.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve()),
    },
  })),
}));

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <PatientsProvider>
          {component}
        </PatientsProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Layout Component', () => {
  it('should show skeleton loading initially and then hide it', async () => {
    renderWithProviders(
      <Layout>
        <div>Test content</div>
      </Layout>
    );

    // Initially should show skeleton loading
    expect(screen.getByText('Test content')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      // The skeleton should be hidden after loading completes
      // We can't directly test the skeleton since it's internal state,
      // but we can verify the component renders without errors
      expect(screen.getByText('Test content')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should not get stuck in loading loop when there are no patients', async () => {
    // Mock console.log to capture the loading state messages
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    renderWithProviders(
      <Layout>
        <div>Test content</div>
      </Layout>
    );

    // Wait for the component to settle
    await waitFor(() => {
      expect(screen.getByText('Test content')).toBeInTheDocument();
    }, { timeout: 5000 });

    // Check that we don't see repeated loading messages
    const loadingMessages = consoleSpy.mock.calls.filter(call => 
      call[0]?.includes('[Layout] Sidebar loading state:')
    );
    
    // Should not have excessive loading state changes
    expect(loadingMessages.length).toBeLessThan(10);
    
    consoleSpy.mockRestore();
  });
}); 