/**
 * Stream Performance Benchmarks
 *
 * Benchmarks for measuring the performance of streaming components:
 * - SSE parsing throughput
 * - State reducer performance
 * - Memory efficiency for large streams
 */

import { describe, bench, beforeEach } from 'vitest';
import { StreamEventProcessor } from '../stream-event-processor';
import { streamReducer, getInitialStreamState } from '../stream-reducer';
import type { UnifiedStreamState, StreamEvent } from '../types';
import {
  buildStartMessage,
  buildTextMessage,
  buildEndMessage,
  buildToolStartMessage,
  buildToolEndMessage,
  buildThinkingMessage,
  buildRagMessage,
  stringToChunk,
  createMockRagNote,
  createTextEvent,
  createToolStartEvent,
  createToolEndEvent,
  createThinkingEvent,
} from './test-utils';

// ============================================
// SSE Parsing Benchmarks
// ============================================

describe('StreamEventProcessor Performance', () => {
  let processor: StreamEventProcessor;

  beforeEach(() => {
    processor = new StreamEventProcessor();
  });

  bench('parse single text event', () => {
    processor.reset();
    processor.processChunk(stringToChunk(buildTextMessage('Hello World')));
  });

  bench('parse 10 text events in single chunk', () => {
    processor.reset();
    const messages = Array(10).fill(null).map((_, i) => buildTextMessage(`Message ${i}`)).join('');
    processor.processChunk(stringToChunk(messages));
  });

  bench('parse 100 text events in single chunk', () => {
    processor.reset();
    const messages = Array(100).fill(null).map((_, i) => buildTextMessage(`Message ${i}`)).join('');
    processor.processChunk(stringToChunk(messages));
  });

  bench('parse complete stream (start, 50 texts, end)', () => {
    processor.reset();
    const messages = [
      buildStartMessage(),
      ...Array(50).fill(null).map((_, i) => buildTextMessage(`Chunk ${i}`)),
      buildEndMessage('log-1', 100, 500),
    ].join('');
    processor.processChunk(stringToChunk(messages));
  });

  bench('parse stream with tools (start, 5 tools, end)', () => {
    processor.reset();
    const toolMessages: string[] = [];
    for (let i = 0; i < 5; i++) {
      toolMessages.push(buildToolStartMessage(`tool_${i}`, `{"arg":${i}}`, `id_${i}`));
      toolMessages.push(buildToolEndMessage(`tool_${i}`, `result_${i}`, `id_${i}`));
    }
    const messages = [
      buildStartMessage(),
      ...toolMessages,
      buildEndMessage(),
    ].join('');
    processor.processChunk(stringToChunk(messages));
  });

  bench('parse stream with thinking and RAG', () => {
    processor.reset();
    const notes = Array(5).fill(null).map((_, i) =>
      createMockRagNote({ noteId: `note_${i}`, title: `Note ${i}` })
    );
    const messages = [
      buildStartMessage(),
      buildThinkingMessage('Analyzing the user query and searching for relevant information...'),
      buildRagMessage(notes, 'rag-log-123'),
      ...Array(20).fill(null).map((_, i) => buildTextMessage(`Response chunk ${i}`)),
      buildEndMessage('log-1', 200, 800),
    ].join('');
    processor.processChunk(stringToChunk(messages));
  });

  bench('parse large text chunks (1KB each)', () => {
    processor.reset();
    const largeText = 'A'.repeat(1024);
    const messages = Array(10).fill(null).map(() => buildTextMessage(largeText)).join('');
    processor.processChunk(stringToChunk(messages));
  });

  bench('incremental chunk processing (simulating real streaming)', () => {
    processor.reset();
    const fullMessage = buildStartMessage() +
      Array(20).fill(null).map((_, i) => buildTextMessage(`Word${i} `)).join('') +
      buildEndMessage();

    // Simulate receiving data in small chunks (like real SSE)
    const encoder = new TextEncoder();
    const encoded = encoder.encode(fullMessage);
    const chunkSize = 64; // 64 bytes per chunk

    for (let i = 0; i < encoded.length; i += chunkSize) {
      processor.processChunk(encoded.slice(i, i + chunkSize));
    }
  });
});

