import { RefObject, useMemo } from 'react';
import { ChatConversation, ChatMessage, ToolCall } from '../types/chat';
import { ToolExecution, ThinkingStep } from '../../agents/types/agent-types';
import { RagContextNote } from '../../rag/types';
import { MessageBubble } from './MessageBubble';
import { StreamingIndicator, ImageGenerationLoadingSkeleton } from './StreamingIndicator';
import { ChatWelcomeScreen } from './ChatWelcomeScreen';
import { ThinkingStepCard } from '../../agents/components/ThinkingStepCard';
import { ToolExecutionCard } from '../../agents/components/ToolExecutionCard';
import { ProcessTimeline } from './ProcessTimeline';
import { RetrievedNotes } from '../../../components/ui/RetrievedNotes';
import { TokenUsageDisplay } from '../../../components/TokenUsageDisplay';
import { extractThinkingContent } from '../../../utils/thinking-utils';
import { convertToolCallToExecution } from '../utils/tool-utils';

import { PendingMessage } from '../hooks/use-chat-conversation-manager';

export interface ChatMessageListProps {
  conversation: ChatConversation | undefined;
  pendingMessage: PendingMessage | null;
  // Streaming state
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: RagContextNote[];
  toolExecutions: ToolExecution[];
  thinkingSteps: ThinkingStep[];
  processingStatus?: string | null;
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
  isGeneratingImage?: boolean;
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
  processingStatus,
  inputTokens,
  outputTokens,
  streamDuration,
  agentModeEnabled,
  userName,
  isSending,
  isCreating,
  isGeneratingImage,
  messagesContainerRef,
  messagesEndRef,
}: ChatMessageListProps) {
  // Check if any assistant message in the conversation matches the streaming message
  // This is used to prevent double rendering
  const hasMatchingPersistedMessage = useMemo(() => {
    if (isStreaming || !streamingMessage || !conversation?.messages) {
      return false;
    }

    // Check if any assistant message matches the streaming message
    return conversation.messages.some(
      (msg) =>
        msg.role === 'assistant' &&
        (msg.content === streamingMessage ||
          msg.content.trim() === streamingMessage.trim() ||
          // More lenient check: if streaming message is substantial, check if persisted message contains it
          (streamingMessage.trim().length > 20 &&
            (msg.content.trim().startsWith(streamingMessage.trim().substring(0, Math.min(100, streamingMessage.trim().length))) ||
              msg.content.trim().includes(streamingMessage.trim().substring(0, Math.min(50, streamingMessage.trim().length))))))
    );
  }, [isStreaming, streamingMessage, conversation?.messages]);

  // Check if the pending user message already exists in the persisted messages
  // This prevents showing duplicate user messages
  const hasMatchingPendingUserMessage = useMemo(() => {
    if (!pendingMessage || !conversation?.messages) {
      return false;
    }

    // Check if any user message matches the pending message
    return conversation.messages.some(
      (msg) =>
        msg.role === 'user' &&
        (msg.content === pendingMessage.content || msg.content.trim() === pendingMessage.content.trim())
    );
  }, [pendingMessage, conversation?.messages]);

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
                streamingMessage={streamingMessage}
                agentModeEnabled={agentModeEnabled}
                userName={userName}
                inputTokens={inputTokens}
                outputTokens={outputTokens}
                streamDuration={streamDuration}
              />
            ))}

            {/* Show pending user message */}
            {pendingMessage && !hasMatchingPersistedMessage && !hasMatchingPendingUserMessage && (
              <PendingUserMessage
                pendingMessage={pendingMessage}
                inputTokens={inputTokens}
                userName={userName}
              />
            )}

            {/* Show streaming message */}
            {(isStreaming || (streamingMessage && !hasMatchingPersistedMessage)) && (
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
                processingStatus={processingStatus}
                retrievedNotes={retrievedNotes}
              />
            )}

            {/* Show loading skeleton when sending but not streaming, or when generating image */}
            {((isSending || isCreating || isGeneratingImage) && !isStreaming) && (
              <ImageGenerationLoadingSkeleton isGeneratingImage={isGeneratingImage} />
            )}
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
  streamingMessage,
  agentModeEnabled,
  userName,
  inputTokens,
  outputTokens,
  streamDuration,
}: MessageWithContextProps) {
  const isAssistantMessage = message.role === 'assistant';
  const isLastMessage = index === totalMessages - 1;

  // Only hide the last assistant message if it's a duplicate of what's currently streaming.
  // This prevents hiding old assistant messages from previous exchanges when a new response is streaming.
  // We check if the message content matches (or is a prefix/suffix of) the streaming message.
  const isStreamingDuplicate = useMemo(() => {
    if (!isAssistantMessage || !isLastMessage || !streamingMessage) {
      return false;
    }

    const messageContent = message.content.trim();
    const streamContent = streamingMessage.trim();

    // Empty streaming content shouldn't hide anything
    if (streamContent.length === 0) {
      return false;
    }

    // Direct match
    if (messageContent === streamContent) {
      return true;
    }

    // Check if this persisted message is a duplicate of the streaming content
    // This handles cases where the message is persisted while streaming is still in progress
    if (streamContent.length > 20) {
      const compareLength = Math.min(100, streamContent.length);
      const streamPrefix = streamContent.substring(0, compareLength);
      // Message content starts with or matches the beginning of streaming content
      if (messageContent.startsWith(streamPrefix)) {
        return true;
      }
      // Streaming content starts with or matches the beginning of message content
      if (streamContent.startsWith(messageContent.substring(0, compareLength))) {
        return true;
      }
    }

    return false;
  }, [isAssistantMessage, isLastMessage, streamingMessage, message.content]);

  const hasToolCalls = !!(isAssistantMessage && message.toolCalls && message.toolCalls.length > 0);

  // Extract thinking content from persisted messages
  const persistedThinkingSteps =
    hasToolCalls && !isStreamingDuplicate
      ? extractThinkingContent(message.content)
      : [];

  // Only hide thinking/tool executions if this message is a duplicate of streaming content
  const shouldShowPersistedThinking =
    persistedThinkingSteps.length > 0 && !isStreamingDuplicate;

  const shouldShowPersistedToolExecutions =
    hasToolCalls && !isStreamingDuplicate;

  const hasProcessContent = shouldShowPersistedThinking || shouldShowPersistedToolExecutions;

  return (
    <div>
      {/* Use ProcessTimeline to wrap reasoning and tool executions */}
      <ProcessTimeline hasContent={hasProcessContent}>
        {shouldShowPersistedThinking && persistedThinkingSteps.map((thinkingContent, thinkingIndex) => (
          <ThinkingStepCard
            key={`${index}-thinking-${thinkingIndex}`}
            step={{
              content: thinkingContent,
              timestamp: new Date(message.timestamp || Date.now()),
            }}
          />
        ))}

        {shouldShowPersistedToolExecutions && message.toolCalls!.map((toolCall: ToolCall, toolIndex: number) => (
          <ToolExecutionCard
            key={`${index}-tool-${toolIndex}`}
            execution={convertToolCallToExecution(toolCall)}
            isLast={toolIndex === message.toolCalls!.length - 1}
          />
        ))}
      </ProcessTimeline>

      {/* Show the message bubble */}
      {!isStreamingDuplicate && (
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

/**
 * Helper to check if content is an image generation request
 */
function isImageGenerationRequest(content: string): boolean {
  return content.startsWith('[Image Generation Request]');
}

/**
 * Extract the prompt from an image generation request
 */
function extractImagePrompt(content: string): string {
  return content.replace('[Image Generation Request]\n', '').replace('[Image Generation Request]', '').trim();
}

interface PendingUserMessageProps {
  pendingMessage: PendingMessage;
  inputTokens?: number;
  userName?: string;
}

/**
 * Renders the pending user message with special styling for image generation requests
 */
function PendingUserMessage({ pendingMessage, inputTokens, userName }: PendingUserMessageProps) {
  const isImageRequest = isImageGenerationRequest(pendingMessage.content);
  const prompt = isImageRequest ? extractImagePrompt(pendingMessage.content) : pendingMessage.content;

  if (isImageRequest) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl px-5 py-4 rounded-br-md"
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            border: '1px solid var(--btn-primary-border)',
          }}
        >
          {/* Image generation badge */}
          <div className="flex items-center gap-2 mb-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Generate Image</span>
            </div>
          </div>
          
          {/* Prompt text */}
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{prompt}</p>
          
          <TokenUsageDisplay
            inputTokens={inputTokens}
            outputTokens={undefined}
            role="user"
            userName={userName}
          />
        </div>
      </div>
    );
  }

  // Regular message display
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] rounded-2xl px-5 py-3 rounded-br-md"
        style={{
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          border: '1px solid var(--btn-primary-border)',
        }}
      >
        {pendingMessage.images && pendingMessage.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingMessage.images.map((image, index) => (
              <div
                key={index}
                className="relative rounded-lg overflow-hidden border border-white/20"
                style={{ width: '80px', height: '80px' }}
              >
                <img
                  src={`data:${image.mediaType};base64,${image.base64Data}`}
                  alt={image.fileName || 'Attached image'}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words">{pendingMessage.content}</p>
        <TokenUsageDisplay
          inputTokens={inputTokens}
          outputTokens={undefined}
          role="user"
          userName={userName}
        />
      </div>
    </div>
  );
}
