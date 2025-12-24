/**
 * Bound Store Creation
 * Creates the unified store from all slices.
 * This file is isolated to prevent circular dependencies.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../lib/constants';
import type { BoundStore, NoteView, FontSize, Theme } from './types';
import { registerStore } from './store-registry';

// Import slice creators directly to avoid circular deps through services/index
import { createAuthSlice } from './slices/auth-slice';
import { createSettingsSlice } from './slices/settings-slice';
import { createUISlice } from './slices/ui-slice';
import { createThemeSlice } from './slices/theme-slice';
import { createOllamaSlice } from './slices/ollama-slice';
import { createNotesSlice } from './slices/notes-slice';
import { createRagAnalyticsSlice } from './slices/rag-analytics-slice';
import { createIndexingSlice } from './slices/indexing-slice';
import { createSummarySlice } from './slices/summary-slice';
import { createDraftSlice } from './slices/draft-slice';
import { createGitSlice } from './slices/git-slice';
import { createVoiceSlice } from './slices/voice-slice';

// ============================================
// Persist Config - Exported for Testing
// ============================================

/**
 * Validates persisted state before merging.
 * Throws an error if any persisted value is invalid.
 * @internal Exported for testing purposes only.
 */
export function validatePersistedState(parsed: Partial<BoundStore> | undefined): void {
  if (parsed === undefined) return;

  // Validate NoteView
  const validNoteViews: NoteView[] = ['list', 'grid'];
  if (parsed.defaultNoteView !== undefined && !validNoteViews.includes(parsed.defaultNoteView)) {
    throw new Error(`Invalid persisted defaultNoteView: ${parsed.defaultNoteView}`);
  }

  // Validate FontSize
  const validFontSizes: FontSize[] = ['small', 'medium', 'large'];
  if (parsed.fontSize !== undefined && !validFontSizes.includes(parsed.fontSize)) {
    throw new Error(`Invalid persisted fontSize: ${parsed.fontSize}`);
  }

  // Validate VectorStoreProvider
  if (parsed.vectorStoreProvider !== undefined &&
      parsed.vectorStoreProvider !== 'PostgreSQL' &&
      parsed.vectorStoreProvider !== 'Pinecone') {
    throw new Error(`Invalid persisted vectorStoreProvider: ${parsed.vectorStoreProvider}`);
  }

  // Validate Theme
  const validThemes: Theme[] = ['light', 'dark', 'blue'];
  if (parsed.theme !== undefined && !validThemes.includes(parsed.theme)) {
    throw new Error(`Invalid persisted theme: ${parsed.theme}`);
  }

  // Validate numeric types
  if (parsed.itemsPerPage !== undefined && typeof parsed.itemsPerPage !== 'number') {
    throw new Error(`Invalid persisted itemsPerPage type: ${typeof parsed.itemsPerPage}`);
  }
  if (parsed.autoSaveInterval !== undefined && typeof parsed.autoSaveInterval !== 'number') {
    throw new Error(`Invalid persisted autoSaveInterval type: ${typeof parsed.autoSaveInterval}`);
  }

  // Validate RAG advanced settings numeric types
  const ragNumericFields = [
    'ragTopK', 'ragSimilarityThreshold', 'ragInitialRetrievalCount', 'ragMinRerankScore',
    'ragVectorWeight', 'ragBm25Weight', 'ragMultiQueryCount', 'ragMaxContextLength'
  ] as const;
  for (const field of ragNumericFields) {
    if (parsed[field] !== undefined && typeof parsed[field] !== 'number') {
      throw new Error(`Invalid persisted ${field} type: ${typeof parsed[field]}`);
    }
  }

  // Validate boolean types
  const booleanFields = [
    'enableNotifications', 'useRemoteOllama', 'noteSummaryEnabled',
    'ragEnableHyde', 'ragEnableQueryExpansion', 'ragEnableHybridSearch',
    'ragEnableReranking', 'ragEnableAnalytics'
  ] as const;
  for (const field of booleanFields) {
    if (parsed[field] !== undefined && typeof parsed[field] !== 'boolean') {
      throw new Error(`Invalid persisted ${field} type: ${typeof parsed[field]}`);
    }
  }
}

/**
 * Merges persisted state with current state after validation.
 * @internal Exported for testing purposes only.
 */
