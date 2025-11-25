import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/auth-store';
import { ToolExecution, ThinkingStep, AgentMessageRequest } from '../types/agent-types';
import { estimateTokenCount } from '../../../utils/token-utils';

// Parse thinking blocks from streaming message
// Returns array of thinking steps, including incomplete ones (without closing tag)
// Returns both complete and incomplete blocks
const parseThinkingBlocks = (message: string): { complete: ThinkingStep[]; incomplete: ThinkingStep | null } => {
  const completeSteps: ThinkingStep[] = [];
  let incompleteStep: ThinkingStep | null = null;
  
  const thinkingTagRegex = /<thinking>/gi;
  const closingTagRegex = /<\/thinking>/gi;

  let match;
  
  // Reset regex lastIndex
  thinkingTagRegex.lastIndex = 0;
  
  while ((match = thinkingTagRegex.exec(message)) !== null) {
    const startIndex = match.index + match[0].length;
    
    // Find the closing tag after this opening tag
    closingTagRegex.lastIndex = startIndex;
    const closingMatch = closingTagRegex.exec(message);
    
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

export function useAgentStream() {
  const queryClient = useQueryClient();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [streamingError, setStreamingError] = useState<Error | null>(null);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
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
      completeThinkingBlocksRef.current.clear();

      // Calculate input tokens for the user's message
      const estimatedInputTokens = estimateTokenCount(request.content);
      setInputTokens(estimatedInputTokens);
      setOutputTokens(undefined);
      setStreamDuration(undefined);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const url = `${apiUrl}/agent/conversations/${conversationId}/messages/stream`;

      // Get auth token from store
      const authStore = useAuthStore.getState();

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authStore.token) {
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
          buffer = messages.pop() || '';

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
                          timestamp: existingStep?.timestamp || completeStep.timestamp,
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
                    const toolData = JSON.parse(data);
                    setToolExecutions((prev) => [
                      ...prev,
                      {
                        tool: toolData.tool,
                        arguments: toolData.arguments,
                        result: '',
                        status: 'executing',
                        timestamp: new Date(),
                      },
                    ]);
                  } catch (e) {
                    console.error('Failed to parse tool_start data:', e);
                  }
                }
                break;

              case 'tool_end':
                if (data) {
                  try {
                    const toolData = JSON.parse(data);
                    setToolExecutions((prev) =>
                      prev.map((t) =>
                        t.tool === toolData.tool && t.status === 'executing'
                          ? { ...t, result: toolData.result, status: 'completed' }
                          : t
                      )
                    );
                  } catch (e) {
                    console.error('Failed to parse tool_end data:', e);
                  }
                }
                break;

              case 'thinking':
                if (data) {
                  try {
                    const thinkingData = JSON.parse(data);
                    const stepKey = thinkingData.content.substring(0, 50);
                    
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
                          content: thinkingData.content,
                          timestamp: prev[existingIndex].timestamp, // Keep original timestamp
                        };
                        return updated;
                      } else {
                        // Add new step
                        return [
                          ...prev,
                          {
                            content: thinkingData.content,
                            timestamp: new Date(),
                          },
                        ];
                      }
                    });
                  } catch (e) {
                    console.error('Failed to parse thinking data:', e);
                  }
                }
                break;

              case 'end':
                if (streamStartTimeRef.current) {
                  const duration = Date.now() - streamStartTimeRef.current;
                  setStreamDuration(duration);
                  streamStartTimeRef.current = null;
                }

                setIsStreaming(false);

                setTimeout(() => {
                  queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
                  queryClient.invalidateQueries({ queryKey: ['conversations'] });
                  // Also invalidate notes since agent may have created/updated them
                  queryClient.invalidateQueries({ queryKey: ['notes'] });
                }, 150);
                break;

              case 'error':
                if (data) {
                  try {
                    const errorData = JSON.parse(data);
                    throw new Error(errorData.error || 'Unknown error');
                  } catch (e) {
                    if (e instanceof SyntaxError) {
                      throw new Error(data);
                    }
                    throw e;
                  }
                }
                break;
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('Agent stream aborted by user');
          } else {
            console.error('Agent streaming failed:', error);
            setStreamingError(error);
          }
        } else {
          setStreamingError(new Error('Unknown error occurred during agent streaming'));
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
    // Don't clear toolExecutions here - keep them visible until next message
    // They will be cleared when sendAgentMessage is called
    // Don't clear token counts here - keep them visible until next message
    // The persisted message doesn't include token counts, so we need to keep them
    // in the stream state to display them after streaming completes
    // setInputTokens(undefined);
    // setOutputTokens(undefined);
    setStreamDuration(undefined);
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
    inputTokens,
    outputTokens,
    streamDuration,

    // Actions
    sendAgentMessage,
    cancelStream,
    resetStream,
  };
}
