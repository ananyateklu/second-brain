/**
 * Chat Page State Hook
 * Consolidates all chat page state management into a single hook
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSendMessage } from './use-chat';
import { useChatConversationManager } from './use-chat-conversation-manager';
import { useChatProviderSelection } from './use-chat-provider-selection';
import { useChatSettings } from './use-chat-settings';
import { useChatScroll } from './use-chat-scroll';
import { useCombinedStreaming } from './use-combined-streaming';
import { chatService } from '../../../services';
import { toast } from '../../../hooks/use-toast';
import { useAuthStore } from '../../../store/auth-store';
import { DEFAULT_USER_ID, QUERY_KEYS } from '../../../lib/constants';
import { isImageGenerationModel } from '../../../utils/image-generation-models';
import type { MessageImage, ImageGenerationResponse, ChatConversation } from '../../../types/chat';
import type { AgentCapability } from '../components/ChatHeader';

export interface ImageGenerationParams {
  prompt: string;
  size: string;
  quality?: string;
  style?: string;
}

export interface ChatPageState {
  // UI State
  inputValue: string;
  showSidebar: boolean;
  isGeneratingImage: boolean;
  containerRef: React.RefObject<HTMLDivElement>;

  // Provider Selection
  selectedProvider: string;
  selectedModel: string;
  availableProviders: Array<{ provider: string; models: string[] }>;
  isHealthLoading: boolean;

  // Conversation State
  conversationId: string | null;
  conversation: ChatConversation | undefined;
  displayConversations: ChatConversation[];
  isNewChat: boolean;
  pendingMessage: { content: string; images?: MessageImage[] } | null;
  isCreating: boolean;

  // Settings
  ragEnabled: boolean;
  selectedVectorStore: string;
  agentModeEnabled: boolean;
  notesCapabilityEnabled: boolean;

  // Streaming State
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: unknown[];
  toolExecutions: unknown[];
  thinkingSteps: unknown[];
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number;

  // Scroll
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;

  // Computed
  isLoading: boolean;
  isImageGenerationMode: boolean;
  agentCapabilities: AgentCapability[];
}

export interface ChatPageActions {
  // UI Actions
  setInputValue: (value: string) => void;
  setShowSidebar: (show: boolean) => void;
  toggleSidebar: () => void;

  // Provider Actions
  handleProviderChange: (provider: string) => void;
  handleModelChange: (model: string) => void;

  // Conversation Actions
  handleNewChat: () => void;
  handleSelectConversation: (id: string) => void;
  handleDeleteConversation: (id: string) => void;

  // Settings Actions
  handleRagToggle: (enabled: boolean) => void;
  handleVectorStoreChange: (store: string) => void;
  setAgentModeEnabled: (enabled: boolean) => void;
  setNotesCapabilityEnabled: (enabled: boolean) => void;

  // Message Actions
  handleSendMessage: (images?: MessageImage[]) => Promise<void>;
  handleGenerateImage: (params: ImageGenerationParams) => Promise<void>;
  handleImageGenerated: (response: ImageGenerationResponse) => void;
  cancelStream: () => void;
}

/**
 * Main hook that consolidates all chat page state and actions
 */
