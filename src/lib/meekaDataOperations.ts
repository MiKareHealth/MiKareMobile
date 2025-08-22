import { getSupabaseClient } from './supabaseClient';
import { log, error as logError } from '../utils/logger';
import type { 
  Symptom, 
  Medication, 
  MoodEntry, 
  DiaryEntry, 
  PatientDocument 
} from '../types/database';

export interface MeekaInsertResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

// Helper to get current user
const getCurrentUser = async () => {
  const supabase = await getSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
};

// Helper to normalize enum values
const normalizeSeverity = (severity: string): 'Mild' | 'Moderate' | 'Severe' => {
  const normalized = severity.toLowerCase().trim();
  if (normalized === 'mild') return 'Mild';
  if (normalized === 'moderate') return 'Moderate';
  if (normalized === 'severe') return 'Severe';
  return 'Mild'; // default
};

const normalizeStatus = (status: string): 'Active' | 'Inactive' => {
  const normalized = status.toLowerCase().trim();
  if (normalized === 'active') return 'Active';
  if (normalized === 'inactive') return 'Inactive';
  return 'Active'; // default
};

// Add a symptom
export const addSymptom = async (
  patientId: string, 
  data: {
    description: string;
    startDate: string;
    endDate?: string;
    severity: string; // Allow any case
    notes?: string;
  }
): Promise<MeekaInsertResult> => {
  try {
    log('Meeka attempting to add symptom:', { patientId, data });
    
    const supabase = await getSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logError('Authentication error:', authError);
      return {
        success: false,
        message: 'Authentication failed. Please log in again.',
        error: authError?.message || 'User not authenticated'
      };
    }
    
    log('User authenticated:', user.id);
    
    const symptomData = {
      profile_id: patientId,
      description: data.description.trim(),
      start_date: data.startDate,
      end_date: data.endDate || null,
      severity: normalizeSeverity(data.severity),
      notes: data.notes?.trim() || null
    };

    log('Symptom data to insert:', symptomData);

    const { data: insertedSymptom, error } = await supabase
      .from('symptoms')
      .insert([symptomData])
      .select()
      .single();

    if (error) {
      logError('Supabase error inserting symptom:', error);
      throw error;
    }

    log('Meeka successfully added symptom:', insertedSymptom);
    
    return {
      success: true,
      message: `Successfully added symptom: ${data.description}`,
      data: insertedSymptom
    };
  } catch (err) {
    logError('Error adding symptom via Meeka:', err);
    return {
      success: false,
      message: `Failed to add symptom: ${(err as Error).message}`,
      error: (err as Error).message
    };
  }
};

// Add a medication
export const addMedication = async (
  patientId: string,
  data: {
    medicationName: string;
    startDate: string;
    endDate?: string;
    dosage: string;
    status: string; // Allow any case
    prescribedBy?: string;
    notes?: string;
  }
): Promise<MeekaInsertResult> => {
  try {
    const supabase = await getSupabaseClient();
    
    // Determine status - if end date is set, status should be Inactive
    const finalStatus = data.endDate && data.endDate.trim() !== '' ? 'Inactive' : normalizeStatus(data.status);
    
    const medicationData = {
      profile_id: patientId,
      medication_name: data.medicationName.trim(),
      start_date: data.startDate,
      end_date: data.endDate || null,
      dosage: data.dosage.trim(),
      status: finalStatus,
      prescribed_by: data.prescribedBy?.trim() || null,
      notes: data.notes?.trim() || null
    };

    const { data: insertedMedication, error } = await supabase
      .from('medications')
      .insert([medicationData])
      .select()
      .single();

    if (error) throw error;

    log('Meeka added medication:', insertedMedication);
    
    return {
      success: true,
      message: `Successfully added medication: ${data.medicationName}`,
      data: insertedMedication
    };
  } catch (err) {
    logError('Error adding medication via Meeka:', err);
    return {
      success: false,
      message: 'Failed to add medication',
      error: (err as Error).message
    };
  }
};

// Add a mood entry
export const addMoodEntry = async (
  patientId: string,
  data: {
    date: string;
    body: number;
    mind: number;
    sleep: number;
    mood: number;
    notes?: string;
  }
): Promise<MeekaInsertResult> => {
  try {
    const supabase = await getSupabaseClient();
    
    const moodData = {
      profile_id: patientId,
      date: data.date,
      body: data.body,
      mind: data.mind,
      sleep: data.sleep,
      mood: data.mood,
      notes: data.notes?.trim() || null
    };

    const { data: insertedMood, error } = await supabase
      .from('mood_entries')
      .insert([moodData])
      .select()
      .single();

    if (error) {
      // Check if this is a unique constraint error (entry already exists for this day)
      if (error.message.includes('unique constraint') || error.code === '23505') {
        return {
          success: false,
          message: 'A mood entry already exists for this date. Please edit the existing entry instead.',
          error: error.message
        };
      }
      throw error;
    }

    log('Meeka added mood entry:', insertedMood);
    
    return {
      success: true,
      message: `Successfully added mood entry for ${data.date}`,
      data: insertedMood
    };
  } catch (err) {
    logError('Error adding mood entry via Meeka:', err);
    return {
      success: false,
      message: 'Failed to add mood entry',
      error: (err as Error).message
    };
  }
};

