import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Patient, PatientActivity, PatientDocument, Symptom, DiaryEntry, Medication, MoodEntry } from '../types/database';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { isToday } from '../utils/timeUtils';

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
          .order('start_date', { ascending: false });

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
          .order('start_date', { ascending: false });

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
    refresh: fetchData
  };
}