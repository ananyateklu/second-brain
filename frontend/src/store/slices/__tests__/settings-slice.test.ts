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
    markdownRenderer: 'default',
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
    ragHydeProvider: null,
    ragHydeModel: null,
    ragQueryExpansionProvider: null,
    ragQueryExpansionModel: null,
    ragTopK: 5,
    ragSimilarityThreshold: 0.3,
    ragInitialRetrievalCount: 20,
    ragMinRerankScore: 3.0,
    ragVectorWeight: 0.7,
    ragBm25Weight: 0.3,
    ragMultiQueryCount: 3,
    ragMaxContextLength: 4000,
    ragEmbeddingProvider: null,
    ragEmbeddingModel: null,
    ragEmbeddingDimensions: null,
    focusAIProvider: 'OpenAI',
    focusAIModel: 'gpt-4o-mini',
    focusAITemperature: 0.7,
    focusAIMaxTokens: 800,
    focusAIRagTopK: 10,
    focusAISimilarityThreshold: 0.3,
    focusAIMaxSuggestions: 5,
    focusAIDedupThreshold: 0.85,
  },
  userPreferencesService: {
    getUserIdFromStorage: vi.fn(),
    createDebouncedSync: vi.fn(() => vi.fn()),
    validateItemsPerPage: vi.fn((n) => (n > 0 && n <= 100 ? n : 20)),
    validateFontSize: vi.fn((s) => (['small', 'medium', 'large'].includes(s) ? s : 'medium')),
    validateMarkdownRenderer: vi.fn((r) => (['default', 'custom'].includes(r) ? r : 'default')),
    validateVectorStoreProvider: vi.fn((p) => {
      if (p === 'PostgreSQL' || p === 'Pinecone') return p;
      throw new Error('Invalid provider');
    }),
    validateRagTopK: vi.fn((v) => Math.max(1, Math.min(50, v))),
    validateRagSimilarityThreshold: vi.fn((v) => Math.max(0, Math.min(1, v))),
    validateRagInitialRetrievalCount: vi.fn((v) => Math.max(5, Math.min(100, v))),
    validateRagMinRerankScore: vi.fn((v) => Math.max(0, Math.min(10, v))),
    validateRagWeight: vi.fn((v) => Math.max(0, Math.min(1, v))),
    validateRagMultiQueryCount: vi.fn((v) => Math.max(1, Math.min(10, v))),
    validateRagMaxContextLength: vi.fn((v) => Math.max(500, Math.min(32000, v))),
    validateFocusAITemperature: vi.fn((v) => Math.max(0, Math.min(2, v))),
    validateFocusAIMaxTokens: vi.fn((v) => Math.max(100, Math.min(4000, v))),
    validateFocusAIRagTopK: vi.fn((v) => Math.max(1, Math.min(50, v))),
    validateFocusAISimilarityThreshold: vi.fn((v) => Math.max(0, Math.min(1, v))),
    validateFocusAIMaxSuggestions: vi.fn((v) => Math.max(1, Math.min(20, v))),
    validateFocusAIDedupThreshold: vi.fn((v) => Math.max(0, Math.min(1, v))),
    loadAndMergePreferences: vi.fn(),
    syncToBackend: vi.fn(),
    clearPreferences: vi.fn(),
  },
}));

