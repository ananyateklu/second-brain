import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/api-client';

type NoteView = 'list' | 'grid';
type VectorStoreProvider = 'PostgreSQL' | 'Pinecone';

interface SettingsState {
  // General Preferences
  defaultNoteView: NoteView;
  itemsPerPage: number;
  autoSaveInterval: number; // in milliseconds
  enableNotifications: boolean;
  fontSize: 'small' | 'medium' | 'large';
  // RAG Settings
  vectorStoreProvider: VectorStoreProvider;
  // Chat Preferences
  chatProvider: string | null;
  chatModel: string | null;
  // Ollama Settings
  ollamaRemoteUrl: string | null;
  useRemoteOllama: boolean;
}

interface SettingsActions {
  setDefaultNoteView: (view: NoteView) => void;
  setItemsPerPage: (count: number) => void;
  setAutoSaveInterval: (interval: number) => void;
  setEnableNotifications: (enabled: boolean) => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setVectorStoreProvider: (provider: VectorStoreProvider, syncToBackend?: boolean) => Promise<void>;
  setChatProvider: (provider: string | null) => void;
  setChatModel: (model: string | null) => void;
  setOllamaRemoteUrl: (url: string | null) => void;
  setUseRemoteOllama: (enabled: boolean) => void;
  loadPreferencesFromBackend: (userId: string) => Promise<void>;
  syncPreferencesToBackend: (userId: string) => Promise<void>;
  resetSettings: () => void;
}

type SettingsStore = SettingsState & SettingsActions;

const SETTINGS_STORAGE_KEY = 'second-brain-settings';

const DEFAULT_SETTINGS: SettingsState = {
  defaultNoteView: 'list',
  itemsPerPage: 20,
  autoSaveInterval: 2000, // 2 seconds
  enableNotifications: true,
  fontSize: 'medium',
  vectorStoreProvider: 'PostgreSQL',
  chatProvider: null,
  chatModel: null,
  ollamaRemoteUrl: null,
  useRemoteOllama: false,
};

