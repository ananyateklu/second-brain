# Agent System

## Architecture Overview

AgentService (289 lines) delegates provider-specific streaming to pluggable strategies.

```csharp
public class AgentService : IAgentService
{
    public async IAsyncEnumerable<AgentEvent> StreamAgentResponseAsync(...)
    {
        var strategy = _strategyFactory.GetStrategy(request.Provider);
        await foreach (var @event in strategy.ExecuteAsync(context, cancellationToken))
            yield return @event;
    }
}
```

## Service Structure

```text
Services/Agents/            # 42 files - Agent orchestration
├── Strategies/             # 6 provider streaming strategies + base + factory
├── Helpers/                # 13 shared utilities
├── Plugins/                # 9 agent plugins
└── Models/                 # Agent data models
```

## Streaming Strategies (6 providers)

Location: `Agents/Strategies/`

| Strategy | Provider | Features |
|----------|----------|----------|
| `AnthropicStreamingStrategy` | Claude | Extended thinking, prompt caching |
| `OpenAIStreamingStrategy` | GPT | Vision, function calling |
| `GeminiStreamingStrategy` | Gemini | File uploads, code execution |
| `GrokStreamingStrategy` | Grok | Live/deep search, think mode |
| `OllamaStreamingStrategy` | Ollama | Local models |
| `SemanticKernelStreamingStrategy` | SK | Legacy/fallback support |

## Helpers (13 files)

Location: `Agents/Helpers/`

| Helper | Purpose |
|--------|---------|
| `ToolExecutor` | Execute tools and capture results |
| `ThinkingExtractor` | Extract thinking blocks from responses |
| `RagContextInjector` | Inject RAG context into prompts |
| `PluginToolBuilder` | Build plugin tools dynamically |
| `ToolDiscoveryService` | Runtime tool discovery |
| `ToolAuditLogger` | Tool execution audit logging |
| `AgentRetryPolicy` | Retry strategy for failed tools |
| `ProviderCapabilities` | Provider feature detection |
| `ToolMetadata` | Tool schema and metadata |
| `QueryIntentDetector` | Analyze user intent |
| `StreamEventBuilder` | Build streaming events |
| `AgentMetricsService` | Execution metrics tracking |
| `ThoughtSignatureHandler` | Gemini 3 thought signatures |

## Plugins (9 files)

Location: `Agents/Plugins/`

| Plugin | Purpose |
|--------|---------|
| `NotesPlugin` | Note CRUD operations |
| `NoteSearchPlugin` | Semantic note search |
| `NoteOrganizationPlugin` | Folders, tags, archive |
| `NoteAnalysisPlugin` | Content analysis |
| `NoteTrashPlugin` | Soft delete operations |
| `NoteVersionPlugin` | Version history operations |
| `WebBrowsingPlugin` | URL fetching via HTTP |
| `GrokSearchPlugin` | Live web search + deep search |
| `ToolSearchPlugin` | Discover available tools at runtime |

## SSE Event Types

Agent streaming uses Server-Sent Events:

- `start` - Stream initialization
- `message` - Content chunk
- `rag` - RAG context retrieved
- `tool` - Tool execution
- `thinking` - Reasoning step
- `end` - Stream complete
- `error` - Error occurred
