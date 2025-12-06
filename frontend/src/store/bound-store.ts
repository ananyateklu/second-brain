/**
 * Bound Store Creation
 * Creates the unified store from all slices.
 * This file is isolated to prevent circular dependencies.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../lib/constants';
import type { BoundStore, NoteView, FontSize, Theme } from './types';
import type { VectorStoreProvider } from '../types/rag';
import { registerStore } from './store-registry';

// Import slice creators directly to avoid circular deps through services/index
import { createAuthSlice } from './slices/auth-slice';
import { createSettingsSlice } from './slices/settings-slice';
import { createUISlice } from './slices/ui-slice';
import { createThemeSlice } from './slices/theme-slice';
import { createOllamaSlice } from './slices/ollama-slice';
import { createNotesSlice } from './slices/notes-slice';
import { createRagAnalyticsSlice } from './slices/rag-analytics-slice';

// ============================================
// Combined Store
// ============================================

const _useBoundStore = create<BoundStore>()(
  persist(
    (...args) => ({
      ...createAuthSlice(...args),
      ...createSettingsSlice(...args),
      ...createUISlice(...args),
      ...createThemeSlice(...args),
      ...createOllamaSlice(...args),
      ...createNotesSlice(...args),
      ...createRagAnalyticsSlice(...args),
    }),
    {
      name: STORAGE_KEYS.AUTH, // Use auth key for backward compatibility
      partialize: (state) => ({
        // Auth state
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        // Settings state
        chatProvider: state.chatProvider,
        chatModel: state.chatModel,
        vectorStoreProvider: state.vectorStoreProvider,
        defaultNoteView: state.defaultNoteView,
        itemsPerPage: state.itemsPerPage,
        fontSize: state.fontSize,
        enableNotifications: state.enableNotifications,
        ollamaRemoteUrl: state.ollamaRemoteUrl,
        useRemoteOllama: state.useRemoteOllama,
        autoSaveInterval: state.autoSaveInterval,
        // Theme state
        theme: state.theme,
        // Notes state
        filterState: state.filterState,
      }),
      merge: (persistedState, currentState) => {
        const parsed = persistedState as Partial<BoundStore> | undefined;
        if (parsed === undefined) return currentState;

        // Validate NoteView - check if value exists and is valid
        const validNoteViews: NoteView[] = ['list', 'grid'];
        const parsedNoteView = parsed.defaultNoteView;
        const defaultNoteView: NoteView = parsedNoteView !== undefined && validNoteViews.includes(parsedNoteView)
          ? parsedNoteView
          : currentState.defaultNoteView;

        // Validate FontSize - check if value exists and is valid
        const validFontSizes: FontSize[] = ['small', 'medium', 'large'];
        const parsedFontSize = parsed.fontSize;
        const fontSize: FontSize = parsedFontSize !== undefined && validFontSizes.includes(parsedFontSize)
          ? parsedFontSize
          : currentState.fontSize;

        // Validate VectorStoreProvider - use explicit assertion since persisted state is unknown
        let vectorStoreProvider: VectorStoreProvider = currentState.vectorStoreProvider;
        const parsedProvider = parsed.vectorStoreProvider;
        if (parsedProvider === 'PostgreSQL' || parsedProvider === 'Pinecone') {
          vectorStoreProvider = parsedProvider;
        }

        // Validate Theme - check if value exists and is valid
        const validThemes: Theme[] = ['light', 'dark', 'blue'];
        const parsedTheme = parsed.theme;
        const theme: Theme = parsedTheme !== undefined && validThemes.includes(parsedTheme)
          ? parsedTheme
          : currentState.theme;

        return {
          ...currentState,
          // Merge auth state
          user: parsed.user ?? currentState.user,
          token: parsed.token ?? currentState.token,
          isAuthenticated: parsed.isAuthenticated ?? currentState.isAuthenticated,
          // Merge validated settings
          chatProvider: parsed.chatProvider ?? currentState.chatProvider,
          chatModel: parsed.chatModel ?? currentState.chatModel,
          vectorStoreProvider,
          defaultNoteView,
          itemsPerPage: typeof parsed.itemsPerPage === 'number' ? parsed.itemsPerPage : currentState.itemsPerPage,
          fontSize,
          enableNotifications: typeof parsed.enableNotifications === 'boolean' ? parsed.enableNotifications : currentState.enableNotifications,
          ollamaRemoteUrl: parsed.ollamaRemoteUrl ?? currentState.ollamaRemoteUrl,
          useRemoteOllama: typeof parsed.useRemoteOllama === 'boolean' ? parsed.useRemoteOllama : currentState.useRemoteOllama,
          autoSaveInterval: typeof parsed.autoSaveInterval === 'number' ? parsed.autoSaveInterval : currentState.autoSaveInterval,
          // Merge theme
          theme,
          // Merge notes state
          filterState: parsed.filterState ? { ...currentState.filterState, ...parsed.filterState } : currentState.filterState,
        };
      },
    }
  )
);

// Register the store in the registry for lazy access
registerStore(_useBoundStore);

// Export the store
export const useBoundStore = _useBoundStore;
