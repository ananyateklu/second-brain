/**
 * Directory Page Context
 * Provides directory header state to components outside the DirectoryPage tree (like Header)
 *
 * Uses separate contexts for state and setter to prevent infinite render loops:
 * - StateContext: For consumers that need to READ the header state (Header component)
 * - SetterContext: For producers that need to WRITE the header state (DirectoryPage)
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface DirectoryHeaderState {
  noteCount: number;
}

// Separate contexts to prevent render loops
// StateContext changes when headerState changes - only consumed by Header
const DirectoryPageStateContext = createContext<DirectoryHeaderState | null>(null);

// SetterContext is stable and never changes - used by DirectoryPage to set state
type SetHeaderStateFn = (state: DirectoryHeaderState | null) => void;
const DirectoryPageSetterContext = createContext<SetHeaderStateFn | null>(null);

export function DirectoryPageProvider({ children }: { children: ReactNode }) {
  const [headerState, setHeaderState] = useState<DirectoryHeaderState | null>(null);

  // Stable setter that never changes reference
  const setHeaderStateCallback = useCallback((state: DirectoryHeaderState | null) => {
    setHeaderState(state);
  }, []);

  return (
    <DirectoryPageSetterContext.Provider value={setHeaderStateCallback}>
      <DirectoryPageStateContext.Provider value={headerState}>
        {children}
      </DirectoryPageStateContext.Provider>
    </DirectoryPageSetterContext.Provider>
  );
}

/**
 * Hook for components that need to SET the header state (DirectoryPage)
 * This hook returns a stable setter that never causes re-renders
 */
export function useDirectoryPageContext() {
  const setHeaderState = useContext(DirectoryPageSetterContext);
  if (!setHeaderState) {
    throw new Error('useDirectoryPageContext must be used within a DirectoryPageProvider');
  }
  return { setHeaderState };
}

/**
 * Hook for components that need to READ the header state (Header/DirectoryPageControls)
 * This hook will cause re-renders when header state changes
 */
export function useDirectoryHeaderState() {
  return useContext(DirectoryPageStateContext);
}
