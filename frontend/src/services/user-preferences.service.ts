/**
 * User Preferences Service
 * Handles user preferences synchronization and validation
 */

import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS, STORAGE_KEYS } from '../lib/constants';
import type {
  UserPreferences,
  UpdateUserPreferencesRequest,
} from '../types/auth';
import type { VectorStoreProvider } from '../types/rag';

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
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
  // RAG Feature Toggles
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
};

/**
 * User preferences service
 */
export const userPreferencesService = {
  /**
   * Get user preferences from backend
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    return apiClient.get<UserPreferences>(API_ENDPOINTS.USER_PREFERENCES.BY_USER(userId));
  },

  /**
   * Update user preferences on backend
   */
  async updatePreferences(
    userId: string,
    preferences: UpdateUserPreferencesRequest
  ): Promise<UserPreferences> {
    return apiClient.put<UserPreferences>(
      API_ENDPOINTS.USER_PREFERENCES.BY_USER(userId),
      preferences
    );
  },

  // ============================================
  // Validation Functions
  // ============================================

  /**
   * Validate vector store provider
   */
  validateVectorStoreProvider(provider: string): VectorStoreProvider {
    if (provider === 'PostgreSQL' || provider === 'Pinecone') {
      return provider;
    }
    throw new Error(`Invalid vector store provider: ${provider}. Must be 'PostgreSQL' or 'Pinecone'.`);
  },

  /**
   * Validate note view preference
   */
  validateNoteView(view: string): 'list' | 'grid' {
    return view === 'grid' ? 'grid' : 'list';
  },

  /**
   * Validate font size preference
   */
  validateFontSize(size: string): 'small' | 'medium' | 'large' {
    if (['small', 'medium', 'large'].includes(size)) {
      return size as 'small' | 'medium' | 'large';
    }
    return 'medium';
  },

  /**
   * Validate items per page
   */
  validateItemsPerPage(count: number): number {
    if (typeof count === 'number' && count > 0 && count <= 100) {
      return count;
    }
    return 20;
  },

  /**
   * Validate and sanitize preferences from backend
   */
  validatePreferences(
    preferences: Partial<UserPreferences>,
    currentPreferences: UserPreferences = DEFAULT_PREFERENCES
  ): UserPreferences {
    return {
      chatProvider: preferences.chatProvider ?? currentPreferences.chatProvider,
      chatModel: preferences.chatModel ?? currentPreferences.chatModel,
      vectorStoreProvider: this.validateVectorStoreProvider(
        preferences.vectorStoreProvider || currentPreferences.vectorStoreProvider
      ),
      defaultNoteView: this.validateNoteView(
        preferences.defaultNoteView || currentPreferences.defaultNoteView
      ),
      itemsPerPage: this.validateItemsPerPage(
        preferences.itemsPerPage ?? currentPreferences.itemsPerPage
      ),
      fontSize: this.validateFontSize(
        preferences.fontSize || currentPreferences.fontSize
      ),
      enableNotifications:
        typeof preferences.enableNotifications === 'boolean'
          ? preferences.enableNotifications
          : currentPreferences.enableNotifications,
      ollamaRemoteUrl: preferences.ollamaRemoteUrl ?? currentPreferences.ollamaRemoteUrl,
      useRemoteOllama:
        typeof preferences.useRemoteOllama === 'boolean'
          ? preferences.useRemoteOllama
          : currentPreferences.useRemoteOllama,
      rerankingProvider: preferences.rerankingProvider ?? currentPreferences.rerankingProvider,
      noteSummaryEnabled:
        typeof preferences.noteSummaryEnabled === 'boolean'
          ? preferences.noteSummaryEnabled
          : currentPreferences.noteSummaryEnabled,
      noteSummaryProvider: preferences.noteSummaryProvider ?? currentPreferences.noteSummaryProvider,
      noteSummaryModel: preferences.noteSummaryModel ?? currentPreferences.noteSummaryModel,
      // RAG Feature Toggles
      ragEnableHyde:
        typeof preferences.ragEnableHyde === 'boolean'
          ? preferences.ragEnableHyde
          : currentPreferences.ragEnableHyde,
      ragEnableQueryExpansion:
        typeof preferences.ragEnableQueryExpansion === 'boolean'
          ? preferences.ragEnableQueryExpansion
          : currentPreferences.ragEnableQueryExpansion,
      ragEnableHybridSearch:
        typeof preferences.ragEnableHybridSearch === 'boolean'
          ? preferences.ragEnableHybridSearch
          : currentPreferences.ragEnableHybridSearch,
      ragEnableReranking:
        typeof preferences.ragEnableReranking === 'boolean'
          ? preferences.ragEnableReranking
          : currentPreferences.ragEnableReranking,
      ragEnableAnalytics:
        typeof preferences.ragEnableAnalytics === 'boolean'
          ? preferences.ragEnableAnalytics
          : currentPreferences.ragEnableAnalytics,
      // RAG Advanced Settings - Tier 1: Core Retrieval
      ragTopK: this.validateRagTopK(preferences.ragTopK ?? currentPreferences.ragTopK),
      ragSimilarityThreshold: this.validateRagSimilarityThreshold(
        preferences.ragSimilarityThreshold ?? currentPreferences.ragSimilarityThreshold
      ),
      ragInitialRetrievalCount: this.validateRagInitialRetrievalCount(
        preferences.ragInitialRetrievalCount ?? currentPreferences.ragInitialRetrievalCount
      ),
      ragMinRerankScore: this.validateRagMinRerankScore(
        preferences.ragMinRerankScore ?? currentPreferences.ragMinRerankScore
      ),
      // RAG Advanced Settings - Tier 2: Hybrid Search
      ragVectorWeight: this.validateRagWeight(
        preferences.ragVectorWeight ?? currentPreferences.ragVectorWeight
      ),
      ragBm25Weight: this.validateRagWeight(
        preferences.ragBm25Weight ?? currentPreferences.ragBm25Weight
      ),
      ragMultiQueryCount: this.validateRagMultiQueryCount(
        preferences.ragMultiQueryCount ?? currentPreferences.ragMultiQueryCount
      ),
      ragMaxContextLength: this.validateRagMaxContextLength(
        preferences.ragMaxContextLength ?? currentPreferences.ragMaxContextLength
      ),
    };
  },

  // ============================================
  // RAG Advanced Settings Validation
  // ============================================

  /**
   * Validate RAG TopK (1-20)
   */
  validateRagTopK(value: number): number {
    if (typeof value === 'number' && value >= 1 && value <= 20) {
      return Math.round(value);
    }
    return 5;
  },

  /**
   * Validate RAG Similarity Threshold (0.1-0.9)
   */
  validateRagSimilarityThreshold(value: number): number {
    if (typeof value === 'number' && value >= 0.1 && value <= 0.9) {
      return Math.round(value * 100) / 100; // 2 decimal places
    }
    return 0.3;
  },

  /**
   * Validate RAG Initial Retrieval Count (10-50)
   */
  validateRagInitialRetrievalCount(value: number): number {
    if (typeof value === 'number' && value >= 10 && value <= 50) {
      return Math.round(value);
    }
    return 20;
  },

  /**
   * Validate RAG Min Rerank Score (0-10)
   */
  validateRagMinRerankScore(value: number): number {
    if (typeof value === 'number' && value >= 0 && value <= 10) {
      return Math.round(value * 10) / 10; // 1 decimal place
    }
    return 3.0;
  },

  /**
   * Validate RAG Weight (0-1)
   */
  validateRagWeight(value: number): number {
    if (typeof value === 'number' && value >= 0 && value <= 1) {
      return Math.round(value * 100) / 100; // 2 decimal places
    }
    return 0.5;
  },

  /**
   * Validate RAG Multi-Query Count (1-5)
   */
  validateRagMultiQueryCount(value: number): number {
    if (typeof value === 'number' && value >= 1 && value <= 5) {
      return Math.round(value);
    }
    return 3;
  },

  /**
   * Validate RAG Max Context Length (1000-16000)
   */
  validateRagMaxContextLength(value: number): number {
    if (typeof value === 'number' && value >= 1000 && value <= 16000) {
      return Math.round(value);
    }
    return 4000;
  },

  // ============================================
  // Local Storage Functions
  // ============================================

  /**
   * Get preferences from local storage
   */
  getLocalPreferences(): Partial<UserPreferences> | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  /**
   * Save preferences to local storage
   */
  saveLocalPreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences to local storage:', { error });
    }
  },

  /**
   * Clear local preferences
   */
  clearLocalPreferences(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch {
      // Ignore errors
    }
  },

  /**
   * Get user ID from auth storage
   */
  getUserIdFromStorage(): string | null {
    try {
      const authState = localStorage.getItem(STORAGE_KEYS.AUTH);
      if (!authState) return null;
      const parsed = JSON.parse(authState);
      return parsed?.state?.user?.userId || null;
    } catch {
      return null;
    }
  },

  // ============================================
  // Sync Functions
  // ============================================

  /**
   * Load preferences from backend and merge with local
   */
  async loadAndMergePreferences(userId: string): Promise<UserPreferences> {
    try {
      const backendPrefs = await this.getPreferences(userId);
      const localPrefs = this.getLocalPreferences();

      // Backend takes precedence, but local fills in gaps
      const merged = this.validatePreferences({
        ...localPrefs,
        ...backendPrefs,
      });

      // Save merged preferences locally
      this.saveLocalPreferences(merged);

      return merged;
    } catch (error) {
      console.error('Failed to load preferences from backend:', { error });

      // Fall back to local or defaults
      const localPrefs = this.getLocalPreferences();
      return this.validatePreferences(localPrefs || {});
    }
  },

  /**
   * Sync local preferences to backend
   */
  async syncToBackend(userId: string, preferences: UserPreferences): Promise<void> {
    try {
      await this.updatePreferences(userId, preferences);
    } catch (error) {
      console.error('Failed to sync preferences to backend:', { error });
      throw error;
    }
  },

  /**
   * Create debounced sync function
   */
  createDebouncedSync(delay = 1000): (userId: string, preferences: UserPreferences) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (userId: string, preferences: UserPreferences) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        this.syncToBackend(userId, preferences).catch(console.error);
      }, delay);
    };
  },
};

