/**
 * Local AI Symptom Checker
 * Rule-based symptom analysis for offline use in village mode
 * NOT a replacement for professional medical diagnosis
 */

interface Symptom {
  id: string;
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
}

interface SymptomAnalysis {
  possibleConditions: string[];
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  recommendations: string[];
  disclaimer: string;
}

// Common symptom patterns (simplified for offline use)
const SYMPTOM_RULES = {
  fever_high_cough_breathless: {
    possibleConditions: ['Pneumonia', 'Severe Respiratory Infection', 'COVID-19'],
    urgency: 'emergency' as const,
    recommendations: [
      'Seek immediate medical attention',
      'Monitor oxygen levels if oximeter available',
      'Keep patient hydrated',
      'Arrange transport to nearest health facility'
    ]
  },
  fever_high_headache_stiffneck: {
    possibleConditions: ['Meningitis', 'Severe Infection'],
    urgency: 'emergency' as const,
    recommendations: [
      'Emergency medical attention required',
      'Do not delay - this is a medical emergency',
      'Arrange immediate transport to hospital'
    ]
  },
  fever_moderate_cough_cold: {
    possibleConditions: ['Common Cold', 'Flu', 'Upper Respiratory Infection'],
    urgency: 'medium' as const,
    recommendations: [
      'Rest and stay hydrated',
      'Monitor temperature regularly',
      'Consult doctor if symptoms worsen',
      'Paracetamol for fever (as per doctor advice)'
    ]
  },
  fever_rash_bodyache: {
    possibleConditions: ['Dengue', 'Viral Fever', 'Chikungunya'],
    urgency: 'high' as const,
    recommendations: [
      'Visit doctor for blood test',
      'Stay well hydrated',
      'Monitor for warning signs (bleeding, severe pain)',
      'Avoid mosquito bites'
    ]
  },
  diarrhea_vomiting_fever: {
    possibleConditions: ['Gastroenteritis', 'Food Poisoning', 'Cholera'],
    urgency: 'high' as const,
    recommendations: [
      'ORS (Oral Rehydration Solution) immediately',
      'Monitor for dehydration signs',
      'Seek medical attention if severe',
      'Maintain hygiene'
    ]
  },
  chest_pain_breathless_sweating: {
    possibleConditions: ['Heart Attack', 'Cardiac Emergency'],
    urgency: 'emergency' as const,
    recommendations: [
      'CALL EMERGENCY IMMEDIATELY',
      'Do not delay - this is life-threatening',
      'Keep patient calm and seated',
      'Aspirin if available and no contraindications'
    ]
  },
  abdominal_pain_severe_vomiting: {
    possibleConditions: ['Appendicitis', 'Intestinal Obstruction', 'Severe Gastritis'],
    urgency: 'emergency' as const,
    recommendations: [
      'Seek immediate medical attention',
      'Do not give food or water',
      'Arrange transport to hospital',
      'Note location and type of pain'
    ]
  }
};

/**
 * Analyze symptoms using rule-based logic
 */
