/**
 * Voice Page Context
 * Provides voice header state to components outside the VoicePage tree (like Header)
 *
 * Uses separate contexts for state and setter to prevent infinite render loops:
 * - StateContext: For consumers that need to READ the header state (Header component)
 * - SetterContext: For producers that need to WRITE the header state (VoiceAgentPage)
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  VoiceSessionState,
  VoiceProviderType,
  VoiceInfo,
  GrokVoiceInfo,
  VoiceSessionSummary,
} from '../types/voice-types';

// ============================================================================
// Types
// ============================================================================

export interface VoiceProviderInfo {
  provider: string;
  isHealthy: boolean;
  availableModels: string[];
}

export interface VoiceAgentCapability {
  id: string;
  displayName: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export interface VoiceHeaderState {
  // Sidebar
  showSidebar: boolean;
  onToggleSidebar: () => void;

  // Provider/Model Selection (for Standard voice provider type)
  isHealthLoading: boolean;
  availableProviders: VoiceProviderInfo[];
  selectedProvider: string | null;
  selectedModel: string | null;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onRefreshProviders?: () => Promise<void>;
  isRefreshing?: boolean;

  // Voice Provider Type (Standard vs GrokVoice)
  voiceProviderType: VoiceProviderType;
  onVoiceProviderTypeChange: (type: VoiceProviderType) => void;

  // Voice Selection (TTS voice for Standard mode)
  selectedVoiceId: string | null;
  availableVoices: VoiceInfo[];
  onVoiceChange: (voiceId: string) => void;

  // Grok Voice settings
  selectedGrokVoice: string;
  availableGrokVoices: GrokVoiceInfo[];
  onGrokVoiceChange: (voice: string) => void;
  enableGrokWebSearch: boolean;
  enableGrokXSearch: boolean;
  onGrokWebSearchChange: (enabled: boolean) => void;
  onGrokXSearchChange: (enabled: boolean) => void;

  // Agent mode
  agentEnabled: boolean;
  onAgentModeChange: (enabled: boolean) => void;
  agentCapabilities: VoiceAgentCapability[];

  // Session state
  isConnected: boolean;
  isConnecting: boolean;
  sessionState: VoiceSessionState;
  sessionId: string | null;

  // Session history (for sidebar)
  sessionHistory: VoiceSessionSummary[];
  sessionCount: number;
  isLoadingHistory: boolean;
  selectedHistoricalSessionId: string | null;
  onSelectHistoricalSession: (sessionId: string | null) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onRefreshHistory: () => void;
  onNewSession: () => void;

  // Selection mode
  isSelectionMode: boolean;
  selectedSessionIds: Set<string>;
  onToggleSelectionMode: () => void;
  onToggleSessionSelection: (sessionId: string) => void;
  onSelectAllSessions: () => void;
  onBulkDeleteSessions: () => Promise<void>;
  onExitSelectionMode: () => void;

  // Actions
  onStartSession: () => void;
  onEndSession: () => void;
}

// ============================================================================
// Contexts
// ============================================================================

// Separate contexts to prevent render loops
// StateContext changes when headerState changes - only consumed by Header
const VoicePageStateContext = createContext<VoiceHeaderState | null>(null);

// SetterContext is stable and never changes - used by VoiceAgentPage to set state
type SetHeaderStateFn = (state: VoiceHeaderState | null) => void;
const VoicePageSetterContext = createContext<SetHeaderStateFn | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export function VoicePageProvider({ children }: { children: ReactNode }) {
  const [headerState, setHeaderState] = useState<VoiceHeaderState | null>(null);

  // Stable setter that never changes reference
  const setHeaderStateCallback = useCallback((state: VoiceHeaderState | null) => {
    setHeaderState(state);
  }, []);

  return (
    <VoicePageSetterContext.Provider value={setHeaderStateCallback}>
      <VoicePageStateContext.Provider value={headerState}>
        {children}
      </VoicePageStateContext.Provider>
    </VoicePageSetterContext.Provider>
  );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for components that need to SET the header state (VoiceAgentPage)
 * This hook returns a stable setter that never causes re-renders
 */
export function useVoicePageContext() {
  const setHeaderState = useContext(VoicePageSetterContext);
  if (!setHeaderState) {
    throw new Error('useVoicePageContext must be used within a VoicePageProvider');
  }
  return { setHeaderState };
}

/**
 * Hook for components that need to READ the header state (Header/VoicePageControls)
 * This hook will cause re-renders when header state changes
 */
export function useVoiceHeaderState() {
  return useContext(VoicePageStateContext);
}
