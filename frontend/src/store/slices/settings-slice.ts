/**
 * Settings Slice
 * Manages user preferences and settings
 */

// Import directly to avoid circular deps through services barrel export
import { userPreferencesService, DEFAULT_PREFERENCES } from '../../services/user-preferences.service';
import { loggers } from '../../utils/logger';
import type { UserPreferences, MarkdownRendererType } from '../../types/auth';
import type { VectorStoreProvider } from '../../types/rag';
import type { SettingsSlice, SliceCreator, FontSize, NoteView } from '../types';

/**
 * Get userId from auth storage
 */
const getUserId = (): string | null => {
  return userPreferencesService.getUserIdFromStorage();
};

/**
 * Create debounced sync function
 */
const debouncedSync = userPreferencesService.createDebouncedSync(1000);

/**
 * Helper to sync a setting with debouncing (for non-critical settings)
 * Reduces boilerplate for simple preference updates
 */
const syncSettingDebounced = <K extends keyof UserPreferences>(
  getState: () => SettingsSlice,
  key: K,
  value: UserPreferences[K]
): void => {
  const userId = getUserId();
  if (userId) {
    debouncedSync(userId, { ...extractPreferences(getState()), [key]: value });
  }
};

/**
 * Helper to sync a setting immediately (for critical settings)
 * Returns a promise for async error handling
 */
