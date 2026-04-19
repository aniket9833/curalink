/**
 * Response Formatting Utilities
 * Standardized response formats
 */

/**
 * Success Response
 */
export function successResponse(data, message = 'Success') {
  return {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Error Response
 */
export function errorResponse(error, statusCode = 500) {
  return {
    success: false,
    error: error.message || error,
    statusCode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Paginated Response
 */
export function paginatedResponse(data, total, page, limit) {
  return {
    success: true,
    data,
    pagination: {
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      pages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format Chat Message
 */
export function formatChatMessage(message) {
  return {
    id: message._id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
    sources: message.sources || [],
    retrievalStats: message.retrievalStats || {},
  };
}

/**
 * Format Publication
 */
export function formatPublication(pub) {
  return {
    id: pub._id || pub.pmid,
    title: pub.title,
    authors: pub.authors,
    year: pub.year,
    source: pub.source,
    journal: pub.journal,
    abstract: pub.abstract,
    url: pub.url,
    citationCount: pub.citationCount || 0,
    relevanceScore: pub.relevanceScore,
    openAccess: pub.openAccess || false,
  };
}

/**
 * Format Clinical Trial
 */
export function formatTrial(trial) {
  return {
    id: trial.nctId,
    title: trial.title,
    status: trial.status,
    phase: trial.phase,
    sponsor: trial.sponsor,
    condition: trial.condition,
    interventions: trial.interventions,
    recruitmentStatus: trial.recruitmentStatus,
    url: trial.url,
    relevanceScore: trial.relevanceScore,
  };
}

/**
 * Format Source Reference
 */
export function formatSource(source) {
  return {
    type: source.type,
    id: source.id,
    title: source.title,
    authors: source.authors,
    year: source.year,
    source: source.source,
    url: source.url,
    snippet: source.snippet,
    relevanceScore: source.relevanceScore,
  };
}

export default {
  successResponse,
  errorResponse,
  paginatedResponse,
  formatChatMessage,
  formatPublication,
  formatTrial,
  formatSource,
};
