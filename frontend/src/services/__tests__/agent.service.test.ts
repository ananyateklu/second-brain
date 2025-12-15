/**
 * Agent Service Tests
 * Unit tests for agent service methods, streaming, and utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { agentService } from '../agent.service';
import type {
  AgentStreamingCallbacks,
  AgentMessageRequest,
  ToolExecution,
} from '../../types/agent';

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

describe('agentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Stream Processing Tests
  // ============================================
  describe('processAgentStream', () => {
    let callbacks: AgentStreamingCallbacks;

    beforeEach(() => {
      callbacks = {
        onToken: vi.fn(),
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn(),
        onThinking: vi.fn(),
        onToolExecution: vi.fn(),
        onContextRetrieval: vi.fn(),
        onGrounding: vi.fn(),
        onCodeExecution: vi.fn(),
      };
    });

    it('should process SSE stream and call appropriate callbacks', async () => {
      const chunks = [
        'event: start\ndata: {}\n\n',
        'event: message\ndata: Hello\n\n',
        'event: end\ndata: {"inputTokens":10,"outputTokens":5}\n\n',
      ];
      const reader = createMockReader(chunks);

      await agentService.processAgentStream(reader, callbacks);

      expect(callbacks.onStart).toHaveBeenCalled();
      expect(callbacks.onToken).toHaveBeenCalledWith('Hello');
      expect(callbacks.onEnd).toHaveBeenCalledWith(expect.objectContaining({
        inputTokens: 10,
        outputTokens: 5,
      }));
    });

    it('should handle multiple events in single chunk', async () => {
      const chunks = [
        'event: thinking\ndata: {"content":"Analyzing..."}\n\nevent: message\ndata: Result\n\n',
      ];
      const reader = createMockReader(chunks);

      await agentService.processAgentStream(reader, callbacks);

      expect(callbacks.onThinking).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Analyzing...' })
      );
      expect(callbacks.onToken).toHaveBeenCalledWith('Result');
    });

    it('should skip empty messages', async () => {
      const chunks = [
        'event: start\ndata: {}\n\n',
        '\n\n',  // Empty message
        'event: message\ndata: Test\n\n',
      ];
      const reader = createMockReader(chunks);

      await agentService.processAgentStream(reader, callbacks);

      expect(callbacks.onStart).toHaveBeenCalledTimes(1);
      expect(callbacks.onToken).toHaveBeenCalledWith('Test');
    });

    it('should handle partial messages across chunks', async () => {
      const chunks = [
        'event: message\ndata: ',
        'Hello World\n\n',
      ];
      const reader = createMockReader(chunks);

      await agentService.processAgentStream(reader, callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Hello World');
    });
  });

  // ============================================
  // streamAgentMessage Tests
  // ============================================
  describe('streamAgentMessage', () => {
    let callbacks: AgentStreamingCallbacks;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      callbacks = {
        onToken: vi.fn(),
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn(),
        onThinking: vi.fn(),
        onToolExecution: vi.fn(),
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

      const request: AgentMessageRequest = {
        content: 'Test message',
        capabilities: ['notes'],
      };

      await expect(
        agentService.streamAgentMessage('conv-123', request, callbacks)
      ).rejects.toThrow('HTTP error! status: 500');

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should throw error if response body is not readable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: null,
      });

      const request: AgentMessageRequest = {
        content: 'Test message',
        capabilities: [],
      };

      await expect(
        agentService.streamAgentMessage('conv-123', request, callbacks)
      ).rejects.toThrow('Response body is not readable');

      expect(callbacks.onError).toHaveBeenCalled();
    });

    it('should handle AbortError silently', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const request: AgentMessageRequest = {
        content: 'Test message',
        capabilities: [],
      };

      // AbortError should return early without throwing
      await expect(
        agentService.streamAgentMessage('conv-123', request, callbacks)
      ).resolves.toBeUndefined();

      // onError should not be called for abort
      expect(callbacks.onError).not.toHaveBeenCalled();
    });

    it('should call onError for non-Error exceptions', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      const request: AgentMessageRequest = {
        content: 'Test message',
        capabilities: [],
      };

      await expect(
        agentService.streamAgentMessage('conv-123', request, callbacks)
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

      const request: AgentMessageRequest = {
        content: 'Test message',
        capabilities: ['notes'],
      };

      await agentService.streamAgentMessage('conv-123', request, callbacks);

      expect(callbacks.onStart).toHaveBeenCalled();
      expect(callbacks.onToken).toHaveBeenCalledWith('Hello');
      expect(callbacks.onEnd).toHaveBeenCalled();
    });
  });

  // ============================================
  // SSE Event Handling Tests
  // ============================================
  describe('handleAgentEvent', () => {
    let callbacks: AgentStreamingCallbacks;

    beforeEach(() => {
      callbacks = {
        onToken: vi.fn(),
        onStart: vi.fn(),
        onEnd: vi.fn(),
        onError: vi.fn(),
        onThinking: vi.fn(),
        onToolExecution: vi.fn(),
        onContextRetrieval: vi.fn(),
        onGrounding: vi.fn(),
        onCodeExecution: vi.fn(),
      };
    });

    it('should handle "start" event - call onStart', () => {
      agentService.handleAgentEvent('start', '', callbacks);

      expect(callbacks.onStart).toHaveBeenCalled();
    });

    it('should handle "thinking" event with JSON - parse content', () => {
      const thinkingData = JSON.stringify({ content: 'Analyzing the problem...' });

      agentService.handleAgentEvent('thinking', thinkingData, callbacks);

      expect(callbacks.onThinking).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Analyzing the problem...' })
      );
    });

    it('should handle "thinking" event with raw string', () => {
      agentService.handleAgentEvent('thinking', 'Raw thinking text\\nwith newline', callbacks);

      expect(callbacks.onThinking).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Raw thinking text\nwith newline' })
      );
    });

    it('should handle "tool_start" event - create ToolExecution with executing status', () => {
      const toolData = JSON.stringify({
        tool: 'SearchNotes',
        arguments: '{"query":"test"}',
      });

      agentService.handleAgentEvent('tool_start', toolData, callbacks);

      expect(callbacks.onToolExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'SearchNotes',
          status: 'executing',
        })
      );
    });

    it('should handle "tool_executing" event', () => {
      const toolData = JSON.stringify({
        toolName: 'CreateNote',
        arguments: '{"title":"New Note"}',
      });

      agentService.handleAgentEvent('tool_executing', toolData, callbacks);

      expect(callbacks.onToolExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'CreateNote',
          status: 'executing',
        })
      );
    });

    it('should handle "tool_result" event - create ToolExecution with completed status', () => {
      const toolData = JSON.stringify({
        tool: 'SearchNotes',
        arguments: '{"query":"test"}',
        result: '{"notes":[]}',
      });

      agentService.handleAgentEvent('tool_result', toolData, callbacks);

      expect(callbacks.onToolExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'SearchNotes',
          status: 'completed',
          result: '{"notes":[]}',
        })
      );
    });

    it('should handle "tool_completed" event', () => {
      const toolData = JSON.stringify({
        toolName: 'GetNoteById',
        result: '{"id":"note-1","title":"Test"}',
      });

      agentService.handleAgentEvent('tool_completed', toolData, callbacks);

      expect(callbacks.onToolExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          tool: 'GetNoteById',
          status: 'completed',
        })
      );
    });

    it('should handle "context_retrieval" event - extract notes and ragLogId', () => {
      const contextData = JSON.stringify({
        retrievedNotes: [{ noteId: 'n1', title: 'Note 1' }],
        ragLogId: 'log-123',
      });

      agentService.handleAgentEvent('context_retrieval', contextData, callbacks);

      expect(callbacks.onContextRetrieval).toHaveBeenCalledWith({
        notes: [{ noteId: 'n1', title: 'Note 1' }],
        ragLogId: 'log-123',
      });
    });

    it('should handle "grounding" event - extract sources', () => {
      const groundingData = JSON.stringify({
        sources: [{ title: 'Source 1', url: 'https://example.com' }],
      });

      agentService.handleAgentEvent('grounding', groundingData, callbacks);

      expect(callbacks.onGrounding).toHaveBeenCalledWith([
        { title: 'Source 1', url: 'https://example.com' },
      ]);
    });

    it('should handle "code_execution" event - create CodeExecutionResult', () => {
      const codeData = JSON.stringify({
        code: 'print("hello")',
        language: 'python',
        output: 'hello',
        success: true,
      });

      agentService.handleAgentEvent('code_execution', codeData, callbacks);

      expect(callbacks.onCodeExecution).toHaveBeenCalledWith({
        code: 'print("hello")',
        language: 'python',
        output: 'hello',
        success: true,
        errorMessage: undefined,
      });
    });

    it('should handle "message" event - call onToken', () => {
      agentService.handleAgentEvent('message', 'Hello world', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Hello world');
    });

    it('should handle "token" event - call onToken', () => {
      agentService.handleAgentEvent('token', 'Token content', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Token content');
    });

    it('should handle "data" event - call onToken', () => {
      agentService.handleAgentEvent('data', 'Data content', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Data content');
    });

    it('should unescape newlines in token data', () => {
      agentService.handleAgentEvent('message', 'Line1\\nLine2', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Line1\nLine2');
    });

    it('should handle "end" event - parse token counts and call onEnd', () => {
      const endData = JSON.stringify({
        inputTokens: 100,
        outputTokens: 200,
        durationMs: 1500,
        toolExecutions: 2,
      });

      agentService.handleAgentEvent('end', endData, callbacks);

      expect(callbacks.onEnd).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokens: 100,
          outputTokens: 200,
          durationMs: 1500,
          toolExecutions: 2,
        })
      );
    });

    it('should handle "end" event with empty data', () => {
      agentService.handleAgentEvent('end', '', callbacks);

      expect(callbacks.onEnd).toHaveBeenCalledWith({});
    });

    it('should handle "end" event with invalid JSON data', () => {
      agentService.handleAgentEvent('end', 'not valid json', callbacks);

      expect(callbacks.onEnd).toHaveBeenCalledWith({});
    });

    it('should handle "error" event - create Error and call onError', () => {
      const errorData = JSON.stringify({ error: 'Something went wrong' });

      agentService.handleAgentEvent('error', errorData, callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Something went wrong' })
      );
    });

    it('should handle "error" event with message field', () => {
      const errorData = JSON.stringify({ message: 'Error message' });

      agentService.handleAgentEvent('error', errorData, callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error message' })
      );
    });

    it('should handle "error" event with plain text', () => {
      agentService.handleAgentEvent('error', 'Plain error', callbacks);

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Plain error' })
      );
    });

    it('should handle unknown events as tokens if data present', () => {
      agentService.handleAgentEvent('unknown_event', 'Some content', callbacks);

      expect(callbacks.onToken).toHaveBeenCalledWith('Some content');
    });

    it('should handle malformed JSON gracefully in tool_start', () => {
      agentService.handleAgentEvent('tool_start', 'not valid json', callbacks);

      expect(callbacks.onToolExecution).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully in tool_result', () => {
      agentService.handleAgentEvent('tool_result', 'not valid json', callbacks);

      expect(callbacks.onToolExecution).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully in context_retrieval', () => {
      agentService.handleAgentEvent('context_retrieval', 'not valid json', callbacks);

      expect(callbacks.onContextRetrieval).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully in grounding', () => {
      agentService.handleAgentEvent('grounding', 'not valid json', callbacks);

      expect(callbacks.onGrounding).not.toHaveBeenCalled();
    });

    it('should handle malformed JSON gracefully in code_execution', () => {
      agentService.handleAgentEvent('code_execution', 'not valid json', callbacks);

      expect(callbacks.onCodeExecution).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Utility Functions Tests
  // ============================================
  describe('buildCapabilities', () => {
    it('should return empty array when no options', () => {
      const result = agentService.buildCapabilities({});

      expect(result).toEqual([]);
    });

    it('should include "notes" when notes=true', () => {
      const result = agentService.buildCapabilities({ notes: true });

      expect(result).toContain('notes');
    });

    it('should include "web" when web=true', () => {
      const result = agentService.buildCapabilities({ web: true });

      expect(result).toContain('web');
    });

    it('should include "code" when code=true', () => {
      const result = agentService.buildCapabilities({ code: true });

      expect(result).toContain('code');
    });

    it('should combine multiple capabilities', () => {
      const result = agentService.buildCapabilities({
        notes: true,
        web: true,
        code: true,
      });

      expect(result).toEqual(['notes', 'web', 'code']);
    });

    it('should not include false capabilities', () => {
      const result = agentService.buildCapabilities({
        notes: true,
        web: false,
        code: true,
      });

      expect(result).toEqual(['notes', 'code']);
    });
  });

  describe('parseCapabilities', () => {
    it('should parse JSON string to array', () => {
      const result = agentService.parseCapabilities('["notes","web"]');

      expect(result).toEqual(['notes', 'web']);
    });

    it('should return empty array for undefined', () => {
      const result = agentService.parseCapabilities(undefined);

      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = agentService.parseCapabilities('');

      expect(result).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      const result = agentService.parseCapabilities('not json');

      expect(result).toEqual([]);
    });
  });

  describe('stringifyCapabilities', () => {
    it('should convert array to JSON string', () => {
      const result = agentService.stringifyCapabilities(['notes', 'web']);

      expect(result).toBe('["notes","web"]');
    });

    it('should handle empty array', () => {
      const result = agentService.stringifyCapabilities([]);

      expect(result).toBe('[]');
    });
  });

  describe('formatToolExecution', () => {
    it('should format tool name with arguments', () => {
      const execution: ToolExecution = {
        tool: 'SearchNotes',
        arguments: '{"query":"test search"}',
        result: '',
        status: 'executing',
        timestamp: new Date(),
      };

      const result = agentService.formatToolExecution(execution);

      expect(result).toBe('SearchNotes with {"query":"test search"}');
    });

    it('should truncate long arguments', () => {
      const execution: ToolExecution = {
        tool: 'CreateNote',
        arguments: '{"title":"A very long title that exceeds the maximum length limit for display purposes"}',
        result: '',
        status: 'executing',
        timestamp: new Date(),
      };

      const result = agentService.formatToolExecution(execution);

      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toContain('...');
    });

    it('should handle missing arguments', () => {
      const execution: ToolExecution = {
        tool: 'GetAllNotes',
        arguments: '',
        result: '',
        status: 'executing',
        timestamp: new Date(),
      };

      const result = agentService.formatToolExecution(execution);

      expect(result).toBe('GetAllNotes');
    });
  });

  describe('truncateString', () => {
    it('should return full string if under maxLength', () => {
      const result = agentService.truncateString('Short text', 50);

      expect(result).toBe('Short text');
    });

    it('should truncate long string with ellipsis', () => {
      const result = agentService.truncateString('This is a very long text that needs truncation', 20);

      expect(result).toBe('This is a very lo...');
      expect(result.length).toBe(20);
    });

    it('should handle edge case at exact maxLength', () => {
      const result = agentService.truncateString('Exactly10!', 10);

      expect(result).toBe('Exactly10!');
    });
  });

  describe('calculateToolExecutionTime', () => {
    it('should return 0 for empty array', () => {
      const result = agentService.calculateToolExecutionTime([]);

      expect(result).toBe(0);
    });

    it('should return 0 for single execution', () => {
      const executions: ToolExecution[] = [
        {
          tool: 'Test',
          arguments: '',
          result: '',
          status: 'completed',
          timestamp: new Date(),
        },
      ];

      const result = agentService.calculateToolExecutionTime(executions);

      expect(result).toBe(0);
    });

    it('should calculate time difference for multiple executions', () => {
      const startTime = new Date('2024-01-15T10:00:00Z');
      const endTime = new Date('2024-01-15T10:00:05Z');
      const executions: ToolExecution[] = [
        {
          tool: 'First',
          arguments: '',
          result: '',
          status: 'completed',
          timestamp: startTime,
        },
        {
          tool: 'Last',
          arguments: '',
          result: '',
          status: 'completed',
          timestamp: endTime,
        },
      ];

      const result = agentService.calculateToolExecutionTime(executions);

      expect(result).toBe(5000); // 5 seconds in milliseconds
    });
  });

  describe('getToolExecutionSummary', () => {
    it('should count total, completed, and failed', () => {
      const executions: ToolExecution[] = [
        { tool: 'T1', arguments: '', result: '', status: 'completed', timestamp: new Date() },
        { tool: 'T2', arguments: '', result: '', status: 'completed', timestamp: new Date() },
        { tool: 'T3', arguments: '', result: '', status: 'failed', timestamp: new Date() },
        { tool: 'T4', arguments: '', result: '', status: 'executing', timestamp: new Date() },
      ];

      const result = agentService.getToolExecutionSummary(executions);

      expect(result).toEqual({
        total: 4,
        completed: 2,
        failed: 1,
      });
    });

    it('should handle empty array', () => {
      const result = agentService.getToolExecutionSummary([]);

      expect(result).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
      });
    });

    it('should handle all completed', () => {
      const executions: ToolExecution[] = [
        { tool: 'T1', arguments: '', result: '', status: 'completed', timestamp: new Date() },
        { tool: 'T2', arguments: '', result: '', status: 'completed', timestamp: new Date() },
      ];

      const result = agentService.getToolExecutionSummary(executions);

      expect(result).toEqual({
        total: 2,
        completed: 2,
        failed: 0,
      });
    });
  });
});
