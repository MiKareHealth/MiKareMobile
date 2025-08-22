import { getCurrentRegion } from '../../lib/regionDetection';

// Region-specific locale mappings
const REGION_LOCALES = {
  AU: 'en-AU',
  UK: 'en-GB', 
  USA: 'en-US'
} as const;

// Region-specific emergency numbers
const EMERGENCY_NUMBERS = {
  AU: '000',
  UK: '999',
  USA: '911'
} as const;

// Safety disclaimer for analysis responses
const SAFETY_DISCLAIMER = `

⚠️ **Important**: This information is for your reference only and should not be considered medical advice. Always consult with your healthcare provider for medical decisions.`;

// Emergency guidance for urgent symptoms
const EMERGENCY_GUIDANCE = (region: string) => `
🚨 **Emergency**: If you're experiencing severe symptoms, please call ${EMERGENCY_NUMBERS[region as keyof typeof EMERGENCY_NUMBERS]} immediately or go to your nearest emergency department.`;

export const MEEKA_PROMPTS = {
  SYSTEM_PROMPT: `You are Meeka, a warm and helpful AI health assistant for MiKare. You help users manage their health records and provide guidance.

Key Guidelines:
- Be warm, clear, and non-clinical in tone
- Keep responses concise and conversational
- Focus on helping users add health data or query their records
- Don't provide medical advice, diagnoses, or triage assessments
- Guide users to appropriate forms when they want to add data
- Help analyze patterns in their health data when they ask questions
- Direct users to emergency services (000 in AU, 999 in UK, 911 in USA) for urgent symptoms

Your capabilities:
- Help users add symptoms, medications, appointments, notes, mood, and sleep data
- Answer questions about their health history and patterns
- Provide insights about correlations between different health factors
- Suggest questions for their next medical visit

Boundaries - DO NOT:
- Provide medical diagnoses or treatment recommendations
- Interpret lab results or medical tests
- Suggest medication changes or dosages
- Assess emergency severity or provide triage
- Give medical advice beyond general health information

Always maintain a friendly, supportive tone while being professional about health matters.`,

  GREETING: `Hi! I'm Meeka, your health assistant. What would you like to do today? I can help you:

• Add new symptoms, medications, or appointments
• Track your mood and sleep
• Write notes about your health
• Answer questions about your health patterns
• Suggest questions for your next doctor visit

What can I help you with?`,

  LOW_CONFIDENCE: `I'm not quite sure what you'd like to do. Did you mean one of these?

• Add a symptom or pain
• Log a new medication
• Schedule an appointment
• Write a health note
• Track your mood

Or you can tell me what you need in your own words!`,

  CONFIRMATION: (intent: string, patientName: string, slots: Record<string, any>) => {
    const region = getCurrentRegion();
    const locale = REGION_LOCALES[region];
    
    const now = new Date();
    const date = now.toLocaleDateString(locale, { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    const time = now.toLocaleTimeString(locale, { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    // Build confirmation details with safety checks
    let details = '';
    if (slots.description) details += ` • ${slots.description}`;
    if (slots.medication_name) details += ` • ${slots.medication_name}`;
    if (slots.dosage) details += ` • ${slots.dosage}`;
    if (slots.frequency) details += ` • ${slots.frequency}`;
    if (slots.provider) details += ` • Provider: ${slots.provider}`;
    if (slots.prn) details += ` • PRN`;
    
    // Title-case the intent for consistency
    const titleCaseIntent = intent.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    
    return `Opening ${titleCaseIntent} for ${patientName} • ${date} ${time}${details}

Change anything?`;
  },

  QUERY_RESPONSE: (query: string, patientData: any) => {
    const region = getCurrentRegion();
    
    return `Based on your health data, here's what I found:

**Trend**: [Brief pattern or trend observed]
**Possible correlations**: [Key relationships between data points]
**Notable gaps**: [Missing information that could be helpful]
**Recommendations**: [General suggestions for tracking or follow-up]

${SAFETY_DISCLAIMER}

Would you like me to suggest questions for your next medical visit based on this information?`;
  },

  SUCCESS_MESSAGE: (action: string) => `Great! I've opened the ${action} form for you. You can fill it out and save your information. Let me know if you need anything else!`,

  ERROR_MESSAGE: (action: string) => {
    const region = getCurrentRegion();
    return `Sorry—I couldn't open the ${action} form right now. 

**Try again**: You can retry in a moment
**Manual path**: Menu → Health → ${action}

Is there anything else I can help you with?`;
  },

  PRIVACY_REMINDER: `💡 **Privacy Note**: Our conversation is stored in your MiKare health record to help track your health journey. You can delete chat history anytime in Settings → Privacy.`
};

export function buildContextPrompt(patientData: any, recentEntries: any[]): string {
  const region = getCurrentRegion();
  
  // Defensive checks with default empty arrays
  const safeEntries = recentEntries || [];
  
  // Cap recent lists to 3-5 items with "+N more" for readability
  const formatList = (items: any[], maxItems: number = 3) => {
    if (!items || items.length === 0) return 'None';
    if (items.length <= maxItems) return items.join(', ');
    return `${items.slice(0, maxItems).join(', ')} +${items.length - maxItems} more`;
  };

  // Format symptoms, medications, appointments (no mood scores)
  const recentSymptoms = safeEntries
    .filter(e => e?.entry_type === 'Symptom')
    .slice(0, 5)
    .map(s => s?.title || 'Unknown')
    .filter(Boolean);

  const recentMedications = safeEntries
    .filter(e => e?.entry_type === 'Medication')
    .slice(0, 5)
    .map(m => m?.title || 'Unknown')
    .filter(Boolean);

  const recentAppointments = safeEntries
    .filter(e => e?.entry_type === 'Appointment')
    .slice(0, 5)
    .map(a => a?.title || 'Unknown')
    .filter(Boolean);

  // Format mood entries with labels instead of scores
  const recentMoodEntries = safeEntries
    .filter(e => e?.entry_type === 'Mood')
    .slice(0, 5)
    .map(m => {
      const moodScore = m?.mood || 0;
      let label = 'Unknown';
      if (moodScore >= 8) label = 'Good';
      else if (moodScore >= 5) label = 'Neutral';
      else label = 'Low';
      return `${m?.title || 'Mood'} (${label})`;
    })
    .filter(Boolean);

  return `Patient Context:
- Name: ${patientData?.full_name || 'Unknown'}
- Date of Birth: ${patientData?.dob || 'Unknown'}
- Gender: ${patientData?.gender || 'Unknown'}
- Relationship: ${patientData?.relationship || 'Unknown'}
- Background Information: ${patientData?.notes || 'None provided'}
- Recent symptoms: ${formatList(recentSymptoms, 3)}
- Recent medications: ${formatList(recentMedications, 3)}
- Recent appointments: ${formatList(recentAppointments, 3)}
- Recent mood entries: ${formatList(recentMoodEntries, 3)}

Use this context to provide personalized responses and insights. Consider the patient's background information, family history, allergies, cultural background, and other relevant details when available.`;
}