// Helper function to get userId from auth store
const getUserId = (): string | null => {
  try {
    const authState = localStorage.getItem('auth-storage');
    if (!authState) return null;
    const parsed = JSON.parse(authState);
    return parsed?.state?.user?.userId || null;
  } catch {
    return null;
  }
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      setDefaultNoteView: (view) => {
        set({ defaultNoteView: view });
        const userId = getUserId();
        if (userId) {
          get().syncPreferencesToBackend(userId).catch(console.error);
        }
      },

      setItemsPerPage: (count) => {
        set({ itemsPerPage: count });
        const userId = getUserId();
        if (userId) {
          get().syncPreferencesToBackend(userId).catch(console.error);
        }
      },

      setAutoSaveInterval: (interval) => set({ autoSaveInterval: interval }),

      setEnableNotifications: (enabled) => {
        set({ enableNotifications: enabled });
        const userId = getUserId();
        if (userId) {
          get().syncPreferencesToBackend(userId).catch(console.error);
        }
      },

      setFontSize: (size) => {
        set({ fontSize: size });
        const userId = getUserId();
        if (userId) {
          get().syncPreferencesToBackend(userId).catch(console.error);
        }
      },

      setVectorStoreProvider: async (provider, syncToBackend = true) => {
        set({ vectorStoreProvider: provider });

        // Sync to backend if requested
        if (syncToBackend) {
          const { syncPreferencesToBackend } = get();
          const userId = getUserId();
          if (userId) {
            try {
              await syncPreferencesToBackend(userId);
            } catch (error) {
              console.error('Failed to sync vector store provider to backend:', error);
            }
          }
        }
      },

      setChatProvider: (provider) => set({ chatProvider: provider }),
      setChatModel: (model) => set({ chatModel: model }),

      setOllamaRemoteUrl: (url) => {
        set({ ollamaRemoteUrl: url });
        const userId = getUserId();
        if (userId) {
          get().syncPreferencesToBackend(userId).catch(console.error);
        }
      },

      setUseRemoteOllama: (enabled) => {
        set({ useRemoteOllama: enabled });
        const userId = getUserId();
        if (userId) {
          get().syncPreferencesToBackend(userId).catch(console.error);
        }
      },

      loadPreferencesFromBackend: async (userId: string) => {
        try {
          console.log('Loading preferences from backend for user:', userId);
          const preferences = await apiClient.get<{
            chatProvider: string | null;
            chatModel: string | null;
            vectorStoreProvider: string;
            defaultNoteView: string;
            itemsPerPage: number;
            fontSize: string;
            enableNotifications: boolean;
            ollamaRemoteUrl: string | null;
            useRemoteOllama: boolean;
          }>(`/userpreferences/${userId}`);

          console.log('Loaded preferences from backend:', preferences);

          // Validate and sanitize incoming data to prevent rendering issues
          const currentState = get();
          
          // Validate vectorStoreProvider
          let validatedVectorStore: VectorStoreProvider = currentState.vectorStoreProvider;
          if (preferences.vectorStoreProvider === 'PostgreSQL' || preferences.vectorStoreProvider === 'Pinecone') {
            validatedVectorStore = preferences.vectorStoreProvider;
          } else if (preferences.vectorStoreProvider === 'Firestore') {
            // Migration from old value
            validatedVectorStore = 'PostgreSQL';
          }

          // Validate defaultNoteView
          const validatedNoteView: NoteView = 
            preferences.defaultNoteView === 'grid' ? 'grid' : 'list';

          // Validate fontSize
          const validatedFontSize: 'small' | 'medium' | 'large' = 
            ['small', 'medium', 'large'].includes(preferences.fontSize) 
              ? (preferences.fontSize as 'small' | 'medium' | 'large')
              : currentState.fontSize;

          // Validate itemsPerPage
          const validatedItemsPerPage = 
            typeof preferences.itemsPerPage === 'number' && preferences.itemsPerPage > 0
              ? preferences.itemsPerPage
              : currentState.itemsPerPage;

          set({
            chatProvider: preferences.chatProvider ?? null,
            chatModel: preferences.chatModel ?? null,
            vectorStoreProvider: validatedVectorStore,
            defaultNoteView: validatedNoteView,
            itemsPerPage: validatedItemsPerPage,
            fontSize: validatedFontSize,
            enableNotifications: typeof preferences.enableNotifications === 'boolean' 
              ? preferences.enableNotifications 
              : currentState.enableNotifications,
            ollamaRemoteUrl: preferences.ollamaRemoteUrl ?? null,
            useRemoteOllama: typeof preferences.useRemoteOllama === 'boolean'
              ? preferences.useRemoteOllama
              : currentState.useRemoteOllama,
          });
        } catch (error) {
          console.error('Failed to load preferences from backend:', { error });
        }
      },

      syncPreferencesToBackend: async (userId: string) => {
        try {
          const state = get();
          const payload = {
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

          console.log('Syncing preferences to backend:', payload);
          const response = await apiClient.put(`/userpreferences/${userId}`, payload);
          console.log('Preferences synced successfully:', response);
        } catch (error) {
          console.error('Failed to sync preferences to backend:', error);
          throw error;
        }
      },

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      merge: (persistedState, currentState) => {
        const parsed = persistedState as Partial<SettingsState>;
        // Migration: convert old 'Firestore' value to 'PostgreSQL'
        let vectorStoreProvider = parsed.vectorStoreProvider;
        if (vectorStoreProvider === 'Firestore' as unknown as VectorStoreProvider) {
          vectorStoreProvider = 'PostgreSQL';
        }
        return {
          ...currentState,
          ...parsed,
          // Ensure valid values (migration/validation logic)
          defaultNoteView: parsed.defaultNoteView === 'grid' ? 'grid' : 'list',
          itemsPerPage:
            typeof parsed.itemsPerPage === 'number' && parsed.itemsPerPage > 0
              ? parsed.itemsPerPage
              : currentState.itemsPerPage,
          autoSaveInterval:
            typeof parsed.autoSaveInterval === 'number' &&
              parsed.autoSaveInterval > 0
              ? parsed.autoSaveInterval
              : currentState.autoSaveInterval,
          enableNotifications:
            typeof parsed.enableNotifications === 'boolean'
              ? parsed.enableNotifications
              : currentState.enableNotifications,
          fontSize:
            parsed.fontSize && ['small', 'medium', 'large'].includes(parsed.fontSize)
              ? (parsed.fontSize as 'small' | 'medium' | 'large')
              : currentState.fontSize,
          vectorStoreProvider:
            vectorStoreProvider === 'Pinecone' || vectorStoreProvider === 'PostgreSQL'
              ? vectorStoreProvider
              : currentState.vectorStoreProvider,
          chatProvider: parsed.chatProvider ?? null,
          chatModel: parsed.chatModel ?? null,
          ollamaRemoteUrl: parsed.ollamaRemoteUrl ?? null,
          useRemoteOllama:
            typeof parsed.useRemoteOllama === 'boolean'
              ? parsed.useRemoteOllama
              : currentState.useRemoteOllama,
        };
      },
    }
  )
);
