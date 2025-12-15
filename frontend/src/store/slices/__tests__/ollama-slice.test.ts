/**
 * Ollama Slice Tests
 * Unit tests for Ollama download store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOllamaSlice, formatBytes, formatSpeed, formatTimeRemaining } from '../ollama-slice';
import { aiService } from '../../../services/ai.service';
import type { OllamaSlice, BoundStore } from '../../types';

// Mock aiService
vi.mock('../../../services/ai.service', () => ({
  aiService: {
    pullModel: vi.fn(),
  },
}));

describe('ollamaSlice', () => {
  let state: Partial<BoundStore>;
  let slice: OllamaSlice;

  const mockSet = vi.fn((partial: Partial<BoundStore> | ((state: BoundStore) => Partial<BoundStore>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state as BoundStore);
      Object.assign(state, newState);
    } else {
      Object.assign(state, partial);
    }
  });

  const mockGet = vi.fn(() => state as BoundStore);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    state = {};
    // @ts-expect-error - Partial store mock
    slice = createOllamaSlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have empty downloads', () => {
      expect(slice.downloads).toEqual({});
    });
  });

  // ============================================
  // startDownload Tests
  // ============================================
  describe('startDownload', () => {
    it('should create a pending download entry', () => {
      const mockAbortController = new AbortController();
      vi.mocked(aiService.pullModel).mockReturnValue(mockAbortController);

      slice.startDownload({ modelName: 'llama2' });

      expect(state.downloads?.['llama2']).toBeDefined();
      expect(state.downloads?.['llama2'].status).toBe('pending');
      expect(state.downloads?.['llama2'].modelName).toBe('llama2');
    });

    it('should not start download if already downloading', () => {
      state.downloads = {
        'llama2': {
          modelName: 'llama2',
          status: 'downloading',
          startedAt: new Date(),
        },
      };

      slice.startDownload({ modelName: 'llama2' });

      expect(aiService.pullModel).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should call aiService.pullModel with callbacks', () => {
      const mockAbortController = new AbortController();
      vi.mocked(aiService.pullModel).mockReturnValue(mockAbortController);

      slice.startDownload({ modelName: 'llama2', ollamaBaseUrl: 'http://localhost:11434' });

      expect(aiService.pullModel).toHaveBeenCalledWith(
        { modelName: 'llama2', ollamaBaseUrl: 'http://localhost:11434' },
        expect.objectContaining({
          onProgress: expect.any(Function),
          onComplete: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('should handle progress callback', () => {
      let onProgressCallback: ((progress: import('../../../types/ai').OllamaPullProgress) => void) | undefined;
      vi.mocked(aiService.pullModel).mockImplementation((_req, callbacks) => {
        onProgressCallback = callbacks.onProgress;
        return new AbortController();
      });

      slice.startDownload({ modelName: 'llama2' });
      const progress = { status: 'pulling', completedBytes: 50, totalBytes: 100, isComplete: false, isError: false, timestamp: new Date().toISOString() };
      onProgressCallback?.(progress);

      expect(state.downloads?.['llama2'].status).toBe('downloading');
      expect(state.downloads?.['llama2'].progress).toEqual(progress);
    });

    it('should handle complete callback', () => {
      let onCompleteCallback: ((modelName: string) => void) | undefined;
      vi.mocked(aiService.pullModel).mockImplementation((_req, callbacks) => {
        onCompleteCallback = callbacks.onComplete;
        return new AbortController();
      });

      slice.startDownload({ modelName: 'llama2' });
      onCompleteCallback?.('llama2');

      expect(state.downloads?.['llama2'].status).toBe('completed');
      expect(state.downloads?.['llama2'].completedAt).toBeDefined();
    });

    it('should handle error callback', () => {
      let onErrorCallback: ((error: string) => void) | undefined;
      vi.mocked(aiService.pullModel).mockImplementation((_req, callbacks) => {
        onErrorCallback = callbacks.onError;
        return new AbortController();
      });

      slice.startDownload({ modelName: 'llama2' });
      onErrorCallback?.('Download failed');

      expect(state.downloads?.['llama2'].status).toBe('error');
      expect(state.downloads?.['llama2'].errorMessage).toBe('Download failed');
    });

    it('should store abort controller', () => {
      const mockAbortController = new AbortController();
      vi.mocked(aiService.pullModel).mockReturnValue(mockAbortController);

      slice.startDownload({ modelName: 'llama2' });

      expect(state.downloads?.['llama2'].abortController).toBe(mockAbortController);
    });
  });

  // ============================================
  // cancelDownload Tests
  // ============================================
  describe('cancelDownload', () => {
    it('should abort the download', () => {
      const mockAbortController = { abort: vi.fn() };
      state.downloads = {
        'llama2': {
          modelName: 'llama2',
          status: 'downloading',
          startedAt: new Date(),
          abortController: mockAbortController as unknown as AbortController,
        },
      };

      slice.cancelDownload('llama2');

      expect(mockAbortController.abort).toHaveBeenCalled();
    });

    it('should set status to cancelled', () => {
      state.downloads = {
        'llama2': {
          modelName: 'llama2',
          status: 'downloading',
          startedAt: new Date(),
        },
      };

      slice.cancelDownload('llama2');

      expect(state.downloads?.['llama2'].status).toBe('cancelled');
      expect(state.downloads?.['llama2'].errorMessage).toBe('Download cancelled by user');
    });
  });

  // ============================================
  // clearDownload Tests
  // ============================================
  describe('clearDownload', () => {
    it('should remove download from state', () => {
      state.downloads = {
        'llama2': {
          modelName: 'llama2',
          status: 'completed',
          startedAt: new Date(),
        },
        'mistral': {
          modelName: 'mistral',
          status: 'completed',
          startedAt: new Date(),
        },
      };

      slice.clearDownload('llama2');

      expect(state.downloads?.['llama2']).toBeUndefined();
      expect(state.downloads?.['mistral']).toBeDefined();
    });
  });

  // ============================================
  // clearCompletedDownloads Tests
  // ============================================
  describe('clearCompletedDownloads', () => {
    it('should remove completed and error downloads', () => {
      state.downloads = {
        'llama2': { modelName: 'llama2', status: 'completed', startedAt: new Date() },
        'mistral': { modelName: 'mistral', status: 'downloading', startedAt: new Date() },
        'falcon': { modelName: 'falcon', status: 'error', startedAt: new Date() },
        'phi': { modelName: 'phi', status: 'pending', startedAt: new Date() },
      };

      slice.clearCompletedDownloads();

      expect(Object.keys(state.downloads || {})).toEqual(['mistral', 'phi']);
    });

    it('should handle empty downloads', () => {
      state.downloads = {};

      slice.clearCompletedDownloads();

      expect(state.downloads).toEqual({});
    });
  });

  // ============================================
  // Helper Functions Tests
  // ============================================
  describe('formatBytes', () => {
    it('should format 0 bytes', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      expect(formatBytes(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should format with decimals', () => {
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
    });
  });

  describe('formatSpeed', () => {
    it('should format bytes per second', () => {
      expect(formatSpeed(1024)).toBe('1 KB/s');
    });

    it('should format megabytes per second', () => {
      expect(formatSpeed(1024 * 1024 * 5)).toBe('5 MB/s');
    });
  });

  describe('formatTimeRemaining', () => {
    it('should format seconds', () => {
      expect(formatTimeRemaining(45)).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      expect(formatTimeRemaining(125)).toBe('2m 5s');
    });

    it('should format hours and minutes', () => {
      expect(formatTimeRemaining(3700)).toBe('1h 1m');
    });
  });
});
