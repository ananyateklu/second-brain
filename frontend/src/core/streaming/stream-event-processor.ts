/**
 * Stream Event Processor
 * 
 * Unified SSE parsing class that handles raw byte streams from both
 * chat and agent endpoints, converting them into typed StreamEvents.
 */

import type { RagContextNote } from '../../types/rag';
import type { GroundingSource, CodeExecutionResult, GrokSearchSource, GrokThinkingStep } from '../../types/chat';
import type { StreamEvent } from './types';

// ============================================
// SSE Parsing Utilities
// ============================================

/**
 * Unescape SSE data (handles newline escaping)
 */
function unescapeSSE(data: string): string {
  return data.replace(/\\n/g, '\n');
}

/**
 * Generate a unique tool ID if not provided
 */
function generateToolId(): string {
  return `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// Event Parsers
// ============================================

interface ToolStartData {
  tool: string;
  arguments: string;
  id?: string;
}

interface ToolEndData {
  tool: string;
  result: string;
  id?: string;
  success?: boolean;
}

interface ThinkingData {
  content: string;
  isComplete?: boolean;
}

interface StatusData {
  status: string;
}

interface RagData {
  retrievedNotes?: RagContextNote[];
  ragLogId?: string;
}

interface GroundingData {
  sources?: GroundingSource[];
}

interface CodeExecutionData {
  code?: string;
  language?: string;
  output?: string;
  success?: boolean;
  errorMessage?: string;
}

interface EndData {
  ragLogId?: string;
  inputTokens?: number;
  outputTokens?: number;
}

interface ErrorData {
  error?: string;
  recoverable?: boolean;
}

interface GrokSearchData {
  sources?: GrokSearchSource[];
}

interface GrokThinkingData {
  step?: number;
  thought?: string;
  conclusion?: string;
}

/**
 * Parse tool_start event data
 */
function parseToolStartEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as ToolStartData;
    if (typeof parsed.tool !== 'string' || typeof parsed.arguments !== 'string') {
      console.error('Invalid tool_start data:', data);
      return null;
    }
    return {
      type: 'tool:start',
      toolId: parsed.id || generateToolId(),
      tool: parsed.tool,
      args: parsed.arguments,
    };
  } catch (e) {
    console.error('Failed to parse tool_start data:', e);
    return null;
  }
}

/**
 * Parse tool_end event data
 */
function parseToolEndEvent(data: string, _activeToolName?: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as ToolEndData;
    if (typeof parsed.tool !== 'string' || typeof parsed.result !== 'string') {
      console.error('Invalid tool_end data:', data);
      return null;
    }
    return {
      type: 'tool:end',
      toolId: parsed.id || `tool_${parsed.tool}`,
      tool: parsed.tool,
      result: parsed.result,
      success: parsed.success !== false,
    };
  } catch (e) {
    console.error('Failed to parse tool_end data:', e);
    return null;
  }
}

/**
 * Parse thinking event data
 *
 * IMPORTANT: The backend only emits thinking events when it has a COMPLETE
 * thinking block (i.e., both <thinking> and </thinking> tags were found).
 * Therefore, thinking events from the backend are complete by default.
 *
 * The isComplete flag can be explicitly set to false for streaming partial
 * thinking content, but this is not currently used by the backend.
 */
function parseThinkingEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as ThinkingData;
    if (typeof parsed.content === 'string') {
      return {
        type: 'content:thinking',
        content: parsed.content,
        // Backend sends complete thinking blocks, so default to true
        // Can be overridden if backend explicitly sends isComplete: false
        isComplete: parsed.isComplete ?? true,
      };
    }
    // Fallback: treat raw data as thinking content (also complete)
    return {
      type: 'content:thinking',
      content: unescapeSSE(data),
      isComplete: true,
    };
  } catch {
    // Not JSON, treat as raw thinking content (also complete)
    return {
      type: 'content:thinking',
      content: unescapeSSE(data),
      isComplete: true,
    };
  }
}

/**
 * Parse status event data
 */
function parseStatusEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as StatusData;
    if (typeof parsed.status === 'string') {
      return {
        type: 'status:update',
        status: parsed.status,
      };
    }
    return null;
  } catch (e) {
    console.error('Failed to parse status data:', e);
    return null;
  }
}

/**
 * Parse RAG context event data (works for both 'rag' and 'context_retrieval' events)
 */
function parseRagEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as RagData;
    const notes = parsed.retrievedNotes || [];
    return {
      type: 'rag:context',
      notes,
      ragLogId: parsed.ragLogId,
    };
  } catch (e) {
    console.error('Failed to parse RAG data:', e);
    return null;
  }
}

/**
 * Parse grounding sources event data
 */
function parseGroundingEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as GroundingData;
    const sources: GroundingSource[] = (parsed.sources || []).map(s => ({
      uri: s.uri,
      title: s.title,
      snippet: s.snippet,
    }));
    return {
      type: 'grounding:sources',
      sources,
    };
  } catch (e) {
    console.error('Failed to parse grounding data:', e);
    return null;
  }
}

/**
 * Parse code execution event data
 */
function parseCodeExecutionEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as CodeExecutionData;
    const result: CodeExecutionResult = {
      code: parsed.code || '',
      language: parsed.language || 'python',
      output: parsed.output || '',
      success: parsed.success ?? true,
      errorMessage: parsed.errorMessage,
    };
    return {
      type: 'code:execution',
      result,
    };
  } catch (e) {
    console.error('Failed to parse code_execution data:', e);
    return null;
  }
}

/**
 * Parse end event data
 */
function parseEndEvent(data: string): StreamEvent {
  if (!data) {
    return { type: 'stream:end' };
  }
  try {
    const parsed = JSON.parse(data) as EndData;
    return {
      type: 'stream:end',
      ragLogId: parsed.ragLogId,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
    };
  } catch {
    return { type: 'stream:end' };
  }
}

/**
 * Parse error event data
 */
function parseErrorEvent(data: string): StreamEvent {
  if (!data) {
    return { type: 'stream:error', error: 'Unknown error', recoverable: false };
  }
  try {
    const parsed = JSON.parse(data) as ErrorData;
    return {
      type: 'stream:error',
      error: parsed.error || 'Unknown error',
      recoverable: parsed.recoverable ?? false,
    };
  } catch {
    return {
      type: 'stream:error',
      error: data,
      recoverable: false,
    };
  }
}

/**
 * Parse Grok search sources event data
 */
function parseGrokSearchEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as GrokSearchData;
    return {
      type: 'grok:search',
      sources: parsed.sources || [],
    };
  } catch (e) {
    console.error('Failed to parse Grok search data:', e);
    return null;
  }
}

/**
 * Parse Grok thinking step event data
 */
function parseGrokThinkingEvent(data: string): StreamEvent | null {
  try {
    const parsed = JSON.parse(data) as GrokThinkingData;
    const step: GrokThinkingStep = {
      step: parsed.step || 0,
      thought: parsed.thought || '',
      conclusion: parsed.conclusion,
    };
    return {
      type: 'grok:thinking',
      step,
    };
  } catch (e) {
    console.error('Failed to parse Grok thinking data:', e);
    return null;
  }
}

// ============================================
// Stream Event Processor Class
// ============================================

/**
 * Options for the StreamEventProcessor
 */
export interface StreamEventProcessorOptions {
  /** Callback for each parsed event */
  onEvent?: (event: StreamEvent) => void;
  /** Callback for parse errors */
  onParseError?: (error: Error, rawMessage: string) => void;
}

/**
 * StreamEventProcessor
 * 
 * Parses raw SSE byte streams into typed StreamEvents.
 * Handles buffering for partial messages and maps backend event types
 * to the unified frontend event schema.
 */
export class StreamEventProcessor {
  private buffer = '';
  private decoder = new TextDecoder();
  private options: StreamEventProcessorOptions;
  private lastActiveToolName: string | null = null;

  constructor(options: StreamEventProcessorOptions = {}) {
    this.options = options;
  }

  /**
   * Process a raw chunk of bytes from the stream
   * @param chunk - Raw bytes from the response body
   * @returns Array of parsed StreamEvents
   */
  processChunk(chunk: Uint8Array): StreamEvent[] {
    // Decode chunk and add to buffer
    this.buffer += this.decoder.decode(chunk, { stream: true });

    // Extract and parse complete SSE messages
    return this.extractEvents();
  }

  /**
   * Flush any remaining data in the buffer
   * Call this when the stream ends to process any final partial messages
   */
  flush(): StreamEvent[] {
    if (this.buffer.trim()) {
      const events = this.parseMessage(this.buffer);
      this.buffer = '';
      return events;
    }
    return [];
  }

  /**
   * Reset the processor state
   */
  reset(): void {
    this.buffer = '';
    this.lastActiveToolName = null;
  }

  /**
   * Extract complete SSE messages from the buffer
   */
  private extractEvents(): StreamEvent[] {
    const events: StreamEvent[] = [];

    // SSE messages are separated by double newlines
    const messages = this.buffer.split('\n\n');

    // Keep the last (potentially incomplete) message in the buffer
    this.buffer = messages.pop() || '';

    // Parse each complete message
    for (const message of messages) {
      if (!message.trim()) continue;

      try {
        const parsedEvents = this.parseMessage(message);
        for (const event of parsedEvents) {
          events.push(event);
          this.options.onEvent?.(event);
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error, message);
        this.options.onParseError?.(error as Error, message);
      }
    }

    return events;
  }

  /**
   * Parse a single SSE message into events
   */
  private parseMessage(message: string): StreamEvent[] {
    const events: StreamEvent[] = [];
    const lines = message.split('\n');

    let eventType = 'message';
    let data = '';

    // Parse SSE format: event: <type>\ndata: <data>
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.substring(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.substring(6);
      } else if (line.startsWith(':')) {
        // SSE comment, ignore
        continue;
      }
    }

    // Convert backend event to StreamEvent
    const event = this.createEvent(eventType, data);
    if (event) {
      events.push(event);

      // Track active tool for matching tool_end events
      if (event.type === 'tool:start') {
        this.lastActiveToolName = event.tool;
      } else if (event.type === 'tool:end') {
        this.lastActiveToolName = null;
      }
    }

    return events;
  }

  /**
   * Create a StreamEvent from backend event type and data
   */
  private createEvent(eventType: string, data: string): StreamEvent | null {
    switch (eventType) {
      case 'start':
        return { type: 'stream:start', timestamp: Date.now() };

      case 'message':
      case 'data':
        if (data) {
          return { type: 'content:text', delta: unescapeSSE(data) };
        }
        return null;

      case 'thinking':
        return parseThinkingEvent(data);

      case 'tool_start':
        return parseToolStartEvent(data);

      case 'tool_end':
        return parseToolEndEvent(data, this.lastActiveToolName || undefined);

      case 'status':
        return parseStatusEvent(data);

      case 'rag':
      case 'context_retrieval':
        return parseRagEvent(data);

      case 'grounding':
        return parseGroundingEvent(data);

      case 'code_execution':
        return parseCodeExecutionEvent(data);

      case 'grok_search':
        return parseGrokSearchEvent(data);

      case 'grok_thinking':
        return parseGrokThinkingEvent(data);

      case 'end':
        return parseEndEvent(data);

      case 'error':
        return parseErrorEvent(data);

      default:
        // Unknown event type - try to handle as text if there's data
        if (data && eventType === 'message') {
          return { type: 'content:text', delta: unescapeSSE(data) };
        }
        console.warn('Unknown SSE event type:', eventType, data);
        return null;
    }
  }
}

/**
 * Create a new StreamEventProcessor instance
 */
export function createStreamEventProcessor(options?: StreamEventProcessorOptions): StreamEventProcessor {
  return new StreamEventProcessor(options);
}
