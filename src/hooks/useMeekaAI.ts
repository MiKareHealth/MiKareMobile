import { log, error as logError } from '../utils/logger';
import { getCurrentRegion } from '../lib/regionDetection';
import { buildContextPrompt } from '../components/MeekaChat/MeekaPrompts';
import { getTableSchemas } from '../lib/meekaDataOperations';
import type { ChatMessage } from '../types/database';

export function useMeekaAI() {
  const callGeminiAPI = async (messages: any[], patientContext: any) => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Google API key not configured');
    }

    // Get current region for language tailoring
    const currentRegion = getCurrentRegion();
    const getRegionInstructions = (region: string): string => {
      switch (region) {
        case 'AU':
          return 'Please use Australian English and Australian medical terminology where appropriate. ';
        case 'UK':
          return 'Please use British English and UK medical terminology where appropriate. ';
        case 'USA':
          return 'Please use American English and US medical terminology where appropriate. ';
        default:
          return 'Please use American English and US medical terminology where appropriate. ';
      }
    };

    const regionInstructions = getRegionInstructions(currentRegion);

    // Build context with patient information
    const contextInfo = patientContext ? `
Current Patient Context:
- Patient ID: ${patientContext.patientId || 'Not specified'}
- Patient Name: ${patientContext.patientName || 'Not specified'}
- Recent Symptoms: ${patientContext.recentSymptoms?.map((s: any) => s.description).join(', ') || 'None'}
- Recent Medications: ${patientContext.recentMedications?.map((m: any) => m.medication_name).join(', ') || 'None'}
- Recent Mood Entries: ${patientContext.recentMoodEntries?.length || 0} entries
- Available Patients: ${patientContext.availablePatients?.map((p: any) => p.name).join(', ') || 'None'}
` : 'No patient context provided.';

    // Get table schemas for AI context
    const tableSchemas = getTableSchemas();
    
    // Enhanced system prompt with database capabilities and region-specific language
    const enhancedSystemPrompt = `${regionInstructions}You are Meeka, a warm and helpful AI health assistant for MiKare. You help users manage their health records and provide guidance.

Key Guidelines:
- Be warm, clear, and non-clinical in tone
- Keep responses concise and conversational
- Focus on helping users add health data or query their records
- Don't provide medical advice or diagnoses
- Help analyze patterns in their health data when they ask questions

Your capabilities:
- Add records to the database for symptoms, medications, mood entries, diary entries, and patient documents
- Answer questions about their health history and patterns
- Provide insights about correlations between different health factors
- Suggest questions for their next medical visit

DATABASE CAPABILITIES:
You can add records to these tables with the following fields:

SYMPTOMS TABLE:
- Required: description (text), start_date (date), severity (Mild/Moderate/Severe)
- Optional: end_date (date), notes (text)

MEDICATIONS TABLE:
- Required: medication_name (text), start_date (date), dosage (text), status (Active/Inactive)
- Optional: end_date (date), prescribed_by (text), notes (text)

MOOD_ENTRIES TABLE:
- Required: date (date), body (1-5), mind (1-5), sleep (1-5), mood (1-5)
- Optional: notes (text)

DIARY_ENTRIES TABLE:
- Required: entry_type (Symptom/Appointment/Diagnosis/Note/Treatment/Other/AI), title (text), date (date)
- Optional: notes (text), severity (text), attendees (array)

PATIENT_DOCUMENTS TABLE:
- Required: file_name (text), file_type (text), file_size (integer), file_url (text)
- Optional: description (text)

When a user wants to add data, ask for the required fields one by one in a conversational way. Use today's date as default for date fields unless specified otherwise.

Always maintain a friendly, supportive tone while being professional about health matters.

${contextInfo}

IMPORTANT: The user has selected a specific patient (${patientContext.patientName || 'Unknown'}) from the dropdown. When they ask to add data, always assume they want to add it for this selected patient. Reference their first name when confirming actions. For example: "I'll add that symptom for ${patientContext.patientName?.split(' ')[0] || 'you'}." Only ask for patient selection if no patient is currently selected.`;

    // Prepare messages for Gemini
    const geminiMessages = [
      {
        role: "user",
        parts: [{ text: enhancedSystemPrompt }]
      },
      ...messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    ];

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  };

  return {
    callGeminiAPI
  };
}
