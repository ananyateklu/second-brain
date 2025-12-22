/**
 * User Preferences Service Tests
 * Unit tests for user preferences service methods, validation, and sync functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { userPreferencesService, DEFAULT_PREFERENCES } from '../user-preferences.service';
import { apiClient } from '../../lib/api-client';
import { API_ENDPOINTS, STORAGE_KEYS } from '../../lib/constants';
import type { UserPreferences } from '../../types/auth';

// Mock the apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Helper to create mock preferences
const createMockPreferences = (overrides: Partial<UserPreferences> = {}): UserPreferences => ({
  chatProvider: 'OpenAI',
  chatModel: 'gpt-4',
  vectorStoreProvider: 'PostgreSQL',
  defaultNoteView: 'list',
  itemsPerPage: 20,
  fontSize: 'medium',
  enableNotifications: true,
  ollamaRemoteUrl: null,
  useRemoteOllama: false,
  rerankingProvider: null,
  noteSummaryEnabled: true,
  noteSummaryProvider: 'OpenAI',
  noteSummaryModel: 'gpt-4o-mini',
  ragEnableHyde: true,
  ragEnableQueryExpansion: true,
  ragEnableHybridSearch: true,
  ragEnableReranking: true,
  ragEnableAnalytics: true,
  // RAG Advanced Settings - Tier 1: Core Retrieval
  ragTopK: 5,
  ragSimilarityThreshold: 0.3,
  ragInitialRetrievalCount: 20,
  ragMinRerankScore: 3.0,
  // RAG Advanced Settings - Tier 2: Hybrid Search
  ragVectorWeight: 0.7,
  ragBm25Weight: 0.3,
  ragMultiQueryCount: 3,
  ragMaxContextLength: 4000,
  ...overrides,
});

describe('userPreferencesService', () => {
  // Mock localStorage
  let localStorageMock: Record<string, string>;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = {};

    // Store original localStorage
    originalLocalStorage = globalThis.localStorage;

    // Create a complete localStorage mock
    const localStorageProxy = {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        localStorageMock = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    };

    // Replace global localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageProxy,
      writable: true,
    });

    // Mock console.error to suppress expected error logs
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
    // Restore original localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
  });

  // ============================================
  // Default Preferences Tests
  // ============================================
  describe('DEFAULT_PREFERENCES', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_PREFERENCES.chatProvider).toBeNull();
      expect(DEFAULT_PREFERENCES.chatModel).toBeNull();
      expect(DEFAULT_PREFERENCES.vectorStoreProvider).toBe('PostgreSQL');
      expect(DEFAULT_PREFERENCES.defaultNoteView).toBe('list');
      expect(DEFAULT_PREFERENCES.itemsPerPage).toBe(20);
      expect(DEFAULT_PREFERENCES.fontSize).toBe('medium');
      expect(DEFAULT_PREFERENCES.enableNotifications).toBe(true);
      expect(DEFAULT_PREFERENCES.useRemoteOllama).toBe(false);
    });

    it('should have RAG feature toggles enabled by default', () => {
      expect(DEFAULT_PREFERENCES.ragEnableHyde).toBe(true);
      expect(DEFAULT_PREFERENCES.ragEnableQueryExpansion).toBe(true);
      expect(DEFAULT_PREFERENCES.ragEnableHybridSearch).toBe(true);
      expect(DEFAULT_PREFERENCES.ragEnableReranking).toBe(true);
      expect(DEFAULT_PREFERENCES.ragEnableAnalytics).toBe(true);
    });

    it('should have note summary defaults', () => {
      expect(DEFAULT_PREFERENCES.noteSummaryEnabled).toBe(true);
      expect(DEFAULT_PREFERENCES.noteSummaryProvider).toBe('OpenAI');
      expect(DEFAULT_PREFERENCES.noteSummaryModel).toBe('gpt-4o-mini');
    });
  });

  // ============================================
  // API Method Tests
  // ============================================
  describe('getPreferences', () => {
    it('should GET user preferences', async () => {
      const mockPrefs = createMockPreferences();
      vi.mocked(apiClient.get).mockResolvedValue(mockPrefs);

      const result = await userPreferencesService.getPreferences('user-123');

      expect(apiClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.USER_PREFERENCES.BY_USER('user-123')
      );
      expect(result.chatProvider).toBe('OpenAI');
    });
  });

  describe('updatePreferences', () => {
    it('should PUT user preferences', async () => {
      const mockPrefs = createMockPreferences();
      vi.mocked(apiClient.put).mockResolvedValue(mockPrefs);

      const result = await userPreferencesService.updatePreferences('user-123', {
        chatProvider: 'Anthropic',
      });

      expect(apiClient.put).toHaveBeenCalledWith(
        API_ENDPOINTS.USER_PREFERENCES.BY_USER('user-123'),
        { chatProvider: 'Anthropic' }
      );
      expect(result).toEqual(mockPrefs);
    });
  });

  // ============================================
  // Validation Function Tests
  // ============================================
  describe('validateVectorStoreProvider', () => {
    it('should accept PostgreSQL', () => {
      expect(userPreferencesService.validateVectorStoreProvider('PostgreSQL')).toBe('PostgreSQL');
    });

    it('should accept Pinecone', () => {
      expect(userPreferencesService.validateVectorStoreProvider('Pinecone')).toBe('Pinecone');
    });

    it('should throw for invalid provider', () => {
      expect(() => userPreferencesService.validateVectorStoreProvider('Invalid')).toThrow(
        "Invalid vector store provider: Invalid. Must be 'PostgreSQL' or 'Pinecone'."
      );
    });
  });

  describe('validateNoteView', () => {
    it('should return grid for grid input', () => {
      expect(userPreferencesService.validateNoteView('grid')).toBe('grid');
    });

    it('should return list for list input', () => {
      expect(userPreferencesService.validateNoteView('list')).toBe('list');
    });

    it('should default to list for invalid input', () => {
      expect(userPreferencesService.validateNoteView('invalid')).toBe('list');
    });

    it('should default to list for empty string', () => {
      expect(userPreferencesService.validateNoteView('')).toBe('list');
    });
  });

  describe('validateFontSize', () => {
    it('should accept small', () => {
      expect(userPreferencesService.validateFontSize('small')).toBe('small');
    });

    it('should accept medium', () => {
      expect(userPreferencesService.validateFontSize('medium')).toBe('medium');
    });

    it('should accept large', () => {
      expect(userPreferencesService.validateFontSize('large')).toBe('large');
    });

    it('should default to medium for invalid input', () => {
      expect(userPreferencesService.validateFontSize('extra-large')).toBe('medium');
    });
  });

  describe('validateItemsPerPage', () => {
    it('should accept valid count within range', () => {
      expect(userPreferencesService.validateItemsPerPage(50)).toBe(50);
    });

    it('should accept minimum valid count', () => {
      expect(userPreferencesService.validateItemsPerPage(1)).toBe(1);
    });

    it('should accept maximum valid count', () => {
      expect(userPreferencesService.validateItemsPerPage(100)).toBe(100);
    });

    it('should default to 20 for zero', () => {
      expect(userPreferencesService.validateItemsPerPage(0)).toBe(20);
    });

    it('should default to 20 for negative numbers', () => {
      expect(userPreferencesService.validateItemsPerPage(-5)).toBe(20);
    });

    it('should default to 20 for numbers above 100', () => {
      expect(userPreferencesService.validateItemsPerPage(101)).toBe(20);
    });

    it('should default to 20 for NaN', () => {
      expect(userPreferencesService.validateItemsPerPage(NaN)).toBe(20);
    });
  });

  describe('validatePreferences', () => {
    it('should use provided values', () => {
      const input = {
        chatProvider: 'Anthropic',
        chatModel: 'claude-3',
        vectorStoreProvider: 'Pinecone',
        defaultNoteView: 'grid',
        itemsPerPage: 50,
        fontSize: 'large',
        enableNotifications: false,
      };

      const result = userPreferencesService.validatePreferences(input as Partial<UserPreferences>);

      expect(result.chatProvider).toBe('Anthropic');
      expect(result.chatModel).toBe('claude-3');
      expect(result.vectorStoreProvider).toBe('Pinecone');
      expect(result.defaultNoteView).toBe('grid');
      expect(result.itemsPerPage).toBe(50);
      expect(result.fontSize).toBe('large');
      expect(result.enableNotifications).toBe(false);
    });

    it('should use defaults for missing values', () => {
      const result = userPreferencesService.validatePreferences({});

      expect(result.chatProvider).toBeNull();
      expect(result.vectorStoreProvider).toBe('PostgreSQL');
      expect(result.defaultNoteView).toBe('list');
      expect(result.itemsPerPage).toBe(20);
      expect(result.fontSize).toBe('medium');
    });

    it('should use currentPreferences as base', () => {
      const current = createMockPreferences({ chatProvider: 'Gemini', chatModel: 'gemini-pro' });

      const result = userPreferencesService.validatePreferences({}, current);

      expect(result.chatProvider).toBe('Gemini');
      expect(result.chatModel).toBe('gemini-pro');
    });

    it('should validate boolean fields correctly', () => {
      const result = userPreferencesService.validatePreferences({
        enableNotifications: false,
        useRemoteOllama: true,
        ragEnableHyde: false,
        ragEnableQueryExpansion: false,
      });

      expect(result.enableNotifications).toBe(false);
      expect(result.useRemoteOllama).toBe(true);
      expect(result.ragEnableHyde).toBe(false);
      expect(result.ragEnableQueryExpansion).toBe(false);
    });

    it('should preserve note summary settings', () => {
      const result = userPreferencesService.validatePreferences({
        noteSummaryEnabled: false,
        noteSummaryProvider: 'Anthropic',
        noteSummaryModel: 'claude-3',
      });

      expect(result.noteSummaryEnabled).toBe(false);
      expect(result.noteSummaryProvider).toBe('Anthropic');
      expect(result.noteSummaryModel).toBe('claude-3');
    });

    it('should preserve Ollama settings', () => {
      const result = userPreferencesService.validatePreferences({
        ollamaRemoteUrl: 'http://remote:11434',
        useRemoteOllama: true,
      });

      expect(result.ollamaRemoteUrl).toBe('http://remote:11434');
      expect(result.useRemoteOllama).toBe(true);
    });
  });

  // ============================================
  // Local Storage Function Tests
  // ============================================
  describe('getLocalPreferences', () => {
    it('should return parsed preferences from localStorage', () => {
      const stored = { chatProvider: 'OpenAI', fontSize: 'large' };
      localStorageMock[STORAGE_KEYS.SETTINGS] = JSON.stringify(stored);

      const result = userPreferencesService.getLocalPreferences();

      expect(result).toEqual(stored);
    });

    it('should return null if nothing stored', () => {
      const result = userPreferencesService.getLocalPreferences();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorageMock[STORAGE_KEYS.SETTINGS] = 'not valid json';

      const result = userPreferencesService.getLocalPreferences();

      expect(result).toBeNull();
    });
  });

  describe('saveLocalPreferences', () => {
    it('should save preferences to localStorage', () => {
      const prefs = createMockPreferences();

      userPreferencesService.saveLocalPreferences(prefs);

      expect(globalThis.localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(prefs)
      );
    });

    it('should handle save errors gracefully', () => {
      // Make setItem throw
      (globalThis.localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      expect(() => userPreferencesService.saveLocalPreferences(createMockPreferences())).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('clearLocalPreferences', () => {
    it('should remove preferences from localStorage', () => {
      localStorageMock[STORAGE_KEYS.SETTINGS] = JSON.stringify({});

      userPreferencesService.clearLocalPreferences();

      expect(globalThis.localStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEYS.SETTINGS);
    });

    it('should handle errors gracefully', () => {
      (globalThis.localStorage.removeItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Access denied');
      });

      // Should not throw
      expect(() => userPreferencesService.clearLocalPreferences()).not.toThrow();
    });
  });

  describe('getUserIdFromStorage', () => {
    it('should return userId from auth storage', () => {
      const authState = {
        state: {
          user: { userId: 'user-123' },
        },
      };
      localStorageMock[STORAGE_KEYS.AUTH] = JSON.stringify(authState);

      const result = userPreferencesService.getUserIdFromStorage();

      expect(result).toBe('user-123');
    });

    it('should return null if no auth state', () => {
      const result = userPreferencesService.getUserIdFromStorage();

      expect(result).toBeNull();
    });

    it('should return null if no user in auth state', () => {
      localStorageMock[STORAGE_KEYS.AUTH] = JSON.stringify({ state: {} });

      const result = userPreferencesService.getUserIdFromStorage();

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      localStorageMock[STORAGE_KEYS.AUTH] = 'not valid json';

      const result = userPreferencesService.getUserIdFromStorage();

      expect(result).toBeNull();
    });
  });

  // ============================================
  // Sync Function Tests
  // ============================================
  describe('loadAndMergePreferences', () => {
    it('should merge backend and local preferences', async () => {
      const backendPrefs = createMockPreferences({ chatProvider: 'OpenAI' });
      const localPrefs = { fontSize: 'large' };
      vi.mocked(apiClient.get).mockResolvedValue(backendPrefs);
      localStorageMock[STORAGE_KEYS.SETTINGS] = JSON.stringify(localPrefs);

      const result = await userPreferencesService.loadAndMergePreferences('user-123');

      // Backend takes precedence
      expect(result.chatProvider).toBe('OpenAI');
      // Local fills gaps (but backend had fontSize too via createMockPreferences)
      expect(result.fontSize).toBe('medium'); // backend default from mock
    });

    it('should save merged preferences to localStorage', async () => {
      const backendPrefs = createMockPreferences();
      vi.mocked(apiClient.get).mockResolvedValue(backendPrefs);

      await userPreferencesService.loadAndMergePreferences('user-123');

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should fall back to local preferences on backend error', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));
      localStorageMock[STORAGE_KEYS.SETTINGS] = JSON.stringify({
        chatProvider: 'Anthropic',
        vectorStoreProvider: 'PostgreSQL',
      });

      const result = await userPreferencesService.loadAndMergePreferences('user-123');

      expect(result.chatProvider).toBe('Anthropic');
      expect(console.error).toHaveBeenCalled();
    });

    it('should fall back to defaults when both backend and local fail', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('Network error'));

      const result = await userPreferencesService.loadAndMergePreferences('user-123');

      expect(result).toEqual(DEFAULT_PREFERENCES);
    });
  });

  describe('syncToBackend', () => {
    it('should update preferences on backend', async () => {
      const prefs = createMockPreferences();
      vi.mocked(apiClient.put).mockResolvedValue(prefs);

      await userPreferencesService.syncToBackend('user-123', prefs);

      expect(apiClient.put).toHaveBeenCalledWith(
        API_ENDPOINTS.USER_PREFERENCES.BY_USER('user-123'),
        prefs
      );
    });

    it('should throw on backend error', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Network error'));

      await expect(
        userPreferencesService.syncToBackend('user-123', createMockPreferences())
      ).rejects.toThrow('Network error');
    });

    it('should log errors', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Network error'));

      try {
        await userPreferencesService.syncToBackend('user-123', createMockPreferences());
      } catch {
        // Expected
      }

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('createDebouncedSync', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create a debounced function', () => {
      const debouncedSync = userPreferencesService.createDebouncedSync();

      expect(typeof debouncedSync).toBe('function');
    });

    it('should delay sync by default delay (1000ms)', async () => {
      vi.mocked(apiClient.put).mockResolvedValue(createMockPreferences());
      const debouncedSync = userPreferencesService.createDebouncedSync();

      debouncedSync('user-123', createMockPreferences());

      expect(apiClient.put).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);

      expect(apiClient.put).toHaveBeenCalled();
    });

    it('should use custom delay', async () => {
      vi.mocked(apiClient.put).mockResolvedValue(createMockPreferences());
      const debouncedSync = userPreferencesService.createDebouncedSync(500);

      debouncedSync('user-123', createMockPreferences());

      await vi.advanceTimersByTimeAsync(499);
      expect(apiClient.put).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      expect(apiClient.put).toHaveBeenCalled();
    });

    it('should debounce multiple calls', async () => {
      vi.mocked(apiClient.put).mockResolvedValue(createMockPreferences());
      const debouncedSync = userPreferencesService.createDebouncedSync(500);

      debouncedSync('user-123', createMockPreferences({ fontSize: 'small' }));
      await vi.advanceTimersByTimeAsync(200);

      debouncedSync('user-123', createMockPreferences({ fontSize: 'medium' }));
      await vi.advanceTimersByTimeAsync(200);

      debouncedSync('user-123', createMockPreferences({ fontSize: 'large' }));
      await vi.advanceTimersByTimeAsync(500);

      // Should only be called once with the last value
      expect(apiClient.put).toHaveBeenCalledTimes(1);
      expect(apiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ fontSize: 'large' })
      );
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(apiClient.put).mockRejectedValue(new Error('Network error'));
      const debouncedSync = userPreferencesService.createDebouncedSync(100);

      debouncedSync('user-123', createMockPreferences());
      await vi.advanceTimersByTimeAsync(100);

      // Should not throw, error is caught internally
      expect(console.error).toHaveBeenCalled();
    });
  });
});
