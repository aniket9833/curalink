/**
 * Logger Utility
 * Centralized logging for the application
 */

import config from '../config/env.js';

const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

class Logger {
  constructor() {
    this.isDevelopment = config.isDevelopment;
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level}] ${message}`;
    return data ? `${baseMessage} ${JSON.stringify(data)}` : baseMessage;
  }

  debug(message, data) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, data));
    }
  }

  info(message, data) {
    console.log(this.formatMessage(LogLevel.INFO, message, data));
  }

  warn(message, data) {
    console.warn(this.formatMessage(LogLevel.WARN, message, data));
  }

  error(message, data) {
    console.error(this.formatMessage(LogLevel.ERROR, message, data));
  }
}

export default new Logger();
