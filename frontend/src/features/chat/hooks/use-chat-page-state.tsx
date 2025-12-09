/**
 * Chat Page State Hook
 * Consolidates all chat page state management into a single hook
 * 
 * Features:
 * - Draft persistence per conversation (IndexedDB with localStorage fallback)
 * - Automatic draft saving on input changes (500ms debounce)
 * - Draft restoration when switching conversations
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSendMessage } from './use-chat';
import { useChatConversationManager } from './use-chat-conversation-manager';
import { useChatProviderSelection } from './use-chat-provider-selection';
import { useChatSettings } from './use-chat-settings';
import { useChatScroll } from './use-chat-scroll';
import { useContextUsage } from './use-context-usage';
import { chatService } from '../../../services';
import { toast } from '../../../hooks/use-toast';
import { useAuthStore } from '../../../store/auth-store';
import { useBoundStore } from '../../../store/bound-store';
import { DEFAULT_USER_ID } from '../../../lib/constants';
import { conversationKeys } from '../../../lib/query-keys';
import { isImageGenerationModel } from '../../../utils/image-generation-models';
import { useUnifiedStream, createLegacyAdapter } from '../../../hooks/use-unified-stream';
import { NEW_CHAT_DRAFT_KEY } from '../../../store/slices/draft-slice';
import type { MessageImage, ImageGenerationResponse, ChatConversation, GroundingSource, GrokSearchSource, CodeExecutionResult, GeneratedImage } from '../../../types/chat';
import type { AgentCapability } from '../components/ChatHeader';
import type { ProviderInfo } from './use-chat-provider-selection';
import type { RagContextNote } from '../../../types/rag';
import type { ToolExecution, ThinkingStep, RetrievedNoteContext } from '../../agents/types/agent-types';
import type { ContextUsageState } from '../../../types/context-usage';
import type { ImageGenerationStage, ProcessEvent } from '../../../core/streaming/types';

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
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Provider Selection
  selectedProvider: string;
  selectedModel: string;
  availableProviders: ProviderInfo[];
  isHealthLoading: boolean;
  /** Refresh providers by clearing cache and fetching fresh data */
  refreshProviders: () => Promise<void>;
  /** Whether providers are currently being refreshed */
  isRefreshing: boolean;

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
  agentRagEnabled: boolean;
  notesCapabilityEnabled: boolean;

  // Streaming State
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: RagContextNote[];
  /** Unified process timeline - thinking and tool executions in chronological order */
  processTimeline: ProcessEvent[];
  toolExecutions: ToolExecution[];
  thinkingSteps: ThinkingStep[];
  /** Notes automatically retrieved via semantic search for agent context injection */
  agentRetrievedNotes: RetrievedNoteContext[];
  processingStatus: string | null;
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number;
  /** RAG query log ID for feedback submission (from agent auto-context or regular RAG) */
  ragLogId?: string;
  /** Grounding sources from Google Search (Gemini only) */
  groundingSources?: GroundingSource[];
  /** Search sources from Grok Live Search/DeepSearch (Grok only) */
  grokSearchSources?: GrokSearchSource[];
  /** Code execution result from Python sandbox (Gemini only) */
  codeExecutionResult?: CodeExecutionResult | null;

  // Image Generation State (unified stream)
  /** Current image generation stage */
  imageGenerationStage: ImageGenerationStage;
  /** Provider used for image generation */
  imageGenerationProvider: string | null;
  /** Model used for image generation */
  imageGenerationModel: string | null;
  /** Prompt used for image generation */
  imageGenerationPrompt: string | null;
  /** Progress percentage (0-100) */
  imageGenerationProgress: number | null;
  /** Generated images from the current generation */
  generatedImages: GeneratedImage[];
  /** Error from image generation */
  imageGenerationError: string | null;

  // Scroll
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;

  // Computed
  isLoading: boolean;
  isImageGenerationMode: boolean;
  agentCapabilities: AgentCapability[];

  // Context Usage
  contextUsage: ContextUsageState;
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
  handleBulkDeleteConversations?: (ids: string[]) => Promise<void>;

  // Settings Actions
  handleRagToggle: (enabled: boolean) => void;
  handleVectorStoreChange: (provider: 'PostgreSQL' | 'Pinecone') => Promise<void>;
  setAgentModeEnabled: (enabled: boolean) => void;
  setAgentRagEnabled: (enabled: boolean) => void;
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
  const previousConversationIdForDraftsRef = useRef<string | null>(null);

  // Local UI state
  const [inputValue, setInputValueInternal] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  // Auth
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  // Draft management from store - select each individually to avoid infinite loops
  const saveDraft = useBoundStore((state) => state.saveDraft);
  const loadDraft = useBoundStore((state) => state.loadDraft);
  const clearDraft = useBoundStore((state) => state.clearDraft);
  const transferNewChatDraft = useBoundStore((state) => state.transferNewChatDraft);
  const preloadDrafts = useBoundStore((state) => state.preloadDrafts);
  const flushPendingSaves = useBoundStore((state) => state.flushPendingSaves);

  // Send message mutation
  const sendMessage = useSendMessage();

  // Provider selection
  const providerSelection = useChatProviderSelection();
  const {
    selectedProvider,
    selectedModel,
    availableProviders,
    isHealthLoading,
    refreshProviders,
    isRefreshing,
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
    handleBulkDeleteConversations,
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
    agentRagEnabled,
    notesCapabilityEnabled,
    setAgentModeEnabled,
    setAgentRagEnabled,
    setNotesCapabilityEnabled,
    handleRagToggle,
    handleVectorStoreChange,
  } = settings;

  // Track the previous conversation ID to detect when a new conversation is selected
  const prevConversationIdRef = useRef<string | null>(null);

  // ==============================================
  // Draft Management
  // ==============================================

  // Preload all drafts on mount
  useEffect(() => {
    void preloadDrafts();
  }, [preloadDrafts]);

  // Flush pending saves before unmount (e.g., tab close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      flushPendingSaves();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also flush when component unmounts normally
      flushPendingSaves();
    };
  }, [flushPendingSaves]);

  // Draft-aware setInputValue that also persists the draft
  const setInputValue = useCallback((value: string) => {
    setInputValueInternal(value);
    // Save draft with current conversation ID (or new chat key)
    const draftKey = conversationId || NEW_CHAT_DRAFT_KEY;
    saveDraft(draftKey, value);
  }, [conversationId, saveDraft]);

  // Track current input value in a ref for use in effects without causing re-runs
  const inputValueRef = useRef(inputValue);
  inputValueRef.current = inputValue;

  // Load draft when conversation changes
  useEffect(() => {
    const currentKey = conversationId || NEW_CHAT_DRAFT_KEY;
    const previousKey = previousConversationIdForDraftsRef.current;

    // Only act if the conversation actually changed
    if (currentKey !== previousKey) {
      // Save current draft before switching (if there was a previous conversation)
      const currentInputValue = inputValueRef.current;
      if (previousKey && currentInputValue.trim()) {
        saveDraft(previousKey, currentInputValue);
      }

      // Load draft for the new conversation
      void loadDraft(currentKey).then((draftContent) => {
        setInputValueInternal(draftContent);
      });

      previousConversationIdForDraftsRef.current = currentKey;
    }
  }, [conversationId, loadDraft, saveDraft]);

  // Sync provider/model ONLY when a different conversation is selected (not on every render)
  // This allows users to change provider/model after viewing a conversation
  useEffect(() => {
    // Only sync when the conversation ID actually changes (new conversation selected)
    if (conversationId !== prevConversationIdRef.current) {
      prevConversationIdRef.current = conversationId;

      // If we have a conversation loaded (not a new chat), sync its provider/model
      if (conversation && !isNewChat && conversationId) {
        setProviderAndModel(conversation.provider, conversation.model);
      }
    }
  }, [conversation, conversationId, isNewChat, setProviderAndModel]);

  // Disable RAG and Agent mode when switching to image generation model
  useEffect(() => {
    if (isImageGenerationMode) {
      if (ragEnabled) {
        void handleRagToggle(false);
      }
      if (agentModeEnabled) {
        void setAgentModeEnabled(false);
      }
    }
  }, [isImageGenerationMode, ragEnabled, agentModeEnabled, handleRagToggle, setAgentModeEnabled]);

  // Unified streaming with new architecture
  const unifiedStream = useUnifiedStream({
    mode: agentModeEnabled ? 'agent' : 'chat',
    conversationId: conversationId || '',
  });

  // Create legacy adapter for backward compatibility with existing components
  const legacyState = useMemo(() => createLegacyAdapter(unifiedStream), [unifiedStream]);

  // Destructure for use in components
  const {
    isStreaming,
    streamingMessage,
    streamingError,
    retrievedNotes,
    processTimeline,
    toolExecutions,
    thinkingSteps,
    agentRetrievedNotes,
    processingStatus,
    inputTokens,
    outputTokens,
    streamDuration,
    ragLogId,
    groundingSources,
    grokSearchSources,
    codeExecutionResult,
    // Image generation fields
    isGeneratingImage,
    imageGenerationStage,
    imageGenerationProvider,
    imageGenerationModel,
    imageGenerationPrompt,
    imageGenerationProgress,
    generatedImages,
    imageGenerationError,
  } = legacyState;

  // Use unified stream actions
  const cancelStream = unifiedStream.cancel;
  const resetStream = unifiedStream.reset;

  // Scroll management
  const { messagesEndRef, messagesContainerRef } = useChatScroll({
    isStreaming,
    streamingMessage,
    pendingMessage,
    messagesLength: conversation?.messages?.length || 0,
  });

  // Computed loading state
  const isLoading = sendMessage.isPending || isCreating || isStreaming || isGeneratingImage;

  // Build agent capabilities list for context usage calculation
  const enabledAgentCapabilities = useMemo(() => {
    const capabilities: string[] = [];
    if (notesCapabilityEnabled) capabilities.push('notes');
    return capabilities;
  }, [notesCapabilityEnabled]);

  // Context usage tracking
  const contextUsage = useContextUsage({
    conversation,
    model: selectedModel,
    agentModeEnabled,
    agentCapabilities: enabledAgentCapabilities,
    ragEnabled,
    currentInput: inputValue,
    streamingToolExecutions: toolExecutions,
    streamingRetrievedNotes: retrievedNotes,
    isStreaming,
    streamingMessage,
  });

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

  // Track the previous message count to detect when new messages are added
  const prevMessageCountRef = useRef<number>(0);

  // Cleanup streaming state once message is persisted
  useEffect(() => {
    if (!isStreaming && streamingMessage && conversation?.messages) {
      // Get current message count
      const currentMessageCount = conversation.messages.length;

      // Check if a new message was added since we started streaming
      // This is more reliable than content matching which can fail due to formatting differences
      const hasNewMessage = currentMessageCount > prevMessageCountRef.current;

      // Also do content matching as a fallback
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

      // Reset stream if either condition is met
      if (hasNewMessage || hasMatchingMessage) {
        setPendingMessage(null);
        resetStream();
      }
    }

    // Update the message count ref when conversation changes
    if (conversation?.messages) {
      prevMessageCountRef.current = conversation.messages.length;
    }
  }, [conversation?.messages, isStreaming, streamingMessage, resetStream, setPendingMessage]);

  // Fallback cleanup: if streaming ended but stream state wasn't cleared after a timeout,
  // force clear it to prevent stuck UI state
  useEffect(() => {
    if (!isStreaming && streamingMessage) {
      const timeoutId = setTimeout(() => {
        // If we still have a streaming message after streaming ended, clear it
        // This handles edge cases where the content matching and message count checks both fail
        resetStream();
        setPendingMessage(null);
      }, 2000); // 2 second fallback timeout

      return () => { clearTimeout(timeoutId); };
    }
    return undefined;
  }, [isStreaming, streamingMessage, resetStream, setPendingMessage]);

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (images?: MessageImage[]) => {
      if (!inputValue.trim() && (!images || images.length === 0)) return;

      const messageToSend = inputValue.trim();
      setPendingMessage({ content: messageToSend, images });
      setInputValueInternal(''); // Use internal setter to avoid saving empty draft

      // Clear the draft for current conversation since message is being sent
      const draftKey = conversationId || NEW_CHAT_DRAFT_KEY;
      clearDraft(draftKey);

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
            agentRagEnabled: agentRagEnabled,
            agentCapabilities:
              capabilities.length > 0 ? JSON.stringify(capabilities) : undefined,
            vectorStoreProvider: ragEnabled ? selectedVectorStore : undefined,
          });
          currentConversationId = newConversation.id;

          // Transfer any remaining new chat draft to the new conversation
          transferNewChatDraft(currentConversationId);
        }

        // Send message via unified streaming
        resetStream();
        await unifiedStream.send({
          content: messageToSend,
          conversationId: currentConversationId,
          useRag: ragEnabled,
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

        // Restore the message on error
        setInputValueInternal(messageToSend);
        // Also save it as a draft again
        saveDraft(conversationId || NEW_CHAT_DRAFT_KEY, messageToSend);
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
      agentRagEnabled,
      notesCapabilityEnabled,
      selectedVectorStore,
      user?.userId,
      createConversation,
      unifiedStream,
      resetStream,
      setPendingMessage,
      clearDraft,
      saveDraft,
      transferNewChatDraft,
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
        void queryClient.refetchQueries({
          queryKey: conversationKeys.detail(targetConversationId),
        });
        void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
      }
      toast.success(
        'Image generated',
        `Successfully generated ${response.images.length} image${response.images.length > 1 ? 's' : ''}`
      );
    },
    [conversationId, queryClient]
  );

  // Handle image generation using unified stream
  const handleGenerateImage = useCallback(
    async (params: ImageGenerationParams) => {
      setPendingMessage({ content: `[Image Generation Request]\n${params.prompt}` });
      setInputValue('');

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
            imageGenerationEnabled: true,
          });
          currentConversationId = newConversation.id;
        }

        // Generate the image using unified stream
        await unifiedStream.generateImage({
          prompt: params.prompt,
          provider: selectedProvider,
          model: selectedModel,
          conversationId: currentConversationId,
          size: params.size,
          quality: params.quality,
          style: params.style,
          count: 1,
        });

        // If generation was successful, show success toast
        // Note: The unified stream will automatically invalidate queries
        if (unifiedStream.imageGeneration.images.length > 0) {
          toast.success(
            'Image generated',
            `Successfully generated ${unifiedStream.imageGeneration.images.length} image${unifiedStream.imageGeneration.images.length > 1 ? 's' : ''}`
          );
        }
      } catch (error) {
        console.error('Error generating image:', error);
        if (error instanceof Error && error.message) {
          toast.error('Failed to generate image', error.message);
        }
      } finally {
        setPendingMessage(null);
      }
    },
    [
      conversationId,
      selectedProvider,
      selectedModel,
      createConversation,
      unifiedStream,
      setPendingMessage,
      setInputValue,
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
    refreshProviders,
    isRefreshing,

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
    agentRagEnabled,
    notesCapabilityEnabled,

    // Streaming State
    isStreaming,
    streamingMessage,
    streamingError,
    retrievedNotes,
    processTimeline,
    toolExecutions,
    thinkingSteps,
    agentRetrievedNotes,
    processingStatus,
    inputTokens,
    outputTokens,
    streamDuration,
    ragLogId,
    groundingSources,
    grokSearchSources,
    codeExecutionResult,

    // Image Generation State
    imageGenerationStage,
    imageGenerationProvider,
    imageGenerationModel,
    imageGenerationPrompt,
    imageGenerationProgress,
    generatedImages,
    imageGenerationError,

    // Scroll
    messagesEndRef,
    messagesContainerRef,

    // Computed
    isLoading,
    isImageGenerationMode,
    agentCapabilities,

    // Context Usage
    contextUsage,

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
    handleDeleteConversation: (id: string) => { void handleDeleteConversation(id); },
    ...(handleBulkDeleteConversations ? {
      handleBulkDeleteConversations: handleBulkDeleteConversations as (ids: string[]) => Promise<void>
    } : {}),

    // Settings Actions
    handleRagToggle: (enabled: boolean) => { void handleRagToggle(enabled); },
    handleVectorStoreChange,
    setAgentModeEnabled: (enabled: boolean) => { void setAgentModeEnabled(enabled); },
    setAgentRagEnabled: (enabled: boolean) => { void setAgentRagEnabled(enabled); },
    setNotesCapabilityEnabled: (enabled: boolean) => { void setNotesCapabilityEnabled(enabled); },

    // Message Actions
    handleSendMessage,
    handleGenerateImage,
    handleImageGenerated,
    cancelStream,
  };
}

