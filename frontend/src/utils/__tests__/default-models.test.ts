/**
 * Default Models Tests
 * Unit tests for default model selection utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getDefaultModelForProvider,
  getDefaultModels,
} from '../default-models';

describe('default-models', () => {
  // ============================================
  // getDefaultModelForProvider Tests
  // ============================================
  describe('getDefaultModelForProvider', () => {
    it('should return preferred model if available', () => {
      const models = ['gpt-4o', 'gpt-5.1-2025-11-13', 'gpt-3.5-turbo'];
      expect(getDefaultModelForProvider('openai', models)).toBe('gpt-5.1-2025-11-13');
    });

    it('should handle case-insensitive provider names', () => {
      const models = ['gpt-5.1-2025-11-13', 'gpt-4o'];
      expect(getDefaultModelForProvider('OpenAI', models)).toBe('gpt-5.1-2025-11-13');
      expect(getDefaultModelForProvider('OPENAI', models)).toBe('gpt-5.1-2025-11-13');
    });

    it('should find partial match for preferred model', () => {
      const models = ['gpt-5.1-turbo', 'gpt-4o'];
      // gpt-5.1-2025-11-13 is preferred, but gpt-5.1-turbo contains "gpt-5.1"
      expect(getDefaultModelForProvider('openai', models)).toBe('gpt-5.1-turbo');
    });

    it('should fallback to first model if preferred not found', () => {
      const models = ['gpt-4', 'gpt-3.5-turbo'];
      // Preferred is gpt-5.1-2025-11-13 which is not in list
      expect(getDefaultModelForProvider('openai', models)).toBe('gpt-4');
    });

    it('should return empty string for empty model list', () => {
      expect(getDefaultModelForProvider('openai', [])).toBe('');
    });

    it('should return empty string for empty provider', () => {
      expect(getDefaultModelForProvider('', ['gpt-4o'])).toBe('');
    });

    it('should handle Anthropic provider', () => {
      const models = ['claude-3-opus', 'claude-haiku-4-5-20251001', 'claude-3-sonnet'];
      expect(getDefaultModelForProvider('anthropic', models)).toBe('claude-haiku-4-5-20251001');
    });

    it('should handle Gemini provider', () => {
      const models = ['gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-1.5-flash'];
      expect(getDefaultModelForProvider('gemini', models)).toBe('gemini-2.5-flash');
    });

    it('should handle Ollama provider', () => {
      const models = ['llama3.1:8b', 'qwen3:4b', 'mistral'];
      expect(getDefaultModelForProvider('ollama', models)).toBe('qwen3:4b');
    });

    it('should handle xAI provider', () => {
      const models = ['grok-3', 'grok-3-mini', 'grok-2'];
      expect(getDefaultModelForProvider('xai', models)).toBe('grok-3-mini');
    });

    it('should return first model for unknown provider', () => {
      const models = ['model-a', 'model-b'];
      expect(getDefaultModelForProvider('unknown-provider', models)).toBe('model-a');
    });
  });

  // ============================================
  // getDefaultModels Tests
  // ============================================
  describe('getDefaultModels', () => {
    it('should return all default models', () => {
      const defaults = getDefaultModels();

      expect(defaults.openai).toBeDefined();
      expect(defaults.anthropic).toBeDefined();
      expect(defaults.gemini).toBeDefined();
      expect(defaults.ollama).toBeDefined();
      expect(defaults.xai).toBeDefined();
    });

    it('should return a copy of defaults', () => {
      const defaults1 = getDefaultModels();
      const defaults2 = getDefaultModels();

      // Should be different object instances
      expect(defaults1).not.toBe(defaults2);
    });

    it('should have expected OpenAI default', () => {
      const defaults = getDefaultModels();
      expect(defaults.openai).toBe('gpt-5.1-2025-11-13');
    });

    it('should have expected Anthropic default', () => {
      const defaults = getDefaultModels();
      expect(defaults.anthropic).toBe('claude-haiku-4-5-20251001');
    });

    it('should have expected Gemini default', () => {
      const defaults = getDefaultModels();
      expect(defaults.gemini).toBe('gemini-2.5-flash');
    });

    it('should have expected Ollama default', () => {
      const defaults = getDefaultModels();
      expect(defaults.ollama).toBe('qwen3:4b');
    });

    it('should have expected xAI default', () => {
      const defaults = getDefaultModels();
      expect(defaults.xai).toBe('grok-3-mini');
    });
  });
});
