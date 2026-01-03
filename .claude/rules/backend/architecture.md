# Backend Architecture

## Clean Architecture (4 Layers)

```text
backend/src/
├── SecondBrain.API/           # Presentation - 16 Controllers, Middleware, DI
├── SecondBrain.Application/   # Business Logic - CQRS, Services, DTOs
│   ├── Commands/              # 100 write operations (MediatR)
│   ├── Queries/               # 100 read operations (MediatR)
│   ├── Behaviors/             # Pipeline behaviors (Logging, Validation)
│   └── Services/              # 221 service files across 14 domains
├── SecondBrain.Core/          # Domain - Entities, Interfaces, Result<T>
└── SecondBrain.Infrastructure/ # Data Access - 16 Repositories, DbContext
```

## CQRS with MediatR

200 total operations (100 commands, 100 queries) with `LoggingBehavior` and `ValidationBehavior` pipeline.

```csharp
// Command example
public record CreateNoteCommand(string Title, string Content, ...)
    : IRequest<Result<NoteResponse>>;

public class CreateNoteCommandHandler : IRequestHandler<CreateNoteCommand, Result<NoteResponse>>
{
    public async Task<Result<NoteResponse>> Handle(...) { ... }
}
```

## Result Pattern

Explicit error handling without exceptions. See `docs/adr/005-result-pattern-error-handling.md`.

```csharp
var result = await _mediator.Send(new GetNoteByIdQuery(id, userId));
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
IAIProvider provider = _aiProviderFactory.GetProvider("OpenAI");
IImageGenerationProvider imgProvider = _imageProviderFactory.GetProvider("Gemini");
IEmbeddingProvider embedProvider = _embeddingProviderFactory.GetProvider("Cohere");
```

## Circuit Breaker

Polly-based resilience in `AI/CircuitBreaker/AIProviderCircuitBreaker.cs`. Opens at 50% failure rate, breaks for 60s.

## Repository Pattern

16 repositories in `Infrastructure/Repositories/`:

- `SqlNoteRepository`, `SqlNoteEmbeddingRepository`, `SqlNoteEmbeddingSearchRepository`
- `SqlChatRepository`, `SqlChatSessionRepository`
- `SqlUserRepository`, `SqlFocusItemRepository`, `SqlFocusSuggestionRepository`
- `SqlIndexingJobRepository`, `SqlSummaryJobRepository`, `SqlRagQueryLogRepository`
- `SqlNoteImageRepository`, `SqlGeminiCacheRepository`, `SqlToolCallAnalyticsRepository`
- `SqlNoteVersionRepository`, `ParallelNoteRepository`

## Critical Files

| File | Purpose |
|------|---------|
| `Program.cs` | Application entry, DI setup, database init |
| `Extensions/ServiceCollectionExtensions.cs` | All service registrations |
| `Controllers/ChatController.cs` | Chat/RAG/streaming endpoints |
| `Controllers/AgentController.cs` | Agent streaming with tools |
| `Controllers/VoiceController.cs` | WebSocket voice endpoints |
| `Services/Agents/AgentService.cs` (289 lines) | Agent orchestration |
| `Services/RAG/RagService.cs` | RAG pipeline orchestration |
| `Services/Voice/VoiceSessionManager.cs` | Voice session lifecycle |
| `Services/Focus/FocusAIService.cs` | AI task suggestions |
| `Services/AI/CircuitBreaker/AIProviderCircuitBreaker.cs` | Resilience |
| `Data/ApplicationDbContext.cs` | EF Core config, query filters |

## Controllers (16)

ChatController, AgentController, NotesController, VoiceController, AIController, RagAnalyticsController, IndexingController, FocusController, GitController, GitHubController, GeminiFilesController, StatsController, UserPreferencesController, AuthController, HealthController, ImportController
