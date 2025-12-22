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
export type GitHubTabType = 'local-changes' | 'code' | 'pull-requests' | 'issues' | 'actions' | 'commits' | 'branches';

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
  // RAG Feature Toggles
  setRagEnableHyde: (enabled: boolean, syncToBackend?: boolean) => Promise<void>;
  setRagEnableQueryExpansion: (enabled: boolean, syncToBackend?: boolean) => Promise<void>;
  setRagEnableHybridSearch: (enabled: boolean, syncToBackend?: boolean) => Promise<void>;
  setRagEnableReranking: (enabled: boolean, syncToBackend?: boolean) => Promise<void>;
  setRagEnableAnalytics: (enabled: boolean, syncToBackend?: boolean) => Promise<void>;
  // RAG Advanced Settings - Tier 1: Core Retrieval
  setRagTopK: (value: number, syncToBackend?: boolean) => Promise<void>;
  setRagSimilarityThreshold: (value: number, syncToBackend?: boolean) => Promise<void>;
  setRagInitialRetrievalCount: (value: number, syncToBackend?: boolean) => Promise<void>;
  setRagMinRerankScore: (value: number, syncToBackend?: boolean) => Promise<void>;
  // RAG Advanced Settings - Tier 2: Hybrid Search
  setRagVectorWeight: (value: number, syncToBackend?: boolean) => Promise<void>;
  setRagBm25Weight: (value: number, syncToBackend?: boolean) => Promise<void>;
  setRagMultiQueryCount: (value: number, syncToBackend?: boolean) => Promise<void>;
  setRagMaxContextLength: (value: number, syncToBackend?: boolean) => Promise<void>;
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
  isMobileMenuOpen: boolean;
  isSearchOpen: boolean;
  searchQuery: string;
  searchMode: SearchMode;
  sidebarState: SidebarState;
  previousSidebarState: SidebarState | null;
  /** View mode for the main Notes page */
  notesViewMode: NotesViewMode;
  /** View mode for the Notes Directory page (independent from notesViewMode) */
  directoryViewMode: NotesViewMode;
  isFullscreenChat: boolean;
  isFullscreenDirectory: boolean;
  /** GitHub page active tab */
  githubActiveTab: GitHubTabType;
  /** GitHub selected repository owner */
  githubOwner: string | null;
  /** GitHub selected repository name */
  githubRepo: string | null;
  /** Git settings panel open state */
  isGitSettingsOpen: boolean;
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
  setDirectoryViewMode: (mode: NotesViewMode) => void;
  toggleFullscreenChat: () => void;
  toggleFullscreenDirectory: () => void;
  setFullscreenChat: (isFullscreen: boolean) => void;
  setFullscreenDirectory: (isFullscreen: boolean) => void;
  /** Set GitHub active tab */
  setGitHubActiveTab: (tab: GitHubTabType) => void;
  /** Set GitHub repository */
  setGitHubRepo: (owner: string | null, repo: string | null) => void;
  /** Open Git settings panel */
  openGitSettings: () => void;
  /** Close Git settings panel */
  closeGitSettings: () => void;
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
// Summary Types (for background summary generation)
// ============================================

export interface SummaryJobInfo {
  jobId: string;
  status: import('../types/notes').SummaryJobResponse | null;
  userId: string;
}

export interface SummarySliceState {
  // Current active job (only one at a time)
  activeJob: SummaryJobInfo | null;

  // UI state
  isRestoring: boolean;
  isNotificationVisible: boolean;
}

export interface SummarySliceActions {
  // Job management
  startSummaryJob: (job: import('../types/notes').SummaryJobResponse, userId: string) => void;
  restoreSummaryJob: (job: import('../types/notes').SummaryJobResponse, userId: string) => void;
  updateSummaryJobStatus: (status: import('../types/notes').SummaryJobResponse) => void;
  clearSummaryJob: () => void;

  // Restoration
  restoreActiveSummaryJob: (userId: string) => Promise<void>;
  setIsSummaryRestoring: (isRestoring: boolean) => void;

  // Notification UI
  showSummaryNotification: () => void;
  hideSummaryNotification: () => void;
}

