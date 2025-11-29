/**
 * Settings Store
 * Manages user preferences with service layer integration
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userPreferencesService, DEFAULT_PREFERENCES } from '../services';
import { STORAGE_KEYS } from '../lib/constants';
import type { UserPreferences } from '../types/auth';
import type { VectorStoreProvider } from '../types/rag';

// ============================================
// Store Types
// ============================================

type NoteView = 'list' | 'grid';
type FontSize = 'small' | 'medium' | 'large';

interface SettingsState extends UserPreferences {
  // Additional local settings not synced to backend
  autoSaveInterval: number;
}

interface SettingsActions {
  // General preferences
  setDefaultNoteView: (view: NoteView) => void;
  setItemsPerPage: (count: number) => void;
  setAutoSaveInterval: (interval: number) => void;
  setEnableNotifications: (enabled: boolean) => void;
  setFontSize: (size: FontSize) => void;
  
  // RAG settings
  setVectorStoreProvider: (provider: VectorStoreProvider, syncToBackend?: boolean) => Promise<void>;
  
  // Chat preferences
  setChatProvider: (provider: string | null) => void;
  setChatModel: (model: string | null) => void;
  
  // Ollama settings
  setOllamaRemoteUrl: (url: string | null) => void;
  setUseRemoteOllama: (enabled: boolean) => void;
  
  // Sync actions
  loadPreferencesFromBackend: (userId: string) => Promise<void>;
  syncPreferencesToBackend: (userId: string) => Promise<void>;
  
  // Reset
  resetSettings: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

// ============================================
// Helper Functions
// ============================================

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

// ============================================
// Store Implementation
// ============================================

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...DEFAULT_PREFERENCES,
      autoSaveInterval: 2000,

      // ============================================
      // General Preferences
      // ============================================

      setDefaultNoteView: (view) => {
        set({ defaultNoteView: view });
        const userId = getUserId();
        if (userId) {
          debouncedSync(userId, { ...get(), defaultNoteView: view });
        }
      },

      setItemsPerPage: (count) => {
        const validCount = userPreferencesService.validateItemsPerPage(count);
        set({ itemsPerPage: validCount });
        const userId = getUserId();
        if (userId) {
          debouncedSync(userId, { ...get(), itemsPerPage: validCount });
        }
      },

      setAutoSaveInterval: (interval) => {
        set({ autoSaveInterval: interval });
      },

      setEnableNotifications: (enabled) => {
        set({ enableNotifications: enabled });
        const userId = getUserId();
        if (userId) {
          debouncedSync(userId, { ...get(), enableNotifications: enabled });
        }
      },

      setFontSize: (size) => {
        const validSize = userPreferencesService.validateFontSize(size);
        set({ fontSize: validSize });
        const userId = getUserId();
        if (userId) {
          debouncedSync(userId, { ...get(), fontSize: validSize });
        }
      },

      // ============================================
      // RAG Settings
      // ============================================

      setVectorStoreProvider: async (provider, syncToBackend = true) => {
        const validProvider = userPreferencesService.validateVectorStoreProvider(provider);
        set({ vectorStoreProvider: validProvider });

        if (syncToBackend) {
          const userId = getUserId();
          if (userId) {
            try {
              await userPreferencesService.syncToBackend(userId, {
                ...get(),
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

      setChatProvider: (provider) => {
        set({ chatProvider: provider });
      },

      setChatModel: (model) => {
        set({ chatModel: model });
      },

      // ============================================
      // Ollama Settings
      // ============================================

      setOllamaRemoteUrl: (url) => {
        set({ ollamaRemoteUrl: url });
        const userId = getUserId();
        if (userId) {
          debouncedSync(userId, { ...get(), ollamaRemoteUrl: url });
        }
      },

      setUseRemoteOllama: (enabled) => {
        set({ useRemoteOllama: enabled });
        const userId = getUserId();
        if (userId) {
          debouncedSync(userId, { ...get(), useRemoteOllama: enabled });
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
        const state = get();
        const preferences: UserPreferences = {
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
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      merge: (persistedState, currentState): SettingsStore => {
        const parsed = persistedState as Partial<SettingsState>;
        const validatedState = userPreferencesService.validatePreferences(
          {
            ...currentState,
            ...parsed,
          },
          DEFAULT_PREFERENCES
        );
        return {
          ...currentState,
          ...validatedState,
          autoSaveInterval: parsed.autoSaveInterval ?? currentState.autoSaveInterval,
        };
      },
    }
  )
);

// ============================================
// Selectors
// ============================================

/**
 * Select note view preference
 */
export const selectNoteView = (state: SettingsStore) => state.defaultNoteView;

/**
 * Select items per page
 */
export const selectItemsPerPage = (state: SettingsStore) => state.itemsPerPage;

/**
 * Select font size
 */
export const selectFontSize = (state: SettingsStore) => state.fontSize;

/**
 * Select vector store provider
 */
export const selectVectorStoreProvider = (state: SettingsStore) => state.vectorStoreProvider;

/**
 * Select chat provider
 */
export const selectChatProvider = (state: SettingsStore) => state.chatProvider;

/**
 * Select chat model
 */
export const selectChatModel = (state: SettingsStore) => state.chatModel;

/**
 * Select Ollama remote URL
 */
export const selectOllamaRemoteUrl = (state: SettingsStore) => state.ollamaRemoteUrl;

/**
 * Select use remote Ollama
 */
export const selectUseRemoteOllama = (state: SettingsStore) => state.useRemoteOllama;

/**
 * Select notifications enabled
 */
export const selectNotificationsEnabled = (state: SettingsStore) => state.enableNotifications;

// ============================================
// Selector Hooks
// ============================================

/**
 * Hook to get note view setting
 */
export const useNoteView = () => useSettingsStore(selectNoteView);

/**
 * Hook to get vector store provider
 */
export const useVectorStoreProvider = () => useSettingsStore(selectVectorStoreProvider);

/**
 * Hook to get chat preferences
 */
export const useChatPreferences = () =>
  useSettingsStore((state) => ({
    provider: state.chatProvider,
    model: state.chatModel,
  }));

/**
 * Hook to get Ollama settings
 */
export const useOllamaSettings = () =>
  useSettingsStore((state) => ({
    remoteUrl: state.ollamaRemoteUrl,
    useRemote: state.useRemoteOllama,
  }));

/**
 * Hook to get settings actions only
 */
export const useSettingsActions = () =>
  useSettingsStore((state) => ({
    setDefaultNoteView: state.setDefaultNoteView,
    setItemsPerPage: state.setItemsPerPage,
    setFontSize: state.setFontSize,
    setVectorStoreProvider: state.setVectorStoreProvider,
    setChatProvider: state.setChatProvider,
    setChatModel: state.setChatModel,
    setOllamaRemoteUrl: state.setOllamaRemoteUrl,
    setUseRemoteOllama: state.setUseRemoteOllama,
    resetSettings: state.resetSettings,
  }));
