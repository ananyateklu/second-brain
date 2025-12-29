/**
 * Chat Page
 * Main chat interface with AI conversations, streaming, and image generation
 * 
 * Refactored to use consolidated state hook for better maintainability
 * Enhanced with granular Suspense boundaries for better loading UX
 */

import { useEffect, useRef, Suspense, useCallback, useMemo, useState } from 'react';
import { useChatPageState } from '../features/chat/hooks/use-chat-page-state';
import { ChatSidebar } from '../features/chat/components/ChatSidebar';
import { ChatMessageList } from '../features/chat/components/ChatMessageList';
import { ChatInputArea } from '../features/chat/components/ChatInputArea';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { useBoundStore } from '../store/bound-store';
import { useSendMessage } from '../features/chat/hooks/use-chat';
import { useStartSession, useEndSession, collectDeviceInfo } from '../features/chat/hooks/use-chat-sessions';
import { getDirectBackendUrl, API_ENDPOINTS } from '../lib/constants';
import { isTauri } from '../lib/native-notifications';
import { useChatPageContext } from '../features/chat/context/ChatPageContext';
import {
  ChatSidebarSkeleton,
  ChatMessagesSkeleton,
} from '../components/skeletons';

export function ChatPage() {
  const user = useBoundStore((state) => state.user);
  const sendMessage = useSendMessage();

  // Fullscreen state for Tauri
  const isFullscreen = useBoundStore((state) => state.isFullscreenChat);
  const isInTauri = isTauri();

  // Sidebar visibility from Zustand (shared with header)
  const chatSidebarVisible = useBoundStore((state) => state.chatSidebarVisible);
  const toggleChatSidebar = useBoundStore((state) => state.toggleChatSidebar);

  // Context for sharing state with header
  const { setHeaderState } = useChatPageContext();

  // Session tracking hooks (PostgreSQL 18 Temporal Features)
  const { mutate: startSession } = useStartSession();
  const { mutate: endSession } = useEndSession();
  const sessionIdRef = useRef<string | null>(null);
  const messageCountRef = useRef({ sent: 0, received: 0 });
  const previousConversationIdRef = useRef<string | null>(null);

  // Consolidated chat page state
  const {
    // UI State
    inputValue,
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
    agentModeEnabled,
    agentRagEnabled: _agentRagEnabled,
    notesCapabilityEnabled,

    // Streaming State
    isStreaming,
    streamingMessage,
    streamingError,
    retrievedNotes,
    processTimeline,
    textContentInTimeline,
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
    claudeSearchSources,
    codeExecutionResult,

    // Scroll
    messagesEndRef,
    messagesContainerRef,

    // Computed
    isLoading,
    isImageGenerationMode,
    agentCapabilities,

    // Context Usage
    contextUsage,

    // Actions
    setInputValue,
    handleProviderChange,
    handleModelChange,
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleBulkDeleteConversations,
    handleRagToggle,
    setAgentModeEnabled,
    setAgentRagEnabled: _setAgentRagEnabled,
    setNotesCapabilityEnabled,
    handleSendMessage,
    handleGenerateImage,
    handleImageGenerated,
    cancelStream,
  } = useChatPageState();

  // Selection mode state (lifted from ChatSidebar for header integration)
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<string>>(new Set());

  // Filter out placeholder conversations for selection
  const selectableConversations = useMemo(() => {
    return displayConversations.filter((conv) => conv.id !== 'placeholder-new-chat');
  }, [displayConversations]);

  const isAllSelected = selectedConversationIds.size === selectableConversations.length && selectableConversations.length > 0;

  // Selection handlers
  const handleToggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => !prev);
    if (isSelectionMode) {
      setSelectedConversationIds(new Set());
    }
  }, [isSelectionMode]);

  const handleToggleConversationSelection = useCallback((id: string) => {
    setSelectedConversationIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedConversationIds(new Set());
    } else {
      setSelectedConversationIds(new Set(selectableConversations.map(conv => conv.id)));
    }
  }, [isAllSelected, selectableConversations]);

  const handleBulkDeleteFromHeader = useCallback(async () => {
    if (selectedConversationIds.size === 0 || !handleBulkDeleteConversations) return;
    const idsToDelete = Array.from(selectedConversationIds);
    await handleBulkDeleteConversations(idsToDelete);
    setSelectedConversationIds(new Set());
    setIsSelectionMode(false);
  }, [selectedConversationIds, handleBulkDeleteConversations]);

  const handleExitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedConversationIds(new Set());
  }, []);

  // Start session when conversation is selected (PostgreSQL 18 Temporal Features)
  useEffect(() => {
    // End previous session if switching conversations
    if (previousConversationIdRef.current && previousConversationIdRef.current !== conversationId && sessionIdRef.current) {
      endSession({
        sessionId: sessionIdRef.current,
        data: {
          messagesSent: messageCountRef.current.sent,
          messagesReceived: messageCountRef.current.received,
        },
      });
      sessionIdRef.current = null;
      messageCountRef.current = { sent: 0, received: 0 };
    }

    // Start new session if we have a conversation and no active session
    if (conversationId && !sessionIdRef.current) {
      startSession(
        {
          conversationId,
          deviceInfo: collectDeviceInfo(),
          userAgent: navigator.userAgent,
        },
        {
          onSuccess: (session) => {
            sessionIdRef.current = session.id;
          },
        }
      );
    }

    previousConversationIdRef.current = conversationId;

    // Cleanup on unmount
    return () => {
      if (sessionIdRef.current) {
        endSession({
          sessionId: sessionIdRef.current,
          data: {
            messagesSent: messageCountRef.current.sent,
            messagesReceived: messageCountRef.current.received,
          },
        });
        sessionIdRef.current = null;
      }
    };
  }, [conversationId, startSession, endSession]);

  // Handle beforeunload for tab/window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliable cleanup when tab is closing
        // Must use direct backend URL as sendBeacon bypasses Vite proxy
        const backendUrl = getDirectBackendUrl();
        navigator.sendBeacon(
          `${backendUrl}${API_ENDPOINTS.CHAT.SESSIONS.END(sessionIdRef.current)}`,
          JSON.stringify({
            messagesSent: messageCountRef.current.sent,
            messagesReceived: messageCountRef.current.received,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => { window.removeEventListener('beforeunload', handleBeforeUnload); };
  }, []);

  // Track message counts (increment when streaming ends)
  useEffect(() => {
    if (!isStreaming && streamingMessage && sessionIdRef.current) {
      // A message was just completed
      messageCountRef.current.received++;
    }
  }, [isStreaming, streamingMessage]);

  // Track sent messages
  useEffect(() => {
    if (pendingMessage && sessionIdRef.current) {
      messageCountRef.current.sent++;
    }
  }, [pendingMessage]);

  // Memoized RAG toggle handler to prevent infinite loops
  const handleRagToggleForHeader = useCallback((enabled: boolean) => {
    if (agentModeEnabled) {
      setNotesCapabilityEnabled(enabled);
    } else {
      void handleRagToggle(enabled);
    }
  }, [agentModeEnabled, setNotesCapabilityEnabled, handleRagToggle]);

  // Memoize the header state object to prevent unnecessary updates
  const headerStateValue = useMemo(() => ({
    showSidebar: chatSidebarVisible,
    onToggleSidebar: toggleChatSidebar,
    isHealthLoading,
    availableProviders,
    selectedProvider,
    selectedModel,
    onProviderChange: handleProviderChange,
    onModelChange: handleModelChange,
    onRefreshProviders: refreshProviders,
    isRefreshing,
    ragEnabled: agentModeEnabled ? notesCapabilityEnabled : ragEnabled,
    onRagToggle: handleRagToggleForHeader,
    agentModeEnabled,
    onAgentModeChange: setAgentModeEnabled,
    agentRagEnabled: notesCapabilityEnabled,
    agentCapabilities,
    isLoading,
    isImageGenerationMode,
    contextUsage,
    isStreaming,
    // Sidebar controls for header integration
    conversationCount: selectableConversations.length,
    isSelectionMode,
    selectedConversationIds,
    onNewChat: handleNewChat,
    onToggleSelectionMode: handleToggleSelectionMode,
    onSelectAll: handleSelectAll,
    onBulkDelete: handleBulkDeleteFromHeader,
    onExitSelectionMode: handleExitSelectionMode,
    onToggleConversationSelection: handleToggleConversationSelection,
  }), [
    chatSidebarVisible,
    toggleChatSidebar,
    isHealthLoading,
    availableProviders,
    selectedProvider,
    selectedModel,
    handleProviderChange,
    handleModelChange,
    refreshProviders,
    isRefreshing,
    ragEnabled,
    agentModeEnabled,
    notesCapabilityEnabled,
    handleRagToggleForHeader,
    setAgentModeEnabled,
    agentCapabilities,
    isLoading,
    isImageGenerationMode,
    contextUsage,
    isStreaming,
    selectableConversations.length,
    isSelectionMode,
    selectedConversationIds,
    handleNewChat,
    handleToggleSelectionMode,
    handleSelectAll,
    handleBulkDeleteFromHeader,
    handleExitSelectionMode,
    handleToggleConversationSelection,
  ]);

  // Populate header context for ChatPageControls in Header
  useEffect(() => {
    setHeaderState(headerStateValue);

    // Clear context on unmount
    return () => {
      setHeaderState(null);
    };
  }, [setHeaderState, headerStateValue]);

  // Calculate container styles based on fullscreen mode
  const isPageFullscreen = isInTauri && isFullscreen;
  const containerStyles = isPageFullscreen
    ? {
      backgroundColor: 'transparent',
      height: '100vh',
      maxHeight: '100vh',
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
    }
    : {
      backgroundColor: 'transparent',
      height: '100%',
    };

  return (
    <div
      ref={containerRef}
      className="flex overflow-hidden flex-1 transition-all duration-300"
      style={containerStyles}
    >
      {/* Sidebar with Suspense boundary for independent loading */}
      {chatSidebarVisible && (
        <Suspense fallback={<ChatSidebarSkeleton />}>
          <ChatSidebar
            conversations={displayConversations}
            selectedConversationId={conversationId}
            isNewChat={isNewChat}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            isSelectionMode={isSelectionMode}
            selectedIds={selectedConversationIds}
            onToggleSelection={handleToggleConversationSelection}
          />
        </Suspense>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Messages Area with Suspense boundary */}
        <Suspense fallback={<ChatMessagesSkeleton />}>
          <ChatMessageList
            conversation={conversation}
            pendingMessage={pendingMessage}
            isStreaming={isStreaming}
            streamingMessage={streamingMessage}
            streamingError={streamingError}
            retrievedNotes={retrievedNotes}
            processTimeline={processTimeline}
            textContentInTimeline={textContentInTimeline}
            toolExecutions={toolExecutions}
            thinkingSteps={thinkingSteps}
            agentRetrievedNotes={agentRetrievedNotes}
            processingStatus={processingStatus}
            inputTokens={inputTokens}
            outputTokens={outputTokens}
            streamDuration={streamDuration}
            ragLogId={ragLogId}
            groundingSources={groundingSources}
            grokSearchSources={grokSearchSources}
            claudeSearchSources={claudeSearchSources}
            codeExecutionResult={codeExecutionResult}
            agentModeEnabled={agentModeEnabled}
            ragEnabled={ragEnabled}
            userName={user?.displayName}
            isSending={sendMessage.isPending}
            isCreating={isCreating}
            isGeneratingImage={isGeneratingImage}
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
          />
        </Suspense>

        {/* Input Area */}
        <ChatInputArea
          value={inputValue}
          onChange={setInputValue}
          onSend={(images) => { void handleSendMessage(images); }}
          onCancel={cancelStream}
          isStreaming={isStreaming}
          isLoading={isLoading}
          disabled={!selectedProvider || !selectedModel}
          provider={selectedProvider}
          model={selectedModel}
          agentModeEnabled={agentModeEnabled}
          notesCapabilityEnabled={notesCapabilityEnabled}
          conversationId={conversationId || undefined}
          onImageGenerated={handleImageGenerated}
          isImageGenerationMode={isImageGenerationMode}
          onGenerateImage={handleGenerateImage}
        />
      </div>

      {/* Edit Note Modal - for clicking notes in relevant notes section */}
      <EditNoteModal />
    </div>
  );
}