const syncSettingImmediate = async <K extends keyof UserPreferences>(
  getState: () => SettingsSlice,
  key: K,
  value: UserPreferences[K],
  settingName: string
): Promise<void> => {
  const userId = getUserId();
  if (userId) {
    try {
      await userPreferencesService.syncToBackend(userId, {
        ...extractPreferences(getState()),
        [key]: value,
      });
    } catch (error) {
      loggers.store.error(`Failed to sync ${settingName} to backend:`, { error });
    }
  }
};

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => ({
  // Initial state from defaults
  ...DEFAULT_PREFERENCES,
  autoSaveInterval: 2000,

  // ============================================
  // General Preferences
  // ============================================

  setDefaultNoteView: (view: NoteView) => {
    set({ defaultNoteView: view });
    syncSettingDebounced(get, 'defaultNoteView', view);
  },

  setItemsPerPage: (count: number) => {
    const validCount = userPreferencesService.validateItemsPerPage(count);
    set({ itemsPerPage: validCount });
    syncSettingDebounced(get, 'itemsPerPage', validCount);
  },

  setAutoSaveInterval: (interval: number) => {
    set({ autoSaveInterval: interval });
  },

  setEnableNotifications: (enabled: boolean) => {
    set({ enableNotifications: enabled });
    syncSettingDebounced(get, 'enableNotifications', enabled);
  },

  setFontSize: (size: FontSize) => {
    const validSize = userPreferencesService.validateFontSize(size);
    set({ fontSize: validSize });
    syncSettingDebounced(get, 'fontSize', validSize);
  },

  setMarkdownRenderer: async (renderer: MarkdownRendererType, syncToBackend = true) => {
    const validRenderer = userPreferencesService.validateMarkdownRenderer(renderer);
    set({ markdownRenderer: validRenderer });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'markdownRenderer', validRenderer, 'markdown renderer');
    }
  },

  // ============================================
  // RAG Settings
  // ============================================

  setVectorStoreProvider: async (provider: VectorStoreProvider, syncToBackend = true) => {
    const validProvider = userPreferencesService.validateVectorStoreProvider(provider);
    set({ vectorStoreProvider: validProvider });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'vectorStoreProvider', validProvider, 'vector store provider');
    }
  },

  // ============================================
  // Chat Preferences
  // ============================================

  setChatProvider: (provider: string | null) => {
    set({ chatProvider: provider });
  },

  setChatModel: (model: string | null) => {
    set({ chatModel: model });
  },

  // ============================================
  // Ollama Settings
  // ============================================

  setOllamaRemoteUrl: (url: string | null) => {
    set({ ollamaRemoteUrl: url });
    syncSettingDebounced(get, 'ollamaRemoteUrl', url);
  },

  setUseRemoteOllama: (enabled: boolean) => {
    set({ useRemoteOllama: enabled });
    syncSettingDebounced(get, 'useRemoteOllama', enabled);
  },

  // ============================================
  // RAG Reranking Settings
  // ============================================

  setRerankingProvider: async (provider: string | null, syncToBackend = true) => {
    set({ rerankingProvider: provider });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'rerankingProvider', provider, 'reranking provider');
    }
  },

  setRagRerankingModel: async (model: string | null, syncToBackend = true) => {
    set({ ragRerankingModel: model });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragRerankingModel', model, 'RAG reranking model');
    }
  },

  // ============================================
  // Note Summary Settings
  // ============================================

  setNoteSummaryEnabled: async (enabled: boolean, syncToBackend = true) => {
    set({ noteSummaryEnabled: enabled });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'noteSummaryEnabled', enabled, 'note summary enabled');
    }
  },

  setNoteSummaryProvider: async (provider: string | null, syncToBackend = true) => {
    set({ noteSummaryProvider: provider });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'noteSummaryProvider', provider, 'note summary provider');
    }
  },

  setNoteSummaryModel: async (model: string | null, syncToBackend = true) => {
    set({ noteSummaryModel: model });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'noteSummaryModel', model, 'note summary model');
    }
  },

  // ============================================
  // RAG Feature Toggles
  // ============================================

  setRagEnableHyde: async (enabled: boolean, syncToBackend = true) => {
    set({ ragEnableHyde: enabled });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragEnableHyde', enabled, 'RAG HyDE setting');
    }
  },

  setRagEnableQueryExpansion: async (enabled: boolean, syncToBackend = true) => {
    set({ ragEnableQueryExpansion: enabled });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragEnableQueryExpansion', enabled, 'RAG query expansion setting');
    }
  },

  setRagEnableHybridSearch: async (enabled: boolean, syncToBackend = true) => {
    set({ ragEnableHybridSearch: enabled });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragEnableHybridSearch', enabled, 'RAG hybrid search setting');
    }
  },

  setRagEnableReranking: async (enabled: boolean, syncToBackend = true) => {
    set({ ragEnableReranking: enabled });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragEnableReranking', enabled, 'RAG reranking setting');
    }
  },

  setRagEnableAnalytics: async (enabled: boolean, syncToBackend = true) => {
    set({ ragEnableAnalytics: enabled });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragEnableAnalytics', enabled, 'RAG analytics setting');
    }
  },

  // ============================================
  // HyDE Provider Settings
  // ============================================

  setRagHydeProvider: async (provider: string | null, syncToBackend = true) => {
    set({ ragHydeProvider: provider });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragHydeProvider', provider, 'RAG HyDE provider');
    }
  },

  setRagHydeModel: async (model: string | null, syncToBackend = true) => {
    set({ ragHydeModel: model });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragHydeModel', model, 'RAG HyDE model');
    }
  },

  // ============================================
  // Query Expansion Provider Settings
  // ============================================

  setRagQueryExpansionProvider: async (provider: string | null, syncToBackend = true) => {
    set({ ragQueryExpansionProvider: provider });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragQueryExpansionProvider', provider, 'RAG query expansion provider');
    }
  },

  setRagQueryExpansionModel: async (model: string | null, syncToBackend = true) => {
    set({ ragQueryExpansionModel: model });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragQueryExpansionModel', model, 'RAG query expansion model');
    }
  },

  // ============================================
  // RAG Advanced Settings - Tier 1: Core Retrieval
  // ============================================

  setRagTopK: async (value: number, syncToBackend = true) => {
    const validated = userPreferencesService.validateRagTopK(value);
    set({ ragTopK: validated });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragTopK', validated, 'RAG TopK setting');
    }
  },

  setRagSimilarityThreshold: async (value: number, syncToBackend = true) => {
    const validated = userPreferencesService.validateRagSimilarityThreshold(value);
    set({ ragSimilarityThreshold: validated });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragSimilarityThreshold', validated, 'RAG similarity threshold');
    }
  },

  setRagInitialRetrievalCount: async (value: number, syncToBackend = true) => {
    const validated = userPreferencesService.validateRagInitialRetrievalCount(value);
    set({ ragInitialRetrievalCount: validated });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragInitialRetrievalCount', validated, 'RAG initial retrieval count');
    }
  },

  setRagMinRerankScore: async (value: number, syncToBackend = true) => {
    const validated = userPreferencesService.validateRagMinRerankScore(value);
    set({ ragMinRerankScore: validated });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragMinRerankScore', validated, 'RAG min rerank score');
    }
  },

  // ============================================
  // RAG Advanced Settings - Tier 2: Hybrid Search
  // ============================================

  setRagVectorWeight: async (value: number, syncToBackend = true) => {
    const validated = userPreferencesService.validateRagWeight(value);
    set({ ragVectorWeight: validated });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragVectorWeight', validated, 'RAG vector weight');
    }
  },

  setRagBm25Weight: async (value: number, syncToBackend = true) => {
    const validated = userPreferencesService.validateRagWeight(value);
    set({ ragBm25Weight: validated });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragBm25Weight', validated, 'RAG BM25 weight');
    }
  },

  setRagMultiQueryCount: async (value: number, syncToBackend = true) => {
    const validated = userPreferencesService.validateRagMultiQueryCount(value);
    set({ ragMultiQueryCount: validated });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragMultiQueryCount', validated, 'RAG multi-query count');
    }
  },

  setRagMaxContextLength: async (value: number, syncToBackend = true) => {
    const validated = userPreferencesService.validateRagMaxContextLength(value);
    set({ ragMaxContextLength: validated });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragMaxContextLength', validated, 'RAG max context length');
    }
  },

  // RAG Embedding Settings
  setRagEmbeddingProvider: async (provider: string | null, syncToBackend = true) => {
    set({ ragEmbeddingProvider: provider });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragEmbeddingProvider', provider, 'RAG embedding provider');
    }
  },

  setRagEmbeddingModel: async (model: string | null, syncToBackend = true) => {
    set({ ragEmbeddingModel: model });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragEmbeddingModel', model, 'RAG embedding model');
    }
  },

  setRagEmbeddingDimensions: async (dimensions: number | null, syncToBackend = true) => {
    set({ ragEmbeddingDimensions: dimensions });

    if (syncToBackend) {
      await syncSettingImmediate(get, 'ragEmbeddingDimensions', dimensions, 'RAG embedding dimensions');
    }
  },

  // ============================================
  // Sync Actions
  // ============================================

  loadPreferencesFromBackend: async (userId: string) => {
    try {
      const preferences = await userPreferencesService.loadAndMergePreferences(userId);

      set({
        chatProvider: preferences.chatProvider,
        chatModel: preferences.chatModel,
        vectorStoreProvider: preferences.vectorStoreProvider,
        defaultNoteView: preferences.defaultNoteView,
        itemsPerPage: preferences.itemsPerPage,
        fontSize: preferences.fontSize,
        markdownRenderer: preferences.markdownRenderer,
        enableNotifications: preferences.enableNotifications,
        ollamaRemoteUrl: preferences.ollamaRemoteUrl,
        useRemoteOllama: preferences.useRemoteOllama,
        rerankingProvider: preferences.rerankingProvider,
        ragRerankingModel: preferences.ragRerankingModel,
        noteSummaryEnabled: preferences.noteSummaryEnabled,
        noteSummaryProvider: preferences.noteSummaryProvider,
        noteSummaryModel: preferences.noteSummaryModel,
        // RAG Feature Toggles
        ragEnableHyde: preferences.ragEnableHyde,
        ragEnableQueryExpansion: preferences.ragEnableQueryExpansion,
        ragEnableHybridSearch: preferences.ragEnableHybridSearch,
        ragEnableReranking: preferences.ragEnableReranking,
        ragEnableAnalytics: preferences.ragEnableAnalytics,
        // HyDE Provider Settings
        ragHydeProvider: preferences.ragHydeProvider,
        ragHydeModel: preferences.ragHydeModel,
        // Query Expansion Provider Settings
        ragQueryExpansionProvider: preferences.ragQueryExpansionProvider,
        ragQueryExpansionModel: preferences.ragQueryExpansionModel,
        // RAG Advanced Settings - Tier 1: Core Retrieval
        ragTopK: preferences.ragTopK,
        ragSimilarityThreshold: preferences.ragSimilarityThreshold,
        ragInitialRetrievalCount: preferences.ragInitialRetrievalCount,
        ragMinRerankScore: preferences.ragMinRerankScore,
        // RAG Advanced Settings - Tier 2: Hybrid Search
        ragVectorWeight: preferences.ragVectorWeight,
        ragBm25Weight: preferences.ragBm25Weight,
        ragMultiQueryCount: preferences.ragMultiQueryCount,
        ragMaxContextLength: preferences.ragMaxContextLength,
        // RAG Embedding Settings
        ragEmbeddingProvider: preferences.ragEmbeddingProvider,
        ragEmbeddingModel: preferences.ragEmbeddingModel,
        ragEmbeddingDimensions: preferences.ragEmbeddingDimensions,
      });
    } catch (error) {
      loggers.store.error('Failed to load preferences from backend:', { error });
    }
  },

  syncPreferencesToBackend: async (userId: string) => {
    const preferences = extractPreferences(get());

    try {
      await userPreferencesService.syncToBackend(userId, preferences);
    } catch (error) {
      loggers.store.error('Failed to sync preferences to backend:', { error });
      throw error;
    }
  },

  // ============================================
  // Reset
  // ============================================

  resetSettings: () => {
    set({
      ...DEFAULT_PREFERENCES,
      autoSaveInterval: 2000,
    });
  },
});

