/**
 * Chat Page
 * Main chat interface with AI conversations, streaming, and image generation
 * 
 * Refactored to use consolidated state hook for better maintainability
 */

import { useChatPageState } from '../features/chat/hooks/use-chat-page-state';
import { ChatSidebar } from '../features/chat/components/ChatSidebar';
import { ChatHeader } from '../features/chat/components/ChatHeader';
import { ChatMessageList } from '../features/chat/components/ChatMessageList';
import { ChatInputArea } from '../features/chat/components/ChatInputArea';
import { EditNoteModal } from '../features/notes/components/EditNoteModal';
import { useAuthStore } from '../store/auth-store';
import { useSendMessage } from '../features/chat/hooks/use-chat';
import type { VectorStoreProvider } from '../types/rag';

export function ChatPage() {
  const user = useAuthStore((state) => state.user);
  const sendMessage = useSendMessage();

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
    notesCapabilityEnabled,

    // Streaming State
    isStreaming,
    streamingMessage,
    streamingError,
    retrievedNotes,
    toolExecutions,
    thinkingSteps,
    processingStatus,
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
    handleSendMessage,
    handleGenerateImage,
    handleImageGenerated,
    cancelStream,
  } = useChatPageState();

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
          agentCapabilities={agentCapabilities}
          isLoading={isLoading}
          isImageGenerationMode={isImageGenerationMode}
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
          processingStatus={processingStatus}
          inputTokens={inputTokens}
          outputTokens={outputTokens}
          streamDuration={streamDuration}
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
