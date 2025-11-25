import { RefObject } from 'react';
import { ChatConversation, ChatMessage, ToolCall } from '../types/chat';
import { ToolExecution, ThinkingStep } from '../../agents/types/agent-types';
import { RagContextNote } from '../../rag/types';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator, LoadingMessageSkeleton } from './StreamingIndicator';
import { ChatWelcomeScreen } from './ChatWelcomeScreen';
import { ThinkingStepCard } from '../../agents/components/ThinkingStepCard';
import { ToolExecutionCard } from '../../agents/components/ToolExecutionCard';
import { RetrievedNotes } from '../../../components/ui/RetrievedNotes';
import { TokenUsageDisplay } from '../../../components/TokenUsageDisplay';
import { extractThinkingContent } from '../../../utils/thinking-utils';
import { convertToolCallToExecution } from '../utils/tool-utils';

export interface ChatMessageListProps {
  conversation: ChatConversation | undefined;
  pendingMessage: string | null;
  // Streaming state
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: RagContextNote[];
  toolExecutions: ToolExecution[];
  thinkingSteps: ThinkingStep[];
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number;
  // Settings
  agentModeEnabled: boolean;
  // User info
  userName?: string;
  // Loading state
  isSending: boolean;
  isCreating: boolean;
  // Refs for scrolling
  messagesContainerRef: RefObject<HTMLDivElement>;
  messagesEndRef: RefObject<HTMLDivElement>;
}

/**
 * Renders the message list including persisted messages, streaming content, and loading states.
 */
export function ChatMessageList({
  conversation,
  pendingMessage,
  isStreaming,
  streamingMessage,
  streamingError,
  retrievedNotes,
  toolExecutions,
  thinkingSteps,
  inputTokens,
  outputTokens,
  streamDuration,
  agentModeEnabled,
  userName,
  isSending,
  isCreating,
  messagesContainerRef,
  messagesEndRef,
}: ChatMessageListProps) {
  // Check if the latest message in the conversation matches the streaming message
  // This is used to prevent double rendering
  const lastMessage = conversation?.messages?.[conversation.messages.length - 1];
  const isLastMessageDuplicate =
    !!(!isStreaming &&
      streamingMessage &&
      lastMessage?.role === 'assistant' &&
      (lastMessage.content === streamingMessage ||
        lastMessage.content.trim() === streamingMessage.trim()));

  const hasNoMessages =
    !conversation ||
    (conversation.messages.length === 0 && !pendingMessage && !isStreaming);

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto px-6 py-8 mb-10 min-h-0 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:var(--color-brand-400)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[color:var(--color-brand-400)] [&::-webkit-scrollbar-thumb]:hover:bg-[color:var(--color-brand-300)]"
    >
      <div className="max-w-3xl mx-auto space-y-6 h-full">
        {hasNoMessages ? (
          <ChatWelcomeScreen />
        ) : (
          <>
            {conversation?.messages.map((message, index) => (
              <MessageWithContext
                key={index}
                message={message}
                index={index}
                totalMessages={conversation.messages.length}
                conversation={conversation}
                isStreaming={isStreaming}
                streamingMessage={streamingMessage}
                agentModeEnabled={agentModeEnabled}
                userName={userName}
                inputTokens={inputTokens}
                outputTokens={outputTokens}
                streamDuration={streamDuration}
              />
            ))}

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
                  <p className="whitespace-pre-wrap break-words">{pendingMessage}</p>
                  <TokenUsageDisplay
                    inputTokens={inputTokens}
                    outputTokens={undefined}
                    role="user"
                    userName={userName}
                  />
                </div>
              </div>
            )}

            {/* Show streaming message */}
            {(isStreaming || (streamingMessage && !isLastMessageDuplicate)) && (
              <StreamingIndicator
                isStreaming={isStreaming}
                streamingMessage={streamingMessage}
                streamingError={streamingError}
                modelName={conversation?.model}
                outputTokens={outputTokens}
                streamDuration={streamDuration}
                agentModeEnabled={agentModeEnabled}
                thinkingSteps={thinkingSteps}
                toolExecutions={toolExecutions}
                retrievedNotes={retrievedNotes}
              />
            )}

            {/* Show loading skeleton when sending but not streaming */}
            {(isSending || isCreating) && !isStreaming && <LoadingMessageSkeleton />}
          </>
        )}
        <div ref={messagesEndRef} className="h-16" />
      </div>
    </div>
  );
}

interface MessageWithContextProps {
  message: ChatMessage;
  index: number;
  totalMessages: number;
  conversation: ChatConversation;
  isStreaming: boolean;
  streamingMessage: string;
  agentModeEnabled: boolean;
  userName?: string;
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number;
}

/**
 * Renders a single message with its context (thinking steps, tool executions, retrieved notes).
 */
function MessageWithContext({
  message,
  index,
  totalMessages,
  conversation,
  isStreaming,
  streamingMessage,
  agentModeEnabled,
  userName,
  inputTokens,
  outputTokens,
  streamDuration,
}: MessageWithContextProps) {
  const isAssistantMessage = message.role === 'assistant';
  const isLastMessage = index === totalMessages - 1;

  // Hide assistant messages that are still streaming
  const isLastAssistantMessageDuringStream =
    isAssistantMessage && isLastMessage && (streamingMessage || isStreaming);

  const hasToolCalls = !!(isAssistantMessage && message.toolCalls && message.toolCalls.length > 0);

  // Extract thinking content from persisted messages
  const persistedThinkingSteps =
    hasToolCalls && !isLastAssistantMessageDuringStream
      ? extractThinkingContent(message.content)
      : [];

  const shouldShowPersistedThinking =
    persistedThinkingSteps.length > 0 &&
    !(isLastMessage && (streamingMessage || isStreaming));

  const shouldShowPersistedToolExecutions =
    hasToolCalls && !(isLastMessage && (streamingMessage || isStreaming));

  return (
    <div>
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

      {/* Show tool executions */}
      {shouldShowPersistedToolExecutions && (
        <div className="space-y-2 mb-3">
          {message.toolCalls!.map((toolCall: ToolCall, toolIndex: number) => (
            <ToolExecutionCard
              key={`${index}-tool-${toolIndex}`}
              execution={convertToolCallToExecution(toolCall)}
            />
          ))}
        </div>
      )}

      {/* Show the message bubble */}
      {!isLastAssistantMessageDuringStream && (
        <MessageBubble
          message={message}
          modelName={conversation.model}
          userName={userName}
          hasToolCalls={hasToolCalls}
          streamingInputTokens={inputTokens}
          streamingOutputTokens={outputTokens}
          streamingDuration={streamDuration}
          agentModeEnabled={agentModeEnabled}
          isLastMessage={isLastMessage}
        />
      )}

      {/* Show retrieved notes after assistant messages that have them */}
      {isAssistantMessage && message.retrievedNotes && message.retrievedNotes.length > 0 && (
        <RetrievedNotes notes={message.retrievedNotes} />
      )}
    </div>
  );
}

