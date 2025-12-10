/**
 * streamReducer Unit Tests
 * 
 * Tests the state machine reducer for correct state transitions,
 * event processing, and helper functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  streamReducer,
  getInitialStreamState,
  isStreamActive,
  hasStreamContent,
  isImageGenerationActive,
} from '../stream-reducer';
import { initialStreamState } from '../types';
import type { UnifiedStreamState, StreamAction } from '../types';
import {
  createMockState,
  createStreamingState,
  createToolExecutionState,
  createImageGenerationState,
  createStartEvent,
  createTextEvent,
  createEndEvent,
  createErrorEvent,
  createToolStartEvent,
  createToolEndEvent,
  createThinkingEvent,
  createThinkingEndEvent,
  createRagContextEvent,
  createGroundingEvent,
  createCodeExecutionEvent,
  createStatusEvent,
  createGrokSearchEvent,
  createGrokThinkingEvent,
  createImageStartEvent,
  createImageProgressEvent,
  createImageCompleteEvent,
  createImageErrorEvent,
  createMockRagNote,
  createMockGroundingSource,
  createMockCodeExecutionResult,
  createMockGrokSearchSource,
  createMockGrokThinkingStep,
  createMockToolExecution,
} from './test-utils';

describe('streamReducer', () => {
  let initialState: UnifiedStreamState;

  beforeEach(() => {
    initialState = getInitialStreamState();
  });

  // ============================================
  // CONNECT Action Tests
  // ============================================
  describe('CONNECT action', () => {
    it('should transition to connecting phase', () => {
      const action: StreamAction = { type: 'CONNECT' };
      const newState = streamReducer(initialState, action);

      expect(newState.phase).toBe('connecting');
      expect(newState.status).toBe('connecting');
      expect(newState.startTime).toBeDefined();
      expect(newState.startTime).toBeGreaterThan(0);
    });

    it('should reset content while preserving retry count', () => {
      const stateWithContent = createStreamingState('Some content');
      stateWithContent.retryCount = 2;

      const action: StreamAction = { type: 'CONNECT' };
      const newState = streamReducer(stateWithContent, action);

      expect(newState.textContent).toBe('');
      expect(newState.retryCount).toBe(2);
    });

    it('should reset all content fields', () => {
      const stateWithData = createMockState({
        textContent: 'test',
        thinkingContent: 'thinking',
        ragContext: [createMockRagNote()],
        groundingSources: [createMockGroundingSource()],
        completedTools: [createMockToolExecution({ status: 'completed' })],
      });

      const action: StreamAction = { type: 'CONNECT' };
      const newState = streamReducer(stateWithData, action);

      expect(newState.textContent).toBe('');
      expect(newState.thinkingContent).toBe('');
      expect(newState.ragContext).toHaveLength(0);
      expect(newState.groundingSources).toHaveLength(0);
      expect(newState.completedTools).toHaveLength(0);
    });
  });

  // ============================================
  // CANCEL Action Tests
  // ============================================
  describe('CANCEL action', () => {
    it('should transition to idle phase', () => {
      const streamingState = createStreamingState('Some content');
      const action: StreamAction = { type: 'CANCEL' };
      const newState = streamReducer(streamingState, action);

      expect(newState.phase).toBe('idle');
      expect(newState.status).toBe('idle');
    });

    it('should calculate duration', () => {
      const streamingState = createStreamingState();
      streamingState.startTime = Date.now() - 1000;

      const action: StreamAction = { type: 'CANCEL' };
      const newState = streamReducer(streamingState, action);

      expect(newState.duration).toBeGreaterThanOrEqual(1000);
    });

    it('should preserve content on cancel', () => {
      const streamingState = createStreamingState('Keep this content');
      const action: StreamAction = { type: 'CANCEL' };
      const newState = streamReducer(streamingState, action);

      expect(newState.textContent).toBe('Keep this content');
    });

    it('should stop image generation on cancel', () => {
      const imageState = createImageGenerationState({ stage: 'generating' });
      const action: StreamAction = { type: 'CANCEL' };
      const newState = streamReducer(imageState, action);

      expect(newState.imageGeneration.inProgress).toBe(false);
      expect(newState.imageGeneration.stage).toBe('idle');
    });

    it('should clear processing status on cancel', () => {
      const stateWithStatus = createMockState({ processingStatus: 'Processing...' });
      const action: StreamAction = { type: 'CANCEL' };
      const newState = streamReducer(stateWithStatus, action);

      expect(newState.processingStatus).toBeNull();
    });
  });

  // ============================================
  // RESET Action Tests
  // ============================================
  describe('RESET action', () => {
    it('should return to initial state', () => {
      const complexState = createMockState({
        phase: 'streaming',
        status: 'streaming',
        textContent: 'content',
        thinkingContent: 'thinking',
        retryCount: 3,
        inputTokens: 100,
        outputTokens: 200,
      });

      const action: StreamAction = { type: 'RESET' };
      const newState = streamReducer(complexState, action);

      expect(newState.phase).toBe('idle');
      expect(newState.status).toBe('idle');
      expect(newState.textContent).toBe('');
      expect(newState.retryCount).toBe(0);
      expect(newState.inputTokens).toBe(0);
      expect(newState.outputTokens).toBe(0);
    });

    it('should reset activeTools to empty Map', () => {
      const tool = createMockToolExecution();
      const stateWithTools = createToolExecutionState(tool);

      const action: StreamAction = { type: 'RESET' };
      const newState = streamReducer(stateWithTools, action);

      expect(newState.activeTools.size).toBe(0);
    });
  });

  // ============================================
  // SET_INPUT_TOKENS Action Tests
  // ============================================
  describe('SET_INPUT_TOKENS action', () => {
    it('should set input tokens', () => {
      const action: StreamAction = { type: 'SET_INPUT_TOKENS', tokens: 150 };
      const newState = streamReducer(initialState, action);

      expect(newState.inputTokens).toBe(150);
    });

    it('should only update inputTokens field', () => {
      const stateWithData = createStreamingState('content');
      const action: StreamAction = { type: 'SET_INPUT_TOKENS', tokens: 200 };
      const newState = streamReducer(stateWithData, action);

      expect(newState.inputTokens).toBe(200);
      expect(newState.textContent).toBe('content');
      expect(newState.phase).toBe('streaming');
    });
  });

  // ============================================
  // INCREMENT_RETRY Action Tests
  // ============================================
  describe('INCREMENT_RETRY action', () => {
    it('should increment retry count', () => {
      const action: StreamAction = { type: 'INCREMENT_RETRY' };
      const newState = streamReducer(initialState, action);

      expect(newState.retryCount).toBe(1);
    });

    it('should increment from existing count', () => {
      const stateWithRetries = createMockState({ retryCount: 2 });
      const action: StreamAction = { type: 'INCREMENT_RETRY' };
      const newState = streamReducer(stateWithRetries, action);

      expect(newState.retryCount).toBe(3);
    });
  });

  // ============================================
  // stream:start Event Tests
  // ============================================
  describe('stream:start event', () => {
    it('should transition to streaming phase', () => {
      const event = createStartEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.phase).toBe('streaming');
      expect(newState.status).toBe('streaming');
    });

    it('should set startTime if not already set', () => {
      const event = createStartEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.startTime).toBeDefined();
      expect(newState.startTime).toBeGreaterThan(0);
    });

    it('should preserve existing startTime', () => {
      const existingStart = Date.now() - 1000;
      const stateWithStart = createMockState({ startTime: existingStart });

      const event = createStartEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithStart, action);

      expect(newState.startTime).toBe(existingStart);
    });
  });

  // ============================================
  // stream:end Event Tests
  // ============================================
  describe('stream:end event', () => {
    it('should transition to complete phase', () => {
      const streamingState = createStreamingState('content');
      const event = createEndEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(streamingState, action);

      expect(newState.phase).toBe('complete');
      expect(newState.status).toBe('complete');
    });

    it('should calculate duration', () => {
      const streamingState = createStreamingState();
      streamingState.startTime = Date.now() - 500;

      const event = createEndEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(streamingState, action);

      expect(newState.duration).toBeGreaterThanOrEqual(500);
    });

    it('should set ragLogId from event', () => {
      const streamingState = createStreamingState();
      const event = createEndEvent({ ragLogId: 'log-123' });
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(streamingState, action);

      expect(newState.ragLogId).toBe('log-123');
    });

    it('should set token counts from event', () => {
      const streamingState = createStreamingState();
      const event = createEndEvent({ inputTokens: 50, outputTokens: 100 });
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(streamingState, action);

      expect(newState.inputTokens).toBe(50);
      expect(newState.outputTokens).toBe(100);
    });

    it('should preserve existing ragLogId if not in event', () => {
      const stateWithRagLog = createStreamingState();
      stateWithRagLog.ragLogId = 'existing-log';

      const event = createEndEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithRagLog, action);

      expect(newState.ragLogId).toBe('existing-log');
    });

    it('should clear processing status', () => {
      const stateWithStatus = createStreamingState();
      stateWithStatus.processingStatus = 'Processing...';

      const event = createEndEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithStatus, action);

      expect(newState.processingStatus).toBeNull();
    });
  });

  // ============================================
  // stream:error Event Tests
  // ============================================
  describe('stream:error event', () => {
    it('should transition to error phase', () => {
      const streamingState = createStreamingState();
      const event = createErrorEvent('Something failed');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(streamingState, action);

      expect(newState.phase).toBe('error');
      expect(newState.status).toBe('error');
    });

    it('should set error details', () => {
      const streamingState = createStreamingState();
      const event = createErrorEvent('Network error', true);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(streamingState, action);

      expect(newState.error).toBeDefined();
      expect(newState.error?.message).toBe('Network error');
      expect(newState.error?.recoverable).toBe(true);
    });

    it('should calculate duration', () => {
      const streamingState = createStreamingState();
      streamingState.startTime = Date.now() - 300;

      const event = createErrorEvent('Error');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(streamingState, action);

      expect(newState.duration).toBeGreaterThanOrEqual(300);
    });

    it('should clear processing status', () => {
      const stateWithStatus = createStreamingState();
      stateWithStatus.processingStatus = 'Working...';

      const event = createErrorEvent('Failed');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithStatus, action);

      expect(newState.processingStatus).toBeNull();
    });
  });

  // ============================================
  // content:text Event Tests
  // ============================================
  describe('content:text event', () => {
    it('should accumulate text content', () => {
      const event = createTextEvent('Hello ');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.textContent).toBe('Hello ');
    });

    it('should append to existing content', () => {
      const stateWithContent = createStreamingState('Hello ');
      const event = createTextEvent('World!');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithContent, action);

      expect(newState.textContent).toBe('Hello World!');
    });

    it('should update estimated output tokens', () => {
      const event = createTextEvent('This is a test message with several words.');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.outputTokens).toBeGreaterThan(0);
    });

    it('should transition to streaming phase', () => {
      const event = createTextEvent('Content');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.phase).toBe('streaming');
      expect(newState.status).toBe('streaming');
    });
  });

  // ============================================
  // content:thinking Event Tests
  // ============================================
  describe('content:thinking event', () => {
    it('should set thinking content with isComplete=true', () => {
      const event = createThinkingEvent('Analyzing the problem...', true);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.thinkingContent).toBe('Analyzing the problem...');
      expect(newState.isThinkingComplete).toBe(true);
    });

    it('should append thinking content when isComplete=false and timeline has incomplete thinking', () => {
      // State with an incomplete thinking entry in timeline
      const stateWithThinking = createMockState({
        thinkingContent: 'Part 1 ',
        isThinkingComplete: false,
        processTimeline: [
          {
            type: 'thinking',
            id: 'thinking_1',
            content: 'Part 1 ',
            timestamp: Date.now(),
            isComplete: false,
          },
        ],
      });
      const event = createThinkingEvent('Part 2', false);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithThinking, action);

      expect(newState.thinkingContent).toBe('Part 1 Part 2');
      expect(newState.isThinkingComplete).toBe(false);
      expect(newState.processTimeline).toHaveLength(1);
      expect((newState.processTimeline[0] as { type: 'thinking'; content: string }).content).toBe('Part 1 Part 2');
    });

    it('should transition to streaming phase', () => {
      const event = createThinkingEvent('Thinking...');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.phase).toBe('streaming');
      expect(newState.status).toBe('streaming');
    });

    it('should create separate thinking entries when previous thinking is complete (multiple thinking blocks)', () => {
      // Start with a completed thinking event in the timeline
      const stateWithCompletedThinking = createMockState({
        thinkingContent: 'First thinking block',
        isThinkingComplete: true,
        processTimeline: [
          {
            type: 'thinking',
            id: 'thinking_1',
            content: 'First thinking block',
            timestamp: Date.now(),
            isComplete: true,
          },
        ],
      });

      // Send a new thinking event (starts a second thinking block)
      const event = createThinkingEvent('Second thinking block', false);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithCompletedThinking, action);

      // Should create a NEW thinking entry, not update the existing one
      expect(newState.processTimeline).toHaveLength(2);
      expect(newState.processTimeline[0].type).toBe('thinking');
      expect((newState.processTimeline[0] as { type: 'thinking'; content: string }).content).toBe('First thinking block');
      expect(newState.processTimeline[1].type).toBe('thinking');
      expect((newState.processTimeline[1] as { type: 'thinking'; content: string }).content).toBe('Second thinking block');
    });

    it('should append to same entry when previous thinking is incomplete (streaming within same block)', () => {
      // Start with an incomplete thinking event in the timeline
      const stateWithIncompleteThinking = createMockState({
        thinkingContent: 'First part ',
        isThinkingComplete: false,
        processTimeline: [
          {
            type: 'thinking',
            id: 'thinking_1',
            content: 'First part ',
            timestamp: Date.now(),
            isComplete: false,
          },
        ],
      });

      // Send more content for the same thinking block
      const event = createThinkingEvent('second part', false);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithIncompleteThinking, action);

      // Should update the SAME thinking entry, not create a new one
      expect(newState.processTimeline).toHaveLength(1);
      expect(newState.processTimeline[0].type).toBe('thinking');
      expect((newState.processTimeline[0] as { type: 'thinking'; content: string }).content).toBe('First part second part');
      expect(newState.thinkingContent).toBe('First part second part');
    });
  });

  // ============================================
  // content:thinking:end Event Tests
  // ============================================
  describe('content:thinking:end event', () => {
    it('should mark thinking as complete', () => {
      const stateWithThinking = createMockState({
        thinkingContent: 'Some thinking',
        isThinkingComplete: false,
      });

      const event = createThinkingEndEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithThinking, action);

      expect(newState.isThinkingComplete).toBe(true);
    });

    it('should preserve thinking content', () => {
      const stateWithThinking = createMockState({ thinkingContent: 'Preserved' });
      const event = createThinkingEndEvent();
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithThinking, action);

      expect(newState.thinkingContent).toBe('Preserved');
    });
  });

  // ============================================
  // tool:start Event Tests
  // ============================================
  describe('tool:start event', () => {
    it('should add tool to activeTools', () => {
      const event = createToolStartEvent('search_notes', '{"query":"test"}', 'tool_1');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.activeTools.size).toBe(1);
      expect(newState.activeTools.has('tool_1')).toBe(true);
    });

    it('should set tool execution details', () => {
      const event = createToolStartEvent('search_notes', '{"query":"test"}', 'tool_1');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      const tool = newState.activeTools.get('tool_1');
      expect(tool?.tool).toBe('search_notes');
      expect(tool?.arguments).toBe('{"query":"test"}');
      expect(tool?.status).toBe('executing');
      expect(tool?.startedAt).toBeDefined();
    });

    it('should transition to tool-execution phase', () => {
      const event = createToolStartEvent('test_tool', '{}');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.phase).toBe('tool-execution');
      expect(newState.status).toBe('streaming');
    });

    it('should allow multiple concurrent tools', () => {
      let state = initialState;

      const event1 = createToolStartEvent('tool_a', '{}', 'id_1');
      state = streamReducer(state, { type: 'EVENT', event: event1 });

      const event2 = createToolStartEvent('tool_b', '{}', 'id_2');
      state = streamReducer(state, { type: 'EVENT', event: event2 });

      expect(state.activeTools.size).toBe(2);
      expect(state.activeTools.has('id_1')).toBe(true);
      expect(state.activeTools.has('id_2')).toBe(true);
    });
  });

  // ============================================
  // tool:end Event Tests
  // ============================================
  describe('tool:end event', () => {
    it('should move tool from active to completed', () => {
      const tool = createMockToolExecution({ id: 'tool_1', tool: 'search_notes' });
      const stateWithTool = createToolExecutionState(tool);

      const event = createToolEndEvent('search_notes', '["result"]', 'tool_1', true);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithTool, action);

      expect(newState.activeTools.size).toBe(0);
      expect(newState.completedTools).toHaveLength(1);
      expect(newState.completedTools[0].tool).toBe('search_notes');
      expect(newState.completedTools[0].result).toBe('["result"]');
      expect(newState.completedTools[0].status).toBe('completed');
    });

    it('should mark failed tools correctly', () => {
      const tool = createMockToolExecution({ id: 'tool_1', tool: 'test_tool' });
      const stateWithTool = createToolExecutionState(tool);

      const event = createToolEndEvent('test_tool', 'Error', 'tool_1', false);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithTool, action);

      expect(newState.completedTools[0].status).toBe('failed');
    });

    it('should transition back to streaming when no more active tools', () => {
      const tool = createMockToolExecution({ id: 'tool_1' });
      const stateWithTool = createToolExecutionState(tool);

      const event = createToolEndEvent('search_notes', 'result', 'tool_1');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithTool, action);

      expect(newState.phase).toBe('streaming');
    });

    it('should stay in tool-execution phase with remaining active tools', () => {
      const tool1 = createMockToolExecution({ id: 'tool_1', tool: 'tool_a' });
      const tool2 = createMockToolExecution({ id: 'tool_2', tool: 'tool_b' });

      const activeTools = new Map();
      activeTools.set('tool_1', tool1);
      activeTools.set('tool_2', tool2);

      const stateWithTools = createMockState({
        phase: 'tool-execution',
        status: 'streaming',
        activeTools,
      });

      const event = createToolEndEvent('tool_a', 'result', 'tool_1');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithTools, action);

      expect(newState.phase).toBe('tool-execution');
      expect(newState.activeTools.size).toBe(1);
      expect(newState.activeTools.has('tool_2')).toBe(true);
    });

    it('should find tool by name if ID does not match', () => {
      const tool = createMockToolExecution({ id: 'tool_1', tool: 'search_notes' });
      const stateWithTool = createToolExecutionState(tool);

      // Event has different ID but same tool name
      const event = createToolEndEvent('search_notes', 'result', 'different_id');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithTool, action);

      expect(newState.activeTools.size).toBe(0);
      expect(newState.completedTools).toHaveLength(1);
    });

    it('should set completedAt timestamp', () => {
      const tool = createMockToolExecution({ id: 'tool_1' });
      const stateWithTool = createToolExecutionState(tool);

      const event = createToolEndEvent('search_notes', 'result', 'tool_1');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithTool, action);

      expect(newState.completedTools[0].completedAt).toBeDefined();
    });
  });

  // ============================================
  // rag:context Event Tests
  // ============================================
  describe('rag:context event', () => {
    it('should set RAG context notes', () => {
      const notes = [createMockRagNote({ noteId: 'note_1' }), createMockRagNote({ noteId: 'note_2' })];
      const event = createRagContextEvent(notes, 'rag-log-1');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.ragContext).toHaveLength(2);
      expect(newState.ragContext[0].noteId).toBe('note_1');
      expect(newState.ragLogId).toBe('rag-log-1');
    });

    it('should replace existing RAG context', () => {
      const oldNotes = [createMockRagNote({ noteId: 'old' })];
      const stateWithRag = createMockState({ ragContext: oldNotes });

      const newNotes = [createMockRagNote({ noteId: 'new' })];
      const event = createRagContextEvent(newNotes);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithRag, action);

      expect(newState.ragContext).toHaveLength(1);
      expect(newState.ragContext[0].noteId).toBe('new');
    });

    it('should preserve ragLogId if not in event', () => {
      const stateWithRagLog = createMockState({ ragLogId: 'existing-log' });
      const event = createRagContextEvent([]);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(stateWithRagLog, action);

      expect(newState.ragLogId).toBe('existing-log');
    });
  });

  // ============================================
  // grounding:sources Event Tests
  // ============================================
  describe('grounding:sources event', () => {
    it('should set grounding sources', () => {
      const sources = [createMockGroundingSource({ uri: 'https://test.com' })];
      const event = createGroundingEvent(sources);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.groundingSources).toHaveLength(1);
      expect(newState.groundingSources[0].uri).toBe('https://test.com');
    });
  });

  // ============================================
  // code:execution Event Tests
  // ============================================
  describe('code:execution event', () => {
    it('should set code execution result', () => {
      const result = createMockCodeExecutionResult({ code: 'print(1)', output: '1' });
      const event = createCodeExecutionEvent(result);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.codeExecution).toBeDefined();
      expect(newState.codeExecution?.code).toBe('print(1)');
      expect(newState.codeExecution?.output).toBe('1');
    });
  });

  // ============================================
  // status:update Event Tests
  // ============================================
  describe('status:update event', () => {
    it('should set processing status', () => {
      const event = createStatusEvent('Searching notes...');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.processingStatus).toBe('Searching notes...');
    });
  });

  // ============================================
  // grok:search Event Tests
  // ============================================
  describe('grok:search event', () => {
    it('should set Grok search sources', () => {
      const sources = [createMockGrokSearchSource({ url: 'https://x.com/1' })];
      const event = createGrokSearchEvent(sources);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.grokSearchSources).toHaveLength(1);
      expect(newState.grokSearchSources[0].url).toBe('https://x.com/1');
    });
  });

  // ============================================
  // grok:thinking Event Tests
  // ============================================
  describe('grok:thinking event', () => {
    it('should append Grok thinking step', () => {
      const step = createMockGrokThinkingStep({ step: 1, thought: 'Step 1' });
      const event = createGrokThinkingEvent(step);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.grokThinkingSteps).toHaveLength(1);
      expect(newState.grokThinkingSteps[0].thought).toBe('Step 1');
    });

    it('should accumulate multiple thinking steps', () => {
      let state = initialState;

      const step1 = createMockGrokThinkingStep({ step: 1 });
      state = streamReducer(state, { type: 'EVENT', event: createGrokThinkingEvent(step1) });

      const step2 = createMockGrokThinkingStep({ step: 2 });
      state = streamReducer(state, { type: 'EVENT', event: createGrokThinkingEvent(step2) });

      expect(state.grokThinkingSteps).toHaveLength(2);
    });
  });

  // ============================================
  // Image Generation Event Tests
  // ============================================
  describe('image:start event', () => {
    it('should transition to image-generation phase', () => {
      const event = createImageStartEvent('OpenAI', 'dall-e-3', 'A sunset');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.phase).toBe('image-generation');
      expect(newState.status).toBe('streaming');
    });

    it('should set image generation state', () => {
      const event = createImageStartEvent('OpenAI', 'dall-e-3', 'A sunset');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.imageGeneration.inProgress).toBe(true);
      expect(newState.imageGeneration.provider).toBe('OpenAI');
      expect(newState.imageGeneration.model).toBe('dall-e-3');
      expect(newState.imageGeneration.prompt).toBe('A sunset');
      expect(newState.imageGeneration.stage).toBe('preparing');
    });

    it('should set processing status', () => {
      const event = createImageStartEvent('OpenAI', 'dall-e-3', 'prompt');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(initialState, action);

      expect(newState.processingStatus).toBe('Preparing image generation...');
    });
  });

  describe('image:progress event', () => {
    it('should update image generation stage', () => {
      const imageState = createImageGenerationState({ stage: 'preparing' });
      const event = createImageProgressEvent('generating', 50);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.imageGeneration.stage).toBe('generating');
      expect(newState.imageGeneration.progress).toBe(50);
    });

    it('should update processing status based on stage', () => {
      const imageState = createImageGenerationState({ stage: 'preparing' });
      const event = createImageProgressEvent('processing');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.processingStatus).toBe('Processing generated image...');
    });

    it('should preserve existing progress if not in event', () => {
      const imageState = createImageGenerationState({ progress: 75 });
      const event = createImageProgressEvent('processing');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.imageGeneration.progress).toBe(75);
    });
  });

  describe('image:complete event', () => {
    it('should transition to complete phase', () => {
      const imageState = createImageGenerationState({ stage: 'processing' });
      const images = [{ base64Data: 'abc', mediaType: 'image/png' }];
      const event = createImageCompleteEvent(images);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.phase).toBe('complete');
      expect(newState.status).toBe('complete');
    });

    it('should set generated images', () => {
      const imageState = createImageGenerationState();
      const images = [
        { base64Data: 'img1', mediaType: 'image/png' },
        { base64Data: 'img2', mediaType: 'image/jpeg' },
      ];
      const event = createImageCompleteEvent(images);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.imageGeneration.images).toHaveLength(2);
      expect(newState.imageGeneration.inProgress).toBe(false);
      expect(newState.imageGeneration.stage).toBe('complete');
      expect(newState.imageGeneration.progress).toBe(100);
    });

    it('should calculate duration', () => {
      const imageState = createImageGenerationState();
      imageState.startTime = Date.now() - 2000;

      const event = createImageCompleteEvent([]);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.duration).toBeGreaterThanOrEqual(2000);
    });

    it('should clear processing status', () => {
      const imageState = createImageGenerationState();
      imageState.processingStatus = 'Generating...';

      const event = createImageCompleteEvent([]);
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.processingStatus).toBeNull();
    });
  });

  describe('image:error event', () => {
    it('should transition to error phase', () => {
      const imageState = createImageGenerationState();
      const event = createImageErrorEvent('Content policy violation');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.phase).toBe('error');
      expect(newState.status).toBe('error');
    });

    it('should set image generation error', () => {
      const imageState = createImageGenerationState();
      const event = createImageErrorEvent('Failed to generate');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.imageGeneration.inProgress).toBe(false);
      expect(newState.imageGeneration.stage).toBe('error');
      expect(newState.imageGeneration.error).toBe('Failed to generate');
    });

    it('should also set main error state', () => {
      const imageState = createImageGenerationState();
      const event = createImageErrorEvent('API error');
      const action: StreamAction = { type: 'EVENT', event };
      const newState = streamReducer(imageState, action);

      expect(newState.error).toBeDefined();
      expect(newState.error?.message).toBe('API error');
      expect(newState.error?.recoverable).toBe(false);
    });
  });

  // ============================================
  // Helper Function Tests
  // ============================================
  describe('helper functions', () => {
    describe('isStreamActive', () => {
      it('should return true for connecting phase', () => {
        const state = createMockState({ phase: 'connecting' });
        expect(isStreamActive(state)).toBe(true);
      });

      it('should return true for streaming phase', () => {
        const state = createMockState({ phase: 'streaming' });
        expect(isStreamActive(state)).toBe(true);
      });

      it('should return true for tool-execution phase', () => {
        const state = createMockState({ phase: 'tool-execution' });
        expect(isStreamActive(state)).toBe(true);
      });

      it('should return true for image-generation phase', () => {
        const state = createMockState({ phase: 'image-generation' });
        expect(isStreamActive(state)).toBe(true);
      });

      it('should return true for finalizing phase', () => {
        const state = createMockState({ phase: 'finalizing' });
        expect(isStreamActive(state)).toBe(true);
      });

      it('should return false for idle phase', () => {
        const state = createMockState({ phase: 'idle' });
        expect(isStreamActive(state)).toBe(false);
      });

      it('should return false for complete phase', () => {
        const state = createMockState({ phase: 'complete' });
        expect(isStreamActive(state)).toBe(false);
      });

      it('should return false for error phase', () => {
        const state = createMockState({ phase: 'error' });
        expect(isStreamActive(state)).toBe(false);
      });
    });

    describe('hasStreamContent', () => {
      it('should return false for empty state', () => {
        expect(hasStreamContent(initialState)).toBe(false);
      });

      it('should return true with text content', () => {
        const state = createMockState({ textContent: 'Hello' });
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true with thinking content', () => {
        const state = createMockState({ thinkingContent: 'Thinking...' });
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true with completed tools', () => {
        const state = createMockState({
          completedTools: [createMockToolExecution({ status: 'completed' })],
        });
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true with active tools', () => {
        const tool = createMockToolExecution();
        const activeTools = new Map();
        activeTools.set(tool.id, tool);
        const state = createMockState({ activeTools });
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true with RAG context', () => {
        const state = createMockState({ ragContext: [createMockRagNote()] });
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true with grounding sources', () => {
        const state = createMockState({ groundingSources: [createMockGroundingSource()] });
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true with Grok search sources', () => {
        const state = createMockState({ grokSearchSources: [createMockGrokSearchSource()] });
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true with code execution', () => {
        const state = createMockState({ codeExecution: createMockCodeExecutionResult() });
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true when image generation in progress', () => {
        const state = createImageGenerationState();
        expect(hasStreamContent(state)).toBe(true);
      });

      it('should return true with generated images', () => {
        const state = createMockState({
          imageGeneration: {
            inProgress: false,
            provider: null,
            model: null,
            prompt: null,
            stage: 'complete',
            progress: 100,
            images: [{ mediaType: 'image/png' }],
            error: null,
          },
        });
        expect(hasStreamContent(state)).toBe(true);
      });
    });

    describe('isImageGenerationActive', () => {
      it('should return true in image-generation phase', () => {
        const state = createMockState({ phase: 'image-generation' });
        expect(isImageGenerationActive(state)).toBe(true);
      });

      it('should return true when imageGeneration.inProgress is true', () => {
        const state = createImageGenerationState();
        expect(isImageGenerationActive(state)).toBe(true);
      });

      it('should return false in idle state', () => {
        expect(isImageGenerationActive(initialState)).toBe(false);
      });

      it('should return false in streaming phase without image generation', () => {
        const state = createStreamingState();
        expect(isImageGenerationActive(state)).toBe(false);
      });
    });

    describe('getInitialStreamState', () => {
      it('should return a fresh initial state', () => {
        const state = getInitialStreamState();
        expect(state).toEqual(initialStreamState);
      });

      it('should return the same values as initialStreamState', () => {
        const state = getInitialStreamState();
        expect(state.phase).toBe('idle');
        expect(state.status).toBe('idle');
        expect(state.textContent).toBe('');
        expect(state.activeTools.size).toBe(0);
      });
    });
  });

  // ============================================
  // State Immutability Tests
  // ============================================
  describe('state immutability', () => {
    it('should not mutate the original state', () => {
      const originalState = createMockState({ textContent: 'original' });
      const originalText = originalState.textContent;

      const event = createTextEvent('new text');
      const newState = streamReducer(originalState, { type: 'EVENT', event });

      expect(originalState.textContent).toBe(originalText);
      expect(newState.textContent).toBe('originalnew text');
    });

    it('should not mutate activeTools map', () => {
      const tool = createMockToolExecution({ id: 'tool_1' });
      const stateWithTool = createToolExecutionState(tool);
      const originalSize = stateWithTool.activeTools.size;

      const event = createToolEndEvent('search_notes', 'result', 'tool_1');
      streamReducer(stateWithTool, { type: 'EVENT', event });

      expect(stateWithTool.activeTools.size).toBe(originalSize);
    });

    it('should not mutate completedTools array', () => {
      const originalState = createMockState({
        completedTools: [createMockToolExecution({ id: 'existing', status: 'completed' })],
      });
      const originalLength = originalState.completedTools.length;

      const tool = createMockToolExecution({ id: 'new_tool' });
      const stateWithTool = createToolExecutionState(tool);
      stateWithTool.completedTools = [...originalState.completedTools];

      const event = createToolEndEvent('search_notes', 'result', 'new_tool');
      streamReducer(stateWithTool, { type: 'EVENT', event });

      expect(originalState.completedTools.length).toBe(originalLength);
    });
  });
});
