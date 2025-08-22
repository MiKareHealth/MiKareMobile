import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Patient } from '../types/database';

// Only the minimal fields needed for sidebar, dashboard, etc.
export type PatientSummary = Pick<Patient, 'id' | 'full_name' | 'photo_url' | 'relationship'>;

interface PatientsContextType {
  patients: PatientSummary[];
  loading: boolean;
  error: Error | null;
  refreshPatients: () => Promise<void>;
  addPatient: (patient: Omit<PatientSummary, 'id'>) => Promise<PatientSummary>;
  updatePatient: (patient: PatientSummary) => Promise<PatientSummary>;
  removePatient: (patientId: string) => Promise<string>;
  isAddingPatient: boolean;
  isUpdatingPatient: boolean;
  isDeletingPatient: boolean;
}

const PatientsContext = createContext<PatientsContextType | undefined>(undefined);

export function PatientsProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const patientsRef = useRef<PatientSummary[]>([]);
  const initialFetchCompletedRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Keep ref in sync with state
  useEffect(() => {
    patientsRef.current = patients;
  }, [patients]);

  const fetchPatients = useCallback(async (force = false) => {
    const now = Date.now();
    
    // Skip fetch if we have recent data and not forcing
    if (!force && patients.length > 0 && (now - lastFetchTimeRef.current) < CACHE_DURATION) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PatientsContext] Using cached patients data');
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[PatientsContext] fetchPatients: starting...');
    }
    
    try {
      setLoading(true);
      setError(null);
      
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
        initialFetchCompletedRef.current = true;
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
      lastFetchTimeRef.current = now;
      initialFetchCompletedRef.current = true;
    } catch (error) {
      console.error('[PatientsContext] fetchPatients: error', error);
      setError(error as Error);
      setPatients([]);
      initialFetchCompletedRef.current = true;
    } finally {
      if (process.env.NODE_ENV === 'development') {
        console.log('[PatientsContext] fetchPatients: completed, loading set to false');
      }
      setLoading(false);
    }
  }, [patients.length]);

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
            await fetchPatients(true); // Force fetch for initial load
          } catch (error) {
            console.error('[PatientsContext] Initial fetch failed:', error);
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
              console.log('[PatientsContext] User signed in, fetching patients');
            }
            setPatients([]);
            setLoading(true);
            initialFetchCompletedRef.current = false;
            await fetchPatients(true); // Force fetch for new login
          } else if (event === 'SIGNED_OUT') {
            if (process.env.NODE_ENV === 'development') {
              console.log('[PatientsContext] User signed out, clearing patients');
            }
            setPatients([]);
            setLoading(false);
            initialFetchCompletedRef.current = false;
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
  }, []); // Empty dependency array to run only once

  // Handle region changes
  useEffect(() => {
    if (!authChecked) return;
    
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
        await fetchPatients(true); // Force fetch for region change
      }
    };

    interval = setInterval(checkRegion, 1000);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [authChecked, fetchPatients]);

  // Optimized add patient function
  const addPatient = useCallback(async (patient: Omit<PatientSummary, 'id'>): Promise<PatientSummary> => {
    setIsAddingPatient(true);
    setError(null);
    
    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('patients')
        .insert([{ ...patient, user_id: user.id }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Optimistically update the local state
      setPatients(prev => [data, ...prev]);
      
      return data;
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setIsAddingPatient(false);
    }
  }, []);

  // Optimized update patient function
  const updatePatient = useCallback(async (patient: PatientSummary): Promise<PatientSummary> => {
    setIsUpdatingPatient(true);
    setError(null);
    
    try {
      const supabase = await getSupabaseClient();
      
      const { data, error } = await supabase
        .from('patients')
        .update(patient)
        .eq('id', patient.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Optimistically update the local state
      setPatients(prev => prev.map(p => p.id === patient.id ? data : p));
      
      return data;
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setIsUpdatingPatient(false);
    }
  }, []);

  // Optimized remove patient function
  const removePatient = useCallback(async (patientId: string): Promise<string> => {
    setIsDeletingPatient(true);
    setError(null);
    
    try {
      const supabase = await getSupabaseClient();
      
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) {
        throw error;
      }

      // Optimistically update the local state
      setPatients(prev => prev.filter(p => p.id !== patientId));
      
      return patientId;
    } catch (error) {
      setError(error as Error);
      throw error;
    } finally {
      setIsDeletingPatient(false);
    }
  }, []);

  const contextValue: PatientsContextType = {
    patients,
    loading,
    error,
    refreshPatients: () => fetchPatients(true),
    addPatient,
    updatePatient,
    removePatient,
    isAddingPatient,
    isUpdatingPatient,
    isDeletingPatient,
  };

  return (
    <PatientsContext.Provider value={contextValue}>
      {children}
    </PatientsContext.Provider>
  );
}

export function usePatients() {
  const ctx = useContext(PatientsContext);
  if (!ctx) throw new Error('usePatients must be used within a PatientsProvider');
  return ctx;
} 