// Add a diary entry
export const addDiaryEntry = async (
  patientId: string,
  data: {
    entryType: string; // Allow any case
    title: string;
    date: string;
    notes?: string;
    severity?: string;
    attendees?: string[];
  }
): Promise<MeekaInsertResult> => {
  try {
    log('Meeka attempting to add diary entry:', { patientId, data });
    
    const supabase = await getSupabaseClient();
    
    // Normalize entry type
    const normalizedEntryType = data.entryType.charAt(0).toUpperCase() + data.entryType.slice(1).toLowerCase();
    
    const diaryData = {
      profile_id: patientId,
      entry_type: normalizedEntryType,
      title: data.title.trim(),
      date: data.date,
      notes: data.notes?.trim() || null,
      severity: data.severity || null,
      attendees: data.attendees || []
    };

    log('Diary data to insert:', diaryData);

    const { data: insertedDiary, error } = await supabase
      .from('diary_entries')
      .insert([diaryData])
      .select()
      .single();

    if (error) {
      logError('Supabase error inserting diary entry:', error);
      throw error;
    }

    log('Meeka successfully added diary entry:', insertedDiary);
    
    return {
      success: true,
      message: `Successfully added ${normalizedEntryType.toLowerCase()} entry: ${data.title}`,
      data: insertedDiary
    };
  } catch (err) {
    logError('Error adding diary entry via Meeka:', err);
    return {
      success: false,
      message: `Failed to add diary entry: ${(err as Error).message}`,
      error: (err as Error).message
    };
  }
};

// Add a patient document (basic version - for text notes)
export const addPatientDocument = async (
  patientId: string,
  data: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    description?: string;
  }
): Promise<MeekaInsertResult> => {
  try {
    const user = await getCurrentUser();
    const supabase = await getSupabaseClient();
    
    const documentData = {
      patient_id: patientId,
      file_name: data.fileName,
      file_type: data.fileType,
      file_size: data.fileSize,
      file_url: data.fileUrl,
      description: data.description?.trim() || null,
      uploaded_by: user.id
    };

    const { data: insertedDocument, error } = await supabase
      .from('patient_documents')
      .insert([documentData])
      .select()
      .single();

    if (error) throw error;

    log('Meeka added patient document:', insertedDocument);
    
    return {
      success: true,
      message: `Successfully added document: ${data.fileName}`,
      data: insertedDocument
    };
  } catch (err) {
    logError('Error adding patient document via Meeka:', err);
    return {
      success: false,
      message: 'Failed to add document',
      error: (err as Error).message
    };
  }
};

// Get table schema information for AI prompts
export const getTableSchemas = () => {
  return {
    symptoms: {
      required: ['description', 'start_date', 'severity'],
      optional: ['end_date', 'notes'],
      fields: {
        description: 'text - description of the symptom',
        start_date: 'date - when the symptom started',
        end_date: 'date - when the symptom ended (optional)',
        severity: 'enum - Mild, Moderate, or Severe',
        notes: 'text - additional notes (optional)'
      }
    },
    medications: {
      required: ['medication_name', 'start_date', 'dosage', 'status'],
      optional: ['end_date', 'prescribed_by', 'notes'],
      fields: {
        medication_name: 'text - name of the medication',
        start_date: 'date - when medication was started',
        end_date: 'date - when medication was stopped (optional)',
        dosage: 'text - dosage instructions',
        status: 'enum - Active or Inactive',
        prescribed_by: 'text - who prescribed it (optional)',
        notes: 'text - additional notes (optional)'
      }
    },
    mood_entries: {
      required: ['date', 'body', 'mind', 'sleep', 'mood'],
      optional: ['notes'],
      fields: {
        date: 'date - date of the mood entry',
        body: 'integer 1-5 - physical well-being rating',
        mind: 'integer 1-5 - mental well-being rating',
        sleep: 'integer 1-5 - sleep quality rating',
        mood: 'integer 1-5 - overall mood rating',
        notes: 'text - additional notes (optional)'
      }
    },
    diary_entries: {
      required: ['entry_type', 'title', 'date'],
      optional: ['notes', 'severity', 'attendees'],
      fields: {
        entry_type: 'enum - Symptom, Appointment, Diagnosis, Note, Treatment, Other, AI',
        title: 'text - title of the entry',
        date: 'date - date of the entry',
        notes: 'text - detailed notes (optional)',
        severity: 'text - severity level (optional)',
        attendees: 'array - list of people present (optional)'
      }
    },
    patient_documents: {
      required: ['file_name', 'file_type', 'file_size', 'file_url'],
      optional: ['description'],
      fields: {
        file_name: 'text - name of the file',
        file_type: 'text - MIME type of the file',
        file_size: 'integer - size in bytes',
        file_url: 'text - URL to the file',
        description: 'text - description of the document (optional)'
      }
    }
  };
};
