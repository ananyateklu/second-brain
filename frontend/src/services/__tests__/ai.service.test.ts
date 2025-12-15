/**
 * AI Service Tests
 * Unit tests for AI service methods and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { aiService } from '../ai.service';
import { apiClient } from '../../lib/api-client';
import { API_ENDPOINTS } from '../../lib/constants';
import type { AIHealthResponse, AIProviderHealth } from '../../types/ai';

// Mock the apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the bound store for auth token
vi.mock('../../store/bound-store', () => ({
  useBoundStore: {
    getState: () => ({
      token: 'test-token',
    }),
  },
}));

// Helper to create mock provider health
const createMockProviderHealth = (overrides: Partial<AIProviderHealth> = {}): AIProviderHealth => ({
  provider: 'OpenAI',
  isHealthy: true,
  checkedAt: new Date().toISOString(),
  status: 'healthy',
  responseTimeMs: 200,
  availableModels: ['gpt-4', 'gpt-3.5-turbo'],
  ...overrides,
});

// Helper to create mock health response
const createMockHealthResponse = (overrides: Partial<AIHealthResponse> = {}): AIHealthResponse => ({
  checkedAt: new Date().toISOString(),
  providers: [
    createMockProviderHealth({ provider: 'OpenAI', isHealthy: true }),
    createMockProviderHealth({ provider: 'Anthropic', isHealthy: true }),
    createMockProviderHealth({ provider: 'Ollama', isHealthy: false }),
  ],
  ...overrides,
});

// Mock fetch for pullModel tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Health Check Tests
  // ============================================
  describe('getHealth', () => {
    it('should GET health status', async () => {
      const mockHealth = createMockHealthResponse();
      vi.mocked(apiClient.get).mockResolvedValue(mockHealth);

      const result = await aiService.getHealth();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.AI.HEALTH);
      expect(result.providers).toHaveLength(3);
    });

    it('should include Ollama options when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(createMockHealthResponse());

      await aiService.getHealth({
        useRemoteOllama: true,
        ollamaBaseUrl: 'http://remote:11434',
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('ollamaBaseUrl=')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('useRemoteOllama=true')
      );
    });

    it('should not include params when useRemoteOllama is false', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(createMockHealthResponse());

      await aiService.getHealth({ useRemoteOllama: false });

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.AI.HEALTH);
    });
  });

  describe('getProviderHealth', () => {
    it('should GET specific provider health', async () => {
      const mockHealth = createMockProviderHealth({ provider: 'OpenAI' });
      vi.mocked(apiClient.get).mockResolvedValue(mockHealth);

      const result = await aiService.getProviderHealth('OpenAI');

      expect(apiClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.AI.HEALTH_PROVIDER('OpenAI')
      );
      expect(result.provider).toBe('OpenAI');
    });

    it('should include Ollama options for Ollama provider', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(createMockProviderHealth({ provider: 'Ollama' }));

      await aiService.getProviderHealth('Ollama', {
        useRemoteOllama: true,
        ollamaBaseUrl: 'http://remote:11434',
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('ollamaBaseUrl=')
      );
    });
  });

  describe('deleteModel', () => {
    it('should DELETE Ollama model', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ message: 'Model deleted' });

      const result = await aiService.deleteModel('llama2');

      expect(apiClient.delete).toHaveBeenCalledWith(
        API_ENDPOINTS.AI.OLLAMA_DELETE('llama2')
      );
      expect(result.message).toBe('Model deleted');
    });

    it('should include ollamaBaseUrl when provided', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({ message: 'Deleted' });

      await aiService.deleteModel('llama2', 'http://remote:11434');

      expect(apiClient.delete).toHaveBeenCalledWith(
        expect.stringContaining('ollamaBaseUrl=')
      );
    });
  });

  // ============================================
  // Utility Functions Tests
  // ============================================
  describe('getHealthyProviders', () => {
    it('should return only healthy providers', () => {
      const health = createMockHealthResponse();

      const result = aiService.getHealthyProviders(health);

      expect(result).toHaveLength(2);
      expect(result.every(p => p.isHealthy)).toBe(true);
    });

    it('should return empty array when no healthy providers', () => {
      const health = createMockHealthResponse({
        providers: [
          createMockProviderHealth({ isHealthy: false }),
          createMockProviderHealth({ isHealthy: false }),
        ],
      });

      const result = aiService.getHealthyProviders(health);

      expect(result).toHaveLength(0);
    });
  });

  describe('getUnhealthyProviders', () => {
    it('should return only unhealthy providers', () => {
      const health = createMockHealthResponse();

      const result = aiService.getUnhealthyProviders(health);

      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe('Ollama');
    });
  });

  describe('hasHealthyProvider', () => {
    it('should return true when at least one provider is healthy', () => {
      const health = createMockHealthResponse();

      expect(aiService.hasHealthyProvider(health)).toBe(true);
    });

    it('should return false when no provider is healthy', () => {
      const health = createMockHealthResponse({
        providers: [createMockProviderHealth({ isHealthy: false })],
      });

      expect(aiService.hasHealthyProvider(health)).toBe(false);
    });
  });

  describe('getProviderModels', () => {
    it('should return models for existing provider', () => {
      const health = createMockHealthResponse();

      const result = aiService.getProviderModels(health, 'OpenAI');

      expect(result).toEqual(['gpt-4', 'gpt-3.5-turbo']);
    });

    it('should return empty array for non-existent provider', () => {
      const health = createMockHealthResponse();

      const result = aiService.getProviderModels(health, 'NonExistent');

      expect(result).toEqual([]);
    });

    it('should be case-insensitive', () => {
      const health = createMockHealthResponse();

      const result = aiService.getProviderModels(health, 'openai');

      expect(result).toEqual(['gpt-4', 'gpt-3.5-turbo']);
    });
  });

  describe('formatResponseTime', () => {
    it('should format milliseconds for < 1000ms', () => {
      expect(aiService.formatResponseTime(500)).toBe('500ms');
    });

    it('should format seconds for >= 1000ms', () => {
      expect(aiService.formatResponseTime(1500)).toBe('1.50s');
    });

    it('should handle exact 1000ms', () => {
      expect(aiService.formatResponseTime(1000)).toBe('1.00s');
    });
  });

  describe('getProviderStatusColor', () => {
    it('should return green for healthy and fast', () => {
      const provider = createMockProviderHealth({ isHealthy: true, responseTimeMs: 200 });

      expect(aiService.getProviderStatusColor(provider)).toBe('green');
    });

    it('should return yellow for healthy but slow', () => {
      const provider = createMockProviderHealth({ isHealthy: true, responseTimeMs: 600 });

      expect(aiService.getProviderStatusColor(provider)).toBe('yellow');
    });

    it('should return red for unhealthy', () => {
      const provider = createMockProviderHealth({ isHealthy: false });

      expect(aiService.getProviderStatusColor(provider)).toBe('red');
    });
  });

  describe('formatBytes', () => {
    it('should return "0 B" for 0 bytes', () => {
      expect(aiService.formatBytes(0)).toBe('0 B');
    });

    it('should format bytes', () => {
      expect(aiService.formatBytes(500)).toBe('500 B');
    });

    it('should format kilobytes', () => {
      expect(aiService.formatBytes(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(aiService.formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(aiService.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format with decimals', () => {
      expect(aiService.formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('formatSpeed', () => {
    it('should format bytes per second', () => {
      expect(aiService.formatSpeed(1024)).toBe('1 KB/s');
    });

    it('should format megabytes per second', () => {
      expect(aiService.formatSpeed(1024 * 1024 * 5)).toBe('5 MB/s');
    });
  });

  describe('formatETA', () => {
    it('should format seconds', () => {
      expect(aiService.formatETA(45)).toBe('45s');
    });

    it('should format minutes', () => {
      expect(aiService.formatETA(120)).toBe('2m');
    });

    it('should format hours and minutes', () => {
      expect(aiService.formatETA(3660)).toBe('1h 1m');
    });

    it('should round properly', () => {
      expect(aiService.formatETA(90)).toBe('2m');
    });
  });

  // ============================================
  // Pull Model Tests
  // ============================================
  describe('pullModel', () => {
    it('should return an AbortController', () => {
      // Mock fetch to return a valid response
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          body: null,
          clone: () => ({
            ok: true,
            body: null,
            text: () => Promise.resolve(''),
          }),
        })
      );

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      const controller = aiService.pullModel({ modelName: 'llama2' }, callbacks);

      expect(controller).toBeInstanceOf(AbortController);
    });

    it('should call onError when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Model not found'),
        clone: vi.fn(),
      };
      mockResponse.clone.mockReturnValue(mockResponse);
      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      aiService.pullModel({ modelName: 'invalid-model' }, callbacks);

      // Wait for async callback
      await vi.waitFor(() => {
        expect(callbacks.onError).toHaveBeenCalledWith('Model not found');
      });
    });

    it('should call onError with HTTP status when text is empty', async () => {
      const mockResponse = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: () => Promise.resolve(''),
        clone: vi.fn(),
      };
      mockResponse.clone.mockReturnValue(mockResponse);
      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      aiService.pullModel({ modelName: 'llama2' }, callbacks);

      await vi.waitFor(() => {
        expect(callbacks.onError).toHaveBeenCalledWith('HTTP 503: Service Unavailable');
      });
    });

    it('should call onError when response body is null', async () => {
      const mockResponse = {
        ok: true,
        body: null,
        clone: vi.fn(),
      };
      mockResponse.clone.mockReturnValue(mockResponse);
      mockFetch.mockImplementation(() => Promise.resolve(mockResponse));

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      aiService.pullModel({ modelName: 'llama2' }, callbacks);

      await vi.waitFor(() => {
        expect(callbacks.onError).toHaveBeenCalledWith('No response stream available');
      });
    });

    it('should call onError with "Download cancelled" when aborted', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      mockFetch.mockImplementation(() => Promise.reject(abortError));

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      aiService.pullModel({ modelName: 'llama2' }, callbacks);

      await vi.waitFor(() => {
        expect(callbacks.onError).toHaveBeenCalledWith('Download cancelled');
      });
    });

    it('should call onError with error message for other errors', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('Network error')));

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      aiService.pullModel({ modelName: 'llama2' }, callbacks);

      await vi.waitFor(() => {
        expect(callbacks.onError).toHaveBeenCalledWith('Network error');
      });
    });

    it('should call onError with default message when error has no message', async () => {
      mockFetch.mockImplementation(() => Promise.reject(new Error('')));

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      aiService.pullModel({ modelName: 'llama2' }, callbacks);

      await vi.waitFor(() => {
        expect(callbacks.onError).toHaveBeenCalledWith('Failed to pull model');
      });
    });
  });

  // ============================================
  // Process Ollama Pull Stream Tests
  // ============================================
  describe('processOllamaPullStream', () => {
    it('should call onProgress for each SSE event', async () => {
      const mockData = [
        'data: {"status":"downloading","completed":50,"total":100}\n',
        'data: {"status":"downloading","completed":100,"total":100}\n',
      ];

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockData[0]) })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockData[1]) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await aiService.processOllamaPullStream(
        mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>,
        'llama2',
        callbacks
      );

      expect(callbacks.onProgress).toHaveBeenCalledTimes(2);
      expect(callbacks.onProgress).toHaveBeenCalledWith(expect.objectContaining({
        status: 'downloading',
      }));
    });

    it('should call onComplete when isComplete is true', async () => {
      const mockData = 'data: {"status":"success","isComplete":true}\n';

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await aiService.processOllamaPullStream(
        mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>,
        'llama2',
        callbacks
      );

      expect(callbacks.onComplete).toHaveBeenCalledWith('llama2');
    });

    it('should call onError when isError is true', async () => {
      const mockData = 'data: {"status":"error","isError":true,"errorMessage":"Model not found"}\n';

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await aiService.processOllamaPullStream(
        mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>,
        'llama2',
        callbacks
      );

      expect(callbacks.onError).toHaveBeenCalledWith('Model not found');
    });

    it('should call onError with default message when errorMessage is empty', async () => {
      const mockData = 'data: {"status":"error","isError":true}\n';

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await aiService.processOllamaPullStream(
        mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>,
        'llama2',
        callbacks
      );

      expect(callbacks.onError).toHaveBeenCalledWith('Unknown error during model pull');
    });

    it('should handle buffered data across chunks', async () => {
      // Split data across chunks
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"sta') })
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('tus":"downloading"}\n') })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await aiService.processOllamaPullStream(
        mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>,
        'llama2',
        callbacks
      );

      expect(callbacks.onProgress).toHaveBeenCalledWith(expect.objectContaining({
        status: 'downloading',
      }));
    });

    it('should skip empty data lines', async () => {
      const mockData = 'data: \ndata: {"status":"downloading"}\n';

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await aiService.processOllamaPullStream(
        mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>,
        'llama2',
        callbacks
      );

      expect(callbacks.onProgress).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockData = 'data: {invalid-json}\ndata: {"status":"ok"}\n';

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await aiService.processOllamaPullStream(
        mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>,
        'llama2',
        callbacks
      );

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse SSE message:', expect.anything());
      expect(callbacks.onProgress).toHaveBeenCalledTimes(1); // Only the valid JSON
      consoleSpy.mockRestore();
    });

    it('should skip non-data lines', async () => {
      const mockData = 'event: message\ndata: {"status":"downloading"}\n';

      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockData) })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };

      const callbacks = {
        onProgress: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      };

      await aiService.processOllamaPullStream(
        mockReader as unknown as ReadableStreamDefaultReader<Uint8Array>,
        'llama2',
        callbacks
      );

      expect(callbacks.onProgress).toHaveBeenCalledTimes(1);
    });
  });
});
