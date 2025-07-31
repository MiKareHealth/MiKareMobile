import { useContext } from 'react';
import { SessionContext } from '../contexts/SessionTimeoutContext';

export const useSessionTimeout = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionProvider');
  }
  return context;
};