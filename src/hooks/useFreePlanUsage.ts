import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { error as logError } from '../utils/logger';

interface FreePlanUsage {
  diaryEntriesUsed: number;
  aiAnalysisUsed: number;
  canAddDiaryEntry: boolean;
  canUseAI: boolean;
}

export function useFreePlanUsage() {
  const [usage, setUsage] = useState<FreePlanUsage>({
    diaryEntriesUsed: 0,
    aiAnalysisUsed: 0,
    canAddDiaryEntry: true,
    canUseAI: true
  });
  const [loading, setLoading] = useState(true);

  const checkUsage = async () => {
    try {
      setLoading(true);
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setUsage({
          diaryEntriesUsed: 0,
          aiAnalysisUsed: 0,
          canAddDiaryEntry: true,
          canUseAI: true
        });
        return;
      }

      // First get all patients for the user
      const { data: patientsData } = await supabase
        .from('patients')
        .select('id')
        .eq('user_id', user.id);

      if (!patientsData || patientsData.length === 0) {
        setUsage({
          diaryEntriesUsed: 0,
          aiAnalysisUsed: 0,
          canAddDiaryEntry: true,
          canUseAI: true
        });
        return;
      }

      const patientIds = patientsData.map(p => p.id);

      // Count total diary entries for the user across all patients
      const { data: diaryEntriesData } = await supabase
        .from('diary_entries')
        .select('id, entry_type, ai_type')
        .in('profile_id', patientIds);

      if (!diaryEntriesData) {
        setUsage({
          diaryEntriesUsed: 0,
          aiAnalysisUsed: 0,
          canAddDiaryEntry: true,
          canUseAI: true
        });
        return;
      }

      const diaryEntriesUsed = diaryEntriesData.length;
      const aiAnalysisUsed = diaryEntriesData.filter(entry => 
        entry.entry_type === 'AI' && entry.ai_type
      ).length;

      setUsage({
        diaryEntriesUsed,
        aiAnalysisUsed,
        canAddDiaryEntry: diaryEntriesUsed < 1,
        canUseAI: aiAnalysisUsed < 1
      });
    } catch (err) {
      logError('Error checking free plan usage:', err);
      setUsage({
        diaryEntriesUsed: 0,
        aiAnalysisUsed: 0,
        canAddDiaryEntry: true,
        canUseAI: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUsage();
  }, []);

  return {
    ...usage,
    loading,
    refresh: checkUsage
  };
}