export type SummarySlice = SummarySliceState & SummarySliceActions;

// ============================================
// Draft Types (for chat input draft persistence)
// ============================================

export interface DraftSliceState {
  /** In-memory cache of drafts: conversationId -> content */
  drafts: Record<string, string>;
  /** Whether a draft is currently being loaded */
  isLoadingDraft: boolean;
  /** Error message if draft loading failed */
  draftLoadError: string | null;
}

export interface DraftSliceActions {
  /** Load a draft for a conversation (from IndexedDB with fallback) */
  loadDraft: (conversationId: string) => Promise<string>;
  /** Save a draft for a conversation (debounced, 500ms) */
  saveDraft: (conversationId: string, content: string) => void;
  /** Clear a draft for a conversation */
  clearDraft: (conversationId: string) => void;
  /** Get a draft synchronously from in-memory cache */
  getDraft: (conversationId: string) => string;
  /** Check if a conversation has a non-empty draft */
  hasDraft: (conversationId: string) => boolean;
  /** Transfer new chat draft to a created conversation */
  transferNewChatDraft: (newConversationId: string) => void;
  /** Preload all drafts into memory */
  preloadDrafts: () => Promise<void>;
  /** Cleanup old drafts (default: 30 days) */
  cleanupOldDrafts: (maxAgeDays?: number) => Promise<number>;
  /** Flush all pending debounced saves immediately */
  flushPendingSaves: () => void;
}

export type DraftSlice = DraftSliceState & DraftSliceActions;

// ============================================
// Git Types
// ============================================

export interface GitSliceState {
  /** The configured repository path */
  repositoryPath: string | null;
  /** Selected files for staging/unstaging operations */
  selectedFiles: string[];
  /** The currently selected file for diff viewing */
  selectedDiffFile: string | null;
  /** Whether viewing staged or unstaged diff */
  viewingStagedDiff: boolean;
  /** Files currently being staged (for optimistic UI loading states) */
  pendingStagingFiles: Set<string>;
  /** Files currently being unstaged (for optimistic UI loading states) */
  pendingUnstagingFiles: Set<string>;
}

export interface GitSliceActions {
  /** Set the repository path */
  setRepositoryPath: (path: string | null) => void;
  /** Toggle file selection */
  toggleFileSelection: (filePath: string) => void;
  /** Select multiple files */
  selectFiles: (filePaths: string[]) => void;
  /** Select all provided files */
  selectAllFiles: (filePaths: string[]) => void;
  /** Clear all file selections */
  clearSelection: () => void;
  /** Set the file to view diff for */
  setSelectedDiffFile: (filePath: string | null, staged?: boolean) => void;
  /** Clear the diff view */
  clearDiffView: () => void;
  /** Mark files as pending staging operation */
  setPendingStagingFiles: (files: string[]) => void;
  /** Mark files as pending unstaging operation */
  setPendingUnstagingFiles: (files: string[]) => void;
  /** Clear pending file operations */
  clearPendingFiles: () => void;
}

export type GitSlice = GitSliceState & GitSliceActions;

// ============================================
// Voice Types
// ============================================

export interface VoiceSliceState {
  // Session state
  sessionId: string | null;
  sessionState: import('../features/voice/types/voice-types').VoiceSessionState;
  isConnecting: boolean;
  isConnected: boolean;

  // Audio controls
  isMicrophoneEnabled: boolean;
  isMuted: boolean;
  isAudioPlaying: boolean;
  audioLevel: number;

  // Transcript
  currentTranscript: string;
  currentAssistantTranscript: string;
  isTranscribing: boolean;
  transcriptHistory: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;

  // Settings
  selectedProvider: string | null;
  selectedModel: string | null;
  selectedVoiceId: string | null;
  availableVoices: import('../features/voice/types/voice-types').VoiceInfo[];

  // Service status
  isServiceAvailable: boolean;
  deepgramAvailable: boolean;
  elevenLabsAvailable: boolean;
  grokVoiceAvailable: boolean;

  // Voice provider type (standard vs grok)
  voiceProviderType: import('../features/voice/types/voice-types').VoiceProviderType;

