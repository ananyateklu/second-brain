/**
 * Conditional logger utility
 *
 * Replaces direct console.log usage with environment-aware logging.
 * Debug logs are stripped in production builds.
 *
 * @example
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * logger.debug('Processing data', { count: items.length });
 * logger.info('User logged in', { userId });
 * logger.warn('Rate limit approaching');
 * logger.error('Failed to fetch', error);
 * ```
 */

 

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /** Enable/disable all logging */
  enabled: boolean;
  /** Minimum log level to output */
  minLevel: LogLevel;
  /** Prefix for all log messages */
  prefix: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_OPTIONS: LoggerOptions = {
  enabled: true,
  minLevel: import.meta.env.DEV ? 'debug' : 'warn',
  prefix: '[SecondBrain]',
};

class Logger {
  private options: LoggerOptions;

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.options.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.minLevel];
  }

  private formatArgs(level: LogLevel, args: unknown[]): unknown[] {
    const timestamp = new Date().toISOString().split('T')[1]?.slice(0, 12) ?? '';
    const prefix = `${this.options.prefix} [${timestamp}] [${level.toUpperCase()}]`;
    return [prefix, ...args];
  }

  /**
   * Debug level logging - only in development
   * Use for detailed debugging information
   */
  debug = (...args: unknown[]): void => {
    if (this.shouldLog('debug')) {
      console.log(...this.formatArgs('debug', args));
    }
  };

  /**
   * Info level logging
   * Use for general information about app flow
   */
  info = (...args: unknown[]): void => {
    if (this.shouldLog('info')) {
      console.info(...this.formatArgs('info', args));
    }
  };

  /**
   * Warning level logging
   * Use for potentially problematic situations
   */
  warn = (...args: unknown[]): void => {
    if (this.shouldLog('warn')) {
      console.warn(...this.formatArgs('warn', args));
    }
  };

  /**
   * Error level logging - always logged
   * Use for errors and exceptions
   */
  error = (...args: unknown[]): void => {
    if (this.shouldLog('error')) {
      console.error(...this.formatArgs('error', args));
    }
  };

  /**
   * Group logs together (collapsed by default in dev)
   */
  group = (label: string, fn: () => void): void => {
    if (!this.shouldLog('debug')) {
      fn();
      return;
    }

    if (import.meta.env.DEV) {
      console.groupCollapsed(`${this.options.prefix} ${label}`);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  };

  /**
   * Time an operation
   */
  time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (!this.shouldLog('debug')) {
      return fn();
    }

    const start = performance.now();
    try {
      const result = await fn();
      const duration = (performance.now() - start).toFixed(2);
      this.debug(`${label} completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = (performance.now() - start).toFixed(2);
      this.error(`${label} failed after ${duration}ms`, error);
      throw error;
    }
  };

  /**
   * Create a child logger with a custom prefix
   */
  child = (namespace: string): Logger => {
    return new Logger({
      ...this.options,
      prefix: `${this.options.prefix}:${namespace}`,
    });
  };
}

// Default logger instance
export const logger = new Logger();

// Pre-configured child loggers for common domains
export const loggers = {
  api: logger.child('API'),
  auth: logger.child('Auth'),
  chat: logger.child('Chat'),
  notes: logger.child('Notes'),
  rag: logger.child('RAG'),
  stream: logger.child('Stream'),
  worker: logger.child('Worker'),
  tauri: logger.child('Tauri'),
  store: logger.child('Store'),
} as const;

// Export Logger class for custom instances
export { Logger };
export type { LoggerOptions, LogLevel };
