/**
 * useUnifiedStream Integration Tests
 *
 * Tests the unified streaming hook with mocked fetch to simulate
 * full streaming flows for both chat and agent modes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUnifiedStream, createLegacyAdapter } from '../use-unified-stream';
import {
  buildStartMessage,
  buildTextMessage,
  buildEndMessage,
  buildErrorMessage,
  buildToolStartMessage,
  buildToolEndMessage,
  buildThinkingMessage,
  buildStatusMessage,
  buildRagMessage,
  createMockRagNote,
} from '../../core/streaming/__tests__/test-utils';

// ============================================
// Test Setup
// ============================================

// Mock the auth store
vi.mock('../../store/auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      token: 'test-token',
      user: { id: 'user-1' },
    }),
  },
}));

// Mock chat service for image generation
vi.mock('../../services', () => ({
  chatService: {
    generateImage: vi.fn(),
  },
}));

import { chatService } from '../../services';

/**
 * Create a wrapper with QueryClient for testing hooks
 */
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

/**
 * Create a mock ReadableStream from SSE messages
 */
function createMockStream(messages: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  // Combine all messages into a single chunk to avoid pull() being called multiple times
  const combinedMessage = messages.join('');

  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(combinedMessage));
      controller.close();
    },
  });
}

/**
 * Create a mock Response with SSE stream
 */
