import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  useChatConversations,
  useChatConversation,
  useCreateConversation,
  useDeleteConversation,
  useBulkDeleteConversations,
} from './use-chat';
import { toast } from '../../../hooks/use-toast';
import { useAuthStore } from '../../../store/auth-store';
import { DEFAULT_USER_ID } from '../../../lib/constants';
import { ChatConversation, CreateConversationRequest } from '../types/chat';
import { MessageImage } from '../types/chat';

export interface PendingMessage {
  content: string;
  images?: MessageImage[];
}

export interface ConversationManagerState {
  conversationId: string | null;
  conversation: ChatConversation | undefined;
  conversations: ChatConversation[] | undefined;
  displayConversations: ChatConversation[];
  isNewChat: boolean;
  pendingMessage: PendingMessage | null;
  isCreating: boolean;
}

export interface ConversationManagerActions {
  setConversationId: (id: string | null) => void;
  setPendingMessage: (message: PendingMessage | null) => void;
  handleNewChat: () => void;
  handleSelectConversation: (id: string, onSelect?: (conv: ChatConversation) => void) => void;
  handleDeleteConversation: (id: string) => Promise<void>;
  handleBulkDeleteConversations: (ids: string[]) => Promise<void>;
  createConversation: (request: CreateConversationRequest) => Promise<ChatConversation>;
  clearPendingIfMatched: (isStreaming: boolean, streamingMessage: string) => void;
}

export interface UseConversationManagerOptions {
  selectedProvider: string;
  selectedModel: string;
  ragEnabled: boolean;
  selectedVectorStore: string;
}

/**
 * Manages conversation state: selection, creation, deletion, and display.
 */