export function useChatPageState(): ChatPageState & ChatPageActions {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Local UI state
  const [inputValue, setInputValue] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Auth
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Send message mutation
  const sendMessage = useSendMessage();

  // Provider selection
  const providerSelection = useChatProviderSelection();
  const {
    selectedProvider,
    selectedModel,
    availableProviders,
    isHealthLoading,
    handleProviderChange,
    handleModelChange,
    setProviderAndModel,
  } = providerSelection;

  // Check if current model is an image generation model
  const isImageGenerationMode = useMemo(() => {
    if (!selectedProvider || !selectedModel) return false;
    return isImageGenerationModel(selectedProvider, selectedModel);
  }, [selectedProvider, selectedModel]);

  // Conversation manager
  const conversationManager = useChatConversationManager({
    selectedProvider,
    selectedModel,
    ragEnabled: false,
    selectedVectorStore: 'PostgreSQL',
  });
  const {
    conversationId,
    conversation,
    displayConversations,
    isNewChat,
    pendingMessage,
    isCreating,
    setPendingMessage,
    handleNewChat,
    handleSelectConversation: baseHandleSelectConversation,
    handleDeleteConversation,
    createConversation,
  } = conversationManager;

  // Settings
  const settings = useChatSettings({
    conversationId,
    conversation,
    isNewChat,
  });
  const {
    ragEnabled,
    selectedVectorStore,
    agentModeEnabled,
    notesCapabilityEnabled,
    setAgentModeEnabled,
    setNotesCapabilityEnabled,
    handleRagToggle,
    handleVectorStoreChange,
  } = settings;

  // Disable RAG and Agent mode when switching to image generation model
  useEffect(() => {
    if (isImageGenerationMode) {
      if (ragEnabled) {
        handleRagToggle(false);
      }
      if (agentModeEnabled) {
        setAgentModeEnabled(false);
      }
    }
  }, [isImageGenerationMode, ragEnabled, agentModeEnabled, handleRagToggle, setAgentModeEnabled]);

  // Combined streaming
  const streaming = useCombinedStreaming(agentModeEnabled);
  const {
    isStreaming,
    streamingMessage,
    streamingError,
    retrievedNotes,
    toolExecutions,
    thinkingSteps,
    inputTokens,
    outputTokens,
    streamDuration,
    sendMessage: sendStreamingMessage,
    cancelStream,
    resetStream,
  } = streaming;

  // Scroll management
  const { messagesEndRef, messagesContainerRef } = useChatScroll({
    isStreaming,
    streamingMessage,
    pendingMessage,
    messagesLength: conversation?.messages?.length || 0,
  });

  // Computed loading state
  const isLoading = sendMessage.isPending || isCreating || isStreaming || isGeneratingImage;

  // Clear pending message when it appears in the conversation
  useEffect(() => {
    if (pendingMessage && conversation?.messages) {
      const hasPendingMessage = conversation.messages.some(
        (msg) =>
          msg.role === 'user' &&
          (msg.content === pendingMessage.content ||
            msg.content.trim() === pendingMessage.content.trim())
      );

      if (hasPendingMessage) {
        setPendingMessage(null);
      }
    }
  }, [pendingMessage, conversation?.messages, setPendingMessage]);

  // Cleanup streaming state once message is persisted
  useEffect(() => {
    if (!isStreaming && streamingMessage && conversation?.messages) {
      const hasMatchingMessage = conversation.messages.some(
        (msg) =>
          msg.role === 'assistant' &&
          (msg.content === streamingMessage ||
            msg.content.trim() === streamingMessage.trim() ||
            (streamingMessage.trim().length > 20 &&
              (msg.content
                .trim()
                .startsWith(
                  streamingMessage.trim().substring(0, Math.min(100, streamingMessage.trim().length))
                ) ||
                msg.content
                  .trim()
                  .includes(
                    streamingMessage.trim().substring(0, Math.min(50, streamingMessage.trim().length))
                  ))))
      );

      if (hasMatchingMessage) {
        setPendingMessage(null);
        resetStream();
      }
    }
  }, [conversation?.messages, isStreaming, streamingMessage, resetStream, setPendingMessage]);

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (images?: MessageImage[]) => {
      if (!inputValue.trim() && (!images || images.length === 0)) return;

      const messageToSend = inputValue.trim();
      setPendingMessage({ content: messageToSend, images });
      setInputValue('');

      try {
        let currentConversationId = conversationId;

        // Build capabilities array for agent mode
        const capabilities: string[] = [];
        if (agentModeEnabled && notesCapabilityEnabled) {
          capabilities.push('notes');
        }

        // Create conversation if needed
        if (!currentConversationId) {
          const newConversation = await createConversation({
            provider: selectedProvider,
            model: selectedModel,
            title: chatService.generateTitle(messageToSend),
            ragEnabled: ragEnabled,
            agentEnabled: agentModeEnabled,
            agentCapabilities:
              capabilities.length > 0 ? JSON.stringify(capabilities) : undefined,
            vectorStoreProvider: ragEnabled ? selectedVectorStore : undefined,
          });
          currentConversationId = newConversation.id;
        }

        // Send message via streaming
        resetStream();
        await sendStreamingMessage(currentConversationId, messageToSend, {
          agentMode: agentModeEnabled,
          ragEnabled,
          userId: user?.userId || DEFAULT_USER_ID,
          vectorStoreProvider: ragEnabled ? selectedVectorStore : undefined,
          capabilities: capabilities.length > 0 ? capabilities : undefined,
          images,
        });
      } catch (error) {
        console.error('Error sending message:', { error });

        if (error instanceof Error && error.name !== 'AbortError') {
          toast.error(
            'Failed to send message',
            error.message || 'An error occurred while streaming the response'
          );
        }

        setInputValue(messageToSend);
        setPendingMessage(null);
        resetStream();
      }
    },
    [
      inputValue,
      conversationId,
      selectedProvider,
      selectedModel,
      ragEnabled,
      agentModeEnabled,
      notesCapabilityEnabled,
      selectedVectorStore,
      user?.userId,
      createConversation,
      sendStreamingMessage,
      resetStream,
      setPendingMessage,
    ]
  );

  // Handle selecting a conversation
  const handleSelectConversation = useCallback(
    (id: string) => {
      baseHandleSelectConversation(id, (conv) => {
        setProviderAndModel(conv.provider, conv.model);
      });
    },
    [baseHandleSelectConversation, setProviderAndModel]
  );

  // Handle image generation completion
  const handleImageGenerated = useCallback(
    (response: ImageGenerationResponse) => {
      const targetConversationId = response.conversationId || conversationId;

      if (targetConversationId) {
        queryClient.refetchQueries({
          queryKey: QUERY_KEYS.conversation(targetConversationId),
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conversations.all });
      }
      toast.success(
        'Image generated',
        `Successfully generated ${response.images.length} image${response.images.length > 1 ? 's' : ''}`
      );
    },
    [conversationId, queryClient]
  );

  // Handle image generation
  const handleGenerateImage = useCallback(
    async (params: ImageGenerationParams) => {
      setPendingMessage({ content: `[Image Generation Request]\n${params.prompt}` });
      setInputValue('');
      setIsGeneratingImage(true);

      try {
        let currentConversationId = conversationId;

        // Create conversation if needed
        if (!currentConversationId) {
          const newConversation = await createConversation({
            provider: selectedProvider,
            model: selectedModel,
            title: chatService.generateTitle(params.prompt),
            ragEnabled: false,
            agentEnabled: false,
          });
          currentConversationId = newConversation.id;
        }

        // Generate the image
        const response = await chatService.generateImage(currentConversationId, {
          prompt: params.prompt,
          provider: selectedProvider,
          model: selectedModel,
          size: params.size,
          quality: params.quality,
          style: params.style,
          count: 1,
        });

        if (response.success) {
          handleImageGenerated(response);
        } else {
          throw new Error(response.error || 'Failed to generate image');
        }
      } finally {
        setPendingMessage(null);
        setIsGeneratingImage(false);
      }
    },
    [
      conversationId,
      selectedProvider,
      selectedModel,
      createConversation,
      handleImageGenerated,
      setPendingMessage,
    ]
  );

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setShowSidebar((prev) => !prev);
  }, []);

  // Agent capabilities configuration
  const agentCapabilities: AgentCapability[] = useMemo(
    () => [
      {
        id: 'notes',
        displayName: 'Notes',
        enabled: notesCapabilityEnabled,
        onChange: setNotesCapabilityEnabled,
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
        color: {
          enabledBg: 'var(--color-notes-alpha)',
          enabledText: 'var(--color-notes-text)',
          enabledBorder: 'var(--color-notes-border)',
          enabledDot: 'var(--color-notes-dot)',
        },
      },
    ],
    [notesCapabilityEnabled, setNotesCapabilityEnabled]
  );

  return {
    // UI State
    inputValue,
    showSidebar,
    isGeneratingImage,
    containerRef,

    // Provider Selection
    selectedProvider,
    selectedModel,
    availableProviders,
    isHealthLoading,

    // Conversation State
    conversationId,
    conversation,
    displayConversations,
    isNewChat,
    pendingMessage,
    isCreating,

    // Settings
    ragEnabled,
    selectedVectorStore,
    agentModeEnabled,
    notesCapabilityEnabled,

    // Streaming State
    isStreaming,
    streamingMessage,
    streamingError,
    retrievedNotes,
    toolExecutions,
    thinkingSteps,
    inputTokens,
    outputTokens,
    streamDuration,

    // Scroll
    messagesEndRef,
    messagesContainerRef,

    // Computed
    isLoading,
    isImageGenerationMode,
    agentCapabilities,

    // UI Actions
    setInputValue,
    setShowSidebar,
    toggleSidebar,

    // Provider Actions
    handleProviderChange,
    handleModelChange,

    // Conversation Actions
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,

    // Settings Actions
    handleRagToggle,
    handleVectorStoreChange,
    setAgentModeEnabled,
    setNotesCapabilityEnabled,

    // Message Actions
    handleSendMessage,
    handleGenerateImage,
    handleImageGenerated,
    cancelStream,
  };
}

