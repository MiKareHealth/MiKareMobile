import { getSupabaseClient, getCurrentRegion } from './supabaseClient';
import { supabaseRegions } from '../config/supabaseRegions';
import type { Patient, PatientActivity, PatientDocument, Symptom, DiaryEntry, Medication, MoodEntry } from '../types/database';

export interface PatientDataResponse {
  patient: Patient;
  activities: PatientActivity[];
  documents: PatientDocument[];
  symptoms: Symptom[];
  diaryEntries: DiaryEntry[];
  medications: Medication[];
  moodEntries: MoodEntry[];
}

/**
 * Custom error class to indicate edge function is unavailable
 */
export class EdgeFunctionUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EdgeFunctionUnavailableError';
  }
}

/**
 * Fetch all patient data in a single request via Supabase Edge Function
 * This is much more efficient than 7 separate queries from the browser
 *
 * @throws {EdgeFunctionUnavailableError} If edge function is not available (will trigger fallback)
 */
export async function fetchPatientData(patientId: string): Promise<PatientDataResponse> {
  const supabase = await getSupabaseClient();

  // Get the auth session to pass to the edge function
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session');
  }

  // Get the Supabase URL from the current region configuration
  const currentRegion = getCurrentRegion() || 'USA';
  const supabaseUrl = supabaseRegions[currentRegion].url;

  if (!supabaseUrl) {
    throw new Error(`Supabase URL not configured for region ${currentRegion}`);
  }

  try {
    // Call the edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/get-patient-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ patientId }),
    });

    // If edge function returns 404, it's not deployed - use fallback
    if (response.status === 404) {
      throw new EdgeFunctionUnavailableError('Edge function not found (404) - using fallback');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new EdgeFunctionUnavailableError(error.error || `Edge function failed with status ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new EdgeFunctionUnavailableError(result.error || 'Edge function returned unsuccessful response');
    }

    // Log performance metrics in development
    if (import.meta.env.DEV && result.performance) {
      console.log('[PatientDataAPI] Edge function performance:', result.performance);
    }

    return result.data;
  } catch (error) {
    // Network errors, CORS issues, etc. - use fallback
    if (error instanceof EdgeFunctionUnavailableError) {
      throw error;
    }

    // Any other error (network, CORS, etc.) - treat as unavailable
    throw new EdgeFunctionUnavailableError(`Edge function error: ${(error as Error).message}`);
  }
}
