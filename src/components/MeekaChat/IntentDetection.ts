import type { ConciergeIntent, IntentDetectionResult } from '../../types/database';

// Intent detection patterns
const INTENT_PATTERNS = {
  ADD_SYMPTOM: [
    /(?:record|log|add|track|note)\s+(?:a\s+)?(?:new\s+)?(?:symptom|pain|headache|ache|discomfort|problem)/i,
    /(?:have|experiencing|feeling)\s+(?:a\s+)?(?:symptom|pain|headache|ache|discomfort)/i,
    /(?:symptom|pain|headache|ache|discomfort)\s+(?:started|began|occurred)/i,
    /(?:log|record|add)\s+(?:my\s+)?(?:symptom|pain|headache|ache)/i
  ],
  ADD_MEDICATION: [
    /(?:start|begin|add|prescribed|taking)\s+(?:medication|medicine|drug|pill|tablet)/i,
    /(?:new\s+)?(?:medication|medicine|drug|prescription)/i,
    /(?:vitamin|supplement|dose|dosage)/i,
    /(?:daily|weekly|monthly)\s+(?:medication|medicine|drug)/i
  ],
  ADD_APPOINTMENT: [
    /(?:book|schedule|make|appointment|visit|consultation)/i,
    /(?:doctor|gp|physician|specialist|consultation)/i,
    /(?:next\s+)?(?:appointment|visit|consultation)/i,
    /(?:telehealth|in\s+person|virtual)/i
  ],
  ADD_NOTE: [
    /(?:add|write|create|note|entry|diary)/i,
    /(?:record|log)\s+(?:note|entry|diary)/i,
    /(?:general|personal)\s+(?:note|entry)/i
  ],
  ADD_MOOD: [
    /(?:mood|feeling|emotion|mental\s+state)/i,
    /(?:how\s+)?(?:feeling|mood)/i,
    /(?:track|record|log)\s+(?:mood|feeling)/i
  ],
  ADD_SLEEP: [
    /(?:sleep|rest|bedtime|sleep\s+quality)/i,
    /(?:track|record|log)\s+(?:sleep|rest)/i,
    /(?:sleep\s+pattern|sleep\s+schedule)/i
  ],
  QUERY_DATA: [
    /(?:how\s+)?(?:does|fit|relate)\s+(?:with|to)\s+(?:my\s+)?(?:health\s+)?(?:history|record)/i,
    /(?:what|show|tell)\s+(?:me\s+)?(?:about)\s+(?:my\s+)?(?:symptoms|medications|appointments)/i,
    /(?:pattern|trend|history)\s+(?:in)\s+(?:my\s+)?(?:health|symptoms|medications)/i,
    /(?:compare|correlate)\s+(?:my\s+)?(?:symptoms|medications)/i
  ]
};

// Route mapping
const INTENT_ROUTES = {
  ADD_SYMPTOM: '/patient/:patientId?symptom=true',
  ADD_MEDICATION: '/patient/:patientId?medication=true',
  ADD_APPOINTMENT: '/patient/:patientId?appointment=true',
  ADD_NOTE: '/patient/:patientId?note=true',
  ADD_MOOD: '/patient/:patientId?mood=true',
  ADD_SLEEP: '/patient/:patientId?sleep=true',
  QUERY_DATA: '/patient/:patientId?query=true'
};

export function detectIntent(userInput: string): IntentDetectionResult {
  const normalizedInput = userInput.toLowerCase().trim();
  
  // Check each intent pattern
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedInput)) {
        const confidence = calculateConfidence(normalizedInput, pattern);
        const slots = extractSlots(normalizedInput, intent as ConciergeIntent);
        
        return {
          intent: intent as ConciergeIntent,
          confidence,
          slots,
          route: INTENT_ROUTES[intent as ConciergeIntent] || ''
        };
      }
    }
  }
  
  // No intent detected
  return {
    intent: 'UNKNOWN',
    confidence: 0,
    slots: {},
    route: ''
  };
}

function calculateConfidence(input: string, pattern: RegExp): number {
  const match = input.match(pattern);
  if (!match) return 0;
  
  // Base confidence on match length vs input length
  const matchLength = match[0].length;
  const inputLength = input.length;
  const baseConfidence = matchLength / inputLength;
  
  // Boost confidence for exact matches
  if (match[0] === input) return 1.0;
  
  // Boost confidence for longer matches
  if (matchLength > inputLength * 0.7) return Math.min(0.95, baseConfidence + 0.2);
  
  return Math.min(0.9, baseConfidence + 0.1);
}

function extractSlots(input: string, intent: ConciergeIntent): Record<string, any> {
  const slots: Record<string, any> = {};
  
  switch (intent) {
    case 'ADD_SYMPTOM':
      // Extract symptom description
      const symptomMatch = input.match(/(?:symptom|pain|headache|ache|discomfort)\s+(?:is\s+)?(.+)/i);
      if (symptomMatch) {
        slots.description = symptomMatch[1].trim();
      }
      break;
      
    case 'ADD_MEDICATION':
      // Extract medication name and dosage
      const medMatch = input.match(/(?:start|add|taking)\s+(.+?)(?:\s+(?:daily|weekly|monthly))?/i);
      if (medMatch) {
        slots.medication_name = medMatch[1].trim();
      }
      
      const dosageMatch = input.match(/(\d+)\s*(?:mg|mcg|g|ml|iu)/i);
      if (dosageMatch) {
        slots.dosage = dosageMatch[0];
      }
      break;
      
    case 'ADD_APPOINTMENT':
      // Extract appointment type
      if (input.includes('telehealth') || input.includes('virtual')) {
        slots.type = 'telehealth';
      } else if (input.includes('in person') || input.includes('office')) {
        slots.type = 'in_person';
      }
      break;
  }
  
  return slots;
}

export function getSuggestedActions(): Array<{intent: ConciergeIntent, label: string, description: string}> {
  return [
    { intent: 'ADD_SYMPTOM', label: 'Add Symptom', description: 'Record a new symptom or pain' },
    { intent: 'ADD_MEDICATION', label: 'Add Medication', description: 'Log a new medication or supplement' },
    { intent: 'ADD_APPOINTMENT', label: 'Add Appointment', description: 'Schedule a doctor visit' },
    { intent: 'ADD_NOTE', label: 'Add Note', description: 'Write a general note or diary entry' },
    { intent: 'ADD_MOOD', label: 'Add Mood', description: 'Track your mood and feelings' }
  ];
}
