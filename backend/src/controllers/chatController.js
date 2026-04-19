/**
 * Chat Controller
 * Orchestrates the full research pipeline
 */

import { v4 as uuidv4 } from 'uuid';

import { parseQuery } from '../services/queryEngine.js';
import { retrieveAll } from '../services/retriever.js';
import {
  rankPublications,
  rankTrials,
  extractSnippets,
} from '../services/ranker.js';

import { generateResponse, checkOllamaHealth } from '../services/llm.js';

import { getCached, setCached } from '../services/cache.js';

import { Chat, Search } from '../models/index.js';

// POST /api/chat/message

export async function sendMessage(req, res) {
  const { sessionId, message, chatId, medicalContext = {} } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({
      error: 'Message is required',
    });
  }

  const sid = sessionId || uuidv4();

  try {
    // 1. Load or create chat
    let chat = chatId ? await Chat.findById(chatId) : null;

    if (!chat) {
      chat = new Chat({
        sessionId: sid,
        title: message.slice(0, 60),
        messages: [],
        medicalContext,
      });
    }

    // Update medical context if provided
    if (medicalContext.disease) {
      chat.medicalContext = {
        ...chat.medicalContext,
        ...medicalContext,
      };
    }

    // 2. Get conversation history (last 6 messages for context)
    const history = chat.messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. Parse and expand query
    const parsedQuery = parseQuery(message, history, {
      disease: chat.medicalContext?.disease || medicalContext.disease,

      location: chat.medicalContext?.location || medicalContext.location,

      patientName: medicalContext.patientName,
    });

    console.log('🧠 Parsed query:', {
      disease: parsedQuery.disease,
      intents: parsedQuery.intents,
      expanded: parsedQuery.expandedQuery?.slice(0, 80),
    });

    // 4. Retrieve research (with caching)
    let rawResults = await getCached(
      parsedQuery.expandedQuery,
      parsedQuery.disease,
    );

    if (!rawResults) {
      rawResults = await retrieveAll(parsedQuery);

      await setCached(
        parsedQuery.expandedQuery,
        parsedQuery.disease,
        rawResults,
      );
    }

    // 5. Rank results
    const rankedPubs = rankPublications(rawResults.publications, parsedQuery);

    const rankedTrials = rankTrials(rawResults.trials, parsedQuery);

    console.log(
      `📊 Ranked: ${rankedPubs.length} papers, ${rankedTrials.length} trials`,
    );

    // 6. Extract snippets for LLM context
    const snippets = extractSnippets(rankedPubs, rankedTrials);

    // 7. Generate AI response
    const llmResult = await generateResponse(parsedQuery, snippets, history);

    // 8. Build source attribution
    const sources = [
      ...rankedPubs.map((p) => ({
        type: 'publication',
        title: p.title,
        authors: p.authors,
        year: p.year,
        source: p.source,
        url: p.url,
        snippet: p.abstract?.slice(0, 250) || '',
        relevanceScore: p.relevanceScore,
        journal: p.journal,
        citationCount: p.citationCount,
        openAccess: p.openAccess,
      })),

      ...rankedTrials.map((t) => ({
        type: 'trial',
        title: t.title,
        status: t.status,
        phase: t.phase,
        conditions: t.conditions,
        locations: t.locations,
        contact: t.contact,
        url: t.url,
        nctId: t.nctId,
        snippet: t.eligibilityCriteria?.slice(0, 250) || '',
        relevanceScore: t.relevanceScore,
        eligibilityCriteria: t.eligibilityCriteria,
        minAge: t.minAge,
        maxAge: t.maxAge,
        sex: t.sex,
        interventions: t.interventions,
      })),
    ];

    // 9. Save messages to chat
    const userMsg = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    const assistantMsg = {
      role: 'assistant',
      content: llmResult.content,
      timestamp: new Date(),
      sources,
      queryExpanded: parsedQuery.expandedQuery,

      retrievalStats: {
        pubmedCount: rawResults.publications.filter(
          (p) => p.source === 'PubMed',
        ).length,

        openAlexCount: rawResults.publications.filter(
          (p) => p.source === 'OpenAlex',
        ).length,

        trialsCount: rawResults.trials.length,

        rankedCount: rankedPubs.length + rankedTrials.length,
      },
    };

    chat.messages.push(userMsg, assistantMsg);

    await chat.save();

    // 10. Log search
    await Search.create({
      sessionId: sid,
      originalQuery: message,
      expandedQuery: parsedQuery.expandedQuery,
      disease: parsedQuery.disease,
      location: parsedQuery.location,
      resultsCount: sources.length,
    }).catch(() => {});

    // 11. Return structured response
    return res.json({
      success: true,
      chatId: chat._id,
      sessionId: sid,

      response: {
        content: llmResult.content,
        sources,

        queryExpanded: parsedQuery.expandedQuery,

        parsedQuery: {
          disease: parsedQuery.disease,
          intents: parsedQuery.intents,
          isFollowUp: parsedQuery.isFollowUp,
        },

        retrievalStats: assistantMsg.retrievalStats,

        model: llmResult.model,

        aiAvailable: llmResult.success,
      },
    });
  } catch (err) {
    console.error('Chat error:', err);

    return res.status(500).json({
      error: 'Failed to process query',
      message: err.message,
    });
  }
}

// GET /api/chat/history/:sessionId

export async function getChatHistory(req, res) {
  try {
    const { sessionId } = req.params;

    const chats = await Chat.find({
      sessionId,
    })
      .select('_id title createdAt updatedAt medicalContext')
      .sort({
        updatedAt: -1,
      })
      .limit(20);

    res.json({ chats });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
}

// GET /api/chat/:chatId

export async function getChat(req, res) {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        error: 'Chat not found',
      });
    }

    res.json({ chat });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
}

// DELETE /api/chat/:chatId

export async function deleteChat(req, res) {
  try {
    await Chat.findByIdAndDelete(req.params.chatId);

    res.json({
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
}

// GET /api/chat/health

export async function getHealth(req, res) {
  const ollamaStatus = await checkOllamaHealth();

  res.json({
    status: 'ok',
    ollama: ollamaStatus,
  });
}