// ============================================
// State Reducer Benchmarks
// ============================================

describe('streamReducer Performance', () => {
  let initialState: UnifiedStreamState;

  beforeEach(() => {
    initialState = getInitialStreamState();
  });

  bench('CONNECT action', () => {
    streamReducer(initialState, { type: 'CONNECT' });
  });

  bench('RESET action', () => {
    const stateWithContent: UnifiedStreamState = {
      ...initialState,
      textContent: 'Some content',
      thinkingContent: 'Thinking...',
      completedTools: [],
    };
    streamReducer(stateWithContent, { type: 'RESET' });
  });

  bench('process single text event', () => {
    const event = createTextEvent('Hello');
    streamReducer(initialState, { type: 'EVENT', event });
  });

  bench('process 100 text events sequentially', () => {
    let state = initialState;
    for (let i = 0; i < 100; i++) {
      const event = createTextEvent(`Word${i} `);
      state = streamReducer(state, { type: 'EVENT', event });
    }
  });

  bench('process tool start/end pair', () => {
    let state = initialState;
    const startEvent = createToolStartEvent('test_tool', '{}', 'tool_1');
    state = streamReducer(state, { type: 'EVENT', event: startEvent });

    const endEvent = createToolEndEvent('test_tool', 'result', 'tool_1');
    streamReducer(state, { type: 'EVENT', event: endEvent });
  });

  bench('process 10 sequential tool executions', () => {
    let state = initialState;
    for (let i = 0; i < 10; i++) {
      const startEvent = createToolStartEvent(`tool_${i}`, '{}', `id_${i}`);
      state = streamReducer(state, { type: 'EVENT', event: startEvent });

      const endEvent = createToolEndEvent(`tool_${i}`, `result_${i}`, `id_${i}`);
      state = streamReducer(state, { type: 'EVENT', event: endEvent });
    }
  });

  bench('process thinking event', () => {
    const event = createThinkingEvent('Analyzing the problem and considering multiple approaches...');
    streamReducer(initialState, { type: 'EVENT', event });
  });

  bench('accumulate text content (1000 characters)', () => {
    let state = initialState;
    const chars = 'ABCDEFGHIJ';
    for (let i = 0; i < 100; i++) {
      const event = createTextEvent(chars);
      state = streamReducer(state, { type: 'EVENT', event });
    }
  });

  bench('full stream lifecycle (start -> 50 texts -> end)', () => {
    let state = initialState;

    // Start
    state = streamReducer(state, { type: 'EVENT', event: { type: 'stream:start', timestamp: Date.now() } });

    // Text events
    for (let i = 0; i < 50; i++) {
      const event = createTextEvent(`Chunk ${i} `);
      state = streamReducer(state, { type: 'EVENT', event });
    }

    // End
    streamReducer(state, {
      type: 'EVENT',
      event: { type: 'stream:end', ragLogId: 'log-1', inputTokens: 100, outputTokens: 500 },
    });
  });

  bench('complex stream (start, RAG, thinking, 5 tools, 30 texts, end)', () => {
    let state = initialState;

    // Start
    state = streamReducer(state, { type: 'EVENT', event: { type: 'stream:start', timestamp: Date.now() } });

    // RAG context
    const notes = Array(5).fill(null).map((_, i) =>
      createMockRagNote({ noteId: `note_${i}` })
    );
    state = streamReducer(state, {
      type: 'EVENT',
      event: { type: 'rag:context', notes, ragLogId: 'rag-1' },
    });

    // Thinking
    state = streamReducer(state, {
      type: 'EVENT',
      event: createThinkingEvent('Deep analysis in progress...'),
    });

    // Tools
    for (let i = 0; i < 5; i++) {
      const startEvent = createToolStartEvent(`tool_${i}`, '{}', `id_${i}`);
      state = streamReducer(state, { type: 'EVENT', event: startEvent });

      const endEvent = createToolEndEvent(`tool_${i}`, `result_${i}`, `id_${i}`);
      state = streamReducer(state, { type: 'EVENT', event: endEvent });
    }

    // Text
    for (let i = 0; i < 30; i++) {
      const event = createTextEvent(`Response part ${i} `);
      state = streamReducer(state, { type: 'EVENT', event });
    }

    // End
    streamReducer(state, {
      type: 'EVENT',
      event: { type: 'stream:end', inputTokens: 500, outputTokens: 2000 },
    });
  });
});

