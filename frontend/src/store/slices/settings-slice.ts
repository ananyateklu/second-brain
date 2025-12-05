/**
 * Settings Slice
 * Manages user preferences and settings
 */

// Import directly to avoid circular deps through services barrel export
import { userPreferencesService, DEFAULT_PREFERENCES } from '../../services/user-preferences.service';
import type { UserPreferences } from '../../types/auth';
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

export const createSettingsSlice: SliceCreator<SettingsSlice> = (set, get) => ({
  // Initial state from defaults
  ...DEFAULT_PREFERENCES,
  autoSaveInterval: 2000,

  // ============================================
  // General Preferences
  // ============================================

  setDefaultNoteView: (view: NoteView) => {
    set({ defaultNoteView: view });
    const userId = getUserId();
    if (userId) {
      debouncedSync(userId, { ...extractPreferences(get()), defaultNoteView: view });
    }
  },

  setItemsPerPage: (count: number) => {
    const validCount = userPreferencesService.validateItemsPerPage(count);
    set({ itemsPerPage: validCount });
    const userId = getUserId();
    if (userId) {
      debouncedSync(userId, { ...extractPreferences(get()), itemsPerPage: validCount });
    }
  },

  setAutoSaveInterval: (interval: number) => {
    set({ autoSaveInterval: interval });
  },

  setEnableNotifications: (enabled: boolean) => {
    set({ enableNotifications: enabled });
    const userId = getUserId();
    if (userId) {
      debouncedSync(userId, { ...extractPreferences(get()), enableNotifications: enabled });
    }
  },

  setFontSize: (size: FontSize) => {
    const validSize = userPreferencesService.validateFontSize(size);
    set({ fontSize: validSize });
    const userId = getUserId();
    if (userId) {
      debouncedSync(userId, { ...extractPreferences(get()), fontSize: validSize });
    }
  },

  // ============================================
  // RAG Settings
  // ============================================

  setVectorStoreProvider: async (provider: VectorStoreProvider, syncToBackend = true) => {
    const validProvider = userPreferencesService.validateVectorStoreProvider(provider);
    set({ vectorStoreProvider: validProvider });

    if (syncToBackend) {
      const userId = getUserId();
      if (userId) {
        try {
          await userPreferencesService.syncToBackend(userId, {
            ...extractPreferences(get()),
            vectorStoreProvider: validProvider,
          });
        } catch (error) {
          console.error('Failed to sync vector store provider to backend:', { error });
        }
      }
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
    const userId = getUserId();
    if (userId) {
      debouncedSync(userId, { ...extractPreferences(get()), ollamaRemoteUrl: url });
    }
  },

  setUseRemoteOllama: (enabled: boolean) => {
    set({ useRemoteOllama: enabled });
    const userId = getUserId();
    if (userId) {
      debouncedSync(userId, { ...extractPreferences(get()), useRemoteOllama: enabled });
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
        enableNotifications: preferences.enableNotifications,
        ollamaRemoteUrl: preferences.ollamaRemoteUrl,
        useRemoteOllama: preferences.useRemoteOllama,
      });
    } catch (error) {
      console.error('Failed to load preferences from backend:', { error });
    }
  },

  syncPreferencesToBackend: async (userId: string) => {
    const preferences = extractPreferences(get());

    try {
      await userPreferencesService.syncToBackend(userId, preferences);
    } catch (error) {
      console.error('Failed to sync preferences to backend:', { error });
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
    enableNotifications: state.enableNotifications,
    ollamaRemoteUrl: state.ollamaRemoteUrl,
    useRemoteOllama: state.useRemoteOllama,
  };
}
