import { useState, useRef, useEffect, useMemo } from 'react';
import { useAIHealth } from '../features/ai/hooks/use-ai-health';
import {
  useCreateConversation,
  useChatConversation,
  useSendMessage,
  useChatConversations,
  useDeleteConversation,
  useUpdateConversationSettings,
} from '../features/chat/hooks/use-chat';
import { useChatStream } from '../features/chat/hooks/use-chat-stream';
import { useAgentStream } from '../features/agents/hooks/use-agent-stream';
import { MarkdownMessage } from '../components/MarkdownMessage';
import { TokenUsageDisplay } from '../components/TokenUsageDisplay';
import { ProviderSelector } from '../components/ui/ProviderSelector';
import { ModelSelector } from '../components/ui/ModelSelector';
import { SelectorSkeleton } from '../components/ui/SelectorSkeleton';
import { RagToggle } from '../components/ui/RagToggle';
import { AgentControlsGroup } from '../components/ui/AgentControlsGroup';
import { VectorStoreSelector } from '../components/ui/VectorStoreSelector';
import { RetrievedNotes } from '../components/ui/RetrievedNotes';
import { ToolExecutionCard } from '../features/agents/components/ToolExecutionCard';
import { ThinkingStepCard } from '../features/agents/components/ThinkingStepCard';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { toast } from '../hooks/use-toast';
import { formatModelName } from '../utils/model-name-formatter';
import { useSettingsStore } from '../store/settings-store';
import { useAuthStore } from '../store/auth-store';
import { useThemeStore } from '../store/theme-store';
import { DEFAULT_USER_ID } from '../lib/constants';
import brainTop from '../assets/brain-top-tab.png';
import { ToolCall } from '../features/chat/types/chat';
import { ToolExecution } from '../features/agents/types/agent-types';

// Helper to strip thinking tags from message content
// Handles both complete blocks (with closing tag) and incomplete blocks (without closing tag)
const stripThinkingTags = (content: string): string => {
  // First remove complete thinking blocks
  let stripped = content.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  // Then remove incomplete thinking blocks (opening tag without closing tag)
  stripped = stripped.replace(/<thinking>[\s\S]*$/gi, '');
  return stripped.trim();
};

// Helper to extract thinking content from message
// Handles both complete blocks (with closing tag) and incomplete blocks (without closing tag)
const extractThinkingContent = (content: string, includeIncomplete: boolean = false): string[] => {
  const thinkingSteps: string[] = [];
  const thinkingTagRegex = /<thinking>/gi;
  const closingTagRegex = /<\/thinking>/gi;

  let match;
  thinkingTagRegex.lastIndex = 0;

  while ((match = thinkingTagRegex.exec(content)) !== null) {
    const startIndex = match.index + match[0].length;

    // Find the closing tag after this opening tag
    closingTagRegex.lastIndex = startIndex;
    const closingMatch = closingTagRegex.exec(content);

    if (closingMatch) {
      // Complete thinking block
      const thinkingContent = content.substring(startIndex, closingMatch.index).trim();
      if (thinkingContent) {
        thinkingSteps.push(thinkingContent);
      }
    } else if (includeIncomplete) {
      // Incomplete thinking block (only include if explicitly requested, e.g., during streaming)
      const thinkingContent = content.substring(startIndex).trim();
      if (thinkingContent) {
        thinkingSteps.push(thinkingContent);
      }
      // Only process the first incomplete block
      break;
    }
  }

  return thinkingSteps;
};

