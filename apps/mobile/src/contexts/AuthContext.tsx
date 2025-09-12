import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient, storage } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  checkAutoLogin: () => Promise<boolean>;
  refreshAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let authSubscription: any = null;

    // Initialize Supabase client and get initial session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const supabase = await getSupabaseClient();
        
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
        } else {
          console.log('Initial session:', initialSession?.user?.email ? 'User found' : 'No user');
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }

        // Check for auto-login after initial session check
        if (!initialSession) {
          await checkAutoLoginInternal();
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email || 'No user');
            setSession(session);
            setUser(session?.user ?? null);
            
            // Store session in secure storage only if remember me is enabled
            if (session) {
              const rememberLogin = await storage.getItem('mikare_remember_login');
              if (rememberLogin === 'true') {
                await storage.setItem('mikare_session', JSON.stringify(session));
              }
            } else {
              await storage.removeItem('mikare_session');
            }
          }
        );

        authSubscription = subscription;
        setLoading(false);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Cleanup function
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      console.log('Attempting sign in...');
      const supabase = await getSupabaseClient();
      
      // Set remember me preference before sign in
      if (rememberMe) {
        await storage.setItem('mikare_remember_login', 'true');
      } else {
        await storage.removeItem('mikare_remember_login');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error.message);
        return { error };
      }
      
      console.log('Sign in successful:', data.user?.email);
      
      // Store credentials securely if remember me is enabled
      if (rememberMe && data.session) {
        await storage.setItem('mikare_session', JSON.stringify(data.session));
      }
      
      return { error: null };
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out...');
      const supabase = await getSupabaseClient();
      
      // Clear user state immediately to prevent navigation conflicts
      setUser(null);
      setSession(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear storage
      await storage.removeItem('mikare_session');
      await storage.removeItem('mikare_remember_login');
      
      console.log('Sign out completed successfully');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  };

  const checkAutoLoginInternal = async (): Promise<boolean> => {
    try {
      const rememberLogin = await storage.getItem('mikare_remember_login');
      const savedSession = await storage.getItem('mikare_session');
      
      if (rememberLogin === 'true' && savedSession) {
        console.log('Auto-login: Found saved session');
        const session = JSON.parse(savedSession);
        
        // Check if session is still valid (not expired)
        const now = Math.round(Date.now() / 1000);
        if (session.expires_at && now < session.expires_at) {
          console.log('Auto-login: Session still valid');
          
          // Set the session in Supabase client
          const supabase = await getSupabaseClient();
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
          
          return true;
        } else {
          console.log('Auto-login: Session expired');
          // Clean up expired session
          await storage.removeItem('mikare_session');
          return false;
        }
      }
      
      console.log('Auto-login: No saved session');
      return false;
    } catch (error) {
      console.error('Auto-login error:', error);
      return false;
    }
  };

  const checkAutoLogin = async (): Promise<boolean> => {
    return await checkAutoLoginInternal();
  };

  const refreshAuthState = async (): Promise<void> => {
    try {
      console.log('Refreshing auth state...');
      const supabase = await getSupabaseClient();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      console.log('Current session after refresh:', currentSession?.user?.email || 'No user');
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    } catch (error) {
      console.error('Error refreshing auth state:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    checkAutoLogin,
    refreshAuthState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
