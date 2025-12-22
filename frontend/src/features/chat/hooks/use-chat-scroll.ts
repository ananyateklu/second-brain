import { useRef, useEffect } from 'react';
import { PendingMessage } from '../hooks/use-chat-conversation-manager';

export interface ChatScrollRefs {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
}

export interface ChatScrollOptions {
  isStreaming: boolean;
  streamingMessage: string;
  pendingMessage: PendingMessage | null;
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
  // Timeout ref for cleanup on unmount (prevents memory leaks)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Helper function to scroll to bottom with proper padding respect
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    });
  };

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
      scrollToBottom('smooth');
      wasAtBottomRef.current = true;
    }
  }, [isStreaming, streamingMessage]);

  // Scroll to bottom when a new pending message appears (user sends a message)
  useEffect(() => {
    if (pendingMessage) {
      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Small delay to ensure DOM is updated
      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
        scrollToBottom('smooth');
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
        scrollToBottom('auto');
      }
    }

    // Update previous scroll height after render
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        previousScrollHeightRef.current = messagesContainerRef.current.scrollHeight;
      }
    });
  }, [messagesLength, isStreaming]);

  // Initial scroll to bottom on mount or when conversation changes
  useEffect(() => {
    if (messagesLength > 0 && !isStreaming) {
      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      // Use a longer delay for initial load to ensure layout is fully settled
      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
        scrollToBottom('auto');
      }, 100);
    }
  }, [messagesLength, isStreaming]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    messagesEndRef,
    messagesContainerRef,
  };
}

