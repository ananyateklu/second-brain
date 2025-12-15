/**
 * Logger Tests
 * Unit tests for conditional logger utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger, logger, loggers } from '../logger';

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    groupCollapsed: ReturnType<typeof vi.spyOn>;
    groupEnd: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      groupCollapsed: vi.spyOn(console, 'groupCollapsed').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Default Logger Instance Tests
  // ============================================
  describe('default logger instance', () => {
    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have group method', () => {
      expect(typeof logger.group).toBe('function');
    });

    it('should have time method', () => {
      expect(typeof logger.time).toBe('function');
    });

    it('should have child method', () => {
      expect(typeof logger.child).toBe('function');
    });
  });

  // ============================================
  // Logger Class Tests
  // ============================================
  describe('Logger class', () => {
    it('should create logger with default options', () => {
      const customLogger = new Logger();
      expect(customLogger).toBeInstanceOf(Logger);
    });

    it('should create logger with custom options', () => {
      const customLogger = new Logger({
        enabled: true,
        minLevel: 'error',
        prefix: '[Custom]',
      });
      expect(customLogger).toBeInstanceOf(Logger);
    });

    it('should merge custom options with defaults', () => {
      const customLogger = new Logger({
        prefix: '[Custom]',
      });
      // Logger uses defaults for unspecified options
      customLogger.error('test');
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  // ============================================
  // Log Level Tests
  // ============================================
  describe('log levels', () => {
    it('should log debug in dev mode', () => {
      const devLogger = new Logger({ enabled: true, minLevel: 'debug' });
      devLogger.debug('Debug message');
      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should log info', () => {
      const infoLogger = new Logger({ enabled: true, minLevel: 'info' });
      infoLogger.info('Info message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should log warn', () => {
      const warnLogger = new Logger({ enabled: true, minLevel: 'warn' });
      warnLogger.warn('Warning message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should log error', () => {
      const errorLogger = new Logger({ enabled: true, minLevel: 'error' });
      errorLogger.error('Error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should respect minimum log level', () => {
      const errorOnlyLogger = new Logger({ enabled: true, minLevel: 'error' });

      errorOnlyLogger.debug('Debug');
      errorOnlyLogger.info('Info');
      errorOnlyLogger.warn('Warn');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();

      errorOnlyLogger.error('Error');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should not log anything when disabled', () => {
      const disabledLogger = new Logger({ enabled: false });

      disabledLogger.debug('Debug');
      disabledLogger.info('Info');
      disabledLogger.warn('Warn');
      disabledLogger.error('Error');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Message Formatting Tests
  // ============================================
  describe('message formatting', () => {
    it('should include prefix in log messages', () => {
      const customLogger = new Logger({ enabled: true, minLevel: 'debug', prefix: '[Test]' });
      customLogger.debug('Message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[Test]'),
        'Message'
      );
    });

    it('should include timestamp in messages', () => {
      const customLogger = new Logger({ enabled: true, minLevel: 'debug' });
      customLogger.debug('Message');

      // Check that first arg contains timestamp pattern (HH:MM:SS.mmm format)
      const firstArg = consoleSpy.log.mock.calls[0][0];
      expect(firstArg).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
    });

    it('should include log level in messages', () => {
      const customLogger = new Logger({ enabled: true, minLevel: 'debug' });
      customLogger.debug('Message');

      const firstArg = consoleSpy.log.mock.calls[0][0];
      expect(firstArg).toContain('[DEBUG]');
    });

    it('should pass through additional arguments', () => {
      const customLogger = new Logger({ enabled: true, minLevel: 'debug' });
      customLogger.debug('Message', { data: 'test' }, 123);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.any(String),
        'Message',
        { data: 'test' },
        123
      );
    });
  });

  // ============================================
  // Group Method Tests
  // ============================================
  describe('group method', () => {
    it('should create collapsed group in dev mode', () => {
      const devLogger = new Logger({ enabled: true, minLevel: 'debug' });
      const fn = vi.fn();

      // Mock import.meta.env.DEV
      vi.stubGlobal('import', { meta: { env: { DEV: true } } });

      devLogger.group('Test Group', fn);

      expect(fn).toHaveBeenCalled();
    });

    it('should execute function without group when logging disabled', () => {
      const prodLogger = new Logger({ enabled: true, minLevel: 'error' });
      const fn = vi.fn();

      prodLogger.group('Test Group', fn);

      expect(fn).toHaveBeenCalled();
      expect(consoleSpy.groupCollapsed).not.toHaveBeenCalled();
    });

    it('should execute function without group when disabled', () => {
      const disabledLogger = new Logger({ enabled: false });
      const fn = vi.fn();

      disabledLogger.group('Test Group', fn);

      expect(fn).toHaveBeenCalled();
    });
  });

  // ============================================
  // Time Method Tests
  // ============================================
  describe('time method', () => {
    it('should time async operations', async () => {
      const debugLogger = new Logger({ enabled: true, minLevel: 'debug' });
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await debugLogger.time('Test Operation', mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
    });

    it('should log completion time', async () => {
      const debugLogger = new Logger({ enabled: true, minLevel: 'debug' });

      await debugLogger.time('Test', () => Promise.resolve('done'));

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringMatching(/Test completed in \d+\.\d+ms/)
      );
    });

    it('should log error and rethrow on failure', async () => {
      const debugLogger = new Logger({ enabled: true, minLevel: 'debug' });
      const error = new Error('Test error');

      await expect(
        debugLogger.time('Failing Op', () => Promise.reject(error))
      ).rejects.toThrow('Test error');

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringMatching(/Failing Op failed after/),
        error
      );
    });

    it('should skip timing when logging disabled', async () => {
      const prodLogger = new Logger({ enabled: true, minLevel: 'error' });
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await prodLogger.time('Test', mockFn);

      expect(result).toBe('result');
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Child Logger Tests
  // ============================================
  describe('child method', () => {
    it('should create child logger with namespace prefix', () => {
      const parentLogger = new Logger({ enabled: true, minLevel: 'debug', prefix: '[Parent]' });
      const childLogger = parentLogger.child('Child');

      childLogger.debug('Message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[Parent]:Child'),
        'Message'
      );
    });

    it('should inherit parent options', () => {
      const parentLogger = new Logger({ enabled: true, minLevel: 'error' });
      const childLogger = parentLogger.child('Child');

      childLogger.debug('Debug');
      childLogger.error('Error');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should allow nested children', () => {
      const parentLogger = new Logger({ enabled: true, minLevel: 'debug', prefix: '[App]' });
      const childLogger = parentLogger.child('Module');
      const grandchildLogger = childLogger.child('Component');

      grandchildLogger.debug('Message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[App]:Module:Component'),
        'Message'
      );
    });
  });

  // ============================================
  // Pre-configured Loggers Tests
  // ============================================
  describe('pre-configured loggers', () => {
    it('should have api logger', () => {
      expect(loggers.api).toBeInstanceOf(Logger);
    });

    it('should have auth logger', () => {
      expect(loggers.auth).toBeInstanceOf(Logger);
    });

    it('should have chat logger', () => {
      expect(loggers.chat).toBeInstanceOf(Logger);
    });

    it('should have notes logger', () => {
      expect(loggers.notes).toBeInstanceOf(Logger);
    });

    it('should have rag logger', () => {
      expect(loggers.rag).toBeInstanceOf(Logger);
    });

    it('should have stream logger', () => {
      expect(loggers.stream).toBeInstanceOf(Logger);
    });

    it('should have worker logger', () => {
      expect(loggers.worker).toBeInstanceOf(Logger);
    });

    it('should have tauri logger', () => {
      expect(loggers.tauri).toBeInstanceOf(Logger);
    });

    it('should have store logger', () => {
      expect(loggers.store).toBeInstanceOf(Logger);
    });

    it('should have correct namespace for api logger', () => {
      const apiLogger = new Logger({ enabled: true, minLevel: 'debug', prefix: '[SecondBrain]:API' });
      apiLogger.debug('Test');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[SecondBrain]:API'),
        'Test'
      );
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should handle empty arguments', () => {
      const debugLogger = new Logger({ enabled: true, minLevel: 'debug' });
      debugLogger.debug();

      expect(consoleSpy.log).toHaveBeenCalled();
    });

    it('should handle null and undefined arguments', () => {
      const debugLogger = new Logger({ enabled: true, minLevel: 'debug' });
      debugLogger.debug(null, undefined, 'message');

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.any(String),
        null,
        undefined,
        'message'
      );
    });

    it('should handle objects in arguments', () => {
      const debugLogger = new Logger({ enabled: true, minLevel: 'debug' });
      const obj = { key: 'value', nested: { a: 1 } };
      debugLogger.debug('Object:', obj);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.any(String),
        'Object:',
        obj
      );
    });

    it('should handle errors in arguments', () => {
      const debugLogger = new Logger({ enabled: true, minLevel: 'debug' });
      const error = new Error('Test');
      debugLogger.error('Error:', error);

      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.any(String),
        'Error:',
        error
      );
    });
  });
});
