import type { ConciergeIntent, IntentDetectionResult } from '../../types/database';
import { getCurrentRegion } from '../../lib/regionDetection';

// Type-safe intent patterns with regional variations
type IntentPatterns = Record<ConciergeIntent, RegExp[]>;

// Regional medical terminology
const REGIONAL_TERMS = {
  AU: {
    doctor: ['GP', 'general practitioner', 'doctor', 'physician'],
    prescription: ['script', 'prescription', 'medication'],
    pharmacy: ['chemist', 'pharmacy', 'drugstore'],
    appointment: ['book in', 'appointment', 'consultation', 'visit'],
    emergency: ['emergency', 'urgent care', 'casualty']
  },
  UK: {
    doctor: ['GP', 'general practitioner', 'doctor', 'physician'],
    prescription: ['prescription', 'medication', 'script'],
    pharmacy: ['pharmacy', 'chemist', 'boots'],
    appointment: ['appointment', 'consultation', 'visit'],
    emergency: ['A&E', 'emergency', 'casualty']
  },
  USA: {
    doctor: ['doctor', 'physician', 'primary care', 'PCP'],
    prescription: ['prescription', 'medication', 'script'],
    pharmacy: ['pharmacy', 'drugstore', 'CVS', 'Walgreens'],
    appointment: ['appointment', 'consultation', 'visit'],
    emergency: ['ER', 'emergency room', 'urgent care']
  }
};

