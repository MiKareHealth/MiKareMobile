import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../lib/supabaseClient';
import { usePatients } from './usePatients';

interface MoodTrackingData {
  totalPatients: number;
  patientsWithMoodToday: number;
  isLoading: boolean;
  error: any;
}

export const useMoodTracking = (): MoodTrackingData => {
  const { patients, isLoading: patientsLoading } = usePatients();
  
  const { data, isLoading: moodLoading, error } = useQuery({
    queryKey: ['moodTracking', patients.length],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      const totalPatients = patients.length;
      
      console.log('MoodTracking Debug - Total patients:', totalPatients);
      console.log('MoodTracking Debug - Patients array:', patients.map(p => p.id));
      
      if (totalPatients === 0) {
        return {
          totalPatients: 0,
          patientsWithMoodToday: 0,
        };
      }
      
             // Get patients with mood entries for today (no user_id filter for demo data)
       const { data: moodEntries, error: moodError } = await supabase
         .from('mood_entries')
         .select('profile_id')
         .gte('created_at', `${today}T00:00:00`)
         .lt('created_at', `${today}T23:59:59`);
       
       if (moodError) {
         throw moodError;
       }
       
       // Count unique patients with mood entries today
       const uniquePatientsWithMood = new Set(moodEntries?.map(entry => entry.profile_id)).size;
      
      console.log('MoodTracking Debug - Patients with mood today:', uniquePatientsWithMood);
      console.log('MoodTracking Debug - Mood entries found:', moodEntries?.length || 0);
      
      return {
        totalPatients,
        patientsWithMoodToday: uniquePatientsWithMood,
      };
    },
    enabled: !patientsLoading, // Only run when patients data is loaded
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });
  
  return {
    totalPatients: data?.totalPatients || 0,
    patientsWithMoodToday: data?.patientsWithMoodToday || 0,
    isLoading: patientsLoading || moodLoading,
    error,
  };
};