export function useChatConversationManager(
  options: UseConversationManagerOptions
): ConversationManagerState & ConversationManagerActions {
  const { selectedProvider, selectedModel, ragEnabled, selectedVectorStore } = options;

  const [conversationId, setConversationIdState] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);

  const user = useAuthStore((state) => state.user);
  const { data: conversations } = useChatConversations();
  const { data: conversation } = useChatConversation(conversationId);
  const createConversationMutation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const bulkDeleteMutation = useBulkDeleteConversations();

  // Auto-load most recent conversation on mount (but not when user explicitly starts new chat)
  // Use a ref to track if we've auto-loaded to avoid repeated state updates
  const hasAutoLoadedRef = useRef(false);
  useEffect(() => {
    if (conversations && conversations.length > 0 && !conversationId && !isNewChat && !hasAutoLoadedRef.current) {
      hasAutoLoadedRef.current = true;
      const mostRecent = conversations.reduce((prev, current) =>
        new Date(current.updatedAt) > new Date(prev.updatedAt) ? current : prev
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Valid initial state sync from external data
      setConversationIdState(mostRecent.id);
    }
    // Reset the ref when starting a new chat
    if (isNewChat) {
      hasAutoLoadedRef.current = false;
    }
  }, [conversations, conversationId, isNewChat]);

  // Create placeholder conversation for new chat
  const placeholderConversation = useMemo(() => {
    if (!isNewChat || !selectedProvider || !selectedModel) return null;

    return {
      id: 'placeholder-new-chat',
      title: 'New Chat',
      provider: selectedProvider,
      model: selectedModel,
      ragEnabled: ragEnabled,
      agentEnabled: false,
      imageGenerationEnabled: false,
      vectorStoreProvider: ragEnabled ? selectedVectorStore : undefined,
      messages: [],
      userId: user?.userId || DEFAULT_USER_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as ChatConversation;
  }, [isNewChat, selectedProvider, selectedModel, ragEnabled, selectedVectorStore, user?.userId]);

  // Combine placeholder with actual conversations
  const displayConversations = useMemo(() => {
    const actualConversations = conversations || [];
    if (placeholderConversation) {
      return [placeholderConversation, ...actualConversations];
    }
    return actualConversations;
  }, [conversations, placeholderConversation]);

  // Set conversation ID
  const setConversationId = useCallback((id: string | null) => {
    setConversationIdState(id);
    if (id) {
      setIsNewChat(false);
    }
  }, []);

  // Handle new chat
  const handleNewChat = useCallback(() => {
    setConversationIdState(null);
    setPendingMessage(null);
    setIsNewChat(true);
  }, []);

  // Handle conversation selection
  const handleSelectConversation = useCallback((
    id: string,
    onSelect?: (conv: ChatConversation) => void
  ) => {
    // Handle placeholder conversation
    if (id === 'placeholder-new-chat') {
      setConversationIdState(null);
      setPendingMessage(null);
      setIsNewChat(true);
      return;
    }

    setConversationIdState(id);
    setPendingMessage(null);
    setIsNewChat(false);

    // Call onSelect callback with the selected conversation
    const conv = conversations?.find((c) => c.id === id);
    if (conv && onSelect) {
      onSelect(conv);
    }
  }, [conversations]);

  // Handle conversation deletion
  const handleDeleteConversation = useCallback(async (id: string) => {
    const confirmed = await toast.confirm({
      title: 'Delete Conversation',
      description: 'Are you sure you want to delete this conversation?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      // Determine next conversation to select before deletion
      // Select the most recently updated conversation (matching auto-load behavior)
      const remainingConversations = conversations?.filter((c) => c.id !== id) || [];
      const nextConversation = remainingConversations.length > 0
        ? remainingConversations.reduce((prev, current) =>
          new Date(current.updatedAt) > new Date(prev.updatedAt) ? current : prev
        )
        : null;

      await deleteConversationMutation.mutateAsync(id);
      toast.success('Conversation deleted');

      if (conversationId === id) {
        if (nextConversation) {
          // Select the next available conversation (most recently updated)
          setConversationIdState(nextConversation.id);
          setIsNewChat(false);
        } else {
          // No conversations left, show new chat state
          setConversationIdState(null);
          setIsNewChat(true);
        }
      }
    }
  }, [conversationId, conversations, deleteConversationMutation]);

  // Handle bulk conversation deletion
  const handleBulkDeleteConversations = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    const confirmed = await toast.confirm({
      title: 'Delete Conversations',
      description: `Are you sure you want to delete ${ids.length} conversation${ids.length > 1 ? 's' : ''}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      try {
        // Use bulk delete endpoint - single API call instead of multiple
        const result = await bulkDeleteMutation.mutateAsync(ids);

        toast.success(`${result.deletedCount} conversation${result.deletedCount !== 1 ? 's' : ''} deleted`);

        // Determine next conversation to select after bulk deletion
        const remainingConversations = conversations?.filter((c) => !ids.includes(c.id)) || [];
        const deletedCurrentConversation = conversationId && ids.includes(conversationId);

        if (deletedCurrentConversation) {
          if (remainingConversations.length > 0) {
            // Select the most recently updated remaining conversation
            const nextConversation = remainingConversations.reduce((prev, current) =>
              new Date(current.updatedAt) > new Date(prev.updatedAt) ? current : prev
            );
            setConversationIdState(nextConversation.id);
            setIsNewChat(false);
          } else {
            // No conversations left, show new chat state
            setConversationIdState(null);
            setIsNewChat(true);
          }
        }
      } catch (error) {
        console.error('Error deleting conversations:', { error, ids });
        toast.error('Failed to delete conversations');
      }
    }
  }, [conversationId, conversations, bulkDeleteMutation]);

  // Create a new conversation
  const createConversation = useCallback(async (request: CreateConversationRequest) => {
    const newConversation = await createConversationMutation.mutateAsync(request);
    setConversationIdState(newConversation.id);
    setIsNewChat(false);
    return newConversation;
  }, [createConversationMutation]);

  // Clear pending message if it matches a message in the conversation
  const clearPendingIfMatched = useCallback((
    isStreaming: boolean,
    streamingMessage: string
  ) => {
    if (pendingMessage && conversation?.messages) {
      const hasPendingMessage = conversation.messages.some(
        (msg) => msg.role === 'user' && msg.content === pendingMessage.content
      );

      // Clear pending message once it's in the conversation and streaming is done
      if (hasPendingMessage && !isStreaming && !streamingMessage) {
        setPendingMessage(null);
      }
    }
  }, [pendingMessage, conversation]);

  return {
    // State
    conversationId,
    conversation,
    conversations,
    displayConversations,
    isNewChat,
    pendingMessage,
    isCreating: createConversationMutation.isPending,
    // Actions
    setConversationId,
    setPendingMessage,
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleBulkDeleteConversations,
    createConversation,
    clearPendingIfMatched,
  };
}

