import { useState, useEffect, useCallback, useRef } from 'react';
import { useUpdateConversationSettings } from './use-chat';
import { useSettingsStore } from '../../../store/settings-store';
import { ChatConversation } from '../types/chat';

export interface ChatSettingsState {
  ragEnabled: boolean;
  selectedVectorStore: 'PostgreSQL' | 'Pinecone';
  agentModeEnabled: boolean;
  agentRagEnabled: boolean;
  notesCapabilityEnabled: boolean;
}

export interface ChatSettingsActions {
  setRagEnabled: (enabled: boolean) => void;
  setSelectedVectorStore: (provider: 'PostgreSQL' | 'Pinecone') => void;
  setAgentModeEnabled: (enabled: boolean) => void;
  setAgentRagEnabled: (enabled: boolean) => void;
  setNotesCapabilityEnabled: (enabled: boolean) => void;
  handleRagToggle: (enabled: boolean) => Promise<void>;
  handleVectorStoreChange: (provider: 'PostgreSQL' | 'Pinecone') => Promise<void>;
}

export interface UseChatSettingsOptions {
  conversationId: string | null;
  conversation: ChatConversation | undefined;
  isNewChat: boolean;
}

/**
 * Helper to parse agent capabilities from JSON string stored per conversation.
 */
function parseAgentCapabilities(capabilitiesJson: string | null | undefined): string[] {
  if (!capabilitiesJson) return [];
  try {
    const parsed = JSON.parse(capabilitiesJson);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    // Invalid JSON, return empty array
  }
  return [];
}

/**
 * Manages chat settings state (RAG, vector store, agent mode, capabilities).
 * Agent settings are stored per-conversation, not per-user.
 */
