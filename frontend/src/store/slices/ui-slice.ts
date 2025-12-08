/**
 * UI Slice
 * Manages UI state like modals, sidebar, search
 */

import type { Note, NoteListItem } from '../../features/notes/types/note';
import type { UISlice, SliceCreator, SidebarState, NotesViewMode, SearchMode } from '../types';

const SIDEBAR_STORAGE_KEY = 'second-brain-sidebar-state';
const NOTES_VIEW_MODE_STORAGE_KEY = 'second-brain-notes-view-mode';

/**
 * Load sidebar state from localStorage
 */
const loadSidebarState = (): SidebarState => {
  if (typeof window === 'undefined') return 'expanded';
  const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  if (stored === 'closed' || stored === 'collapsed' || stored === 'expanded') {
    return stored;
  }
  // Migrate old boolean state
  const oldCollapsed = localStorage.getItem('second-brain-sidebar-collapsed');
  if (oldCollapsed === 'true') {
    return 'collapsed';
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

// Initialize from storage
const initialSidebarState = loadSidebarState();
const initialNotesViewMode = loadNotesViewMode();

export const createUISlice: SliceCreator<UISlice> = (set) => ({
  // Initial state
  isCreateModalOpen: false,
  isEditModalOpen: false,
  editingNoteId: null,
  editingNote: null, // Deprecated - kept for backwards compatibility
  isMobileMenuOpen: false,
  isSearchOpen: true,
  searchQuery: '',
  searchMode: 'both' as SearchMode,
  sidebarState: initialSidebarState,
  previousSidebarState: null,
  notesViewMode: initialNotesViewMode,
  isFullscreenChat: false,
  isFullscreenDirectory: false,

  // ============================================
  // Modal Actions
  // ============================================

  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openEditModal: (noteOrId: Note | NoteListItem | string) => {
    // Extract the ID whether it's a full Note, NoteListItem, or just the ID string
    const noteId = typeof noteOrId === 'string' ? noteOrId : noteOrId.id;
    // Keep editingNote for backwards compatibility if a full Note is passed
    const editingNote = typeof noteOrId === 'object' && 'content' in noteOrId ? noteOrId : null;
    set({ isEditModalOpen: true, editingNoteId: noteId, editingNote });
  },
  closeEditModal: () => set({ isEditModalOpen: false, editingNoteId: null, editingNote: null }),

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

  // ============================================
  // Fullscreen Actions (Tauri only)
  // ============================================

  toggleFullscreenChat: () => set((state) => ({ isFullscreenChat: !state.isFullscreenChat })),
  toggleFullscreenDirectory: () => set((state) => ({ isFullscreenDirectory: !state.isFullscreenDirectory })),
  setFullscreenChat: (isFullscreen: boolean) => set({ isFullscreenChat: isFullscreen }),
  setFullscreenDirectory: (isFullscreen: boolean) => set({ isFullscreenDirectory: isFullscreen }),
});
