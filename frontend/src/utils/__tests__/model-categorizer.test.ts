/**
 * Model Categorizer Tests
 * Unit tests for model categorization utilities
 */

import { describe, it, expect } from 'vitest';
import {
  categorizeModel,
  groupModelsByCategory,
} from '../model-categorizer';

describe('model-categorizer', () => {
  // ============================================
  // categorizeModel Tests
  // ============================================
  describe('categorizeModel', () => {
    // Image Generation Models
    describe('image-gen category', () => {
      it('should categorize DALL-E models as image-gen', () => {
        expect(categorizeModel('dall-e-3')).toBe('image-gen');
        expect(categorizeModel('dall-e-2')).toBe('image-gen');
        expect(categorizeModel('DALL-E-3')).toBe('image-gen');
      });

      it('should categorize Sora as image-gen', () => {
        expect(categorizeModel('sora')).toBe('image-gen');
        expect(categorizeModel('sora-2')).toBe('image-gen');
      });

      it('should categorize Grok image models as image-gen', () => {
        expect(categorizeModel('grok-2-image')).toBe('image-gen');
        expect(categorizeModel('grok-2-vision-image')).toBe('image-gen');
      });

      it('should categorize Gemini image models as image-gen', () => {
        expect(categorizeModel('gemini-2.0-flash-exp-image-generation')).toBe('image-gen');
      });
    });

    // Embedding Models
    describe('embedding category', () => {
      it('should categorize text-embedding models as embedding', () => {
        expect(categorizeModel('text-embedding-3-small')).toBe('embedding');
        expect(categorizeModel('text-embedding-ada-002')).toBe('embedding');
      });

      it('should categorize models with -embedding suffix', () => {
        expect(categorizeModel('nomic-embedding')).toBe('embedding');
        expect(categorizeModel('custom-embedding')).toBe('embedding');
      });
    });

    // Audio Models
    describe('audio category', () => {
      it('should categorize audio models', () => {
        expect(categorizeModel('gpt-4o-audio')).toBe('audio');
        expect(categorizeModel('whisper-1')).toBe('audio');
      });

      it('should categorize TTS models as audio', () => {
        // Pattern checks for '-tts' with hyphen prefix
        expect(categorizeModel('model-tts')).toBe('audio');
        expect(categorizeModel('custom-tts-v1')).toBe('audio');
      });

      it('should categorize transcribe/diarize models as audio', () => {
        expect(categorizeModel('whisper-transcribe')).toBe('audio');
        expect(categorizeModel('speaker-diarize')).toBe('audio');
      });
    });

    // Vision Models
    describe('vision category', () => {
      it('should categorize vision-specific models', () => {
        expect(categorizeModel('gpt-4-vision')).toBe('vision');
        expect(categorizeModel('grok-2-vision')).toBe('vision');
      });

      it('should categorize models with -vision suffix', () => {
        expect(categorizeModel('llama3.2-vision')).toBe('vision');
      });

      it('should categorize Gemini vision models', () => {
        expect(categorizeModel('gemini-1.5-pro-vision')).toBe('vision');
      });
    });

    // Text Models
    describe('text category', () => {
      it('should categorize GPT models as text', () => {
        expect(categorizeModel('gpt-4o')).toBe('text');
        expect(categorizeModel('gpt-4')).toBe('text');
        expect(categorizeModel('gpt-3.5-turbo')).toBe('text');
        expect(categorizeModel('gpt-5')).toBe('text');
      });

      it('should categorize Claude models as text', () => {
        expect(categorizeModel('claude-3-opus')).toBe('text');
        expect(categorizeModel('claude-3-5-sonnet')).toBe('text');
        expect(categorizeModel('claude-sonnet-4')).toBe('text');
      });

      it('should categorize Gemini models as text', () => {
        expect(categorizeModel('gemini-1.5-pro')).toBe('text');
        expect(categorizeModel('gemini-2.0-flash')).toBe('text');
      });

      it('should categorize Grok models as text (without vision/image)', () => {
        expect(categorizeModel('grok-3')).toBe('text');
        expect(categorizeModel('grok-4')).toBe('text');
      });

      it('should categorize O-series models as text', () => {
        expect(categorizeModel('o1')).toBe('text');
        expect(categorizeModel('o1-mini')).toBe('text');
        expect(categorizeModel('o3')).toBe('text');
      });

      it('should categorize Llama models as text', () => {
        expect(categorizeModel('llama3.1:8b')).toBe('text');
        expect(categorizeModel('llama4')).toBe('text');
      });

      it('should categorize ChatGPT models as text', () => {
        expect(categorizeModel('chatgpt-4o-latest')).toBe('text');
      });
    });

    // Other/Unknown Models
    describe('other category', () => {
      it('should categorize unknown models as other', () => {
        expect(categorizeModel('unknown-model')).toBe('other');
        expect(categorizeModel('custom-local-model')).toBe('other');
      });

      it('should return other for empty string', () => {
        expect(categorizeModel('')).toBe('other');
      });
    });
  });

  // ============================================
  // groupModelsByCategory Tests
  // ============================================
  describe('groupModelsByCategory', () => {
    it('should group models by category', () => {
      const models = ['gpt-4o', 'dall-e-3', 'text-embedding-3-small'];
      const groups = groupModelsByCategory(models);

      expect(groups.find(g => g.category === 'text')?.models).toContain('gpt-4o');
      expect(groups.find(g => g.category === 'image-gen')?.models).toContain('dall-e-3');
      expect(groups.find(g => g.category === 'embedding')?.models).toContain('text-embedding-3-small');
    });

    it('should filter out empty categories', () => {
      const models = ['gpt-4o', 'claude-3-opus'];
      const groups = groupModelsByCategory(models);

      // Should only have text category
      expect(groups).toHaveLength(1);
      expect(groups[0].category).toBe('text');
    });

    it('should include display names', () => {
      const models = ['gpt-4o', 'dall-e-3'];
      const groups = groupModelsByCategory(models);

      const textGroup = groups.find(g => g.category === 'text');
      expect(textGroup?.displayName).toBe('Text');

      const imageGroup = groups.find(g => g.category === 'image-gen');
      expect(imageGroup?.displayName).toBe('Image Generation');
    });

    it('should handle empty model list', () => {
      const groups = groupModelsByCategory([]);
      expect(groups).toHaveLength(0);
    });

    it('should handle all categories', () => {
      const models = [
        'gpt-4o',           // text
        'gpt-4-vision',     // vision
        'whisper-1',        // audio
        'text-embedding-3', // embedding
        'dall-e-3',         // image-gen
        'unknown',          // other
      ];
      const groups = groupModelsByCategory(models);

      const categories = groups.map(g => g.category);
      expect(categories).toContain('text');
      expect(categories).toContain('vision');
      expect(categories).toContain('audio');
      expect(categories).toContain('embedding');
      expect(categories).toContain('image-gen');
      expect(categories).toContain('other');
    });

    it('should preserve model order within categories', () => {
      const models = ['gpt-4o', 'gpt-3.5-turbo', 'claude-3-opus'];
      const groups = groupModelsByCategory(models);
      const textGroup = groups.find(g => g.category === 'text');

      expect(textGroup?.models).toEqual(['gpt-4o', 'gpt-3.5-turbo', 'claude-3-opus']);
    });

    it('should handle duplicate models', () => {
      const models = ['gpt-4o', 'gpt-4o', 'gpt-4o'];
      const groups = groupModelsByCategory(models);
      const textGroup = groups.find(g => g.category === 'text');

      expect(textGroup?.models).toHaveLength(3);
    });
  });
});
