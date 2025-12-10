/**
 * User Settings Effect Hook
 * Applies user settings (fontSize, notifications, etc.) to the application
 */

import { useEffect, useRef } from 'react';
import { useBoundStore } from '../store/bound-store';
import type { FontSize, NoteView } from '../store/types';

// Font size mapping to CSS values (rem units for accessibility)
const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '0.875',   // 14px base
  medium: '1',      // 16px base (default)
  large: '1.125',   // 18px base
};

// Map defaultNoteView ('list' | 'grid') to notesViewMode ('list' | 'card')
const mapNoteViewToViewMode = (view: NoteView): 'list' | 'card' => {
  return view === 'grid' ? 'card' : 'list';
};

/**
 * Hook that applies user settings to the document
 * - Applies fontSize as CSS custom property
 * - Syncs defaultNoteView with both notesViewMode and directoryViewMode when setting changes
 */
export function useUserSettingsEffect() {
  const fontSize = useBoundStore((state) => state.fontSize);
  const defaultNoteView = useBoundStore((state) => state.defaultNoteView);
  const setNotesViewMode = useBoundStore((state) => state.setNotesViewMode);
  const setDirectoryViewMode = useBoundStore((state) => state.setDirectoryViewMode);

  // Track the previous defaultNoteView to detect changes from settings
  const prevDefaultNoteViewRef = useRef<NoteView>(defaultNoteView);

  // Apply font size to document
  useEffect(() => {
    const fontSizeValue = FONT_SIZE_MAP[fontSize] || FONT_SIZE_MAP.medium;
    document.documentElement.style.setProperty('--user-font-size', fontSizeValue);
    // Also set a multiplier that components can use
    document.documentElement.style.setProperty('--user-font-multiplier', fontSizeValue);
  }, [fontSize]);

  // Sync defaultNoteView with both page view modes when the setting changes
  // This effect runs whenever defaultNoteView changes (e.g., from General Settings)
  // Each page has its own independent view mode, but changing the default updates both
  useEffect(() => {
    const targetViewMode = mapNoteViewToViewMode(defaultNoteView);

    // Only update if the defaultNoteView setting actually changed
    // This prevents overriding page-specific toggle changes
    if (prevDefaultNoteViewRef.current !== defaultNoteView) {
      setNotesViewMode(targetViewMode);
      setDirectoryViewMode(targetViewMode);
      prevDefaultNoteViewRef.current = defaultNoteView;
    }
  }, [defaultNoteView, setNotesViewMode, setDirectoryViewMode]);
}

export default useUserSettingsEffect;
