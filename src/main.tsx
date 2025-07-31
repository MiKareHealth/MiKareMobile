import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SubscriptionProvider>
      <UserPreferencesProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </UserPreferencesProvider>
    </SubscriptionProvider>
  </StrictMode>
);