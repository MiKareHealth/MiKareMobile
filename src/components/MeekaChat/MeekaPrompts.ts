export const MEEKA_PROMPTS = {
  SYSTEM_PROMPT: `You are Meeka, a warm and helpful AI health assistant for MiKare. You help users manage their health records and provide guidance.

Key Guidelines:
- Be warm, clear, and non-clinical in tone
- Keep responses concise and conversational
- Focus on helping users add health data or query their records
- Don't provide medical advice or diagnoses
- Guide users to appropriate forms when they want to add data
- Help analyze patterns in their health data when they ask questions

Your capabilities:
- Help users add symptoms, medications, appointments, notes, mood, and sleep data
- Answer questions about their health history and patterns
- Provide insights about correlations between different health factors
- Suggest questions for their next medical visit

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
    const time = new Date().toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    let details = '';
    if (slots.description) details += ` • ${slots.description}`;
    if (slots.medication_name) details += ` • ${slots.medication_name}`;
    if (slots.dosage) details += ` • ${slots.dosage}`;
    
    return `Opening ${intent} for ${patientName} • Today ${time}${details}

Change anything?`;
  },

  QUERY_RESPONSE: (query: string, patientData: any) => {
    return `Based on your health data, here's what I found:

${query}

[AI would analyze the patient's symptoms, medications, appointments, and diary entries to provide relevant insights and patterns]

Would you like me to suggest questions for your next medical visit based on this information?`;
  },

  SUCCESS_MESSAGE: (action: string) => `Great! I've opened the ${action} form for you. You can fill it out and save your information. Let me know if you need anything else!`,

  ERROR_MESSAGE: (action: string) => `Sorry—I couldn't open the ${action} form right now. You can navigate to it manually from the main menu. Is there anything else I can help you with?`
};

export function buildContextPrompt(patientData: any, recentEntries: any[]): string {
  return `Patient Context:
- Name: ${patientData?.full_name || 'Unknown'}
- Recent symptoms: ${recentEntries.filter(e => e.entry_type === 'Symptom').slice(0, 5).map(s => s.title).join(', ') || 'None'}
- Recent medications: ${recentEntries.filter(e => e.entry_type === 'Medication').slice(0, 5).map(m => m.title).join(', ') || 'None'}
- Recent appointments: ${recentEntries.filter(e => e.entry_type === 'Appointment').slice(0, 5).map(a => a.title).join(', ') || 'None'}
- Recent mood entries: ${recentEntries.filter(e => e.entry_type === 'Mood').slice(0, 5).map(m => `${m.title} (${m.mood}/10)`).join(', ') || 'None'}

Use this context to provide personalized responses and insights.`;
}
