import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import SessionTimeoutModal from '../components/SessionTimeoutModal';

interface SessionContextType {
  timeRemaining: number | null;
  showWarning: boolean;
  resetSession: () => void;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function useSessionTimeout() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSessionTimeout must be used within a SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: ReactNode;
  warningThresholdMinutes?: number;
  checkIntervalSeconds?: number;
  enabled?: boolean;
}

export function SessionProvider({
  children,
  warningThresholdMinutes = 2,
  checkIntervalSeconds = 30,
  enabled = true
}: SessionProviderProps) {
  const navigate = useNavigate();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  
  // Get session information from localStorage
  const getSessionInfo = () => {
    const sessionStart = parseInt(localStorage.getItem('sessionStart') || '0');
    const sessionLengthMinutes = parseInt(localStorage.getItem('sessionLength') || '30');
    
    if (!sessionStart) {
      // No stored session timestamp, set it now
      const now = Date.now();
      localStorage.setItem('sessionStart', now.toString());
      return { sessionStart: now, sessionLengthMinutes };
    }
    
    return { sessionStart, sessionLengthMinutes };
  };
  
  // Logout function
  const logout = async () => {
    console.log('Session expired, logging out...');
    try {
      // Clear session data from localStorage
      localStorage.removeItem('sessionStart');
      localStorage.removeItem('sessionLength');
      
      // Try to update session record in database
      try {
        const supabase = await getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: sessions } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('login_time', { ascending: false })
            .limit(1);
            
          if (sessions && sessions.length > 0) {
            await supabase
              .from('user_sessions')
              .update({ 
                logout_time: new Date().toISOString(),
                is_active: false
              })
              .eq('id', sessions[0].id);
          }
        }
      } catch (err) {
        console.error('Error updating session record:', err);
      }
      
      // Sign out
      const supabase = await getSupabaseClient();
      await supabase.auth.signOut();
      
      // Clear all localStorage and navigate to login
      localStorage.clear();
      navigate('/signin');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force logout even if there's an error
      localStorage.clear();
      navigate('/signin');
    }
  };
  
  // Reset the session timer
  const resetSession = () => {
    const now = Date.now();
    localStorage.setItem('sessionStart', now.toString());
    setShowWarning(false);
    setShowTimeoutModal(false);
    
    // Re-calculate time remaining
    const { sessionLengthMinutes } = getSessionInfo();
    const remainingMs = sessionLengthMinutes * 60 * 1000;
    setTimeRemaining(remainingMs);
  };
  
  // Set up the session timer on mount and when reset
  useEffect(() => {
    if (!enabled) return;
    
    const checkSessionTimeout = () => {
      const { sessionStart, sessionLengthMinutes } = getSessionInfo();
      const sessionTimeoutMs = sessionLengthMinutes * 60 * 1000;
      const warningTimeoutMs = warningThresholdMinutes * 60 * 1000;
      
      const now = Date.now();
      const elapsedMs = now - sessionStart;
      const remainingMs = Math.max(0, sessionTimeoutMs - elapsedMs);
      
      setTimeRemaining(remainingMs);
      
      // If session is expired, logout
      if (remainingMs <= 0) {
        logout();
        return;
      }
      
      // If we're in the warning period, show the warning
      if (remainingMs <= warningTimeoutMs) {
        setShowWarning(true);
        setShowTimeoutModal(true);
      } else {
        setShowWarning(false);
        setShowTimeoutModal(false);
      }
    };
    
    // Check immediately
    checkSessionTimeout();
    
    // Set interval for checking
    const intervalId = setInterval(checkSessionTimeout, checkIntervalSeconds * 1000);
    return () => clearInterval(intervalId);
  }, [enabled, warningThresholdMinutes, checkIntervalSeconds]);
  
  // User activity detection to reset session timer
  useEffect(() => {
    if (!enabled) return;
    
    const handleUserActivity = () => {
      // Only reset if we're not in warning mode
      if (!showWarning) {
        resetSession();
      }
    };
    
    // Listen for user activity events
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [enabled, showWarning]);
  
  // Initialize session on first render
  useEffect(() => {
    // Check if user is logged in by checking if we have a session
    const initSession = async () => {
      try {
        const supabase = await getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // Get user preferences for session length
          try {
            const { data: user } = await supabase.auth.getUser();
            if (user) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('preferred_session_length')
                .eq('id', user.user.id)
                .single();
                
              if (profileData) {
                const sessionLength = profileData.preferred_session_length || 30;
                localStorage.setItem('sessionLength', sessionLength.toString());
              }
            }
          } catch (err) {
            console.error('Error getting user preferences:', err);
            // Default to 30 minutes if we can't get preferences
            localStorage.setItem('sessionLength', '30');
          }
          
          // Set the session start time if not already set
          if (!localStorage.getItem('sessionStart')) {
            localStorage.setItem('sessionStart', Date.now().toString());
          }
        }
      } catch (err) {
        console.error('Error initializing session:', err);
      }
    };
    
    initSession();
  }, []);
  
  return (
    <SessionContext.Provider value={{ timeRemaining, showWarning, resetSession, logout }}>
      {children}
      <SessionTimeoutModal 
        isVisible={showTimeoutModal}
        timeRemaining={timeRemaining} 
        onExtendSession={resetSession} 
        onLogout={logout} 
      />
    </SessionContext.Provider>
  );
}

export { SessionContext }