export function ChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isNewChat, setIsNewChat] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const wasAtBottomRef = useRef<boolean>(true);

  const { data: healthData, isLoading: isHealthLoading } = useAIHealth();
  const { data: conversations } = useChatConversations();
  const { data: conversation } = useChatConversation(conversationId);
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const deleteConversation = useDeleteConversation();
  const updateConversationSettings = useUpdateConversationSettings();

  // Streaming hook
  const {
    isStreaming,
    streamingMessage,
    streamingError,
    retrievedNotes: streamingRetrievedNotes,
    inputTokens: streamingInputTokens,
    outputTokens: streamingOutputTokens,
    streamDuration: streamingDuration,
    sendStreamingMessage,
    cancelStream,
    resetStream,
  } = useChatStream();

  // Agent streaming hook
  const {
    isStreaming: isAgentStreaming,
    streamingMessage: agentStreamingMessage,
    streamingError: agentStreamingError,
    toolExecutions,
    thinkingSteps,
    inputTokens: agentInputTokens,
    outputTokens: agentOutputTokens,
    streamDuration: agentStreamDuration,
    sendAgentMessage,
    cancelStream: cancelAgentStream,
    resetStream: resetAgentStream,
  } = useAgentStream();

  const {
    vectorStoreProvider: defaultVectorStore,
    chatProvider: savedChatProvider,
    chatModel: savedChatModel,
    setChatProvider,
    setChatModel,
    loadPreferencesFromBackend,
    syncPreferencesToBackend,
  } = useSettingsStore();

  const [selectedProvider, setSelectedProvider] = useState<string>(savedChatProvider || '');
  const [selectedModel, setSelectedModel] = useState<string>(savedChatModel || '');
  const [selectedVectorStore, setSelectedVectorStore] = useState<'PostgreSQL' | 'Pinecone'>(defaultVectorStore);
  const [ragEnabled, setRagEnabledLocal] = useState<boolean>(false);
  const [agentModeEnabled, setAgentModeEnabled] = useState<boolean>(false);
  const [notesCapabilityEnabled, setNotesCapabilityEnabled] = useState<boolean>(true); // Default to enabled when agent mode is on
  const user = useAuthStore((state) => state.user);

  // Combine streaming states for agent and regular chat
  const activeIsStreaming = agentModeEnabled ? isAgentStreaming : isStreaming;
  const activeStreamingMessage = agentModeEnabled ? agentStreamingMessage : streamingMessage;
  const activeStreamingError = agentModeEnabled ? agentStreamingError : streamingError;
  const activeInputTokens = agentModeEnabled ? agentInputTokens : streamingInputTokens;
  const activeOutputTokens = agentModeEnabled ? agentOutputTokens : streamingOutputTokens;
  const activeStreamDuration = agentModeEnabled ? agentStreamDuration : streamingDuration;
  const theme = useThemeStore((state) => state.theme);
  const isDarkMode = theme === 'dark' || theme === 'blue';

  // Load preferences from backend on mount
  useEffect(() => {
    if (user?.userId) {
      loadPreferencesFromBackend(user.userId);
    }
  }, [user?.userId, loadPreferencesFromBackend]);

  // Sync selected provider/model with settings store
  useEffect(() => {
    if (savedChatProvider && savedChatProvider !== selectedProvider) {
      setSelectedProvider(savedChatProvider);
    }
  }, [savedChatProvider]);

  useEffect(() => {
    if (savedChatModel && savedChatModel !== selectedModel) {
      setSelectedModel(savedChatModel);
    }
  }, [savedChatModel]);

  // Load RAG settings from selected conversation
  useEffect(() => {
    if (conversation) {
      setRagEnabledLocal(conversation.ragEnabled);
      if (conversation.vectorStoreProvider) {
        setSelectedVectorStore(conversation.vectorStoreProvider as 'PostgreSQL' | 'Pinecone');
      }
    }
  }, [conversation]);

  // When starting a new chat, reset to defaults
  useEffect(() => {
    if (!conversationId && isNewChat) {
      setRagEnabledLocal(false); // Default to RAG off for new chats
      setSelectedVectorStore(defaultVectorStore);
    }
  }, [conversationId, isNewChat, defaultVectorStore]);


  // Track if user is at bottom during streaming
  useEffect(() => {
    if (activeIsStreaming && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      wasAtBottomRef.current = isAtBottom;
    }
  }, [activeIsStreaming, activeStreamingMessage]);

  // Auto-scroll to bottom only during active streaming to follow the stream
  useEffect(() => {
    if (activeIsStreaming && activeStreamingMessage) {
      // During streaming, scroll to bottom to follow the stream as it grows
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      wasAtBottomRef.current = true;
    }
  }, [activeIsStreaming, activeStreamingMessage]);

  // Scroll to bottom when a new pending message appears (user sends a message)
  useEffect(() => {
    if (pendingMessage) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 50);
    }
  }, [pendingMessage]);

  // Maintain scroll position when streaming completes and message is persisted
  // This prevents the UI from jumping up when the streaming message is replaced with the persisted one
  useEffect(() => {
    if (!activeIsStreaming && messagesContainerRef.current && previousScrollHeightRef.current > 0) {
      const container = messagesContainerRef.current;
      const currentScrollHeight = container.scrollHeight;
      const previousScrollHeight = previousScrollHeightRef.current;

      // Only adjust if content height changed (message was persisted)
      if (currentScrollHeight !== previousScrollHeight && wasAtBottomRef.current) {
        // User was at bottom during streaming, maintain position at bottom after message is persisted
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
          }
        });
      }
      // If user scrolled up during streaming, don't adjust scroll position
    }

    // Update previous scroll height after render
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
      }
    });
  }, [conversation?.messages, activeIsStreaming]);

  // Cleanup: cancel any active streams on unmount
  useEffect(() => {
    return () => {
      if (isStreaming) {
        cancelStream();
      }
      if (isAgentStreaming) {
        cancelAgentStream();
      }
    };
  }, [isStreaming, cancelStream, isAgentStreaming, cancelAgentStream]);

  // Clear pending message when it appears in the conversation
  useEffect(() => {
    if (pendingMessage && conversation?.messages) {
      // Check if the pending message now exists in the conversation
      const hasPendingMessage = conversation.messages.some(
        (msg) => msg.role === 'user' && msg.content === pendingMessage
      );

      // Clear pending message once it's in the conversation and streaming is done
      if (hasPendingMessage && !activeIsStreaming && !activeStreamingMessage) {
        setPendingMessage(null);
      }
    }
  }, [pendingMessage, conversation?.messages, activeIsStreaming, activeStreamingMessage]);

  // Check if the latest message in the conversation matches the streaming message
  // This is used to prevent double rendering (showing both the stream and the finalized message)
  const lastMessage = conversation?.messages?.[conversation.messages.length - 1];
  const isLastMessageDuplicate =
    !!(!activeIsStreaming &&
      activeStreamingMessage &&
      lastMessage?.role === 'assistant' &&
      (lastMessage.content === activeStreamingMessage || lastMessage.content.trim() === activeStreamingMessage.trim()));

  // Cleanup streaming state once the message is fully persisted in the conversation
  useEffect(() => {
    if (isLastMessageDuplicate) {
      setPendingMessage(null);
      if (agentModeEnabled) {
        resetAgentStream();
      } else {
        resetStream();
      }
    }
  }, [isLastMessageDuplicate, resetStream, resetAgentStream, agentModeEnabled]);

  // Auto-load most recent conversation on mount (but not when user explicitly starts new chat)
  useEffect(() => {
    if (conversations && conversations.length > 0 && !conversationId && !isNewChat) {
      const mostRecent = conversations.reduce((prev, current) =>
        new Date(current.updatedAt) > new Date(prev.updatedAt) ? current : prev
      );
      setConversationId(mostRecent.id);
      setSelectedProvider(mostRecent.provider);
      setSelectedModel(mostRecent.model);
    }
  }, [conversations, conversationId, isNewChat]);

  // Get available providers from health data, mapping to ensure availableModels is always an array of strings
  const availableProviders = useMemo(() => (Array.isArray(healthData?.providers) 
    ? healthData.providers
        .filter((p) => p && p.isHealthy)
        .map((p) => ({
          ...p,
          provider: typeof p.provider === 'string' ? p.provider : String(p.provider || ''),
          availableModels: Array.isArray(p.availableModels) 
            ? p.availableModels.filter((m): m is string => typeof m === 'string')
            : [],
        }))
    : []), [healthData?.providers]);

  // Get available models for selected provider
  const availableModels = useMemo(() =>
    availableProviders.find((p) => p.provider === selectedProvider)?.availableModels ||
    [], [availableProviders, selectedProvider]);

  // Auto-select first provider and model (only if no saved preferences)
  // NOTE: Do NOT sync to backend here - this is auto-initialization, not user action
  useEffect(() => {
    if (availableProviders.length > 0 && !selectedProvider) {
      const firstProvider = availableProviders[0];
      const newProvider = firstProvider.provider;
      const newModel = firstProvider.availableModels?.[0] || '';

      setSelectedProvider(newProvider);
      setSelectedModel(newModel);

      // Save to settings store (local only, no backend sync for auto-init)
      setChatProvider(newProvider);
      setChatModel(newModel);
    }
  }, [availableProviders, selectedProvider, setChatProvider, setChatModel]);

  // Update model when provider changes
  // NOTE: Do NOT sync to backend here - this is auto-correction, not user action
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      const newModel = availableModels[0];
      setSelectedModel(newModel);

      // Save to settings store (local only, no backend sync for auto-correction)
      setChatModel(newModel);
    }
  }, [selectedProvider, availableModels, selectedModel, setChatModel]);

  // Handle provider change with persistence
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    setChatProvider(provider);

    // Sync to backend
    if (user?.userId) {
      syncPreferencesToBackend(user.userId).catch(console.error);
    }
  };

  // Handle model change with persistence
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setChatModel(model);

    // Sync to backend
    if (user?.userId) {
      syncPreferencesToBackend(user.userId).catch(console.error);
    }
  };

  // Handle vector store change - save to conversation
  const handleVectorStoreChange = async (provider: 'PostgreSQL' | 'Pinecone') => {
    setSelectedVectorStore(provider);

    // Update conversation if one is selected
    if (conversationId) {
      try {
        await updateConversationSettings.mutateAsync({
          conversationId,
          request: { vectorStoreProvider: provider },
        });
      } catch (error) {
        console.error('Failed to update vector store for conversation:', error);
      }
    }
  };

  // Handle RAG toggle change - save to conversation
  const handleRagToggle = async (enabled: boolean) => {
    setRagEnabledLocal(enabled);

    // Update conversation if one is selected
    if (conversationId) {
      try {
        await updateConversationSettings.mutateAsync({
          conversationId,
          request: { ragEnabled: enabled },
        });
      } catch (error) {
        console.error('Failed to update RAG toggle for conversation:', error);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageToSend = inputValue.trim();

    // Immediately show the message in UI and clear input
    setPendingMessage(messageToSend);
    setInputValue('');

    try {
      // Create conversation if it doesn't exist
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const newConversation = await createConversation.mutateAsync({
          provider: selectedProvider,
          model: selectedModel,
          title: messageToSend.slice(0, 50),
          ragEnabled: ragEnabled,
          agentEnabled: agentModeEnabled,
          vectorStoreProvider: ragEnabled ? selectedVectorStore : undefined,
        });
        currentConversationId = newConversation.id;
        setConversationId(currentConversationId);
        setIsNewChat(false); // Reset the new chat flag after creating conversation
      }

      // Reset stream state but keep pending message visible during streaming
      if (agentModeEnabled) {
        resetAgentStream();
        // Build capabilities array based on enabled toggles
        const capabilities: string[] = [];
        if (notesCapabilityEnabled) {
          capabilities.push('notes');
        }
        // Send the message with agent streaming
        await sendAgentMessage(currentConversationId, {
          content: messageToSend,
          capabilities: capabilities.length > 0 ? capabilities : undefined,
        });
      } else {
        resetStream();
        // Send the message with regular streaming
        await sendStreamingMessage(currentConversationId, {
          content: messageToSend,
          useRag: ragEnabled,
          userId: user?.userId || DEFAULT_USER_ID,
          vectorStoreProvider: ragEnabled ? selectedVectorStore : undefined,
        });
      }

    } catch (error) {
      console.error('Error sending message:', { error });

      // Show error toast
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error(
          'Failed to send message',
          error.message || 'An error occurred while streaming the response'
        );
      }

      // On error, restore the message to input
      setInputValue(messageToSend);
      setPendingMessage(null);
      if (agentModeEnabled) {
        resetAgentStream();
      } else {
        resetStream();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Token estimation utility (1 token ≈ 3.5 characters)
  const estimateTokenCount = (text: string): number => {
    if (!text) return 0;
    return Math.ceil(text.length / 3.5);
  };

  // Calculate token count for current input
  const inputTokenCount = useMemo(() => estimateTokenCount(inputValue), [inputValue]);

  const handleNewChat = () => {
    setConversationId(null);
    setInputValue('');
    setPendingMessage(null);
    setIsNewChat(true);
  };

  const handleSelectConversation = (id: string) => {
    // Handle placeholder conversation
    if (id === 'placeholder-new-chat') {
      setConversationId(null);
      setPendingMessage(null);
      setIsNewChat(true);
      return;
    }

    setConversationId(id);
    setPendingMessage(null);
    setIsNewChat(false);
    const conv = conversations?.find((c) => c.id === id);
    if (conv) {
      setSelectedProvider(conv.provider);
      setSelectedModel(conv.model);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    const confirmed = await toast.confirm({
      title: 'Delete Conversation',
      description: 'Are you sure you want to delete this conversation?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      await deleteConversation.mutateAsync(id);
      if (conversationId === id) {
        setConversationId(null);
        setIsNewChat(true);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Create placeholder conversation for new chat
  const placeholderConversation = useMemo(() => {
    if (!isNewChat || !selectedProvider || !selectedModel) return null;

    return {
      id: 'placeholder-new-chat',
      title: 'New Chat',
      provider: selectedProvider,
      model: selectedModel,
      ragEnabled: ragEnabled,
      vectorStoreProvider: ragEnabled ? selectedVectorStore : undefined,
      messages: [],
      userId: user?.userId || DEFAULT_USER_ID,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [isNewChat, selectedProvider, selectedModel, ragEnabled, selectedVectorStore, user?.userId]);

  // Combine placeholder with actual conversations
  const displayConversations = useMemo(() => {
    const actualConversations = conversations || [];
    if (placeholderConversation) {
      return [placeholderConversation, ...actualConversations];
    }
    return actualConversations;
  }, [conversations, placeholderConversation]);

  const isLoading = sendMessage.isPending || createConversation.isPending || activeIsStreaming;

  // Helper function to convert ToolCall to ToolExecution format
  const convertToolCallToExecution = (toolCall: ToolCall): ToolExecution => {
    return {
      tool: toolCall.toolName,
      arguments: toolCall.arguments,
      result: toolCall.result,
      status: 'completed',
      timestamp: new Date(toolCall.executedAt),
    };
  };

  return (
    <div
      ref={containerRef}
      className="flex overflow-hidden rounded-3xl border transition-all duration-300"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl)',
        height: 'calc(100vh - 2rem)',
      }}
    >
      {/* Sidebar */}
      {showSidebar && (
        <div
          className="w-64 md:w-80 border-r flex flex-col h-full flex-shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Sidebar Header - Fixed */}
          <div
            className="flex-shrink-0 px-4 py-[1.17rem] border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Conversations
            </h2>
            <div className="flex items-center gap-2">
              {/* Sidebar Toggle */}
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: 'var(--surface-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
                title="Hide sidebar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>
              {/* New Chat Button */}
              <button
                onClick={handleNewChat}
                className="p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                  border: '1px solid var(--btn-primary-border)',
                }}
                title="New Chat"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Conversations List - Scrollable */}
          <div
            className="flex-1 overflow-y-auto min-h-0 [scrollbar-width:thin] [scrollbar-color:var(--color-brand-400)_transparent] [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--color-brand-400)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--color-brand-300)]"
          >
            {displayConversations.length === 0 ? (
              <div
                className="text-center py-8 px-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs mt-2">Start a new chat to begin</p>
              </div>
            ) : (
              <div className="pb-2">
                {displayConversations
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((conv) => (
                    <div
                      key={conv.id}
                      className="group px-4 py-3 cursor-pointer transition-all duration-200"
                      style={{
                        backgroundColor:
                          conversationId === conv.id || (conv.id === 'placeholder-new-chat' && isNewChat && !conversationId)
                            ? 'var(--surface-card)'
                            : 'transparent',
                        borderLeftWidth: conversationId === conv.id || (conv.id === 'placeholder-new-chat' && isNewChat && !conversationId) ? '4px' : '0.5px',
                        borderLeftColor:
                          conversationId === conv.id || (conv.id === 'placeholder-new-chat' && isNewChat && !conversationId)
                            ? 'var(--btn-primary-bg)'
                            : 'color-mix(in srgb, var(--border) 85%, transparent)',
                        borderTopWidth: '0.5px',
                        borderTopColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
                        borderRightWidth: '0.5px',
                        borderRightColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
                        borderBottomWidth: '0.5px',
                        borderBottomColor: 'color-mix(in srgb, var(--border) 85%, transparent)',
                      }}
                      onClick={() => handleSelectConversation(conv.id)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className="text-sm font-medium truncate flex-1 min-w-0"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {conv.title}
                          </h3>
                          {conv.id !== 'placeholder-new-chat' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conv.id);
                              }}
                              className="p-1 rounded hover:bg-opacity-10 transition-all duration-200 flex-shrink-0 opacity-0 group-hover:opacity-100"
                              style={{
                                color: 'rgb(239, 68, 68)',
                              }}
                              title="Delete conversation"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0"
                              style={{
                                backgroundColor: isDarkMode
                                  ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                                  : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                                color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                                opacity: isDarkMode ? 1 : 0.7,
                              }}
                            >
                              {conv.provider}
                            </span>
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium truncate"
                              style={{
                                backgroundColor: isDarkMode
                                  ? 'color-mix(in srgb, var(--color-brand-100) 5%, transparent)'
                                  : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                                color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                                opacity: isDarkMode ? 1 : 0.7,
                              }}
                            >
                              {formatModelName(conv.model)}
                            </span>
                            {conv.ragEnabled && (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
                                style={{
                                  backgroundColor: isDarkMode
                                    ? 'color-mix(in srgb, var(--color-brand-100) 15%, transparent)'
                                    : 'color-mix(in srgb, var(--color-brand-100) 30%, transparent)',
                                  color: isDarkMode ? 'var(--color-brand-300)' : 'var(--color-brand-600)',
                                  opacity: isDarkMode ? 1 : 0.7,
                                }}
                                title="RAG enabled"
                              >
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                  />
                                </svg>
                              </span>
                            )}
                          </div>
                          <span
                            className="text-xs whitespace-nowrap flex-shrink-0"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {formatDate(conv.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header - Fixed */}
        <div
          className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b z-10"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface-card)',
          }}
        >
          {/* Sidebar Toggle - Only show at start when sidebar is closed */}
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
              style={{
                backgroundColor: 'var(--surface-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
              title="Show sidebar"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Provider Selector */}
          <div className="flex-shrink-0">
            {isHealthLoading ? (
              <SelectorSkeleton text="Loading provider..." />
            ) : (
              <ProviderSelector
                providers={availableProviders}
                selectedProvider={selectedProvider}
                onProviderChange={handleProviderChange}
                disabled={isLoading || availableProviders.length === 0}
              />
            )}
          </div>

          {/* Model Selector */}
          <div className="flex-shrink-0">
            {isHealthLoading ? (
              <SelectorSkeleton text="Loading model..." />
            ) : (
              <ModelSelector
                providers={availableProviders}
                selectedProvider={selectedProvider}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                disabled={isLoading || availableProviders.length === 0}
              />
            )}
          </div>

          {/* RAG Toggle */}
          <div className="flex-shrink-0">
            <RagToggle
              enabled={ragEnabled}
              onChange={handleRagToggle}
              disabled={isLoading || agentModeEnabled}
            />
          </div>

          {/* Vector Store Selector - only show when RAG is enabled */}
          {ragEnabled && !agentModeEnabled && (
            <div className="flex-shrink-0">
              <VectorStoreSelector
                selectedProvider={selectedVectorStore}
                onChange={handleVectorStoreChange}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Agent Controls Group */}
          <AgentControlsGroup
            agentEnabled={agentModeEnabled}
            onAgentChange={setAgentModeEnabled}
            capabilities={[
              {
                id: 'notes',
                displayName: 'Notes',
                enabled: notesCapabilityEnabled,
                onChange: setNotesCapabilityEnabled,
                icon: (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
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
            ]}
            disabled={isLoading}
          />

          {/* Spacer */}
          <div className="flex-1 min-w-0" />

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="px-4 py-2 rounded-xl font-medium transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-border)',
            }}
          >
            New Chat
          </button>
        </div>

        {/* Messages Area - Full height, scrollable */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-6 py-8 mb-10 min-h-0 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:var(--color-brand-400)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--color-brand-400)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--color-brand-300)]">
          <div className="max-w-3xl mx-auto space-y-6 h-full">
            {!conversation || (conversation.messages.length === 0 && !pendingMessage && !activeIsStreaming) ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 animate-in fade-in zoom-in-95 duration-500">
                <div
                  className="mb-8 relative group"
                >
                  <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <img
                    src={brainTop}
                    alt="Second Brain"
                    className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                  />
                </div>

                <div className="text-center max-w-md space-y-4 relative z-10">
                  <h2
                    className="text-4xl font-bold tracking-tight drop-shadow-lg"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Start a conversation
                  </h2>
                  <p
                    className="text-lg drop-shadow-md"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Select a model and send a message to begin
                  </p>
                </div>
              </div>
            ) : (
              <>
                {conversation?.messages.map((message, index) => {
                  // Hide assistant messages that are still streaming (they'll show in the streaming section below)
                  const isLastAssistantMessageDuringStream =
                    message.role === 'assistant' &&
                    index === conversation.messages.length - 1 &&
                    (activeStreamingMessage || activeIsStreaming);

                  const isAssistantMessage = message.role === 'assistant';
                  const hasToolCalls = !!(isAssistantMessage && message.toolCalls && message.toolCalls.length > 0);
                  const persistedThinkingSteps =
                    hasToolCalls && !isLastAssistantMessageDuringStream
                      ? extractThinkingContent(message.content)
                      : [];
                  const shouldShowPersistedThinking =
                    persistedThinkingSteps.length > 0 &&
                    !(
                      index === conversation.messages.length - 1 &&
                      (activeStreamingMessage || activeIsStreaming)
                    );
                  const shouldShowPersistedToolExecutions =
                    hasToolCalls &&
                    !(
                      index === conversation.messages.length - 1 &&
                      (activeStreamingMessage || activeIsStreaming)
                    );

                  return (
                    <div key={index}>
                      {/* Show reasoning above the final assistant reply */}
                      {shouldShowPersistedThinking && (
                        <div className="space-y-2 mb-3">
                          {persistedThinkingSteps.map((thinkingContent, thinkingIndex) => (
                            <ThinkingStepCard
                              key={`${index}-thinking-${thinkingIndex}`}
                              step={{
                                content: thinkingContent,
                                timestamp: new Date(message.timestamp || Date.now()),
                              }}
                            />
                          ))}
                        </div>
                      )}
                      {shouldShowPersistedToolExecutions && (
                        <div className="space-y-2 mb-3">
                          {message.toolCalls!.map((toolCall, toolIndex) => (
                            <ToolExecutionCard
                              key={`${index}-tool-${toolIndex}`}
                              execution={convertToolCallToExecution(toolCall)}
                            />
                          ))}
                        </div>
                      )}

                      {!isLastAssistantMessageDuringStream && (
                        <div
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`${message.role === 'user' ? 'max-w-[80%]' : 'w-full'
                              } rounded-2xl px-5 py-3 ${message.role === 'user' ? 'rounded-br-md' : 'rounded-bl-md'
                              }`}
                            style={{
                              backgroundColor:
                                message.role === 'user'
                                  ? 'var(--btn-primary-bg)'
                                  : 'var(--surface-card)',
                              color:
                                message.role === 'user'
                                  ? 'var(--btn-primary-text)'
                                  : 'var(--text-primary)',
                              ...(message.role === 'user' && {
                                border: '1px solid var(--btn-primary-border)',
                              }),
                            }}
                          >
                            {message.role === 'user' ? (
                              <>
                                <p className="whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                                <TokenUsageDisplay
                                  inputTokens={message.inputTokens}
                                  outputTokens={message.outputTokens}
                                  role="user"
                                  userName={user?.displayName}
                                />
                              </>
                            ) : (
                              <>
                                <MarkdownMessage
                                  content={
                                    message.toolCalls
                                      ? stripThinkingTags(message.content)
                                      : message.content
                                  }
                                />
                                <TokenUsageDisplay
                                  inputTokens={
                                    message.inputTokens ??
                                    (index === conversation.messages.length - 1 && agentModeEnabled
                                      ? activeInputTokens
                                      : undefined)
                                  }
                                  outputTokens={
                                    message.outputTokens ??
                                    (index === conversation.messages.length - 1 && agentModeEnabled
                                      ? activeOutputTokens
                                      : undefined)
                                  }
                                  role="assistant"
                                  modelName={conversation?.model}
                                  durationMs={
                                    message.durationMs ??
                                    (index === conversation.messages.length - 1 && agentModeEnabled
                                      ? activeStreamDuration
                                      : undefined)
                                  }
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Show retrieved notes after assistant messages that have them */}
                      {isAssistantMessage &&
                        message.retrievedNotes &&
                        message.retrievedNotes.length > 0 && (
                          <RetrievedNotes notes={message.retrievedNotes} />
                        )}
                    </div>
                  );
                })}
                {/* Show pending user message */}
                {pendingMessage && !isLastMessageDuplicate && (
                  <div className="flex justify-end">
                    <div
                      className="max-w-[80%] rounded-2xl px-5 py-3 rounded-br-md"
                      style={{
                        backgroundColor: 'var(--btn-primary-bg)',
                        color: 'var(--btn-primary-text)',
                        border: '1px solid var(--btn-primary-border)',
                      }}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {pendingMessage}
                      </p>
                      <TokenUsageDisplay
                        inputTokens={activeInputTokens}
                        outputTokens={undefined}
                        role="user"
                        userName={user?.displayName}
                      />
                    </div>
                  </div>
                )}

                {/* Show streaming message - while actively streaming or transitioning */}
                {(activeIsStreaming || (activeStreamingMessage && !isLastMessageDuplicate)) && (
                  <div>
                    {/* Show thinking steps during agent streaming */}
                    {agentModeEnabled &&
                      thinkingSteps.length > 0 &&
                      (activeIsStreaming || (activeStreamingMessage && !isLastMessageDuplicate)) && (
                        <div className="space-y-2">
                          {thinkingSteps.map((step, index) => (
                            <ThinkingStepCard key={`thinking-${index}`} step={step} />
                          ))}
                        </div>
                      )}

                    {/* Show tool executions during agent streaming (only if not already persisted) */}
                    {agentModeEnabled &&
                      toolExecutions.length > 0 &&
                      (activeIsStreaming || (activeStreamingMessage && !isLastMessageDuplicate)) && (
                        <div className="space-y-2">
                          {toolExecutions.map((execution, index) => (
                            <ToolExecutionCard key={`streaming-${index}`} execution={execution} />
                          ))}
                        </div>
                      )}

                    {/* Show thinking/loading indicator only when streaming but no message content yet (agent mode only) */}
                    {agentModeEnabled &&
                      activeIsStreaming &&
                      !activeStreamingMessage &&
                      thinkingSteps.length === 0 &&
                      toolExecutions.length === 0 && (
                        <div className="flex justify-start">
                          <div
                            className="w-full rounded-2xl rounded-bl-md px-5 py-3"
                            style={{
                              backgroundColor: 'var(--surface-card)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <span
                              className="text-sm italic"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              Agent thinking...
                            </span>
                            <span
                              className="inline-block w-2 h-4 ml-1 animate-pulse"
                              style={{
                                backgroundColor: 'var(--btn-primary-bg)',
                                verticalAlign: 'middle',
                              }}
                            />
                          </div>
                        </div>
                      )}

                    {/* Only show main response message if we have content (for both agent and regular chat) */}
                    {activeStreamingMessage && (
                      <div className="flex justify-start">
                        <div
                          className="w-full rounded-2xl rounded-bl-md px-5 py-3"
                          style={{
                            backgroundColor: 'var(--surface-card)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <MarkdownMessage content={agentModeEnabled ? stripThinkingTags(activeStreamingMessage) : activeStreamingMessage} />
                          <TokenUsageDisplay
                            inputTokens={undefined}
                            outputTokens={activeOutputTokens}
                            role="assistant"
                            modelName={conversation?.model}
                            durationMs={!activeIsStreaming ? activeStreamDuration : undefined}
                          />
                          {/* Blinking cursor - only show while actively streaming main message */}
                          {activeIsStreaming && (
                            <span
                              className="inline-block w-2 h-4 ml-1 animate-pulse"
                              style={{
                                backgroundColor: 'var(--btn-primary-bg)',
                                verticalAlign: 'middle',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show retrieved notes during streaming if RAG was used */}
                    {!agentModeEnabled && streamingRetrievedNotes && streamingRetrievedNotes.length > 0 && (
                      <RetrievedNotes notes={streamingRetrievedNotes} />
                    )}
                  </div>
                )}

                {/* Show streaming error */}
                {activeStreamingError && (
                  <div className="flex justify-start">
                    <div
                      className="w-full rounded-2xl rounded-bl-md px-5 py-3"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--text-primary)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 flex-shrink-0 mt-0.5"
                          style={{ color: 'rgb(239, 68, 68)' }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div className="flex-1">
                          <p className="font-medium" style={{ color: 'rgb(239, 68, 68)' }}>
                            Streaming Error
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {activeStreamingError.message}
                          </p>
                          {activeStreamingMessage && (
                            <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                              Partial response received before error.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            {(sendMessage.isPending || createConversation.isPending) && !activeIsStreaming && (
              <div className="flex justify-start">
                <div
                  className="w-full rounded-2xl rounded-bl-md px-6 py-4"
                  style={{
                    backgroundColor: 'var(--surface-card)',
                    border: '1px solid var(--border)',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div className="flex flex-col gap-3">
                    {/* Animated dots indicator */}
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: 'var(--btn-primary-bg)',
                            opacity: 0.4,
                            animation: `pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite`,
                            animationDelay: `${i * 0.2}s`,
                          }}
                        />
                      ))}
                    </div>

                    {/* Shimmer effect lines */}
                    <div className="space-y-2">
                      {[100, 85, 95].map((width, i) => (
                        <div
                          key={i}
                          className="h-3 rounded-md relative overflow-hidden"
                          style={{
                            width: `${width}%`,
                            backgroundColor: 'var(--border)',
                            opacity: 0.3,
                          }}
                        >
                          <div
                            className="absolute inset-0 -translate-x-full"
                            style={{
                              background: 'linear-gradient(90deg, transparent, rgba(var(--btn-primary-bg-rgb, 59, 130, 246), 0.3), transparent)',
                              animation: `shimmer 2s infinite`,
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-16" />
          </div>
        </div>

        {/* Input Area - Floating at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 px-6 py-6 z-20 overflow-hidden [scrollbar-gutter:stable]"
        >
          <div className="max-w-3xl mx-auto">
            {/* Unified Input Bar */}
            <div
              className="relative flex items-end gap-3 rounded-3xl px-4 py-3 transition-all duration-200"
              style={{
                backgroundColor: 'var(--surface-card-solid)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
              }}
              onFocus={(e) => {
                if (e.currentTarget === e.target || e.currentTarget.contains(e.target as Node)) {
                  e.currentTarget.style.borderColor = 'var(--input-focus-border)';
                  e.currentTarget.style.boxShadow = `0 0 0 3px var(--input-focus-ring), var(--shadow-lg)`;
                }
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }
              }}
            >
              {/* Textarea */}
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                disabled={isLoading || !selectedProvider || !selectedModel}
                rows={1}
                className="flex-1 resize-none outline-none text-sm leading-relaxed placeholder:opacity-50"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  minHeight: '24px',
                  maxHeight: '200px',
                  paddingRight: inputValue.trim() ? '72px' : '0',
                  transition: 'padding-right 0.2s ease',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />

              {/* Token Count - Bottom Right */}
              {inputValue.trim() && (
                <div
                  className="absolute bottom-2.5 right-16 pointer-events-none select-none animate-in fade-in duration-200"
                  style={{
                    color: 'var(--text-tertiary)',
                    fontSize: '10.5px',
                    fontFeatureSettings: '"tnum"',
                    letterSpacing: '0.01em',
                    opacity: 0.7,
                  }}
                >
                  {inputTokenCount.toLocaleString()} {inputTokenCount === 1 ? 'token' : 'tokens'}
                </div>
              )}

              {/* Send/Cancel Button */}
              <button
                onClick={activeIsStreaming ? (agentModeEnabled ? cancelAgentStream : cancelStream) : handleSendMessage}
                disabled={!activeIsStreaming && (isLoading || !inputValue.trim() || !selectedProvider || !selectedModel)}
                className="flex-shrink-0 p-2.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{
                  backgroundColor: activeIsStreaming ? 'var(--error-bg)' : 'var(--btn-primary-bg)',
                  color: activeIsStreaming ? 'var(--error-text)' : 'var(--btn-primary-text)',
                  border: activeIsStreaming ? '1px solid var(--error-border)' : '1px solid var(--btn-primary-border)',
                  boxShadow: 'var(--btn-primary-shadow)',
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    if (activeIsStreaming) {
                      e.currentTarget.style.opacity = '0.9';
                    } else {
                      e.currentTarget.style.backgroundColor = 'var(--btn-primary-hover-bg)';
                      e.currentTarget.style.borderColor = 'var(--btn-primary-hover-border)';
                      e.currentTarget.style.boxShadow = 'var(--btn-primary-hover-shadow)';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    if (activeIsStreaming) {
                      e.currentTarget.style.opacity = '1';
                    } else {
                      e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
                      e.currentTarget.style.borderColor = 'var(--btn-primary-border)';
                      e.currentTarget.style.boxShadow = 'var(--btn-primary-shadow)';
                    }
                  }
                }}
                title={activeIsStreaming ? 'Cancel streaming' : isLoading ? 'Sending...' : 'Send message'}
              >
                {activeIsStreaming ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : isLoading ? (
                  <svg
                    className="w-5 h-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Note Modal - needed for clicking notes in relevant notes section */}
      <EditNoteModal />
    </div>
  );
}

