import { useRef, useEffect } from 'react';

export interface ChatScrollRefs {
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messagesContainerRef: React.RefObject<HTMLDivElement>;
}

export interface ChatScrollOptions {
  isStreaming: boolean;
  streamingMessage: string;
  pendingMessage: string | null;
  messagesLength: number;
}

/**
 * Manages scroll behavior for the chat messages area.
 * Handles auto-scrolling during streaming and maintaining scroll position.
 */
export function useChatScroll(options: ChatScrollOptions): ChatScrollRefs {
  const { isStreaming, streamingMessage, pendingMessage, messagesLength } = options;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const wasAtBottomRef = useRef<boolean>(true);

  // Track if user is at bottom during streaming
  useEffect(() => {
    if (isStreaming && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      wasAtBottomRef.current = isAtBottom;
    }
  }, [isStreaming, streamingMessage]);

  // Auto-scroll to bottom only during active streaming to follow the stream
  useEffect(() => {
    if (isStreaming && streamingMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      wasAtBottomRef.current = true;
    }
  }, [isStreaming, streamingMessage]);

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
  useEffect(() => {
    if (!isStreaming && messagesContainerRef.current && previousScrollHeightRef.current > 0) {
      const container = messagesContainerRef.current;
      const currentScrollHeight = container.scrollHeight;
      const previousScrollHeight = previousScrollHeightRef.current;

      // Only adjust if content height changed (message was persisted)
      if (currentScrollHeight !== previousScrollHeight && wasAtBottomRef.current) {
        requestAnimationFrame(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
          }
        });
      }
    }

    // Update previous scroll height after render
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
      }
    });
  }, [messagesLength, isStreaming]);

  return {
    messagesEndRef,
    messagesContainerRef,
  };
}