  // Grok Voice settings
  selectedGrokVoice: string;
  availableGrokVoices: import('../features/voice/types/voice-types').GrokVoiceInfo[];
  enableGrokWebSearch: boolean;
  enableGrokXSearch: boolean;

  // Errors
  error: string | null;

  // Agent mode state
  agentEnabled: boolean;
  capabilities: string[];
  toolExecutions: import('../features/voice/types/voice-types').VoiceToolExecution[];
  thinkingSteps: import('../features/voice/types/voice-types').VoiceThinkingStep[];
  retrievedNotes: import('../features/voice/types/voice-types').VoiceRetrievedNote[];
  ragLogId: string | null;
  groundingSources: import('../features/voice/types/voice-types').VoiceGroundingSource[];
  isToolExecuting: boolean;
  currentToolName: string | null;
}

export interface VoiceSliceActions {
  // Session actions
  setSessionId: (sessionId: string | null) => void;
  setSessionState: (state: import('../features/voice/types/voice-types').VoiceSessionState | number) => void;
  setIsConnecting: (isConnecting: boolean) => void;
  setIsConnected: (isConnected: boolean) => void;

  // Audio control actions
  setMicrophoneEnabled: (enabled: boolean) => void;
  toggleMicrophone: () => void;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  setAudioPlaying: (playing: boolean) => void;
  setAudioLevel: (level: number) => void;

  // Transcript actions
  setCurrentTranscript: (transcript: string) => void;
  setCurrentAssistantTranscript: (transcript: string) => void;
  setIsTranscribing: (isTranscribing: boolean) => void;
  addTranscriptEntry: (role: 'user' | 'assistant', content: string) => void;
  clearTranscriptHistory: () => void;

  // Settings actions
  setSelectedProvider: (provider: string | null) => void;
  setSelectedModel: (model: string | null) => void;
  setSelectedVoiceId: (voiceId: string | null) => void;
  setAvailableVoices: (voices: import('../features/voice/types/voice-types').VoiceInfo[]) => void;

  // Service status actions
  setServiceStatus: (status: { deepgramAvailable: boolean; elevenLabsAvailable: boolean; voiceAgentEnabled: boolean; grokVoiceAvailable?: boolean }) => void;

  // Error actions
  setError: (error: string | null) => void;
  clearError: () => void;

  // Reset action
  resetVoiceState: () => void;

  // Agent mode actions
  setAgentEnabled: (enabled: boolean) => void;
  setCapabilities: (capabilities: string[]) => void;
  addToolExecution: (execution: import('../features/voice/types/voice-types').VoiceToolExecution) => void;
  updateToolExecution: (toolId: string, updates: Partial<import('../features/voice/types/voice-types').VoiceToolExecution>) => void;
  addThinkingStep: (step: import('../features/voice/types/voice-types').VoiceThinkingStep) => void;
  setRetrievedNotes: (notes: import('../features/voice/types/voice-types').VoiceRetrievedNote[], ragLogId?: string) => void;
  setGroundingSources: (sources: import('../features/voice/types/voice-types').VoiceGroundingSource[]) => void;
  clearAgentState: () => void;

  // Grok Voice actions
  setVoiceProviderType: (providerType: import('../features/voice/types/voice-types').VoiceProviderType) => void;
  setSelectedGrokVoice: (voice: string) => void;
  setAvailableGrokVoices: (voices: import('../features/voice/types/voice-types').GrokVoiceInfo[]) => void;
  setEnableGrokWebSearch: (enabled: boolean) => void;
  setEnableGrokXSearch: (enabled: boolean) => void;
}

export type VoiceSlice = VoiceSliceState & VoiceSliceActions;

// ============================================
// Combined Store Type
// ============================================

export type BoundStore = AuthSlice & SettingsSlice & UISlice & NotesSlice & ThemeSlice & OllamaSlice & RagAnalyticsSlice & IndexingSlice & SummarySlice & DraftSlice & GitSlice & VoiceSlice;

// ============================================
// Slice Creator Type
// ============================================

export type SliceCreator<T> = StateCreator<
  BoundStore,
  [['zustand/persist', unknown]],
  [],
  T
>;
