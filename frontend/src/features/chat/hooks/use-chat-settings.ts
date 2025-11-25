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
 * Manages chat settings state (RAG, vector store, agent mode, capabilities).
 */
export function useChatSettings(options: UseChatSettingsOptions): ChatSettingsState & ChatSettingsActions {
  const { conversationId, conversation, isNewChat } = options;
  const { vectorStoreProvider: defaultVectorStore } = useSettingsStore();
  const updateConversationSettings = useUpdateConversationSettings();

  const [ragEnabled, setRagEnabledLocal] = useState<boolean>(false);
  const [selectedVectorStore, setSelectedVectorStoreLocal] = useState<'PostgreSQL' | 'Pinecone'>(defaultVectorStore);
  const [agentModeEnabled, setAgentModeEnabled] = useState<boolean>(false);
  const [notesCapabilityEnabled, setNotesCapabilityEnabled] = useState<boolean>(true);

  // Load RAG settings from selected conversation
  useEffect(() => {
    if (conversation) {
      setRagEnabledLocal(conversation.ragEnabled);
      if (conversation.vectorStoreProvider) {
        setSelectedVectorStoreLocal(conversation.vectorStoreProvider as 'PostgreSQL' | 'Pinecone');
      }
    }
  }, [conversation]);

  // When starting a new chat, reset to defaults
  useEffect(() => {
    if (!conversationId && isNewChat) {
      setRagEnabledLocal(false);
      setSelectedVectorStoreLocal(defaultVectorStore);
    }
  }, [conversationId, isNewChat, defaultVectorStore]);

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

