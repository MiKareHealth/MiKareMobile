// AI Prompts for MiKare Mobile App
// Centralized prompts extracted from web app functionality

export interface AIPrompt {
  type: string;
  title: string;
  prompt: string;
  description: string;
}

export const AI_PROMPTS: AIPrompt[] = [
  {
    type: 'symptom-analysis',
    title: 'Symptom Insights',
    prompt: 'Analyze the symptoms and diary entries. Consider the patient\'s background information, family history, allergies, and other relevant details when available. Look for patterns, correlations between symptoms, and potential triggers. Focus on severity changes and duration patterns.',
    description: 'Analyze symptoms and diary entries for patterns and insights'
  },
  {
    type: 'questions',
    title: 'Suggested Questions for Next Visit',
    prompt: 'Based on the symptoms, diary entries, and patient information, suggest important questions to ask during the next medical visit. Consider the patient\'s background, family history, allergies, and cultural factors when formulating questions. Prioritize questions based on severity and recency of symptoms.',
    description: 'Generate questions for your next medical appointment'
  },
  {
    type: 'terminology',
    title: 'Medical Terminology Explanation',
    prompt: 'Identify and explain any medical terminology found in the diary entries and symptoms. Consider the patient\'s background and level of health literacy when providing explanations. Provide clear, patient-friendly explanations.',
    description: 'Explain medical terms in simple language'
  },
  {
    type: 'trends',
    title: 'Health Trend Analysis',
    prompt: 'Analyze the overall health trends based on symptoms, diary entries, and patient information. Consider the patient\'s background, family history, and other relevant factors when identifying patterns. Identify any improvements or deteriorations, and highlight key patterns in health status.',
    description: 'Analyze overall health trends and patterns'
  },
  {
    type: 'summary',
    title: 'Health Summary',
    prompt: 'Analyze the overall health trends based on symptoms, diary entries, and patient information. Consider the patient\'s background, family history, and other relevant factors when identifying patterns. Identify any improvements or deteriorations, and highlight key patterns in health status.',
    description: 'Create a comprehensive health summary'
  },
  {
    type: 'recommendations',
    title: 'Recommendations',
    prompt: 'Based on the patient\'s health data, provide general wellness recommendations. Focus on lifestyle suggestions, self-care practices, and general health maintenance. Do not provide medical advice or specific treatment recommendations.',
    description: 'Get personalized wellness recommendations'
  }
];

export function getPromptByType(type: string): AIPrompt | undefined {
  return AI_PROMPTS.find(prompt => prompt.type === type);
}

export function getAllPrompts(): AIPrompt[] {
  return AI_PROMPTS;
}
