/**
 * UI Slice
 * Manages UI state like modals, sidebar, search
 */

import type { Note, NoteListItem } from '../../features/notes/types/note';
import type { UISlice, SliceCreator, SidebarState, NotesViewMode, SearchMode, GitHubTabType } from '../types';

const SIDEBAR_STORAGE_KEY = 'second-brain-sidebar-state';
const NOTES_VIEW_MODE_STORAGE_KEY = 'second-brain-notes-view-mode';
const DIRECTORY_VIEW_MODE_STORAGE_KEY = 'second-brain-directory-view-mode';

/**
 * Load sidebar state from localStorage
 */
const loadSidebarState = (): SidebarState => {
  if (typeof window === 'undefined') return 'expanded';
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored === 'closed' || stored === 'collapsed' || stored === 'expanded') {
    return stored;
  }
  return 'expanded';
};

/**
 * Save sidebar state to localStorage
 */
const saveSidebarState = (state: SidebarState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIDEBAR_STORAGE_KEY, state);
};

/**
 * Load notes view mode from localStorage
 */
const loadNotesViewMode = (): NotesViewMode => {
  if (typeof window === 'undefined') return 'card';
  const stored = localStorage.getItem(NOTES_VIEW_MODE_STORAGE_KEY);
  if (stored === 'card' || stored === 'list') {
    return stored;
  }
  return 'card';
};

/**
 * Save notes view mode to localStorage
 */
const saveNotesViewMode = (mode: NotesViewMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTES_VIEW_MODE_STORAGE_KEY, mode);
};

/**
 * Load directory view mode from localStorage
 */
const loadDirectoryViewMode = (): NotesViewMode => {
  if (typeof window === 'undefined') return 'card';
  const stored = localStorage.getItem(DIRECTORY_VIEW_MODE_STORAGE_KEY);
  if (stored === 'card' || stored === 'list') {
    return stored;
  }
  return 'card';
};

/**
 * Save directory view mode to localStorage
 */
const saveDirectoryViewMode = (mode: NotesViewMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DIRECTORY_VIEW_MODE_STORAGE_KEY, mode);
};

// Initialize from storage
const initialSidebarState = loadSidebarState();
const initialNotesViewMode = loadNotesViewMode();
const initialDirectoryViewMode = loadDirectoryViewMode();

export const createUISlice: SliceCreator<UISlice> = (set) => ({
  // Initial state
  isCreateModalOpen: false,
  createModalSourceRect: null,
  isEditModalOpen: false,
  editingNoteId: null,
  editModalSourceRect: null,
  isMobileMenuOpen: false,
  isSearchOpen: true,
  searchQuery: '',
  searchMode: 'both' as SearchMode,
  sidebarState: initialSidebarState,
  previousSidebarState: null,
  notesViewMode: initialNotesViewMode,
  directoryViewMode: initialDirectoryViewMode,
  isFullscreenChat: false,
  isFullscreenDirectory: false,
  githubActiveTab: 'code' as GitHubTabType,
  githubOwner: null,
  githubRepo: null,
  isGitSettingsOpen: false,

  // ============================================
  // Modal Actions
  // ============================================

  openCreateModal: (sourceRect) => set({ isCreateModalOpen: true, createModalSourceRect: sourceRect ?? null }),
  closeCreateModal: () => set({ isCreateModalOpen: false, createModalSourceRect: null }),
  openEditModal: (noteOrId, sourceRect) => {
    const noteId = typeof noteOrId === 'string' ? noteOrId : noteOrId.id;
    set({ isEditModalOpen: true, editingNoteId: noteId, editModalSourceRect: sourceRect ?? null });
  },
  closeEditModal: () => set({ isEditModalOpen: false, editingNoteId: null, editModalSourceRect: null }),

  // ============================================
  // Mobile Menu Actions
  // ============================================

  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),

  // ============================================
  // Search Actions
  // ============================================

  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSearchMode: (mode: SearchMode) => set({ searchMode: mode }),
  toggleSearchMode: () =>
    set((state) => {
      const modes: SearchMode[] = ['both', 'title', 'content'];
      const currentIndex = modes.indexOf(state.searchMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { searchMode: modes[nextIndex] };
    }),

  // ============================================
  // Sidebar Actions
  // ============================================

  toggleSidebar: () =>
    set((state) => {
      let newState: SidebarState;
      if (state.sidebarState === 'closed') {
        newState = 'collapsed';
      } else if (state.sidebarState === 'collapsed') {
        if (state.previousSidebarState === 'expanded') {
          newState = 'closed';
        } else {
          newState = 'expanded';
        }
      } else {
        newState = 'collapsed';
      }
      saveSidebarState(newState);
      return {
        sidebarState: newState,
        previousSidebarState: state.sidebarState,
      };
    }),

  closeSidebar: () =>
    set((state) => {
      saveSidebarState('closed');
      return {
        sidebarState: 'closed' as const,
        previousSidebarState: state.sidebarState,
      };
    }),

  // ============================================
  // Notes View Mode
  // ============================================

  setNotesViewMode: (mode: NotesViewMode) => {
    saveNotesViewMode(mode);
    set({ notesViewMode: mode });
  },

  setDirectoryViewMode: (mode: NotesViewMode) => {
    saveDirectoryViewMode(mode);
    set({ directoryViewMode: mode });
  },

  // ============================================
  // Fullscreen Actions (Tauri only)
  // ============================================

  toggleFullscreenChat: () => set((state) => ({ isFullscreenChat: !state.isFullscreenChat })),
  toggleFullscreenDirectory: () => set((state) => ({ isFullscreenDirectory: !state.isFullscreenDirectory })),
  setFullscreenChat: (isFullscreen: boolean) => set({ isFullscreenChat: isFullscreen }),
  setFullscreenDirectory: (isFullscreen: boolean) => set({ isFullscreenDirectory: isFullscreen }),

  // ============================================
  // GitHub Actions
  // ============================================

  setGitHubActiveTab: (tab: GitHubTabType) => set({ githubActiveTab: tab }),
  setGitHubRepo: (owner: string | null, repo: string | null) => set({ githubOwner: owner, githubRepo: repo }),

  // ============================================
  // Git Settings Actions
  // ============================================

  openGitSettings: () => set({ isGitSettingsOpen: true }),
  closeGitSettings: () => set({ isGitSettingsOpen: false }),
});
