import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { ToolExecution, ThinkingStep, AgentMessageRequest, RetrievedNoteContext } from '../types/agent-types';
import { estimateTokenCount } from '../../../utils/token-utils';
import { getApiBaseUrl, API_ENDPOINTS } from '../../../lib/constants';

// Type guards for parsed JSON data
interface ToolStartData {
  tool: string;
  arguments: string;
}

interface ToolEndData {
  tool: string;
  result: string;
}

interface ThinkingData {
  content: string;
}

interface StatusData {
  status: string;
}

interface ContextRetrievalData {
  retrievedNotes?: RetrievedNoteContext[];
  ragLogId?: string;
}

interface EndData {
  ragLogId?: string;
}

interface ErrorData {
  error?: string;
}

function isToolStartData(data: unknown): data is ToolStartData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tool' in data &&
    typeof (data as ToolStartData).tool === 'string' &&
    'arguments' in data &&
    typeof (data as ToolStartData).arguments === 'string'
  );
}

function isToolEndData(data: unknown): data is ToolEndData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tool' in data &&
    typeof (data as ToolEndData).tool === 'string' &&
    'result' in data &&
    typeof (data as ToolEndData).result === 'string'
  );
}

function isThinkingData(data: unknown): data is ThinkingData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'content' in data &&
    typeof (data as ThinkingData).content === 'string'
  );
}

function isStatusData(data: unknown): data is StatusData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    typeof (data as StatusData).status === 'string'
  );
}

function isContextRetrievalData(data: unknown): data is ContextRetrievalData {
  return typeof data === 'object' && data !== null;
}

function isEndData(data: unknown): data is EndData {
  return typeof data === 'object' && data !== null;
}

function isErrorData(data: unknown): data is ErrorData {
  return typeof data === 'object' && data !== null;
}

// Parse thinking blocks from streaming message
// Returns array of thinking steps, including incomplete ones (without closing tag)
// Returns both complete and incomplete blocks
// Supports both <thinking> and <think> tag variants
const parseThinkingBlocks = (message: string): { complete: ThinkingStep[]; incomplete: ThinkingStep | null } => {
  const completeSteps: ThinkingStep[] = [];
  let incompleteStep: ThinkingStep | null = null;

  // Regex patterns to match both <thinking> and <think> tag variants
  const thinkingTagRegex = /<think(?:ing)?>/gi;
  const closingTagRegex = /<\/think(?:ing)?>/gi;

  let match;

  // Reset regex lastIndex
  thinkingTagRegex.lastIndex = 0;

  while ((match = thinkingTagRegex.exec(message)) !== null) {
    const startIndex = match.index + match[0].length;

    // Find the closing tag after this opening tag
    closingTagRegex.lastIndex = startIndex;
    const closingMatch: RegExpExecArray | null = closingTagRegex.exec(message);

    if (closingMatch) {
      // Complete thinking block
      const content = message.substring(startIndex, closingMatch.index).trim();
      if (content) {
        completeSteps.push({
          content,
          timestamp: new Date(),
        });
      }
    } else {
      // Incomplete thinking block - this is the last one
      const content = message.substring(startIndex).trim();
      if (content) {
        incompleteStep = {
          content,
          timestamp: new Date(),
        };
      }
      // Stop here since we found an incomplete block
      break;
    }
  }

  return { complete: completeSteps, incomplete: incompleteStep };
};

// Estimate token count for RAG context injected into the prompt
// This mirrors the format built by the backend in AgentService.TryRetrieveContextAsync
const estimateContextTokens = (notes: RetrievedNoteContext[]): number => {
  if (notes.length === 0) return 0;

  // Reconstruct the context format matching backend
  let contextText = '---RELEVANT NOTES CONTEXT (use for answering)---\n';
  for (const note of notes) {
    const tagsStr = note.tags !== undefined && note.tags !== null && note.tags.length > 0 ? ` [Tags: ${note.tags.join(', ')}]` : '';
    contextText += `[Note: "${note.title}"] (relevance: ${note.similarityScore.toFixed(2)})${tagsStr}\n`;
    contextText += `Preview: ${note.preview}\n\n`;
  }
  contextText += '---END CONTEXT---\n';
  contextText += 'Use GetNote tool with the note ID if you need the full content of any note above.';

  return estimateTokenCount(contextText);
};

