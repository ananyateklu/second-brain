# Streaming UI Refactoring Plan

## Executive Summary

This document outlines a comprehensive plan to refactor the Second Brain streaming UI system. The current implementation has grown complex with incremental fixes, leading to issues where thinking steps appear below tools during streaming but display correctly after completion. This plan addresses the root causes and provides a cleaner architecture.

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Problem Statement](#problem-statement)
3. [Backend Event Flow Analysis](#backend-event-flow-analysis)
4. [Industry Best Practices](#industry-best-practices)
5. [Proposed Architecture](#proposed-architecture)
6. [Implementation Plan](#implementation-plan)
7. [Testing Plan](#testing-plan)

---

## Current Architecture Analysis

### File Structure

```
frontend/src/
├── core/streaming/
│   ├── stream-event-processor.ts   # SSE parsing, converts raw events to StreamEvent
│   ├── stream-reducer.ts           # State management via useReducer
│   └── types.ts                    # Type definitions
├── features/chat/components/
│   ├── StreamingIndicator.tsx      # Main streaming UI (over-engineered)
│   ├── ChatMessageList.tsx         # Message list with streaming integration
│   └── MessageBubble.tsx           # Individual message display
├── hooks/
│   └── use-unified-stream.ts       # Hook for managing stream lifecycle
└── utils/
    └── thinking-utils.ts           # Tag extraction/stripping utilities
```

### Current Data Flow

```
Backend SSE → StreamEventProcessor → StreamReducer → StreamingIndicator
                    │                      │
                    ↓                      ↓
              Parse events          Update state:
              into typed            - processTimeline
              StreamEvent           - textContent
              objects               - thinkingContent
                                    - activeTools
```

### Current State Structure

```typescript
interface UnifiedStreamState {
  phase: StreamPhase;
  status: StreamStatus;
  textContent: string;                    // Accumulated text
  textContentInTimeline: number;          // Text already in timeline
  thinkingContent: string;                // Current thinking content
  isThinkingComplete: boolean;            // Is thinking block done?
  activeTools: Map<string, StreamToolExecution>;
  completedTools: StreamToolExecution[];
  processTimeline: ProcessEvent[];        // Chronological events
  ragContext: RagContextNote[];
  // ... other fields
}
```

### Current Problems

1. **Thinking Display Order**: Thinking steps show below tools during streaming
2. **Timing Confusion**: All thinking steps get same timestamp
3. **Over-engineered StreamingIndicator**: 500+ lines handling multiple edge cases
4. **Client-side Tag Parsing**: Complex regex to extract `<thinking>` from content
5. **Race Conditions**: Timeline may not update before UI tries to render
6. **Pre-tool Text Complexity**: Extra logic to capture text before tools

---

## Problem Statement

### Root Cause Analysis

The fundamental issue is a **mismatch between backend event semantics and frontend rendering logic**:

1. **Backend Reality**: Events arrive in chronological order (thinking → text → tool_start → tool_end → text → ...)
2. **Frontend Confusion**: `processTimeline` tracks events correctly, but `StreamingIndicator` has complex logic that sometimes bypasses it

### Specific Issues

| Issue | Current Behavior | Expected Behavior |
|-------|-----------------|-------------------|
| Thinking order | Shows below tools during streaming | Shows at position it occurred |
| Timestamps | All thinking steps same time | Each step gets timestamp when started |
| Display | Disappears then reappears | Smooth continuous display |
| Pre-tool text | Complex extraction logic | Natural event ordering |

### Why StreamingIndicator is Over-Engineered

1. **Multiple Responsibility**: Handles streaming display AND message reconstruction AND timeline rendering
2. **Defensive Duplication**: Strips thinking tags multiple times "just in case"
3. **Race Condition Workarounds**: `completeBlocksNotInTimeline` is a symptom, not a solution
4. **Legacy Adapter**: Contains translation layer for old message format

---

## Backend Event Flow Analysis

### Provider Comparison

| Provider | Thinking Support | Tool Calls | Pre-Tool Text | Parallel Tools |
|----------|------------------|------------|---------------|----------------|
| **OpenAI** | o1/o3 reasoning | ✅ w/IDs | ❌ | ✅ via index |
| **Claude** | Native thinking | ✅ w/IDs | ✅ | ❌ sequential |
| **Gemini** | Thought parts | ✅ w/IDs | ✅ | ✅ |
| **Grok** | Think Mode | ✅ w/IDs | ❌ | ✅ via index |
| **Ollama** | Model-dependent | ✅ no IDs | ✅ | ❌ |

### Backend Event Types (AgentService)

```csharp
public enum AgentEventType {
    Status,           // Processing status updates
    Token,            // Text content delta
    ToolCallStart,    // Tool execution began
    ToolCallEnd,      // Tool execution completed
    Thinking,         // Reasoning/thinking content
    ContextRetrieval, // RAG context retrieved
    End,              // Stream completed
    Error             // Error occurred
}
```

### Event Emission Order by Provider

**OpenAI/Grok Pattern:**
```
start → token* → thinking* → token* → tool_start → tool_end → token* → end
```

**Claude Pattern:**
```
start → thinking* → token* → (tool detected via content) → tool_start → tool_end → token* → end
```

**Gemini Pattern:**
```
start → thinking* → token* → grounding? → code_execution? → tool_start* → tool_end* → end
```

### Key Backend Observations

1. **Thinking is Complete**: Backend only emits `thinking` event when it finds COMPLETE `<thinking>...</thinking>` block
2. **Tool Events are Paired**: `tool_start` always followed by `tool_end` for same tool
3. **Parallel Tools**: Multiple `tool_start` events can arrive before any `tool_end`
4. **Pre-tool Text**: Some providers emit text BEFORE requesting tools (Claude, Gemini, Ollama)

---

## Industry Best Practices

### 2025 Streaming UI Patterns

Based on analysis of ChatGPT, Claude, Gemini, Grok interfaces and Vercel AI SDK 5:

#### 1. Event-Driven Architecture

```typescript
// Good: Simple event → action mapping
switch (event.type) {
  case 'content:text': return appendText(state, event.delta);
  case 'content:thinking': return appendThinking(state, event);
  case 'tool:start': return startTool(state, event);
  case 'tool:end': return completeTool(state, event);
}
```

#### 2. Single Source of Truth

```typescript
// Good: One timeline, one renderer
<ProcessTimeline events={state.processTimeline} isStreaming={isStreaming} />

// Bad: Multiple sources with reconciliation
<ThinkingFromTimeline />
<ThinkingFromMessage />
<ThinkingFromLegacy />  // Which is correct?
```

#### 3. Streaming vs Final Display

```typescript
// Clear separation
interface StreamingMessage {
  isStreaming: true;
  timeline: ProcessEvent[];      // What we're receiving
  currentContent: string;        // Accumulating text
}

interface CompletedMessage {
  isStreaming: false;
  content: string;               // Final text
  thinking: ThinkingBlock[];     // Extracted thinking
  toolCalls: ToolCall[];         // Executed tools
}
```

#### 4. Auto-Collapse Completed Processes

```typescript
// UX best practice: Focus on results
useEffect(() => {
  if (thinkingBlock.isComplete && !isStreaming) {
    setTimeout(() => setExpanded(false), 2000);
  }
}, [thinkingBlock.isComplete, isStreaming]);
```

---

## Proposed Architecture

### Core Principle: Timeline is the Truth

**Everything that happens during streaming goes into `processTimeline` in order. UI renders timeline directly.**

### New Data Flow

```
Backend SSE → StreamEventProcessor → StreamReducer → TimelineRenderer
                                          │
                                          ↓
                              Single processTimeline array
                              with all events in order
```

### Simplified State

```typescript
interface StreamState {
  // Core
  phase: 'idle' | 'connecting' | 'streaming' | 'complete' | 'error';

  // Timeline (THE source of truth)
  timeline: TimelineEvent[];

  // Accumulator (for final message)
  finalContent: string;

  // Metadata
  ragContext: RagContextNote[];
  tokenUsage: { input: number; output: number };
  error: StreamError | null;
}

type TimelineEvent =
  | { type: 'thinking'; id: string; content: string; startedAt: number; completedAt?: number }
  | { type: 'text'; id: string; content: string; timestamp: number }
  | { type: 'tool'; id: string; name: string; args: string; result?: string; status: 'pending' | 'executing' | 'completed' | 'failed'; startedAt: number; completedAt?: number }
  | { type: 'rag'; id: string; notes: RagContextNote[]; timestamp: number };
```

### Event Processing Rules

```typescript
function processEvent(state: StreamState, event: StreamEvent): StreamState {
  const now = Date.now();

  switch (event.type) {
    case 'content:thinking':
      // Always create NEW timeline entry for thinking
      // Backend guarantees each thinking event is a complete block
      return {
        ...state,
        timeline: [...state.timeline, {
          type: 'thinking',
          id: `thinking_${now}`,
          content: event.content,
          startedAt: now,
          completedAt: event.isComplete ? now : undefined,
        }],
      };

    case 'content:text':
      // Append to last text event OR create new one
      const lastEvent = state.timeline[state.timeline.length - 1];
      if (lastEvent?.type === 'text') {
        // Append to existing text block
        return updateLastTimelineEvent(state, {
          content: lastEvent.content + event.delta,
        });
      }
      // Create new text block (after tool/thinking)
      return {
        ...state,
        timeline: [...state.timeline, {
          type: 'text',
          id: `text_${now}`,
          content: event.delta,
          timestamp: now,
        }],
        finalContent: state.finalContent + event.delta,
      };

    case 'tool:start':
      // Capture any pending text as pre-tool text
      return {
        ...state,
        timeline: [...state.timeline, {
          type: 'tool',
          id: event.toolId,
          name: event.tool,
          args: event.args,
          status: 'executing',
          startedAt: now,
        }],
      };

    case 'tool:end':
      // Update existing tool event
      return updateTimelineEvent(state, event.toolId, {
        result: event.result,
        status: event.success ? 'completed' : 'failed',
        completedAt: now,
      });
  }
}
```

### Simplified UI Components

```typescript
// StreamingIndicator.tsx - SIMPLIFIED
function StreamingIndicator({ state }: { state: StreamState }) {
  if (state.phase !== 'streaming') return null;

  return (
    <div className="streaming-container">
      {/* Render timeline in order */}
      {state.timeline.map(event => (
        <TimelineEventCard key={event.id} event={event} isStreaming={true} />
      ))}

      {/* Streaming cursor */}
      <StreamingCursor />
    </div>
  );
}

// TimelineEventCard.tsx - Simple dispatch
function TimelineEventCard({ event, isStreaming }: Props) {
  switch (event.type) {
    case 'thinking':
      return <ThinkingCard content={event.content} isComplete={!!event.completedAt} />;
    case 'text':
      return <TextCard content={event.content} />;
    case 'tool':
      return <ToolCard tool={event} isExecuting={event.status === 'executing'} />;
    case 'rag':
      return <RagContextCard notes={event.notes} />;
  }
}
```

### Message Bubble Integration

```typescript
// MessageBubble.tsx
function MessageBubble({ message, streamState }: Props) {
  // During streaming: show timeline
  if (streamState?.phase === 'streaming') {
    return (
      <div className="message assistant">
        <ProcessTimeline events={streamState.timeline} />
      </div>
    );
  }

  // After streaming: show final message with expandable process
  return (
    <div className="message assistant">
      {message.thinking && (
        <CollapsibleSection title="Thinking" defaultExpanded={false}>
          {message.thinking.map(t => <ThinkingCard key={t.id} content={t.content} />)}
        </CollapsibleSection>
      )}

      {message.toolCalls?.length > 0 && (
        <CollapsibleSection title="Tools Used" defaultExpanded={false}>
          {message.toolCalls.map(t => <ToolCard key={t.id} tool={t} />)}
        </CollapsibleSection>
      )}

      <MarkdownContent content={message.content} />
    </div>
  );
}
```

---

## Implementation Plan

### Phase 1: Simplify Event Processing (Day 1-2)

**Files to Modify:**
- `stream-reducer.ts`
- `types.ts`

**Changes:**
1. Simplify `TimelineEvent` type (remove legacy fields)
2. Rewrite `processThinkingEvent` - always create new entry
3. Rewrite `processTextEvent` - append or create based on last event type
4. Remove `textContentInTimeline` tracking (timeline IS the truth)
5. Remove `thinkingContent` accumulator (use timeline)

**Test:**
- Unit tests for event processing
- Event order preservation
- Timestamp correctness

### Phase 2: Rewrite StreamingIndicator (Day 2-3)

**Files to Modify:**
- `StreamingIndicator.tsx`

**Changes:**
1. Remove all thinking tag extraction logic
2. Remove `completeBlocksNotInTimeline` workaround
3. Remove `allThinkingBlocksFromMessage` computation
4. Render timeline directly
5. Simplify to ~100 lines from ~500

**Before:**
```typescript
// Current: 500+ lines with complex memoization
const allThinkingBlocksFromMessage = useMemo(() => {
  // 50 lines of extraction logic
}, [deps]);

const completeBlocksNotInTimeline = useMemo(() => {
  // 30 lines of reconciliation
}, [deps]);
```

**After:**
```typescript
// New: Simple timeline rendering
return (
  <div className="streaming-indicator">
    {state.timeline.map(event => (
      <TimelineEventCard key={event.id} event={event} />
    ))}
  </div>
);
```

### Phase 3: Update MessageBubble (Day 3-4)

**Files to Modify:**
- `MessageBubble.tsx`
- `ChatMessageList.tsx`

**Changes:**
1. Clear separation: streaming vs completed message display
2. Remove duplicate thinking extraction
3. Use `stripAllTimelineText` only for final display
4. Add collapsible sections for thinking/tools

### Phase 4: Backend Event Improvements (Optional, Day 4-5)

**Files to Modify:**
- `AgentService.cs`
- `ChatController.cs`

**Changes:**
1. Add `thinking:start` and `thinking:end` events (instead of complete block)
2. Add `pre_tool_text` event for text before tool calls
3. Include timestamps in all events

**Benefit:** Eliminates client-side tag parsing entirely

### Phase 5: Cleanup (Day 5)

**Files to Modify:**
- `thinking-utils.ts`
- Remove unused functions

**Changes:**
1. Remove `extractThinkingContent` (not needed if backend sends events)
2. Simplify `stripThinkingTags` (only for final message display)
3. Remove legacy adapter code

---

## Testing Plan

### Unit Tests

```typescript
// stream-reducer.test.ts
describe('processThinkingEvent', () => {
  it('creates new timeline entry for each thinking event', () => {
    const state1 = processEvent(initial, { type: 'content:thinking', content: 'First' });
    const state2 = processEvent(state1, { type: 'content:thinking', content: 'Second' });

    expect(state2.timeline).toHaveLength(2);
    expect(state2.timeline[0].content).toBe('First');
    expect(state2.timeline[1].content).toBe('Second');
  });

  it('preserves timeline order through tool execution', () => {
    let state = initial;
    state = processEvent(state, { type: 'content:thinking', content: 'Think' });
    state = processEvent(state, { type: 'tool:start', toolId: 't1', tool: 'search' });
    state = processEvent(state, { type: 'tool:end', toolId: 't1', result: 'done' });
    state = processEvent(state, { type: 'content:thinking', content: 'Think more' });

    expect(state.timeline.map(e => e.type)).toEqual(['thinking', 'tool', 'thinking']);
  });
});
```

### Integration Tests

```typescript
// streaming-integration.test.tsx
describe('Streaming UI Integration', () => {
  it('displays events in chronological order', async () => {
    const { rerender } = render(<ChatPage />);

    // Simulate SSE events
    await sendSSEEvent('thinking', { content: 'Analyzing...' });
    await sendSSEEvent('tool_start', { tool: 'search', id: 't1' });
    await sendSSEEvent('tool_end', { tool: 'search', id: 't1', result: 'found' });
    await sendSSEEvent('thinking', { content: 'Processing results...' });

    // Verify order in DOM
    const events = screen.getAllByTestId('timeline-event');
    expect(events[0]).toHaveTextContent('Analyzing');
    expect(events[1]).toHaveTextContent('search');
    expect(events[2]).toHaveTextContent('Processing');
  });
});
```

### Manual Testing Checklist

- [ ] OpenAI streaming with tools
- [ ] Claude streaming with thinking mode
- [ ] Gemini streaming with grounding
- [ ] Grok streaming with Think Mode
- [ ] Ollama streaming with tools
- [ ] Parallel tool calls (OpenAI, Gemini, Grok)
- [ ] Pre-tool text display (Claude, Gemini)
- [ ] Error recovery mid-stream
- [ ] Connection drop and retry
- [ ] Large thinking blocks (1000+ chars)
- [ ] Rapid event sequences

---

## Summary

### Key Changes

| Component | Current | Proposed |
|-----------|---------|----------|
| **Truth Source** | Multiple (timeline + content + thinkingContent) | Single (timeline) |
| **StreamingIndicator** | 500+ lines, complex extraction | ~100 lines, simple render |
| **Thinking Handling** | Client-side tag parsing | Event-based (optional: backend events) |
| **Pre-tool Text** | Complex capture logic | Natural timeline ordering |
| **Event Types** | Generic content events | Specific event types |

### Benefits

1. **Correctness**: Events display in exact order received
2. **Simplicity**: ~80% reduction in StreamingIndicator complexity
3. **Maintainability**: Single source of truth, clear data flow
4. **Debuggability**: Timeline is inspectable, no hidden state
5. **Performance**: Less memoization, fewer re-renders

### Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | 1-2 days | Event processing |
| Phase 2 | 1-2 days | StreamingIndicator rewrite |
| Phase 3 | 1 day | MessageBubble update |
| Phase 4 | 1-2 days | Backend improvements (optional) |
| Phase 5 | 0.5 days | Cleanup |

**Total: 4-7 days depending on backend changes**

---

## Appendix A: Provider-Specific Considerations

### OpenAI
- Reasoning mode (o1/o3) sends reasoning content BEFORE text
- Tool calls arrive with indexes for parallel execution
- No pre-tool text expected

### Claude
- Native thinking blocks are COMPLETE when received
- Can emit text before tool calls
- Sequential tool execution only

### Gemini
- `Thought=true` parts should go to thinking
- Supports parallel function calls
- Has grounding and code execution events

### Grok
- Think Mode reasoning is streamed incrementally
- Same tool pattern as OpenAI
- Live Search results as additional events

### Ollama
- Tool support depends on model
- No tool IDs (match by name)
- Simpler event structure

---

## Appendix B: Event Type Mapping

| Backend Event | Frontend Event | Timeline Entry |
|---------------|----------------|----------------|
| `thinking` | `content:thinking` | `{ type: 'thinking' }` |
| `token` / `data` | `content:text` | `{ type: 'text' }` |
| `tool_start` | `tool:start` | `{ type: 'tool', status: 'executing' }` |
| `tool_end` | `tool:end` | Update existing tool entry |
| `context_retrieval` | `rag:context` | `{ type: 'rag' }` |
| `grounding` | `grounding:sources` | (metadata, not timeline) |
| `code_execution` | `code:execution` | (special display) |
| `end` | `stream:end` | (phase change) |
| `error` | `stream:error` | (error state) |
