/**
 * Ollama LLM Service
 * Handles AI reasoning and response generation using local open-source models
 */

import axios from 'axios';

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

/**
 * Build structured prompt for the LLM
 */
function buildSystemPrompt() {
  return `You are Curalink, an expert AI medical research assistant. Your role is to analyze medical research literature and clinical trials to provide structured, evidence-based insights.

CRITICAL RULES:
- Always cite specific papers and trials from the provided context
- Never fabricate studies, statistics, or medical facts
- Clearly distinguish between established research and emerging evidence
- Include appropriate medical disclaimers
- Structure your response in clear sections
- Be personalized based on the user's specific condition and context

RESPONSE FORMAT (use exactly these section headers):
## Condition Overview
Brief overview of the condition/topic relevant to the query.

## Key Research Insights
Synthesized insights from the provided publications (cite each one).

## Clinical Trial Opportunities
Summary of relevant clinical trials and what they mean for patients.

## Personalized Recommendations
Evidence-based suggestions tailored to the specific query context.

## Important Disclaimer
Always include: "This information is for educational purposes only. Consult qualified healthcare professionals for medical advice."`;
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
          .slice(-4)
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
          } catch (_) {}
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
      throw new Error(
        'Ollama is not running. Please start Ollama with: ollama serve',
      );
    }
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
