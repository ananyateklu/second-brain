import { useState, useRef, useEffect, useCallback } from 'react';
import { useSendMessage } from '../features/chat/hooks/use-chat';
import { useChatConversationManager } from '../features/chat/hooks/use-chat-conversation-manager';
import { useChatProviderSelection } from '../features/chat/hooks/use-chat-provider-selection';
import { useChatSettings } from '../features/chat/hooks/use-chat-settings';
import { useChatScroll } from '../features/chat/hooks/use-chat-scroll';
import { useCombinedStreaming } from '../features/chat/hooks/use-combined-streaming';
import { ChatSidebar } from '../features/chat/components/ChatSidebar';
import { ChatHeader, AgentCapability } from '../features/chat/components/ChatHeader';
import { ChatMessageList } from '../features/chat/components/ChatMessageList';
import { ChatInputArea } from '../features/chat/components/ChatInputArea';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { toast } from '../hooks/use-toast';
import { useAuthStore } from '../store/auth-store';
import { DEFAULT_USER_ID } from '../lib/constants';

export function ChatPage() {
  const [inputValue, setInputValue] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((state) => state.user);
  const sendMessage = useSendMessage();

  // Provider selection hook
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

  // Conversation manager hook
  const conversationManager = useChatConversationManager({
    selectedProvider,
    selectedModel,
    ragEnabled: false, // Will be updated by settings hook
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
    handleSelectConversation,
    handleDeleteConversation,
    createConversation,
  } = conversationManager;

  // Settings hook
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

  // Combined streaming hook
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

  // Scroll hook
  const { messagesEndRef, messagesContainerRef } = useChatScroll({
    isStreaming,
    streamingMessage,
    pendingMessage,
    messagesLength: conversation?.messages?.length || 0,
  });

  // Loading state
  const isLoading = sendMessage.isPending || isCreating || isStreaming;

  // Clear pending message when it appears in the conversation
  // This should happen immediately when the message is persisted, regardless of streaming state
  useEffect(() => {
    if (pendingMessage && conversation?.messages) {
      const hasPendingMessage = conversation.messages.some(
        (msg) => msg.role === 'user' && (msg.content === pendingMessage || msg.content.trim() === pendingMessage.trim())
      );

      // Clear immediately when found, don't wait for streaming to complete
      if (hasPendingMessage) {
        setPendingMessage(null);
      }
    }
  }, [pendingMessage, conversation?.messages, setPendingMessage]);

  // Cleanup streaming state once message is persisted
  // This effect runs whenever the conversation updates and detects if the streaming message has been persisted
  useEffect(() => {
    if (!isStreaming && streamingMessage && conversation?.messages) {
      // Check if any assistant message matches the streaming message
      const hasMatchingMessage = conversation.messages.some(
        (msg) =>
          msg.role === 'assistant' &&
          (msg.content === streamingMessage ||
            msg.content.trim() === streamingMessage.trim() ||
            // Check if the persisted message starts with or contains a significant portion of the streaming message
            (streamingMessage.trim().length > 20 &&
              (msg.content.trim().startsWith(streamingMessage.trim().substring(0, Math.min(100, streamingMessage.trim().length))) ||
                msg.content.trim().includes(streamingMessage.trim().substring(0, Math.min(50, streamingMessage.trim().length))))))
      );

      if (hasMatchingMessage) {
        setPendingMessage(null);
        resetStream();
      }
    }
  }, [conversation?.messages, isStreaming, streamingMessage, resetStream, setPendingMessage]);

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const messageToSend = inputValue.trim();
    setPendingMessage(messageToSend);
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
          title: messageToSend.slice(0, 50),
          ragEnabled: ragEnabled,
          agentEnabled: agentModeEnabled,
          agentCapabilities: capabilities.length > 0 ? JSON.stringify(capabilities) : undefined,
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
  }, [
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
  ]);

  // Handle selecting a conversation
  const onSelectConversation = useCallback(
    (id: string) => {
      handleSelectConversation(id, (conv) => {
        setProviderAndModel(conv.provider, conv.model);
      });
    },
    [handleSelectConversation, setProviderAndModel]
  );

  // Agent capabilities configuration
  const agentCapabilities: AgentCapability[] = [
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
  ];

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
        <ChatSidebar
          conversations={displayConversations}
          selectedConversationId={conversationId}
          isNewChat={isNewChat}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onNewChat={handleNewChat}
          onToggleSidebar={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Header */}
        <ChatHeader
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          isHealthLoading={isHealthLoading}
          availableProviders={availableProviders}
          selectedProvider={selectedProvider}
          selectedModel={selectedModel}
          onProviderChange={handleProviderChange}
          onModelChange={handleModelChange}
          ragEnabled={ragEnabled}
          onRagToggle={handleRagToggle}
          selectedVectorStore={selectedVectorStore}
          onVectorStoreChange={handleVectorStoreChange}
          agentModeEnabled={agentModeEnabled}
          onAgentModeChange={setAgentModeEnabled}
          agentCapabilities={agentCapabilities}
          isLoading={isLoading}
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
          inputTokens={inputTokens}
          outputTokens={outputTokens}
          streamDuration={streamDuration}
          agentModeEnabled={agentModeEnabled}
          userName={user?.displayName}
          isSending={sendMessage.isPending}
          isCreating={isCreating}
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
        />
      </div>

      {/* Edit Note Modal - needed for clicking notes in relevant notes section */}
      <EditNoteModal />
    </div>
  );
}
