/**
 * Store Slices Index
 * Re-exports all slice creators
 */

export { createAuthSlice } from './auth-slice';
export { createSettingsSlice } from './settings-slice';
export { createUISlice } from './ui-slice';
export { createThemeSlice } from './theme-slice';
export { createOllamaSlice, formatBytes, formatSpeed, formatTimeRemaining } from './ollama-slice';
export {
  createIndexingSlice,
  selectIsIndexing,
  selectIsIndexingComplete,
  selectIsIndexingFailed,
  selectIsIndexingCancelled,
  selectIndexingProgress,
  selectActiveJobs,
  selectHasActiveJobs,
  selectIsAnyJobIndexing,
  selectJobByVectorStore,
  selectActiveJobId,
  selectActiveJobStatus,
  selectVectorStore,
  selectEmbeddingProvider,
} from './indexing-slice';
export { createVoiceSlice } from './voice-slice';