export function mergePersistedState(
  persistedState: unknown,
  currentState: BoundStore
): BoundStore {
  const parsed = persistedState as Partial<BoundStore> | undefined;
  if (parsed === undefined) return currentState;

  // Validate before merging
  validatePersistedState(parsed);

  return {
    ...currentState,
    // Merge auth state
    user: parsed.user ?? currentState.user,
    token: parsed.token ?? currentState.token,
    isAuthenticated: parsed.isAuthenticated ?? currentState.isAuthenticated,
    // Merge validated settings
    chatProvider: parsed.chatProvider ?? currentState.chatProvider,
    chatModel: parsed.chatModel ?? currentState.chatModel,
    vectorStoreProvider: parsed.vectorStoreProvider ?? currentState.vectorStoreProvider,
    rerankingProvider: parsed.rerankingProvider ?? currentState.rerankingProvider,
    ragRerankingModel: parsed.ragRerankingModel ?? currentState.ragRerankingModel,
    defaultNoteView: parsed.defaultNoteView ?? currentState.defaultNoteView,
    itemsPerPage: parsed.itemsPerPage ?? currentState.itemsPerPage,
    fontSize: parsed.fontSize ?? currentState.fontSize,
    enableNotifications: parsed.enableNotifications ?? currentState.enableNotifications,
    ollamaRemoteUrl: parsed.ollamaRemoteUrl ?? currentState.ollamaRemoteUrl,
    useRemoteOllama: parsed.useRemoteOllama ?? currentState.useRemoteOllama,
    autoSaveInterval: parsed.autoSaveInterval ?? currentState.autoSaveInterval,
    noteSummaryEnabled: parsed.noteSummaryEnabled ?? currentState.noteSummaryEnabled,
    noteSummaryProvider: parsed.noteSummaryProvider ?? currentState.noteSummaryProvider,
    noteSummaryModel: parsed.noteSummaryModel ?? currentState.noteSummaryModel,
    // RAG Feature Toggles
    ragEnableHyde: parsed.ragEnableHyde ?? currentState.ragEnableHyde,
    ragEnableQueryExpansion: parsed.ragEnableQueryExpansion ?? currentState.ragEnableQueryExpansion,
    ragEnableHybridSearch: parsed.ragEnableHybridSearch ?? currentState.ragEnableHybridSearch,
    ragEnableReranking: parsed.ragEnableReranking ?? currentState.ragEnableReranking,
    ragEnableAnalytics: parsed.ragEnableAnalytics ?? currentState.ragEnableAnalytics,
    // HyDE Provider Settings
    ragHydeProvider: parsed.ragHydeProvider ?? currentState.ragHydeProvider,
    ragHydeModel: parsed.ragHydeModel ?? currentState.ragHydeModel,
    // Query Expansion Provider Settings
    ragQueryExpansionProvider: parsed.ragQueryExpansionProvider ?? currentState.ragQueryExpansionProvider,
    ragQueryExpansionModel: parsed.ragQueryExpansionModel ?? currentState.ragQueryExpansionModel,
    // RAG Advanced Settings - Tier 1: Core Retrieval
    ragTopK: parsed.ragTopK ?? currentState.ragTopK,
    ragSimilarityThreshold: parsed.ragSimilarityThreshold ?? currentState.ragSimilarityThreshold,
    ragInitialRetrievalCount: parsed.ragInitialRetrievalCount ?? currentState.ragInitialRetrievalCount,
    ragMinRerankScore: parsed.ragMinRerankScore ?? currentState.ragMinRerankScore,
    // RAG Advanced Settings - Tier 2: Hybrid Search
    ragVectorWeight: parsed.ragVectorWeight ?? currentState.ragVectorWeight,
    ragBm25Weight: parsed.ragBm25Weight ?? currentState.ragBm25Weight,
    ragMultiQueryCount: parsed.ragMultiQueryCount ?? currentState.ragMultiQueryCount,
    ragMaxContextLength: parsed.ragMaxContextLength ?? currentState.ragMaxContextLength,
    // RAG Embedding Settings
    ragEmbeddingProvider: parsed.ragEmbeddingProvider ?? currentState.ragEmbeddingProvider,
    ragEmbeddingModel: parsed.ragEmbeddingModel ?? currentState.ragEmbeddingModel,
    ragEmbeddingDimensions: parsed.ragEmbeddingDimensions ?? currentState.ragEmbeddingDimensions,
    // Merge theme
    theme: parsed.theme ?? currentState.theme,
    // Merge notes state
    filterState: parsed.filterState ? { ...currentState.filterState, ...parsed.filterState } : currentState.filterState,
    // Merge git state
    repositoryPath: parsed.repositoryPath ?? currentState.repositoryPath,
    // Merge voice state (only persistent settings)
    selectedProvider: parsed.selectedProvider ?? currentState.selectedProvider,
    selectedModel: parsed.selectedModel ?? currentState.selectedModel,
    selectedVoiceId: parsed.selectedVoiceId ?? currentState.selectedVoiceId,
  };
}

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
      ...createIndexingSlice(...args),
      ...createSummarySlice(...args),
      ...createDraftSlice(...args),
      ...createGitSlice(...args),
      ...createVoiceSlice(...args),
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
        rerankingProvider: state.rerankingProvider,
        ragRerankingModel: state.ragRerankingModel,
        defaultNoteView: state.defaultNoteView,
        itemsPerPage: state.itemsPerPage,
        fontSize: state.fontSize,
        enableNotifications: state.enableNotifications,
        ollamaRemoteUrl: state.ollamaRemoteUrl,
        useRemoteOllama: state.useRemoteOllama,
        autoSaveInterval: state.autoSaveInterval,
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
        // Theme state
        theme: state.theme,
        // Notes state
        filterState: state.filterState,
        // Git state
        repositoryPath: state.repositoryPath,
        // Voice state
        selectedProvider: state.selectedProvider,
        selectedModel: state.selectedModel,
        selectedVoiceId: state.selectedVoiceId,
      }),
      merge: mergePersistedState,
    }
  )
);

// Register the store in the registry for lazy access
registerStore(_useBoundStore);

// Export the store
export const useBoundStore = _useBoundStore;
