/**
 * Image Generation Models Tests
 * Unit tests for image generation model configuration utilities
 */

import { describe, it, expect } from 'vitest';
import {
  IMAGE_GENERATION_CONFIGS,
  QUALITY_OPTIONS,
  STYLE_OPTIONS,
  getImageGenerationConfig,
  getImageModelInfo,
  isImageGenerationProvider,
  isImageGenerationModel,
  getImageGenerationProviders,
  getDefaultImageModel,
  getModelSizes,
  formatSizeLabel,
  getImageDataUrl,
} from '../image-generation-models';

describe('image-generation-models', () => {
  // ============================================
  // IMAGE_GENERATION_CONFIGS Tests
  // ============================================
  describe('IMAGE_GENERATION_CONFIGS', () => {
    it('should have OpenAI config', () => {
      expect(IMAGE_GENERATION_CONFIGS.OpenAI).toBeDefined();
      expect(IMAGE_GENERATION_CONFIGS.OpenAI.provider).toBe('OpenAI');
      expect(IMAGE_GENERATION_CONFIGS.OpenAI.defaultModel).toBe('dall-e-3');
    });

    it('should have Gemini config', () => {
      expect(IMAGE_GENERATION_CONFIGS.Gemini).toBeDefined();
      expect(IMAGE_GENERATION_CONFIGS.Gemini.provider).toBe('Gemini');
    });

    it('should have Grok config', () => {
      expect(IMAGE_GENERATION_CONFIGS.Grok).toBeDefined();
      expect(IMAGE_GENERATION_CONFIGS.Grok.provider).toBe('Grok');
    });

    it('should have models for each provider', () => {
      expect(IMAGE_GENERATION_CONFIGS.OpenAI.models.length).toBeGreaterThan(0);
      expect(IMAGE_GENERATION_CONFIGS.Gemini.models.length).toBeGreaterThan(0);
      expect(IMAGE_GENERATION_CONFIGS.Grok.models.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // QUALITY_OPTIONS and STYLE_OPTIONS Tests
  // ============================================
  describe('options', () => {
    it('should have quality options', () => {
      expect(QUALITY_OPTIONS).toContainEqual({ value: 'standard', label: 'Standard' });
      expect(QUALITY_OPTIONS).toContainEqual({ value: 'hd', label: 'HD' });
    });

    it('should have style options', () => {
      expect(STYLE_OPTIONS).toContainEqual({ value: 'vivid', label: 'Vivid' });
      expect(STYLE_OPTIONS).toContainEqual({ value: 'natural', label: 'Natural' });
    });
  });

  // ============================================
  // getImageGenerationConfig Tests
  // ============================================
  describe('getImageGenerationConfig', () => {
    it('should return config for valid provider', () => {
      const config = getImageGenerationConfig('OpenAI');
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('OpenAI');
    });

    it('should return null for invalid provider', () => {
      expect(getImageGenerationConfig('InvalidProvider')).toBeNull();
    });

    it('should return null for non-image provider', () => {
      expect(getImageGenerationConfig('Claude')).toBeNull();
    });
  });

  // ============================================
  // getImageModelInfo Tests
  // ============================================
  describe('getImageModelInfo', () => {
    it('should return model info for valid model', () => {
      const info = getImageModelInfo('OpenAI', 'dall-e-3');
      expect(info).not.toBeNull();
      expect(info?.id).toBe('dall-e-3');
      expect(info?.name).toBe('DALL-E 3');
    });

    it('should return null for invalid model', () => {
      expect(getImageModelInfo('OpenAI', 'invalid-model')).toBeNull();
    });

    it('should return null for invalid provider', () => {
      expect(getImageModelInfo('InvalidProvider', 'dall-e-3')).toBeNull();
    });

    it('should include model properties', () => {
      const info = getImageModelInfo('OpenAI', 'dall-e-3');
      expect(info?.sizes).toBeDefined();
      expect(info?.defaultSize).toBeDefined();
      expect(info?.supportsQuality).toBe(true);
      expect(info?.supportsStyle).toBe(true);
      expect(info?.maxCount).toBe(1);
    });

    it('should return DALL-E 2 info', () => {
      const info = getImageModelInfo('OpenAI', 'dall-e-2');
      expect(info?.supportsQuality).toBe(false);
      expect(info?.supportsStyle).toBe(false);
      expect(info?.maxCount).toBe(10);
    });
  });

  // ============================================
  // isImageGenerationProvider Tests
  // ============================================
  describe('isImageGenerationProvider', () => {
    it('should return true for image generation providers', () => {
      expect(isImageGenerationProvider('OpenAI')).toBe(true);
      expect(isImageGenerationProvider('Gemini')).toBe(true);
      expect(isImageGenerationProvider('Grok')).toBe(true);
    });

    it('should return false for non-image providers', () => {
      expect(isImageGenerationProvider('Claude')).toBe(false);
      expect(isImageGenerationProvider('Anthropic')).toBe(false);
      expect(isImageGenerationProvider('Ollama')).toBe(false);
    });
  });

  // ============================================
  // isImageGenerationModel Tests
  // ============================================
  describe('isImageGenerationModel', () => {
    it('should return true for valid image models', () => {
      expect(isImageGenerationModel('OpenAI', 'dall-e-3')).toBe(true);
      expect(isImageGenerationModel('OpenAI', 'dall-e-2')).toBe(true);
      expect(isImageGenerationModel('Grok', 'grok-2-image')).toBe(true);
    });

    it('should return false for non-image models', () => {
      expect(isImageGenerationModel('OpenAI', 'gpt-4o')).toBe(false);
      expect(isImageGenerationModel('Grok', 'grok-3')).toBe(false);
    });

    it('should return false for invalid provider', () => {
      expect(isImageGenerationModel('Invalid', 'dall-e-3')).toBe(false);
    });
  });

  // ============================================
  // getImageGenerationProviders Tests
  // ============================================
  describe('getImageGenerationProviders', () => {
    it('should return array of providers', () => {
      const providers = getImageGenerationProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('should include expected providers', () => {
      const providers = getImageGenerationProviders();
      expect(providers).toContain('OpenAI');
      expect(providers).toContain('Gemini');
      expect(providers).toContain('Grok');
    });
  });

  // ============================================
  // getDefaultImageModel Tests
  // ============================================
  describe('getDefaultImageModel', () => {
    it('should return default model for provider', () => {
      expect(getDefaultImageModel('OpenAI')).toBe('dall-e-3');
      expect(getDefaultImageModel('Grok')).toBe('grok-2-image');
    });

    it('should return null for invalid provider', () => {
      expect(getDefaultImageModel('InvalidProvider')).toBeNull();
    });
  });

  // ============================================
  // getModelSizes Tests
  // ============================================
  describe('getModelSizes', () => {
    it('should return sizes for valid model', () => {
      const sizes = getModelSizes('OpenAI', 'dall-e-3');
      expect(sizes).toContain('1024x1024');
      expect(sizes).toContain('1792x1024');
    });

    it('should return default size for invalid model', () => {
      const sizes = getModelSizes('OpenAI', 'invalid');
      expect(sizes).toEqual(['1024x1024']);
    });

    it('should return DALL-E 2 sizes', () => {
      const sizes = getModelSizes('OpenAI', 'dall-e-2');
      expect(sizes).toContain('256x256');
      expect(sizes).toContain('512x512');
    });
  });

  // ============================================
  // formatSizeLabel Tests
  // ============================================
  describe('formatSizeLabel', () => {
    it('should format square size', () => {
      expect(formatSizeLabel('1024x1024')).toBe('1024×1024 (Square)');
      expect(formatSizeLabel('512x512')).toBe('512×512 (Square)');
    });

    it('should format landscape size', () => {
      expect(formatSizeLabel('1792x1024')).toBe('1792×1024 (Landscape)');
      expect(formatSizeLabel('1536x1024')).toBe('1536×1024 (Landscape)');
    });

    it('should format portrait size', () => {
      expect(formatSizeLabel('1024x1792')).toBe('1024×1792 (Portrait)');
      expect(formatSizeLabel('768x1024')).toBe('768×1024 (Portrait)');
    });
  });

  // ============================================
  // getImageDataUrl Tests
  // ============================================
  describe('getImageDataUrl', () => {
    it('should create data URL with default media type', () => {
      const base64 = 'iVBORw0KGgo=';
      const dataUrl = getImageDataUrl(base64);
      expect(dataUrl).toBe('data:image/png;base64,iVBORw0KGgo=');
    });

    it('should create data URL with custom media type', () => {
      const base64 = '/9j/4AAQ';
      const dataUrl = getImageDataUrl(base64, 'image/jpeg');
      expect(dataUrl).toBe('data:image/jpeg;base64,/9j/4AAQ');
    });
  });
});
