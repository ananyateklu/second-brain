import { useEffect, useRef, useCallback } from 'react';
import type { ChatConversation } from '../../../types/chat';
import type { PendingMessage } from './use-chat-conversation-manager';

interface UseChatStreamingCleanupProps {
  isStreaming: boolean;
  streamingMessage: string;
  conversation: ChatConversation | undefined;
  setPendingMessage: (msg: PendingMessage | null) => void;
  resetStream: () => void;
}

export function useChatStreamingCleanup({
  isStreaming,
  streamingMessage,
  conversation,
  setPendingMessage,
  resetStream
}: UseChatStreamingCleanupProps) {
  const prevMessageCountRef = useRef<number>(0);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up all fallback timeouts
  const clearFallbackTimeouts = useCallback(() => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Cleanup streaming state once message is persisted
  useEffect(() => {
    if (!isStreaming && streamingMessage && conversation?.messages) {
      const currentMessageCount = conversation.messages.length;
      const hasNewMessage = currentMessageCount > prevMessageCountRef.current;

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

      if (hasNewMessage || hasMatchingMessage) {
        setPendingMessage(null);
        resetStream();
      }
    }

    if (conversation?.messages) {
      prevMessageCountRef.current = conversation.messages.length;
    }
  }, [conversation?.messages, isStreaming, streamingMessage, resetStream, setPendingMessage]);

  // Fallback cleanup
  useEffect(() => {
    if (!isStreaming && streamingMessage) {
      clearFallbackTimeouts();

      fallbackTimeoutRef.current = setTimeout(() => {
        fallbackTimeoutRef.current = null;

        const messageNowPersisted = conversation?.messages?.some(
          (msg) =>
            msg.role === 'assistant' &&
            (msg.content === streamingMessage ||
              msg.content.trim() === streamingMessage.trim() ||
              (streamingMessage.trim().length > 20 &&
                msg.content.trim().includes(streamingMessage.trim().substring(0, 50))))
        );

        if (messageNowPersisted) {
          resetStream();
          setPendingMessage(null);
        } else {
          console.warn('[ChatPageState] Fallback timeout reached but message not found in conversation. Keeping streaming state visible.');
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            resetStream();
            setPendingMessage(null);
          }, 3000);
        }
      }, 5000);

      return clearFallbackTimeouts;
    }
    return undefined;
  }, [isStreaming, streamingMessage, resetStream, setPendingMessage, conversation?.messages, clearFallbackTimeouts]);

  // Also clean up timeouts when component unmounts or when streaming starts again
  useEffect(() => {
    if (isStreaming) {
      clearFallbackTimeouts();
    }
  }, [isStreaming, clearFallbackTimeouts]);
}
