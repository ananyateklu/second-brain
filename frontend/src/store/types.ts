/**
 * Shared Store Types
 * Type definitions shared across all store slices
 */

import type { StateCreator } from 'zustand';
import type { Note, NoteListItem } from '../features/notes/types/note';
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
// Notes Filter Types
// ============================================

export type DateFilter = 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'last90days' | 'custom';
export type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';
export type ArchiveFilter = 'all' | 'archived' | 'not-archived';
export type FolderFilter = string | null; // null means all folders, empty string means unfiled

export interface NotesFilterState {
  dateFilter: DateFilter;
  customDateStart?: string;
  customDateEnd?: string;
  selectedTags: string[];
  sortBy: SortOption;
  archiveFilter: ArchiveFilter;
  selectedFolder?: FolderFilter;
}

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
  login: (identifier: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string, username?: string) => Promise<void>;
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
  setRerankingProvider: (provider: string | null, syncToBackend?: boolean) => Promise<void>;
  // Note Summary settings
  setNoteSummaryEnabled: (enabled: boolean, syncToBackend?: boolean) => Promise<void>;
  setNoteSummaryProvider: (provider: string | null, syncToBackend?: boolean) => Promise<void>;
  setNoteSummaryModel: (model: string | null, syncToBackend?: boolean) => Promise<void>;
  loadPreferencesFromBackend: (userId: string) => Promise<void>;
  syncPreferencesToBackend: (userId: string) => Promise<void>;
  resetSettings: () => void;
}

export type SettingsSlice = SettingsSliceState & SettingsSliceActions;

export interface UISliceState {
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  /** ID of the note being edited - full note is fetched in the modal */
  editingNoteId: string | null;
  /** @deprecated Use editingNoteId instead - kept for backwards compatibility during transition */
  editingNote: Note | null;
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  searchMode: SearchMode;
  sidebarState: SidebarState;
  previousSidebarState: SidebarState | null;
  notesViewMode: NotesViewMode;
  isFullscreenChat: boolean;
  isFullscreenDirectory: boolean;
}

export interface UISliceActions {
  openCreateModal: () => void;
  closeCreateModal: () => void;
  /** Opens edit modal - accepts full Note, NoteListItem, or just the note ID */
  openEditModal: (noteOrId: Note | NoteListItem | string) => void;
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
  toggleFullscreenChat: () => void;
  toggleFullscreenDirectory: () => void;
  setFullscreenChat: (isFullscreen: boolean) => void;
  setFullscreenDirectory: (isFullscreen: boolean) => void;
}

export type UISlice = UISliceState & UISliceActions;

export interface NotesSliceState {
  filterState: NotesFilterState;
  isBulkMode: boolean;
}

export interface NotesSliceActions {
  setFilterState: (filterState: NotesFilterState) => void;
  setBulkMode: (isBulkMode: boolean) => void;
  toggleBulkMode: () => void;
  resetFilters: () => void;
}

export type NotesSlice = NotesSliceState & NotesSliceActions;

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

export interface RagAnalyticsSlice {
  activeTab: 'performance' | 'topics' | 'logs';
  selectedTimeRange: number | null;
  setActiveTab: (tab: 'performance' | 'topics' | 'logs') => void;
  setSelectedTimeRange: (days: number | null) => void;
}

// ============================================
// Indexing Types (for background indexing notifications)
// Supports multiple simultaneous jobs (one per vector store)
// ============================================

export interface StoredIndexingJob {
  jobId: string;
  vectorStore: string;
  embeddingProvider: string;
  userId: string;
  startedAt: number;
}

export interface IndexingJobInfo {
  jobId: string;
  status: import('../types/rag').IndexingJobResponse | null;
  vectorStore: string;
  embeddingProvider: string;
  userId: string;
}

export interface IndexingSliceState {
  // Map of vector store -> job info (supports multiple simultaneous jobs)
  activeJobs: Record<string, IndexingJobInfo>;

  // UI state
  isRestoring: boolean;
  isNotificationVisible: boolean;
}

export interface IndexingSliceActions {
  // Job management
  startIndexingJob: (job: import('../types/rag').IndexingJobResponse, vectorStore: string, embeddingProvider: string, userId: string) => void;
  restoreIndexingJob: (job: import('../types/rag').IndexingJobResponse, vectorStore: string, embeddingProvider: string, userId: string) => void;
  updateJobStatus: (status: import('../types/rag').IndexingJobResponse, vectorStore: string) => void;
  clearJob: (vectorStore: string) => void;
  clearAllJobs: () => void;

  // Restoration
  restoreActiveJobs: (userId: string) => Promise<void>;
  setIsRestoring: (isRestoring: boolean) => void;

  // Notification UI
  showNotification: () => void;
  hideNotification: () => void;

  // Legacy compatibility
  clearActiveJob: () => void;
}

export type IndexingSlice = IndexingSliceState & IndexingSliceActions;

// ============================================
// Combined Store Type
// ============================================

export type BoundStore = AuthSlice & SettingsSlice & UISlice & NotesSlice & ThemeSlice & OllamaSlice & RagAnalyticsSlice & IndexingSlice;

// ============================================
// Slice Creator Type
// ============================================

export type SliceCreator<T> = StateCreator<
  BoundStore,
  [['zustand/persist', unknown]],
  [],
  T
>;
