/**
 * Ollama LLM Service
 * Handles AI reasoning and response generation using local open-source models
 */

import axios from 'axios';
import config from '../config/env.js';
import { LLM_CONFIG } from '../config/constants.js';
import logger from '../utils/logger.js';

const OLLAMA_BASE = config.ollama.baseUrl;
const OLLAMA_MODEL = config.ollama.model;

/**
 * Build structured prompt for the LLM
 */
function buildSystemPrompt() {
  return LLM_CONFIG.systemPrompt;
}

export function buildUserPrompt(parsedQuery, snippets, conversationHistory) {
  const { originalQuery, disease, intents, patientName, location, isFollowUp } =
    parsedQuery;

  const contextInfo = [
    patientName ? `Patient: ${patientName}` : null,
    disease ? `Condition of interest: ${disease}` : null,
    location ? `Location: ${location}` : null,
    `Query intent: ${intents.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');

  // Build conversation context
  const historyContext =
    conversationHistory.length > 0
      ? `\n\nPREVIOUS CONVERSATION CONTEXT:\n${conversationHistory
          .slice(-LLM_CONFIG.conversationContextLimit)
          .map(
            (m) =>
              `${m.role === 'user' ? 'User' : 'Curalink'}: ${m.content.slice(0, 200)}`,
          )
          .join('\n')}\n`
      : '';

  // Format research snippets
  const pubsText = snippets
    .filter((s) => s.type === 'publication')
    .map(
      (s, i) => `[Paper ${i + 1}] "${s.title}" (${s.source}, ${s.year})
Authors: ${s.authors}
Key findings: ${s.snippet}
URL: ${s.url}`,
    )
    .join('\n\n');

  const trialsText = snippets
    .filter((s) => s.type === 'trial')
    .map(
      (s, i) => `[Trial ${i + 1}] "${s.title}"
Status: ${s.status} | Phase: ${s.phase}
Location: ${s.locations}
Details: ${s.snippet}
NCT ID: ${s.nctId}`,
    )
    .join('\n\n');

  return `${historyContext}
PATIENT/USER CONTEXT:
${contextInfo}

CURRENT QUERY: "${originalQuery}"
${isFollowUp ? '(This is a follow-up question - use context from previous conversation)' : ''}

RETRIEVED RESEARCH PUBLICATIONS (${snippets.filter((s) => s.type === 'publication').length} papers):
${pubsText || 'No publications retrieved for this query.'}

RETRIEVED CLINICAL TRIALS (${snippets.filter((s) => s.type === 'trial').length} trials):
${trialsText || 'No clinical trials found for this query.'}

Please provide a comprehensive, personalized, evidence-based response using ONLY the information provided above. Cite specific papers and trials by their numbers.`;
}

/**
 * Call Ollama API
 */
async function callOllama(prompt, systemPrompt, streamCallback = null) {
  try {
    if (streamCallback) {
      // Streaming mode
      const response = await axios.post(
        `${OLLAMA_BASE}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt,
          system: systemPrompt,
          stream: true,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 2048,
          },
        },
        { responseType: 'stream' },
      );

      let fullText = '';
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              fullText += parsed.response;
              streamCallback(parsed.response, false);
            }
            if (parsed.done) streamCallback('', true);
          } catch (_) {
            // JSON parsing error, skip malformed chunk
          }
        }
      }
      return fullText;
    } else {
      // Non-streaming
      const response = await axios.post(`${OLLAMA_BASE}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt,
        system: systemPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 2048,
        },
      });
      return response.data.response || '';
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      logger.error('Ollama is not running', {
        message: 'Please start Ollama with: ollama serve',
        baseUrl: OLLAMA_BASE,
      });
      throw err;
    }
    logger.error('Ollama API error:', err.message);
    throw err;
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth() {
  try {
    const res = await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 3000 });
    const models = res.data?.models || [];
    return {
      available: true,
      models: models.map((m) => m.name),
      currentModel: OLLAMA_MODEL,
    };
  } catch (_) {
    return { available: false, models: [], currentModel: OLLAMA_MODEL };
  }
}

/**
 * Generate structured response
 */
export async function generateResponse(
  parsedQuery,
  snippets,
  conversationHistory = [],
  streamCallback = null,
) {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(
    parsedQuery,
    snippets,
    conversationHistory,
  );

  try {
    const response = await callOllama(userPrompt, systemPrompt, streamCallback);
    return { success: true, content: response, model: OLLAMA_MODEL };
  } catch (err) {
    console.error('LLM generation error:', err.message);

    // Fallback response when Ollama is unavailable
    if (err.message.includes('Ollama is not running')) {
      const fallback = generateFallbackResponse(parsedQuery, snippets);
      return {
        success: false,
        content: fallback,
        model: 'fallback',
        error: err.message,
      };
    }
    throw err;
  }
}

/**
 * Fallback response when Ollama is unavailable
 */
function generateFallbackResponse(parsedQuery, snippets) {
  const { originalQuery, disease, intents } = parsedQuery;
  const pubs = snippets.filter((s) => s.type === 'publication');
  const trials = snippets.filter((s) => s.type === 'trial');

  return `## Condition Overview
Research results for: **${disease || originalQuery}**

*Note: AI reasoning is currently unavailable (Ollama not running). Showing curated research results.*

## Key Research Insights
${
  pubs.length > 0
    ? pubs
        .slice(0, 4)
        .map(
          (p, i) =>
            `**[${i + 1}] ${p.title}** (${p.source}, ${p.year})\n${p.snippet?.slice(0, 300) || ''}...`,
        )
        .join('\n\n')
    : 'No publications retrieved. Please check your query and try again.'
}

## Clinical Trial Opportunities
${
  trials.length > 0
    ? trials
        .slice(0, 3)
        .map(
          (t, i) =>
            `**[${i + 1}] ${t.title}**\nStatus: ${t.status} | Phase: ${t.phase}\nLocation: ${t.locations}`,
        )
        .join('\n\n')
    : 'No clinical trials found for this query.'
}

## Important Disclaimer
This information is for educational purposes only. Consult qualified healthcare professionals for medical advice. To enable AI-powered analysis, please ensure Ollama is running: \`ollama serve\` and \`ollama pull llama3.2\`.`;
}
