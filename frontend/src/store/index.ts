/**
 * Combined Store
 * Re-exports the unified store and all related types/selectors
 */

// ============================================
// Main Store Export
// ============================================

export { useBoundStore } from './bound-store';

// ============================================
// Re-export Types
// ============================================

export type { BoundStore } from './types';
export type {
  Theme,
  NotesViewMode,
  SidebarState,
  SearchMode,
  NoteView,
  FontSize,
  ModelDownload,
  AuthSlice,
  SettingsSlice,
  UISlice,
  ThemeSlice,
  OllamaSlice,
} from './types';

// ============================================
// Re-export Selectors
// ============================================

export * from './selectors';

// ============================================
// Re-export Slice Utilities
// ============================================

export { formatBytes, formatSpeed, formatTimeRemaining } from './slices/ollama-slice';
