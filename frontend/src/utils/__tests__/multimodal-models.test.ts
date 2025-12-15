/**
 * Multimodal Models Tests
 * Unit tests for multimodal model configuration utilities
 */

import { describe, it, expect } from 'vitest';
import {
  MULTIMODAL_CONFIGS,
  isMultimodalModel,
  getMultimodalConfig,
  validateImageForProvider,
  parseDataUrl,
  getFileCategory,
  isImageFile,
  getAllSupportedMimeTypes,
  getAllSupportedExtensions,
  validateFileForAttachment,
  formatFileSize,
} from '../multimodal-models';

describe('multimodal-models', () => {
  // ============================================
  // MULTIMODAL_CONFIGS Tests
  // ============================================
  describe('MULTIMODAL_CONFIGS', () => {
    it('should have OpenAI config', () => {
      expect(MULTIMODAL_CONFIGS.OpenAI).toBeDefined();
      expect(MULTIMODAL_CONFIGS.OpenAI.provider).toBe('OpenAI');
      expect(MULTIMODAL_CONFIGS.OpenAI.maxImages).toBeGreaterThan(0);
    });

    it('should have Claude config', () => {
      expect(MULTIMODAL_CONFIGS.Claude).toBeDefined();
      expect(MULTIMODAL_CONFIGS.Claude.provider).toBe('Claude');
    });

    it('should have Gemini config', () => {
      expect(MULTIMODAL_CONFIGS.Gemini).toBeDefined();
      expect(MULTIMODAL_CONFIGS.Gemini.provider).toBe('Gemini');
    });

    it('should have Ollama config', () => {
      expect(MULTIMODAL_CONFIGS.Ollama).toBeDefined();
      expect(MULTIMODAL_CONFIGS.Ollama.provider).toBe('Ollama');
    });

    it('should have Grok config', () => {
      expect(MULTIMODAL_CONFIGS.Grok).toBeDefined();
      expect(MULTIMODAL_CONFIGS.Grok.provider).toBe('Grok');
    });

    it('should have vision models arrays', () => {
      expect(Array.isArray(MULTIMODAL_CONFIGS.OpenAI.visionModels)).toBe(true);
      expect(MULTIMODAL_CONFIGS.OpenAI.visionModels.length).toBeGreaterThan(0);
    });

    it('should have supported formats', () => {
      expect(MULTIMODAL_CONFIGS.OpenAI.supportedFormats).toContain('image/jpeg');
      expect(MULTIMODAL_CONFIGS.OpenAI.supportedFormats).toContain('image/png');
    });
  });

  // ============================================
  // isMultimodalModel Tests
  // ============================================
  describe('isMultimodalModel', () => {
    it('should return true for OpenAI vision models', () => {
      expect(isMultimodalModel('OpenAI', 'gpt-4o')).toBe(true);
      expect(isMultimodalModel('OpenAI', 'gpt-4o-mini')).toBe(true);
      expect(isMultimodalModel('OpenAI', 'gpt-4-turbo')).toBe(true);
      expect(isMultimodalModel('OpenAI', 'gpt-5')).toBe(true);
      expect(isMultimodalModel('OpenAI', 'o1')).toBe(true);
      expect(isMultimodalModel('OpenAI', 'o3-mini')).toBe(true);
    });

    it('should return true for Claude vision models', () => {
      expect(isMultimodalModel('Claude', 'claude-3-opus')).toBe(true);
      expect(isMultimodalModel('Claude', 'claude-3-5-sonnet')).toBe(true);
      expect(isMultimodalModel('Claude', 'claude-4')).toBe(true);
      expect(isMultimodalModel('Claude', 'claude-sonnet-4')).toBe(true);
    });

    it('should return true for Gemini vision models', () => {
      expect(isMultimodalModel('Gemini', 'gemini-1.5-pro')).toBe(true);
      expect(isMultimodalModel('Gemini', 'gemini-2.0-flash')).toBe(true);
      expect(isMultimodalModel('Gemini', 'gemini-pro-vision')).toBe(true);
    });

    it('should return true for Ollama vision models', () => {
      expect(isMultimodalModel('Ollama', 'llava')).toBe(true);
      expect(isMultimodalModel('Ollama', 'llava-llama3')).toBe(true);
      expect(isMultimodalModel('Ollama', 'llama3.2-vision')).toBe(true);
    });

    it('should return true for Grok vision models', () => {
      expect(isMultimodalModel('Grok', 'grok-2-vision')).toBe(true);
      expect(isMultimodalModel('Grok', 'grok-vision-beta')).toBe(true);
    });

    it('should return false for non-vision models', () => {
      expect(isMultimodalModel('Ollama', 'llama3.1:8b')).toBe(false);
      expect(isMultimodalModel('Grok', 'grok-3')).toBe(false);
    });

    it('should return false for unknown provider', () => {
      expect(isMultimodalModel('Unknown', 'gpt-4o')).toBe(false);
    });

    it('should handle case insensitivity in model names', () => {
      expect(isMultimodalModel('OpenAI', 'GPT-4O')).toBe(true);
      expect(isMultimodalModel('Claude', 'CLAUDE-3-OPUS')).toBe(true);
    });
  });

  // ============================================
  // getMultimodalConfig Tests
  // ============================================
  describe('getMultimodalConfig', () => {
    it('should return config for valid provider', () => {
      const config = getMultimodalConfig('OpenAI');
      expect(config).not.toBeNull();
      expect(config?.provider).toBe('OpenAI');
    });

    it('should return null for unknown provider', () => {
      expect(getMultimodalConfig('Unknown')).toBeNull();
    });
  });

  // ============================================
  // validateImageForProvider Tests
  // ============================================
  describe('validateImageForProvider', () => {
    it('should validate supported image format', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

      const result = validateImageForProvider(file, 'OpenAI');
      expect(result.valid).toBe(true);
    });

    it('should reject unsupported format', () => {
      const file = new File([''], 'test.bmp', { type: 'image/bmp' });
      Object.defineProperty(file, 'size', { value: 1024 });

      const result = validateImageForProvider(file, 'OpenAI');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported image format');
    });

    it('should reject file too large', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 30 * 1024 * 1024 }); // 30MB

      const result = validateImageForProvider(file, 'OpenAI');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('should reject unknown provider', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });

      const result = validateImageForProvider(file, 'Unknown');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('does not support images');
    });
  });

  // ============================================
  // parseDataUrl Tests
  // ============================================
  describe('parseDataUrl', () => {
    it('should parse valid data URL', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
      const result = parseDataUrl(dataUrl);

      expect(result).not.toBeNull();
      expect(result?.mediaType).toBe('image/png');
      expect(result?.base64Data).toBe('iVBORw0KGgo=');
    });

    it('should return null for invalid data URL', () => {
      expect(parseDataUrl('invalid')).toBeNull();
      expect(parseDataUrl('data:image/png')).toBeNull();
      expect(parseDataUrl('')).toBeNull();
    });
  });

  // ============================================
  // getFileCategory Tests
  // ============================================
  describe('getFileCategory', () => {
    it('should categorize image files', () => {
      expect(getFileCategory('image/jpeg')).toBe('image');
      expect(getFileCategory('image/png')).toBe('image');
      expect(getFileCategory('image/gif')).toBe('image');
    });

    it('should categorize PDF files', () => {
      expect(getFileCategory('application/pdf')).toBe('pdf');
    });

    it('should categorize document files', () => {
      expect(getFileCategory('application/msword')).toBe('document');
      expect(getFileCategory('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document');
    });

    it('should categorize text files', () => {
      expect(getFileCategory('text/plain')).toBe('text');
      expect(getFileCategory('text/markdown')).toBe('text');
      expect(getFileCategory('application/json')).toBe('text');
    });

    it('should return other for unknown types', () => {
      expect(getFileCategory('application/octet-stream')).toBe('other');
      expect(getFileCategory('unknown/type')).toBe('other');
    });
  });

  // ============================================
  // isImageFile Tests
  // ============================================
  describe('isImageFile', () => {
    it('should return true for image mime types', () => {
      expect(isImageFile('image/jpeg')).toBe(true);
      expect(isImageFile('image/png')).toBe(true);
      expect(isImageFile('image/gif')).toBe(true);
      expect(isImageFile('image/webp')).toBe(true);
    });

    it('should return false for non-image types', () => {
      expect(isImageFile('application/pdf')).toBe(false);
      expect(isImageFile('text/plain')).toBe(false);
    });
  });

  // ============================================
  // getAllSupportedMimeTypes Tests
  // ============================================
  describe('getAllSupportedMimeTypes', () => {
    it('should return array of mime types', () => {
      const types = getAllSupportedMimeTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include common types', () => {
      const types = getAllSupportedMimeTypes();
      expect(types).toContain('image/jpeg');
      expect(types).toContain('application/pdf');
      expect(types).toContain('text/plain');
    });
  });

  // ============================================
  // getAllSupportedExtensions Tests
  // ============================================
  describe('getAllSupportedExtensions', () => {
    it('should return array of extensions', () => {
      const exts = getAllSupportedExtensions();
      expect(Array.isArray(exts)).toBe(true);
      expect(exts.length).toBeGreaterThan(0);
    });

    it('should include common extensions', () => {
      const exts = getAllSupportedExtensions();
      expect(exts).toContain('.jpg');
      expect(exts).toContain('.pdf');
      expect(exts).toContain('.txt');
    });
  });

  // ============================================
  // validateFileForAttachment Tests
  // ============================================
  describe('validateFileForAttachment', () => {
    it('should validate supported file', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });

      const result = validateFileForAttachment(file);
      expect(result.valid).toBe(true);
    });

    it('should reject unsupported file type', () => {
      const file = new File([''], 'test.exe', { type: 'application/octet-stream' });

      const result = validateFileForAttachment(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should reject file exceeding size limit', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 30 * 1024 * 1024 }); // 30MB

      const result = validateFileForAttachment(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });
  });

  // ============================================
  // formatFileSize Tests
  // ============================================
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });
  });
});
