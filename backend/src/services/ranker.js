/**
 * Ranking Engine
 * Scores and ranks publications and trials for relevance
 */

import { RANKING_CONFIG } from '../config/constants.js';

const CURRENT_YEAR = new Date().getFullYear();

// Text similarity (TF-IDF inspired simple scoring)

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function termFrequency(tokens) {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return freq;
}

function textSimilarity(queryTokens, docText) {
  const queryFreq = termFrequency(queryTokens);
  const docTokens = tokenize(docText);
  const docFreq = termFrequency(docTokens);

  let score = 0;
  for (const [term, qCount] of Object.entries(queryFreq)) {
    if (docFreq[term]) {
      // TF boost for title vs abstract
      score += qCount * Math.log(1 + docFreq[term]);
    }
  }
  // Normalize
  return score / Math.max(queryTokens.length, 1);
}

// Publication Ranker

export function rankPublications(publications, parsedQuery) {
  const { originalQuery, expandedQuery, disease, intents } = parsedQuery;

  const queryText = `${originalQuery} ${disease || ''} ${intents.join(' ')}`;
  const queryTokens = tokenize(queryText);

  const scored = publications.map((pub) => {
    let score = 0;

    // 1. Relevance score (title weighted 3x, abstract 1x)
    const titleScore =
      textSimilarity(queryTokens, pub.title) *
      RANKING_CONFIG.titleWeightMultiplier;
    const abstractScore = textSimilarity(queryTokens, pub.abstract);
    score += titleScore + abstractScore;

    // 2. Recency bonus (configurable max, linear decay)
    const year = parseInt(pub.year) || 2000;
    const age = CURRENT_YEAR - year;
    score += Math.max(
      0,
      RANKING_CONFIG.recencyMaxBonus - age * RANKING_CONFIG.recencyDecayRate,
    );

    // 3. Citation count bonus (log scale, capped)
    if (pub.citationCount > 0) {
      score += Math.min(
        RANKING_CONFIG.citationMaxBonus,
        Math.log10(pub.citationCount + 1),
      );
    }

    // 4. Source credibility boost
    if (pub.source === 'PubMed') score += RANKING_CONFIG.sourceCredibilityBonus;

    // 5. Open access bonus
    if (pub.openAccess) score += RANKING_CONFIG.openAccessBonus;

    // 6. Disease specificity — heavy bonus if disease in title
    if (disease && pub.title.toLowerCase().includes(disease.toLowerCase())) {
      score += RANKING_CONFIG.diseaseSpecificityBonus;
    }

    // 7. Abstract quality (longer = more info)
    if (
      pub.abstract &&
      pub.abstract.length > RANKING_CONFIG.abstractQualityMinLength
    )
      score += RANKING_CONFIG.abstractQualityBonus;

    return { ...pub, relevanceScore: Math.round(score * 100) / 100 };
  });

  // Sort descending, deduplicate by title similarity
  const sorted = scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Deduplicate by similar titles
  const seen = new Set();
  const deduped = [];
  for (const pub of sorted) {
    const titleKey = pub.title.toLowerCase().slice(0, 60);
    if (!seen.has(titleKey)) {
      seen.add(titleKey);
      deduped.push(pub);
    }
  }

  return deduped.slice(0, RANKING_CONFIG.publicationsDisplayLimit);
}

// Trial Ranker

export function rankTrials(trials, parsedQuery) {
  const { disease, intents, location } = parsedQuery;
  const queryTokens = tokenize(`${disease || ''} ${intents.join(' ')}`);

  const statusPriority = {
    RECRUITING: 5,
    NOT_YET_RECRUITING: 4,
    ACTIVE_NOT_RECRUITING: 3,
    COMPLETED: 2,
    TERMINATED: 0,
  };

  const scored = trials.map((trial) => {
    let score = 0;

    // Status priority
    score += statusPriority[trial.status] || 1;

    // Title relevance
    score += textSimilarity(queryTokens, trial.title) * 2;

    // Eligibility relevance
    score += textSimilarity(queryTokens, trial.eligibilityCriteria);

    // Location match bonus
    if (
      location &&
      trial.locations.some((l) =>
        l.toLowerCase().includes(location.toLowerCase().split(',')[0]),
      )
    ) {
      score += 2;
    }

    // Phase bonus (later phases = more validated)
    if (trial.phase?.includes('3') || trial.phase?.includes('4')) score += 1.5;
    else if (trial.phase?.includes('2')) score += 1;

    // Has contact info bonus
    if (trial.contact?.email || trial.contact?.phone) score += 0.5;

    return { ...trial, relevanceScore: Math.round(score * 100) / 100 };
  });

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 6);
}

// Extract top snippets for LLM context

export function extractSnippets(publications, trials) {
  const pubSnippets = publications.slice(0, 6).map((p) => ({
    type: 'publication',
    title: p.title,
    year: p.year,
    source: p.source,
    authors: p.authors?.slice(0, 3).join(', ') || '',
    snippet: p.abstract ? p.abstract.slice(0, 400) : '',
    url: p.url,
    relevanceScore: p.relevanceScore,
  }));

  const trialSnippets = trials.slice(0, 4).map((t) => ({
    type: 'trial',
    title: t.title,
    status: t.status,
    phase: t.phase,
    locations: t.locations.slice(0, 2).join('; '),
    snippet: t.eligibilityCriteria ? t.eligibilityCriteria.slice(0, 300) : '',
    url: t.url,
    nctId: t.nctId,
    relevanceScore: t.relevanceScore,
  }));

  return [...pubSnippets, ...trialSnippets];
}
