import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

export const PatientsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const fetchPatients = useCallback(async () => {
    console.log('[PatientsContext] fetchPatients: starting...');
    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      // Wait for authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[PatientsContext] fetchPatients: user error', userError);
        setPatients([]);
        setLoading(false);
        return;
      }
      
      console.log('[PatientsContext] fetchPatients: user', user?.email, 'id:', user?.id);
      
      if (!user) {
        console.log('[PatientsContext] fetchPatients: no user, clearing patients');
        setPatients([]);
        setLoading(false);
        return;
      }

      // Test the query with explicit user_id filter
      console.log('[PatientsContext] fetchPatients: querying patients for user_id:', user.id);
      
      // Only fetch minimal fields
      const { data: patientsData, error } = await supabase
        .from('patients')
        .select('id, full_name, photo_url, relationship')
        .eq('user_id', user.id) // Explicitly filter by user_id
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('[PatientsContext] fetchPatients: error', error);
        throw error;
      }
      
      console.log('[PatientsContext] fetchPatients: patientsData', patientsData);
      console.log('[PatientsContext] fetchPatients: found', patientsData?.length || 0, 'patients');
      setPatients(patientsData || []);
    } catch (err) {
      console.error('[PatientsContext] fetchPatients: catch', err);
      setPatients([]);
    } finally {
      setLoading(false);
      setIsInitialized(true);
      console.log('[PatientsContext] fetchPatients: completed, loading set to false');
    }
  }, []);

  // Initial fetch and auth state listener
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
          await fetchPatients();
        } else {
          console.log('[PatientsContext] No user found, waiting for auth state change');
          setLoading(false);
        }
        
        setAuthChecked(true);
        
        // Set up auth state change listener
        authListener = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
          console.log('[PatientsContext] Auth state changed:', event, 'user:', session?.user?.email);
          
          if (!isMounted) return;
          
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('[PatientsContext] User signed in, fetching patients');
            setPatients([]);
            setLoading(true);
            await fetchPatients();
          } else if (event === 'SIGNED_OUT') {
            console.log('[PatientsContext] User signed out, clearing patients');
            setPatients([]);
            setLoading(false);
          }
          // Removed TOKEN_REFRESHED handler to prevent unnecessary re-fetching
        });
        
        console.log('[PatientsContext] Auth listener set up successfully');
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
  }, [fetchPatients]);

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
        // Only refetch if user is authenticated and we have patients
        const supabase = await getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user && isMounted && patients.length > 0) {
          setLoading(true);
          await fetchPatients();
        }
      }
    };

    interval = setInterval(checkRegion, 1000); // Poll every second

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchPatients, authChecked, patients.length]);

  // Removed fallback mechanism to prevent infinite loops when user has no patients

  const addPatient = (patient: PatientSummary) => {
    setPatients((prev) => [patient, ...prev]);
  };

  const updatePatient = (patient: PatientSummary) => {
    setPatients((prev) => prev.map((p) => (p.id === patient.id ? patient : p)));
  };

  const removePatient = (patientId: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== patientId));
  };

  // Test function to verify authentication and database access
  const testAuthAndDatabase = async () => {
    console.log('[PatientsContext] Testing auth and database access...');
    try {
      const supabase = await getSupabaseClient();
      
      // Test 1: Check authentication
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[PatientsContext] Test 1 - Auth check:', { user: user?.email, error: userError });
      
      if (!user) {
        console.log('[PatientsContext] Test failed: No authenticated user');
        return;
      }
      
      // Test 2: Check if we can query the patients table
      const { data: testData, error: testError } = await supabase
        .from('patients')
        .select('count')
        .eq('user_id', user.id);
      
      console.log('[PatientsContext] Test 2 - Database access:', { 
        count: testData?.length || 0, 
        error: testError 
      });
      
      // Test 3: Check RLS policies by trying to query without user_id filter
      const { data: allData, error: allError } = await supabase
        .from('patients')
        .select('id, user_id, full_name')
        .limit(5);
      
      console.log('[PatientsContext] Test 3 - RLS test:', { 
        count: allData?.length || 0, 
        error: allError,
        data: allData 
      });
      
    } catch (err) {
      console.error('[PatientsContext] Test failed:', err);
    }
  };

  // Run test on mount in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      testAuthAndDatabase();
    }
  }, []);

  return (
    <PatientsContext.Provider
      value={{ patients, loading, refreshPatients: fetchPatients, addPatient, updatePatient, removePatient }}
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