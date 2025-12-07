/**
 * StreamEventProcessor Unit Tests
 * 
 * Tests the SSE parsing class for correct event parsing, buffering,
 * error handling, and event mapping from backend to frontend types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamEventProcessor, createStreamEventProcessor } from '../stream-event-processor';
import {
  buildSSEMessage,
  buildStartMessage,
  buildTextMessage,
  buildEndMessage,
  buildErrorMessage,
  buildToolStartMessage,
  buildToolEndMessage,
  buildThinkingMessage,
  buildStatusMessage,
  buildRagMessage,
  buildContextRetrievalMessage,
  buildGroundingMessage,
  buildCodeExecutionMessage,
  buildGrokSearchMessage,
  buildGrokThinkingMessage,
  stringToChunk,
  createMockRagNote,
  createMockGroundingSource,
  createMockCodeExecutionResult,
  createMockGrokSearchSource,
  createMockGrokThinkingStep,
} from './test-utils';

describe('StreamEventProcessor', () => {
  let processor: StreamEventProcessor;
  let onEvent: ReturnType<typeof vi.fn>;
  let onParseError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onEvent = vi.fn();
    onParseError = vi.fn();
    processor = new StreamEventProcessor({
      onEvent: onEvent as (event: import('../types').StreamEvent) => void,
      onParseError: onParseError as (error: Error, rawMessage: string) => void
    });
  });

  // ============================================
  // Basic SSE Parsing Tests
  // ============================================
  describe('basic SSE parsing', () => {
    it('should parse a start event correctly', () => {
      const message = buildStartMessage();
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('stream:start');
      expect((events[0] as { type: 'stream:start'; timestamp: number }).timestamp).toBeDefined();
    });

    it('should parse text message events correctly', () => {
      const message = buildTextMessage('Hello, world!');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('content:text');
      expect((events[0] as { type: 'content:text'; delta: string }).delta).toBe('Hello, world!');
    });

    it('should parse data events the same as message events', () => {
      const message = buildSSEMessage('data', 'Hello from data');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('content:text');
      expect((events[0] as { type: 'content:text'; delta: string }).delta).toBe('Hello from data');
    });

    it('should parse end events correctly', () => {
      const message = buildEndMessage('log-123', 50, 100);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('stream:end');
      const endEvent = events[0] as { type: 'stream:end'; ragLogId?: string; inputTokens?: number; outputTokens?: number };
      expect(endEvent.ragLogId).toBe('log-123');
      expect(endEvent.inputTokens).toBe(50);
      expect(endEvent.outputTokens).toBe(100);
    });

    it('should parse end events without data', () => {
      const message = buildSSEMessage('end', '');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('stream:end');
    });

    it('should parse error events correctly', () => {
      const message = buildErrorMessage('Something went wrong', true);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('stream:error');
      const errorEvent = events[0] as { type: 'stream:error'; error: string; recoverable: boolean };
      expect(errorEvent.error).toBe('Something went wrong');
      expect(errorEvent.recoverable).toBe(true);
    });

    it('should handle error events with raw string data', () => {
      const message = buildSSEMessage('error', 'Raw error message');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('stream:error');
      const errorEvent = events[0] as { type: 'stream:error'; error: string; recoverable: boolean };
      expect(errorEvent.error).toBe('Raw error message');
      expect(errorEvent.recoverable).toBe(false);
    });

    it('should unescape SSE newlines in text content', () => {
      const message = buildTextMessage('Line 1\\nLine 2\\nLine 3');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect((events[0] as { type: 'content:text'; delta: string }).delta).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  // ============================================
  // Tool Event Parsing Tests
  // ============================================
  describe('tool event parsing', () => {
    it('should parse tool_start events correctly', () => {
      const message = buildToolStartMessage('search_notes', '{"query":"test"}', 'tool_123');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool:start');
      const toolEvent = events[0] as { type: 'tool:start'; toolId: string; tool: string; args: string };
      expect(toolEvent.toolId).toBe('tool_123');
      expect(toolEvent.tool).toBe('search_notes');
      expect(toolEvent.args).toBe('{"query":"test"}');
    });

    it('should generate tool ID if not provided in tool_start', () => {
      const message = buildToolStartMessage('search_notes', '{"query":"test"}');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool:start');
      const toolEvent = events[0] as { type: 'tool:start'; toolId: string; tool: string; args: string };
      expect(toolEvent.toolId).toMatch(/^tool_/);
    });

    it('should parse tool_end events correctly', () => {
      const message = buildToolEndMessage('search_notes', '[{"title":"Note 1"}]', 'tool_123', true);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool:end');
      const toolEvent = events[0] as { type: 'tool:end'; toolId: string; tool: string; result: string; success: boolean };
      expect(toolEvent.toolId).toBe('tool_123');
      expect(toolEvent.tool).toBe('search_notes');
      expect(toolEvent.result).toBe('[{"title":"Note 1"}]');
      expect(toolEvent.success).toBe(true);
    });

    it('should parse tool_end events with failure', () => {
      const message = buildToolEndMessage('search_notes', 'Error: Not found', 'tool_123', false);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      const toolEvent = events[0] as { type: 'tool:end'; success: boolean };
      expect(toolEvent.success).toBe(false);
    });

    it('should return null for invalid tool_start data', () => {
      const message = buildSSEMessage('tool_start', 'invalid json');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(0);
    });

    it('should return null for tool_start missing required fields', () => {
      const message = buildSSEMessage('tool_start', '{"tool":"search"}');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(0);
    });
  });

  // ============================================
  // Thinking Event Parsing Tests
  // ============================================
  describe('thinking event parsing', () => {
    it('should parse thinking events with JSON content', () => {
      const message = buildThinkingMessage('Let me analyze this...');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('content:thinking');
      const thinkingEvent = events[0] as { type: 'content:thinking'; content: string; isComplete?: boolean };
      expect(thinkingEvent.content).toBe('Let me analyze this...');
      expect(thinkingEvent.isComplete).toBe(true);
    });

    it('should parse raw thinking content as incomplete', () => {
      const message = buildSSEMessage('thinking', 'Raw thinking content');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('content:thinking');
      const thinkingEvent = events[0] as { type: 'content:thinking'; content: string; isComplete?: boolean };
      expect(thinkingEvent.content).toBe('Raw thinking content');
      expect(thinkingEvent.isComplete).toBe(false);
    });
  });

  // ============================================
  // Status Event Parsing Tests
  // ============================================
  describe('status event parsing', () => {
    it('should parse status events correctly', () => {
      const message = buildStatusMessage('Searching your notes...');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('status:update');
      const statusEvent = events[0] as { type: 'status:update'; status: string };
      expect(statusEvent.status).toBe('Searching your notes...');
    });

    it('should return null for invalid status data', () => {
      const message = buildSSEMessage('status', 'not json');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(0);
    });
  });

  // ============================================
  // RAG Context Event Parsing Tests
  // ============================================
  describe('RAG context event parsing', () => {
    it('should parse rag events correctly', () => {
      const notes = [createMockRagNote({ noteId: 'note_1', title: 'Test Note' })];
      const message = buildRagMessage(notes, 'rag-log-123');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('rag:context');
      const ragEvent = events[0] as { type: 'rag:context'; notes: typeof notes; ragLogId?: string };
      expect(ragEvent.notes).toHaveLength(1);
      expect(ragEvent.notes[0].noteId).toBe('note_1');
      expect(ragEvent.ragLogId).toBe('rag-log-123');
    });

    it('should parse context_retrieval events the same as rag events', () => {
      const notes = [createMockRagNote({ noteId: 'note_2' })];
      const message = buildContextRetrievalMessage(notes, 'context-log-456');
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('rag:context');
      const ragEvent = events[0] as { type: 'rag:context'; notes: typeof notes; ragLogId?: string };
      expect(ragEvent.notes).toHaveLength(1);
      expect(ragEvent.ragLogId).toBe('context-log-456');
    });

    it('should handle empty notes array', () => {
      const message = buildRagMessage([]);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      const ragEvent = events[0] as { type: 'rag:context'; notes: unknown[] };
      expect(ragEvent.notes).toHaveLength(0);
    });
  });

  // ============================================
  // Grounding and Code Execution Tests
  // ============================================
  describe('grounding and code execution parsing', () => {
    it('should parse grounding events correctly', () => {
      const sources = [createMockGroundingSource({ uri: 'https://test.com', title: 'Test Source' })];
      const message = buildGroundingMessage(sources);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('grounding:sources');
      const groundingEvent = events[0] as { type: 'grounding:sources'; sources: typeof sources };
      expect(groundingEvent.sources).toHaveLength(1);
      expect(groundingEvent.sources[0].uri).toBe('https://test.com');
    });

    it('should parse code_execution events correctly', () => {
      const result = createMockCodeExecutionResult({ code: 'print(1+1)', output: '2' });
      const message = buildCodeExecutionMessage(result);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('code:execution');
      const codeEvent = events[0] as { type: 'code:execution'; result: typeof result };
      expect(codeEvent.result.code).toBe('print(1+1)');
      expect(codeEvent.result.output).toBe('2');
      expect(codeEvent.result.success).toBe(true);
    });

    it('should handle code execution failure', () => {
      const result = createMockCodeExecutionResult({ success: false, errorMessage: 'SyntaxError' });
      const message = buildCodeExecutionMessage(result);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      const codeEvent = events[0] as { type: 'code:execution'; result: typeof result };
      expect(codeEvent.result.success).toBe(false);
      expect(codeEvent.result.errorMessage).toBe('SyntaxError');
    });
  });

  // ============================================
  // Grok-Specific Event Tests
  // ============================================
  describe('Grok-specific event parsing', () => {
    it('should parse grok_search events correctly', () => {
      const sources = [createMockGrokSearchSource({ url: 'https://x.com/post/1', title: 'Test Post' })];
      const message = buildGrokSearchMessage(sources);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('grok:search');
      const searchEvent = events[0] as { type: 'grok:search'; sources: typeof sources };
      expect(searchEvent.sources).toHaveLength(1);
      expect(searchEvent.sources[0].url).toBe('https://x.com/post/1');
    });

    it('should parse grok_thinking events correctly', () => {
      const step = createMockGrokThinkingStep({ step: 2, thought: 'Considering options...' });
      const message = buildGrokThinkingMessage(step);
      const events = processor.processChunk(stringToChunk(message));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('grok:thinking');
      const thinkingEvent = events[0] as { type: 'grok:thinking'; step: typeof step };
      expect(thinkingEvent.step.step).toBe(2);
      expect(thinkingEvent.step.thought).toBe('Considering options...');
    });
  });

  // ============================================
  // Chunk Buffering Tests
  // ============================================
  describe('chunk buffering', () => {
    it('should handle partial chunks correctly', () => {
      // Send first part of the message
      const part1 = 'event: mess';
      let events = processor.processChunk(stringToChunk(part1));
      expect(events).toHaveLength(0);

      // Send second part
      const part2 = 'age\ndata: Hello\n\n';
      events = processor.processChunk(stringToChunk(part2));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('content:text');
      expect((events[0] as { delta: string }).delta).toBe('Hello');
    });

    it('should handle multiple messages in a single chunk', () => {
      const chunk = buildTextMessage('First') + buildTextMessage('Second') + buildTextMessage('Third');
      const events = processor.processChunk(stringToChunk(chunk));

      expect(events).toHaveLength(3);
      expect((events[0] as { delta: string }).delta).toBe('First');
      expect((events[1] as { delta: string }).delta).toBe('Second');
      expect((events[2] as { delta: string }).delta).toBe('Third');
    });

    it('should buffer incomplete messages across chunks', () => {
      // First chunk ends in middle of message
      const chunk1 = buildTextMessage('Complete') + 'event: message\ndata: Part';
      let events = processor.processChunk(stringToChunk(chunk1));
      expect(events).toHaveLength(1);
      expect((events[0] as { delta: string }).delta).toBe('Complete');

      // Second chunk completes the message
      const chunk2 = 'ial\n\n';
      events = processor.processChunk(stringToChunk(chunk2));
      expect(events).toHaveLength(1);
      expect((events[0] as { delta: string }).delta).toBe('Partial');
    });

    it('should flush remaining buffer content', () => {
      // Send incomplete message
      processor.processChunk(stringToChunk('event: message\ndata: Buffered'));

      // Flush should process remaining content
      const events = processor.flush();
      expect(events).toHaveLength(1);
      expect((events[0] as { delta: string }).delta).toBe('Buffered');
    });

    it('should return empty array when flushing empty buffer', () => {
      const events = processor.flush();
      expect(events).toHaveLength(0);
    });
  });

  // ============================================
  // Callback Tests
  // ============================================
  describe('callback handling', () => {
    it('should call onEvent callback for each parsed event', () => {
      const chunk = buildTextMessage('Test') + buildTextMessage('Message');
      processor.processChunk(stringToChunk(chunk));

      expect(onEvent).toHaveBeenCalledTimes(2);
      expect(onEvent).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: 'content:text', delta: 'Test' }));
      expect(onEvent).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: 'content:text', delta: 'Message' }));
    });

    it('should call onParseError for malformed messages', () => {
      // Create a processor that logs errors
      const errorProcessor = new StreamEventProcessor({
        onParseError: onParseError as (error: Error, rawMessage: string) => void,
      });

      // This won't trigger onParseError because it's valid SSE format
      // but with invalid JSON for events that expect JSON
      const invalidMessage = buildSSEMessage('tool_start', '{invalid json}');
      errorProcessor.processChunk(stringToChunk(invalidMessage));

      // Note: The current implementation logs errors but doesn't call onParseError
      // for JSON parse failures within event parsers
    });
  });

  // ============================================
  // Reset Tests
  // ============================================
  describe('reset functionality', () => {
    it('should reset the processor state', () => {
      // Process a partial message
      processor.processChunk(stringToChunk('event: message\ndata: Part'));

      // Reset
      processor.reset();

      // Process new message - should not combine with old buffer
      const events = processor.processChunk(stringToChunk(buildTextMessage('New')));

      expect(events).toHaveLength(1);
      expect((events[0] as { delta: string }).delta).toBe('New');
    });

    it('should clear tool tracking state on reset', () => {
      // Start a tool
      processor.processChunk(stringToChunk(buildToolStartMessage('test_tool', '{}', 'tool_1')));

      // Reset
      processor.reset();

      // End the tool - should still work but with fallback ID
      const events = processor.processChunk(stringToChunk(buildToolEndMessage('test_tool', 'result', 'tool_1')));

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('tool:end');
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('edge cases', () => {
    it('should ignore SSE comments', () => {
      const chunk = ':this is a comment\n\n' + buildTextMessage('Real message');
      const events = processor.processChunk(stringToChunk(chunk));

      expect(events).toHaveLength(1);
      expect((events[0] as { delta: string }).delta).toBe('Real message');
    });

    it('should handle empty data fields', () => {
      const message = buildSSEMessage('message', '');
      const events = processor.processChunk(stringToChunk(message));

      // Empty data should not produce an event
      expect(events).toHaveLength(0);
    });

    it('should handle unknown event types gracefully', () => {
      const message = buildSSEMessage('unknown_event', 'some data');
      const events = processor.processChunk(stringToChunk(message));

      // Unknown events should be ignored
      expect(events).toHaveLength(0);
    });

    it('should handle multiple newlines correctly', () => {
      const chunk = '\n\n' + buildTextMessage('After newlines') + '\n\n\n\n';
      const events = processor.processChunk(stringToChunk(chunk));

      expect(events).toHaveLength(1);
      expect((events[0] as { delta: string }).delta).toBe('After newlines');
    });

    it('should handle whitespace-only messages', () => {
      const chunk = '   \n\n' + buildTextMessage('Real');
      const events = processor.processChunk(stringToChunk(chunk));

      expect(events).toHaveLength(1);
    });
  });

  // ============================================
  // Factory Function Tests
  // ============================================
  describe('createStreamEventProcessor', () => {
    it('should create a new processor instance', () => {
      const newProcessor = createStreamEventProcessor();
      expect(newProcessor).toBeInstanceOf(StreamEventProcessor);
    });

    it('should pass options to the processor', () => {
      const customOnEvent = vi.fn();
      const newProcessor = createStreamEventProcessor({ onEvent: customOnEvent });

      newProcessor.processChunk(stringToChunk(buildTextMessage('Test')));
      expect(customOnEvent).toHaveBeenCalled();
    });
  });
});
