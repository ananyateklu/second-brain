/**
 * Chat Page
 * Main chat interface with AI conversations, streaming, and image generation
 * 
 * Refactored to use consolidated state hook for better maintainability
 * Enhanced with granular Suspense boundaries for better loading UX
 */

import { useEffect, useRef, Suspense } from 'react';
import { useChatPageState } from '../features/chat/hooks/use-chat-page-state';
import { ChatSidebar } from '../features/chat/components/ChatSidebar';
import { ChatHeader } from '../features/chat/components/ChatHeader';
import { ChatMessageList } from '../features/chat/components/ChatMessageList';
import { ChatInputArea } from '../features/chat/components/ChatInputArea';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { useBoundStore } from '../store/bound-store';
import { useSendMessage } from '../features/chat/hooks/use-chat';
import { useStartSession, useEndSession, collectDeviceInfo } from '../features/chat/hooks/use-chat-sessions';
import { getDirectBackendUrl, API_ENDPOINTS } from '../lib/constants';
import { useTitleBarHeight } from '../components/layout/use-title-bar-height';
import { isTauri } from '../lib/native-notifications';
import type { VectorStoreProvider } from '../types/rag';
import {
  ChatSidebarSkeleton,
  ChatHeaderSkeleton,
  ChatMessagesSkeleton,
} from '../components/skeletons';

export function ChatPage() {
  const user = useBoundStore((state) => state.user);
  const sendMessage = useSendMessage();
  const titleBarHeight = useTitleBarHeight();

  // Fullscreen state for Tauri
  const isFullscreen = useBoundStore((state) => state.isFullscreenChat);
  const isInTauri = isTauri();

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
    toggleSidebar,
    setShowSidebar,
    handleProviderChange,
    handleModelChange,
    handleNewChat,
    handleSelectConversation,
    handleDeleteConversation,
    handleBulkDeleteConversations,
    handleRagToggle,
    handleVectorStoreChange,
    setAgentModeEnabled,
    setAgentRagEnabled,
    handleSendMessage,
    handleGenerateImage,
    handleImageGenerated,
    cancelStream,
  } = useChatPageState();

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

  // Calculate container styles based on fullscreen mode
  const isPageFullscreen = isInTauri && isFullscreen;
  const containerStyles = isPageFullscreen
    ? {
      backgroundColor: 'var(--surface-card)',
      borderColor: 'var(--border)',
      boxShadow: 'var(--shadow-2xl)',
      height: '100vh',
      maxHeight: '100vh',
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 30,
      borderRadius: 0,
    }
    : {
      backgroundColor: 'var(--surface-card)',
      borderColor: 'var(--border)',
      boxShadow: 'var(--shadow-2xl)',
      height: `calc(100vh - ${titleBarHeight}px - 21px)`,
      maxHeight: `calc(100vh - ${titleBarHeight}px - 21px)`,
    };

  return (
    <div
      ref={containerRef}
      className={`flex overflow-hidden border transition-all duration-300 ${isPageFullscreen ? '' : 'rounded-3xl'}`}
      style={containerStyles}
    >
      {/* Sidebar with Suspense boundary for independent loading */}
      {showSidebar && (
        <Suspense fallback={<ChatSidebarSkeleton />}>
          <ChatSidebar
            conversations={displayConversations}
            selectedConversationId={conversationId}
            isNewChat={isNewChat}
            onSelectConversation={handleSelectConversation}
            onDeleteConversation={handleDeleteConversation}
            onBulkDeleteConversations={handleBulkDeleteConversations}
            onNewChat={handleNewChat}
            onToggleSidebar={() => { setShowSidebar(false); }}
          />
        </Suspense>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header with Suspense boundary */}
        <Suspense fallback={<ChatHeaderSkeleton />}>
          <ChatHeader
            showSidebar={showSidebar}
            onToggleSidebar={toggleSidebar}
            isHealthLoading={isHealthLoading}
            availableProviders={availableProviders}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onProviderChange={handleProviderChange}
            onModelChange={handleModelChange}
            onRefreshProviders={refreshProviders}
            isRefreshing={isRefreshing}
            ragEnabled={ragEnabled}
            onRagToggle={(enabled) => {
              // Route to appropriate handler based on agent mode
              if (agentModeEnabled) {
                setAgentRagEnabled(enabled);
              } else {
                void handleRagToggle(enabled);
              }
            }}
            selectedVectorStore={selectedVectorStore as 'PostgreSQL' | 'Pinecone'}
            onVectorStoreChange={(provider) => { void handleVectorStoreChange(provider as VectorStoreProvider); }}
            agentModeEnabled={agentModeEnabled}
            onAgentModeChange={setAgentModeEnabled}
            agentRagEnabled={agentRagEnabled}
            agentCapabilities={agentCapabilities}
            isLoading={isLoading}
            isImageGenerationMode={isImageGenerationMode}
            contextUsage={contextUsage}
            isStreaming={isStreaming}
          />
        </Suspense>

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
