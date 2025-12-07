/**
 * Test Utilities for Streaming Tests
 * 
 * Provides helper functions for building SSE messages, mock events,
 * and state factories for testing the streaming architecture.
 */

import type {
  StreamEvent,
  UnifiedStreamState,
  StreamToolExecution,
  ImageGenerationState,
  StreamPhase,
  StreamStatus,
  ImageGenerationStage,
} from '../types';
import { initialStreamState, initialImageGenerationState } from '../types';
import type { RagContextNote } from '../../../types/rag';
import type { GroundingSource, CodeExecutionResult, GrokSearchSource, GrokThinkingStep } from '../../../types/chat';

// ============================================
// SSE Message Builders
// ============================================

/**
 * Build a raw SSE message string
 */
export function buildSSEMessage(eventType: string, data: string): string {
  return `event: ${eventType}\ndata: ${data}\n\n`;
}

/**
 * Build multiple SSE messages into a single string
 */
export function buildSSEStream(...messages: Array<{ eventType: string; data: string }>): string {
  return messages.map(m => buildSSEMessage(m.eventType, m.data)).join('');
}

/**
 * Convert a string to Uint8Array for processor input
 */
export function stringToChunk(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Build a start event SSE message
 */
export function buildStartMessage(): string {
  return buildSSEMessage('start', '{"status":"streaming"}');
}

/**
 * Build a text message SSE message
 */
export function buildTextMessage(text: string): string {
  return buildSSEMessage('message', text);
}

/**
 * Build an end event SSE message
 */
export function buildEndMessage(ragLogId?: string, inputTokens?: number, outputTokens?: number): string {
  const data: Record<string, unknown> = {};
  if (ragLogId !== undefined) data.ragLogId = ragLogId;
  if (inputTokens !== undefined) data.inputTokens = inputTokens;
  if (outputTokens !== undefined) data.outputTokens = outputTokens;
  return buildSSEMessage('end', JSON.stringify(data));
}

/**
 * Build an error event SSE message
 */
export function buildErrorMessage(error: string, recoverable = false): string {
  return buildSSEMessage('error', JSON.stringify({ error, recoverable }));
}

/**
 * Build a tool_start event SSE message
 */
export function buildToolStartMessage(tool: string, args: string, id?: string): string {
  const data: Record<string, unknown> = { tool, arguments: args };
  if (id) data.id = id;
  return buildSSEMessage('tool_start', JSON.stringify(data));
}

/**
 * Build a tool_end event SSE message
 */
export function buildToolEndMessage(tool: string, result: string, id?: string, success = true): string {
  const data: Record<string, unknown> = { tool, result, success };
  if (id) data.id = id;
  return buildSSEMessage('tool_end', JSON.stringify(data));
}

/**
 * Build a thinking event SSE message
 */
export function buildThinkingMessage(content: string): string {
  return buildSSEMessage('thinking', JSON.stringify({ content }));
}

/**
 * Build a status event SSE message
 */
export function buildStatusMessage(status: string): string {
  return buildSSEMessage('status', JSON.stringify({ status }));
}

/**
 * Build a RAG context event SSE message
 */
export function buildRagMessage(notes: RagContextNote[], ragLogId?: string): string {
  const data: Record<string, unknown> = { retrievedNotes: notes };
  if (ragLogId) data.ragLogId = ragLogId;
  return buildSSEMessage('rag', JSON.stringify(data));
}

/**
 * Build a context_retrieval event SSE message (agent mode)
 */
export function buildContextRetrievalMessage(notes: RagContextNote[], ragLogId?: string): string {
  const data: Record<string, unknown> = { retrievedNotes: notes };
  if (ragLogId) data.ragLogId = ragLogId;
  return buildSSEMessage('context_retrieval', JSON.stringify(data));
}

/**
 * Build a grounding event SSE message
 */
export function buildGroundingMessage(sources: GroundingSource[]): string {
  return buildSSEMessage('grounding', JSON.stringify({ sources }));
}

/**
 * Build a code_execution event SSE message
 */
export function buildCodeExecutionMessage(result: CodeExecutionResult): string {
  return buildSSEMessage('code_execution', JSON.stringify(result));
}

/**
 * Build a grok_search event SSE message
 */
export function buildGrokSearchMessage(sources: GrokSearchSource[]): string {
  return buildSSEMessage('grok_search', JSON.stringify({ sources }));
}

/**
 * Build a grok_thinking event SSE message
 */
export function buildGrokThinkingMessage(step: GrokThinkingStep): string {
  return buildSSEMessage('grok_thinking', JSON.stringify(step));
}

// ============================================
// Mock Event Generators
// ============================================

/**
 * Create a mock stream:start event
 */
export function createStartEvent(timestamp = Date.now()): StreamEvent {
  return { type: 'stream:start', timestamp };
}

/**
 * Create a mock content:text event
 */
export function createTextEvent(delta: string): StreamEvent {
  return { type: 'content:text', delta };
}

/**
 * Create a mock stream:end event
 */
export function createEndEvent(options?: { ragLogId?: string; inputTokens?: number; outputTokens?: number }): StreamEvent {
  return { type: 'stream:end', ...options };
}

/**
 * Create a mock stream:error event
 */
export function createErrorEvent(error: string, recoverable = false): StreamEvent {
  return { type: 'stream:error', error, recoverable };
}

/**
 * Create a mock tool:start event
 */
export function createToolStartEvent(tool: string, args: string, toolId = `tool_${Date.now()}`): StreamEvent {
  return { type: 'tool:start', toolId, tool, args };
}

/**
 * Create a mock tool:end event
 */
export function createToolEndEvent(tool: string, result: string, toolId: string, success = true): StreamEvent {
  return { type: 'tool:end', toolId, tool, result, success };
}

/**
 * Create a mock content:thinking event
 */
export function createThinkingEvent(content: string, isComplete = false): StreamEvent {
  return { type: 'content:thinking', content, isComplete };
}

/**
 * Create a mock content:thinking:end event
 */
export function createThinkingEndEvent(): StreamEvent {
  return { type: 'content:thinking:end' };
}

/**
 * Create a mock rag:context event
 */
export function createRagContextEvent(notes: RagContextNote[], ragLogId?: string): StreamEvent {
  return { type: 'rag:context', notes, ragLogId };
}

/**
 * Create a mock grounding:sources event
 */
export function createGroundingEvent(sources: GroundingSource[]): StreamEvent {
  return { type: 'grounding:sources', sources };
}

/**
 * Create a mock code:execution event
 */
export function createCodeExecutionEvent(result: CodeExecutionResult): StreamEvent {
  return { type: 'code:execution', result };
}

/**
 * Create a mock status:update event
 */
export function createStatusEvent(status: string): StreamEvent {
  return { type: 'status:update', status };
}

/**
 * Create a mock grok:search event
 */
export function createGrokSearchEvent(sources: GrokSearchSource[]): StreamEvent {
  return { type: 'grok:search', sources };
}

/**
 * Create a mock grok:thinking event
 */
export function createGrokThinkingEvent(step: GrokThinkingStep): StreamEvent {
  return { type: 'grok:thinking', step };
}

/**
 * Create a mock image:start event
 */
export function createImageStartEvent(provider: string, model: string, prompt: string): StreamEvent {
  return { type: 'image:start', provider, model, prompt };
}

/**
 * Create a mock image:progress event
 */
export function createImageProgressEvent(stage: ImageGenerationStage, progress?: number): StreamEvent {
  return { type: 'image:progress', stage, progress };
}

/**
 * Create a mock image:complete event
 */
export function createImageCompleteEvent(images: Array<{ base64Data?: string; url?: string; mediaType: string }>): StreamEvent {
  return { type: 'image:complete', images };
}

/**
 * Create a mock image:error event
 */
export function createImageErrorEvent(error: string): StreamEvent {
  return { type: 'image:error', error };
}

// ============================================
// State Factory Functions
// ============================================

/**
 * Create a mock UnifiedStreamState with optional overrides
 */
export function createMockState(overrides: Partial<UnifiedStreamState> = {}): UnifiedStreamState {
  return {
    ...initialStreamState,
    ...overrides,
    activeTools: overrides.activeTools ?? new Map(),
    imageGeneration: {
      ...initialImageGenerationState,
      ...overrides.imageGeneration,
    },
  };
}

/**
 * Create a mock state in streaming phase
 */
export function createStreamingState(textContent = ''): UnifiedStreamState {
  return createMockState({
    phase: 'streaming',
    status: 'streaming',
    startTime: Date.now(),
    textContent,
  });
}

/**
 * Create a mock state with active tool
 */
export function createToolExecutionState(tool: StreamToolExecution): UnifiedStreamState {
  const activeTools = new Map<string, StreamToolExecution>();
  activeTools.set(tool.id, tool);
  return createMockState({
    phase: 'tool-execution',
    status: 'streaming',
    startTime: Date.now(),
    activeTools,
  });
}

/**
 * Create a mock state in image generation phase
 */
export function createImageGenerationState(
  imageGenOverrides: Partial<ImageGenerationState> = {}
): UnifiedStreamState {
  return createMockState({
    phase: 'image-generation',
    status: 'streaming',
    startTime: Date.now(),
    imageGeneration: {
      ...initialImageGenerationState,
      inProgress: true,
      ...imageGenOverrides,
    },
  });
}

/**
 * Create a mock state in error phase
 */
export function createErrorState(message: string, recoverable = false): UnifiedStreamState {
  return createMockState({
    phase: 'error',
    status: 'error',
    error: { message, recoverable },
  });
}

/**
 * Create a mock state in complete phase
 */
export function createCompleteState(textContent: string, duration = 1000): UnifiedStreamState {
  return createMockState({
    phase: 'complete',
    status: 'complete',
    textContent,
    duration,
    startTime: Date.now() - duration,
  });
}

// ============================================
// Mock Data Factories
// ============================================

/**
 * Create a mock RagContextNote
 */
export function createMockRagNote(overrides: Partial<RagContextNote> = {}): RagContextNote {
  return {
    noteId: `note_${Date.now()}`,
    title: 'Test Note',
    tags: ['test'],
    relevanceScore: 0.85,
    chunkContent: 'Test chunk content',
    content: 'Full test note content',
    chunkIndex: 0,
    ...overrides,
  };
}

/**
 * Create a mock GroundingSource
 */
export function createMockGroundingSource(overrides: Partial<GroundingSource> = {}): GroundingSource {
  return {
    uri: 'https://example.com/source',
    title: 'Test Source',
    snippet: 'Test snippet content',
    ...overrides,
  };
}

/**
 * Create a mock CodeExecutionResult
 */
export function createMockCodeExecutionResult(overrides: Partial<CodeExecutionResult> = {}): CodeExecutionResult {
  return {
    code: 'print("hello")',
    language: 'python',
    output: 'hello',
    success: true,
    ...overrides,
  };
}

/**
 * Create a mock GrokSearchSource
 */
export function createMockGrokSearchSource(overrides: Partial<GrokSearchSource> = {}): GrokSearchSource {
  return {
    url: 'https://x.com/status/123',
    title: 'Test Post',
    snippet: 'Test post content',
    sourceType: 'x_post',
    ...overrides,
  };
}

/**
 * Create a mock GrokThinkingStep
 */
export function createMockGrokThinkingStep(overrides: Partial<GrokThinkingStep> = {}): GrokThinkingStep {
  return {
    step: 1,
    thought: 'Analyzing the problem...',
    ...overrides,
  };
}

/**
 * Create a mock StreamToolExecution
 */
export function createMockToolExecution(overrides: Partial<StreamToolExecution> = {}): StreamToolExecution {
  return {
    id: `tool_${Date.now()}`,
    tool: 'search_notes',
    arguments: '{"query":"test"}',
    status: 'executing',
    startedAt: Date.now(),
    ...overrides,
  };
}

// ============================================
// Test Assertion Helpers
// ============================================

/**
 * Assert that a state is in a specific phase
 */
export function assertPhase(state: UnifiedStreamState, expectedPhase: StreamPhase): void {
  if (state.phase !== expectedPhase) {
    throw new Error(`Expected phase "${expectedPhase}" but got "${state.phase}"`);
  }
}

/**
 * Assert that a state has a specific status
 */
export function assertStatus(state: UnifiedStreamState, expectedStatus: StreamStatus): void {
  if (state.status !== expectedStatus) {
    throw new Error(`Expected status "${expectedStatus}" but got "${state.status}"`);
  }
}

/**
 * Assert that state has specific text content
 */
export function assertTextContent(state: UnifiedStreamState, expectedContent: string): void {
  if (state.textContent !== expectedContent) {
    throw new Error(`Expected textContent "${expectedContent}" but got "${state.textContent}"`);
  }
}
