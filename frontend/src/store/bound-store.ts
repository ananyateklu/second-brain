/**
 * Bound Store Creation
 * Creates the unified store from all slices.
 * This file is isolated to prevent circular dependencies.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { z } from 'zod';
import { STORAGE_KEYS } from '../lib/constants';
import type { BoundStore } from './types';
import { registerStore } from './store-registry';

// Import slice creators directly to avoid circular deps through services/index
import { createAuthSlice } from './slices/auth-slice';
import { createSettingsSlice } from './slices/settings-slice';
import { createUISlice } from './slices/ui-slice';
import { createThemeSlice } from './slices/theme-slice';
import { createOllamaSlice } from './slices/ollama-slice';
import { createNotesSlice } from './slices/notes-slice';
import { createRagAnalyticsSlice } from './slices/rag-analytics-slice';
import { createInsightsSlice } from './slices/insights-slice';
import { createIndexingSlice } from './slices/indexing-slice';
import { createSummarySlice } from './slices/summary-slice';
import { createDraftSlice } from './slices/draft-slice';
import { createGitSlice } from './slices/git-slice';
import { createVoiceSlice } from './slices/voice-slice';
import { createFocusSlice } from './slices/focus-slice';

// ============================================
// Zod Schemas for Validation
// ============================================

const NoteViewSchema = z.enum(['list', 'grid']);
const FontSizeSchema = z.enum(['small', 'medium', 'large']);
const MarkdownRendererSchema = z.enum(['custom', 'llm-ui']);
const VectorStoreProviderSchema = z.enum(['PostgreSQL', 'Pinecone']);
const ThemeSchema = z.enum(['light', 'dark', 'blue']);
const InsightsTabTypeSchema = z.enum(['overview', 'rag', 'chat', 'agent']);

// Schema for the persisted part of BoundStore
// We use .catch() or .optional() to handle missing or invalid data gracefully if we wanted,
// but to match original logic we will rely on strict type checking where appropriate.
// However, the original logic threw errors. Zod throws ZodError. 
// We will wrap it to throw generic Error to match signature if needed, or just let ZodError bubble.
// The original code threw Error("Invalid persisted ...").
const PersistedStateSchema = z.object({
  // Auth
  user: z.any().optional(), // Complex object, skipping strict schema for now
  token: z.string().nullable().optional(),
  isAuthenticated: z.boolean().optional(),
  
  // Settings
  chatProvider: z.string().nullable().optional(),
  chatModel: z.string().nullable().optional(),
  vectorStoreProvider: VectorStoreProviderSchema.optional(),
  rerankingProvider: z.string().nullable().optional(),
  ragRerankingModel: z.string().nullable().optional(),
  defaultNoteView: NoteViewSchema.optional(),
  itemsPerPage: z.number().optional(),
  fontSize: FontSizeSchema.optional(),
  markdownRenderer: MarkdownRendererSchema.optional(),
  enableNotifications: z.boolean().optional(),
  ollamaRemoteUrl: z.string().nullable().optional(),
  useRemoteOllama: z.boolean().optional(),
  autoSaveInterval: z.number().optional(),
  noteSummaryEnabled: z.boolean().optional(),
  noteSummaryProvider: z.string().nullable().optional(),
  noteSummaryModel: z.string().nullable().optional(),

  // RAG Feature Toggles
  ragEnableHyde: z.boolean().optional(),
  ragEnableQueryExpansion: z.boolean().optional(),
  ragEnableHybridSearch: z.boolean().optional(),
  ragEnableReranking: z.boolean().optional(),
  ragEnableAnalytics: z.boolean().optional(),
  
  // HyDE & Query Expansion
  ragHydeProvider: z.string().nullable().optional(),
  ragHydeModel: z.string().nullable().optional(),
  ragQueryExpansionProvider: z.string().nullable().optional(),
  ragQueryExpansionModel: z.string().nullable().optional(),

  // RAG Advanced Settings
  ragTopK: z.number().optional(),
  ragSimilarityThreshold: z.number().optional(),
  ragInitialRetrievalCount: z.number().optional(),
  ragMinRerankScore: z.number().optional(),
  ragVectorWeight: z.number().optional(),
  ragBm25Weight: z.number().optional(),
  ragMultiQueryCount: z.number().optional(),
  ragMaxContextLength: z.number().optional(),
  
  // RAG Embedding
  ragEmbeddingProvider: z.string().nullable().optional(),
  ragEmbeddingModel: z.string().nullable().optional(),
  ragEmbeddingDimensions: z.number().nullable().optional(),

  // Focus AI
  focusAIProvider: z.string().nullable().optional(),
  focusAIModel: z.string().nullable().optional(),
  focusAITemperature: z.number().optional(),
  focusAIMaxTokens: z.number().optional(),
  focusAIRagTopK: z.number().optional(),
  focusAISimilarityThreshold: z.number().optional(),
  focusAIMaxSuggestions: z.number().optional(),
  focusAIDedupThreshold: z.number().optional(),

  // Theme
  theme: ThemeSchema.optional(),

  // Notes
  filterState: z.any().optional(), // Complex object

  // Git
  repositoryPath: z.string().nullable().optional(),

  // Voice
  selectedProvider: z.string().nullable().optional(),
  selectedModel: z.string().nullable().optional(),
  selectedVoiceId: z.string().nullable().optional(),

  // Insights
  activeInsightsTab: InsightsTabTypeSchema.optional(),
});

// ============================================
// Persist Config - Exported for Testing
// ============================================

/**
 * Validates persisted state before merging.
 * Throws an error if any persisted value is invalid.
 * @internal Exported for testing purposes only.
 */
