# ADR 014: Agent Streaming Strategy Pattern

**Date**: 2025-12-11
**Status**: Accepted
**Context**: Agent service refactoring from monolithic 3467-line implementation to modular strategy-based architecture

---

## Problem

The original `AgentService.cs` was a monolithic implementation with:

- **3,467 lines** of code in a single class
- **5 duplicate provider methods** (Anthropic, OpenAI, Gemini, Grok, Ollama, SemanticKernel)
- **~1000 lines** of shared helper logic duplicated across providers
- **Complex conditional logic** for provider-specific streaming behavior
- **Difficult to test** - single large class with entangled concerns
- **Hard to extend** - adding new providers required modifying core class

### Root Causes

1. **Lack of abstraction** - Provider-specific logic mixed with orchestration
2. **Tight coupling** - AgentService directly calls provider-specific methods
3. **Code duplication** - Thinking extraction, tool execution, RAG injection repeated
4. **Single Responsibility Violation** - Handled everything from setup to streaming

---

## Decision

Implement **Strategy Pattern** to delegate provider-specific streaming logic to pluggable strategies.

### Architecture

```text
AgentService (233 lines)
    │
    ├─→ AgentStreamingStrategyFactory
    │   └─→ Strategy Selection by Provider
    │
    ├─→ IAgentStreamingStrategy implementations (6 providers)
    │   ├─→ AnthropicStreamingStrategy
    │   ├─→ OpenAIStreamingStrategy
    │   ├─→ GeminiStreamingStrategy
    │   ├─→ GrokStreamingStrategy
    │   ├─→ OllamaStreamingStrategy
    │   └─→ SemanticKernelStreamingStrategy
    │
    └─→ Shared Helpers (DRY)
        ├─→ IToolExecutor
        ├─→ IThinkingExtractor
        ├─→ IRagContextInjector
        └─→ IPluginToolBuilder
```

### Key Components

#### 1. **IAgentStreamingStrategy** (Interface)

Defines contract for provider-specific streaming:

```csharp
public interface IAgentStreamingStrategy
{
    Task<bool> CanHandleAsync(string provider);

    IAsyncEnumerable<AgentEvent> ExecuteAsync(
        AgentStreamingContext context,
        CancellationToken cancellationToken);
}
```

#### 2. **BaseAgentStreamingStrategy** (Template Method)

Common streaming logic:

- Event creation helpers
- Error handling
- Timing utilities
- Thinking block accumulation

Allows strategies to focus on provider-specific parsing.

#### 3. **AgentStreamingContext** (Data Transfer Object)

Encapsulates all streaming operation data:

```csharp
public class AgentStreamingContext
{
    public required string ConversationId { get; set; }
    public required AgentRequest Request { get; set; }
    public required string UserPrompt { get; set; }
    public IReadOnlyList<AgentCapability> ActiveCapabilities { get; set; } = [];
    public IReadOnlyList<AgentPlugin> Plugins { get; set; } = [];
    public List<RetrievedNote>? RagContext { get; set; }
}
```

#### 4. **Shared Helpers**

Extracted common functionality:

- **ToolExecutor** - Execute tools, capture results, handle errors
- **ThinkingExtractor** - Parse thinking blocks from content
- **RagContextInjector** - Inject context into system/user prompts
- **PluginToolBuilder** - Build dynamic plugin tool definitions

---

## Benefits

### 1. **Massive Complexity Reduction**

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| AgentService.cs | 3,467 lines | 233 lines | **-93%** |
| Provider methods | 5 duplicated | 6 strategies | **No duplication** |
| Helper code | Repeated | Shared | **DRY** |

### 2. **Single Responsibility**

Each strategy handles exactly one provider:

- **AnthropicStreamingStrategy** - Anthropic-specific logic (~250 lines)
- **OpenAIStreamingStrategy** - OpenAI reasoning parsing (~200 lines)
- **GeminiStreamingStrategy** - Gemini grounding/execution (~280 lines)
- **GrokStreamingStrategy** - Grok search integration (~230 lines)
- **OllamaStreamingStrategy** - Local model streaming (~180 lines)
- **SemanticKernelStreamingStrategy** - SK kernel usage (~190 lines)

### 3. **Improved Testability**

- Each strategy testable in isolation with mocked helpers
- BaseAgentStreamingStrategy provides common test utilities
- No need to mock entire AgentService

### 4. **Better Maintainability**

- **Adding providers** - Create new strategy class, register in factory
- **Fixing bugs** - Changes isolated to specific strategy
- **Refactoring** - Shared helpers can be improved without affecting strategies

### 5. **Flexible Extension**

New providers require:

1. Implement `IAgentStreamingStrategy`
2. Register in `AgentStreamingStrategyFactory`
3. Add DI binding in `ServiceCollectionExtensions.cs`

No core logic changes needed.

---

## Implementation Details

### Folder Structure