/**
 * Extract preferences from store state for syncing
 */
function extractPreferences(state: SettingsSlice): UserPreferences {
  return {
    chatProvider: state.chatProvider,
    chatModel: state.chatModel,
    vectorStoreProvider: state.vectorStoreProvider,
    defaultNoteView: state.defaultNoteView,
    itemsPerPage: state.itemsPerPage,
    fontSize: state.fontSize,
    markdownRenderer: state.markdownRenderer,
    enableNotifications: state.enableNotifications,
    ollamaRemoteUrl: state.ollamaRemoteUrl,
    useRemoteOllama: state.useRemoteOllama,
    rerankingProvider: state.rerankingProvider,
    ragRerankingModel: state.ragRerankingModel,
    noteSummaryEnabled: state.noteSummaryEnabled,
    noteSummaryProvider: state.noteSummaryProvider,
    noteSummaryModel: state.noteSummaryModel,
    // RAG Feature Toggles
    ragEnableHyde: state.ragEnableHyde,
    ragEnableQueryExpansion: state.ragEnableQueryExpansion,
    ragEnableHybridSearch: state.ragEnableHybridSearch,
    ragEnableReranking: state.ragEnableReranking,
    ragEnableAnalytics: state.ragEnableAnalytics,
    // HyDE Provider Settings
    ragHydeProvider: state.ragHydeProvider,
    ragHydeModel: state.ragHydeModel,
    // Query Expansion Provider Settings
    ragQueryExpansionProvider: state.ragQueryExpansionProvider,
    ragQueryExpansionModel: state.ragQueryExpansionModel,
    // RAG Advanced Settings - Tier 1: Core Retrieval
    ragTopK: state.ragTopK,
    ragSimilarityThreshold: state.ragSimilarityThreshold,
    ragInitialRetrievalCount: state.ragInitialRetrievalCount,
    ragMinRerankScore: state.ragMinRerankScore,
    // RAG Advanced Settings - Tier 2: Hybrid Search
    ragVectorWeight: state.ragVectorWeight,
    ragBm25Weight: state.ragBm25Weight,
    ragMultiQueryCount: state.ragMultiQueryCount,
    ragMaxContextLength: state.ragMaxContextLength,
    // RAG Embedding Settings
    ragEmbeddingProvider: state.ragEmbeddingProvider,
    ragEmbeddingModel: state.ragEmbeddingModel,
    ragEmbeddingDimensions: state.ragEmbeddingDimensions,
  };
}