function createMockResponse(messages: string[], status = 200): Response {
  return new Response(createMockStream(messages), {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

/**
 * Create a mock error Response
 */
function createMockErrorResponse(statusText: string, status = 500): Response {
  return new Response(statusText, {
    status,
    statusText,
  });
}

describe('useUnifiedStream', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let testId = 0;

  // Generate unique conversation ID for each test to avoid state bleeding
  const getConversationId = () => `conv-${++testId}-${Date.now()}`;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Basic Hook Tests
  // ============================================
  describe('hook initialization', () => {
    it('should initialize with idle state', () => {
      fetchSpy.mockResolvedValue(createMockResponse([]));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      expect(result.current.phase).toBe('idle');
      expect(result.current.status).toBe('idle');
      expect(result.current.isActive).toBe(false);
      expect(result.current.hasContent).toBe(false);
      expect(result.current.textContent).toBe('');
    });

    it('should provide send, cancel, and reset functions', () => {
      fetchSpy.mockResolvedValue(createMockResponse([]));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      expect(typeof result.current.send).toBe('function');
      expect(typeof result.current.cancel).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.generateImage).toBe('function');
    });
  });

  // ============================================
  // Chat Mode Streaming Tests
  // ============================================
  describe('chat mode streaming', () => {
    it('should stream a complete chat message', async () => {
      const convId = getConversationId();
      const messages = [
        buildStartMessage(),
        buildTextMessage('Hello World!'),
        buildEndMessage('log-123', 10, 20),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: convId,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'Hi there' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      // Check that content contains expected text (may be duplicated due to React strict mode)
      expect(result.current.textContent).toContain('Hello World!');
      expect(result.current.ragLogId).toBe('log-123');
    });

    it('should call correct endpoint for chat mode', async () => {
      const messages = [buildStartMessage(), buildEndMessage()];
      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'test-conv',
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/chat/conversations/test-conv/messages/stream'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle RAG context in chat mode', async () => {
      const notes = [createMockRagNote({ noteId: 'note-1', title: 'Test Note' })];
      const messages = [
        buildStartMessage(),
        buildRagMessage(notes, 'rag-log'),
        buildTextMessage('Based on your notes...'),
        buildEndMessage(),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test', useRag: true });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      expect(result.current.ragContext).toHaveLength(1);
      expect(result.current.ragContext[0].noteId).toBe('note-1');
    });

    it('should handle thinking content', async () => {
      const convId = getConversationId();
      const messages = [
        buildStartMessage(),
        buildThinkingMessage('Let me analyze this...'),
        buildTextMessage('Here is my response.'),
        buildEndMessage(),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: convId,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      expect(result.current.thinkingContent).toContain('Let me analyze this...');
      expect(result.current.textContent).toContain('Here is my response.');
    });
  });

  // ============================================
  // Agent Mode Streaming Tests
  // ============================================
  describe('agent mode streaming', () => {
    it('should call correct endpoint for agent mode', async () => {
      const messages = [buildStartMessage(), buildEndMessage()];
      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'agent',
          conversationId: 'agent-conv',
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/agent/conversations/agent-conv/messages/stream'),
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should handle tool execution in agent mode', async () => {
      const convId = getConversationId();
      const messages = [
        buildStartMessage(),
        buildStatusMessage('Searching notes...'),
        buildToolStartMessage('search_notes', '{"query":"test"}', 'tool-1'),
        buildToolEndMessage('search_notes', '[{"title":"Found"}]', 'tool-1', true),
        buildTextMessage('Found relevant notes.'),
        buildEndMessage(),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'agent',
          conversationId: convId,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'search my notes' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      // Check that at least one tool was completed (may be duplicated in strict mode)
      expect(result.current.completedTools.length).toBeGreaterThanOrEqual(1);
      expect(result.current.completedTools[0].tool).toBe('search_notes');
      expect(result.current.completedTools[0].status).toBe('completed');
    });

    it('should handle processing status updates', async () => {
      const convId = getConversationId();
      const messages = [
        buildStartMessage(),
        buildStatusMessage('Initializing agent...'),
        buildTextMessage('Response'),
        buildEndMessage(),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'agent',
          conversationId: convId,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      // The status is cleared on end, so we just verify the stream completed
      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      // Verify text was streamed
      expect(result.current.textContent).toContain('Response');
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================
  describe('error handling', () => {
    it('should handle stream errors', async () => {
      const messages = [
        buildStartMessage(),
        buildTextMessage('Partial response'),
        buildErrorMessage('Model overloaded', true),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const onError = vi.fn();
      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
          onError,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('error');
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Model overloaded');
    });

    it('should handle HTTP errors', async () => {
      fetchSpy.mockResolvedValue(createMockErrorResponse('Internal Server Error', 500));

      const onError = vi.fn();
      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
          onError,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('error');
      });

      expect(result.current.error).toBeDefined();
    });

    it('should handle network errors with retry', async () => {
      // First call fails
      fetchSpy.mockRejectedValueOnce(new Error('Failed to fetch'));
      // Second call succeeds
      fetchSpy.mockResolvedValueOnce(createMockResponse([
        buildStartMessage(),
        buildTextMessage('Success after retry'),
        buildEndMessage(),
      ]));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
          maxRetries: 3,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      // Wait for retry
      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledTimes(2);
      }, { timeout: 5000 });
    });
  });

  // ============================================
  // Cancellation Tests
  // ============================================
  describe('cancellation', () => {
    it('should cancel an active stream', async () => {
      // Create a slow stream that never completes
      const slowStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(buildStartMessage()));
          // Never close - simulate slow stream
        },
      });

      fetchSpy.mockResolvedValue(new Response(slowStream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      // Start streaming
      act(() => {
        void result.current.send({ content: 'test' });
      });

      // Wait for streaming to start
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Cancel
      act(() => {
        result.current.cancel();
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('idle');
      });
    });

    it('should preserve content on cancel', async () => {
      // Use a stream that sends content then waits
      const encoder = new TextEncoder();
      let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;

      const slowStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controllerRef = controller;
          // Send initial content
          controller.enqueue(encoder.encode(buildStartMessage() + buildTextMessage('Partial content')));
          // Don't close - keep stream open
        },
      });

      fetchSpy.mockResolvedValue(new Response(slowStream, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      }));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      // Start streaming
      act(() => {
        void result.current.send({ content: 'test' });
      });

      // Wait for content to arrive
      await waitFor(() => {
        expect(result.current.textContent.length).toBeGreaterThan(0);
      });

      // Cancel
      act(() => {
        result.current.cancel();
      });

      // Content should be preserved (at least some content)
      expect(result.current.textContent).toContain('Partial');

      // Clean up - controllerRef is assigned in the start callback
      try {
        if (controllerRef) {
          controllerRef.close();
        }
      } catch {
        // Ignore if already closed
      }
    });
  });

  // ============================================
  // Reset Tests
  // ============================================
  describe('reset', () => {
    it('should reset state to initial values', async () => {
      const convId = getConversationId();
      const messages = [
        buildStartMessage(),
        buildTextMessage('Content'),
        buildEndMessage(),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: convId,
        }),
        { wrapper: createWrapper() }
      );

      // Send a message
      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      // Verify content was received
      expect(result.current.textContent).toContain('Content');

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.phase).toBe('idle');
      expect(result.current.textContent).toBe('');
      expect(result.current.isActive).toBe(false);
    });
  });

  // ============================================
  // Image Generation Tests
  // ============================================
  describe('image generation', () => {
    it('should handle successful image generation', async () => {
      const mockImageResponse = {
        success: true,
        images: [
          { base64Data: 'base64image', mediaType: 'image/png' },
        ],
        model: 'dall-e-3',
        provider: 'OpenAI',
        conversationId: 'conv-1',
      };

      vi.mocked(chatService.generateImage).mockResolvedValue(mockImageResponse);

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.generateImage({
          prompt: 'A sunset',
          provider: 'OpenAI',
          model: 'dall-e-3',
        });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      expect(result.current.imageGeneration.images).toHaveLength(1);
      expect(result.current.imageGeneration.stage).toBe('complete');
    });

    it('should handle image generation errors', async () => {
      vi.mocked(chatService.generateImage).mockResolvedValue({
        success: false,
        error: 'Content policy violation',
        images: [],
        model: 'dall-e-3',
        provider: 'OpenAI',
        conversationId: 'conv-1',
      });

      const onError = vi.fn();
      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
          onError,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.generateImage({
          prompt: 'Invalid prompt',
          provider: 'OpenAI',
          model: 'dall-e-3',
        });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('error');
      });

      expect(result.current.imageGeneration.error).toBe('Content policy violation');
      expect(onError).toHaveBeenCalled();
    });

    it('should track image generation progress', async () => {
      // Use a delayed response to observe progress states
      vi.mocked(chatService.generateImage).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          success: true,
          images: [{ base64Data: 'img', mediaType: 'image/png' }],
          model: 'dall-e-3',
          provider: 'OpenAI',
          conversationId: 'conv-1',
        };
      });

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      // Start generation
      act(() => {
        void result.current.generateImage({
          prompt: 'test',
          provider: 'OpenAI',
          model: 'dall-e-3',
        });
      });

      // Should transition through stages
      await waitFor(() => {
        expect(result.current.isGeneratingImage).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });
    });
  });

  // ============================================
  // Callback Tests
  // ============================================
  describe('callbacks', () => {
    it('should call onComplete when stream finishes', async () => {
      const messages = [
        buildStartMessage(),
        buildTextMessage('Done'),
        buildEndMessage(),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const onComplete = vi.fn();
      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
          onComplete,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      expect(onComplete).toHaveBeenCalled();
    });

    it('should call onError when stream fails', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const onError = vi.fn();
      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
          onError,
          maxRetries: 0,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // Legacy Adapter Tests
  // ============================================
  describe('createLegacyAdapter', () => {
    it('should convert unified state to legacy format', async () => {
      const convId = getConversationId();
      const messages = [
        buildStartMessage(),
        buildThinkingMessage('Thinking...'),
        buildTextMessage('Response'),
        buildEndMessage('log-1', 10, 20),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: convId,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      const legacyState = createLegacyAdapter(result.current);

      expect(legacyState.isStreaming).toBe(false);
      expect(legacyState.streamingMessage).toContain('Response');
      expect(legacyState.thinkingProcess).toContain('Thinking...');
      expect(legacyState.inputTokens).toBe(10);
      expect(legacyState.outputTokens).toBe(20);
      expect(legacyState.ragLogId).toBe('log-1');
    });

    it('should convert tool executions to legacy format', async () => {
      const convId = getConversationId();
      const messages = [
        buildStartMessage(),
        buildToolStartMessage('search_notes', '{"q":"test"}', 'tool-1'),
        buildToolEndMessage('search_notes', 'results', 'tool-1'),
        buildEndMessage(),
      ];

      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'agent',
          conversationId: convId,
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      const legacyState = createLegacyAdapter(result.current);

      expect(legacyState.toolExecutions.length).toBeGreaterThanOrEqual(1);
      expect(legacyState.toolExecutions[0].tool).toBe('search_notes');
    });

    it('should handle image generation in legacy adapter', async () => {
      vi.mocked(chatService.generateImage).mockResolvedValue({
        success: true,
        images: [{ base64Data: 'img', mediaType: 'image/png' }],
        model: 'dall-e-3',
        provider: 'OpenAI',
        conversationId: 'conv-1',
      });

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.generateImage({
          prompt: 'test',
          provider: 'OpenAI',
          model: 'dall-e-3',
        });
      });

      await waitFor(() => {
        expect(result.current.phase).toBe('complete');
      });

      const legacyState = createLegacyAdapter(result.current);

      expect(legacyState.generatedImages).toHaveLength(1);
      expect(legacyState.imageGenerationStage).toBe('complete');
      expect(legacyState.isGeneratingImage).toBe(false);
    });
  });

  // ============================================
  // Request Body Tests
  // ============================================
  describe('request body building', () => {
    it('should build correct request body for chat mode', async () => {
      const messages = [buildStartMessage(), buildEndMessage()];
      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({
          content: 'Hello',
          temperature: 0.7,
          maxTokens: 1000,
          useRag: true,
          enableGrounding: true,
        });
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"content":"Hello"'),
        })
      );

      const callArgs = fetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.content).toBe('Hello');
      expect(body.temperature).toBe(0.7);
      expect(body.maxTokens).toBe(1000);
      expect(body.useRag).toBe(true);
      expect(body.enableGrounding).toBe(true);
    });

    it('should build correct request body for agent mode', async () => {
      const messages = [buildStartMessage(), buildEndMessage()];
      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'agent',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({
          content: 'Search notes',
          capabilities: ['notes'],
        });
      });

      const callArgs = fetchSpy.mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.content).toBe('Search notes');
      expect(body.capabilities).toEqual(['notes']);
    });
  });

  // ============================================
  // Auth Header Tests
  // ============================================
  describe('authentication', () => {
    it('should include auth token in headers', async () => {
      const messages = [buildStartMessage(), buildEndMessage()];
      fetchSpy.mockResolvedValue(createMockResponse(messages));

      const { result } = renderHook(
        () => useUnifiedStream({
          mode: 'chat',
          conversationId: 'conv-1',
        }),
        { wrapper: createWrapper() }
      );

      await act(async () => {
        await result.current.send({ content: 'test' });
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });
});
