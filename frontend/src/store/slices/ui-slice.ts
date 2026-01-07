/**
 * UI Slice
 * Manages UI state like modals, sidebar, search
 */

import type { UISlice, SliceCreator, SidebarState, NotesViewMode, SearchMode, GitHubTabType } from '../types';

const SIDEBAR_STORAGE_KEY = 'second-brain-sidebar-state';
const NOTES_VIEW_MODE_STORAGE_KEY = 'second-brain-notes-view-mode';
const DIRECTORY_VIEW_MODE_STORAGE_KEY = 'second-brain-directory-view-mode';
const CHAT_SIDEBAR_STORAGE_KEY = 'second-brain-chat-sidebar-visible';
const DIRECTORY_SIDEBAR_STORAGE_KEY = 'second-brain-directory-sidebar-visible';

/**
 * Load sidebar state from localStorage
 */
const loadSidebarState = (): SidebarState => {
  if (typeof window === 'undefined') return 'closed';
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored === 'closed' || stored === 'collapsed') {
    return stored;
  }
  return 'closed';
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

/**
 * Load chat sidebar visibility from localStorage
 */
const loadChatSidebarVisible = (): boolean => {
  if (typeof window === 'undefined') return true;
  const stored = localStorage.getItem(CHAT_SIDEBAR_STORAGE_KEY);
  return stored !== 'false'; // Default to true
};

/**
 * Save chat sidebar visibility to localStorage
 */
const saveChatSidebarVisible = (visible: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHAT_SIDEBAR_STORAGE_KEY, String(visible));
};

/**
 * Check if the current viewport is mobile-sized
 */
const isMobileViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768; // md breakpoint
};

/**
 * Load directory sidebar visibility from localStorage
 * Defaults to false on mobile, true on desktop
 */
const loadDirectorySidebarVisible = (): boolean => {
  if (typeof window === 'undefined') return true;

  // Always default to closed on mobile
  if (isMobileViewport()) return false;

  const stored = localStorage.getItem(DIRECTORY_SIDEBAR_STORAGE_KEY);
  return stored !== 'false'; // Default to true on desktop
};

/**
 * Save directory sidebar visibility to localStorage
 */
const saveDirectorySidebarVisible = (visible: boolean) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DIRECTORY_SIDEBAR_STORAGE_KEY, String(visible));
};

// Initialize from storage
const initialSidebarState = loadSidebarState();
const initialNotesViewMode = loadNotesViewMode();
const initialDirectoryViewMode = loadDirectoryViewMode();
const initialChatSidebarVisible = loadChatSidebarVisible();
const initialDirectorySidebarVisible = loadDirectorySidebarVisible();

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
  githubActiveTab: 'code' as GitHubTabType,
  githubOwner: null,
  githubRepo: null,
  githubSelectedBranch: null,
  isGitSettingsOpen: false,
  chatSidebarVisible: initialChatSidebarVisible,
  directorySidebarVisible: initialDirectorySidebarVisible,

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

  // Quick click: Toggle between closed ↔ collapsed (or expanded → collapsed)
  toggleSidebar: () =>
    set((state) => {
      let newState: SidebarState;
      if (state.sidebarState === 'closed') {
        newState = 'collapsed';
      } else {
        // From collapsed or expanded, go to closed
        newState = 'closed';
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
  // GitHub Actions
  // ============================================

  setGitHubActiveTab: (tab: GitHubTabType) => set({ githubActiveTab: tab }),
  setGitHubRepo: (owner: string | null, repo: string | null) => set({ githubOwner: owner, githubRepo: repo, githubSelectedBranch: null }),
  setGitHubSelectedBranch: (branch: string | null) => set({ githubSelectedBranch: branch }),

  // ============================================
  // Git Settings Actions
  // ============================================

  openGitSettings: () => set({ isGitSettingsOpen: true }),
  closeGitSettings: () => set({ isGitSettingsOpen: false }),

  // ============================================
  // Chat/Directory Sidebar Visibility Actions
  // ============================================

  setChatSidebarVisible: (visible: boolean) => {
    saveChatSidebarVisible(visible);
    set({ chatSidebarVisible: visible });
  },
  toggleChatSidebar: () =>
    set((state) => {
      const newVisible = !state.chatSidebarVisible;
      saveChatSidebarVisible(newVisible);
      return { chatSidebarVisible: newVisible };
    }),
  setDirectorySidebarVisible: (visible: boolean) => {
    saveDirectorySidebarVisible(visible);
    set({ directorySidebarVisible: visible });
  },
  toggleDirectorySidebar: () =>
    set((state) => {
      const newVisible = !state.directorySidebarVisible;
      saveDirectorySidebarVisible(newVisible);
      return { directorySidebarVisible: newVisible };
    }),
});
