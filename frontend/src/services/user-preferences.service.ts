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
    // Migration from old value
    if (provider === 'Firestore') {
      return 'PostgreSQL';
    }
    return 'PostgreSQL';
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
    };
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