export function useChatSettings(options: UseChatSettingsOptions): ChatSettingsState & ChatSettingsActions {
  const { conversationId, conversation, isNewChat } = options;
  const { vectorStoreProvider: defaultVectorStore } = useSettingsStore();
  const updateConversationSettings = useUpdateConversationSettings();

  const [ragEnabled, setRagEnabledLocal] = useState<boolean>(false);
  const [selectedVectorStore, setSelectedVectorStoreLocal] = useState<'PostgreSQL' | 'Pinecone'>(defaultVectorStore);
  const [agentModeEnabled, setAgentModeEnabledLocal] = useState<boolean>(false);
  const [agentRagEnabled, setAgentRagEnabledLocal] = useState<boolean>(true);
  const [notesCapabilityEnabled, setNotesCapabilityEnabledLocal] = useState<boolean>(false);

  // Track the last conversation ID to only sync on conversation change, not on data updates
  const lastLoadedConversationId = useRef<string | null>(null);

  // Load settings from selected conversation - only when switching to a different conversation
  // This prevents resetting local state when the mutation returns updated data
  useEffect(() => {
    if (conversation && conversation.id !== lastLoadedConversationId.current) {
      lastLoadedConversationId.current = conversation.id;
      // Batch all state updates together
      const ragEnabled = conversation.ragEnabled;
      const vectorStore = conversation.vectorStoreProvider as 'PostgreSQL' | 'Pinecone' | undefined;
      const agentEnabled = conversation.agentEnabled;
      const agentRagEnabled = conversation.agentRagEnabled ?? true;
      const capabilities = parseAgentCapabilities(conversation.agentCapabilities);

      /* eslint-disable react-hooks/set-state-in-effect -- Valid state sync from conversation data */
      setRagEnabledLocal(ragEnabled);
      if (vectorStore) {
        setSelectedVectorStoreLocal(vectorStore);
      }
      setAgentModeEnabledLocal(agentEnabled);
      setAgentRagEnabledLocal(agentRagEnabled);
      setNotesCapabilityEnabledLocal(capabilities.includes('notes'));
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [conversation]);

  // When starting a new chat, reset to defaults
  const prevIsNewChatRef = useRef(isNewChat);
  useEffect(() => {
    // Only reset when transitioning to new chat state
    if (!conversationId && isNewChat && !prevIsNewChatRef.current) {
      lastLoadedConversationId.current = null; // Reset the ref for new chats
      /* eslint-disable react-hooks/set-state-in-effect -- Valid state reset for new chat */
      setRagEnabledLocal(false);
      setSelectedVectorStoreLocal(defaultVectorStore);
      setAgentModeEnabledLocal(false);
      setAgentRagEnabledLocal(true); // Default to true for new chats
      setNotesCapabilityEnabledLocal(false);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    prevIsNewChatRef.current = isNewChat;
  }, [conversationId, isNewChat, defaultVectorStore]);

  // Handle agent mode enabled change - save to conversation
  const setAgentModeEnabled = useCallback(async (enabled: boolean) => {
    setAgentModeEnabledLocal(enabled);

    if (conversationId) {
      try {
        await updateConversationSettings.mutateAsync({
          conversationId,
          request: { agentEnabled: enabled },
        });
      } catch (error) {
        console.error('Failed to update agent mode for conversation:', { error });
      }
    }
  }, [conversationId, updateConversationSettings]);

  // Handle agent RAG enabled change - save to conversation
  const setAgentRagEnabled = useCallback(async (enabled: boolean) => {
    setAgentRagEnabledLocal(enabled);

    if (conversationId) {
      try {
        await updateConversationSettings.mutateAsync({
          conversationId,
          request: { agentRagEnabled: enabled },
        });
      } catch (error) {
        console.error('Failed to update agent RAG for conversation:', { error });
      }
    }
  }, [conversationId, updateConversationSettings]);

  // Handle notes capability change - save to conversation
  const setNotesCapabilityEnabled = useCallback(async (enabled: boolean) => {
    setNotesCapabilityEnabledLocal(enabled);

    if (conversationId) {
      // Build new capabilities array
      const currentCapabilities = parseAgentCapabilities(conversation?.agentCapabilities);
      const filteredCapabilities = currentCapabilities.filter((cap) => cap !== 'notes');
      const newCapabilities = enabled
        ? [...filteredCapabilities, 'notes']
        : filteredCapabilities;

      try {
        await updateConversationSettings.mutateAsync({
          conversationId,
          request: { agentCapabilities: JSON.stringify(newCapabilities) },
        });
      } catch (error) {
        console.error('Failed to update agent capabilities for conversation:', { error });
      }
    }
  }, [conversationId, conversation?.agentCapabilities, updateConversationSettings]);

  // Handle RAG toggle change - save to conversation
  const handleRagToggle = useCallback(async (enabled: boolean) => {
    setRagEnabledLocal(enabled);

    if (conversationId) {
      try {
        await updateConversationSettings.mutateAsync({
          conversationId,
          request: { ragEnabled: enabled },
        });
      } catch (error) {
        console.error('Failed to update RAG toggle for conversation:', { error });
      }
    }
  }, [conversationId, updateConversationSettings]);

  // Handle vector store change - save to conversation
  const handleVectorStoreChange = useCallback(async (provider: 'PostgreSQL' | 'Pinecone') => {
    setSelectedVectorStoreLocal(provider);

    if (conversationId) {
      try {
        await updateConversationSettings.mutateAsync({
          conversationId,
          request: { vectorStoreProvider: provider },
        });
      } catch (error) {
        console.error('Failed to update vector store for conversation:', { error });
      }
    }
  }, [conversationId, updateConversationSettings]);

  return {
    // State
    ragEnabled,
    selectedVectorStore,
    agentModeEnabled,
    agentRagEnabled,
    notesCapabilityEnabled,
    // Setters
    setRagEnabled: setRagEnabledLocal,
    setSelectedVectorStore: setSelectedVectorStoreLocal,
    setAgentModeEnabled: (enabled: boolean) => { void setAgentModeEnabled(enabled); },
    setAgentRagEnabled: (enabled: boolean) => { void setAgentRagEnabled(enabled); },
    setNotesCapabilityEnabled: (enabled: boolean) => { void setNotesCapabilityEnabled(enabled); },
    // Handlers
    handleRagToggle,
    handleVectorStoreChange,
  };
}