// Mock logger
vi.mock('../../../utils/logger', () => ({
  loggers: {
    store: {
      error: vi.fn(),
      warn: vi.fn(),
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
        // Focus AI Settings
        focusAIProvider: 'OpenAI',
        focusAIModel: 'gpt-4o-mini',
        focusAITemperature: 0.7,
        focusAIMaxTokens: 800,
        focusAIRagTopK: 10,
        focusAISimilarityThreshold: 0.3,
        focusAIMaxSuggestions: 5,
        focusAIDedupThreshold: 0.85,
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

  // ============================================
  // Markdown Renderer Tests
  // ============================================
  describe('setMarkdownRenderer', () => {
    it('should validate and set markdown renderer', async () => {
      await slice.setMarkdownRenderer('custom');

      expect(userPreferencesService.validateMarkdownRenderer).toHaveBeenCalledWith('custom');
      expect(mockSet).toHaveBeenCalledWith({ markdownRenderer: 'custom' });
    });

    it('should sync to backend by default', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.setMarkdownRenderer('llm-ui');

      expect(userPreferencesService.syncToBackend).toHaveBeenCalled();
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setMarkdownRenderer('custom', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // RAG Reranking Model Tests
  // ============================================
  describe('setRagRerankingModel', () => {
    it('should set RAG reranking model', async () => {
      await slice.setRagRerankingModel('rerank-v3');

      expect(mockSet).toHaveBeenCalledWith({ ragRerankingModel: 'rerank-v3' });
    });

    it('should set to null', async () => {
      await slice.setRagRerankingModel(null);

      expect(mockSet).toHaveBeenCalledWith({ ragRerankingModel: null });
    });

    it('should sync to backend by default', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.setRagRerankingModel('rerank-v3');

      expect(userPreferencesService.syncToBackend).toHaveBeenCalled();
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagRerankingModel('rerank-v3', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // HyDE Provider Settings Tests
  // ============================================
  describe('setRagHydeProvider', () => {
    it('should set HyDE provider', async () => {
      await slice.setRagHydeProvider('OpenAI');

      expect(mockSet).toHaveBeenCalledWith({ ragHydeProvider: 'OpenAI' });
    });

    it('should set to null', async () => {
      await slice.setRagHydeProvider(null);

      expect(mockSet).toHaveBeenCalledWith({ ragHydeProvider: null });
    });

    it('should sync to backend by default', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.setRagHydeProvider('Anthropic');

      expect(userPreferencesService.syncToBackend).toHaveBeenCalled();
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagHydeProvider('OpenAI', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagHydeModel', () => {
    it('should set HyDE model', async () => {
      await slice.setRagHydeModel('gpt-4o-mini');

      expect(mockSet).toHaveBeenCalledWith({ ragHydeModel: 'gpt-4o-mini' });
    });

    it('should set to null', async () => {
      await slice.setRagHydeModel(null);

      expect(mockSet).toHaveBeenCalledWith({ ragHydeModel: null });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagHydeModel('gpt-4o', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Query Expansion Provider Settings Tests
  // ============================================
  describe('setRagQueryExpansionProvider', () => {
    it('should set query expansion provider', async () => {
      await slice.setRagQueryExpansionProvider('Gemini');

      expect(mockSet).toHaveBeenCalledWith({ ragQueryExpansionProvider: 'Gemini' });
    });

    it('should set to null', async () => {
      await slice.setRagQueryExpansionProvider(null);

      expect(mockSet).toHaveBeenCalledWith({ ragQueryExpansionProvider: null });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagQueryExpansionProvider('OpenAI', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagQueryExpansionModel', () => {
    it('should set query expansion model', async () => {
      await slice.setRagQueryExpansionModel('gemini-pro');

      expect(mockSet).toHaveBeenCalledWith({ ragQueryExpansionModel: 'gemini-pro' });
    });

    it('should set to null', async () => {
      await slice.setRagQueryExpansionModel(null);

      expect(mockSet).toHaveBeenCalledWith({ ragQueryExpansionModel: null });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagQueryExpansionModel('gpt-4o', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // RAG Advanced Settings - Tier 1: Core Retrieval Tests
  // ============================================
  describe('setRagTopK', () => {
    it('should validate and set RAG top-k', async () => {
      await slice.setRagTopK(10);

      expect(userPreferencesService.validateRagTopK).toHaveBeenCalledWith(10);
      expect(mockSet).toHaveBeenCalledWith({ ragTopK: 10 });
    });

    it('should clamp values outside valid range', async () => {
      vi.mocked(userPreferencesService.validateRagTopK).mockReturnValue(50);

      await slice.setRagTopK(100);

      expect(mockSet).toHaveBeenCalledWith({ ragTopK: 50 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagTopK(5, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagSimilarityThreshold', () => {
    it('should validate and set similarity threshold', async () => {
      await slice.setRagSimilarityThreshold(0.5);

      expect(userPreferencesService.validateRagSimilarityThreshold).toHaveBeenCalledWith(0.5);
      expect(mockSet).toHaveBeenCalledWith({ ragSimilarityThreshold: 0.5 });
    });

    it('should clamp values to valid range', async () => {
      vi.mocked(userPreferencesService.validateRagSimilarityThreshold).mockReturnValue(1);

      await slice.setRagSimilarityThreshold(1.5);

      expect(mockSet).toHaveBeenCalledWith({ ragSimilarityThreshold: 1 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagSimilarityThreshold(0.3, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagInitialRetrievalCount', () => {
    it('should validate and set initial retrieval count', async () => {
      await slice.setRagInitialRetrievalCount(30);

      expect(userPreferencesService.validateRagInitialRetrievalCount).toHaveBeenCalledWith(30);
      expect(mockSet).toHaveBeenCalledWith({ ragInitialRetrievalCount: 30 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagInitialRetrievalCount(20, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagMinRerankScore', () => {
    it('should validate and set min rerank score', async () => {
      await slice.setRagMinRerankScore(5.0);

      expect(userPreferencesService.validateRagMinRerankScore).toHaveBeenCalledWith(5.0);
      expect(mockSet).toHaveBeenCalledWith({ ragMinRerankScore: 5.0 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagMinRerankScore(3.0, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // RAG Advanced Settings - Tier 2: Hybrid Search Tests
  // ============================================
  describe('setRagVectorWeight', () => {
    it('should validate and set vector weight', async () => {
      await slice.setRagVectorWeight(0.8);

      expect(userPreferencesService.validateRagWeight).toHaveBeenCalledWith(0.8);
      expect(mockSet).toHaveBeenCalledWith({ ragVectorWeight: 0.8 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagVectorWeight(0.7, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagBm25Weight', () => {
    it('should validate and set BM25 weight', async () => {
      await slice.setRagBm25Weight(0.2);

      expect(userPreferencesService.validateRagWeight).toHaveBeenCalledWith(0.2);
      expect(mockSet).toHaveBeenCalledWith({ ragBm25Weight: 0.2 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagBm25Weight(0.3, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagMultiQueryCount', () => {
    it('should validate and set multi-query count', async () => {
      await slice.setRagMultiQueryCount(5);

      expect(userPreferencesService.validateRagMultiQueryCount).toHaveBeenCalledWith(5);
      expect(mockSet).toHaveBeenCalledWith({ ragMultiQueryCount: 5 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagMultiQueryCount(3, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagMaxContextLength', () => {
    it('should validate and set max context length', async () => {
      await slice.setRagMaxContextLength(8000);

      expect(userPreferencesService.validateRagMaxContextLength).toHaveBeenCalledWith(8000);
      expect(mockSet).toHaveBeenCalledWith({ ragMaxContextLength: 8000 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagMaxContextLength(4000, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // RAG Embedding Settings Tests
  // ============================================
  describe('setRagEmbeddingProvider', () => {
    it('should set embedding provider', async () => {
      await slice.setRagEmbeddingProvider('OpenAI');

      expect(mockSet).toHaveBeenCalledWith({ ragEmbeddingProvider: 'OpenAI' });
    });

    it('should set to null', async () => {
      await slice.setRagEmbeddingProvider(null);

      expect(mockSet).toHaveBeenCalledWith({ ragEmbeddingProvider: null });
    });

    it('should sync to backend by default', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.setRagEmbeddingProvider('Cohere');

      expect(userPreferencesService.syncToBackend).toHaveBeenCalled();
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagEmbeddingProvider('OpenAI', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagEmbeddingModel', () => {
    it('should set embedding model', async () => {
      await slice.setRagEmbeddingModel('text-embedding-3-large');

      expect(mockSet).toHaveBeenCalledWith({ ragEmbeddingModel: 'text-embedding-3-large' });
    });

    it('should set to null', async () => {
      await slice.setRagEmbeddingModel(null);

      expect(mockSet).toHaveBeenCalledWith({ ragEmbeddingModel: null });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagEmbeddingModel('embed-v3', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setRagEmbeddingDimensions', () => {
    it('should set embedding dimensions', async () => {
      await slice.setRagEmbeddingDimensions(1536);

      expect(mockSet).toHaveBeenCalledWith({ ragEmbeddingDimensions: 1536 });
    });

    it('should set to null', async () => {
      await slice.setRagEmbeddingDimensions(null);

      expect(mockSet).toHaveBeenCalledWith({ ragEmbeddingDimensions: null });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setRagEmbeddingDimensions(768, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Focus AI Settings Tests
  // ============================================
  describe('setFocusAIProvider', () => {
    it('should set Focus AI provider', async () => {
      await slice.setFocusAIProvider('Anthropic');

      expect(mockSet).toHaveBeenCalledWith({ focusAIProvider: 'Anthropic' });
    });

    it('should set to null', async () => {
      await slice.setFocusAIProvider(null);

      expect(mockSet).toHaveBeenCalledWith({ focusAIProvider: null });
    });

    it('should sync to backend by default', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.syncToBackend).mockResolvedValue(undefined);

      await slice.setFocusAIProvider('OpenAI');

      expect(userPreferencesService.syncToBackend).toHaveBeenCalled();
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setFocusAIProvider('Gemini', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setFocusAIModel', () => {
    it('should set Focus AI model', async () => {
      await slice.setFocusAIModel('claude-3-sonnet');

      expect(mockSet).toHaveBeenCalledWith({ focusAIModel: 'claude-3-sonnet' });
    });

    it('should set to null', async () => {
      await slice.setFocusAIModel(null);

      expect(mockSet).toHaveBeenCalledWith({ focusAIModel: null });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setFocusAIModel('gpt-4o', false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setFocusAITemperature', () => {
    it('should validate and set temperature', async () => {
      await slice.setFocusAITemperature(0.9);

      expect(userPreferencesService.validateFocusAITemperature).toHaveBeenCalledWith(0.9);
      expect(mockSet).toHaveBeenCalledWith({ focusAITemperature: 0.9 });
    });

    it('should clamp values to valid range', async () => {
      vi.mocked(userPreferencesService.validateFocusAITemperature).mockReturnValue(2);

      await slice.setFocusAITemperature(3);

      expect(mockSet).toHaveBeenCalledWith({ focusAITemperature: 2 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setFocusAITemperature(0.7, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setFocusAIMaxTokens', () => {
    it('should validate and set max tokens', async () => {
      await slice.setFocusAIMaxTokens(1000);

      expect(userPreferencesService.validateFocusAIMaxTokens).toHaveBeenCalledWith(1000);
      expect(mockSet).toHaveBeenCalledWith({ focusAIMaxTokens: 1000 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setFocusAIMaxTokens(800, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setFocusAIRagTopK', () => {
    it('should validate and set RAG top-k', async () => {
      await slice.setFocusAIRagTopK(15);

      expect(userPreferencesService.validateFocusAIRagTopK).toHaveBeenCalledWith(15);
      expect(mockSet).toHaveBeenCalledWith({ focusAIRagTopK: 15 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setFocusAIRagTopK(10, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setFocusAISimilarityThreshold', () => {
    it('should validate and set similarity threshold', async () => {
      await slice.setFocusAISimilarityThreshold(0.4);

      expect(userPreferencesService.validateFocusAISimilarityThreshold).toHaveBeenCalledWith(0.4);
      expect(mockSet).toHaveBeenCalledWith({ focusAISimilarityThreshold: 0.4 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setFocusAISimilarityThreshold(0.3, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setFocusAIMaxSuggestions', () => {
    it('should validate and set max suggestions', async () => {
      await slice.setFocusAIMaxSuggestions(10);

      expect(userPreferencesService.validateFocusAIMaxSuggestions).toHaveBeenCalledWith(10);
      expect(mockSet).toHaveBeenCalledWith({ focusAIMaxSuggestions: 10 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setFocusAIMaxSuggestions(5, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  describe('setFocusAIDedupThreshold', () => {
    it('should validate and set dedup threshold', async () => {
      await slice.setFocusAIDedupThreshold(0.9);

      expect(userPreferencesService.validateFocusAIDedupThreshold).toHaveBeenCalledWith(0.9);
      expect(mockSet).toHaveBeenCalledWith({ focusAIDedupThreshold: 0.9 });
    });

    it('should not sync when syncToBackend is false', async () => {
      await slice.setFocusAIDedupThreshold(0.85, false);

      expect(userPreferencesService.syncToBackend).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Clear Preference Tests
  // ============================================
  describe('clearPreference', () => {
    it('should clear a single preference', async () => {
      const updatedPrefs = { chatProvider: null };
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.clearPreferences).mockResolvedValue(updatedPrefs as UserPreferences);

      await slice.clearPreference('chatProvider');

      expect(userPreferencesService.clearPreferences).toHaveBeenCalledWith('user-123', ['chatProvider']);
      expect(mockSet).toHaveBeenCalledWith({ chatProvider: null });
    });

    it('should not clear when no user ID', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue(null);

      await slice.clearPreference('chatProvider');

      expect(userPreferencesService.clearPreferences).not.toHaveBeenCalled();
    });

    it('should throw on error', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.clearPreferences).mockRejectedValue(new Error('Clear failed'));

      await expect(slice.clearPreference('chatProvider')).rejects.toThrow('Clear failed');
    });
  });

  describe('clearPreferences', () => {
    it('should clear multiple preferences', async () => {
      const updatedPrefs = { chatProvider: null, chatModel: null };
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.clearPreferences).mockResolvedValue(updatedPrefs as UserPreferences);

      await slice.clearPreferences(['chatProvider', 'chatModel']);

      expect(userPreferencesService.clearPreferences).toHaveBeenCalledWith('user-123', ['chatProvider', 'chatModel']);
      expect(mockSet).toHaveBeenCalledWith({ chatProvider: null, chatModel: null });
    });

    it('should not clear when no user ID', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue(null);

      await slice.clearPreferences(['chatProvider', 'chatModel']);

      expect(userPreferencesService.clearPreferences).not.toHaveBeenCalled();
    });

    it('should throw on error', async () => {
      vi.mocked(userPreferencesService.getUserIdFromStorage).mockReturnValue('user-123');
      vi.mocked(userPreferencesService.clearPreferences).mockRejectedValue(new Error('Clear failed'));

      await expect(slice.clearPreferences(['chatProvider'])).rejects.toThrow('Clear failed');
    });
  });
});
