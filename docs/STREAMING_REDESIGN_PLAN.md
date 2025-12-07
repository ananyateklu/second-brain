# Streaming Architecture Redesign Plan

> **Document Version**: 1.0  
> **Created**: December 7, 2025  
> **Status**: Phase 1 - Planning & Research  

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Research Findings](#research-findings)
4. [Proposed Architecture](#proposed-architecture)
5. [Implementation Phases](#implementation-phases)
6. [Component Design](#component-design)
7. [Feature Checklist](#feature-checklist)
8. [Migration Strategy](#migration-strategy)
9. [Testing Strategy](#testing-strategy)
10. [References](#references)

---

## Executive Summary

This document outlines a comprehensive redesign of the streaming architecture in Second Brain to create a unified, predictable, and extensible system that handles diverse AI model outputs seamlessly. The redesign aims to:

- **Unify streaming interfaces** across all AI providers (OpenAI, Claude, Gemini, Ollama, Grok)
- **Support dynamic output type switching** (text → thinking → tool execution → image → text)
- **Provide predictable, consistent behavior** across different model capabilities
- **Enable real-time progress visualization** for all operations
- **Handle image generation** within the streaming pipeline
- **Support advanced features** like code execution, grounding, and extended thinking

---

## Current State Analysis

### Existing Architecture

The current streaming implementation consists of three main hooks and one unified interface:

#### 1. `use-chat-stream.ts` (Regular Chat)
```
✅ SSE streaming for text responses
✅ RAG context retrieval
✅ Token counting (estimated)
✅ Error handling with retry logic
✅ Gemini-specific: grounding sources, code execution, thinking
❌ No image generation streaming
❌ No tool execution support
❌ Limited output type differentiation
```

#### 2. `use-agent-stream.ts` (Agent Mode)
```
✅ Tool execution tracking (start/end)
✅ Thinking step parsing (inline tags)
✅ Context retrieval (agent auto-RAG)
✅ Processing status indicators
✅ Token counting
✅ Gemini-specific: grounding, code execution
❌ Duplicate SSE parsing logic
❌ No image generation support
❌ Complex state management
```

#### 3. `use-combined-streaming.ts` (Unified Interface)
```
✅ Combines chat and agent streams
✅ Mode-based switching
❌ Not a true unified architecture
❌ State synchronization issues
❌ Redundant state storage
```

#### 4. `StreamingIndicator.tsx` (Display Component)
```
✅ Process timeline visualization
✅ Tool execution cards
✅ Thinking step cards
✅ Retrieved notes display
✅ Loading skeletons
❌ Tightly coupled to specific state shapes
❌ Limited composability
❌ No streaming type detection
```

### Pain Points Identified

| Issue | Severity | Description |
|-------|----------|-------------|
| **Duplicate Logic** | High | SSE parsing duplicated across `use-chat-stream.ts` and `use-agent-stream.ts` |
| **State Fragmentation** | High | State split between two hooks, causing sync issues |
| **Limited Extensibility** | Medium | Adding new output types requires changes in multiple places |
| **No Image Streaming** | Medium | Image generation is separate from chat stream |
| **Inconsistent Output Handling** | Medium | Different models output thinking/tools differently |
| **Complex Type Guards** | Low | Many type guards for parsing SSE data |

---

## Research Findings

### Industry Best Practices (December 2025)

#### 1. OpenAI Streaming
- **Structured Outputs**: Use `strict: true` for function calling to ensure schema adherence
- **Parallel Tools**: Disable `parallel_tool_calls` for strict schema compliance
- **Streaming SDK**: Leverage SDK helpers for managing streaming with structured outputs
- **Refusal Handling**: Monitor for model refusals with `refusal` boolean

#### 2. Anthropic Claude Streaming
- **Fine-Grained Tool Streaming**: Use beta header `fine-grained-tool-streaming-2025-05-14` for streaming tool parameters
- **Extended Thinking**: Claude's thinking process can be exposed with encrypted `signature` field
- **1M Token Context**: Efficient handling of massive context windows
- **Error Recovery**: Capture partial responses and construct continuation requests

#### 3. Google Gemini 2.0 Streaming
- **Multimodal Live API**: Real-time bidirectional streaming of text, audio, and video
- **Code Execution**: Python sandbox with NumPy, Pandas, Matplotlib
- **Grounding**: Real-time Google Search integration
- **Sub-second Latency**: Voice activity detection and natural conversations

#### 4. Ollama Streaming
- **NDJSON Format**: Responses as newline-delimited JSON objects
- **Structured Outputs**: JSON schema support via `format` parameter
- **Thinking Mode**: Models can output internal reasoning in `thinking` field
- **Local Performance**: Optimized for local model inference

#### 5. X.AI Grok Streaming
- **Image Generation**: grok-2-image-1212 model, up to 10 images per request
- **Agent Tools API**: Server-side and client-side tool calling
- **Streaming Limitation**: Streaming mode doesn't support tool calling (currently)

### Architectural Patterns

#### State Machine Pattern for Streaming
```
States:
├── IDLE
├── INITIALIZING
├── STREAMING
│   ├── STREAMING_TEXT
│   ├── STREAMING_THINKING
│   ├── STREAMING_TOOL_CALL
│   ├── STREAMING_TOOL_RESULT
│   ├── STREAMING_CODE_EXECUTION
│   └── STREAMING_IMAGE_GENERATION
├── PAUSED
├── ERROR
│   ├── RECOVERABLE
│   └── FATAL
└── COMPLETE
```

#### Vercel AI SDK Patterns
- **`useChat`**: Unified hook for all chat streaming
- **`useCompletion`**: Text completion with auto UI updates
- **Unified Provider API**: Same interface across providers
- **AI Elements**: Pre-built React components for AI UIs
- **Image Generation**: Unified `generateImage` function

#### Error Recovery Strategies
- **Partial Response Capture**: Save streamed tokens before interruption
- **Continuation Requests**: Prompt LLM to continue from interruption point
- **Fallback Mechanisms**: Switch to alternative models on failure
- **Dynamic Resource Management**: Adapt to workload changes

---

## Proposed Architecture

### Core Principles

1. **Single Source of Truth**: One unified streaming state machine
2. **Event-Driven**: All streaming through a consistent event protocol
3. **Composable UI**: Small, focused components that compose together
4. **Provider Agnostic**: Abstract provider differences at the adapter layer
5. **Type Safe**: Full TypeScript coverage with discriminated unions

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        React Application                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    useUnifiedStream                          │    │
│  │  (Single hook managing all streaming state)                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐           │
│  │ StreamRenderer  │ │ ToolPanel   │ │ ProcessTimeline │           │
│  │  (Text/MD)      │ │ (Executions)│ │ (Steps/Status)  │           │
│  └─────────────────┘ └─────────────┘ └─────────────────┘           │
│              │               │               │                      │
│              └───────────────┼───────────────┘                      │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                 UnifiedStreamDisplay                         │    │
│  │  (Composition of all streaming components)                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                        Stream Event Layer                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    StreamEventProcessor                      │    │
│  │  (Parses SSE, emits typed events)                           │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐           │
│  │  ChatAdapter    │ │ AgentAdapter│ │ ImageAdapter    │           │
│  │  (Regular chat) │ │ (Tools)     │ │ (Generation)    │           │
│  └─────────────────┘ └─────────────┘ └─────────────────┘           │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                        Backend SSE Streams                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Unified Event Protocol

```typescript
// Unified stream event types
type StreamEventType =
  | 'stream:start'
  | 'stream:end'
  | 'stream:error'
  | 'content:text'
  | 'content:thinking'
  | 'content:thinking:end'
  | 'content:image:start'
  | 'content:image:progress'
  | 'content:image:complete'
  | 'tool:start'
  | 'tool:progress'
  | 'tool:end'
  | 'code:execution'
  | 'rag:context'
  | 'grounding:sources'
  | 'status:update';

// Discriminated union for type-safe event handling
type StreamEvent =
  | { type: 'stream:start'; timestamp: number }
  | { type: 'content:text'; content: string; delta: string }
  | { type: 'content:thinking'; content: string; isComplete: boolean }
  | { type: 'tool:start'; tool: string; args: unknown }
  | { type: 'tool:end'; tool: string; result: unknown; success: boolean }
  | { type: 'content:image:progress'; progress: number; stage: string }
  | { type: 'content:image:complete'; images: GeneratedImage[] }
  // ... etc
```

### Unified Stream State

```typescript
interface UnifiedStreamState {
  // Core state
  status: StreamStatus;
  phase: StreamPhase;
  
  // Content accumulation
  textContent: string;
  thinkingContent: string;
  
  // Tool executions
  activeTools: Map<string, ToolExecution>;
  completedTools: ToolExecution[];
  
  // Image generation
  imageGeneration: {
    inProgress: boolean;
    progress: number;
    stage: string;
    images: GeneratedImage[];
  };
  
  // Context
  ragContext: RagContextNote[];
  groundingSources: GroundingSource[];
  codeExecution: CodeExecutionResult | null;
  
  // Metadata
  inputTokens: number;
  outputTokens: number;
  startTime: number | null;
  duration: number | null;
  ragLogId: string | null;
  
  // Error handling
  error: StreamError | null;
  retryCount: number;
}

type StreamStatus = 'idle' | 'connecting' | 'streaming' | 'paused' | 'error' | 'complete';

type StreamPhase = 
  | 'none'
  | 'text'
  | 'thinking'
  | 'tool-execution'
  | 'image-generation'
  | 'code-execution'
  | 'finalizing';
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Design and document event protocol
- [ ] Create base `StreamEventProcessor` class
- [ ] Implement unified stream state types
- [ ] Create `useStreamState` hook (state machine)
- [ ] Write unit tests for event processing

### Phase 2: Core Streaming (Week 3-4)
- [ ] Implement `useUnifiedStream` hook
- [ ] Create provider adapters (chat, agent)
- [ ] Migrate SSE parsing to event processor
- [ ] Add error recovery mechanisms
- [ ] Implement retry logic with exponential backoff

### Phase 3: UI Components (Week 5-6)
- [ ] Create `StreamRenderer` component
- [ ] Create `ToolExecutionPanel` component
- [ ] Create `ThinkingDisplay` component
- [ ] Create `ImageGenerationProgress` component
- [ ] Create `ProcessTimeline` v2 component
- [ ] Create `UnifiedStreamDisplay` composition component

### Phase 4: Image Generation (Week 7)
- [ ] Add image generation to stream protocol
- [ ] Implement `ImageGenerationAdapter`
- [ ] Add progress tracking for image generation
- [ ] Integrate with existing image generation API
- [ ] Handle multi-image generation

### Phase 5: Advanced Features (Week 8-9)
- [ ] Implement thinking tag parsing (all variants)
- [ ] Add code execution result display
- [ ] Add grounding sources integration
- [ ] Implement partial response recovery
- [ ] Add stream cancellation with cleanup

### Phase 6: Testing & Migration (Week 10)
- [ ] Comprehensive integration tests
- [ ] Performance benchmarks
- [ ] Migrate existing components
- [ ] Update documentation
- [ ] Feature parity verification

---

## Component Design

### 1. StreamEventProcessor

```typescript
// core/streaming/StreamEventProcessor.ts

class StreamEventProcessor {
  private buffer: string = '';
  private eventHandlers: Map<StreamEventType, StreamEventHandler[]>;
  
  constructor(private options: ProcessorOptions) {
    this.eventHandlers = new Map();
  }
  
  // Process raw SSE data
  processChunk(chunk: Uint8Array): void {
    this.buffer += new TextDecoder().decode(chunk, { stream: true });
    this.parseMessages();
  }
  
  // Parse complete SSE messages
  private parseMessages(): void {
    const messages = this.buffer.split('\n\n');
    this.buffer = messages.pop() || '';
    
    for (const message of messages) {
      if (!message.trim()) continue;
      const event = this.parseSSEMessage(message);
      this.emit(event);
    }
  }
  
  // Convert SSE to typed event
  private parseSSEMessage(message: string): StreamEvent {
    const { eventType, data } = this.extractEventData(message);
    return this.createTypedEvent(eventType, data);
  }
  
  // Event subscription
  on<T extends StreamEventType>(
    type: T,
    handler: StreamEventHandler<T>
  ): () => void {
    // ...
  }
}
```

### 2. useUnifiedStream Hook

```typescript
// hooks/useUnifiedStream.ts

interface UseUnifiedStreamOptions {
  mode: 'chat' | 'agent';
  conversationId: string;
  onComplete?: (state: UnifiedStreamState) => void;
  onError?: (error: StreamError) => void;
}

function useUnifiedStream(options: UseUnifiedStreamOptions) {
  const [state, dispatch] = useReducer(streamReducer, initialState);
  const processorRef = useRef<StreamEventProcessor | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  
  const send = useCallback(async (request: StreamRequest) => {
    // Initialize processor
    processorRef.current = new StreamEventProcessor({
      mode: options.mode,
    });
    
    // Set up event handlers
    setupEventHandlers(processorRef.current, dispatch);
    
    // Start streaming
    dispatch({ type: 'STREAM_START' });
    
    try {
      const response = await fetch(getStreamUrl(options), {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(request),
        signal: abortRef.current?.signal,
      });
      
      const reader = response.body?.getReader();
      if (!reader) throw new StreamError('No response body');
      
      // Process stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        processorRef.current.processChunk(value);
      }
      
    } catch (error) {
      handleStreamError(error, dispatch, options);
    }
  }, [options]);
  
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'STREAM_CANCEL' });
  }, []);
  
  const reset = useCallback(() => {
    dispatch({ type: 'STREAM_RESET' });
  }, []);
  
  return {
    ...state,
    send,
    cancel,
    reset,
    isActive: state.status === 'streaming',
  };
}
```

### 3. UnifiedStreamDisplay Component

```tsx
// components/streaming/UnifiedStreamDisplay.tsx

interface UnifiedStreamDisplayProps {
  state: UnifiedStreamState;
  options?: DisplayOptions;
}

function UnifiedStreamDisplay({ state, options }: UnifiedStreamDisplayProps) {
  return (
    <div className="unified-stream-display">
      {/* Phase-based rendering */}
      <StreamPhaseIndicator phase={state.phase} status={state.status} />
      
      {/* RAG Context (if present) */}
      {state.ragContext.length > 0 && (
        <RetrievedNotesCard notes={state.ragContext} />
      )}
      
      {/* Thinking Display */}
      {state.thinkingContent && (
        <ThinkingDisplay 
          content={state.thinkingContent}
          isComplete={state.phase !== 'thinking'}
        />
      )}
      
      {/* Tool Executions */}
      {(state.activeTools.size > 0 || state.completedTools.length > 0) && (
        <ToolExecutionTimeline
          active={Array.from(state.activeTools.values())}
          completed={state.completedTools}
        />
      )}
      
      {/* Code Execution */}
      {state.codeExecution && (
        <CodeExecutionCard result={state.codeExecution} />
      )}
      
      {/* Grounding Sources */}
      {state.groundingSources.length > 0 && (
        <GroundingSourcesCard sources={state.groundingSources} />
      )}
      
      {/* Image Generation Progress */}
      {state.imageGeneration.inProgress && (
        <ImageGenerationProgress 
          progress={state.imageGeneration.progress}
          stage={state.imageGeneration.stage}
        />
      )}
      
      {/* Generated Images */}
      {state.imageGeneration.images.length > 0 && (
        <GeneratedImagesGallery images={state.imageGeneration.images} />
      )}
      
      {/* Main Text Content */}
      {state.textContent && (
        <StreamRenderer 
          content={state.textContent}
          isStreaming={state.status === 'streaming' && state.phase === 'text'}
        />
      )}
      
      {/* Token Usage */}
      <TokenUsageDisplay
        input={state.inputTokens}
        output={state.outputTokens}
        duration={state.duration}
      />
      
      {/* Error Display */}
      {state.error && (
        <StreamErrorDisplay 
          error={state.error}
          canRetry={state.error.recoverable}
        />
      )}
    </div>
  );
}
```

### 4. Phase-Aware Stream Renderer

```tsx
// components/streaming/StreamRenderer.tsx

interface StreamRendererProps {
  content: string;
  isStreaming: boolean;
  showCursor?: boolean;
}

function StreamRenderer({ content, isStreaming, showCursor = true }: StreamRendererProps) {
  // Use markdown worker for performance
  const { html, isProcessing } = useMarkdownWorker(content);
  
  return (
    <div className="stream-renderer">
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {isStreaming && showCursor && (
        <StreamingCursor animate={!isProcessing} />
      )}
    </div>
  );
}
```

### 5. Tool Execution Timeline

```tsx
// components/streaming/ToolExecutionTimeline.tsx

interface ToolExecutionTimelineProps {
  active: ToolExecution[];
  completed: ToolExecution[];
  expanded?: boolean;
}

function ToolExecutionTimeline({ active, completed, expanded = true }: ToolExecutionTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  return (
    <div className="tool-timeline">
      <TimelineHeader 
        activeCount={active.length}
        completedCount={completed.length}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div className="space-y-2">
            {/* Active tools with progress indicator */}
            {active.map((tool) => (
              <ToolCard 
                key={tool.id}
                execution={tool}
                status="executing"
                showProgress
              />
            ))}
            
            {/* Completed tools */}
            {completed.map((tool) => (
              <ToolCard
                key={tool.id}
                execution={tool}
                status={tool.success ? 'completed' : 'failed'}
                collapsible
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Feature Checklist

### Core Streaming Infrastructure

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Unified SSE parsing | ❌ Not Implemented | P0 | Single parser for all event types |
| Event-driven architecture | ❌ Not Implemented | P0 | Typed event system |
| State machine for stream phases | ❌ Not Implemented | P0 | Predictable state transitions |
| Unified stream hook | ❌ Not Implemented | P0 | `useUnifiedStream` |
| Provider adapters | ❌ Not Implemented | P1 | Chat, Agent, Image adapters |
| Error recovery | 🟡 Partial | P1 | Retry exists, needs enhancement |
| Partial response handling | ❌ Not Implemented | P2 | Resume from interruption |
| Stream cancellation | ✅ Implemented | P0 | AbortController pattern |
| Token counting | ✅ Implemented | P1 | Client-side estimation |

### Text Streaming

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Basic text streaming | ✅ Implemented | P0 | SSE text chunks |
| Markdown rendering | ✅ Implemented | P0 | Worker-based parsing |
| Streaming cursor | ✅ Implemented | P2 | Visual indicator |
| Thinking tag parsing (`<thinking>`) | ✅ Implemented | P1 | Agent mode |
| Thinking tag parsing (`<think>`) | ✅ Implemented | P1 | Variant support |
| Extended thinking display | 🟡 Partial | P1 | Gemini integration |
| Code block streaming | ✅ Implemented | P1 | Syntax highlighting |
| LaTeX/Math streaming | ✅ Implemented | P2 | KaTeX support |

### Tool Execution

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Tool start events | ✅ Implemented | P0 | `tool_start` SSE event |
| Tool end events | ✅ Implemented | P0 | `tool_end` SSE event |
| Tool execution cards | ✅ Implemented | P0 | Visual display |
| Tool arguments display | ✅ Implemented | P1 | JSON formatting |
| Tool result display | ✅ Implemented | P1 | Collapsible |
| Multi-tool tracking | ✅ Implemented | P1 | Concurrent tools |
| Tool execution timeline | ✅ Implemented | P1 | Timeline visualization |
| Fine-grained tool streaming | ❌ Not Implemented | P2 | Claude beta feature |
| Tool call retry | ❌ Not Implemented | P2 | On tool failure |

### Image Generation

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Image generation API | ✅ Implemented | P0 | Non-streaming |
| Image generation in stream | ❌ Not Implemented | P1 | Integrate with stream |
| Progress indication | 🟡 Partial | P1 | Loading skeleton only |
| Multi-image generation | ✅ Implemented | P1 | Up to 10 images |
| Image preview streaming | ❌ Not Implemented | P3 | Real-time previews |
| Image gallery display | ✅ Implemented | P1 | Generated images |
| Provider switching | ✅ Implemented | P1 | DALL-E, Gemini, Grok |

### RAG Integration

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| RAG context retrieval | ✅ Implemented | P0 | `rag` SSE event |
| Retrieved notes display | ✅ Implemented | P0 | Card component |
| Agent auto-context | ✅ Implemented | P1 | `context_retrieval` event |
| RAG log ID tracking | ✅ Implemented | P1 | For feedback |
| RAG feedback submission | ✅ Implemented | P1 | Thumbs up/down |
| Relevance score display | ✅ Implemented | P2 | Similarity scores |

### Gemini-Specific Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Grounding sources | ✅ Implemented | P1 | Google Search |
| Grounding display card | ✅ Implemented | P1 | Sources list |
| Code execution | ✅ Implemented | P1 | Python sandbox |
| Code execution card | ✅ Implemented | P1 | Code + output |
| Thinking mode | ✅ Implemented | P1 | Gemini 2.0+ |
| Context caching | ✅ Implemented | P2 | Cost reduction |
| Multimodal Live API | ❌ Not Implemented | P3 | Real-time bidirectional |

### Provider-Specific Features

| Feature | Provider | Status | Priority |
|---------|----------|--------|----------|
| Structured outputs | OpenAI | ❌ Not Implemented | P2 |
| Parallel tool calls | OpenAI | ❌ Not Implemented | P2 |
| Extended thinking | Claude | ❌ Not Implemented | P2 |
| Thinking field | Ollama | ❌ Not Implemented | P2 |
| Image generation (Aurora) | Grok | ✅ Implemented | P1 |
| Agent Tools API | Grok | ❌ Not Implemented | P2 |

### UI/UX Features

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Process timeline | ✅ Implemented | P0 | Collapsible steps |
| Loading skeletons | ✅ Implemented | P1 | Chat and image |
| Error display | ✅ Implemented | P0 | Error cards |
| Status indicators | ✅ Implemented | P1 | Processing status |
| Token usage display | ✅ Implemented | P1 | Input/output |
| Stream duration | ✅ Implemented | P2 | Response time |
| Animated transitions | 🟡 Partial | P2 | Framer Motion |
| Accessibility | 🟡 Partial | P2 | ARIA labels |

### Performance & Reliability

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Web Worker markdown | ✅ Implemented | P1 | Off-main-thread |
| Retry with backoff | ✅ Implemented | P1 | Exponential |
| Rate limit handling | 🟡 Partial | P1 | Error display |
| Circuit breaker | ✅ Implemented | P1 | Backend |
| Connection keep-alive | ✅ Implemented | P0 | SSE headers |
| Stream buffering | ✅ Implemented | P0 | Proper SSE parsing |
| Memory cleanup | ✅ Implemented | P1 | AbortController |
| Optimistic updates | ❌ Not Implemented | P2 | UI responsiveness |

---

## Migration Strategy

### Phase 1: Parallel Implementation
1. Create new unified streaming infrastructure alongside existing code
2. Implement feature parity with existing hooks
3. Add new features (image generation streaming, etc.)

### Phase 2: Gradual Migration
1. Create feature flag for new streaming system
2. Enable for specific conversations/users
3. Monitor performance and errors
4. Collect feedback

### Phase 3: Component Updates
1. Update `ChatPage` to use new hooks
2. Update `StreamingIndicator` to use new components
3. Migrate agent-specific components
4. Remove deprecated components

### Phase 4: Cleanup
1. Remove old streaming hooks
2. Remove deprecated types
3. Update tests
4. Update documentation

### Backward Compatibility

```typescript
// Compatibility layer during migration
function useLegacyStreamingAdapter(
  unifiedStream: ReturnType<typeof useUnifiedStream>
): LegacyStreamingState {
  return {
    isStreaming: unifiedStream.status === 'streaming',
    streamingMessage: unifiedStream.textContent,
    streamingError: unifiedStream.error,
    retrievedNotes: unifiedStream.ragContext,
    toolExecutions: unifiedStream.completedTools,
    thinkingSteps: extractThinkingSteps(unifiedStream.thinkingContent),
    // ... etc
  };
}
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('StreamEventProcessor', () => {
  it('should parse SSE text events correctly', () => {
    const processor = new StreamEventProcessor();
    const events: StreamEvent[] = [];
    
    processor.on('content:text', (e) => events.push(e));
    processor.processChunk(encoder.encode('event: message\ndata: Hello\n\n'));
    
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('content:text');
    expect(events[0].delta).toBe('Hello');
  });
  
  it('should handle partial chunks correctly', () => {
    const processor = new StreamEventProcessor();
    const events: StreamEvent[] = [];
    
    processor.on('content:text', (e) => events.push(e));
    processor.processChunk(encoder.encode('event: mess'));
    processor.processChunk(encoder.encode('age\ndata: Hello\n\n'));
    
    expect(events).toHaveLength(1);
  });
  
  it('should emit tool start/end events', () => {
    // ...
  });
});
```

### Integration Tests

```typescript
describe('useUnifiedStream integration', () => {
  it('should stream a complete chat message', async () => {
    const { result } = renderHook(() => useUnifiedStream({
      mode: 'chat',
      conversationId: 'test-conv',
    }));
    
    await act(async () => {
      await result.current.send({ content: 'Hello' });
    });
    
    await waitFor(() => {
      expect(result.current.status).toBe('complete');
      expect(result.current.textContent).toBeTruthy();
    });
  });
  
  it('should track tool executions in agent mode', async () => {
    // ...
  });
  
  it('should handle stream errors and retry', async () => {
    // ...
  });
});
```

### Component Tests

```tsx
describe('UnifiedStreamDisplay', () => {
  it('should render thinking display when in thinking phase', () => {
    const state = createMockStreamState({
      phase: 'thinking',
      thinkingContent: 'Analyzing the problem...',
    });
    
    render(<UnifiedStreamDisplay state={state} />);
    
    expect(screen.getByText('Analyzing the problem...')).toBeInTheDocument();
  });
  
  it('should show tool executions during tool phase', () => {
    // ...
  });
});
```

---

## References

### Research Sources

1. **OpenAI Documentation**
   - [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
   - [Function Calling](https://platform.openai.com/docs/guides/function-calling)

2. **Anthropic Claude Documentation**
   - [Fine-Grained Tool Streaming](https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/fine-grained-tool-streaming)
   - [Extended Thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)
   - [Messages Streaming](https://docs.anthropic.com/claude/reference/messages-streaming)

3. **Google Gemini Documentation**
   - [Gemini 2.0 Flash](https://cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/2-0-flash)
   - [Multimodal Live API](https://developers.googleblog.com/gemini-2-0-level-up-your-apps-with-real-time-multimodal-interactions/)
   - [Code Execution](https://developers.googleblog.com/gemini-20-deep-dive-code-execution/)

4. **Ollama Documentation**
   - [Structured Outputs](https://ollama.com/blog/structured-outputs)
   - [Thinking Mode](https://www.cohorte.co/blog/run-llms-locally-with-ollama-privacy-first-ai-for-developers-in-2025)

5. **X.AI Grok Documentation**
   - [Image Generation API](https://techcrunch.com/2025/03/19/xai-launches-an-api-for-generating-images/)
   - [Agent Tools API](https://x.ai/api/)

6. **Vercel AI SDK**
   - [AI SDK 4.1 Release](https://vercel.com/blog/ai-sdk-4-1)
   - [Image Generation](https://vercel.com/blog/ai-sdk-4-1)
   - [AI Elements](https://examples.vercel.com/blog/introducing-ai-elements)

7. **Research Papers & Articles**
   - [StreamingThinker: LLM Streaming Thinking Paradigm](https://arxiv.org/abs/2510.17238)
   - [LLM Stream Parser Library](https://libraries.io/npm/llm-stream-parser)
   - [SSE is the King](https://medium.com/@FrankGoortani/sse-is-the-king-0559dcb0cb3d)

### Internal Documentation

- [`CLAUDE.md`](./CLAUDE.md) - Main codebase documentation
- [`GEMINI_SDK_FEATURES_IMPLEMENTATION.md`](./GEMINI_SDK_FEATURES_IMPLEMENTATION.md) - Gemini feature implementation

---

## Appendix: Event Type Reference

### SSE Event Types (Current Backend)

| Event | Description | Data Format |
|-------|-------------|-------------|
| `start` | Stream started | `{}` |
| `message`/`data` | Text content chunk | `string` (escaped) |
| `thinking` | Thinking content | `{ content: string }` |
| `tool_start` | Tool execution started | `{ tool: string, arguments: string }` |
| `tool_end` | Tool execution completed | `{ tool: string, result: string }` |
| `status` | Processing status update | `{ status: string }` |
| `context_retrieval` | RAG notes retrieved | `{ retrievedNotes: [], ragLogId?: string }` |
| `rag` | RAG context (chat mode) | `{ retrievedNotes: [] }` |
| `grounding` | Grounding sources | `{ sources: [] }` |
| `code_execution` | Code execution result | `{ code, language, output, success, errorMessage }` |
| `end` | Stream completed | `{ ragLogId?: string }` |
| `error` | Stream error | `{ error: string }` |

---

> **Next Steps**: 
> 1. Review this document with the team
> 2. Prioritize features based on user impact
> 3. Create detailed technical specs for Phase 1
> 4. Begin implementation of core infrastructure
