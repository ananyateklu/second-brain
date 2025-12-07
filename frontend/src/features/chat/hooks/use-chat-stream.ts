import { useState, useCallback, useRef, useTransition } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { chatService } from '../../../services';
import { SendMessageRequest, GroundingSource, CodeExecutionResult } from '../../../types/chat';
import { RagContextNote } from '../../../types/rag';
import { estimateTokenCount } from '../../../utils/token-utils';
import { conversationKeys } from '../../../lib/query-keys';

export interface StreamingState {
  isStreaming: boolean;
  streamingMessage: string;
  streamingError: Error | null;
  retrievedNotes: RagContextNote[];
  inputTokens?: number;
  outputTokens?: number;
  streamDuration?: number; // Duration in milliseconds
  /** RAG query log ID for feedback submission */
  ragLogId?: string;
  /** Whether a transition is pending (for UI feedback) */
  isPending?: boolean;
  /** Grounding sources from Google Search (Gemini only) */
  groundingSources?: GroundingSource[];
  /** Code execution result from Python sandbox (Gemini only) */
  codeExecutionResult?: CodeExecutionResult;
  /** Thinking process content (Gemini only) */
  thinkingProcess?: string;
}

export function useChatStream() {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingError, setStreamingError] = useState<Error | null>(null);
  const [retrievedNotes, setRetrievedNotes] = useState<RagContextNote[]>([]);
  const [inputTokens, setInputTokens] = useState<number | undefined>(undefined);
  const [outputTokens, setOutputTokens] = useState<number | undefined>(undefined);
  const [streamDuration, setStreamDuration] = useState<number | undefined>(undefined);
  const [ragLogId, setRagLogId] = useState<string | undefined>(undefined);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [codeExecutionResult, setCodeExecutionResult] = useState<CodeExecutionResult | null>(null);
  const [thinkingProcess, setThinkingProcess] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamStartTimeRef = useRef<number | null>(null);

  // useTransition for non-blocking state updates during streaming
  const [isPending, startTransition] = useTransition();

  const sendStreamingMessage = useCallback(
    async (conversationId: string, request: SendMessageRequest, retryCount = 0) => {
      const MAX_RETRIES = 2;

      // Reset state using transition for non-blocking updates
      // This keeps the input responsive while preparing for streaming
      startTransition(() => {
        setIsStreaming(true);
        setStreamingMessage('');
        setStreamingError(null);
        setRetrievedNotes([]);
        setRagLogId(undefined);
        setGroundingSources([]);
        setCodeExecutionResult(null);
        setThinkingProcess('');
      });

      // Calculate input tokens for the user's message
      const estimatedInputTokens = estimateTokenCount(request.content);
      setInputTokens(estimatedInputTokens);
      setOutputTokens(undefined);
      setStreamDuration(undefined);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        await chatService.streamMessage(
          conversationId,
          request,
          {
            onStart: () => {
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
            onRag: (notes: RagContextNote[]) => {
              setRetrievedNotes(notes);
            },
            onGroundingSources: (sources: GroundingSource[]) => {
              setGroundingSources(sources);
            },
            onCodeExecution: (result: CodeExecutionResult) => {
              setCodeExecutionResult(result);
            },
            onThinking: (thinking: string) => {
              setThinkingProcess((prev) => prev + thinking);
            },
            onEnd: (data: { ragLogId?: string } | undefined) => {
              // Capture ragLogId from end data for feedback submission
              if (data?.ragLogId) {
                setRagLogId(data.ragLogId);
              }

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
                void queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
                void queryClient.invalidateQueries({ queryKey: conversationKeys.all });
              }, 150);
            },
            onError: (error: Error) => {
              console.error('Stream error:', { error, retryCount });

              // Retry logic for network errors
              if (retryCount < MAX_RETRIES &&
                (error.message.includes('network') ||
                  error.message.includes('fetch') ||
                  error.message.includes('timeout'))) {
                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
                setTimeout(() => {
                  void sendStreamingMessage(conversationId, request, retryCount + 1);
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
            // Stream was cancelled by user - no action needed
          } else {
            console.error('Streaming failed:', { error, retryCount });

            // Retry on network errors
            if (retryCount < MAX_RETRIES &&
              (error.message.includes('network') ||
                error.message.includes('fetch') ||
                error.message.includes('Failed to fetch'))) {
              // Exponential backoff
              const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
              setTimeout(() => {
                void sendStreamingMessage(conversationId, request, retryCount + 1);
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
    setRagLogId(undefined);
    setGroundingSources([]);
    setCodeExecutionResult(null);
    setThinkingProcess('');
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
    ragLogId,
    isPending, // Transition pending state for UI feedback
    // Gemini-specific state
    groundingSources,
    codeExecutionResult,
    thinkingProcess,

    // Actions
    sendStreamingMessage,
    cancelStream,
    resetStream,
  };
}

