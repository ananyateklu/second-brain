/**
 * Shared Store Types
 * Type definitions shared across all store slices
 */

import type { StateCreator } from 'zustand';
import type { Note } from '../features/notes/types/note';
import type { User, UserPreferences } from '../types/auth';
import type { VectorStoreProvider } from '../types/rag';
import type { OllamaPullProgress, OllamaPullRequest } from '../types/ai';

// ============================================
// Theme Types
// ============================================

export type Theme = 'light' | 'dark' | 'blue';

// ============================================
// UI Types
// ============================================

export type NotesViewMode = 'card' | 'list';
export type SidebarState = 'closed' | 'collapsed' | 'expanded';
export type SearchMode = 'both' | 'title' | 'content';
export type NoteView = 'list' | 'grid';
export type FontSize = 'small' | 'medium' | 'large';

// ============================================
// Ollama Download Types
// ============================================

export interface ModelDownload {
  modelName: string;
  ollamaBaseUrl?: string | null;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'cancelled';
  progress?: OllamaPullProgress;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  abortController?: AbortController;
}

// ============================================
// Slice State Interfaces
// ============================================

export interface AuthSliceState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface AuthSliceActions {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  clearError: () => void;
  setError: (error: string) => void;
  setLoading: (isLoading: boolean) => void;
}

export type AuthSlice = AuthSliceState & AuthSliceActions;

export interface SettingsSliceState extends UserPreferences {
  autoSaveInterval: number;
}

export interface SettingsSliceActions {
  setDefaultNoteView: (view: NoteView) => void;
  setItemsPerPage: (count: number) => void;
  setAutoSaveInterval: (interval: number) => void;
  setEnableNotifications: (enabled: boolean) => void;
  setFontSize: (size: FontSize) => void;
  setVectorStoreProvider: (provider: VectorStoreProvider, syncToBackend?: boolean) => Promise<void>;
  setChatProvider: (provider: string | null) => void;
  setChatModel: (model: string | null) => void;
  setOllamaRemoteUrl: (url: string | null) => void;
  setUseRemoteOllama: (enabled: boolean) => void;
  loadPreferencesFromBackend: (userId: string) => Promise<void>;
  syncPreferencesToBackend: (userId: string) => Promise<void>;
  resetSettings: () => void;
}

export type SettingsSlice = SettingsSliceState & SettingsSliceActions;

export interface UISliceState {
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  editingNote: Note | null;
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  searchMode: SearchMode;
  sidebarState: SidebarState;
  previousSidebarState: SidebarState | null;
  notesViewMode: NotesViewMode;
}

export interface UISliceActions {
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (note: Note) => void;
  closeEditModal: () => void;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;
  setSearchMode: (mode: SearchMode) => void;
  toggleSearchMode: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setNotesViewMode: (mode: NotesViewMode) => void;
}

export type UISlice = UISliceState & UISliceActions;

export interface ThemeSliceState {
  theme: Theme;
}

export interface ThemeSliceActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export type ThemeSlice = ThemeSliceState & ThemeSliceActions;

export interface OllamaSliceState {
  downloads: Record<string, ModelDownload>;
}

export interface OllamaSliceActions {
  startDownload: (request: OllamaPullRequest) => void;
  cancelDownload: (modelName: string) => void;
  clearDownload: (modelName: string) => void;
  clearCompletedDownloads: () => void;
}

export type OllamaSlice = OllamaSliceState & OllamaSliceActions;

// ============================================
// Combined Store Type
// ============================================

export type BoundStore = AuthSlice & SettingsSlice & UISlice & ThemeSlice & OllamaSlice;

// ============================================
// Slice Creator Type
// ============================================

export type SliceCreator<T> = StateCreator<
  BoundStore,
  [['zustand/persist', unknown]],
  [],
  T
>;
