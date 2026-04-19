/**
 * Hugging Face LLM Service
 * Handles AI reasoning and response generation using Hugging Face inference API
 */

import axios from 'axios';
import { LLM_CONFIG } from '../config/constants.js';
import config from '../config/env.js';
import logger from '../utils/logger.js';

const HF_CHAT_COMPLETIONS_URL =
  'https://router.huggingface.co/v1/chat/completions';
const HF_MODEL_INFO_URL = 'https://huggingface.co/api/models';

function getHuggingFaceConfig() {
  return {
    model: config.huggingFace.model,
    token: config.huggingFace.token,
  };
}

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
 * Call Hugging Face Inference API
 */
async function callHuggingFace(prompt, systemPrompt, streamCallback = null) {
  try {
    const { model, token } = getHuggingFaceConfig();

    if (!token) {
      throw new Error('HF_TOKEN not configured');
    }

    const response = await axios.post(
      HF_CHAT_COMPLETIONS_URL,
      {
        model,
        messages: [
          ...(systemPrompt
            ? [{ role: 'system', content: systemPrompt }]
            : []),
          { role: 'user', content: prompt },
        ],
        max_tokens: 2048,
        temperature: 0.3,
        top_p: 0.9,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      },
    );

    const text = response.data?.choices?.[0]?.message?.content || '';
    if (streamCallback) {
      streamCallback(text, false);
      streamCallback('', true);
    }
    return text;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.message.includes('ENOTFOUND')) {
      logger.error('Hugging Face API is unreachable', {
        message: 'Please check your internet connection and HF_TOKEN',
        model: getHuggingFaceConfig().model,
      });
      throw err;
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      logger.error('Hugging Face authentication failed', {
        message: 'Invalid HF_TOKEN',
      });
      throw err;
    }
    logger.error('Hugging Face API error:', err.message);
    throw err;
  }
}

/**
 * Check if Hugging Face API is available
 */
export async function checkHuggingFaceHealth() {
  try {
    const { model, token } = getHuggingFaceConfig();

    if (!token) {
      return {
        available: false,
        currentModel: model,
        error: 'HF_TOKEN not configured',
      };
    }
    const res = await axios.get(
      `${HF_MODEL_INFO_URL}/${model}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      },
    );
    return {
      available: true,
      currentModel: model,
      modelInfo: res.data?.id || model,
    };
  } catch (error) {
    return {
      available: false,
      currentModel: getHuggingFaceConfig().model,
      error:
        error.response?.data?.error ||
        error.message ||
        'Unable to reach Hugging Face',
    };
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
    const response = await callHuggingFace(
      userPrompt,
      systemPrompt,
      streamCallback,
    );
    return {
      success: true,
      content: response,
      model: getHuggingFaceConfig().model,
    };
  } catch (err) {
    console.error('LLM generation error:', err.message);

    // Fallback response when Hugging Face API is unavailable
    if (err.message.includes('Hugging Face') || err.response?.status === 503) {
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
 * Fallback response when Hugging Face API is unavailable
 */
function generateFallbackResponse(parsedQuery, snippets) {
  const { originalQuery, disease, intents } = parsedQuery;
  const pubs = snippets.filter((s) => s.type === 'publication');
  const trials = snippets.filter((s) => s.type === 'trial');

  return `## Condition Overview
Research results for: **${disease || originalQuery}**

*Note: AI reasoning is currently unavailable (Hugging Face API not accessible). Showing curated research results.*

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
This information is for educational purposes only. Consult qualified healthcare professionals for medical advice. To enable AI-powered analysis, ensure HF_TOKEN and HF_MODEL environment variables are properly configured.`;
}