// Enhanced intent patterns with regional terms and better coverage
const createIntentPatterns = (region: string): IntentPatterns => {
  const terms = REGIONAL_TERMS[region as keyof typeof REGIONAL_TERMS] || REGIONAL_TERMS.USA;
  
  return {
    ADD_SYMPTOM: [
      // Core symptom patterns
      /(?:record|log|add|track|note)\s+(?:a\s+)?(?:new\s+)?(?:symptom|pain|headache|ache|discomfort|problem|issue)/i,
      /(?:have|experiencing|feeling|got)\s+(?:a\s+)?(?:symptom|pain|headache|ache|discomfort|problem)/i,
      /(?:symptom|pain|headache|ache|discomfort|problem)\s+(?:started|began|occurred|came\s+on)/i,
      /(?:log|record|add)\s+(?:my\s+)?(?:symptom|pain|headache|ache|discomfort)/i,
      // Regional variations
      new RegExp(`(?:book|see|visit)\\s+(?:${terms.doctor.join('|')})\\s+(?:for|about|with)\\s+(?:symptom|pain|ache)`, 'i'),
      /(?:since|from|starting)\s+(?:yesterday|today|last\s+night|this\s+morning|last\s+week)/i
    ],
    ADD_MEDICATION: [
      // Core medication patterns
      /(?:start|begin|add|prescribed|taking|on)\s+(?:medication|medicine|drug|pill|tablet|supplement)/i,
      /(?:new\s+)?(?:medication|medicine|drug|prescription|script)/i,
      /(?:vitamin|supplement|dose|dosage|tablet|pill)/i,
      /(?:daily|weekly|monthly|twice\s+daily|three\s+times\s+daily)\s+(?:medication|medicine|drug)/i,
      // Regional variations
      new RegExp(`(?:got|picked\s+up|filled)\\s+(?:${terms.prescription.join('|')})`, 'i'),
      new RegExp(`(?:from|at)\\s+(?:${terms.pharmacy.join('|')})`, 'i'),
      // Frequency patterns
      /(?:take|taking)\s+(?:medication|medicine|pill)\s+(?:twice\s+daily|three\s+times\s+daily|as\s+needed|PRN)/i,
      /(?:PRN|as\s+needed|when\s+needed)/i
    ],
    ADD_APPOINTMENT: [
      // Core appointment patterns
      new RegExp(`(?:book|schedule|make|appointment|visit|consultation|see\\s+${terms.doctor.join('|')})`, 'i'),
      new RegExp(`(?:${terms.doctor.join('|')}|physician|specialist|consultation)`, 'i'),
      /(?:next\s+)?(?:appointment|visit|consultation)/i,
      /(?:telehealth|in\s+person|virtual|face\s+to\s+face)/i,
      // Regional variations
      new RegExp(`(?:${terms.appointment.join('|')})`, 'i'),
      // Time patterns
      /(?:tomorrow|next\s+week|this\s+afternoon|this\s+evening|morning|afternoon|evening)/i,
      /(?:at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
    ],
    ADD_NOTE: [
      // Core note patterns
      /(?:add|write|create|note|entry|diary|journal)/i,
      /(?:record|log)\s+(?:note|entry|diary|journal)/i,
      /(?:general|personal|health)\s+(?:note|entry|diary)/i,
      /(?:remember|remind)\s+(?:me\s+)?(?:to|about)/i
    ],
    ADD_MOOD: [
      // Core mood patterns
      /(?:mood|feeling|emotion|mental\s+state|how\s+am\s+i)/i,
      /(?:how\s+)?(?:feeling|mood|emotion)/i,
      /(?:track|record|log)\s+(?:mood|feeling|emotion)/i,
      // Enhanced mood synonyms
      /(?:happy|sad|anxious|depressed|excited|worried|calm|stressed|angry|irritable|content|miserable|elated|down|up|low|high)/i,
      /(?:feeling\s+(?:happy|sad|anxious|depressed|excited|worried|calm|stressed|angry|irritable|content|miserable|elated|down|up|low|high))/i
    ],
    ADD_SLEEP: [
      // Core sleep patterns
      /(?:sleep|rest|bedtime|sleep\s+quality|insomnia|tired|exhausted)/i,
      /(?:track|record|log)\s+(?:sleep|rest|bedtime)/i,
      /(?:sleep\s+pattern|sleep\s+schedule|sleep\s+cycle)/i,
      // Enhanced sleep synonyms
      /(?:slept|slept\s+well|slept\s+badly|woke\s+up|fell\s+asleep|trouble\s+sleeping|sleep\s+apnea|snoring)/i,
      /(?:hours\s+of\s+sleep|sleep\s+duration|bedtime|wake\s+up\s+time)/i
    ],
    QUERY_DATA: [
      // Core query patterns
      /(?:how\s+)?(?:does|fit|relate)\s+(?:with|to)\s+(?:my\s+)?(?:health\s+)?(?:history|record)/i,
      /(?:what|show|tell)\s+(?:me\s+)?(?:about)\s+(?:my\s+)?(?:symptoms|medications|appointments|health)/i,
      /(?:pattern|trend|history)\s+(?:in)\s+(?:my\s+)?(?:health|symptoms|medications)/i,
      /(?:compare|correlate)\s+(?:my\s+)?(?:symptoms|medications)/i,
      /(?:summary|overview)\s+(?:of)\s+(?:my\s+)?(?:health|symptoms|medications)/i
    ],
    AI_ANALYSIS: [
      // General AI analysis patterns
      /(?:run|do|perform|execute)\s+(?:ai|artificial intelligence)\s+(?:analysis|insights|review)/i,
      /(?:analyze|analyse)\s+(?:my\s+)?(?:health|data|symptoms|diary|entries)/i,
      /(?:ai|artificial intelligence)\s+(?:help|analysis|insights|suggestions)/i,
      /(?:get|give|show)\s+(?:me\s+)?(?:ai|artificial intelligence)\s+(?:insights|analysis|suggestions)/i
    ],
    AI_SYMPTOM_ANALYSIS: [
      // Symptom analysis patterns
      /(?:analyze|analyse)\s+(?:my\s+)?(?:symptoms|pain|health issues)/i,
      /(?:symptom|pain)\s+(?:analysis|insights|patterns|trends)/i,
      /(?:look for|find)\s+(?:patterns|correlations)\s+(?:in)\s+(?:my\s+)?(?:symptoms|health)/i,
      /(?:ai|artificial intelligence)\s+(?:symptom|pain)\s+(?:analysis|insights)/i
    ],
    AI_QUESTIONS: [
      // Questions generation patterns
      /(?:suggest|generate|create)\s+(?:questions|what to ask)\s+(?:for)\s+(?:my\s+)?(?:doctor|physician|appointment|visit)/i,
      /(?:what\s+)?(?:questions|things)\s+(?:should|to)\s+(?:i\s+)?(?:ask|bring up)\s+(?:at|during|in)\s+(?:my\s+)?(?:appointment|visit)/i,
      /(?:help|assist)\s+(?:me\s+)?(?:prepare|get ready)\s+(?:for)\s+(?:my\s+)?(?:appointment|visit)/i,
      /(?:ai|artificial intelligence)\s+(?:questions|suggestions)\s+(?:for)\s+(?:doctor|physician)/i
    ],
    AI_SUMMARY: [
      // Health summary patterns
      /(?:health|medical)\s+(?:summary|overview|report)/i,
      /(?:summarize|summarise)\s+(?:my\s+)?(?:health|medical)\s+(?:data|information|history)/i,
      /(?:overall|general)\s+(?:health|medical)\s+(?:status|condition|overview)/i,
      /(?:ai|artificial intelligence)\s+(?:health|medical)\s+(?:summary|overview)/i
    ],
    AI_RECOMMENDATIONS: [
      // Recommendations patterns
      /(?:health|wellness|lifestyle)\s+(?:recommendations|suggestions|advice|tips)/i,
      /(?:recommend|suggest)\s+(?:ways|things|steps)\s+(?:to)\s+(?:improve|help|better)\s+(?:my\s+)?(?:health|wellness)/i,
      /(?:what\s+)?(?:can|should)\s+(?:i\s+)?(?:do|change)\s+(?:to)\s+(?:improve|help|better)\s+(?:my\s+)?(?:health|wellness)/i,
      /(?:ai|artificial intelligence)\s+(?:recommendations|suggestions|advice)/i
    ],
    UNKNOWN: [] // No patterns for unknown
  };
};

// Type-safe route mapping
const INTENT_ROUTES: Record<ConciergeIntent, string> = {
  ADD_SYMPTOM: '/patient/:patientId?symptom=true',
  ADD_MEDICATION: '/patient/:patientId?medication=true',
  ADD_APPOINTMENT: '/patient/:patientId?appointment=true',
  ADD_NOTE: '/patient/:patientId?note=true',
  ADD_MOOD: '/patient/:patientId?mood=true',
  ADD_SLEEP: '/patient/:patientId?sleep=true',
  QUERY_DATA: '/patient/:patientId?query=true',
  AI_ANALYSIS: '/patient/:patientId?ai=true',
  AI_SYMPTOM_ANALYSIS: '/patient/:patientId?ai=symptom-analysis',
  AI_QUESTIONS: '/patient/:patientId?ai=questions',
  AI_SUMMARY: '/patient/:patientId?ai=summary',
  AI_RECOMMENDATIONS: '/patient/:patientId?ai=recommendations',
  UNKNOWN: ''
};

// Confidence threshold for intent detection
const CONFIDENCE_THRESHOLD = 0.4;

// Multi-intent detection result
export interface MultiIntentResult {
  primary: IntentDetectionResult;
  secondary?: IntentDetectionResult;
}

// Enhanced slot extraction with more comprehensive patterns
function extractSlots(input: string, intent: ConciergeIntent): Record<string, any> {
  const slots: Record<string, any> = {};
  
  switch (intent) {
    case 'ADD_SYMPTOM':
      // Extract symptom description
      const symptomMatch = input.match(/(?:symptom|pain|headache|ache|discomfort)\s+(?:is\s+)?(.+)/i);
      if (symptomMatch) {
        slots.description = symptomMatch[1].trim();
      }
      
      // Extract onset time
      const onsetMatch = input.match(/(?:since|from|starting)\s+(yesterday|today|last\s+night|this\s+morning|last\s+week)/i);
      if (onsetMatch) {
        slots.onset = onsetMatch[1];
      }
      
      // Extract severity
      const severityMatch = input.match(/(?:mild|moderate|severe|bad|terrible|awful)\s+(?:pain|symptom)/i);
      if (severityMatch) {
        slots.severity = severityMatch[1];
      }
      break;
      
    case 'ADD_MEDICATION':
      // Extract medication name
      const medMatch = input.match(/(?:start|add|taking|prescribed)\s+(.+?)(?:\s+(?:daily|weekly|monthly|twice\s+daily))?/i);
      if (medMatch) {
        slots.medication_name = medMatch[1].trim();
      }
      
      // Extract dosage
      const dosageMatch = input.match(/(\d+)\s*(?:mg|mcg|g|ml|iu|tablets?|pills?)/i);
      if (dosageMatch) {
        slots.dosage = dosageMatch[0];
      }
      
      // Extract frequency
      const frequencyMatch = input.match(/(?:twice\s+daily|three\s+times\s+daily|daily|weekly|monthly|as\s+needed|PRN)/i);
      if (frequencyMatch) {
        slots.frequency = frequencyMatch[0];
      }
      
      // Extract provider
      const providerMatch = input.match(/(?:prescribed\s+by|from)\s+(GP|doctor|physician|specialist)/i);
      if (providerMatch) {
        slots.provider = providerMatch[1];
      }
      break;
      
    case 'ADD_APPOINTMENT':
      // Extract appointment type
      if (input.includes('telehealth') || input.includes('virtual')) {
        slots.type = 'telehealth';
      } else if (input.includes('in person') || input.includes('office')) {
        slots.type = 'in_person';
      }
      
      // Extract time
      const timeMatch = input.match(/(?:tomorrow|next\s+week|this\s+afternoon|this\s+evening|morning|afternoon|evening)/i);
      if (timeMatch) {
        slots.when = timeMatch[0];
      }
      
      // Extract specific time
      const specificTimeMatch = input.match(/(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (specificTimeMatch) {
        slots.specific_time = specificTimeMatch[1];
      }
      
      // Extract provider type
      const providerTypeMatch = input.match(/(?:see|visit|book)\s+(GP|doctor|physician|specialist|cardiologist|dermatologist)/i);
      if (providerTypeMatch) {
        slots.provider_type = providerTypeMatch[1];
      }
      break;
      
    case 'ADD_MOOD':
      // Extract mood description
      const moodMatch = input.match(/(?:feeling|mood)\s+(happy|sad|anxious|depressed|excited|worried|calm|stressed|angry|irritable|content|miserable|elated|down|up|low|high)/i);
      if (moodMatch) {
        slots.mood = moodMatch[1];
      }
      break;
      
    case 'ADD_SLEEP':
      // Extract sleep quality
      const sleepQualityMatch = input.match(/(?:slept|sleep)\s+(well|badly|poorly|great|terribly)/i);
      if (sleepQualityMatch) {
        slots.quality = sleepQualityMatch[1];
      }
      
      // Extract sleep duration
      const durationMatch = input.match(/(\d+(?:\.\d+)?)\s+hours?\s+(?:of\s+)?sleep/i);
      if (durationMatch) {
        slots.duration = durationMatch[1];
      }
      break;
      
    case 'AI_ANALYSIS':
      // Extract analysis type if mentioned
      const analysisTypeMatch = input.match(/(?:symptom|question|summary|recommendation|health|overview)/i);
      if (analysisTypeMatch) {
        slots.analysisType = analysisTypeMatch[0].toLowerCase();
      }
      break;
      
    case 'AI_SYMPTOM_ANALYSIS':
      slots.analysisType = 'symptom-analysis';
      break;
      
    case 'AI_QUESTIONS':
      slots.analysisType = 'questions';
      break;
      
    case 'AI_SUMMARY':
      slots.analysisType = 'summary';
      break;
      
    case 'AI_RECOMMENDATIONS':
      slots.analysisType = 'recommendations';
      break;
  }
  
  return slots;
}

// Calculate confidence with improved scoring
function calculateConfidence(input: string, pattern: RegExp): number {
  const match = input.match(pattern);
  if (!match) return 0;
  
  const matchLength = match[0].length;
  const inputLength = input.length;
  const baseConfidence = matchLength / inputLength;
  
  // Boost confidence for exact matches
  if (match[0].toLowerCase() === input.toLowerCase()) return 1.0;
  
  // Boost confidence for longer matches
  if (matchLength > inputLength * 0.7) return Math.min(0.95, baseConfidence + 0.2);
  
  // Boost confidence for keyword matches
  const keywordBoost = 0.1;
  const hasKeywords = /(?:record|log|add|track|symptom|medication|appointment|mood|sleep)/i.test(input);
  
  return Math.min(0.9, baseConfidence + (hasKeywords ? keywordBoost : 0));
}

// Rank intents by confidence
function rankIntents(input: string, patterns: IntentPatterns): Array<{intent: ConciergeIntent, confidence: number}> {
  const scores: Array<{intent: ConciergeIntent, confidence: number}> = [];
  
  for (const [intent, intentPatterns] of Object.entries(patterns)) {
    if (intent === 'UNKNOWN') continue;
    
    let maxConfidence = 0;
    for (const pattern of intentPatterns) {
      const confidence = calculateConfidence(input, pattern);
      maxConfidence = Math.max(maxConfidence, confidence);
    }
    
    if (maxConfidence > 0) {
      scores.push({
        intent: intent as ConciergeIntent,
        confidence: maxConfidence
      });
    }
  }
  
  // Sort by confidence descending
  return scores.sort((a, b) => b.confidence - a.confidence);
}

// Main intent detection function with ranked scoring
export function detectIntent(userInput: string): IntentDetectionResult {
  const normalizedInput = userInput.toLowerCase().trim();
  const region = getCurrentRegion() || 'USA';
  const patterns = createIntentPatterns(region);
  
  // Rank all intents by confidence
  const rankedIntents = rankIntents(normalizedInput, patterns);
  
  // Return top intent if above threshold
  if (rankedIntents.length > 0 && rankedIntents[0].confidence >= CONFIDENCE_THRESHOLD) {
    const topIntent = rankedIntents[0];
    const slots = extractSlots(normalizedInput, topIntent.intent);
    
    return {
      intent: topIntent.intent,
      confidence: topIntent.confidence,
      slots,
      route: INTENT_ROUTES[topIntent.intent]
    };
  }
  
  // No confident intent detected
  return {
    intent: 'UNKNOWN',
    confidence: 0,
    slots: {},
    route: ''
  };
}

// Multi-intent detection
export function detectMultiIntent(userInput: string): MultiIntentResult {
  const normalizedInput = userInput.toLowerCase().trim();
  const region = getCurrentRegion() || 'USA';
  const patterns = createIntentPatterns(region);
  
  const rankedIntents = rankIntents(normalizedInput, patterns);
  
  if (rankedIntents.length === 0) {
    return {
      primary: {
        intent: 'UNKNOWN',
        confidence: 0,
        slots: {},
        route: ''
      }
    };
  }
  
  const primary = rankedIntents[0];
  const primarySlots = extractSlots(normalizedInput, primary.intent);
  
  const result: MultiIntentResult = {
    primary: {
      intent: primary.intent,
      confidence: primary.confidence,
      slots: primarySlots,
      route: INTENT_ROUTES[primary.intent]
    }
  };
  
  // Check for secondary intent if confidence is high enough
  if (rankedIntents.length > 1 && rankedIntents[1].confidence >= CONFIDENCE_THRESHOLD) {
    const secondary = rankedIntents[1];
    const secondarySlots = extractSlots(normalizedInput, secondary.intent);
    
    result.secondary = {
      intent: secondary.intent,
      confidence: secondary.confidence,
      slots: secondarySlots,
      route: INTENT_ROUTES[secondary.intent]
    };
  }
  
  return result;
}

// Build route helper
export function buildRoute(intent: ConciergeIntent, patientId: string, slots?: Record<string, any>): string {
  const baseRoute = INTENT_ROUTES[intent];
  if (!baseRoute) return '';
  
  let route = baseRoute.replace(':patientId', patientId);
  
  // Add slot parameters to query string
  if (slots && Object.keys(slots).length > 0) {
    const params = new URLSearchParams();
    Object.entries(slots).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    route += `&${params.toString()}`;
  }
  
  return route;
}

// Privacy-safe logging (no raw user input)
export function logIntentDetection(intent: ConciergeIntent, confidence: number, slotKeys: string[], region: string): void {
  // Only log intent, confidence, slot keys, and region - no raw input
  console.log('Intent Detection:', {
    intent,
    confidence,
    slotKeys,
    region,
    timestamp: new Date().toISOString()
  });
}

// Normalize input for analytics (strip PII)
export function normalizeInputForAnalytics(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b\d{4,}\b/g, '[NUMBER]') // Replace numbers 4+ digits
    .replace(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g, '[EMAIL]') // Replace emails
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]') // Replace phone numbers
    .replace(/\b[A-Z]{2}\d{4,5}\b/g, '[POSTCODE]') // Replace postcodes
    .trim();
}

export function getSuggestedActions(): Array<{intent: ConciergeIntent, label: string, description: string}> {
  return [
    { intent: 'ADD_SYMPTOM', label: 'Add Symptom', description: 'Record a new symptom or pain' },
    { intent: 'ADD_MEDICATION', label: 'Add Medication', description: 'Log a new medication or supplement' },
    { intent: 'ADD_APPOINTMENT', label: 'Add Appointment', description: 'Schedule a doctor visit' },
    { intent: 'ADD_NOTE', label: 'Add Note', description: 'Write a general note or diary entry' },
    { intent: 'ADD_MOOD', label: 'Add Mood', description: 'Track your mood and feelings' },
    { intent: 'ADD_SLEEP', label: 'Add Sleep', description: 'Record sleep quality and duration' },
    { intent: 'AI_ANALYSIS', label: 'AI Analysis', description: 'Get AI insights on your health data' },
    { intent: 'AI_SYMPTOM_ANALYSIS', label: 'Symptom Analysis', description: 'Analyze symptoms and patterns' },
    { intent: 'AI_QUESTIONS', label: 'Suggested Questions', description: 'Get questions for your next doctor visit' }
  ];
}
