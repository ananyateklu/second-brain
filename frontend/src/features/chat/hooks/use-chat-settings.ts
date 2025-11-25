import { useState, useEffect, useCallback } from 'react';
import { useUpdateConversationSettings } from './use-chat';
import { useSettingsStore } from '../../../store/settings-store';
import { ChatConversation } from '../types/chat';

export interface ChatSettingsState {
  ragEnabled: boolean;
  selectedVectorStore: 'PostgreSQL' | 'Pinecone';
  agentModeEnabled: boolean;
  notesCapabilityEnabled: boolean;
}

export interface ChatSettingsActions {
  setRagEnabled: (enabled: boolean) => void;
  setSelectedVectorStore: (provider: 'PostgreSQL' | 'Pinecone') => void;
  setAgentModeEnabled: (enabled: boolean) => void;
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
  const [notesCapabilityEnabled, setNotesCapabilityEnabledLocal] = useState<boolean>(false);

  // Load settings from selected conversation
  useEffect(() => {
    if (conversation) {
      setRagEnabledLocal(conversation.ragEnabled);
      if (conversation.vectorStoreProvider) {
        setSelectedVectorStoreLocal(conversation.vectorStoreProvider as 'PostgreSQL' | 'Pinecone');
      }
      // Load agent settings from conversation
      setAgentModeEnabledLocal(conversation.agentEnabled);
      const capabilities = parseAgentCapabilities(conversation.agentCapabilities);
      setNotesCapabilityEnabledLocal(capabilities.includes('notes'));
    }
  }, [conversation]);

  // When starting a new chat, reset to defaults
  useEffect(() => {
    if (!conversationId && isNewChat) {
      setRagEnabledLocal(false);
      setSelectedVectorStoreLocal(defaultVectorStore);
      setAgentModeEnabledLocal(false);
      setNotesCapabilityEnabledLocal(false);
    }
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
    notesCapabilityEnabled,
    // Setters
    setRagEnabled: setRagEnabledLocal,
    setSelectedVectorStore: setSelectedVectorStoreLocal,
    setAgentModeEnabled,
    setNotesCapabilityEnabled,
    // Handlers
    handleRagToggle,
    handleVectorStoreChange,
  };
}
