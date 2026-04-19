/**
 * Query Intelligence Service
 * Handles query parsing, intent detection, and smart expansion
 */

import { DISEASE_SYNONYMS, INTENT_PATTERNS } from '../config/constants.js';

/**
 * Detect primary intent from query
 */
export function detectIntent(query) {
  const lower = query.toLowerCase();
  const scores = {};

  for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
    scores[intent] = keywords.filter((kw) => lower.includes(kw)).length;
  }

  const topIntent = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .filter(([, score]) => score > 0)
    .map(([intent]) => intent);

  return topIntent.length > 0 ? topIntent : ['general'];
}

/**
 * Extract disease from query or context
 */
export function extractDisease(query, contextDisease) {
  if (contextDisease) return contextDisease;

  const lower = query.toLowerCase();
  for (const disease of Object.keys(DISEASE_SYNONYMS)) {
    if (lower.includes(disease)) return disease;
  }

  // Fallback: extract nouns (simple heuristic)
  const medicalTerms = query.match(
    /\b[A-Z][a-z]+(?:'s)?\s+(?:disease|syndrome|disorder|cancer|tumor)\b/gi,
  );
  if (medicalTerms && medicalTerms.length > 0) return medicalTerms[0];

  return null;
}

/**
 * Expand query intelligently for better retrieval
 */
export function expandQuery(originalQuery, disease, intent, location) {
  let expanded = originalQuery.trim();

  // Always add disease if not in query
  if (disease && !expanded.toLowerCase().includes(disease.toLowerCase())) {
    expanded = `${expanded} ${disease}`;
  }

  // Add intent-specific terms
  if (intent.includes('treatment')) {
    expanded += ' treatment therapy clinical';
  } else if (intent.includes('trials')) {
    expanded += ' clinical trial randomized controlled';
  } else if (intent.includes('research')) {
    expanded += ' research study evidence';
  }

  // Add synonyms for better recall
  const diseaseKey = disease ? disease.toLowerCase() : '';
  if (DISEASE_SYNONYMS[diseaseKey]) {
    const synonyms = DISEASE_SYNONYMS[diseaseKey].slice(0, 2).join(' OR ');
    expanded = `(${expanded}) OR (${synonyms})`;
  }

  return expanded.trim();
}

/**
 * Build PubMed-specific query with MeSH terms
 */
export function buildPubMedQuery(query, disease, intent) {
  let terms = [query];

  if (disease) {
    terms.push(`"${disease}"[MeSH Terms]`);
  }

  if (intent.includes('treatment')) {
    terms.push('(treatment[Title/Abstract] OR therapy[Title/Abstract])');
  } else if (intent.includes('trials')) {
    terms.push('Clinical Trial[PT]');
  }

  // Prefer recent publications
  terms.push('("2018"[Date - Publication] : "3000"[Date - Publication])');

  return terms.join(' AND ');
}

/**
 * Main parse function
 */
export function parseQuery(
  userQuery,
  conversationHistory = [],
  medicalContext = {},
) {
  const disease = extractDisease(userQuery, medicalContext.disease);
  const intents = detectIntent(userQuery);
  const expandedQuery = expandQuery(
    userQuery,
    disease,
    intents,
    medicalContext.location,
  );
  const pubmedQuery = buildPubMedQuery(userQuery, disease, intents);

  // Check if this is a follow-up (uses context from history)
  const isFollowUp =
    conversationHistory.length > 0 && userQuery.split(' ').length < 8;

  return {
    originalQuery: userQuery,
    disease,
    intents,
    expandedQuery,
    pubmedQuery,
    location: medicalContext.location,
    patientName: medicalContext.patientName,
    isFollowUp,
    needsClinicalTrials:
      intents.includes('trials') || intents.includes('treatment'),
  };
}