export function useAgentStream() {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingError, setStreamingError] = useState<Error | null>(null);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [retrievedNotes, setRetrievedNotes] = useState<RetrievedNoteContext[]>([]);
  const [ragLogId, setRagLogId] = useState<string | undefined>(undefined);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [inputTokens, setInputTokens] = useState<number | undefined>(undefined);
  const [outputTokens, setOutputTokens] = useState<number | undefined>(undefined);
  const [streamDuration, setStreamDuration] = useState<number | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamStartTimeRef = useRef<number | null>(null);
  const completeThinkingBlocksRef = useRef<Set<string>>(new Set());

  const sendAgentMessage = useCallback(
    async (conversationId: string, request: AgentMessageRequest) => {
      // Reset state
      setIsStreaming(true);
      setStreamingMessage('');
      setStreamingError(null);
      setToolExecutions([]);
      setThinkingSteps([]);
      setRetrievedNotes([]);
      setRagLogId(undefined);
      setProcessingStatus(null);
      completeThinkingBlocksRef.current.clear();

      // Calculate input tokens for the user's message
      const estimatedInputTokens = estimateTokenCount(request.content);
      setInputTokens(estimatedInputTokens);
      setOutputTokens(undefined);
      setStreamDuration(undefined);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const apiUrl = getApiBaseUrl();
      const url = `${apiUrl}${API_ENDPOINTS.AGENT.STREAM(conversationId)}`;

      // Get auth token from store
      const authStore = useAuthStore.getState();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authStore.token !== null && authStore.token !== undefined && authStore.token.length > 0) {
        headers['Authorization'] = `Bearer ${authStore.token}`;
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: request.content,
            temperature: request.temperature,
            maxTokens: request.maxTokens,
            capabilities: request.capabilities,
          }),
          signal: abortControllerRef.current.signal,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (separated by \n\n)
          const messages = buffer.split('\n\n');
          buffer = messages.pop() ?? '';

          for (const message of messages) {
            if (!message.trim()) continue;

            const lines = message.split('\n');
            let eventType = 'message';
            let data = '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                eventType = line.substring(7).trim();
              } else if (line.startsWith('data: ')) {
                data = line.substring(6);
              }
            }

            // Handle different event types
            switch (eventType) {
              case 'message':
              case 'data':
                if (data) {
                  const unescapedData = data.replace(/\\n/g, '\n');
                  setStreamingMessage((prev) => {
                    const newMessage = prev + unescapedData;
                    setOutputTokens(estimateTokenCount(newMessage));

                    // Parse thinking blocks from the updated message
                    const { complete, incomplete } = parseThinkingBlocks(newMessage);

                    setThinkingSteps((prevSteps) => {
                      const mergedSteps: ThinkingStep[] = [];
                      const stepMap = new Map<string, ThinkingStep>();

                      // Build a map of existing steps by their content prefix (for matching)
                      prevSteps.forEach((step) => {
                        const key = step.content.substring(0, 100);
                        stepMap.set(key, step);
                      });

                      // Process complete blocks
                      complete.forEach((completeStep) => {
                        const stepKey = completeStep.content.substring(0, 100);
                        completeThinkingBlocksRef.current.add(stepKey);

                        // Use existing timestamp if available, otherwise use new one
                        const existingStep = stepMap.get(stepKey);
                        mergedSteps.push({
                          ...completeStep,
                          timestamp: existingStep?.timestamp ?? completeStep.timestamp,
                        });
                        stepMap.delete(stepKey); // Remove from map so we don't add it again
                      });

                      // Process incomplete block if present
                      if (incomplete) {
                        const incompleteKey = incomplete.content.substring(0, 100);
                        const existingStep = stepMap.get(incompleteKey);

                        // Check if there's a matching incomplete step
                        if (existingStep && !completeThinkingBlocksRef.current.has(incompleteKey)) {
                          // Update existing incomplete step, keep original timestamp
                          mergedSteps.push({
                            ...incomplete,
                            timestamp: existingStep.timestamp,
                          });
                          stepMap.delete(incompleteKey);
                        } else {
                          // New incomplete step
                          mergedSteps.push(incomplete);
                        }
                      }

                      return mergedSteps;
                    });

                    return newMessage;
                  });
                }
                break;

              case 'start':
                streamStartTimeRef.current = Date.now();
                break;

              case 'tool_start':
                if (data) {
                  try {
                    const parsed = JSON.parse(data) as unknown;
                    if (isToolStartData(parsed)) {
                      setToolExecutions((prev) => [
                        ...prev,
                        {
                          tool: parsed.tool,
                          arguments: parsed.arguments,
                          result: '',
                          status: 'executing',
                          timestamp: new Date(),
                        },
                      ]);
                    }
                  } catch (e) {
                    console.error('Failed to parse tool_start data:', e);
                  }
                }
                break;

              case 'tool_end':
                if (data) {
                  try {
                    const parsed = JSON.parse(data) as unknown;
                    if (isToolEndData(parsed)) {
                      setToolExecutions((prev) =>
                        prev.map((t) =>
                          t.tool === parsed.tool && t.status === 'executing'
                            ? { ...t, result: parsed.result, status: 'completed' }
                            : t
                        )
                      );
                    }
                  } catch (e) {
                    console.error('Failed to parse tool_end data:', e);
                  }
                }
                break;

              case 'thinking':
                if (data) {
                  try {
                    const parsed = JSON.parse(data) as unknown;
                    if (isThinkingData(parsed)) {
                      const stepKey = parsed.content.substring(0, 50);

                      // Mark as complete
                      completeThinkingBlocksRef.current.add(stepKey);

                      setThinkingSteps((prev) => {
                        // Check if we already have this step (from streaming message parsing)
                        const existingIndex = prev.findIndex(
                          (step) => step.content.substring(0, 50) === stepKey
                        );

                        if (existingIndex >= 0) {
                          // Update existing step with complete content
                          const updated = [...prev];
                          updated[existingIndex] = {
                            content: parsed.content,
                            timestamp: prev[existingIndex].timestamp, // Keep original timestamp
                          };
                          return updated;
                        } else {
                          // Add new step
                          return [
                            ...prev,
                            {
                              content: parsed.content,
                              timestamp: new Date(),
                            },
                          ];
                        }
                      });
                    }
                  } catch (e) {
                    console.error('Failed to parse thinking data:', e);
                  }
                }
                break;

              case 'status':
                if (data) {
                  try {
                    const parsed = JSON.parse(data) as unknown;
                    if (isStatusData(parsed)) {
                      setProcessingStatus(parsed.status);
                    }
                  } catch (e) {
                    console.error('Failed to parse status data:', e);
                  }
                }
                break;

              case 'context_retrieval':
                if (data) {
                  try {
                    const parsed = JSON.parse(data) as unknown;
                    if (isContextRetrievalData(parsed)) {
                      if (parsed.retrievedNotes !== undefined && Array.isArray(parsed.retrievedNotes)) {
                        setRetrievedNotes(parsed.retrievedNotes);
                        // Update input tokens to include RAG context
                        const contextTokens = estimateContextTokens(parsed.retrievedNotes);
                        setInputTokens((prev) => (prev ?? 0) + contextTokens);
                      }
                      // Capture ragLogId for feedback submission
                      if (parsed.ragLogId !== undefined && parsed.ragLogId !== null) {
                        setRagLogId(parsed.ragLogId);
                      }
                    }
                  } catch (e) {
                    console.error('Failed to parse context_retrieval data:', e);
                  }
                }
                break;

              case 'end':
                if (data) {
                  try {
                    const parsed = JSON.parse(data) as unknown;
                    if (isEndData(parsed)) {
                      // Capture ragLogId from end event (ensures we have it even if context_retrieval was missed)
                      if (parsed.ragLogId !== undefined && parsed.ragLogId !== null) {
                        setRagLogId(parsed.ragLogId);
                      }
                    }
                  } catch (e) {
                    console.error('Failed to parse end data:', e);
                  }
                }

                if (streamStartTimeRef.current !== null && streamStartTimeRef.current !== undefined) {
                  const duration = Date.now() - streamStartTimeRef.current;
                  setStreamDuration(duration);
                  streamStartTimeRef.current = null;
                }

                setIsStreaming(false);
                setProcessingStatus(null);

                setTimeout(() => {
                  void queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
                  void queryClient.invalidateQueries({ queryKey: ['conversations'] });
                  // Also invalidate notes since agent may have created/updated them
                  void queryClient.invalidateQueries({ queryKey: ['notes'] });
                }, 150);
                break;

              case 'error':
                if (data) {
                  try {
                    const parsed = JSON.parse(data) as unknown;
                    if (isErrorData(parsed)) {
                      const errorMessage = typeof parsed.error === 'string' ? parsed.error : 'Unknown error';
                      throw new Error(errorMessage);
                    } else {
                      throw new Error(data);
                    }
                  } catch (e) {
                    if (e instanceof SyntaxError) {
                      throw new Error(data);
                    }
                    if (e instanceof Error) {
                      throw e;
                    }
                    throw new Error('Unknown error occurred');
                  }
                }
                break;
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            // Stream was cancelled by user - no action needed
          } else {
            console.error('Agent streaming failed:', error);
            setStreamingError(error);
          }
        } else {
          setStreamingError(new Error('Unknown error occurred during agent streaming'));
        }
        setIsStreaming(false);
        setProcessingStatus(null);
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
    // Don't clear toolExecutions here - keep them visible until next message
    // They will be cleared when sendAgentMessage is called
    // Don't clear token counts here - keep them visible until next message
    // The persisted message doesn't include token counts, so we need to keep them
    // in the stream state to display them after streaming completes
    // setInputTokens(undefined);
    // setOutputTokens(undefined);
    setStreamDuration(undefined);
    setProcessingStatus(null);
    setIsStreaming(false);
    streamStartTimeRef.current = null;
    completeThinkingBlocksRef.current.clear();
  }, []);

  return {
    // State
    isStreaming,
    streamingMessage,
    streamingError,
    toolExecutions,
    thinkingSteps,
    retrievedNotes,
    ragLogId,
    processingStatus,
    inputTokens,
    outputTokens,
    streamDuration,

    // Actions
    sendAgentMessage,
    cancelStream,
    resetStream,
  };
}
