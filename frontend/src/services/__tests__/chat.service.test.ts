/**
 * Chat Service Tests
 * Unit tests for chat service methods, streaming, and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatService } from '../chat.service';
import { apiClient } from '../../lib/api-client';
import { API_ENDPOINTS } from '../../lib/constants';
import type {
  ChatConversation,
  ChatMessage,
  ChatResponseWithRag,
  StreamingCallbacks,
  ImageGenerationResponse,
  ImageProviderInfo,
  ChatSession,
  SessionStats,
  SessionHistory,
  SendMessageRequest,
} from '../../types/chat';
import type { PaginatedResult } from '../../types/api';

// Mock the apiClient
vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the bound store for auth token
vi.mock('../../store/bound-store', () => ({
  useBoundStore: {
    getState: () => ({
      token: 'test-token',
    }),
  },
}));

// Mock the logger to suppress log output in tests
vi.mock('../../utils/logger', () => ({
  loggers: {
    stream: {
      error: vi.fn(),
    },
  },
}));

// Helper to create a mock ReadableStreamDefaultReader
function createMockReader(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
  const encoder = new TextEncoder();
  let chunkIndex = 0;
  return {
    read: vi.fn().mockImplementation(() => {
      if (chunkIndex < chunks.length) {
        const result = {
          done: false,
          value: encoder.encode(chunks[chunkIndex]),
        };
        chunkIndex++;
        return Promise.resolve(result);
      }
      return Promise.resolve({ done: true, value: undefined });
    }),
    releaseLock: vi.fn(),
    cancel: vi.fn().mockResolvedValue(undefined),
    closed: Promise.resolve(undefined),
  } as unknown as ReadableStreamDefaultReader<Uint8Array>;
}

// Helper to create mock conversation
const createMockConversation = (overrides: Partial<ChatConversation> = {}): ChatConversation => ({
  id: 'conv-123',
  title: 'Test Conversation',
  userId: 'user-123',
  provider: 'OpenAI',
  model: 'gpt-4',
  messages: [],
  ragEnabled: true,
  agentEnabled: false,
  imageGenerationEnabled: false,
  vectorStoreProvider: 'PostgreSQL',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
});

// Helper to create mock message
const createMockMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  role: 'assistant',
  content: 'Test response',
  timestamp: '2024-01-15T10:00:00Z',
  inputTokens: 100,
  outputTokens: 50,
  ...overrides,
});

describe('chatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Conversation CRUD Tests
  // ============================================
  describe('getConversations', () => {
    it('should call apiClient.get with correct URL and userId', async () => {
      const mockConversations = [createMockConversation()];
      vi.mocked(apiClient.get).mockResolvedValue(mockConversations);

      await chatService.getConversations('user-123');

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining(API_ENDPOINTS.CHAT.CONVERSATIONS)
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('userId=user-123')
      );
    });

    it('should use default userId when not provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValue([]);

      await chatService.getConversations();

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('userId=')
      );
    });

    it('should return array of conversations', async () => {
      const mockConversations = [
        createMockConversation({ id: 'conv-1' }),
        createMockConversation({ id: 'conv-2' }),
      ];
      vi.mocked(apiClient.get).mockResolvedValue(mockConversations);

      const result = await chatService.getConversations();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('conv-1');
    });
  });

  describe('getConversationsPaged', () => {
    it('should build query params correctly', async () => {
      const mockResult: PaginatedResult<ChatConversation> = {
        items: [createMockConversation()],
        totalCount: 1,
        page: 2,
        pageSize: 10,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResult);

      await chatService.getConversationsPaged({ page: 2, pageSize: 10 });

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=2')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=10')
      );
    });

    it('should use default page=1 and pageSize=20', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      await chatService.getConversationsPaged();

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('page=1')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('pageSize=20')
      );
    });

    it('should return PaginatedResult structure', async () => {
      const mockResult: PaginatedResult<ChatConversation> = {
        items: [createMockConversation()],
        totalCount: 50,
        page: 1,
        pageSize: 20,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockResult);

      const result = await chatService.getConversationsPaged();

      expect(result.totalCount).toBe(50);
      expect(result.hasNextPage).toBe(true);
      expect(result.items).toHaveLength(1);
    });
  });

  describe('getConversation', () => {
    it('should call apiClient.get with correct URL', async () => {
      const mockConversation = createMockConversation();
      vi.mocked(apiClient.get).mockResolvedValue(mockConversation);

      await chatService.getConversation('conv-123');

      expect(apiClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.CONVERSATION_BY_ID('conv-123')
      );
    });

    it('should return single conversation', async () => {
      const mockConversation = createMockConversation({ title: 'Specific Chat' });
      vi.mocked(apiClient.get).mockResolvedValue(mockConversation);

      const result = await chatService.getConversation('conv-123');

      expect(result.title).toBe('Specific Chat');
    });
  });

  describe('createConversation', () => {
    it('should POST to correct endpoint with request body', async () => {
      const request = {
        title: 'New Chat',
        provider: 'OpenAI',
        model: 'gpt-4',
        ragEnabled: true,
      };
      const mockConversation = createMockConversation(request);
      vi.mocked(apiClient.post).mockResolvedValue(mockConversation);

      await chatService.createConversation(request);

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.CONVERSATIONS,
        request
      );
    });

    it('should return created conversation', async () => {
      const mockConversation = createMockConversation({ id: 'new-conv-id' });
      vi.mocked(apiClient.post).mockResolvedValue(mockConversation);

      const result = await chatService.createConversation({ title: 'New', provider: 'OpenAI', model: 'gpt-4' });

      expect(result.id).toBe('new-conv-id');
    });
  });

  describe('updateConversationSettings', () => {
    it('should PATCH correct endpoint with settings', async () => {
      const settings = { ragEnabled: false, model: 'gpt-3.5-turbo' };
      const mockConversation = createMockConversation(settings);
      vi.mocked(apiClient.patch).mockResolvedValue(mockConversation);

      await chatService.updateConversationSettings('conv-123', settings);

      expect(apiClient.patch).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.CONVERSATION_SETTINGS('conv-123'),
        settings
      );
    });
  });

  describe('sendMessage', () => {
    it('should POST message to correct endpoint', async () => {
      const request = { content: 'Hello', ragEnabled: true };
      const mockResponse: ChatResponseWithRag = {
        conversation: createMockConversation(),
        retrievedNotes: [],
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await chatService.sendMessage('conv-123', request);

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.MESSAGES('conv-123'),
        request
      );
    });

    it('should return ChatResponseWithRag', async () => {
      const mockResponse: ChatResponseWithRag = {
        conversation: createMockConversation(),
        retrievedNotes: [{
          noteId: 'note-1',
          title: 'Note',
          relevanceScore: 0.9,
          tags: [],
          chunkContent: 'chunk',
          content: 'full content',
          chunkIndex: 0,
        }],
        ragLogId: 'log-123',
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await chatService.sendMessage('conv-123', { content: 'Test' });

      expect(result.conversation).toBeDefined();
      expect(result.retrievedNotes).toHaveLength(1);
    });
  });

  describe('deleteConversation', () => {
    it('should DELETE correct endpoint', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined);

      await chatService.deleteConversation('conv-123');

      expect(apiClient.delete).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.CONVERSATION_BY_ID('conv-123')
      );
    });
  });

  describe('bulkDeleteConversations', () => {
    it('should POST with conversation IDs', async () => {
      const mockResult = { deletedCount: 3, message: 'Deleted 3 conversations' };
      vi.mocked(apiClient.post).mockResolvedValue(mockResult);

      const result = await chatService.bulkDeleteConversations(['c1', 'c2', 'c3']);

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.BULK_DELETE,
        { conversationIds: ['c1', 'c2', 'c3'] }
      );
      expect(result.deletedCount).toBe(3);
    });
  });

  // ============================================
  // Stream Processing Tests
  // ============================================
  describe('processSSEStream', () => {
    let callbacks: StreamingCallbacks;

    beforeEach(() => {
      callbacks = {
        onToken: vi.fn(),
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn(),
        onRag: vi.fn(),
        onGroundingSources: vi.fn(),
        onCodeExecution: vi.fn(),
        onThinking: vi.fn(),
      };
    });

    it('should process SSE stream and call appropriate callbacks', async () => {
      const chunks = [
        'event: start\ndata: {}\n\n',
        'event: message\ndata: Hello\n\n',
        'event: end\ndata: {"inputTokens":10,"outputTokens":5}\n\n',
      ];
      const reader = createMockReader(chunks);

      await chatService.processSSEStream(reader, callbacks);

      expect(callbacks.onStart).toHaveBeenCalled();
      expect(callbacks.onToken).toHaveBeenCalledWith('Hello');
      expect(callbacks.onEnd).toHaveBeenCalledWith(expect.objectContaining({
        inputTokens: 10,
        outputTokens: 5,
      }));
    });

    it('should handle multiple events in single chunk', async () => {
      const chunks = [
        'event: rag\ndata: {"retrievedNotes":[{"noteId":"n1"}]}\n\nevent: message\ndata: Result\n\n',
      ];
      const reader = createMockReader(chunks);

      await chatService.processSSEStream(reader, callbacks);

      expect(callbacks.onRag).toHaveBeenCalledWith([{ noteId: 'n1' }]);
      expect(callbacks.onToken).toHaveBeenCalledWith('Result');
    });

    it('should skip empty messages', async () => {
      const chunks = [
        'event: start\ndata: {}\n\n',
        '\n\n',  // Empty message
        'event: message\ndata: Test\n\n',
      ];
      const reader = createMockReader(chunks);

      await chatService.processSSEStream(reader, callbacks);

      expect(callbacks.onStart).toHaveBeenCalledTimes(1);
      expect(callbacks.onToken).toHaveBeenCalledWith('Test');
    });

    it('should handle partial messages across chunks', async () => {
      const chunks = [
        'event: message\ndata: ',
        'Hello World\n\n',
      ];
      const reader = createMockReader(chunks);

      await chatService.processSSEStream(reader, callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Hello World');
    });
  });

  // ============================================
  // streamMessage Tests
  // ============================================
  describe('streamMessage', () => {
    let callbacks: StreamingCallbacks;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      callbacks = {
        onToken: vi.fn(),
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn(),
        onRag: vi.fn(),
      };
      mockFetch = vi.fn();
      vi.stubGlobal('fetch', mockFetch);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should throw error for non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const request: SendMessageRequest = {
        content: 'Test message',
      };

      await expect(
        chatService.streamMessage('conv-123', request, callbacks)
      ).rejects.toThrow('HTTP error! status: 500');

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should throw error if response body is not readable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const request: SendMessageRequest = {
        content: 'Test message',
      };

      await expect(
        chatService.streamMessage('conv-123', request, callbacks)
      ).rejects.toThrow('Response body is not readable');

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should handle AbortError silently', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const request: SendMessageRequest = {
        content: 'Test message',
      };

      // AbortError should return early without throwing
      await expect(
        chatService.streamMessage('conv-123', request, callbacks)
      ).resolves.toBeUndefined();

      // onError should not be called for abort
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should call onError for non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      const request: SendMessageRequest = {
        content: 'Test message',
      };

      await expect(
        chatService.streamMessage('conv-123', request, callbacks)
      ).rejects.toBe('string error');

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Unknown error occurred during streaming' })
      );
    });

    it('should process successful stream', async () => {
      const mockReader = createMockReader([
        'event: start\ndata: {}\n\n',
        'event: message\ndata: Hello\n\n',
        'event: end\ndata: {}\n\n',
      ]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      });

      const request: SendMessageRequest = {
        content: 'Test message',
        useRag: true,
      };

      await chatService.streamMessage('conv-123', request, callbacks);

      expect(callbacks.onStart).toHaveBeenCalled();
      expect(callbacks.onToken).toHaveBeenCalledWith('Hello');
      expect(callbacks.onEnd).toHaveBeenCalled();
    });
  });

  // ============================================
  // SSE Event Handling Tests
  // ============================================
  describe('handleSSEEvent', () => {
    let callbacks: StreamingCallbacks;

    beforeEach(() => {
      callbacks = {
        onToken: vi.fn(),
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn(),
        onRag: vi.fn(),
        onGroundingSources: vi.fn(),
        onCodeExecution: vi.fn(),
        onThinking: vi.fn(),
      };
    });

    it('should handle "message" event - call onToken', () => {
      chatService.handleSSEEvent('message', 'Hello world', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Hello world');
    });

    it('should handle "data" event - call onToken', () => {
      chatService.handleSSEEvent('data', 'Some data', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Some data');
    });

    it('should unescape newlines in data', () => {
      chatService.handleSSEEvent('message', 'Line1\\nLine2', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Line1\nLine2');
    });

    it('should handle "start" event - call onStart', () => {
      chatService.handleSSEEvent('start', '', callbacks);

      expect(callbacks.onStart).toHaveBeenCalled();
    });

    it('should handle "rag" event - parse and call onRag', () => {
      const ragData = JSON.stringify({
        retrievedNotes: [{ noteId: 'n1', title: 'Note 1', relevanceScore: 0.85 }],
      });

      chatService.handleSSEEvent('rag', ragData, callbacks);

      expect(callbacks.onRag).toHaveBeenCalledWith([
        { noteId: 'n1', title: 'Note 1', relevanceScore: 0.85 },
      ]);
    });

    it('should handle "grounding" event - parse and call onGroundingSources', () => {
      const groundingData = JSON.stringify({
        sources: [{ title: 'Source', url: 'https://example.com' }],
      });

      chatService.handleSSEEvent('grounding', groundingData, callbacks);

      expect(callbacks.onGroundingSources).toHaveBeenCalledWith([
        { title: 'Source', url: 'https://example.com' },
      ]);
    });

    it('should handle "code_execution" event - parse and call onCodeExecution', () => {
      const codeData = JSON.stringify({
        code: 'print("hello")',
        language: 'python',
        output: 'hello',
        success: true,
      });

      chatService.handleSSEEvent('code_execution', codeData, callbacks);

      expect(callbacks.onCodeExecution).toHaveBeenCalledWith({
        code: 'print("hello")',
        language: 'python',
        output: 'hello',
        success: true,
        errorMessage: undefined,
      });
    });

    it('should handle "thinking" event with JSON - parse content', () => {
      const thinkingData = JSON.stringify({ content: 'Analyzing the problem...' });

      chatService.handleSSEEvent('thinking', thinkingData, callbacks);

      expect(callbacks.onThinking).toHaveBeenCalledWith('Analyzing the problem...');
    });

    it('should handle "thinking" event with raw string', () => {
      chatService.handleSSEEvent('thinking', 'Raw thinking text\\nwith newline', callbacks);

      expect(callbacks.onThinking).toHaveBeenCalledWith('Raw thinking text\nwith newline');
    });

    it('should handle "end" event - parse and call onEnd', () => {
      const endData = JSON.stringify({ inputTokens: 100, outputTokens: 200 });

      chatService.handleSSEEvent('end', endData, callbacks);

      expect(callbacks.onEnd).toHaveBeenCalledWith({ inputTokens: 100, outputTokens: 200 });
    });

    it('should handle "end" event with empty data', () => {
      chatService.handleSSEEvent('end', '', callbacks);

      expect(callbacks.onEnd).toHaveBeenCalledWith({});
    });

    it('should handle "end" event with invalid JSON data', () => {
      chatService.handleSSEEvent('end', 'not valid json', callbacks);

      expect(callbacks.onEnd).toHaveBeenCalledWith({});
    });

    it('should handle malformed JSON gracefully in grounding event', () => {
      chatService.handleSSEEvent('grounding', 'not valid json', callbacks);

      expect(callbacks.onGroundingSources).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully in code_execution event', () => {
      chatService.handleSSEEvent('code_execution', 'not valid json', callbacks);

      expect(callbacks.onCodeExecution).not.toHaveBeenCalled();
    });

    it('should handle default event type with no data', () => {
      chatService.handleSSEEvent('unknown_event', '', callbacks);

      expect(callbacks.onToken).not.toHaveBeenCalled();
    });

    it('should not handle unknown event with message type mismatch', () => {
      // Default case only processes data when eventType is 'message'
      chatService.handleSSEEvent('custom_event', 'some data', callbacks);

      // Should not call onToken since eventType is not 'message'
      expect(callbacks.onToken).not.toHaveBeenCalled();
    });

    it('should handle "error" event - create Error and call onError', () => {
      const errorData = JSON.stringify({ error: 'Something went wrong' });

      chatService.handleSSEEvent('error', errorData, callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Something went wrong' })
      );
    });

    it('should handle "error" event with plain text', () => {
      chatService.handleSSEEvent('error', 'Plain error message', callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Plain error message' })
      );
    });

    it('should handle malformed JSON gracefully in rag event', () => {
      chatService.handleSSEEvent('rag', 'not valid json', callbacks);

      expect(callbacks.onRag).not.toHaveBeenCalled();
    });

    it('should handle unknown events as tokens if data present', () => {
      chatService.handleSSEEvent('message', 'Some content', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Some content');
    });
  });

  // ============================================
  // Image Generation Tests
  // ============================================
  describe('generateImage', () => {
    it('should POST to correct endpoint', async () => {
      const request = { prompt: 'A sunset over mountains', provider: 'OpenAI', model: 'dall-e-3' };
      const mockResponse: ImageGenerationResponse = {
        success: true,
        images: [{ url: 'https://example.com/image.png', revisedPrompt: 'A beautiful sunset...', mediaType: 'image/png' }],
        model: 'dall-e-3',
        provider: 'OpenAI',
        conversationId: 'conv-123',
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await chatService.generateImage('conv-123', request);

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.GENERATE_IMAGE('conv-123'),
        request
      );
    });

    it('should return ImageGenerationResponse', async () => {
      const mockResponse: ImageGenerationResponse = {
        success: true,
        images: [{ url: 'https://example.com/image.png', mediaType: 'image/png' }],
        model: 'dall-e-3',
        provider: 'OpenAI',
        conversationId: 'conv-123',
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await chatService.generateImage('conv-123', { prompt: 'test', provider: 'OpenAI', model: 'dall-e-3' });

      expect(result.success).toBe(true);
      expect(result.images).toHaveLength(1);
    });
  });

  describe('getImageGenerationProviders', () => {
    it('should GET from correct endpoint', async () => {
      const mockProviders: ImageProviderInfo[] = [
        { provider: 'OpenAI', models: ['dall-e-2', 'dall-e-3'], isEnabled: true },
        { provider: 'Gemini', models: ['imagen'], isEnabled: true },
      ];
      vi.mocked(apiClient.get).mockResolvedValue(mockProviders);

      const result = await chatService.getImageGenerationProviders();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.CHAT.IMAGE_PROVIDERS);
      expect(result).toHaveLength(2);
    });
  });

  describe('getImageGenerationSizes', () => {
    it('should GET sizes for provider and model', async () => {
      const mockSizes = ['1024x1024', '1792x1024', '1024x1792'];
      vi.mocked(apiClient.get).mockResolvedValue(mockSizes);

      const result = await chatService.getImageGenerationSizes('OpenAI', 'dall-e-3');

      expect(apiClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.IMAGE_SIZES('OpenAI', 'dall-e-3')
      );
      expect(result).toEqual(mockSizes);
    });
  });

  // ============================================
  // Session Tracking Tests
  // ============================================
  describe('startSession', () => {
    it('should POST with conversationId', async () => {
      const mockSession: ChatSession = {
        id: 'session-123',
        userId: 'user-123',
        conversationId: 'conv-123',
        startedAt: '2024-01-15T10:00:00Z',
        endedAt: null,
        isActive: true,
        durationMinutes: 0,
        messagesSent: 0,
        messagesReceived: 0,
        tokensUsed: 0,
        deviceInfo: null,
        createdAt: '2024-01-15T10:00:00Z',
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockSession);

      await chatService.startSession('conv-123');

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.SESSIONS.START,
        expect.objectContaining({ conversationId: 'conv-123' })
      );
    });

    it('should include optional deviceInfo and userAgent', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ id: 'session-123' } as ChatSession);

      await chatService.startSession('conv-123', '{"os":"macOS"}', 'Mozilla/5.0');

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.SESSIONS.START,
        {
          conversationId: 'conv-123',
          deviceInfo: '{"os":"macOS"}',
          userAgent: 'Mozilla/5.0',
        }
      );
    });
  });

  describe('endSession', () => {
    it('should POST to correct endpoint with sessionId', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await chatService.endSession('session-123');

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.SESSIONS.END('session-123'),
        {}
      );
    });

    it('should include optional end data', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(undefined);

      await chatService.endSession('session-123', { messagesSent: 10, messagesReceived: 8, tokensUsed: 500 });

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.SESSIONS.END('session-123'),
        { messagesSent: 10, messagesReceived: 8, tokensUsed: 500 }
      );
    });
  });

  describe('getSessionStats', () => {
    it('should GET session stats', async () => {
      const mockStats: SessionStats = {
        totalSessions: 25,
        totalMessagesSent: 100,
        totalMessagesReceived: 95,
        totalTokensUsed: 50000,
        avgSessionDurationMinutes: 15,
        uniqueConversations: 10,
        firstSessionAt: '2024-01-01T10:00:00Z',
        lastSessionAt: '2024-01-15T10:00:00Z',
        activeSessions: 2,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockStats);

      const result = await chatService.getSessionStats();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.CHAT.SESSIONS.STATS);
      expect(result.totalSessions).toBe(25);
    });
  });

  describe('getActiveSessions', () => {
    it('should GET active sessions', async () => {
      const mockSessions: ChatSession[] = [
        {
          id: 's1',
          userId: 'user-123',
          conversationId: 'c1',
          startedAt: '2024-01-15T10:00:00Z',
          endedAt: null,
          isActive: true,
          durationMinutes: 5,
          messagesSent: 3,
          messagesReceived: 3,
          tokensUsed: 500,
          deviceInfo: null,
          createdAt: '2024-01-15T10:00:00Z',
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValue(mockSessions);

      const result = await chatService.getActiveSessions();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.CHAT.SESSIONS.ACTIVE);
      expect(result).toHaveLength(1);
    });
  });

  describe('getConversationSessions', () => {
    it('should GET sessions for conversation', async () => {
      const mockHistory: SessionHistory = {
        sessions: [],
        totalCount: 0,
      };
      vi.mocked(apiClient.get).mockResolvedValue(mockHistory);

      await chatService.getConversationSessions('conv-123');

      expect(apiClient.get).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.SESSIONS.BY_CONVERSATION('conv-123')
      );
    });

    it('should include pagination params when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ sessions: [], totalCount: 0 });

      await chatService.getConversationSessions('conv-123', 10, 5);

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('skip=10')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('take=5')
      );
    });
  });

  describe('getSessionHistory', () => {
    it('should GET session history', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ sessions: [], totalCount: 0 });

      await chatService.getSessionHistory();

      expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.CHAT.SESSIONS.HISTORY);
    });

    it('should include date filters when provided', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ sessions: [], totalCount: 0 });

      await chatService.getSessionHistory('2024-01-01', '2024-01-31');

      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('since=')
      );
      expect(apiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('until=')
      );
    });
  });

  // ============================================
  // Suggested Prompts Tests
  // ============================================
  describe('generateSuggestedPrompts', () => {
    it('should POST to correct endpoint', async () => {
      const mockResponse = {
        prompts: ['Tell me about my notes', 'Summarize recent content'],
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await chatService.generateSuggestedPrompts();

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.SUGGESTED_PROMPTS,
        {}
      );
    });

    it('should pass request options', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ prompts: [] });

      await chatService.generateSuggestedPrompts({ count: 5 });

      expect(apiClient.post).toHaveBeenCalledWith(
        API_ENDPOINTS.CHAT.SUGGESTED_PROMPTS,
        { count: 5 }
      );
    });
  });

  // ============================================
  // Utility Functions Tests
  // ============================================
  describe('generateTitle', () => {
    it('should return full content if under maxLength', () => {
      const result = chatService.generateTitle('Short title');

      expect(result).toBe('Short title');
    });

    it('should truncate long content', () => {
      const longContent = 'This is a very long title that exceeds the default maximum length limit';

      const result = chatService.generateTitle(longContent);

      expect(result.length).toBeLessThanOrEqual(50);
      expect(result).toContain('...');
    });

    it('should replace newlines with spaces', () => {
      const result = chatService.generateTitle('Line1\nLine2\nLine3');

      expect(result).toBe('Line1 Line2 Line3');
    });

    it('should use custom maxLength', () => {
      const result = chatService.generateTitle('This is a test title', 10);

      expect(result).toBe('This is...');
    });
  });

  describe('sortConversationsByDate', () => {
    it('should sort newest first', () => {
      const conversations = [
        createMockConversation({ id: 'old', updatedAt: '2024-01-01T10:00:00Z' }),
        createMockConversation({ id: 'new', updatedAt: '2024-01-15T10:00:00Z' }),
        createMockConversation({ id: 'mid', updatedAt: '2024-01-10T10:00:00Z' }),
      ];

      const sorted = chatService.sortConversationsByDate(conversations);

      expect(sorted[0].id).toBe('new');
      expect(sorted[1].id).toBe('mid');
      expect(sorted[2].id).toBe('old');
    });

    it('should not mutate original array', () => {
      const conversations = [
        createMockConversation({ id: 'a', updatedAt: '2024-01-01T10:00:00Z' }),
        createMockConversation({ id: 'b', updatedAt: '2024-01-15T10:00:00Z' }),
      ];
      const original = [...conversations];

      chatService.sortConversationsByDate(conversations);

      expect(conversations[0].id).toBe(original[0].id);
    });
  });

  describe('countConversationTokens', () => {
    it('should sum inputTokens and outputTokens', () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({ inputTokens: 100, outputTokens: 50 }),
          createMockMessage({ inputTokens: 200, outputTokens: 100 }),
        ],
      });

      const result = chatService.countConversationTokens(conversation);

      expect(result.inputTokens).toBe(300);
      expect(result.outputTokens).toBe(150);
    });

    it('should handle undefined token counts', () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({ inputTokens: undefined, outputTokens: undefined }),
          createMockMessage({ inputTokens: 100, outputTokens: 50 }),
        ],
      });

      const result = chatService.countConversationTokens(conversation);

      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(50);
    });

    it('should handle empty messages array', () => {
      const conversation = createMockConversation({ messages: [] });

      const result = chatService.countConversationTokens(conversation);

      expect(result.inputTokens).toBe(0);
      expect(result.outputTokens).toBe(0);
    });
  });

  describe('getLastMessage', () => {
    it('should return content of last message', () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({ content: 'First' }),
          createMockMessage({ content: 'Second' }),
          createMockMessage({ content: 'Last message' }),
        ],
      });

      const result = chatService.getLastMessage(conversation);

      expect(result).toBe('Last message');
    });

    it('should return empty string for empty messages', () => {
      const conversation = createMockConversation({ messages: [] });

      const result = chatService.getLastMessage(conversation);

      expect(result).toBe('');
    });
  });

  describe('hasRetrievedNotes', () => {
    it('should return true when notes exist', () => {
      const notes = [{
        noteId: 'n1',
        title: 'Note',
        relevanceScore: 0.9,
        tags: [],
        chunkContent: 'chunk',
        content: 'content',
        chunkIndex: 0,
      }];

      const result = chatService.hasRetrievedNotes(notes);

      expect(result).toBe(true);
    });

    it('should return false for undefined', () => {
      const result = chatService.hasRetrievedNotes(undefined);

      expect(result).toBe(false);
    });

    it('should return false for empty array', () => {
      const result = chatService.hasRetrievedNotes([]);

      expect(result).toBe(false);
    });
  });
});