```text
Services/Agents/
├── AgentService.cs                          # 233-line orchestrator
├── IAgentService.cs
├── QueryIntentDetector.cs
│
├── Helpers/
│   ├── IToolExecutor.cs
│   ├── ToolExecutor.cs                      # ~150 lines
│   ├── IThinkingExtractor.cs
│   ├── ThinkingExtractor.cs                 # ~100 lines
│   ├── IRagContextInjector.cs
│   ├── RagContextInjector.cs                # ~120 lines
│   ├── IPluginToolBuilder.cs
│   ├── PluginToolBuilder.cs                 # ~200 lines
│   ├── ProviderCapabilities.cs              # Constants
│   └── AgentRetryPolicy.cs
│
├── Strategies/
│   ├── IAgentStreamingStrategy.cs           # Strategy interface
│   ├── IAgentStreamingStrategyFactory.cs    # Factory interface
│   ├── AgentStreamingStrategyFactory.cs     # Implementation
│   ├── AgentStreamingContext.cs             # Context DTO
│   ├── BaseAgentStreamingStrategy.cs        # Template method base
│   ├── AnthropicStreamingStrategy.cs        # Provider-specific
│   ├── OpenAIStreamingStrategy.cs
│   ├── GeminiStreamingStrategy.cs
│   ├── GrokStreamingStrategy.cs
│   ├── OllamaStreamingStrategy.cs
│   └── SemanticKernelStreamingStrategy.cs
│
├── Plugins/
│   ├── IAgentPlugin.cs
│   └── NotesPlugin.cs
│
└── Models/
    └── AgentModels.cs                       # Data models
```

### Dependency Injection

```csharp
// ServiceCollectionExtensions.cs
services.AddScoped<IAgentService, AgentService>();
services.AddScoped<IAgentStreamingStrategyFactory, AgentStreamingStrategyFactory>();

// Register strategies
services.AddScoped<IAgentStreamingStrategy, AnthropicStreamingStrategy>();
services.AddScoped<IAgentStreamingStrategy, OpenAIStreamingStrategy>();
services.AddScoped<IAgentStreamingStrategy, GeminiStreamingStrategy>();
services.AddScoped<IAgentStreamingStrategy, GrokStreamingStrategy>();
services.AddScoped<IAgentStreamingStrategy, OllamaStreamingStrategy>();
services.AddScoped<IAgentStreamingStrategy, SemanticKernelStreamingStrategy>();

// Register helpers
services.AddScoped<IToolExecutor, ToolExecutor>();
services.AddScoped<IThinkingExtractor, ThinkingExtractor>();
services.AddScoped<IRagContextInjector, RagContextInjector>();
services.AddScoped<IPluginToolBuilder, PluginToolBuilder>();
```

---

## Design Patterns Used

1. **Strategy Pattern** - Provider-specific algorithms
2. **Factory Pattern** - Dynamic strategy selection
3. **Template Method** - BaseAgentStreamingStrategy common flow
4. **Dependency Injection** - Service locator for strategies
5. **Data Transfer Object** - AgentStreamingContext encapsulation

---

## Trade-offs

### Advantages

- ✅ Massive complexity reduction
- ✅ Better code organization
- ✅ Easier to test
- ✅ Easier to extend
- ✅ Clear separation of concerns

### Disadvantages

- ❌ More files to maintain (28 total vs 1)
- ❌ Strategy selection adds small runtime overhead
- ❌ Requires understanding of strategy pattern

**Mitigation**: The reduction in cognitive load far outweighs file count increase.

---

## Related ADRs

- **ADR-004**: AI Provider Factory Pattern (similar pattern for AI providers)
- **ADR-006**: CQRS with MediatR (orchestration pattern)
- **ADR-011**: Backend Performance Optimizations (streaming efficiency)

---

## Testing Strategy

### Unit Tests

Each strategy tested in isolation:

```csharp
[Fact]
public async Task AnthropicStreamingStrategy_EmitsThinkingBeforeTools()
{
    // Arrange
    var mockResponse = CreateMockAnthropicResponse();

    // Act
    var events = await strategy.ExecuteAsync(context, ct).ToListAsync();

    // Assert
    var thinkingEvent = events.OfType<ThinkingEvent>().First();
    var toolEvent = events.OfType<ToolEvent>().First();
    Assert.True(events.IndexOf(thinkingEvent) < events.IndexOf(toolEvent));
}
```

### Integration Tests

Full streaming pipeline with real providers (optional, slow):

```csharp
[Fact]
public async Task AgentService_StreamsAllProviders()
{
    foreach (var provider in GetAvailableProviders())
    {
        // Test streaming for each provider
    }
}
```

---

## Migration Notes

For existing code:

- Public `IAgentService` interface unchanged
- Only internal streaming logic affected
- Existing tests need strategy factory mock

---

## Conclusion

Strategy Pattern transforms AgentService from a 3467-line monolith into a maintainable, extensible architecture. Each provider-specific logic is isolated, shared code is DRY, and adding new providers is trivial.

**Code reduction**: **93%**
**Maintainability improvement**: **Significant**
**Testing complexity reduction**: **High**
