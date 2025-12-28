/**
 * Chat Page Context
 * Provides chat header state to components outside the ChatPage tree (like Header)
 *
 * Uses separate contexts for state and setter to prevent infinite render loops:
 * - StateContext: For consumers that need to READ the header state (Header component)
 * - SetterContext: For producers that need to WRITE the header state (ChatPage)
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ContextUsageState } from '../../../types/context-usage';
import type { ProviderInfo, AgentCapability } from '../components/ChatHeader';

export interface ChatHeaderState {
  // Sidebar
  showSidebar: boolean;
  onToggleSidebar: () => void;
  // Provider Selection
  isHealthLoading: boolean;
  availableProviders: ProviderInfo[];
  selectedProvider: string;
  selectedModel: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  onRefreshProviders?: () => Promise<void>;
  isRefreshing?: boolean;
  // RAG settings
  ragEnabled: boolean;
  onRagToggle: (enabled: boolean) => void;
  // Agent settings
  agentModeEnabled: boolean;
  onAgentModeChange: (enabled: boolean) => void;
  agentRagEnabled: boolean;
  agentCapabilities: AgentCapability[];
  // Loading state
  isLoading: boolean;
  // Image generation mode
  isImageGenerationMode: boolean;
  // Context usage
  contextUsage: ContextUsageState;
  isStreaming: boolean;
  // Sidebar controls (for header integration)
  conversationCount: number;
  isSelectionMode: boolean;
  selectedConversationIds: Set<string>;
  onNewChat: () => void;
  onToggleSelectionMode: () => void;
  onSelectAll: () => void;
  onBulkDelete: () => Promise<void>;
  onExitSelectionMode: () => void;
  onToggleConversationSelection: (id: string) => void;
}

// Separate contexts to prevent render loops
// StateContext changes when headerState changes - only consumed by Header
const ChatPageStateContext = createContext<ChatHeaderState | null>(null);

// SetterContext is stable and never changes - used by ChatPage to set state
type SetHeaderStateFn = (state: ChatHeaderState | null) => void;
const ChatPageSetterContext = createContext<SetHeaderStateFn | null>(null);

export function ChatPageProvider({ children }: { children: ReactNode }) {
  const [headerState, setHeaderState] = useState<ChatHeaderState | null>(null);

  // Stable setter that never changes reference
  const setHeaderStateCallback = useCallback((state: ChatHeaderState | null) => {
    setHeaderState(state);
  }, []);

  return (
    <ChatPageSetterContext.Provider value={setHeaderStateCallback}>
      <ChatPageStateContext.Provider value={headerState}>
        {children}
      </ChatPageStateContext.Provider>
    </ChatPageSetterContext.Provider>
  );
}

/**
 * Hook for components that need to SET the header state (ChatPage)
 * This hook returns a stable setter that never causes re-renders
 */
export function useChatPageContext() {
  const setHeaderState = useContext(ChatPageSetterContext);
  if (!setHeaderState) {
    throw new Error('useChatPageContext must be used within a ChatPageProvider');
  }
  return { setHeaderState };
}

/**
 * Hook for components that need to READ the header state (Header/ChatPageControls)
 * This hook will cause re-renders when header state changes
 */
export function useChatHeaderState() {
  return useContext(ChatPageStateContext);
}
