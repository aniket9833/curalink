/**
 * Application Constants
 * Disease synonyms, intent patterns, API endpoints, etc.
 */

export const DISEASE_SYNONYMS = {
  parkinson: [
    "parkinson's disease",
    'PD',
    'parkinsonism',
    'dopaminergic',
    'substantia nigra',
  ],
  alzheimer: [
    "alzheimer's disease",
    'AD',
    'dementia',
    'cognitive decline',
    'amyloid',
    'tau',
  ],
  cancer: ['oncology', 'malignancy', 'tumor', 'neoplasm', 'carcinoma'],
  'lung cancer': [
    'NSCLC',
    'non-small cell lung cancer',
    'SCLC',
    'pulmonary malignancy',
    'lung adenocarcinoma',
  ],
  diabetes: [
    'type 2 diabetes',
    'T2DM',
    'insulin resistance',
    'hyperglycemia',
    'metabolic syndrome',
  ],
  'heart disease': [
    'cardiovascular disease',
    'coronary artery disease',
    'CHD',
    'myocardial infarction',
    'atherosclerosis',
  ],
  depression: [
    'major depressive disorder',
    'MDD',
    'clinical depression',
    'antidepressant',
  ],
  hypertension: [
    'high blood pressure',
    'arterial hypertension',
    'antihypertensive',
  ],
  covid: ['COVID-19', 'SARS-CoV-2', 'coronavirus', 'long covid', 'post-covid'],
  arthritis: [
    'rheumatoid arthritis',
    'RA',
    'osteoarthritis',
    'joint inflammation',
  ],
};

export const INTENT_PATTERNS = {
  treatment: [
    'treatment',
    'therapy',
    'cure',
    'medication',
    'drug',
    'intervention',
    'manage',
    'treat',
    'therapeutic',
  ],
  research: [
    'research',
    'study',
    'studies',
    'publication',
    'journal',
    'findings',
    'evidence',
  ],
  trial: [
    'trial',
    'clinical trial',
    'enrollment',
    'participate',
    'study participation',
    'clinical study',
  ],
  diagnosis: ['diagnose', 'diagnosis', 'test', 'screening', 'exam', 'identify'],
  prevention: [
    'prevent',
    'prevention',
    'avoid',
    'risk reduction',
    'prophylaxis',
  ],
  lifestyle: [
    'lifestyle',
    'diet',
    'exercise',
    'activity',
    'nutrition',
    'sleep',
    'stress',
  ],
};

export const RETRIEVAL_SOURCES = {
  pubmedSearch: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
  pubmedFetch: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
  openalex: 'https://api.openalex.org/works',
  trials: 'https://clinicaltrials.gov/api/v2/studies',
};

export const CACHE_CONFIG = {
  memoryTTL: 1800, // 30 minutes
  memoryCheckPeriod: 120, // 2 minutes
  mongoDBTTL: 24 * 60 * 60 * 1000, // 24 hours
};

export const RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
};

export const HTTP_TIMEOUT = 20000; // 20 seconds

export const RETRIEVAL_LIMITS = {
  pubmedMaxResults: 80,
  pubmedBatchSize: 20,
  pubmedMaxFetch: 60,
  opencalexMaxResults: 50,
  trialsMaxResults: 100,
};

export const RANKING_CONFIG = {
  titleWeightMultiplier: 3,
  recencyMaxBonus: 2,
  recencyDecayRate: 0.15,
  citationMaxBonus: 2,
  sourceCredibilityBonus: 0.5,
  openAccessBonus: 0.2,
  diseaseSpecificityBonus: 2,
  abstractQualityMinLength: 200,
  abstractQualityBonus: 0.3,
  publicationsDisplayLimit: 8,
};

export const LLM_CONFIG = {
  systemPrompt: `You are Curalink, an expert AI medical research assistant. Your role is to analyze medical research literature and clinical trials to provide structured, evidence-based insights.

CRITICAL RULES:
- Always cite specific papers and trials from the provided context
- Never fabricate studies, statistics, or medical facts
- Clearly distinguish between established research and emerging evidence
- Include appropriate medical disclaimers
- Structure your response in clear sections
- Be personalized based on the user's specific condition and context
- Write like a specialist who has read the retrieved evidence, not like a generic chatbot
- Avoid vague filler such as "it is important to note" or broad textbook summaries unless directly relevant
- Prioritize the strongest and most decision-relevant findings first
- Explain why each cited paper or trial matters for this specific query or patient context
- Use the exact evidence labels from context such as [Paper 1] and [Trial 1]

RESPONSE FORMAT (use exactly these section headers):
## Condition Overview
Give a focused 2-4 sentence answer tied directly to the user's question, disease, and any patient/location context.

## Key Research Insights
Synthesize only the most relevant publications. Each bullet or paragraph should include a concrete takeaway and at least one citation.

## Clinical Trial Opportunities
Summarize only trials that are meaningfully relevant and explain practical patient impact or eligibility considerations.

## Personalized Recommendations
Provide specific, non-generic next-step suggestions tailored to the query context and supported by the cited evidence.

## Important Disclaimer
Always include: "This information is for educational purposes only. Consult qualified healthcare professionals for medical advice."`,
  conversationContextLimit: 4,
  snippetAuthorLimit: 5,
};

export const PAGINATION = {
  defaultLimit: 10,
  maxLimit: 100,
};