export function validatePersistedState(parsed: unknown): void {
  if (parsed === undefined) return;
  
  const result = PersistedStateSchema.safeParse(parsed);
  
  if (!result.success) {
    // Format the first error to match the original error message style roughly
    const firstError = result.error.issues[0];
    const path = firstError.path.join('.');
    const value = (parsed as Record<string, unknown>)[path];
    throw new Error(`Invalid persisted ${path}: ${firstError.message} (received ${JSON.stringify(value)})`);
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
  // If undefined, return current state
  if (persistedState === undefined) return currentState;

  // Validate (throws on error)
  validatePersistedState(persistedState);

  // Safe to cast now
  const parsed = persistedState as Partial<BoundStore>;

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
    markdownRenderer: parsed.markdownRenderer ?? currentState.markdownRenderer,
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
    // Focus AI Settings
    focusAIProvider: parsed.focusAIProvider ?? currentState.focusAIProvider,
    focusAIModel: parsed.focusAIModel ?? currentState.focusAIModel,
    focusAITemperature: parsed.focusAITemperature ?? currentState.focusAITemperature,
    focusAIMaxTokens: parsed.focusAIMaxTokens ?? currentState.focusAIMaxTokens,
    focusAIRagTopK: parsed.focusAIRagTopK ?? currentState.focusAIRagTopK,
    focusAISimilarityThreshold: parsed.focusAISimilarityThreshold ?? currentState.focusAISimilarityThreshold,
    focusAIMaxSuggestions: parsed.focusAIMaxSuggestions ?? currentState.focusAIMaxSuggestions,
    focusAIDedupThreshold: parsed.focusAIDedupThreshold ?? currentState.focusAIDedupThreshold,
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
    // Merge insights state
    activeInsightsTab: parsed.activeInsightsTab ?? currentState.activeInsightsTab,
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
      ...createInsightsSlice(...args),
      ...createIndexingSlice(...args),
      ...createSummarySlice(...args),
      ...createDraftSlice(...args),
      ...createGitSlice(...args),
      ...createVoiceSlice(...args),
      ...createFocusSlice(...args),
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
        markdownRenderer: state.markdownRenderer,
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
        // Focus AI Settings
        focusAIProvider: state.focusAIProvider,
        focusAIModel: state.focusAIModel,
        focusAITemperature: state.focusAITemperature,
        focusAIMaxTokens: state.focusAIMaxTokens,
        focusAIRagTopK: state.focusAIRagTopK,
        focusAISimilarityThreshold: state.focusAISimilarityThreshold,
        focusAIMaxSuggestions: state.focusAIMaxSuggestions,
        focusAIDedupThreshold: state.focusAIDedupThreshold,
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
        // Insights state
        activeInsightsTab: state.activeInsightsTab,
      }),
      merge: mergePersistedState,
    }
  )
);

// Register the store in the registry for lazy access
registerStore(_useBoundStore);

// Export the store
export const useBoundStore = _useBoundStore;
