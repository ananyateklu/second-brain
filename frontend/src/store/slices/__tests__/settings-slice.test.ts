/**
 * Settings Slice Tests
 * Unit tests for settings store slice
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSettingsSlice } from '../settings-slice';
import { userPreferencesService } from '../../../services/user-preferences.service';
import type { SettingsSlice, BoundStore } from '../../types';
import type { UserPreferences } from '../../../types/auth';

// Mock services
vi.mock('../../../services/user-preferences.service', () => ({
  DEFAULT_PREFERENCES: {
    chatProvider: null,
    chatModel: null,
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
    ragRerankingModel: null,
  },
  userPreferencesService: {
    getUserIdFromStorage: vi.fn(),
    createDebouncedSync: vi.fn(() => vi.fn()),
    validateItemsPerPage: vi.fn((n) => (n > 0 && n <= 100 ? n : 20)),
    validateFontSize: vi.fn((s) => (['small', 'medium', 'large'].includes(s) ? s : 'medium')),
    validateVectorStoreProvider: vi.fn((p) => {
      if (p === 'PostgreSQL' || p === 'Pinecone') return p;
      throw new Error('Invalid provider');
    }),
    loadAndMergePreferences: vi.fn(),
    syncToBackend: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  loggers: {
    store: {
      error: vi.fn(),
    },
  },
}));

describe('settingsSlice', () => {
  let state: Partial<BoundStore>;
  let slice: SettingsSlice;

  // Mock set and get functions for Zustand
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
    state = {};

    // Create slice
    // @ts-expect-error - Partial store mock
    slice = createSettingsSlice(mockSet, mockGet, {});

    // Merge slice into state
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have default preferences', () => {
      expect(slice.vectorStoreProvider).toBe('PostgreSQL');
      expect(slice.defaultNoteView).toBe('list');
      expect(slice.itemsPerPage).toBe(20);
      expect(slice.fontSize).toBe('medium');
      expect(slice.enableNotifications).toBe(true);
    });

    it('should have autoSaveInterval set to 2000', () => {
      expect(slice.autoSaveInterval).toBe(2000);
    });

    it('should have RAG feature toggles enabled by default', () => {
      expect(slice.ragEnableHyde).toBe(true);
      expect(slice.ragEnableQueryExpansion).toBe(true);
      expect(slice.ragEnableHybridSearch).toBe(true);
      expect(slice.ragEnableReranking).toBe(true);
      expect(slice.ragEnableAnalytics).toBe(true);
    });
  });

  // ============================================
  // General Preferences Tests
  // ============================================
  describe('setDefaultNoteView', () => {
    it('should set default note view', () => {
      slice.setDefaultNoteView('grid');

      expect(mockSet).toHaveBeenCalledWith({ defaultNoteView: 'grid' });
    });

    it('should set to list', () => {
      slice.setDefaultNoteView('list');

      expect(mockSet).toHaveBeenCalledWith({ defaultNoteView: 'list' });
    });
  });

  describe('setItemsPerPage', () => {
    it('should validate and set items per page', () => {
      slice.setItemsPerPage(50);

      expect(userPreferencesService.validateItemsPerPage).toHaveBeenCalledWith(50);
      expect(mockSet).toHaveBeenCalledWith({ itemsPerPage: 50 });
    });

    it('should use validated value', () => {
      vi.mocked(userPreferencesService.validateItemsPerPage).mockReturnValue(20);

      slice.setItemsPerPage(0);

      expect(mockSet).toHaveBeenCalledWith({ itemsPerPage: 20 });
    });
  });

  describe('setAutoSaveInterval', () => {
    it('should set auto save interval', () => {
      slice.setAutoSaveInterval(5000);

      expect(mockSet).toHaveBeenCalledWith({ autoSaveInterval: 5000 });
    });
  });

  describe('setEnableNotifications', () => {
    it('should set enable notifications to true', () => {
      slice.setEnableNotifications(true);

      expect(mockSet).toHaveBeenCalledWith({ enableNotifications: true });
    });

    it('should set enable notifications to false', () => {
      slice.setEnableNotifications(false);

      expect(mockSet).toHaveBeenCalledWith({ enableNotifications: false });
    });
  });

  describe('setFontSize', () => {
    it('should validate and set font size', () => {
      slice.setFontSize('large');

      expect(userPreferencesService.validateFontSize).toHaveBeenCalledWith('large');
      expect(mockSet).toHaveBeenCalledWith({ fontSize: 'large' });
    });

    it('should use validated value for invalid input', () => {
      vi.mocked(userPreferencesService.validateFontSize).mockReturnValue('medium');

      slice.setFontSize('invalid' as 'small' | 'medium' | 'large');

      expect(mockSet).toHaveBeenCalledWith({ fontSize: 'medium' });
    });
  });

  // ============================================
  // RAG Settings Tests
  // ============================================
  describe('setVectorStoreProvider', () => {
    it('should validate and set vector store provider', async () => {
      await slice.setVectorStoreProvider('Pinecone');

      expect(userPreferencesService.validateVectorStoreProvider).toHaveBeenCalledWith('Pinecone');
      expect(mockSet).toHaveBeenCalledWith({ vectorStoreProvider: 'Pinecone' });
    });

    it('should sync to backend by default', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.setVectorStoreProvider('PostgreSQL');

      expect(userPreferencesService.syncToBackend).toHaveBeenCalled();
    });

    it('should not sync to backend when syncToBackend is false', async () => {
      await slice.setVectorStoreProvider('PostgreSQL', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Chat Preferences Tests
  // ============================================
  describe('setChatProvider', () => {
    it('should set chat provider', () => {
      slice.setChatProvider('OpenAI');

      expect(mockSet).toHaveBeenCalledWith({ chatProvider: 'OpenAI' });
    });

    it('should set chat provider to null', () => {
      slice.setChatProvider(null);

      expect(mockSet).toHaveBeenCalledWith({ chatProvider: null });
    });
  });

  describe('setChatModel', () => {
    it('should set chat model', () => {
      slice.setChatModel('gpt-4');

      expect(mockSet).toHaveBeenCalledWith({ chatModel: 'gpt-4' });
    });

    it('should set chat model to null', () => {
      slice.setChatModel(null);

      expect(mockSet).toHaveBeenCalledWith({ chatModel: null });
    });
  });

  // ============================================
  // Ollama Settings Tests
  // ============================================
  describe('setOllamaRemoteUrl', () => {
    it('should set Ollama remote URL', () => {
      slice.setOllamaRemoteUrl('http://remote:11434');

      expect(mockSet).toHaveBeenCalledWith({ ollamaRemoteUrl: 'http://remote:11434' });
    });

    it('should set to null', () => {
      slice.setOllamaRemoteUrl(null);

      expect(mockSet).toHaveBeenCalledWith({ ollamaRemoteUrl: null });
    });
  });

  describe('setUseRemoteOllama', () => {
    it('should set use remote Ollama to true', () => {
      slice.setUseRemoteOllama(true);

      expect(mockSet).toHaveBeenCalledWith({ useRemoteOllama: true });
    });

    it('should set use remote Ollama to false', () => {
      slice.setUseRemoteOllama(false);

      expect(mockSet).toHaveBeenCalledWith({ useRemoteOllama: false });
    });
  });

  // ============================================
  // RAG Reranking Settings Tests
  // ============================================
  describe('setRerankingProvider', () => {
    it('should set reranking provider', async () => {
      await slice.setRerankingProvider('OpenAI');

      expect(mockSet).toHaveBeenCalledWith({ rerankingProvider: 'OpenAI' });
    });

    it('should sync to backend by default', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.setRerankingProvider('OpenAI');

      expect(userPreferencesService.syncToBackend).toHaveBeenCalled();
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRerankingProvider('OpenAI', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Note Summary Settings Tests
  // ============================================
  describe('setNoteSummaryEnabled', () => {
    it('should set note summary enabled', async () => {
      await slice.setNoteSummaryEnabled(false);

      expect(mockSet).toHaveBeenCalledWith({ noteSummaryEnabled: false });
    });

    it('should sync to backend by default', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.setNoteSummaryEnabled(true);

      expect(userPreferencesService.syncToBackend).toHaveBeenCalled();
    });
  });

  describe('setNoteSummaryProvider', () => {
    it('should set note summary provider', async () => {
      await slice.setNoteSummaryProvider('Anthropic');

      expect(mockSet).toHaveBeenCalledWith({ noteSummaryProvider: 'Anthropic' });
    });
  });

  describe('setNoteSummaryModel', () => {
    it('should set note summary model', async () => {
      await slice.setNoteSummaryModel('claude-3');

      expect(mockSet).toHaveBeenCalledWith({ noteSummaryModel: 'claude-3' });
    });
  });

  // ============================================
  // RAG Feature Toggles Tests
  // ============================================
  describe('setRagEnableHyde', () => {
    it('should set RAG HyDE enabled', async () => {
      await slice.setRagEnableHyde(false);

      expect(mockSet).toHaveBeenCalledWith({ ragEnableHyde: false });
    });
  });

  describe('setRagEnableQueryExpansion', () => {
    it('should set RAG query expansion enabled', async () => {
      await slice.setRagEnableQueryExpansion(false);

      expect(mockSet).toHaveBeenCalledWith({ ragEnableQueryExpansion: false });
    });
  });

  describe('setRagEnableHybridSearch', () => {
    it('should set RAG hybrid search enabled', async () => {
      await slice.setRagEnableHybridSearch(false);

      expect(mockSet).toHaveBeenCalledWith({ ragEnableHybridSearch: false });
    });
  });

  describe('setRagEnableReranking', () => {
    it('should set RAG reranking enabled', async () => {
      await slice.setRagEnableReranking(false);

      expect(mockSet).toHaveBeenCalledWith({ ragEnableReranking: false });
    });
  });

  describe('setRagEnableAnalytics', () => {
    it('should set RAG analytics enabled', async () => {
      await slice.setRagEnableAnalytics(false);

      expect(mockSet).toHaveBeenCalledWith({ ragEnableAnalytics: false });
    });
  });

  // ============================================
  // Sync Actions Tests
  // ============================================
  describe('loadPreferencesFromBackend', () => {
    it('should load and merge preferences from backend', async () => {
      const mockPreferences: UserPreferences = {
        chatProvider: 'OpenAI',
        chatModel: 'gpt-4',
        vectorStoreProvider: 'Pinecone',
        defaultNoteView: 'grid',
        itemsPerPage: 50,
        fontSize: 'large',
        markdownRenderer: 'custom',
        enableNotifications: false,
        ollamaRemoteUrl: 'http://remote:11434',
        useRemoteOllama: true,
        rerankingProvider: 'OpenAI',
        noteSummaryEnabled: true,
        noteSummaryProvider: 'Anthropic',
        noteSummaryModel: 'claude-3',
        ragEnableHyde: false,
        ragEnableQueryExpansion: false,
        ragEnableHybridSearch: true,
        ragEnableReranking: true,
        ragEnableAnalytics: false,
        // Reranking Model Setting
        ragRerankingModel: null,
        // HyDE Provider Settings
        ragHydeProvider: null,
        ragHydeModel: null,
        // Query Expansion Provider Settings
        ragQueryExpansionProvider: null,
        ragQueryExpansionModel: null,
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
        // RAG Embedding Settings
        ragEmbeddingProvider: null,
        ragEmbeddingModel: null,
        ragEmbeddingDimensions: null,
      };

      vi.mocked(userPreferencesService.loadAndMergePreferences).mockResolvedValue(mockPreferences);

      await slice.loadPreferencesFromBackend('user-123');

      expect(userPreferencesService.loadAndMergePreferences).toHaveBeenCalledWith('user-123');
      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        chatProvider: 'OpenAI',
        vectorStoreProvider: 'Pinecone',
        fontSize: 'large',
      }));
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(userPreferencesService.loadAndMergePreferences).mockRejectedValue(new Error('Network error'));

      // Should not throw
      await expect(slice.loadPreferencesFromBackend('user-123')).resolves.toBeUndefined();
    });
  });

  describe('syncPreferencesToBackend', () => {
    it('should sync current preferences to backend', async () => {
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.syncPreferencesToBackend('user-123');

      expect(userPreferencesService.syncToBackend).toHaveBeenCalledWith('user-123', expect.any(Object));
    });

    it('should throw on sync failure', async () => {
      vi.mocked(userPreferencesService.syncToBackend).mockRejectedValue(new Error('Network error'));

      await expect(slice.syncPreferencesToBackend('user-123')).rejects.toThrow('Network error');
    });
  });

  // ============================================
  // Reset Tests
  // ============================================
  describe('resetSettings', () => {
    it('should reset to default preferences', () => {
      slice.resetSettings();

      expect(mockSet).toHaveBeenCalledWith(expect.objectContaining({
        vectorStoreProvider: 'PostgreSQL',
        defaultNoteView: 'list',
        itemsPerPage: 20,
        fontSize: 'medium',
        autoSaveInterval: 2000,
      }));
    });
  });
});
