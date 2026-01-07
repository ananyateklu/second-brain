# Backend Patterns

## Architecture (Clean Architecture - 4 Layers)

```
backend/src/
├── SecondBrain.API/           # Controllers (16), Middleware, DI
├── SecondBrain.Application/   # CQRS Commands/Queries (200), Services (221 files)
├── SecondBrain.Core/          # Entities, Interfaces, Result<T>
└── SecondBrain.Infrastructure/ # Repositories (16), DbContext
```

## CQRS with MediatR

```csharp
// Command pattern
public record CreateNoteCommand(string Title, string Content, ...) : IRequest<Result<NoteResponse>>;

public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<NoteResponse>>
{
    public async Task<Result<NoteResponse>> Handle(...) { ... }
}
```

Pipeline behaviors: `LoggingBehavior`, `ValidationBehavior`

## Result Pattern

```csharp
// In handler - return success or failure
return Result<NoteResponse>.Success(response);
return Result<NoteResponse>.Failure(Error.NotFound("Note not found"));

// In controller - match and return appropriate HTTP status
return result.Match(
    onSuccess: note => Ok(note),
    onFailure: error => error.Code switch {
        "NotFound" => NotFound(error),
        _ => BadRequest(error)
    }
);
```

## Factory Pattern

```csharp
IAIProvider provider = _aiProviderFactory.GetProvider("OpenAI");      // or "Anthropic", "Gemini", "Grok", "Ollama"
IImageGenerationProvider imgProvider = _imageProviderFactory.GetProvider("Gemini");  // or "OpenAI"
IEmbeddingProvider embedProvider = _embeddingProviderFactory.GetProvider("Cohere");
```

## AI Provider Capabilities

| Feature | OpenAI | Gemini | Claude | Grok | Ollama | Cohere |
|---------|--------|--------|--------|------|--------|--------|
| Function Calling | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vision | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| Extended Thinking | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Prompt Caching | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Live Web Search | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Image Generation | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ |
| Embeddings | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ |

## Agent System

```csharp
// AgentService delegates to provider-specific strategies
var strategy = _strategyFactory.GetStrategy(request.Provider);
await foreach (var @event in strategy.ExecuteAsync(context, ct))
    yield return @event;
```

**Strategies**: `AnthropicStreamingStrategy`, `OpenAIStreamingStrategy`, `GeminiStreamingStrategy`, `GrokStreamingStrategy`, `OllamaStreamingStrategy`

**Plugins** (9): `NotesPlugin`, `NoteSearchPlugin`, `NoteOrganizationPlugin`, `NoteAnalysisPlugin`, `NoteTrashPlugin`, `NoteVersionPlugin`, `WebBrowsingPlugin`, `GrokSearchPlugin`, `ToolSearchPlugin`

**SSE Events**: `start`, `message`, `rag`, `tool`, `thinking`, `end`, `error`

## Voice System

| Type | Providers |
|------|-----------|
| STT | Deepgram (live), OpenAI Whisper (batch) |
| TTS | ElevenLabs, OpenAI TTS |
| Realtime | Grok WebSocket |

Key services: `VoiceSessionManager`, `DeepgramTranscriptionService`, `ElevenLabsSynthesisService`

## Circuit Breaker

`AI/CircuitBreaker/AIProviderCircuitBreaker.cs` - Polly-based resilience
- 50% failure rate triggers open state
- 60s break duration
- Exponential backoff with jitter

## Critical Files

| File | Purpose |
|------|---------|
| `Program.cs` | Entry, DI, database init |
| `Extensions/ServiceCollectionExtensions.cs` | Service registrations |
| `Controllers/ChatController.cs` | Chat/RAG/streaming |
| `Controllers/AgentController.cs` | Agent streaming |
| `Services/Agents/AgentService.cs` | Agent orchestration |
| `Services/RAG/RagService.cs` | RAG pipeline |
| `Data/ApplicationDbContext.cs` | EF Core config |
