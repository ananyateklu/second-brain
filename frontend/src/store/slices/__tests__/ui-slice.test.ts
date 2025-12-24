/**
 * UI Slice Tests
 * Unit tests for UI store slice (modals, sidebar, search)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUISlice } from '../ui-slice';
import type { UISlice, BoundStore } from '../../types';

// Mock localStorage
let localStorageMock: Record<string, string>;

describe('uiSlice', () => {
  let state: Partial<BoundStore>;
  let slice: UISlice;

  const mockSet = vi.fn((partial: Partial<BoundStore> | ((state: BoundStore) => Partial<BoundStore>)) => {
    if (typeof partial === 'function') {
      const newState = partial(state as BoundStore);
      Object.assign(state, newState);
    } else {
      Object.assign(state, partial);
    }
  });

  const mockGet = vi.fn(() => state as BoundStore);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = {};

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key: string) => localStorageMock[key] ?? null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
      (key: string, value: string) => {
        localStorageMock[key] = value;
      }
    );

    state = {};
    // @ts-expect-error - Partial store mock
    slice = createUISlice(mockSet, mockGet, {});
    Object.assign(state, slice);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Initial State Tests
  // ============================================
  describe('initial state', () => {
    it('should have modals closed', () => {
      expect(slice.isCreateModalOpen).toBe(false);
      expect(slice.isEditModalOpen).toBe(false);
      expect(slice.editingNoteId).toBeNull();
    });

    it('should have mobile menu closed', () => {
      expect(slice.isMobileMenuOpen).toBe(false);
    });

    it('should have search open by default', () => {
      expect(slice.isSearchOpen).toBe(true);
      expect(slice.searchQuery).toBe('');
      expect(slice.searchMode).toBe('both');
    });

    it('should have fullscreen modes off', () => {
      expect(slice.isFullscreenChat).toBe(false);
      expect(slice.isFullscreenDirectory).toBe(false);
    });
  });

  // ============================================
  // Modal Actions Tests
  // ============================================
  describe('modal actions', () => {
    it('should open create modal', () => {
      slice.openCreateModal();

      expect(mockSet).toHaveBeenCalledWith({ isCreateModalOpen: true, createModalSourceRect: null });
    });

    it('should close create modal', () => {
      slice.closeCreateModal();

      expect(mockSet).toHaveBeenCalledWith({ isCreateModalOpen: false, createModalSourceRect: null });
    });

    it('should open edit modal with note ID string', () => {
      slice.openEditModal('note-123');

      expect(mockSet).toHaveBeenCalledWith({ isEditModalOpen: true, editingNoteId: 'note-123', editModalSourceRect: null });
    });

    it('should open edit modal with Note object', () => {
      const note = { id: 'note-456', title: 'Test Note', content: 'Test content' };
      slice.openEditModal(note as Parameters<typeof slice.openEditModal>[0]);

      expect(mockSet).toHaveBeenCalledWith({ isEditModalOpen: true, editingNoteId: 'note-456', editModalSourceRect: null });
    });

    it('should close edit modal and clear editingNoteId', () => {
      slice.closeEditModal();

      expect(mockSet).toHaveBeenCalledWith({ isEditModalOpen: false, editingNoteId: null, editModalSourceRect: null });
    });
  });

  // ============================================
  // Mobile Menu Actions Tests
  // ============================================
  describe('mobile menu actions', () => {
    it('should open mobile menu', () => {
      slice.openMobileMenu();

      expect(mockSet).toHaveBeenCalledWith({ isMobileMenuOpen: true });
    });

    it('should close mobile menu', () => {
      slice.closeMobileMenu();

      expect(mockSet).toHaveBeenCalledWith({ isMobileMenuOpen: false });
    });

    it('should toggle mobile menu from closed to open', () => {
      state.isMobileMenuOpen = false;
      slice.toggleMobileMenu();

      expect(state.isMobileMenuOpen).toBe(true);
    });

    it('should toggle mobile menu from open to closed', () => {
      state.isMobileMenuOpen = true;
      slice.toggleMobileMenu();

      expect(state.isMobileMenuOpen).toBe(false);
    });
  });

  // ============================================
  // Search Actions Tests
  // ============================================
  describe('search actions', () => {
    it('should open search', () => {
      slice.openSearch();

      expect(mockSet).toHaveBeenCalledWith({ isSearchOpen: true });
    });

    it('should close search and clear query', () => {
      slice.closeSearch();

      expect(mockSet).toHaveBeenCalledWith({ isSearchOpen: false, searchQuery: '' });
    });

    it('should set search query', () => {
      slice.setSearchQuery('test query');

      expect(mockSet).toHaveBeenCalledWith({ searchQuery: 'test query' });
    });

    it('should set search mode', () => {
      slice.setSearchMode('title');

      expect(mockSet).toHaveBeenCalledWith({ searchMode: 'title' });
    });

    it('should toggle search mode from both to title', () => {
      state.searchMode = 'both';
      slice.toggleSearchMode();

      expect(state.searchMode).toBe('title');
    });

    it('should toggle search mode from title to content', () => {
      state.searchMode = 'title';
      slice.toggleSearchMode();

      expect(state.searchMode).toBe('content');
    });

    it('should toggle search mode from content to both', () => {
      state.searchMode = 'content';
      slice.toggleSearchMode();

      expect(state.searchMode).toBe('both');
    });
  });

  // ============================================
  // Sidebar Actions Tests
  // ============================================
  describe('sidebar actions', () => {
    it('should toggle sidebar from expanded to collapsed', () => {
      state.sidebarState = 'expanded';
      state.previousSidebarState = null;
      slice.toggleSidebar();

      expect(state.sidebarState).toBe('collapsed');
      expect(state.previousSidebarState).toBe('expanded');
    });

    it('should toggle sidebar from collapsed to expanded', () => {
      state.sidebarState = 'collapsed';
      state.previousSidebarState = 'closed';
      slice.toggleSidebar();

      expect(state.sidebarState).toBe('expanded');
    });

    it('should toggle sidebar from collapsed to closed when previous was expanded', () => {
      state.sidebarState = 'collapsed';
      state.previousSidebarState = 'expanded';
      slice.toggleSidebar();

      expect(state.sidebarState).toBe('closed');
    });

    it('should toggle sidebar from closed to collapsed', () => {
      state.sidebarState = 'closed';
      state.previousSidebarState = null;
      slice.toggleSidebar();

      expect(state.sidebarState).toBe('collapsed');
    });

    it('should close sidebar', () => {
      state.sidebarState = 'expanded';
      slice.closeSidebar();

      expect(state.sidebarState).toBe('closed');
      expect(state.previousSidebarState).toBe('expanded');
    });

    it('should save sidebar state to localStorage', () => {
      state.sidebarState = 'expanded';
      slice.toggleSidebar();

      expect(localStorage.setItem).toHaveBeenCalledWith('second-brain-sidebar-state', 'collapsed');
    });
  });

  // ============================================
  // Notes View Mode Tests
  // ============================================
  describe('notes view mode', () => {
    it('should set notes view mode to list', () => {
      slice.setNotesViewMode('list');

      expect(mockSet).toHaveBeenCalledWith({ notesViewMode: 'list' });
      expect(localStorage.setItem).toHaveBeenCalledWith('second-brain-notes-view-mode', 'list');
    });

    it('should set notes view mode to card', () => {
      slice.setNotesViewMode('card');

      expect(mockSet).toHaveBeenCalledWith({ notesViewMode: 'card' });
    });

    it('should set directory view mode', () => {
      slice.setDirectoryViewMode('list');

      expect(mockSet).toHaveBeenCalledWith({ directoryViewMode: 'list' });
      expect(localStorage.setItem).toHaveBeenCalledWith('second-brain-directory-view-mode', 'list');
    });
  });

  // ============================================
  // Fullscreen Actions Tests
  // ============================================
  describe('fullscreen actions', () => {
    it('should toggle fullscreen chat from false to true', () => {
      state.isFullscreenChat = false;
      slice.toggleFullscreenChat();

      expect(state.isFullscreenChat).toBe(true);
    });

    it('should toggle fullscreen chat from true to false', () => {
      state.isFullscreenChat = true;
      slice.toggleFullscreenChat();

      expect(state.isFullscreenChat).toBe(false);
    });

    it('should toggle fullscreen directory', () => {
      state.isFullscreenDirectory = false;
      slice.toggleFullscreenDirectory();

      expect(state.isFullscreenDirectory).toBe(true);
    });

    it('should set fullscreen chat', () => {
      slice.setFullscreenChat(true);

      expect(mockSet).toHaveBeenCalledWith({ isFullscreenChat: true });
    });

    it('should set fullscreen directory', () => {
      slice.setFullscreenDirectory(true);

      expect(mockSet).toHaveBeenCalledWith({ isFullscreenDirectory: true });
    });
  });
});
