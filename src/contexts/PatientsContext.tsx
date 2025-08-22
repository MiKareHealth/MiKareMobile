import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Patient } from '../types/database';

// Only the minimal fields needed for sidebar, dashboard, etc.
export type PatientSummary = Pick<Patient, 'id' | 'full_name' | 'photo_url' | 'relationship'>;

interface PatientsContextType {
  patients: PatientSummary[];
  loading: boolean;
  refreshPatients: () => Promise<void>;
  addPatient: (patient: PatientSummary) => void;
  updatePatient: (patient: PatientSummary) => void;
  removePatient: (patientId: string) => void;
  debugFetchPatients?: () => Promise<void>; // Optional debug function
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

export function PatientsProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const patientsRef = useRef<PatientSummary[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);

  const fetchPatients = useCallback(async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[PatientsContext] fetchPatients: starting...');
    }
    try {
      setLoading(true);
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[PatientsContext] fetchPatients: user', user?.email, 'id:', user?.id);
      }
      
      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PatientsContext] fetchPatients: no user, clearing patients');
        }
        setPatients([]);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PatientsContext] fetchPatients: no active session, waiting...');
        }
        setLoading(false);
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[PatientsContext] fetchPatients: querying patients for user_id:', user.id);
      }
      
      const { data: patientsData, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[PatientsContext] fetchPatients: patientsData', patientsData);
        console.log('[PatientsContext] fetchPatients: found', patientsData?.length || 0, 'patients');
      }
      
      setPatients(patientsData || []);
    } catch (error) {
      console.error('[PatientsContext] fetchPatients: error', error);
      setPatients([]);
    } finally {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PatientsContext] fetchPatients: completed, loading set to false');
      }
      setLoading(false);
    }
  }, []); // Empty dependency array since this function doesn't depend on any state

  // Initial fetch and auth state listener - only run once on mount
  useEffect(() => {
    console.log('[PatientsContext] useEffect: setting up auth listener');
    
    let supabase: any;
    let authListener: any;
    let isMounted = true;
    
    const setupAuthListener = async () => {
      try {
        supabase = await getSupabaseClient();
        console.log('[PatientsContext] Supabase client obtained');
        
        // First, try to fetch patients if user is already authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        console.log('[PatientsContext] Initial user check:', user ? 'authenticated' : 'not authenticated', userError);
        
        if (!isMounted) return;
        
        if (user) {
          console.log('[PatientsContext] User already authenticated, fetching patients');
          try {
            await fetchPatients();
          } catch (error) {
            console.error('[PatientsContext] Initial fetch failed:', error);
            // If initial fetch fails, we'll rely on the fallback mechanism
            setLoading(false);
          }
        } else {
          console.log('[PatientsContext] No user found, waiting for auth state change');
          setLoading(false);
        }
        
        setAuthChecked(true);
        
        // Set up auth state change listener
        authListener = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[PatientsContext] Auth state changed:', event, 'user:', session?.user?.email);
          }
          
          if (!isMounted) return;
          
          if (event === 'SIGNED_IN' && session?.user) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[PatientsContext] User signed in, waiting for auth to be fully established...');
            }
            // Clear patients first to ensure clean state
            setPatients([]);
            setLoading(true);
            // Increased delay to ensure auth is fully established and context is ready
            // Also add retry logic in case the first attempt fails
            let retryCount = 0;
            const maxRetries = 3;
            
            const attemptFetch = async () => {
              if (!isMounted) return;
              
              try {
                if (process.env.NODE_ENV === 'development') {
                  console.log('[PatientsContext] Attempting to fetch patients, retry:', retryCount);
                }
                await fetchPatients();
              } catch (error) {
                console.error('[PatientsContext] Fetch attempt failed:', error);
                retryCount++;
                if (retryCount < maxRetries && isMounted) {
                  if (process.env.NODE_ENV === 'development') {
                    console.log('[PatientsContext] Retrying in 1 second...');
                  }
                  setTimeout(attemptFetch, 1000);
                } else if (isMounted) {
                  console.error('[PatientsContext] Max retries reached, giving up');
                  setLoading(false);
                }
              }
            };
            
            // Initial delay before first attempt
            setTimeout(attemptFetch, 1000);
          } else if (event === 'SIGNED_OUT') {
            if (process.env.NODE_ENV === 'development') {
              console.log('[PatientsContext] User signed out, clearing patients');
            }
            setPatients([]);
            setLoading(false);
          } else if (event === 'TOKEN_REFRESHED') {
            if (process.env.NODE_ENV === 'development') {
              console.log('[PatientsContext] Token refreshed, checking if we need to refetch patients');
            }
            // Only refetch if we don't have patients and user is authenticated
            if (isMounted && patientsRef.current.length === 0 && session?.user) {
              if (process.env.NODE_ENV === 'development') {
                console.log('[PatientsContext] Refetching patients after token refresh');
              }
              fetchPatients();
            }
          }
        });
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[PatientsContext] Auth listener set up successfully');
        }
      } catch (err) {
        console.error('[PatientsContext] Error setting up auth listener:', err);
        if (isMounted) {
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };
    
    setupAuthListener();
    
    return () => {
      isMounted = false;
      if (authListener && typeof authListener.subscription?.unsubscribe === 'function') {
        console.log('[PatientsContext] Cleaning up auth listener');
        authListener.subscription.unsubscribe();
      }
    };
  }, []); // Remove fetchPatients dependency to prevent infinite loop

  // Listen for region changes and re-fetch patients if needed
  useEffect(() => {
    if (!authChecked) return; // Don't start region polling until auth is checked
    
    let lastRegion = localStorage.getItem('mikare_selected_region');
    let interval: NodeJS.Timeout | null = null;
    let isMounted = true;

    const checkRegion = async () => {
      if (!isMounted) return;
      
      const currentRegion = localStorage.getItem('mikare_selected_region');
      if (currentRegion !== lastRegion) {
        console.log('[PatientsContext] Region changed:', lastRegion, '→', currentRegion);
        lastRegion = currentRegion;
        setPatients([]);
        setLoading(true);
        // Only fetch if user is authenticated
        const supabase = await getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted) {
          await fetchPatients();
        } else if (isMounted) {
          setLoading(false);
        }
      }
    };

    interval = setInterval(checkRegion, 1000); // Poll every second

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [authChecked]); // Remove fetchPatients dependency

  // Fallback mechanism: if we're authenticated but have no patients after a delay, try to fetch again
  useEffect(() => {
    if (!authChecked || patients.length > 0) return;
    
    let timeout: NodeJS.Timeout;
    let retryTimeout: NodeJS.Timeout;
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const fallbackFetch = async () => {
      if (!isMounted) return;
      
      console.log('[PatientsContext] Fallback: checking if we should fetch patients, attempt:', retryCount + 1);
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && isMounted && patients.length === 0 && !loading) {
        try {
          console.log('[PatientsContext] Fallback: user authenticated but no patients, fetching...');
          await fetchPatients();
        } catch (error) {
          console.error('[PatientsContext] Fallback fetch failed:', error);
          retryCount++;
          if (retryCount < maxRetries && isMounted) {
            console.log('[PatientsContext] Fallback: retrying in 2 seconds...');
            retryTimeout = setTimeout(fallbackFetch, 2000);
          }
        }
      } else if (isMounted && !user) {
        // Don't retry if there's no user - this is expected on auth pages
        console.log('[PatientsContext] Fallback: no authenticated user found, stopping fallback mechanism');
        return;
      }
    };

    timeout = setTimeout(fallbackFetch, 2000); // Wait 2 seconds before first fallback attempt

    return () => {
      isMounted = false;
      if (timeout) clearTimeout(timeout);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [authChecked, patients.length, loading]); // Remove fetchPatients dependency

  const addPatient = (patient: PatientSummary) => {
    setPatients((prev) => [patient, ...prev]);
  };

  const updatePatient = (patient: PatientSummary) => {
    setPatients((prev) => prev.map((p) => (p.id === patient.id ? patient : p)));
  };

  const removePatient = (patientId: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== patientId));
  };

  return (
    <PatientsContext.Provider
      value={{ 
        patients, 
        loading, 
        refreshPatients: fetchPatients, 
        addPatient, 
        updatePatient, 
        removePatient
      }}
    >
      {children}
    </PatientsContext.Provider>
  );
};

export function usePatients() {
  const ctx = useContext(PatientsContext);
  if (!ctx) throw new Error('usePatients must be used within a PatientsProvider');
  return ctx;
} 