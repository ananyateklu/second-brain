import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chat-api';
import { SendMessageRequest } from '../types/chat';
import { estimateTokenCount } from '../../../utils/token-utils';

export interface StreamingState {
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: any[];
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number; // Duration in milliseconds
}

export function useChatStream() {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingError, setStreamingError] = useState<Error | null>(null);
  const [retrievedNotes, setRetrievedNotes] = useState<any[]>([]);
  const [inputTokens, setInputTokens] = useState<number | undefined>(undefined);
  const [outputTokens, setOutputTokens] = useState<number | undefined>(undefined);
  const [streamDuration, setStreamDuration] = useState<number | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamStartTimeRef = useRef<number | null>(null);

  const sendStreamingMessage = useCallback(
    async (conversationId: string, request: SendMessageRequest, retryCount = 0) => {
      const MAX_RETRIES = 2;

      // Reset state
      setIsStreaming(true);
      setStreamingMessage('');
      setStreamingError(null);
      setRetrievedNotes([]);

      // Calculate input tokens for the user's message
      const estimatedInputTokens = estimateTokenCount(request.content);
      setInputTokens(estimatedInputTokens);
      setOutputTokens(undefined);
      setStreamDuration(undefined);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        await chatApi.streamMessage(
          conversationId,
          request,
          {
            onStart: () => {
              console.log('Stream started');
              streamStartTimeRef.current = Date.now();
            },
            onToken: (token: string) => {
              setStreamingMessage((prev) => {
                const newMessage = prev + token;
                // Update output token estimate in real-time
                setOutputTokens(estimateTokenCount(newMessage));
                return newMessage;
              });
            },
            onRag: (notes: any[]) => {
              console.log('RAG notes received:', { count: notes.length });
              setRetrievedNotes(notes);
            },
            onEnd: (data: any) => {
              console.log('Stream ended:', data);

              // Calculate stream duration
              if (streamStartTimeRef.current) {
                const duration = Date.now() - streamStartTimeRef.current;
                setStreamDuration(duration);
                streamStartTimeRef.current = null;
              }

              // First, set streaming to false to hide the streaming UI
              setIsStreaming(false);

              // Add a small delay before invalidating queries
              // We keep the streaming message state until the new conversation data is fetched
              // to prevent UI blinking. The consuming component (ChatPage) is responsible
              // for clearing the streaming state once the new message appears in the conversation.
              setTimeout(() => {
                // Invalidate queries to refresh with complete conversation data
                queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
                queryClient.invalidateQueries({ queryKey: ['conversations'] });
              }, 150);
            },
            onError: (error: Error) => {
              console.error('Stream error:', { error, retryCount });

              // Retry logic for network errors
              if (retryCount < MAX_RETRIES &&
                (error.message.includes('network') ||
                  error.message.includes('fetch') ||
                  error.message.includes('timeout'))) {
                console.log('Retrying stream...', { attempt: retryCount + 1 });

                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                setTimeout(() => {
                  sendStreamingMessage(conversationId, request, retryCount + 1);
                }, delay);
                return;
              }

              setStreamingError(error);
              setIsStreaming(false);
            },
          },
          abortControllerRef.current.signal
        );
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('Stream aborted by user');
          } else {
            console.error('Streaming failed:', { error, retryCount });

            // Retry on network errors
            if (retryCount < MAX_RETRIES &&
              (error.message.includes('network') ||
                error.message.includes('fetch') ||
                error.message.includes('Failed to fetch'))) {
              console.log('Retrying stream after error...', { attempt: retryCount + 1 });

              // Exponential backoff
              const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
              setTimeout(() => {
                sendStreamingMessage(conversationId, request, retryCount + 1);
              }, delay);
              return;
            }

            setStreamingError(error);
          }
        } else {
          setStreamingError(new Error('Unknown error occurred during streaming'));
        }
        setIsStreaming(false);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [queryClient]
  );

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const resetStream = useCallback(() => {
    setStreamingMessage('');
    setStreamingError(null);
    setRetrievedNotes([]);
    setInputTokens(undefined);
    setOutputTokens(undefined);
    setStreamDuration(undefined);
    setIsStreaming(false);
    streamStartTimeRef.current = null;
  }, []);

  return {
    // State
    isStreaming,
    streamingMessage,
    streamingError,
    retrievedNotes,
    inputTokens,
    outputTokens,
    streamDuration,

    // Actions
    sendStreamingMessage,
    cancelStream,
    resetStream,
  };
}

