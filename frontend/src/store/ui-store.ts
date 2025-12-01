import { create } from 'zustand';
import { Note } from '../features/notes/types/note';

export type NotesViewMode = 'card' | 'list';

interface UIStore {
  // Modal states
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  editingNote: Note | null;
  
  // Mobile menu state
  isMobileMenuOpen: boolean;
  
  // Search state
  isSearchOpen: boolean;
  searchQuery: string;
  searchMode: 'both' | 'title' | 'content';
  
  // Sidebar state
  sidebarState: 'closed' | 'collapsed' | 'expanded';
  previousSidebarState: 'closed' | 'collapsed' | 'expanded' | null;
  
  // Notes view mode
  notesViewMode: NotesViewMode;
  
  // Actions
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
  setSearchMode: (mode: 'both' | 'title' | 'content') => void;
  toggleSearchMode: () => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setNotesViewMode: (mode: NotesViewMode) => void;
}

const SIDEBAR_STORAGE_KEY = 'second-brain-sidebar-state';
const NOTES_VIEW_MODE_STORAGE_KEY = 'second-brain-notes-view-mode';

// Load sidebar state from localStorage
const loadSidebarState = (): 'closed' | 'collapsed' | 'expanded' => {
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

// Save sidebar state to localStorage
const saveSidebarState = (state: 'closed' | 'collapsed' | 'expanded') => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIDEBAR_STORAGE_KEY, state);
};

// Load notes view mode from localStorage
const loadNotesViewMode = (): NotesViewMode => {
  if (typeof window === 'undefined') return 'card';
  const stored = localStorage.getItem(NOTES_VIEW_MODE_STORAGE_KEY);
  if (stored === 'card' || stored === 'list') {
    return stored;
  }
  return 'card'; // Default to card view
};

// Save notes view mode to localStorage
const saveNotesViewMode = (mode: NotesViewMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTES_VIEW_MODE_STORAGE_KEY, mode);
};

// Initialize sidebar state from storage
const initialSidebarState = loadSidebarState();
const initialNotesViewMode = loadNotesViewMode();

export const useUIStore = create<UIStore>((set) => ({
  // Initial state
  isCreateModalOpen: false,
  isEditModalOpen: false,
  editingNote: null,
  isMobileMenuOpen: false,
  isSearchOpen: true,
  searchQuery: '',
  searchMode: 'both' as 'both' | 'title' | 'content',
  sidebarState: initialSidebarState,
  previousSidebarState: null,
  notesViewMode: initialNotesViewMode,
  
  // Actions
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openEditModal: (note) => set({ isEditModalOpen: true, editingNote: note }),
  closeEditModal: () => set({ isEditModalOpen: false, editingNote: null }),
  openMobileMenu: () => set({ isMobileMenuOpen: true }),
  closeMobileMenu: () => set({ isMobileMenuOpen: false }),
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchMode: (mode) => set({ searchMode: mode }),
  toggleSearchMode: () => set((state) => {
    const modes: Array<'both' | 'title' | 'content'> = ['both', 'title', 'content'];
    const currentIndex = modes.indexOf(state.searchMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    return { searchMode: modes[nextIndex] };
  }),
  toggleSidebar: () => set((state) => {
    // Cycle through states: closed -> collapsed -> expanded -> collapsed -> closed
    // Green button (when closed): closed -> collapsed
    // Toggle button: 
    //   - collapsed -> expanded (if coming from closed)
    //   - collapsed -> closed (if coming from expanded)
    //   - expanded -> collapsed
    let newState: 'closed' | 'collapsed' | 'expanded';
    if (state.sidebarState === 'closed') {
      // Green button: closed -> collapsed
      newState = 'collapsed';
    } else if (state.sidebarState === 'collapsed') {
      // Toggle button when collapsed: 
      // If we came from expanded, close it. Otherwise, expand it.
      if (state.previousSidebarState === 'expanded') {
        newState = 'closed';
      } else {
        newState = 'expanded';
      }
    } else {
      // expanded -> collapsed
      newState = 'collapsed';
    }
    saveSidebarState(newState);
    return { 
      sidebarState: newState,
      previousSidebarState: state.sidebarState
    };
  }),
  closeSidebar: () => set((state) => {
    // Direct close action - closes sidebar completely
    saveSidebarState('closed');
    return { 
      sidebarState: 'closed' as const,
      previousSidebarState: state.sidebarState
    };
  }),
  setNotesViewMode: (mode) => {
    saveNotesViewMode(mode);
    return set({ notesViewMode: mode });
  },
}));

