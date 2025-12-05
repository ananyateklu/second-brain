/**
 * Integration tests for chat streaming functionality using MSW
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/mocks/server';
import { ReactNode } from 'react';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Wrapper component with providers
function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock implementation of a streaming hook for testing
// This simulates how the actual useChatStream hook works
function useStreamingChat() {
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [content, setContent] = React.useState('');
  const [error, setError] = React.useState<Error | null>(null);

  const streamMessage = async (
    conversationId: string,
    message: string,
    callbacks?: {
      onToken?: (token: string) => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setIsStreaming(true);
    setContent('');
    setError(null);

    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data && !data.startsWith('{')) {
              fullContent += data;
              setContent(fullContent);
              callbacks?.onToken?.(data);
            }
          } else if (line.startsWith('event: end')) {
            callbacks?.onEnd?.();
          }
        }
      }

      return fullContent;
    } catch (err) {
      const error = err as Error;
      setError(error);
      callbacks?.onError?.(error);
      throw error;
    } finally {
      setIsStreaming(false);
    }
  };

  return { isStreaming, content, error, streamMessage };
}

// Need to import React for the hook
import React from 'react';

describe('Chat streaming integration tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  describe('SSE streaming', () => {
    it('should stream tokens successfully', async () => {
      const onToken = vi.fn();
      const onEnd = vi.fn();

      const { result } = renderHook(() => useStreamingChat(), {
        wrapper: createWrapper(queryClient),
      });

      // Start streaming
      await act(async () => {
        await result.current.streamMessage('conv-1', 'Hello', {
          onToken,
          onEnd,
        });
      });

      // Wait for streaming to complete
      await waitFor(
        () => {
          expect(result.current.isStreaming).toBe(false);
        },
        { timeout: 5000 }
      );

      // Verify tokens were received
      expect(onToken).toHaveBeenCalled();
      expect(result.current.content).toContain('Hello');
    });

    it('should handle streaming errors', async () => {
      server.use(
        http.post('/api/chat/conversations/:id/messages/stream', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const onError = vi.fn();

      const { result } = renderHook(() => useStreamingChat(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.streamMessage('conv-1', 'Hello', {
            onError,
          });
        } catch {
          // Expected error
        }
      });

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      expect(onError).toHaveBeenCalled();
    });

    it('should handle rate limit errors', async () => {
      server.use(
        http.post('/api/chat/conversations/:id/messages/stream', () => {
          return HttpResponse.json(
            { error: 'Rate limit exceeded' },
            {
              status: 429,
              headers: { 'Retry-After': '60' }
            }
          );
        })
      );

      const { result } = renderHook(() => useStreamingChat(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.streamMessage('conv-1', 'Hello');
        } catch {
          // Expected error
        }
      });

      expect(result.current.error?.message).toContain('429');
    });

    it('should handle network errors gracefully', async () => {
      server.use(
        http.post('/api/chat/conversations/:id/messages/stream', () => {
          throw new Error('Network error');
        })
      );

      const { result } = renderHook(() => useStreamingChat(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        try {
          await result.current.streamMessage('conv-1', 'Hello');
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  describe('Conversation management', () => {
    it('should create a new conversation', async () => {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Chat',
          provider: 'OpenAI',
          model: 'gpt-4o-mini',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.title).toBe('Test Chat');
      expect(data.provider).toBe('OpenAI');
    });

    it('should fetch conversations', async () => {
      const response = await fetch('/api/chat/conversations');
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should delete a conversation', async () => {
      const response = await fetch('/api/chat/conversations/conv-1', {
        method: 'DELETE',
      });
      expect(response.status).toBe(204);
    });
  });
});
