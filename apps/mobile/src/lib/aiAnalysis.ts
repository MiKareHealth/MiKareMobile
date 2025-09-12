import { getSupabaseClient } from './supabaseClient';
import { queryGemini } from './gemini';

export interface PatientContext {
  name: string;
  dateOfBirth?: string;
  gender?: string;
  relationship?: string;
  notes?: string;
}

export interface DiaryEntry {
  id: string;
  entry_type: string;
  title: string;
  date: string;
  notes?: string;
  severity?: string;
}

export interface Symptom {
  id: string;
  description: string;
  start_date: string;
  end_date?: string;
  severity: string;
  notes?: string;
}

export async function performAIAnalysis(
  type: string,
  patientId: string,
  patientContext: PatientContext | null,
  diaryEntries: DiaryEntry[],
  symptoms: Symptom[]
): Promise<{ title: string; content: string; diaryEntryId?: string }> {
  const supabase = await getSupabaseClient();
  
  // Build context for AI
  const context = JSON.stringify({
    patient: patientContext,
    diaryEntries: diaryEntries.map(e => ({
      type: e.entry_type,
      title: e.title,
      date: e.date,
      notes: e.notes,
      severity: e.severity
    })),
    symptoms: symptoms.map(s => ({
      description: s.description,
      startDate: s.start_date,
      endDate: s.end_date,
      severity: s.severity,
      notes: s.notes
    }))
  });

  let prompt = '';
  let title = '';

  // Define prompts based on analysis type
  switch (type) {
    case 'symptom-analysis':
      title = 'Symptom Insights';
      prompt = 'Analyze the symptoms and diary entries. Consider the patient\'s background information, family history, allergies, and other relevant details when available. Look for patterns, correlations between symptoms, and potential triggers. Focus on severity changes and duration patterns.';
      break;
    case 'questions':
      title = 'Suggested Questions for Next Visit';
      prompt = 'Based on the symptoms, diary entries, and patient information, suggest important questions to ask during the next medical visit. Consider the patient\'s background, family history, allergies, and cultural factors when formulating questions. Prioritize questions based on severity and recency of symptoms.';
      break;
    case 'terminology':
      title = 'Medical Terminology Explanation';
      prompt = 'Identify and explain any medical terminology found in the diary entries and symptoms. Consider the patient\'s background and level of health literacy when providing explanations. Provide clear, patient-friendly explanations.';
      break;
    case 'trends':
      title = 'Health Trend Analysis';
      prompt = 'Analyze the overall health trends based on symptoms, diary entries, and patient information. Consider the patient\'s background, family history, and other relevant factors when identifying patterns. Identify any improvements or deteriorations, and highlight key patterns in health status.';
      break;
    default:
      throw new Error('Invalid analysis type');
  }

  // Get AI response
  const aiResponse = await queryGemini(prompt, context);
  
  // Create diary entry with AI analysis
  const { data: diaryEntry, error: insertError } = await supabase
    .from('diary_entries')
    .insert([{
      profile_id: patientId,
      entry_type: 'AI',
      title: `AI Insights: ${title}`,
      date: new Date().toISOString().split('T')[0],
      notes: aiResponse,
      ai_type: type,
      source_entries: diaryEntries.map(e => e.id)
    }])
    .select()
    .single();

  if (insertError) throw insertError;

  return {
    title,
    content: aiResponse,
    diaryEntryId: diaryEntry?.id
  };
}
