import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { DiaryEntry } from '../types/database';

interface PatientOverview {
  lastEntry: DiaryEntry | null;
  lastEntryDate: string | null;
}

export function usePatientOverview(patientId: string) {
  const [overview, setOverview] = useState<PatientOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchOverview() {
      setLoading(true);
      try {
        const supabase = await getSupabaseClient();
        // Fetch the latest diary entry for this patient
        const { data: entries, error } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('profile_id', patientId)
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        const lastEntry = entries && entries.length > 0 ? entries[0] : null;
        setOverview({
          lastEntry,
          lastEntryDate: lastEntry ? lastEntry.date : null,
        });
      } catch (err) {
        setOverview({ lastEntry: null, lastEntryDate: null });
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    if (patientId) fetchOverview();
    return () => { isMounted = false; };
  }, [patientId]);

  return { overview, loading };
} 