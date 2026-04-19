/**
 * Validation Utilities
 * Input validation helpers and schemas
 */

import { ValidationError } from './errorHandler.js';

/**
 * Validate required fields
 */
export function validateRequired(data, requiredFields) {
  const missing = requiredFields.filter((field) => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Validate message
 */
export function validateMessage(message) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new ValidationError(
      'Message is required and must be a non-empty string',
    );
  }
  return message.trim();
}

/**
 * Validate session ID
 */
export function validateSessionId(sessionId) {
  if (sessionId && typeof sessionId !== 'string') {
    throw new ValidationError('Session ID must be a string');
  }
  return sessionId;
}

/**
 * Validate chat ID
 */
export function validateChatId(chatId) {
  if (!chatId || typeof chatId !== 'string') {
    throw new ValidationError('Chat ID is required');
  }
  return chatId;
}

/**
 * Validate disease
 */
export function validateDisease(disease) {
  if (disease && typeof disease !== 'string') {
    throw new ValidationError('Disease must be a string');
  }
  return disease;
}

/**
 * Validate location
 */
export function validateLocation(location) {
  if (location && typeof location !== 'string') {
    throw new ValidationError('Location must be a string');
  }
  return location;
}

/**
 * Validate medical context
 */
export function validateMedicalContext(context) {
  if (!context || typeof context !== 'object') {
    return {};
  }

  return {
    disease: validateDisease(context.disease),
    location: validateLocation(context.location),
    patientName: context.patientName ? String(context.patientName) : undefined,
    additionalQuery: context.additionalQuery
      ? String(context.additionalQuery)
      : undefined,
  };
}

/**
 * Validate query object
 */
export function validateQuery(query) {
  validateRequired(query, ['message']);
  return {
    message: validateMessage(query.message),
    sessionId: validateSessionId(query.sessionId),
    chatId: query.chatId ? validateChatId(query.chatId) : null,
    medicalContext: validateMedicalContext(query.medicalContext),
  };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  // Remove potentially harmful characters while preserving content
  return input.replace(
    /[<>\"']/g,
    (char) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      })[char],
  );
}

export default {
  validateRequired,
  validateMessage,
  validateSessionId,
  validateChatId,
  validateDisease,
  validateLocation,
  validateMedicalContext,
  validateQuery,
  sanitizeInput,
};