// ============================================
// Memory Efficiency Benchmarks
// ============================================

describe('Memory Efficiency', () => {
  bench('large text accumulation (10KB)', () => {
    let state = getInitialStreamState();
    const largeChunk = 'X'.repeat(1000);

    for (let i = 0; i < 10; i++) {
      const event = createTextEvent(largeChunk);
      state = streamReducer(state, { type: 'EVENT', event });
    }
  });

  bench('many small text events (1000 events)', () => {
    let state = getInitialStreamState();

    for (let i = 0; i < 1000; i++) {
      const event = createTextEvent('W');
      state = streamReducer(state, { type: 'EVENT', event });
    }
  });

  bench('many tool executions (100 tools)', () => {
    let state = getInitialStreamState();

    for (let i = 0; i < 100; i++) {
      const startEvent = createToolStartEvent(`tool_${i}`, '{}', `id_${i}`);
      state = streamReducer(state, { type: 'EVENT', event: startEvent });

      const endEvent = createToolEndEvent(`tool_${i}`, `result`, `id_${i}`);
      state = streamReducer(state, { type: 'EVENT', event: endEvent });
    }
  });

  bench('large RAG context (50 notes)', () => {
    const state = getInitialStreamState();
    const notes = Array(50).fill(null).map((_, i) =>
      createMockRagNote({
        noteId: `note_${i}`,
        title: `Note ${i} with a longer title`,
        chunkContent: 'This is a longer chunk content that simulates real note content. '.repeat(5),
      })
    );

    const event: StreamEvent = { type: 'rag:context', notes, ragLogId: 'rag-1' };
    streamReducer(state, { type: 'EVENT', event });
  });
});

// ============================================
// End-to-End Streaming Simulation
// ============================================

describe('End-to-End Streaming Simulation', () => {
  bench('simulate complete chat stream', () => {
    const processor = new StreamEventProcessor();
    let state = getInitialStreamState();

    processor.reset();

    // Build complete stream
    const streamContent = [
      buildStartMessage(),
      ...Array(30).fill(null).map((_, i) => buildTextMessage(`Token ${i} `)),
      buildEndMessage('log-1', 50, 300),
    ].join('');

    // Process and dispatch events
    const events = processor.processChunk(stringToChunk(streamContent));
    for (const event of events) {
      state = streamReducer(state, { type: 'EVENT', event });
    }
  });

  bench('simulate agent stream with tools', () => {
    const processor = new StreamEventProcessor();
    let state = getInitialStreamState();

    processor.reset();

    // Build agent stream with tools
    const toolPairs: string[] = [];
    for (let i = 0; i < 3; i++) {
      toolPairs.push(
        buildToolStartMessage(`search_notes`, `{"query":"query${i}"}`, `tool_${i}`),
        buildToolEndMessage(`search_notes`, `[{"title":"Result ${i}"}]`, `tool_${i}`)
      );
    }

    const streamContent = [
      buildStartMessage(),
      buildThinkingMessage('Planning the approach...'),
      ...toolPairs,
      ...Array(20).fill(null).map((_, i) => buildTextMessage(`Response ${i} `)),
      buildEndMessage(),
    ].join('');

    // Process and dispatch events
    const events = processor.processChunk(stringToChunk(streamContent));
    for (const event of events) {
      state = streamReducer(state, { type: 'EVENT', event });
    }
  });

  bench('simulate real-time chunked delivery', () => {
    const processor = new StreamEventProcessor();
    let state = getInitialStreamState();

    // Pre-build all messages
    const messages = [
      buildStartMessage(),
      ...Array(50).fill(null).map((_, i) => buildTextMessage(`Chunk ${i} `)),
      buildEndMessage(),
    ];

    // Simulate real-time delivery with small chunks
    for (const msg of messages) {
      const events = processor.processChunk(stringToChunk(msg));
      for (const event of events) {
        state = streamReducer(state, { type: 'EVENT', event });
      }
    }
  });
});
