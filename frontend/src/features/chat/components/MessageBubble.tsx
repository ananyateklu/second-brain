import { ChatMessage } from '../types/chat';
import { MarkdownMessage } from '../../../components/MarkdownMessage';
import { TokenUsageDisplay } from '../../../components/TokenUsageDisplay';
import { stripThinkingTags } from '../../../utils/thinking-utils';

export interface MessageBubbleProps {
  message: ChatMessage;
  modelName?: string;
  userName?: string;
  hasToolCalls?: boolean;
  // For streaming messages that haven't been persisted yet
  streamingInputTokens?: number;
  streamingOutputTokens?: number;
  streamingDuration?: number;
  agentModeEnabled?: boolean;
  isLastMessage?: boolean;
}

/**
 * Renders a single message bubble (user or assistant).
 */
export function MessageBubble({
  message,
  modelName,
  userName,
  hasToolCalls = false,
  streamingInputTokens,
  streamingOutputTokens,
  streamingDuration,
  agentModeEnabled = false,
  isLastMessage = false,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${isUser ? 'max-w-[80%]' : 'w-full'} rounded-2xl px-5 py-3 ${
          isUser ? 'rounded-br-md' : 'rounded-bl-md'
        }`}
        style={{
          backgroundColor: isUser ? 'var(--btn-primary-bg)' : 'var(--surface-card)',
          color: isUser ? 'var(--btn-primary-text)' : 'var(--text-primary)',
          ...(isUser && {
            border: '1px solid var(--btn-primary-border)',
          }),
        }}
      >
        {isUser ? (
          <>
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {message.images.map((image, index) => (
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
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
            <TokenUsageDisplay
              inputTokens={message.inputTokens}
              outputTokens={message.outputTokens}
              role="user"
              userName={userName}
            />
          </>
        ) : (
          <>
            <MarkdownMessage
              content={hasToolCalls ? stripThinkingTags(message.content) : message.content}
            />
            <TokenUsageDisplay
              inputTokens={
                message.inputTokens ??
                (isLastMessage && agentModeEnabled ? streamingInputTokens : undefined)
              }
              outputTokens={
                message.outputTokens ??
                (isLastMessage && agentModeEnabled ? streamingOutputTokens : undefined)
              }
              role="assistant"
              modelName={modelName}
              durationMs={
                message.durationMs ??
                (isLastMessage && agentModeEnabled ? streamingDuration : undefined)
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

