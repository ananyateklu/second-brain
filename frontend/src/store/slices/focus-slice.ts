/**
 * Focus Slice
 * Manages focus/productivity UI state like quick capture modal
 */

import type { FocusSlice, SliceCreator, FocusViewMode } from '../types';

const FOCUS_VIEW_MODE_STORAGE_KEY = 'second-brain-focus-view-mode';

/**
 * Load focus view mode from localStorage
 */
const loadFocusViewMode = (): FocusViewMode => {
  if (typeof window === 'undefined') return 'timeline';
  const stored = localStorage.getItem(FOCUS_VIEW_MODE_STORAGE_KEY);
  if (stored === 'timeline' || stored === 'kanban') {
    return stored;
  }
  return 'timeline';
};

/**
 * Save focus view mode to localStorage
 */
const saveFocusViewMode = (mode: FocusViewMode) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FOCUS_VIEW_MODE_STORAGE_KEY, mode);
};

// Initialize from storage
const initialFocusViewMode = loadFocusViewMode();

export const createFocusSlice: SliceCreator<FocusSlice> = (set) => ({
  // Quick capture modal state
  isQuickCaptureOpen: false,
  quickCaptureSourceRect: null,

  // Backlog filter
  selectedBacklogPriority: null,

  // View mode
  focusViewMode: initialFocusViewMode,

  // Quick capture modal actions
  openQuickCapture: (sourceRect = null) => set({
    isQuickCaptureOpen: true,
    quickCaptureSourceRect: sourceRect,
  }),

  closeQuickCapture: () => set({
    isQuickCaptureOpen: false,
    quickCaptureSourceRect: null,
  }),

  // Backlog filter action
  setSelectedBacklogPriority: (priority) => set({
    selectedBacklogPriority: priority,
  }),

  // View mode action
  setFocusViewMode: (mode) => {
    saveFocusViewMode(mode);
    set({ focusViewMode: mode });
  },
});