export function analyzeSymptoms(symptoms: string[], vitals?: {
  temperature?: number;
  bloodPressure?: string;
  pulseRate?: number;
}): SymptomAnalysis {
  const normalizedSymptoms = symptoms.map(s => s.toLowerCase().trim());
  
  // Default analysis
  let analysis: SymptomAnalysis = {
    possibleConditions: ['General illness - requires medical consultation'],
    urgency: 'medium',
    recommendations: [
      'Consult a healthcare provider',
      'Monitor symptoms for changes',
      'Keep track of symptom duration'
    ],
    disclaimer: '⚠️ This is NOT a medical diagnosis. Always consult a qualified healthcare provider.'
  };
  
  // Check for emergency patterns
  if (matchSymptoms(normalizedSymptoms, ['fever', 'high', 'cough', 'breathless']) ||
      matchSymptoms(normalizedSymptoms, ['breathing', 'difficulty', 'fever'])) {
    return { ...SYMPTOM_RULES.fever_high_cough_breathless, disclaimer: analysis.disclaimer };
  }
  
  if (matchSymptoms(normalizedSymptoms, ['fever', 'headache', 'stiff neck']) ||
      matchSymptoms(normalizedSymptoms, ['neck', 'stiff', 'severe headache'])) {
    return { ...SYMPTOM_RULES.fever_high_headache_stiffneck, disclaimer: analysis.disclaimer };
  }
  
  if (matchSymptoms(normalizedSymptoms, ['chest pain', 'breathless', 'sweating']) ||
      matchSymptoms(normalizedSymptoms, ['chest', 'pain', 'left arm'])) {
    return { ...SYMPTOM_RULES.chest_pain_breathless_sweating, disclaimer: analysis.disclaimer };
  }
  
  if (matchSymptoms(normalizedSymptoms, ['abdominal', 'pain', 'severe', 'vomiting']) ||
      matchSymptoms(normalizedSymptoms, ['stomach', 'pain', 'severe'])) {
    return { ...SYMPTOM_RULES.abdominal_pain_severe_vomiting, disclaimer: analysis.disclaimer };
  }
  
  // Check for high urgency patterns
  if (matchSymptoms(normalizedSymptoms, ['fever', 'rash', 'body ache']) ||
      matchSymptoms(normalizedSymptoms, ['fever', 'joint pain', 'rash'])) {
    return { ...SYMPTOM_RULES.fever_rash_bodyache, disclaimer: analysis.disclaimer };
  }
  
  if (matchSymptoms(normalizedSymptoms, ['diarrhea', 'vomiting', 'fever']) ||
      matchSymptoms(normalizedSymptoms, ['loose motions', 'vomiting'])) {
    return { ...SYMPTOM_RULES.diarrhea_vomiting_fever, disclaimer: analysis.disclaimer };
  }
  
  // Check for moderate urgency
  if (matchSymptoms(normalizedSymptoms, ['fever', 'cough', 'cold']) ||
      matchSymptoms(normalizedSymptoms, ['fever', 'cough'])) {
    return { ...SYMPTOM_RULES.fever_moderate_cough_cold, disclaimer: analysis.disclaimer };
  }
  
  // Check vitals for urgency
  if (vitals) {
    if (vitals.temperature && vitals.temperature > 103) {
      analysis.urgency = 'high';
      analysis.recommendations.unshift('High fever detected - seek medical attention soon');
    }
    
    if (vitals.pulseRate && (vitals.pulseRate > 120 || vitals.pulseRate < 50)) {
      analysis.urgency = 'high';
      analysis.recommendations.unshift('Abnormal pulse rate - medical evaluation needed');
    }
  }
  
  return analysis;
}

/**
 * Helper to match symptom patterns
 */
function matchSymptoms(symptoms: string[], pattern: string[]): boolean {
  return pattern.every(p => 
    symptoms.some(s => s.includes(p))
  );
}

/**
 * Get common symptoms list for dropdown
 */
export function getCommonSymptoms(): string[] {
  return [
    'Fever',
    'Cough',
    'Cold',
    'Headache',
    'Body ache',
    'Fatigue',
    'Sore throat',
    'Runny nose',
    'Chest pain',
    'Breathing difficulty',
    'Abdominal pain',
    'Nausea',
    'Vomiting',
    'Diarrhea',
    'Rash',
    'Dizziness',
    'Joint pain',
    'Back pain',
    'Loss of appetite',
    'Weakness'
  ];
}

/**
 * Get first aid recommendations for common issues
 */
export function getFirstAidAdvice(condition: string): string[] {
  const advice: Record<string, string[]> = {
    fever: [
      'Rest in cool, comfortable environment',
      'Drink plenty of fluids',
      'Sponge with lukewarm water if very high',
      'Paracetamol as per doctor\'s advice',
      'Monitor temperature every 4-6 hours'
    ],
    diarrhea: [
      'ORS (Oral Rehydration Solution) frequently',
      'Avoid solid food initially',
      'Maintain hygiene',
      'Watch for dehydration signs',
      'Zinc supplements if available (for children)'
    ],
    cuts_wounds: [
      'Clean with clean water',
      'Apply pressure if bleeding',
      'Cover with clean cloth/bandage',
      'Seek medical help if deep or dirty',
      'Check tetanus vaccination status'
    ],
    burns: [
      'Cool with clean running water (10-15 minutes)',
      'Do not apply ice directly',
      'Cover with clean cloth',
      'Do not apply ointments without medical advice',
      'Seek medical help for large or deep burns'
    ]
  };
  
  return advice[condition.toLowerCase()] || [
    'Consult healthcare provider',
    'Keep patient comfortable',
    'Monitor for changes'
  ];
}

export default {
  analyzeSymptoms,
  getCommonSymptoms,
  getFirstAidAdvice
};
