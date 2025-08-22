import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Patient, PatientActivity, PatientDocument, Symptom, DiaryEntry, Medication, MoodEntry } from '../types/database';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { isToday } from '../utils/timeUtils';
import { log, error as logError } from '../utils/logger';

export function usePatientData(patientId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [activities, setActivities] = useState<PatientActivity[]>([]);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [todaysMood, setTodaysMood] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { preferences } = useUserPreferences();

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate patient ID before making any database queries
      if (!patientId || patientId === 'undefined' || patientId.trim() === '') {
        setError('Invalid patient ID provided');
        setLoading(false);
        return;
      }

      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch patient
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (patientError) throw patientError;
        setPatient(patientData);

        // Fetch activities
        const { data: activitiesData } = await supabase
          .from('patient_activities')
          .select('*')
          .eq('patient_id', patientId)
          .order('activity_date', { ascending: false });

        if (activitiesData) {
          setActivities(activitiesData);
        }

        // Fetch documents
        const { data: documentsData } = await supabase
          .from('patient_documents')
          .select('*')
          .eq('patient_id', patientId)
          .order('uploaded_at', { ascending: false });

        if (documentsData) {
          setDocuments(documentsData);
        }

        // Fetch symptoms
        const { data: symptomsData } = await supabase
          .from('symptoms')
          .select('*')
          .eq('profile_id', patientId)
          .order('start_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (symptomsData) {
          setSymptoms(symptomsData);
        }

        // Fetch diary entries
        const { data: diaryEntriesData } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('profile_id', patientId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (diaryEntriesData) {
          setDiaryEntries(diaryEntriesData);
        }

        // Fetch medications
        const { data: medicationsData } = await supabase
          .from('medications')
          .select('*')
          .eq('profile_id', patientId)
          .order('start_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (medicationsData) {
          setMedications(medicationsData || []);
        }
        
        // Fetch mood entries
        const { data: moodEntriesData } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('profile_id', patientId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });
          
        if (moodEntriesData) {
          setMoodEntries(moodEntriesData || []);
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate today's mood entry separately to avoid refetching all data when timezone changes
  useEffect(() => {
    if (moodEntries.length > 0) {
      const todayEntry = moodEntries.find(entry => 
        isToday(entry.date, preferences.timezone)
      );
      setTodaysMood(todayEntry || null);
    } else {
      setTodaysMood(null);
    }
  }, [moodEntries, preferences.timezone]);

  useEffect(() => {
    fetchData();
  }, [patientId]); // Remove preferences.timezone dependency to prevent unnecessary refetches

  // Targeted refresh function for specific tables
  const refreshTable = async (tableName: string) => {
    try {
      log(`Refreshing specific table: ${tableName}`);
      const supabase = await getSupabaseClient();
      
      switch (tableName) {
        case 'symptoms':
          const { data: symptomsData } = await supabase
            .from('symptoms')
            .select('*')
            .eq('profile_id', patientId)
            .order('start_date', { ascending: false })
            .order('created_at', { ascending: false });
          if (symptomsData) {
            setSymptoms(symptomsData);
          }
          break;
          
        case 'medications':
          const { data: medicationsData } = await supabase
            .from('medications')
            .select('*')
            .eq('profile_id', patientId)
            .order('start_date', { ascending: false })
            .order('created_at', { ascending: false });
          if (medicationsData) {
            setMedications(medicationsData);
          }
          break;
          
        case 'diary_entries':
          const { data: diaryEntriesData } = await supabase
            .from('diary_entries')
            .select('*')
            .eq('profile_id', patientId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
          if (diaryEntriesData) {
            setDiaryEntries(diaryEntriesData);
          }
          break;
          
        case 'mood_entries':
          const { data: moodEntriesData } = await supabase
            .from('mood_entries')
            .select('*')
            .eq('profile_id', patientId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });
          if (moodEntriesData) {
            setMoodEntries(moodEntriesData);
          }
          break;
          
        default:
          log(`Unknown table for targeted refresh: ${tableName}`);
      }
      
      log(`Targeted refresh completed for table: ${tableName}`);
    } catch (error) {
      logError(`Error during targeted refresh for table ${tableName}:`, error);
    }
  };

  // Add new functions to check free plan usage
  const checkFreePlanUsage = async () => {
    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return { diaryEntriesUsed: 0, aiAnalysisUsed: 0 };

      // First get all patients for the user
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id);

      if (!patientsData || patientsData.length === 0) {
        return { diaryEntriesUsed: 0, aiAnalysisUsed: 0 };
      }

      const patientIds = patientsData.map(p => p.id);

      // Count total diary entries for the user across all patients
      const { data: diaryEntriesData } = await supabase
        .from('diary_entries')
        .select('id, entry_type, ai_type')
        .in('profile_id', patientIds);

      if (!diaryEntriesData) return { diaryEntriesUsed: 0, aiAnalysisUsed: 0 };

      const diaryEntriesUsed = diaryEntriesData.length;
      const aiAnalysisUsed = diaryEntriesData.filter(entry => 
        entry.entry_type === 'AI' && entry.ai_type
      ).length;

      return { diaryEntriesUsed, aiAnalysisUsed };
    } catch (err) {
      logError('Error checking free plan usage:', err);
      return { diaryEntriesUsed: 0, aiAnalysisUsed: 0 };
    }
  };

  return {
    user,
    patient,
    activities,
    documents, 
    symptoms,
    diaryEntries,
    medications,
    moodEntries,
    todaysMood,
    loading,
    error,
    refresh: fetchData,
    refreshTable,
    checkFreePlanUsage
  };
}