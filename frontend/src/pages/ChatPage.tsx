/**
 * Chat Page
 * Main chat interface with AI conversations, streaming, and image generation
 * 
 * Refactored to use consolidated state hook for better maintainability
 */

import { useEffect, useState, useRef } from 'react';
import { useChatPageState } from '../features/chat/hooks/use-chat-page-state';
import { ChatSidebar } from '../features/chat/components/ChatSidebar';
import { ChatHeader } from '../features/chat/components/ChatHeader';
import { ChatMessageList } from '../features/chat/components/ChatMessageList';
import { ChatInputArea } from '../features/chat/components/ChatInputArea';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { useAuthStore } from '../store/auth-store';
import { useSendMessage } from '../features/chat/hooks/use-chat';
import { useStartSession, useEndSession, collectDeviceInfo } from '../features/chat/hooks/use-chat-sessions';
import { getApiBaseUrl } from '../lib/constants';
import type { VectorStoreProvider } from '../types/rag';

/**
 * Check if we're running in Tauri
 */
const isTauri = (): boolean => {
  return '__TAURI_INTERNALS__' in window;
};

export function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const sendMessage = useSendMessage();
  const [isTauriApp, setIsTauriApp] = useState(false);
  const { mutate: startSession } = useStartSession();
  const { mutate: endSession } = useEndSession();
  const sessionIdRef = useRef<string | null>(null);
  const messageCountRef = useRef({ sent: 0, received: 0 });
  const initialMessageCountRef = useRef({ sent: 0, received: 0 });

  // Check if running in Tauri
  useEffect(() => {
    setIsTauriApp(isTauri());
  }, []);

  // Calculate title bar offset for chat container height
  const titleBarOffset = isTauriApp ? 28 : 0;

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
    toolExecutions,
    thinkingSteps,
    agentRetrievedNotes,
    processingStatus,
    inputTokens,
    outputTokens,
    streamDuration,
    ragLogId,

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

  // Track message counts from conversation (only messages sent/received during this session)
  useEffect(() => {
    if (conversation?.messages && sessionIdRef.current) {
      const userMessages = conversation.messages.filter(m => m.role === 'user').length;
      const assistantMessages = conversation.messages.filter(m => m.role === 'assistant').length;
      // Calculate delta from initial counts (only count messages during this session)
      messageCountRef.current.sent = Math.max(0, userMessages - initialMessageCountRef.current.sent);
      messageCountRef.current.received = Math.max(0, assistantMessages - initialMessageCountRef.current.received);
    }
  }, [conversation?.messages]);

  // Start session when conversation is selected
  useEffect(() => {
    if (conversationId && !sessionIdRef.current && !isNewChat) {
      // Store initial message counts before starting session
      const initialSent = conversation?.messages?.filter(m => m.role === 'user').length || 0;
      const initialReceived = conversation?.messages?.filter(m => m.role === 'assistant').length || 0;
      initialMessageCountRef.current = { sent: initialSent, received: initialReceived };
      messageCountRef.current = { sent: 0, received: 0 };

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

    // Cleanup on unmount or conversation change
    return () => {
      if (sessionIdRef.current) {
        const sessionId = sessionIdRef.current;
        const counts = {
          messagesSent: messageCountRef.current.sent,
          messagesReceived: messageCountRef.current.received,
        };

        // Reset refs immediately
        sessionIdRef.current = null;
        messageCountRef.current = { sent: 0, received: 0 };
        initialMessageCountRef.current = { sent: 0, received: 0 };

        // End session (fire and forget - don't wait for response)
        endSession({
          sessionId,
          data: counts,
        });
      }
    };
  }, [conversationId, isNewChat, startSession, endSession, conversation?.messages]);

  // Handle tab close - use endSession mutation (sendBeacon doesn't support auth headers)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Use the mutation directly - it will use fetch with proper auth headers
        // Note: This may not complete if the page is closing, but it's the best we can do
        // The backend will handle session timeouts for abandoned sessions
        endSession({
          sessionId: sessionIdRef.current,
          data: {
            messagesSent: messageCountRef.current.sent,
            messagesReceived: messageCountRef.current.received,
          },
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [endSession]);

  return (
    <div
      ref={containerRef}
      className="flex overflow-hidden rounded-3xl border transition-all duration-300"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-2xl)',
        height: isTauriApp
          ? `calc(100vh - 2rem - ${titleBarOffset}px)`
          : 'calc(100vh - 2rem)',
      }}
    >
      {/* Sidebar */}
      {showSidebar && (
        <ChatSidebar
          conversations={displayConversations}
          selectedConversationId={conversationId}
          isNewChat={isNewChat}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onBulkDeleteConversations={handleBulkDeleteConversations}
          onNewChat={handleNewChat}
          onToggleSidebar={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header */}
        <ChatHeader
          showSidebar={showSidebar}
          onToggleSidebar={toggleSidebar}
          isHealthLoading={isHealthLoading}
          availableProviders={availableProviders}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onProviderChange={handleProviderChange}
          onModelChange={handleModelChange}
          ragEnabled={ragEnabled}
          onRagToggle={handleRagToggle}
          selectedVectorStore={selectedVectorStore as 'PostgreSQL' | 'Pinecone'}
          onVectorStoreChange={(provider) => handleVectorStoreChange(provider as VectorStoreProvider)}
          agentModeEnabled={agentModeEnabled}
          onAgentModeChange={setAgentModeEnabled}
          agentRagEnabled={agentRagEnabled}
          onAgentRagChange={setAgentRagEnabled}
          agentCapabilities={agentCapabilities}
          isLoading={isLoading}
          isImageGenerationMode={isImageGenerationMode}
          contextUsage={contextUsage}
          isStreaming={isStreaming}
        />

        {/* Messages Area */}
        <ChatMessageList
          conversation={conversation}
          pendingMessage={pendingMessage}
          isStreaming={isStreaming}
          streamingMessage={streamingMessage}
          streamingError={streamingError}
          retrievedNotes={retrievedNotes}
          toolExecutions={toolExecutions}
          thinkingSteps={thinkingSteps}
          agentRetrievedNotes={agentRetrievedNotes}
          processingStatus={processingStatus}
          inputTokens={inputTokens}
          outputTokens={outputTokens}
          streamDuration={streamDuration}
          ragLogId={ragLogId}
          agentModeEnabled={agentModeEnabled}
          userName={user?.displayName}
          isSending={sendMessage.isPending}
          isCreating={isCreating}
          isGeneratingImage={isGeneratingImage}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
        />

        {/* Input Area */}
        <ChatInputArea
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
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
