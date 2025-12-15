/**
 * Model Context Limits Tests
 * Unit tests for model context window limit utilities
 */

import { describe, it, expect } from 'vitest';
import {
  MODEL_CONTEXT_LIMITS,
  getModelContextLimit,
  formatTokenCount,
  getContextWarningLevel,
} from '../model-context-limits';

describe('model-context-limits', () => {
  // ============================================
  // MODEL_CONTEXT_LIMITS Tests
  // ============================================
  describe('MODEL_CONTEXT_LIMITS', () => {
    it('should have default limit', () => {
      expect(MODEL_CONTEXT_LIMITS['default']).toBe(8192);
    });

    it('should have OpenAI model limits', () => {
      expect(MODEL_CONTEXT_LIMITS['gpt-4o']).toBe(128000);
      expect(MODEL_CONTEXT_LIMITS['gpt-4']).toBe(8192);
      expect(MODEL_CONTEXT_LIMITS['gpt-3.5-turbo']).toBe(16385);
    });

    it('should have Claude model limits', () => {
      expect(MODEL_CONTEXT_LIMITS['claude-3-5-sonnet']).toBe(200000);
      expect(MODEL_CONTEXT_LIMITS['claude-3-opus']).toBe(200000);
    });

    it('should have Gemini model limits', () => {
      expect(MODEL_CONTEXT_LIMITS['gemini-1.5-pro']).toBe(2000000);
      expect(MODEL_CONTEXT_LIMITS['gemini-1.5-flash']).toBe(1000000);
    });

    it('should have Grok model limits', () => {
      expect(MODEL_CONTEXT_LIMITS['grok-4']).toBe(256000);
      expect(MODEL_CONTEXT_LIMITS['grok-3']).toBe(131072);
    });

    it('should have Ollama model limits', () => {
      expect(MODEL_CONTEXT_LIMITS['llama3.1']).toBe(128000);
      expect(MODEL_CONTEXT_LIMITS['mistral']).toBe(32768);
    });
  });

  // ============================================
  // getModelContextLimit Tests
  // ============================================
  describe('getModelContextLimit', () => {
    it('should return exact match for known model', () => {
      expect(getModelContextLimit('gpt-4o')).toBe(128000);
      expect(getModelContextLimit('claude-3-5-sonnet')).toBe(200000);
    });

    it('should return default for empty string', () => {
      expect(getModelContextLimit('')).toBe(8192);
    });

    it('should handle case insensitivity', () => {
      expect(getModelContextLimit('GPT-4O')).toBe(128000);
      expect(getModelContextLimit('CLAUDE-3-5-SONNET')).toBe(200000);
    });

    it('should match versioned models by prefix', () => {
      expect(getModelContextLimit('gpt-4o-2024-08-06')).toBe(128000);
      expect(getModelContextLimit('gpt-4o-mini')).toBe(128000);
    });

    it('should match GPT-5 family', () => {
      expect(getModelContextLimit('gpt-5-turbo')).toBe(128000);
      expect(getModelContextLimit('gpt-5.1')).toBe(128000);
    });

    it('should match GPT-4 turbo variants', () => {
      expect(getModelContextLimit('gpt-4-turbo-preview')).toBe(128000);
    });

    it('should match Claude 4 models', () => {
      expect(getModelContextLimit('claude-sonnet-4')).toBe(200000);
      expect(getModelContextLimit('claude-opus-4')).toBe(200000);
    });

    it('should match Claude 3.7 models', () => {
      expect(getModelContextLimit('claude-3-7-sonnet')).toBe(200000);
      expect(getModelContextLimit('claude-3.7-opus')).toBe(200000);
    });

    it('should match Gemini 2 models', () => {
      expect(getModelContextLimit('gemini-2.0-flash')).toBe(1000000);
      expect(getModelContextLimit('gemini-2.5-pro')).toBe(1000000);
    });

    it('should match Gemini 3 models', () => {
      expect(getModelContextLimit('gemini-3-pro')).toBe(1000000);
    });

    it('should match Grok models', () => {
      expect(getModelContextLimit('grok-4-latest')).toBe(256000);
      expect(getModelContextLimit('grok-unknown')).toBe(131072);
    });

    it('should match Llama models', () => {
      expect(getModelContextLimit('llama4-scout')).toBe(10000000);
      expect(getModelContextLimit('llama4')).toBe(256000);
      expect(getModelContextLimit('llama3.1:70b')).toBe(128000);
      expect(getModelContextLimit('llama3-small')).toBe(8192);
    });

    it('should match Mistral/Mixtral models', () => {
      expect(getModelContextLimit('mistral-7b')).toBe(32768);
      expect(getModelContextLimit('mixtral-8x7b')).toBe(32768);
    });

    it('should match Qwen models', () => {
      expect(getModelContextLimit('qwen3-max')).toBe(128000);
      expect(getModelContextLimit('qwen2.5-7b')).toBe(32768);
    });

    it('should match Phi models', () => {
      expect(getModelContextLimit('phi-4-mini')).toBe(128000);
      expect(getModelContextLimit('phi3-medium')).toBe(128000);
    });

    it('should return default for unknown models', () => {
      expect(getModelContextLimit('unknown-model')).toBe(8192);
    });
  });

  // ============================================
  // formatTokenCount Tests
  // ============================================
  describe('formatTokenCount', () => {
    it('should format millions', () => {
      expect(formatTokenCount(1000000)).toBe('1M');
      expect(formatTokenCount(2000000)).toBe('2M');
      expect(formatTokenCount(1500000)).toBe('1.5M');
    });

    it('should format thousands', () => {
      expect(formatTokenCount(1000)).toBe('1K');
      expect(formatTokenCount(128000)).toBe('128K');
      expect(formatTokenCount(8192)).toBe('8.2K');
    });

    it('should format small numbers as-is', () => {
      expect(formatTokenCount(500)).toBe('500');
      expect(formatTokenCount(999)).toBe('999');
    });

    it('should handle edge cases', () => {
      expect(formatTokenCount(0)).toBe('0');
      expect(formatTokenCount(1)).toBe('1');
    });

    it('should format exact thousands without decimal', () => {
      expect(formatTokenCount(32000)).toBe('32K');
      expect(formatTokenCount(16000)).toBe('16K');
    });

    it('should format exact millions without decimal', () => {
      expect(formatTokenCount(10000000)).toBe('10M');
    });
  });

  // ============================================
  // getContextWarningLevel Tests
  // ============================================
  describe('getContextWarningLevel', () => {
    it('should return normal for low usage', () => {
      expect(getContextWarningLevel(1000, 10000)).toBe('normal');
      expect(getContextWarningLevel(5000, 10000)).toBe('normal');
      expect(getContextWarningLevel(5999, 10000)).toBe('normal');
    });

    it('should return warning for moderate usage (60-84%)', () => {
      expect(getContextWarningLevel(6000, 10000)).toBe('warning');
      expect(getContextWarningLevel(7000, 10000)).toBe('warning');
      expect(getContextWarningLevel(8499, 10000)).toBe('warning');
    });

    it('should return critical for high usage (85%+)', () => {
      expect(getContextWarningLevel(8500, 10000)).toBe('critical');
      expect(getContextWarningLevel(9000, 10000)).toBe('critical');
      expect(getContextWarningLevel(10000, 10000)).toBe('critical');
    });

    it('should handle boundary cases', () => {
      // Exactly 60%
      expect(getContextWarningLevel(60, 100)).toBe('warning');
      // Exactly 85%
      expect(getContextWarningLevel(85, 100)).toBe('critical');
    });

    it('should handle large token counts', () => {
      expect(getContextWarningLevel(50000, 128000)).toBe('normal'); // ~39%
      expect(getContextWarningLevel(80000, 128000)).toBe('warning'); // ~62%
      expect(getContextWarningLevel(110000, 128000)).toBe('critical'); // ~86%
    });
  });
});
